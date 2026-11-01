import React, { useState } from 'react';
import { ERViewSettings, ValidationIssue } from '@/types/er';
import { ERValidationBanner } from './ERValidationBanner';
import {
  LuPlus,
  LuLink,
  LuSparkles,
  LuFileCode,
  LuMaximize,
  LuZoomIn,
  LuZoomOut,
  LuUndo2,
  LuRedo2,
  LuEye,
  LuCheck,
} from 'react-icons/lu';

interface ERToolbarProps {
  onAddTable: () => void;
  onOpenRelationshipModal: () => void;
  onAutoLayout: () => void;
  onOpenSqlModal: (tab: 'export' | 'import' | 'templates') => void;
  onFitToScreen: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  scale: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewSettings: ERViewSettings;
  onUpdateViewSettings: (updates: Partial<ERViewSettings>) => void;
  onToggleAllMinimized: () => void;
  allMinimized: boolean;
  validationIssues: ValidationIssue[];
  onSelectTable?: (tableId: string) => void;
  onSelectRelationship?: (relId: string) => void;
}

export const ERToolbar: React.FC<ERToolbarProps> = ({
  onAddTable,
  onOpenRelationshipModal,
  onAutoLayout,
  onOpenSqlModal,
  onFitToScreen,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  scale,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewSettings,
  onUpdateViewSettings,
  onToggleAllMinimized,
  allMinimized,
  validationIssues,
  onSelectTable,
  onSelectRelationship,
}) => {
  const [showViewMenu, setShowViewMenu] = useState(false);
  const zoomPercent = Math.round(scale * 100);

  return (
    <div className="fixed top-15 left-4 z-20 flex items-center gap-2 select-none">
      {/* Primary Actions Pill */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl backdrop-blur-md shadow-2xl">
        {/* Add Table Button */}
        <button
          onClick={onAddTable}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
        >
          <LuPlus size={15} /> Add Table
        </button>

        {/* Add Relationship Button */}
        <button
          onClick={onOpenRelationshipModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition-all"
        >
          <LuLink size={14} className="text-blue-400" /> Add Relationship
        </button>

        {/* Auto Layout Button */}
        <button
          onClick={onAutoLayout}
          title="Auto-arrange tables cleanly without overlapping"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
        >
          <LuSparkles size={14} className="text-amber-400" /> Auto-Layout
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 my-auto" />

        {/* SQL & Templates Modals */}
        <button
          onClick={() => onOpenSqlModal('export')}
          title="Export / Import SQL DDL"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-blue-400 text-xs font-medium transition-colors"
        >
          <LuFileCode size={14} /> SQL
        </button>

        <button
          onClick={() => onOpenSqlModal('templates')}
          title="Load pre-built schema template"
          className="px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors"
        >
          Templates
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 my-auto" />

        {/* View Options Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowViewMenu((v) => !v)}
            title="Toggle display options (Types, Constraints, Indexes)"
            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
              showViewMenu
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <LuEye size={15} />
          </button>

          {showViewMenu && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-2 z-50 text-xs text-zinc-200 backdrop-blur-md space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Display Options
              </div>

              <button
                onClick={() =>
                  onUpdateViewSettings({ showDataTypes: !viewSettings.showDataTypes })
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-left transition-colors"
              >
                <span>Column Data Types</span>
                {viewSettings.showDataTypes && <LuCheck size={14} className="text-blue-400" />}
              </button>

              <button
                onClick={() =>
                  onUpdateViewSettings({ showConstraints: !viewSettings.showConstraints })
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-left transition-colors"
              >
                <span>Constraints (NN, UQ, Default)</span>
                {viewSettings.showConstraints && <LuCheck size={14} className="text-blue-400" />}
              </button>

              <button
                onClick={() =>
                  onUpdateViewSettings({ showIndexes: !viewSettings.showIndexes })
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-left transition-colors"
              >
                <span>Table Indexes</span>
                {viewSettings.showIndexes && <LuCheck size={14} className="text-blue-400" />}
              </button>

              <button
                onClick={() =>
                  onUpdateViewSettings({ showDescriptions: !viewSettings.showDescriptions })
                }
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-left transition-colors"
              >
                <span>Table Descriptions</span>
                {viewSettings.showDescriptions && <LuCheck size={14} className="text-blue-400" />}
              </button>

              <div className="w-full h-[1px] bg-zinc-800 my-1" />

              <button
                onClick={onToggleAllMinimized}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-left text-zinc-300 transition-colors"
              >
                <span>{allMinimized ? 'Expand All Tables' : 'Minimize All Tables'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-zinc-800 my-auto" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <LuUndo2 size={15} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <LuRedo2 size={15} />
        </button>

        <div className="w-[1px] h-4 bg-zinc-800 my-auto" />

        {/* Zoom & Fit */}
        <button
          onClick={onZoomOut}
          title="Zoom out"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LuZoomOut size={15} />
        </button>
        <button
          onClick={onResetZoom}
          title="Reset zoom (100%)"
          className="px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors min-w-[38px] text-center"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={onZoomIn}
          title="Zoom in"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LuZoomIn size={15} />
        </button>
        <button
          onClick={onFitToScreen}
          title="Fit diagram to screen"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LuMaximize size={15} />
        </button>
      </div>

      {/* Schema Validation Banner */}
      <ERValidationBanner
        issues={validationIssues}
        onSelectTable={onSelectTable}
        onSelectRelationship={onSelectRelationship}
      />
    </div>
  );
};

