import React, { useState } from 'react';
import {
  ERTable,
  ERRelationship,
  ERColumn,
  ERIndex,
  PostgresDataType,
  COMMON_DATA_TYPES,
  ValidationIssue,
  Cardinality,
  ReferentialAction,
} from '@/types/er';
import {
  LuKey,
  LuLink,
  LuPlus,
  LuTrash2,
  LuDatabase,
  LuSparkles,
  LuLayers,
  LuCheck,
  LuTriangleAlert,
  LuFileCode,
} from 'react-icons/lu';

interface ERInspectorProps {
  selectedTable: ERTable | null;
  selectedRelationship: ERRelationship | null;
  tables: ERTable[];
  relationships: ERRelationship[];
  diagramName: string;
  diagramDescription: string;
  onUpdateDiagramInfo: (name: string, description: string) => void;
  onUpdateTable: (tableId: string, updates: Partial<ERTable>) => void;
  onDeleteTable: (tableId: string) => void;
  onDuplicateTable: (tableId: string) => void;
  onUpdateRelationship: (relId: string, updates: Partial<ERRelationship>) => void;
  onDeleteRelationship: (relId: string) => void;
  onAddColumn: (tableId: string) => void;
  onDeleteColumn: (tableId: string, columnId: string) => void;
  onUpdateColumn: (tableId: string, columnId: string, updates: Partial<ERColumn>) => void;
  validationIssues: ValidationIssue[];
  onOpenSqlModal: (tab: 'export' | 'import') => void;
  onAutoLayout: () => void;
}

const TABLE_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#64748b', // Slate
];

