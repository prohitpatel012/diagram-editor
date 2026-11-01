import React, { useState } from 'react';
import { ViewTransform } from '@/types/canvas';
import { StorageStatus } from '@/lib/storage';
import {
  LuUndo2,
  LuRedo2,
  LuZoomIn,
  LuZoomOut,
  LuMaximize,
  LuCheck,
  LuClock,
  LuSparkles,
  LuCircleHelp,
  LuX,
  LuDatabase,
  LuLayers,
  LuFileText,
} from 'react-icons/lu';

export type AppMode = 'whiteboard' | 'er-diagram' | 'meeting-notes';

interface TopBarProps {
  title: string;
  onUpdateTitle: (title: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  viewTransform: ViewTransform;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToContent: () => void;
  storageStatus: StorageStatus;
  activeMode?: AppMode;
  onSelectMode?: (mode: AppMode) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  onUpdateTitle,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  viewTransform,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToContent,
  storageStatus,
  activeMode = 'whiteboard',
  onSelectMode,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const zoomPercent = Math.round(viewTransform.scale * 100);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-13 z-30 flex items-center justify-between px-4 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md text-zinc-100 select-none">
        {/* Left: Brand & Editable Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <LuSparkles size={18} className="text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
              Eraser<span className="text-blue-400">Board</span>
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          {/* Board Title */}
          {isEditingTitle ? (
            <input
              type="text"
              value={title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingTitle(false);
              }}
              autoFocus
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs text-white outline-none font-medium max-w-[200px]"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 px-2 py-1 rounded transition-colors truncate max-w-[200px]"
              title="Click to rename board"
            >
              {title}
            </button>
          )}

          {/* 7-day Session retention pill badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300 hidden xl:flex"
            title={`Session auto-saved. Active for ${storageStatus.remainingDays} days ${storageStatus.remainingHours} hours.`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <LuClock size={11} className="text-zinc-400" />
            <span>7d Session Active</span>
            <span className="text-zinc-500 text-[10px]">
              ({storageStatus.remainingDays}d {storageStatus.remainingHours}h)
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher (Whiteboard vs ER Diagram Builder) */}
        <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
          <button
            onClick={() => onSelectMode?.('whiteboard')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'whiteboard'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <LuLayers size={13} /> Whiteboard
          </button>
          <button
            onClick={() => onSelectMode?.('er-diagram')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'er-diagram'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <LuDatabase size={13} className={activeMode === 'er-diagram' ? 'text-white' : 'text-emerald-400'} />
            <span>ER Diagram Builder</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/40 text-indigo-200 font-mono hidden sm:inline">
              SQL
            </span>
          </button>
          <button
            onClick={() => onSelectMode?.('meeting-notes')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'meeting-notes'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <LuFileText size={13} className={activeMode === 'meeting-notes' ? 'text-white' : 'text-amber-400'} />
            <span>Meeting Notes</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/30 text-amber-200 font-mono hidden sm:inline">
              Ctrl+V
            </span>
          </button>
        </div>

        {/* Center-Right: Undo / Redo */}
        <div className="flex items-center gap-1 bg-zinc-800/40 border border-zinc-800 p-1 rounded-lg">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white transition-colors"
          >
            <LuUndo2 size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 hover:text-white transition-colors"
          >
            <LuRedo2 size={16} />
          </button>
        </div>

        {/* Right: Zoom controls & Help */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-zinc-800/60 border border-zinc-700/60 rounded-lg p-0.5 text-xs">
            <button
              onClick={onZoomOut}
              title="Zoom Out (Ctrl -)"
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
            >
              <LuZoomOut size={14} />
            </button>
            <button
              onClick={onResetZoom}
              title="Reset Zoom to 100%"
              className="px-2 py-0.5 font-mono text-[11px] hover:text-blue-400 text-zinc-200"
            >
              {zoomPercent}%
            </button>
            <button
              onClick={onZoomIn}
              title="Zoom In (Ctrl +)"
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
            >
              <LuZoomIn size={14} />
            </button>
            <div className="w-[1px] h-3 bg-zinc-700 mx-0.5" />
            <button
              onClick={onFitToContent}
              title="Fit to Content"
              className="p-1.5 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
            >
              <LuMaximize size={14} />
            </button>
          </div>

          {/* Help / Shortcuts button */}
          <button
            onClick={() => setShowHelp(true)}
            title="Keyboard Shortcuts & Gestures"
            className="p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <LuCircleHelp size={16} />
          </button>
        </div>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-base font-semibold text-white">Whiteboard Shortcuts & Gestures</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <LuX size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Free Infinite Scroll / Pan</span>
                <span className="font-mono text-blue-400">Space + Drag or Middle Click or Wheel</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Zoom Canvas</span>
                <span className="font-mono text-blue-400">Ctrl + Wheel or Pinch Trackpad</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Select Tool / Pan Tool</span>
                <span className="font-mono text-zinc-300">V / H</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Rectangle / Ellipse</span>
                <span className="font-mono text-zinc-300">R / O</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Arrow / Line</span>
                <span className="font-mono text-zinc-300">A / L</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Free Draw (Pen)</span>
                <span className="font-mono text-zinc-300">P</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Text Box</span>
                <span className="font-mono text-zinc-300">T</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">React Icons Library</span>
                <span className="font-mono text-zinc-300">I</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Figures & Flowcharts</span>
                <span className="font-mono text-zinc-300">F</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Duplicate Element</span>
                <span className="font-mono text-zinc-300">Ctrl + D</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Delete Element</span>
                <span className="font-mono text-zinc-300">Delete / Backspace</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Undo / Redo</span>
                <span className="font-mono text-zinc-300">Ctrl + Z / Ctrl + Y</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
