import React, { useState, useEffect } from 'react';
import {
  ERTable,
  ERRelationship,
  Cardinality,
  Optionality,
  ReferentialAction,
} from '@/types/er';
import { areTypesCompatible } from '@/lib/er-validation';
import { LuLink, LuTriangleAlert, LuCheck, LuX } from 'react-icons/lu';

interface ERRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: ERTable[];
  onSaveRelationship: (rel: ERRelationship, generateJunction?: boolean) => void;
  initialData?: Partial<ERRelationship>;
}

export const ERRelationshipModal: React.FC<ERRelationshipModalProps> = ({
  isOpen,
  onClose,
  tables,
  onSaveRelationship,
  initialData,
}) => {
  const [sourceTableId, setSourceTableId] = useState<string>('');
  const [sourceColumnId, setSourceColumnId] = useState<string>('');
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [targetColumnId, setTargetColumnId] = useState<string>('');
  const [cardinality, setCardinality] = useState<Cardinality>('1:N');
  const [sourceOptionality, setSourceOptionality] = useState<Optionality>('mandatory');
  const [targetOptionality, setTargetOptionality] = useState<Optionality>('optional');
  const [onDelete, setOnDelete] = useState<ReferentialAction>('CASCADE');
  const [onUpdate, setOnUpdate] = useState<ReferentialAction>('CASCADE');
  const [makeJunctionTable, setMakeJunctionTable] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const srcTbl = initialData?.sourceTableId || (tables[0]?.id ?? '');
      const srcTblObj = tables.find((t) => t.id === srcTbl);
      const srcCol = initialData?.sourceColumnId || (srcTblObj?.columns[0]?.id ?? '');

      const tgtTbl = initialData?.targetTableId || (tables.length > 1 ? tables[1]?.id : tables[0]?.id ?? '');
      const tgtTblObj = tables.find((t) => t.id === tgtTbl);
      const tgtCol = initialData?.targetColumnId || (tgtTblObj?.columns.find((c) => c.isPrimaryKey)?.id || tgtTblObj?.columns[0]?.id || '');

      setSourceTableId(srcTbl);
      setSourceColumnId(srcCol);
      setTargetTableId(tgtTbl);
      setTargetColumnId(tgtCol);
      setCardinality(initialData?.cardinality || '1:N');
      setSourceOptionality(initialData?.sourceOptionality || 'mandatory');
      setTargetOptionality(initialData?.targetOptionality || 'optional');
      setOnDelete(initialData?.onDelete || 'CASCADE');
      setOnUpdate(initialData?.onUpdate || 'CASCADE');
      setMakeJunctionTable(false);
    }
  }, [isOpen, initialData, tables]);

  if (!isOpen) return null;

  const currentSourceTable = tables.find((t) => t.id === sourceTableId);
  const currentTargetTable = tables.find((t) => t.id === targetTableId);

  const currentSourceCol = currentSourceTable?.columns.find((c) => c.id === sourceColumnId);
  const currentTargetCol = currentTargetTable?.columns.find((c) => c.id === targetColumnId);

  const isCompatible =
    currentSourceCol && currentTargetCol
      ? areTypesCompatible(currentSourceCol.type, currentTargetCol.type)
      : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTableId || !sourceColumnId || !targetTableId || !targetColumnId) {
      return;
    }

    const rel: ERRelationship = {
      id: initialData?.id || `rel_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${currentSourceTable?.name}_${currentSourceCol?.name}_fk`,
      sourceTableId,
      sourceColumnId,
      targetTableId,
      targetColumnId,
      cardinality,
      sourceOptionality,
      targetOptionality,
      onDelete,
      onUpdate,
    };

    onSaveRelationship(rel, makeJunctionTable && cardinality === 'M:N');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <LuLink size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {initialData?.id ? 'Edit Relationship' : 'Create Table Relationship'}
              </h3>
              <p className="text-xs text-zinc-400">
                Define foreign key constraint and ER cardinality
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Source and Target Tables Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Source (Referencing FK) */}
            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">
                  Source (Foreign Key)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Child</span>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Table</label>
                <select
                  value={sourceTableId}
                  onChange={(e) => {
                    const nextTblId = e.target.value;
                    setSourceTableId(nextTblId);
                    const tbl = tables.find((t) => t.id === nextTblId);
                    if (tbl && tbl.columns.length > 0) {
                      setSourceColumnId(tbl.columns[0].id);
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">FK Column</label>
                <select
                  value={sourceColumnId}
                  onChange={(e) => setSourceColumnId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
                >
                  {currentSourceTable?.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target (Referenced PK) */}
            <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">
                  Target (Referenced Key)
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Parent</span>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Table</label>
                <select
                  value={targetTableId}
                  onChange={(e) => {
                    const nextTblId = e.target.value;
                    setTargetTableId(nextTblId);
                    const tbl = tables.find((t) => t.id === nextTblId);
                    if (tbl && tbl.columns.length > 0) {
                      const pk = tbl.columns.find((c) => c.isPrimaryKey);
                      setTargetColumnId(pk ? pk.id : tbl.columns[0].id);
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Referenced Column</label>
                <select
                  value={targetColumnId}
                  onChange={(e) => setTargetColumnId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                >
                  {currentTargetTable?.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type}) {c.isPrimaryKey ? '★ PK' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Type Compatibility Alert */}
          {currentSourceCol && currentTargetCol && (
            <div
              className={`p-2.5 rounded-lg border flex items-center gap-2.5 text-xs ${
                isCompatible
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              {isCompatible ? (
                <>
                  <LuCheck size={16} className="text-emerald-400 shrink-0" />
                  <span>
                    Types compatible: <b>{currentSourceCol.type}</b> matches{' '}
                    <b>{currentTargetCol.type}</b>
                  </span>
                </>
              ) : (
                <>
                  <LuTriangleAlert size={16} className="text-amber-400 shrink-0" />
                  <span>
                    Warning: <b>{currentSourceCol.type}</b> may not be compatible with{' '}
                    <b>{currentTargetCol.type}</b> in PostgreSQL.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Cardinality Selector */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Cardinality Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: '1:1', label: 'One-to-One (1:1)', desc: '1 parent row to 1 child row' },
                  { value: '1:N', label: 'One-to-Many (1:N)', desc: '1 parent row to many child rows' },
                  { value: 'M:N', label: 'Many-to-Many (M:N)', desc: 'Many rows to many rows' },
                ] as const
              ).map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setCardinality(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    cardinality === opt.value
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-xs">{opt.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional M:N Junction Table Checkbox */}
          {cardinality === 'M:N' && (
            <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center gap-2.5">
              <input
                type="checkbox"
                id="makeJunction"
                checked={makeJunctionTable}
                onChange={(e) => setMakeJunctionTable(e.target.checked)}
                className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
              <label htmlFor="makeJunction" className="text-xs text-purple-200 cursor-pointer">
                <b>Auto-generate Junction Table:</b> Automatically create a bridge table with composite primary keys linking both entities!
              </label>
            </div>
          )}

          {/* Referential Integrity Actions */}
          <div className="grid grid-cols-2 gap-4 pt-1 border-t border-zinc-800">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">ON DELETE Action</label>
              <select
                value={onDelete}
                onChange={(e) => setOnDelete(e.target.value as ReferentialAction)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
              >
                <option value="CASCADE">CASCADE (Delete children)</option>
                <option value="SET NULL">SET NULL (Set FK to null)</option>
                <option value="RESTRICT">RESTRICT (Prevent deletion)</option>
                <option value="NO ACTION">NO ACTION (Default)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">ON UPDATE Action</label>
              <select
                value={onUpdate}
                onChange={(e) => setOnUpdate(e.target.value as ReferentialAction)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-blue-500 font-mono"
              >
                <option value="CASCADE">CASCADE (Update children)</option>
                <option value="RESTRICT">RESTRICT (Prevent update)</option>
                <option value="SET NULL">SET NULL (Set to null)</option>
                <option value="NO ACTION">NO ACTION</option>
              </select>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
            >
              {initialData?.id ? 'Save Changes' : 'Create Relationship'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