export const ERInspector: React.FC<ERInspectorProps> = ({
  selectedTable,
  selectedRelationship,
  tables,
  relationships,
  diagramName,
  diagramDescription,
  onUpdateDiagramInfo,
  onUpdateTable,
  onDeleteTable,
  onDuplicateTable,
  onUpdateRelationship,
  onDeleteRelationship,
  onAddColumn,
  onDeleteColumn,
  onUpdateColumn,
  validationIssues,
  onOpenSqlModal,
  onAutoLayout,
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'indexes'>('columns');

  // =========================================================================
  // 1. TABLE INSPECTOR
  // =========================================================================
  if (selectedTable) {
    const handleAddIndex = () => {
      const firstCol = selectedTable.columns[0];
      const newIdx: ERIndex = {
        id: `idx_${Date.now()}`,
        name: `idx_${selectedTable.name}_${firstCol ? firstCol.name : 'col'}`,
        columnIds: firstCol ? [firstCol.id] : [],
        isUnique: false,
        method: 'btree',
      };
      const nextIndexes = [...(selectedTable.indexes || []), newIdx];
      onUpdateTable(selectedTable.id, { indexes: nextIndexes });
    };

    const handleDeleteIndex = (indexId: string) => {
      const nextIndexes = (selectedTable.indexes || []).filter((idx) => idx.id !== indexId);
      onUpdateTable(selectedTable.id, { indexes: nextIndexes });
    };

    const handleUpdateIndex = (indexId: string, updates: Partial<ERIndex>) => {
      const nextIndexes = (selectedTable.indexes || []).map((idx) =>
        idx.id === indexId ? { ...idx, ...updates } : idx
      );
      onUpdateTable(selectedTable.id, { indexes: nextIndexes });
    };

    return (
      <aside className="fixed top-13 right-0 bottom-0 w-84 bg-zinc-900/95 border-l border-zinc-800 backdrop-blur-md z-30 flex flex-col text-zinc-100 select-none overflow-hidden">
        {/* Table Inspector Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${selectedTable.headerColor || '#3b82f6'}22`,
                color: selectedTable.headerColor || '#3b82f6',
              }}
            >
              <LuDatabase size={15} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white">Table Settings</h3>
              <p className="text-[10px] text-zinc-400 font-mono">{selectedTable.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicateTable(selectedTable.id)}
              title="Duplicate table"
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-medium"
            >
              Clone
            </button>
            <button
              onClick={() => onDeleteTable(selectedTable.id)}
              title="Delete table"
              className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <LuTrash2 size={14} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Table Name & Color Theme */}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Table Name
              </label>
              <input
                type="text"
                value={selectedTable.name}
                onChange={(e) =>
                  onUpdateTable(selectedTable.id, {
                    name: e.target.value.replace(/\s+/g, '_').toLowerCase(),
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                Description / Comment
              </label>
              <textarea
                value={selectedTable.description || ''}
                onChange={(e) => onUpdateTable(selectedTable.id, { description: e.target.value })}
                placeholder="Optional table description..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Header Accent Color */}
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                Header Accent Color
              </label>
              <div className="flex items-center gap-1.5">
                {TABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onUpdateTable(selectedTable.id, { headerColor: c })}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform ${(selectedTable.headerColor || '#3b82f6') === c
                        ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                        : 'opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Columns & Indexes Switcher */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'columns'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  Columns ({selectedTable.columns.length})
                </button>
                <button
                  onClick={() => setActiveTab('indexes')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${activeTab === 'indexes'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  Indexes ({selectedTable.indexes?.length || 0})
                </button>
              </div>

              {activeTab === 'columns' ? (
                <button
                  onClick={() => onAddColumn(selectedTable.id)}
                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                >
                  <LuPlus size={12} /> Add
                </button>
              ) : (
                <button
                  onClick={handleAddIndex}
                  className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                >
                  <LuPlus size={12} /> Add Index
                </button>
              )}
            </div>

            {/* Sub-tab 1: Columns List */}
            {activeTab === 'columns' && (
              <div className="space-y-3">
                {selectedTable.columns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 space-y-2.5 hover:border-zinc-700 transition-colors"
                  >
                    {/* Top: Name & Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-[10px] text-zinc-500 font-mono w-4">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              name: e.target.value.replace(/\s+/g, '_').toLowerCase(),
                            })
                          }
                          className="bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-xs text-white font-mono font-medium outline-none focus:border-blue-500 flex-1 min-w-0"
                          placeholder="column_name"
                        />
                      </div>
                      <button
                        onClick={() => onDeleteColumn(selectedTable.id, col.id)}
                        className="text-zinc-500 hover:text-red-400 p-1 rounded"
                        title="Delete column"
                      >
                        <LuTrash2 size={13} />
                      </button>
                    </div>

                    {/* Middle: Type & Modifier */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={col.type}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              type: e.target.value as PostgresDataType,
                            })
                          }
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-[11px] text-sky-400 font-mono outline-none focus:border-blue-500"
                        >
                          {COMMON_DATA_TYPES.map((dt) => (
                            <option key={dt.type} value={dt.type}>
                              {dt.type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={col.typeModifier || ''}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              typeModifier: e.target.value,
                            })
                          }
                          placeholder="(255) or (10,2)"
                          className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-[11px] text-zinc-300 font-mono outline-none"
                        />
                      </div>
                    </div>

                    {/* Bottom: Flags (PK, FK, Unique, Not Null) */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-zinc-400 font-medium">
                      <label className="flex items-center gap-1 cursor-pointer hover:text-amber-300">
                        <input
                          type="checkbox"
                          checked={col.isPrimaryKey}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              isPrimaryKey: e.target.checked,
                              isNullable: e.target.checked ? false : col.isNullable,
                              isUnique: e.target.checked ? true : col.isUnique,
                            })
                          }
                          className="rounded accent-amber-500"
                        />
                        <span className={col.isPrimaryKey ? 'text-amber-400 font-bold' : ''}>
                          PK
                        </span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer hover:text-purple-300">
                        <input
                          type="checkbox"
                          checked={!!col.isUnique}
                          disabled={col.isPrimaryKey}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              isUnique: e.target.checked,
                            })
                          }
                          className="rounded accent-purple-500"
                        />
                        <span>Unique</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer hover:text-zinc-200">
                        <input
                          type="checkbox"
                          checked={!col.isNullable}
                          disabled={col.isPrimaryKey}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              isNullable: !e.target.checked,
                            })
                          }
                          className="rounded accent-blue-500"
                        />
                        <span>NN</span>
                      </label>

                      <label className="flex items-center gap-1 cursor-pointer hover:text-blue-300">
                        <input
                          type="checkbox"
                          checked={!!col.isForeignKey}
                          onChange={(e) =>
                            onUpdateColumn(selectedTable.id, col.id, {
                              isForeignKey: e.target.checked,
                            })
                          }
                          className="rounded accent-blue-500"
                        />
                        <span>FK</span>
                      </label>
                    </div>

                    {/* Default Value */}
                    <div>
                      <input
                        type="text"
                        value={col.defaultValue || ''}
                        onChange={(e) =>
                          onUpdateColumn(selectedTable.id, col.id, {
                            defaultValue: e.target.value,
                          })
                        }
                        placeholder="Default e.g. 'active', now(), 0"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-400 font-mono outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-tab 2: Indexes List */}
            {activeTab === 'indexes' && (
              <div className="space-y-3">
                {(!selectedTable.indexes || selectedTable.indexes.length === 0) ? (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No indexes defined on this table.
                  </div>
                ) : (
                  selectedTable.indexes.map((idx) => (
                    <div
                      key={idx.id}
                      className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={idx.name}
                          onChange={(e) => handleUpdateIndex(idx.id, { name: e.target.value })}
                          className="bg-zinc-900 border border-zinc-700/80 rounded px-2 py-0.5 text-xs text-white font-mono flex-1 mr-2"
                        />
                        <button
                          onClick={() => handleDeleteIndex(idx.id)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <LuTrash2 size={13} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                          <input
                            type="checkbox"
                            checked={idx.isUnique}
                            onChange={(e) => handleUpdateIndex(idx.id, { isUnique: e.target.checked })}
                            className="rounded accent-purple-500"
                          />
                          <span>UNIQUE Index</span>
                        </label>

                        <select
                          value={idx.method}
                          onChange={(e) => handleUpdateIndex(idx.id, { method: e.target.value as any })}
                          className="bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-zinc-400"
                        >
                          <option value="btree">BTREE</option>
                          <option value="hash">HASH</option>
                          <option value="gin">GIN</option>
                          <option value="gist">GIST</option>
                        </select>
                      </div>

                      {/* Covered Columns */}
                      <div>
                        <span className="text-[10px] text-zinc-500 block mb-1">Indexed Columns:</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedTable.columns.map((c) => {
                            const isIncluded = idx.columnIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  const nextCols = isIncluded
                                    ? idx.columnIds.filter((id) => id !== c.id)
                                    : [...idx.columnIds, c.id];
                                  handleUpdateIndex(idx.id, { columnIds: nextCols });
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${isIncluded
                                    ? 'bg-purple-600/30 border border-purple-500 text-purple-200'
                                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                              >
                                {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // 2. RELATIONSHIP INSPECTOR
  // =========================================================================
  if (selectedRelationship) {
    const srcTbl = tables.find((t) => t.id === selectedRelationship.sourceTableId);
    const tgtTbl = tables.find((t) => t.id === selectedRelationship.targetTableId);
    const srcCol = srcTbl?.columns.find((c) => c.id === selectedRelationship.sourceColumnId);
    const tgtCol = tgtTbl?.columns.find((c) => c.id === selectedRelationship.targetColumnId);

    return (
      <aside className="fixed top-13 right-0 bottom-0 w-84 bg-zinc-900/95 border-l border-zinc-800 backdrop-blur-md z-30 flex flex-col text-zinc-100 select-none overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <LuLink size={15} />
            </div>
            <div>
              <h3 className="font-bold text-xs text-white">Relationship</h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                {srcTbl?.name} → {tgtTbl?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => onDeleteRelationship(selectedRelationship.id)}
            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
            title="Delete relationship"
          >
            <LuTrash2 size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Connection summary card */}
          <div className="p-3 bg-zinc-950/70 rounded-xl border border-zinc-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Child (FK):</span>
              <span className="font-mono text-blue-400 font-semibold">
                {srcTbl?.name}.{srcCol?.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Parent (PK):</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {tgtTbl?.name}.{tgtCol?.name}
              </span>
            </div>
          </div>

          {/* Cardinality */}
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1.5">
              Cardinality
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['1:1', '1:N', 'M:N'] as Cardinality[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onUpdateRelationship(selectedRelationship.id, { cardinality: c })}
                  className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${selectedRelationship.cardinality === c
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Foreign Key Actions */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                ON DELETE Action
              </label>
              <select
                value={selectedRelationship.onDelete || 'CASCADE'}
                onChange={(e) =>
                  onUpdateRelationship(selectedRelationship.id, {
                    onDelete: e.target.value as ReferentialAction,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="SET NULL">SET NULL</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                ON UPDATE Action
              </label>
              <select
                value={selectedRelationship.onUpdate || 'CASCADE'}
                onChange={(e) =>
                  onUpdateRelationship(selectedRelationship.id, {
                    onUpdate: e.target.value as ReferentialAction,
                  })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
              >
                <option value="CASCADE">CASCADE</option>
                <option value="RESTRICT">RESTRICT</option>
                <option value="SET NULL">SET NULL</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>

          {/* Delete Action Button */}
          <div className="pt-4">
            <button
              onClick={() => onDeleteRelationship(selectedRelationship.id)}
              className="w-full py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <LuTrash2 size={13} /> Delete Relationship
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // =========================================================================
  // 3. CANVAS / SCHEMA OVERVIEW INSPECTOR (Nothing selected)
  // =========================================================================
  const totalColumns = tables.reduce((acc, t) => acc + t.columns.length, 0);

  return (
    <aside className="fixed top-13 right-0 bottom-0 w-84 bg-zinc-900/95 border-l border-zinc-800 backdrop-blur-md z-30 flex flex-col text-zinc-100 select-none overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
            <LuSparkles size={15} />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Database Schema</h3>
            <p className="text-[10px] text-zinc-400">PostgreSQL ER Model</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Diagram Name & Description */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Schema Name
            </label>
            <input
              type="text"
              value={diagramName}
              onChange={(e) => onUpdateDiagramInfo(e.target.value, diagramDescription)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-400 block mb-1">
              Description
            </label>
            <textarea
              value={diagramDescription}
              onChange={(e) => onUpdateDiagramInfo(diagramName, e.target.value)}
              placeholder="Database architecture notes..."
              rows={2}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Schema Statistics */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Tables</span>
            <span className="text-xl font-bold text-white font-mono">{tables.length}</span>
          </div>
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Columns</span>
            <span className="text-xl font-bold text-sky-400 font-mono">{totalColumns}</span>
          </div>
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Relationships</span>
            <span className="text-xl font-bold text-indigo-400 font-mono">{relationships.length}</span>
          </div>
          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Dialect</span>
            <span className="text-xs font-bold text-emerald-400 font-mono mt-1 block">PostgreSQL</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <button
            onClick={onAutoLayout}
            className="w-full py-2 px-3 rounded-xl border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 hover:text-white text-xs font-medium text-zinc-300 flex items-center justify-center gap-2 transition-all"
          >
            <LuSparkles size={14} className="text-amber-400" /> Auto-Arrange Tables
          </button>
          <button
            onClick={() => onOpenSqlModal('export')}
            className="w-full py-2 px-3 rounded-xl border border-blue-500/30 bg-blue-600/10 hover:bg-blue-600/20 text-xs font-medium text-blue-400 flex items-center justify-center gap-2 transition-all"
          >
            <LuFileCode size={14} /> View / Export SQL DDL
          </button>
        </div>

        {/* Schema Diagnostics */}
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300">Schema Diagnostics</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${validationIssues.length === 0
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
                }`}
            >
              {validationIssues.length === 0 ? 'All Valid' : `${validationIssues.length} issue(s)`}
            </span>
          </div>

          {validationIssues.length === 0 ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <LuCheck size={16} className="text-emerald-400 shrink-0" />
              <span>All foreign keys, data types, and primary keys are valid.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {validationIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs space-y-1"
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    <LuTriangleAlert size={13} className="text-amber-400 shrink-0" />
                    <span className="text-amber-300">{issue.title}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">{issue.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
