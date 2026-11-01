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
import { ERToolbar } from './ERToolbar';
import { ERCanvas } from './ERCanvas';
import { ERInspector } from './ERInspector';
import { ERRelationshipModal } from './ERRelationshipModal';
import { ERSqlModal } from './ERSqlModal';

const DEFAULT_VIEW_SETTINGS: ERViewSettings = {
  showDataTypes: true,
  showConstraints: true,
  showIndexes: true,
  showDescriptions: true,
  snapToGrid: true,
  gridSize: 20,
};

const STORAGE_KEY = 'er_diagram_active_v1';

export const ERDiagramEditor: React.FC = () => {
  // Main diagram state (deterministic initial state for SSR & first hydration)
  const [diagram, setDiagram] = useState<ERDiagram>(ER_TEMPLATES[0].diagram);
  const isLoadedRef = useRef(false);

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

  // Client-side initial load from localStorage
  useEffect(() => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tables)) {
          setDiagram(parsed);
          setHistory([parsed]);
          setHistoryIndex(0);
        }
      }
    } catch (e) {
      console.error('Failed to load ER diagram from storage', e);
    }
  }, []);

  // Auto-save to localStorage after initial client load
  useEffect(() => {
    if (!isLoadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram));
    } catch (e) {
      console.error('Failed to save ER diagram', e);
    }
  }, [diagram]);

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
    </div>
  );
};

