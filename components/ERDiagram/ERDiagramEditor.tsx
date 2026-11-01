import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ERDiagram,
  ERTable,
  ERRelationship,
  ERColumn,
  ERViewSettings,
} from '@/types/er';
import { ER_TEMPLATES } from '@/lib/er-templates';
import { autoLayoutERDiagram } from '@/lib/er-layout';
import { validateERDiagram } from '@/lib/er-validation';
import { StorageStatus } from '@/lib/storage';
import {
  loadERSessionFromStorage,
  saveERSessionToStorage,
  clearERSessionFromStorage,
  exportERDiagramToFile,
  readERDiagramFile,
} from '@/lib/er-storage';
import { ERToolbar } from './ERToolbar';
import { ERCanvas } from './ERCanvas';
import { ERInspector } from './ERInspector';
import { ERRelationshipModal } from './ERRelationshipModal';
import { ERSqlModal } from './ERSqlModal';
import { LuTriangleAlert } from 'react-icons/lu';

const DEFAULT_VIEW_SETTINGS: ERViewSettings = {
  showDataTypes: true,
  showConstraints: true,
  showIndexes: true,
  showDescriptions: true,
  snapToGrid: true,
  gridSize: 20,
};

interface ERDiagramEditorProps {
  currentTitle?: string;
  onTitleChange?: (title: string) => void;
  onStorageStatusChange?: (status: StorageStatus) => void;
}

