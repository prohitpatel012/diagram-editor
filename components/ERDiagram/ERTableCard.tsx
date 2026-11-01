import React, { useState } from 'react';
import { ERTable, ERColumn, ERViewSettings } from '@/types/er';
import {
  LuKey,
  LuLink,
  LuPlus,
  LuTrash2,
  LuChevronDown,
  LuChevronUp,
  LuDatabase,
  LuLayers,
} from 'react-icons/lu';

interface ERTableCardProps {
  table: ERTable;
  isSelected?: boolean;
  isHighlighted?: boolean;
  viewSettings: ERViewSettings;
  onSelect: (e: React.MouseEvent) => void;
  onUpdateTable: (updates: Partial<ERTable>) => void;
  onDeleteTable: () => void;
  onAddColumn: () => void;
  onStartConnect: (columnId: string, e: React.MouseEvent) => void;
  onEndConnect?: (columnId: string) => void;
  connectingSource?: { tableId: string; columnId: string } | null;
}

export const ERTableCard: React.FC<ERTableCardProps> = ({
  table,
  isSelected,
  isHighlighted,
  viewSettings,
  onSelect,
  onUpdateTable,
  onDeleteTable,
  onAddColumn,
  onStartConnect,
  onEndConnect,
  connectingSource,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(table.name);

  const headerColor = table.headerColor || '#3b82f6';
  const isMinimized = !!table.isMinimized;

  const handleNameSubmit = () => {
    setIsEditingName(false);
    const clean = nameVal.trim().replace(/\s+/g, '_').toLowerCase();
    if (clean && clean !== table.name) {
      onUpdateTable({ name: clean });
    } else {
      setNameVal(table.name);
    }
  };

  return (
    <div
      id={`er-table-${table.id}`}
      style={{
        position: 'absolute',
        left: `${table.x}px`,
        top: `${table.y}px`,
        width: `${table.width || 340}px`,
      }}
      onClick={onSelect}
      className={`rounded-xl border select-none transition-shadow shadow-xl flex flex-col bg-zinc-900/95 backdrop-blur-md ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-blue-500/10'
          : isHighlighted
          ? 'border-blue-400/80 ring-1 ring-blue-400/20'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Table Card Header */}
      <div
        className="flex items-center justify-between px-3.5 py-2.5 rounded-t-xl cursor-move border-b border-zinc-800/80"
        style={{
          background: `linear-gradient(to right, ${headerColor}22, transparent)`,
          borderTop: `3px solid ${headerColor}`,
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="w-6 h-6 rounded flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${headerColor}25`, color: headerColor }}
          >
            <LuDatabase size={13} />
          </div>

          {isEditingName ? (
            <input
              type="text"
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit();
                if (e.key === 'Escape') {
                  setNameVal(table.name);
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white font-mono font-semibold outline-none w-36"
            />
          ) : (
            <div className="flex flex-col min-w-0">
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
                className="font-mono text-xs font-bold text-zinc-100 truncate hover:text-blue-400 transition-colors"
                title={`${table.name} (Double-click to rename)`}
              >
                {table.name}
              </span>
              {viewSettings.showDescriptions && table.description && (
                <span className="text-[10px] text-zinc-400 truncate max-w-[180px]">
                  {table.description}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0 text-zinc-400">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddColumn();
            }}
            title="Add column"
            className="p-1 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <LuPlus size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdateTable({ isMinimized: !isMinimized });
            }}
            title={isMinimized ? 'Expand table' : 'Minimize table'}
            className="p-1 rounded hover:bg-zinc-800 hover:text-white transition-colors"
          >
            {isMinimized ? <LuChevronDown size={13} /> : <LuChevronUp size={13} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteTable();
            }}
            title="Delete table"
            className="p-1 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors"
          >
            <LuTrash2 size={13} />
          </button>
        </div>
      </div>

      {/* Table Columns Body */}
      {!isMinimized && (
        <div className="py-1 flex flex-col divide-y divide-zinc-800/40">
          {table.columns.length === 0 ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onAddColumn();
              }}
              className="px-4 py-3 text-center text-xs text-zinc-500 hover:text-blue-400 cursor-pointer border-dashed border border-zinc-800 m-2 rounded-lg"
            >
              + Add first column
            </div>
          ) : (
            table.columns.map((col) => {
              const isConnectingFromHere =
                connectingSource?.tableId === table.id &&
                connectingSource?.columnId === col.id;

              return (
                <div
                  key={col.id}
                  className="relative group flex items-center justify-between px-3.5 py-1.5 hover:bg-zinc-800/50 transition-colors text-xs"
                >
                  {/* Left Connector Port */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onStartConnect(col.id, e);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      onEndConnect?.(col.id);
                    }}
                    title="Click or drag to connect relationship"
                    className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center cursor-crosshair transition-all opacity-0 group-hover:opacity-100 ${
                      isConnectingFromHere
                        ? 'opacity-100 ring-2 ring-blue-500 bg-blue-500'
                        : 'hover:scale-125 hover:border-blue-400 hover:bg-blue-600'
                    }`}
                  >
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>

                  {/* Column Identity & Badges */}
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    {/* PK / FK / UQ Badges */}
                    {col.isPrimaryKey ? (
                      <span
                        title="Primary Key"
                        className="px-1 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0"
                      >
                        <LuKey size={9} /> PK
                      </span>
                    ) : col.isForeignKey ? (
                      <span
                        title="Foreign Key"
                        className="px-1 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded text-[9px] font-bold flex items-center gap-0.5 shrink-0"
                      >
                        <LuLink size={9} /> FK
                      </span>
                    ) : null}

                    {viewSettings.showConstraints && col.isUnique && !col.isPrimaryKey && (
                      <span
                        title="Unique Constraint"
                        className="px-1 py-0.2 bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded text-[9px] font-mono shrink-0"
                      >
                        UQ
                      </span>
                    )}

                    {viewSettings.showConstraints && !col.isNullable && (
                      <span
                        title="NOT NULL"
                        className="px-1 py-0.2 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-[9px] font-mono shrink-0"
                      >
                        NN
                      </span>
                    )}

                    {/* Column Name */}
                    <span
                      className={`font-mono truncate ${
                        col.isPrimaryKey
                          ? 'font-bold text-zinc-100'
                          : 'text-zinc-300'
                      }`}
                    >
                      {col.name}
                    </span>
                  </div>

                  {/* Column Data Type & Default */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {viewSettings.showDataTypes && (
                      <span className="font-mono text-[11px] text-sky-400/90 font-medium">
                        {col.type}
                        {col.typeModifier && (
                          <span className="text-zinc-500">{col.typeModifier}</span>
                        )}
                      </span>
                    )}
                    {viewSettings.showConstraints && col.defaultValue && (
                      <span
                        title={`Default: ${col.defaultValue}`}
                        className="text-[10px] text-zinc-500 font-mono max-w-[70px] truncate"
                      >
                        ={col.defaultValue}
                      </span>
                    )}
                  </div>

                  {/* Right Connector Port */}
                  <div
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onStartConnect(col.id, e);
                    }}
                    onMouseUp={(e) => {
                      e.stopPropagation();
                      onEndConnect?.(col.id);
                    }}
                    title="Click or drag to connect relationship"
                    className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center cursor-crosshair transition-all opacity-0 group-hover:opacity-100 ${
                      isConnectingFromHere
                        ? 'opacity-100 ring-2 ring-blue-500 bg-blue-500'
                        : 'hover:scale-125 hover:border-blue-400 hover:bg-blue-600'
                    }`}
                  >
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Indexes Footer (if enabled and present) */}
      {!isMinimized && viewSettings.showIndexes && table.indexes && table.indexes.length > 0 && (
        <div className="px-3 py-1.5 bg-zinc-950/60 rounded-b-xl border-t border-zinc-800/60 text-[10px] text-zinc-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <LuLayers size={11} className="text-zinc-500" />
            <span>
              {table.indexes.length} {table.indexes.length === 1 ? 'index' : 'indexes'}
            </span>
          </div>
          <span className="font-mono text-zinc-500 truncate max-w-[150px]">
            {table.indexes.map((idx) => idx.name).join(', ')}
          </span>
        </div>
      )}
    </div>
  );
};

