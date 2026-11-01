import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  ERTable,
  ERRelationship,
  ERViewSettings,
} from '@/types/er';
import { ERTableCard } from './ERTableCard';
import { ERRelationshipLine } from './ERRelationshipLine';

interface ERCanvasProps {
  tables: ERTable[];
  relationships: ERRelationship[];
  selectedTableIds: string[];
  selectedRelationshipId: string | null;
  onSelectTable: (tableId: string | null, multi?: boolean) => void;
  onSelectRelationship: (relId: string | null) => void;
  onUpdateTable: (tableId: string, updates: Partial<ERTable>) => void;
  onUpdateTables: (updates: { id: string; x: number; y: number }[]) => void;
  onDeleteTable: (tableId: string) => void;
  onDeleteRelationship: (relId: string) => void;
  onAddColumn: (tableId: string) => void;
  onRequestConnect: (sourceTableId: string, sourceColId: string, targetTableId: string, targetColId: string) => void;
  viewSettings: ERViewSettings;
  scale: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onScaleChange: (scale: number) => void;
  onCommitHistory: () => void;
}

export const ERCanvas: React.FC<ERCanvasProps> = ({
  tables,
  relationships,
  selectedTableIds,
  selectedRelationshipId,
  onSelectTable,
  onSelectRelationship,
  onUpdateTable,
  onUpdateTables,
  onDeleteTable,
  onDeleteRelationship,
  onAddColumn,
  onRequestConnect,
  viewSettings,
  scale,
  pan,
  onPanChange,
  onScaleChange,
  onCommitHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan state
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Table dragging
  const [isDraggingTables, setIsDraggingTables] = useState(false);
  const [dragStartMouse, setDragStartMouse] = useState({ x: 0, y: 0 });
  const [initialTablePositions, setInitialTablePositions] = useState<{ id: string; x: number; y: number }[]>([]);

  // Marquee selection
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Visual connection drag state
  const [connecting, setConnecting] = useState<{
    sourceTableId: string;
    sourceColumnId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Screen to World coordinates conversion
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const originX = rect ? rect.left : 0;
      const originY = rect ? rect.top : 0;
      const x = (screenX - originX - pan.x) / scale;
      const y = (screenY - originY - pan.y) / scale;
      return { x, y };
    },
    [pan, scale]
  );

  const snap = useCallback(
    (val: number) => {
      if (!viewSettings.snapToGrid) return val;
      const sz = viewSettings.gridSize || 20;
      return Math.round(val / sz) * sz;
    },
    [viewSettings.snapToGrid, viewSettings.gridSize]
  );

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      } else if (e.key === 'Escape') {
        onSelectTable(null);
        onSelectRelationship(null);
        setConnecting(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRelationshipId) {
          e.preventDefault();
          onDeleteRelationship(selectedRelationshipId);
        } else if (selectedTableIds.length > 0) {
          e.preventDefault();
          selectedTableIds.forEach((id) => onDeleteTable(id));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedTableIds, selectedRelationshipId, onDeleteTable, onDeleteRelationship, onSelectTable, onSelectRelationship]);

  // Wheel zoom and pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newScale = Math.min(3.0, Math.max(0.2, scale * zoomFactor));

      const rect = containerRef.current?.getBoundingClientRect();
      const mouseX = e.clientX - (rect ? rect.left : 0);
      const mouseY = e.clientY - (rect ? rect.top : 0);

      const worldX = (mouseX - pan.x) / scale;
      const worldY = (mouseY - pan.y) / scale;

      const newPanX = mouseX - worldX * newScale;
      const newPanY = mouseY - worldY * newScale;

      onScaleChange(newScale);
      onPanChange({ x: newPanX, y: newPanY });
    } else {
      onPanChange({
        x: pan.x - e.deltaX,
        y: pan.y - e.deltaY,
      });
    }
  };

  // Canvas Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    // Check if clicked directly on empty canvas
    const target = e.target as HTMLElement;
    const isDirectCanvas =
      target.id === 'er-canvas-container' ||
      target.id === 'er-canvas-bg' ||
      target.tagName === 'svg';

    if (isDirectCanvas) {
      if (!e.shiftKey) {
        onSelectTable(null);
        onSelectRelationship(null);
      }

      const world = screenToWorld(e.clientX, e.clientY);
      setMarquee({
        x1: world.x,
        y1: world.y,
        x2: world.x,
        y2: world.y,
      });
    }
  };

  // Canvas Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    // Active visual relationship connector line
    if (connecting) {
      setConnecting({
        ...connecting,
        currentX: world.x,
        currentY: world.y,
      });
      return;
    }

    // Dragging selected tables
    if (isDraggingTables) {
      const dx = world.x - dragStartMouse.x;
      const dy = world.y - dragStartMouse.y;

      const updates = initialTablePositions.map((pos) => ({
        id: pos.id,
        x: snap(pos.x + dx),
        y: snap(pos.y + dy),
      }));

      onUpdateTables(updates);
      return;
    }

    // Marquee box
    if (marquee) {
      setMarquee({
        ...marquee,
        x2: world.x,
        y2: world.y,
      });

      const minX = Math.min(marquee.x1, world.x);
      const maxX = Math.max(marquee.x1, world.x);
      const minY = Math.min(marquee.y1, world.y);
      const maxY = Math.max(marquee.y1, world.y);

      // Select tables inside marquee box
      tables.forEach((t) => {
        const tWidth = t.width || 340;
        const isInside =
          t.x < maxX && t.x + tWidth > minX && t.y < maxY && t.y + 120 > minY;
        if (isInside && !selectedTableIds.includes(t.id)) {
          onSelectTable(t.id, true);
        }
      });
    }
  };

  // Canvas Mouse Up
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (isDraggingTables) {
      setIsDraggingTables(false);
      setInitialTablePositions([]);
      onCommitHistory();
    }

    if (marquee) {
      setMarquee(null);
    }

    if (connecting) {
      setConnecting(null);
    }
  };

  // Start dragging a table from its header
  const handleTableMouseDown = (tableId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpacePressed) return;

    const isMulti = e.shiftKey;
    if (!selectedTableIds.includes(tableId)) {
      onSelectTable(tableId, isMulti);
    }
    onSelectRelationship(null);

    const world = screenToWorld(e.clientX, e.clientY);
    setIsDraggingTables(true);
    setDragStartMouse(world);

    // Save starting positions of all selected tables
    const relevantIds = selectedTableIds.includes(tableId)
      ? selectedTableIds
      : [tableId];
    setInitialTablePositions(
      tables
        .filter((t) => relevantIds.includes(t.id))
        .map((t) => ({ id: t.id, x: t.x, y: t.y }))
    );
  };

  // Start visual connection drag from a column's port
  const handleStartConnect = (tableId: string, columnId: string, e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    setConnecting({
      sourceTableId: tableId,
      sourceColumnId: columnId,
      startX: world.x,
      startY: world.y,
      currentX: world.x,
      currentY: world.y,
    });
  };

  // End visual connection drag on target column port
  const handleEndConnect = (targetTableId: string, targetColumnId: string) => {
    if (!connecting) return;
    if (connecting.sourceTableId === targetTableId) return; // Prevent self-loop on same column if desired

    onRequestConnect(
      connecting.sourceTableId,
      connecting.sourceColumnId,
      targetTableId,
      targetColumnId
    );
    setConnecting(null);
  };

  return (
    <div
      id="er-canvas-container"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        cursor: isSpacePressed || isPanning ? 'grab' : 'default',
      }}
      className="absolute inset-0 overflow-hidden bg-zinc-950 select-none"
    >
      {/* Background Dot Grid */}
      <svg
        id="er-canvas-bg"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <defs>
          <pattern
            id="er-grid-dots"
            x={pan.x % (24 * scale)}
            y={pan.y % (24 * scale)}
            width={24 * scale}
            height={24 * scale}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={2} cy={2} r={1} fill="#3f3f46" opacity={0.6} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#er-grid-dots)" />
      </svg>

      {/* World Space Container (Transformed via Pan and Zoom) */}
      <div
        id="er-world"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {/* SVG Layer for Relationship Lines */}
        <svg
          className="absolute inset-0 overflow-visible pointer-events-none"
          style={{ width: '1px', height: '1px' }}
        >
          {relationships.map((rel) => {
            const srcTbl = tables.find((t) => t.id === rel.sourceTableId);
            const tgtTbl = tables.find((t) => t.id === rel.targetTableId);
            if (!srcTbl || !tgtTbl) return null;

            const isRelSelected = selectedRelationshipId === rel.id;
            const isHighlighted =
              selectedTableIds.includes(rel.sourceTableId) ||
              selectedTableIds.includes(rel.targetTableId);

            return (
              <ERRelationshipLine
                key={rel.id}
                relationship={rel}
                sourceTable={srcTbl}
                targetTable={tgtTbl}
                isSelected={isRelSelected}
                isHighlighted={isHighlighted}
                onSelect={() => onSelectRelationship(rel.id)}
                onDelete={() => onDeleteRelationship(rel.id)}
              />
            );
          })}

          {/* Active Visual Drag Connector Line */}
          {connecting && (
            <path
              d={`M ${connecting.startX} ${connecting.startY} C ${connecting.startX + 60} ${
                connecting.startY
              }, ${connecting.currentX - 60} ${connecting.currentY}, ${connecting.currentX} ${
                connecting.currentY
              }`}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              className="pointer-events-none animate-pulse"
            />
          )}

          {/* Marquee Rectangle */}
          {marquee && (
            <rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="rgba(59, 130, 246, 0.12)"
              stroke="#3b82f6"
              strokeWidth={1.5 / scale}
              strokeDasharray={`${4 / scale} ${3 / scale}`}
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* HTML Layer for Table Cards */}
        <div className="absolute inset-0 pointer-events-auto">
          {tables.map((table) => {
            const isSelected = selectedTableIds.includes(table.id);
            const isHighlighted = relationships.some(
              (r) =>
                (selectedTableIds.includes(r.sourceTableId) && r.targetTableId === table.id) ||
                (selectedTableIds.includes(r.targetTableId) && r.sourceTableId === table.id)
            );

            return (
              <div
                key={table.id}
                onMouseDown={(e) => handleTableMouseDown(table.id, e)}
              >
                <ERTableCard
                  table={table}
                  isSelected={isSelected}
                  isHighlighted={isHighlighted}
                  viewSettings={viewSettings}
                  onSelect={(e) => {
                    e.stopPropagation();
                    onSelectTable(table.id, e.shiftKey);
                  }}
                  onUpdateTable={(updates) => onUpdateTable(table.id, updates)}
                  onDeleteTable={() => onDeleteTable(table.id)}
                  onAddColumn={() => onAddColumn(table.id)}
                  onStartConnect={(colId, e) => handleStartConnect(table.id, colId, e)}
                  onEndConnect={(colId) => handleEndConnect(table.id, colId)}
                  connectingSource={
                    connecting
                      ? {
                          tableId: connecting.sourceTableId,
                          columnId: connecting.sourceColumnId,
                        }
                      : null
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