export const ERDiagramEditor: React.FC<ERDiagramEditorProps> = ({
  currentTitle,
  onTitleChange,
  onStorageStatusChange,
}) => {
  // Main diagram state (deterministic initial state for SSR & first hydration)
  const [diagram, setDiagram] = useState<ERDiagram>(ER_TEMPLATES[0].diagram);
  const isLoadedRef = useRef(false);

  // 7-day Session Storage Status State
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    hasSession: true,
    isExpired: false,
    remainingDays: 7,
    remainingHours: 0,
    lastActiveDate: null,
    isSavedToFile: false,
  });

  // Clear confirmation modal state
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ERDiagram[]>([ER_TEMPLATES[0].diagram]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // View settings
  const [viewSettings, setViewSettings] = useState<ERViewSettings>(DEFAULT_VIEW_SETTINGS);

  // Canvas viewport (pan and scale)
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Selection state
  const [selectedTableIds, setSelectedTableIds] = useState<string[]>([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  // Modals state
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [relationshipModalData, setRelationshipModalData] = useState<Partial<ERRelationship> | undefined>(undefined);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlModalTab, setSqlModalTab] = useState<'export' | 'import' | 'templates'>('export');

  // Sync title from TopBar parent if updated
  useEffect(() => {
    if (currentTitle && currentTitle !== diagram.name) {
      setDiagram((d) => ({ ...d, name: currentTitle }));
    }
  }, [currentTitle, diagram.name]);

  // Client-side initial load from 7-day persistent storage
  useEffect(() => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;
    const { session, status } = loadERSessionFromStorage();
    if (session && session.diagram) {
      setDiagram(session.diagram);
      setHistory([session.diagram]);
      setHistoryIndex(0);
      if (session.viewSettings) setViewSettings(session.viewSettings);
      if (session.viewport) {
        setScale(session.viewport.scale);
        setPan(session.viewport.pan);
      }
      onTitleChange?.(session.diagram.name);
    }
    setStorageStatus(status);
    onStorageStatusChange?.(status);
  }, [onTitleChange, onStorageStatusChange]);

  // Auto-save to 7-day persistent localStorage after changes
  useEffect(() => {
    if (!isLoadedRef.current) return;
    const status = saveERSessionToStorage(diagram, viewSettings, { scale, pan });
    setStorageStatus(status);
    onStorageStatusChange?.(status);
  }, [diagram, viewSettings, scale, pan, onStorageStatusChange]);

  // Commit state to undo/redo history
  const commitHistory = useCallback(
    (nextDiagram: ERDiagram) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, nextDiagram].slice(-30); // Keep last 30 states
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 29));
      setDiagram(nextDiagram);
    },
    [historyIndex]
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const targetIdx = historyIndex - 1;
    setHistoryIndex(targetIdx);
    setDiagram(history[targetIdx]);
  }, [canUndo, historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const targetIdx = historyIndex + 1;
    setHistoryIndex(targetIdx);
    setDiagram(history[targetIdx]);
  }, [canRedo, historyIndex, history]);


  // Validation
  const validationIssues = useMemo(
    () => validateERDiagram(diagram.tables, diagram.relationships),
    [diagram.tables, diagram.relationships]
  );

  // Selected entities for Inspector
  const selectedTable = useMemo(
    () =>
      selectedTableIds.length === 1
        ? diagram.tables.find((t) => t.id === selectedTableIds[0]) || null
        : null,
    [selectedTableIds, diagram.tables]
  );

  const selectedRelationship = useMemo(
    () =>
      selectedRelationshipId
        ? diagram.relationships.find((r) => r.id === selectedRelationshipId) || null
        : null,
    [selectedRelationshipId, diagram.relationships]
  );

  // =========================================================================
  // TABLE OPERATIONS
  // =========================================================================
  const handleAddTable = useCallback(() => {
    const tableNum = diagram.tables.length + 1;
    const newTableId = `tbl_${Date.now()}`;
    const newColId = `col_${Date.now()}_id`;

    // Center in current view
    const newX = Math.round((-pan.x + window.innerWidth * 0.35) / scale);
    const newY = Math.round((-pan.y + window.innerHeight * 0.35) / scale);

    const newTable: ERTable = {
      id: newTableId,
      name: `table_${tableNum}`,
      description: '',
      x: Math.max(60, newX),
      y: Math.max(60, newY),
      width: 340,
      headerColor: '#3b82f6',
      columns: [
        {
          id: newColId,
          name: 'id',
          type: 'UUID',
          isPrimaryKey: true,
          isNullable: false,
          defaultValue: 'gen_random_uuid()',
        },
        {
          id: `col_${Date.now()}_created`,
          name: 'created_at',
          type: 'TIMESTAMPTZ',
          isPrimaryKey: false,
          isNullable: false,
          defaultValue: 'now()',
        },
      ],
      indexes: [],
    };

    const nextDiagram: ERDiagram = {
      ...diagram,
      tables: [...diagram.tables, newTable],
      updatedAt: Date.now(),
    };

    commitHistory(nextDiagram);
    setSelectedTableIds([newTableId]);
    setSelectedRelationshipId(null);
  }, [diagram, pan, scale, commitHistory]);

  const handleUpdateTable = useCallback(
    (tableId: string, updates: Partial<ERTable>) => {
      const nextTables = diagram.tables.map((t) =>
        t.id === tableId ? { ...t, ...updates } : t
      );
      const nextDiagram = { ...diagram, tables: nextTables, updatedAt: Date.now() };
      setDiagram(nextDiagram);
    },
    [diagram]
  );

  const handleUpdateTables = useCallback(
    (updates: { id: string; x: number; y: number }[]) => {
      const map = new Map(updates.map((u) => [u.id, u]));
      const nextTables = diagram.tables.map((t) => {
        const u = map.get(t.id);
        return u ? { ...t, x: u.x, y: u.y } : t;
      });
      setDiagram({ ...diagram, tables: nextTables, updatedAt: Date.now() });
    },
    [diagram]
  );

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      const nextTables = diagram.tables.filter((t) => t.id !== tableId);
      // Remove connected relationships
      const nextRelationships = diagram.relationships.filter(
        (r) => r.sourceTableId !== tableId && r.targetTableId !== tableId
      );

      const nextDiagram: ERDiagram = {
        ...diagram,
        tables: nextTables,
        relationships: nextRelationships,
        updatedAt: Date.now(),
      };

      commitHistory(nextDiagram);
      setSelectedTableIds([]);
      if (
        selectedRelationship &&
        (selectedRelationship.sourceTableId === tableId ||
          selectedRelationship.targetTableId === tableId)
      ) {
        setSelectedRelationshipId(null);
      }
    },
    [diagram, commitHistory, selectedRelationship]
  );

  const handleDuplicateTable = useCallback(
    (tableId: string) => {
      const target = diagram.tables.find((t) => t.id === tableId);
      if (!target) return;

      const dupId = `tbl_${Date.now()}`;
      const dupCols: ERColumn[] = target.columns.map((c) => ({
        ...c,
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      }));

      const dupTable: ERTable = {
        ...target,
        id: dupId,
        name: `${target.name}_copy`,
        x: target.x + 40,
        y: target.y + 40,
        columns: dupCols,
        indexes: [],
      };

      const nextDiagram: ERDiagram = {
        ...diagram,
        tables: [...diagram.tables, dupTable],
        updatedAt: Date.now(),
      };

      commitHistory(nextDiagram);
      setSelectedTableIds([dupId]);
    },
    [diagram, commitHistory]
  );

  // =========================================================================
  // COLUMN OPERATIONS
  // =========================================================================
  const handleAddColumn = useCallback(
    (tableId: string) => {
      const table = diagram.tables.find((t) => t.id === tableId);
      if (!table) return;

      const newColId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newCol: ERColumn = {
        id: newColId,
        name: `col_${table.columns.length + 1}`,
        type: 'VARCHAR',
        typeModifier: '(255)',
        isPrimaryKey: false,
        isNullable: true,
      };

      const nextTables = diagram.tables.map((t) =>
        t.id === tableId ? { ...t, columns: [...t.columns, newCol] } : t
      );

      const nextDiagram = { ...diagram, tables: nextTables, updatedAt: Date.now() };
      commitHistory(nextDiagram);
    },
    [diagram, commitHistory]
  );

  const handleDeleteColumn = useCallback(
    (tableId: string, columnId: string) => {
      const nextTables = diagram.tables.map((t) =>
        t.id === tableId
          ? { ...t, columns: t.columns.filter((c) => c.id !== columnId) }
          : t
      );
      // Remove relationships tied to this column
      const nextRels = diagram.relationships.filter(
        (r) =>
          !(
            (r.sourceTableId === tableId && r.sourceColumnId === columnId) ||
            (r.targetTableId === tableId && r.targetColumnId === columnId)
          )
      );

      const nextDiagram = {
        ...diagram,
        tables: nextTables,
        relationships: nextRels,
        updatedAt: Date.now(),
      };
      commitHistory(nextDiagram);
    },
    [diagram, commitHistory]
  );

  const handleUpdateColumn = useCallback(
    (tableId: string, columnId: string, updates: Partial<ERColumn>) => {
      const nextTables = diagram.tables.map((t) => {
        if (t.id !== tableId) return t;
        const nextCols = t.columns.map((c) => (c.id === columnId ? { ...c, ...updates } : c));
        return { ...t, columns: nextCols };
      });
      const nextDiagram = { ...diagram, tables: nextTables, updatedAt: Date.now() };
      setDiagram(nextDiagram);
    },
    [diagram]
  );

  // =========================================================================
  // RELATIONSHIP OPERATIONS
  // =========================================================================
  const handleSaveRelationship = useCallback(
    (rel: ERRelationship, generateJunction?: boolean) => {
      let nextTables = [...diagram.tables];
      let nextRels = [...diagram.relationships];

      if (generateJunction && rel.cardinality === 'M:N') {
        const srcTbl = nextTables.find((t) => t.id === rel.sourceTableId);
        const tgtTbl = nextTables.find((t) => t.id === rel.targetTableId);

        if (srcTbl && tgtTbl) {
          const junctionId = `tbl_junction_${Date.now()}`;
          const junctionName = `${srcTbl.name}_${tgtTbl.name}`;
          const col1Id = `col_j1_${Date.now()}`;
          const col2Id = `col_j2_${Date.now()}`;

          const junctionTable: ERTable = {
            id: junctionId,
            name: junctionName,
            description: `Junction table linking ${srcTbl.name} and ${tgtTbl.name}`,
            x: Math.round((srcTbl.x + tgtTbl.x) / 2),
            y: Math.max(srcTbl.y, tgtTbl.y) + 60,
            width: 340,
            headerColor: '#8b5cf6',
            columns: [
              {
                id: col1Id,
                name: `${srcTbl.name.replace(/s$/, '')}_id`,
                type: srcTbl.columns.find((c) => c.id === rel.sourceColumnId)?.type || 'UUID',
                isPrimaryKey: true,
                isForeignKey: true,
                isNullable: false,
              },
              {
                id: col2Id,
                name: `${tgtTbl.name.replace(/s$/, '')}_id`,
                type: tgtTbl.columns.find((c) => c.id === rel.targetColumnId)?.type || 'UUID',
                isPrimaryKey: true,
                isForeignKey: true,
                isNullable: false,
              },
            ],
          };

          nextTables.push(junctionTable);

          // Add two 1:N relationships from parents to junction
          nextRels.push({
            id: `rel_j1_${Date.now()}`,
            sourceTableId: junctionId,
            sourceColumnId: col1Id,
            targetTableId: srcTbl.id,
            targetColumnId: rel.sourceColumnId,
            cardinality: '1:N',
            sourceOptionality: 'mandatory',
            targetOptionality: 'optional',
            onDelete: 'CASCADE',
          });

          nextRels.push({
            id: `rel_j2_${Date.now()}`,
            sourceTableId: junctionId,
            sourceColumnId: col2Id,
            targetTableId: tgtTbl.id,
            targetColumnId: rel.targetColumnId,
            cardinality: '1:N',
            sourceOptionality: 'mandatory',
            targetOptionality: 'optional',
            onDelete: 'CASCADE',
          });
        }
      } else {
        // Normal relationship
        const existingIdx = nextRels.findIndex((r) => r.id === rel.id);
        if (existingIdx !== -1) {
          nextRels[existingIdx] = rel;
        } else {
          nextRels.push(rel);
        }

        // Maintain Foreign Key badge on source column
        nextTables = nextTables.map((t) => {
          if (t.id === rel.sourceTableId) {
            return {
              ...t,
              columns: t.columns.map((c) =>
                c.id === rel.sourceColumnId ? { ...c, isForeignKey: true } : c
              ),
            };
          }
          return t;
        });
      }

      const nextDiagram: ERDiagram = {
        ...diagram,
        tables: nextTables,
        relationships: nextRels,
        updatedAt: Date.now(),
      };

      commitHistory(nextDiagram);
      setSelectedRelationshipId(rel.id);
    },
    [diagram, commitHistory]
  );

  const handleDeleteRelationship = useCallback(
    (relId: string) => {
      const nextRels = diagram.relationships.filter((r) => r.id !== relId);
      const nextDiagram: ERDiagram = {
        ...diagram,
        relationships: nextRels,
        updatedAt: Date.now(),
      };
      commitHistory(nextDiagram);
      setSelectedRelationshipId(null);
    },
    [diagram, commitHistory]
  );

  const handleUpdateRelationship = useCallback(
    (relId: string, updates: Partial<ERRelationship>) => {
      const nextRels = diagram.relationships.map((r) =>
        r.id === relId ? { ...r, ...updates } : r
      );
      const nextDiagram = { ...diagram, relationships: nextRels, updatedAt: Date.now() };
      setDiagram(nextDiagram);
    },
    [diagram]
  );

  // Request connection from visual port drag
  const handleRequestConnect = useCallback(
    (sourceTableId: string, sourceColId: string, targetTableId: string, targetColId: string) => {
      setRelationshipModalData({
        sourceTableId,
        sourceColumnId: sourceColId,
        targetTableId,
        targetColumnId: targetColId,
        cardinality: '1:N',
      });
      setRelationshipModalOpen(true);
    },
    []
  );

  // =========================================================================
  // CANVAS CONTROLS (Auto Layout, Fit to Screen, Zoom)
  // =========================================================================
  const handleAutoLayout = useCallback(() => {
    const layouted = autoLayoutERDiagram(diagram.tables, diagram.relationships);
    const nextDiagram = { ...diagram, tables: layouted, updatedAt: Date.now() };
    commitHistory(nextDiagram);
  }, [diagram, commitHistory]);

  const handleFitToScreen = useCallback(() => {
    if (diagram.tables.length === 0) {
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const minX = Math.min(...diagram.tables.map((t) => t.x));
    const maxX = Math.max(...diagram.tables.map((t) => t.x + (t.width || 340)));
    const minY = Math.min(...diagram.tables.map((t) => t.y));
    const maxY = Math.max(...diagram.tables.map((t) => t.y + 240));

    const contentWidth = Math.max(100, maxX - minX);
    const contentHeight = Math.max(100, maxY - minY);

    const availableWidth = window.innerWidth - 380; // Account for inspector
    const availableHeight = window.innerHeight - 100;

    const scaleX = (availableWidth * 0.85) / contentWidth;
    const scaleY = (availableHeight * 0.85) / contentHeight;
    const nextScale = Math.min(1.2, Math.max(0.3, Math.min(scaleX, scaleY)));

    const centerX = availableWidth / 2 - (minX + contentWidth / 2) * nextScale;
    const centerY = availableHeight / 2 - (minY + contentHeight / 2) * nextScale;

    setScale(nextScale);
    setPan({ x: centerX + 40, y: centerY + 60 });
  }, [diagram.tables]);

  const allMinimized = useMemo(
    () => diagram.tables.length > 0 && diagram.tables.every((t) => !!t.isMinimized),
    [diagram.tables]
  );

  const handleToggleAllMinimized = useCallback(() => {
    const nextMin = !allMinimized;
    const nextTables = diagram.tables.map((t) => ({ ...t, isMinimized: nextMin }));
    setDiagram({ ...diagram, tables: nextTables, updatedAt: Date.now() });
  }, [allMinimized, diagram]);

  // Load starter template
  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      const tmpl = ER_TEMPLATES.find((t) => t.id === templateId);
      if (tmpl) {
        commitHistory({
          ...tmpl.diagram,
          id: `er_diag_${Date.now()}`,
          updatedAt: Date.now(),
        });
        setTimeout(handleFitToScreen, 100);
      }
    },
    [commitHistory, handleFitToScreen]
  );

  const handleSaveToFile = () => {
    exportERDiagramToFile(diagram);
    const updatedStatus = saveERSessionToStorage(diagram, viewSettings, { scale, pan }, true);
    setStorageStatus(updatedStatus);
    onStorageStatusChange?.(updatedStatus);
  };

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const session = await readERDiagramFile(file);
      setDiagram(session.diagram);
      commitHistory(session.diagram);
      if (session.viewSettings) setViewSettings(session.viewSettings);
      if (session.viewport) {
        setScale(session.viewport.scale);
        setPan(session.viewport.pan);
      }
      const newStatus = saveERSessionToStorage(
        session.diagram,
        session.viewSettings,
        session.viewport,
        true
      );
      setStorageStatus(newStatus);
      onStorageStatusChange?.(newStatus);
      onTitleChange?.(session.diagram.name);
    } catch (err) {
      console.error('Failed to open ER diagram file:', err);
      alert('Invalid ER diagram file format.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmClearDiagram = () => {
    const blankDiagram: ERDiagram = {
      id: 'er_' + Date.now(),
      name: 'New ER Diagram',
      tables: [],
      relationships: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setDiagram(blankDiagram);
    commitHistory(blankDiagram);
    setSelectedTableIds([]);
    setSelectedRelationshipId(null);
    clearERSessionFromStorage();
    const updated = saveERSessionToStorage(blankDiagram, viewSettings, { scale: 1, pan: { x: 0, y: 0 } });
    setStorageStatus(updated);
    onStorageStatusChange?.(updated);
    onTitleChange?.(blankDiagram.name);
    setShowClearConfirm(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-zinc-950 font-sans">
      {/* Top Controls Toolbar */}
      <ERToolbar
        onAddTable={handleAddTable}
        onOpenRelationshipModal={() => {
          setRelationshipModalData(undefined);
          setRelationshipModalOpen(true);
        }}
        onAutoLayout={handleAutoLayout}
        onOpenSqlModal={(tab) => {
          setSqlModalTab(tab);
          setSqlModalOpen(true);
        }}
        onFitToScreen={handleFitToScreen}
        onResetZoom={() => {
          setScale(1);
          setPan({ x: 0, y: 0 });
        }}
        onZoomIn={() => setScale((s) => Math.min(3, s * 1.15))}
        onZoomOut={() => setScale((s) => Math.max(0.2, s * 0.85))}
        scale={scale}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        viewSettings={viewSettings}
        onUpdateViewSettings={(updates) =>
          setViewSettings((prev) => ({ ...prev, ...updates }))
        }
        onToggleAllMinimized={handleToggleAllMinimized}
        allMinimized={allMinimized}
        validationIssues={validationIssues}
        onSelectTable={(tableId) => {
          setSelectedTableIds([tableId]);
          setSelectedRelationshipId(null);
        }}
        onSelectRelationship={(relId) => {
          setSelectedRelationshipId(relId);
          setSelectedTableIds([]);
        }}
        storageStatus={storageStatus}
        onSaveToFile={handleSaveToFile}
        onOpenFile={handleOpenFile}
        onClearDiagram={() => setShowClearConfirm(true)}
      />

      {/* Main Interactive Canvas */}
      <ERCanvas
        tables={diagram.tables}
        relationships={diagram.relationships}
        selectedTableIds={selectedTableIds}
        selectedRelationshipId={selectedRelationshipId}
        onSelectTable={(tableId, multi) => {
          if (!tableId) {
            setSelectedTableIds([]);
          } else if (multi) {
            setSelectedTableIds((prev) =>
              prev.includes(tableId) ? prev.filter((id) => id !== tableId) : [...prev, tableId]
            );
          } else {
            setSelectedTableIds([tableId]);
          }
          setSelectedRelationshipId(null);
        }}
        onSelectRelationship={(relId) => {
          setSelectedRelationshipId(relId);
          if (relId) setSelectedTableIds([]);
        }}
        onUpdateTable={handleUpdateTable}
        onUpdateTables={handleUpdateTables}
        onDeleteTable={handleDeleteTable}
        onDeleteRelationship={handleDeleteRelationship}
        onAddColumn={handleAddColumn}
        onRequestConnect={handleRequestConnect}
        viewSettings={viewSettings}
        scale={scale}
        pan={pan}
        onPanChange={setPan}
        onScaleChange={setScale}
        onCommitHistory={() => commitHistory(diagram)}
      />

      {/* Right Sidebar Inspector */}
      <ERInspector
        selectedTable={selectedTable}
        selectedRelationship={selectedRelationship}
        tables={diagram.tables}
        relationships={diagram.relationships}
        diagramName={diagram.name}
        diagramDescription={diagram.description || ''}
        onUpdateDiagramInfo={(name, description) =>
          setDiagram((d) => ({ ...d, name, description, updatedAt: Date.now() }))
        }
        onUpdateTable={handleUpdateTable}
        onDeleteTable={handleDeleteTable}
        onDuplicateTable={handleDuplicateTable}
        onUpdateRelationship={handleUpdateRelationship}
        onDeleteRelationship={handleDeleteRelationship}
        onAddColumn={handleAddColumn}
        onDeleteColumn={handleDeleteColumn}
        onUpdateColumn={handleUpdateColumn}
        validationIssues={validationIssues}
        onOpenSqlModal={(tab) => {
          setSqlModalTab(tab);
          setSqlModalOpen(true);
        }}
        onAutoLayout={handleAutoLayout}
      />

      {/* Relationship Creation / Edit Modal */}
      <ERRelationshipModal
        isOpen={relationshipModalOpen}
        onClose={() => setRelationshipModalOpen(false)}
        tables={diagram.tables}
        onSaveRelationship={handleSaveRelationship}
        initialData={relationshipModalData}
      />

      {/* SQL Export / Import / Templates Modal */}
      <ERSqlModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        diagram={diagram}
        initialTab={sqlModalTab}
        onImportDiagram={({ tables, relationships, name }) => {
          const autoLayouted = autoLayoutERDiagram(tables, relationships);
          commitHistory({
            id: `er_diag_${Date.now()}`,
            name: name || 'Imported Schema',
            tables: autoLayouted,
            relationships,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          setTimeout(handleFitToScreen, 100);
        }}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Hidden file input for opening .erdiagram files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".erdiagram,.json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Clear ER Diagram Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center">
                <LuTriangleAlert size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">Clear ER Diagram?</h3>
                <p className="text-xs text-zinc-400">This will remove all tables and relationships from the canvas.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/40 border border-zinc-800 p-3 rounded-lg">
              Your diagram is automatically kept safe in browser storage for 7 days. To make sure you never lose anything, you can also download a backup file before clearing.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveToFile();
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
              >
                Export Backup First
              </button>
              <button
                type="button"
                onClick={handleConfirmClearDiagram}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-600/20"
              >
                Yes, Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

