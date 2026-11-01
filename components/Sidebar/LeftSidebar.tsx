import React, { useRef } from 'react';
import { Tool, FigureType, LineRouting } from '@/types/canvas';
import {
  LuMousePointer,
  LuHand,
  LuSquare,
  LuCircle,
  LuArrowUpRight,
  LuMinus,
  LuPencil,
  LuType,
  LuSmile,
  LuShapes,
  LuDownload,
  LuSave,
  LuFolderOpen,
  LuTrash2,
} from 'react-icons/lu';

interface LeftSidebarProps {
  currentTool: Tool;
  onSelectTool: (tool: Tool) => void;
  onOpenIconPicker: () => void;
  onOpenFigurePicker: () => void;
  selectedFigureType: FigureType;
  activeLineRouting: LineRouting;
  onOpenLineRoutingPicker: () => void;
  onExportPng: () => void;
  onSaveToFile: () => void;
  onOpenLocalFile: (file: File) => void;
  onClearCanvas: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentTool,
  onSelectTool,
  onOpenIconPicker,
  onOpenFigurePicker,
  activeLineRouting,
  onOpenLineRoutingPicker,
  onExportPng,
  onSaveToFile,
  onOpenLocalFile,
  onClearCanvas,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenLocalFile(file);
      e.target.value = '';
    }
  };

  const getLineRoutingBadge = () => {
    if (activeLineRouting === 'orthogonal') return '┌─┘';
    if (activeLineRouting === 'curved') return '∿';
    if (activeLineRouting === 'stepped' || (activeLineRouting as string) === 'zigzag') return '⮑';
    return null;
  };

  const tools: {
    id: Tool;
    label: string;
    shortcut: string;
    icon: React.ReactNode;
    badge?: string | null;
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
  }[] = [
    {
      id: 'select',
      label: 'Select / Move',
      shortcut: 'V',
      icon: <LuMousePointer size={18} />,
    },
    {
      id: 'pan',
      label: 'Hand / Pan',
      shortcut: 'H / Space',
      icon: <LuHand size={18} />,
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      shortcut: 'R',
      icon: <LuSquare size={18} />,
    },
    {
      id: 'ellipse',
      label: 'Ellipse / Circle',
      shortcut: 'O',
      icon: <LuCircle size={18} />,
    },
    {
      id: 'arrow',
      label: `Arrow (${activeLineRouting})`,
      shortcut: 'A',
      icon: <LuArrowUpRight size={18} />,
      badge: getLineRoutingBadge(),
      onContextMenu: (e) => {
        e.preventDefault();
        onOpenLineRoutingPicker();
      },
    },
    {
      id: 'line',
      label: `Line (${activeLineRouting})`,
      shortcut: 'L',
      icon: <LuMinus size={18} />,
      badge: getLineRoutingBadge(),
      onContextMenu: (e) => {
        e.preventDefault();
        onOpenLineRoutingPicker();
      },
    },
    {
      id: 'draw',
      label: 'Free Draw (Pen)',
      shortcut: 'P',
      icon: <LuPencil size={18} />,
    },
    {
      id: 'text',
      label: 'Free Text (Double click anywhere)',
      shortcut: 'T',
      icon: <LuType size={18} />,
    },
    {
      id: 'icon',
      label: 'React Icons Library',
      shortcut: 'I',
      icon: <LuSmile size={18} />,
      onClick: () => {
        onSelectTool('icon');
        onOpenIconPicker();
      },
    },
    {
      id: 'figure',
      label: 'Figures & Flowcharts',
      shortcut: 'F',
      icon: <LuShapes size={18} />,
      onClick: () => {
        onSelectTool('figure');
        onOpenFigurePicker();
      },
    },
  ];

  return (
    <aside className="fixed left-3 top-16 z-40 flex flex-col items-center bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl p-1.5 backdrop-blur-md text-zinc-300">
      {/* Hidden file input for opening boards */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".whiteboard,.json"
        className="hidden"
      />

      {/* Drawing & Navigation Tools */}
      <div className="flex flex-col gap-1 w-full">
        {tools.map((t) => {
          const isActive = currentTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                if (t.onClick) {
                  t.onClick();
                } else {
                  onSelectTool(t.id);
                }
              }}
              onContextMenu={t.onContextMenu}
              title={`${t.label} (${t.shortcut})`}
              className={`relative group p-2.5 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'hover:bg-zinc-800 hover:text-white text-zinc-400'
              }`}
            >
              {t.icon}
              {t.badge && (
                <span className="absolute -top-1 -right-1 text-[9px] font-mono bg-blue-500 text-white px-1 rounded-full">
                  {t.badge}
                </span>
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {t.label} <span className="text-zinc-400 ml-1">({t.shortcut})</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-8 h-[1px] bg-zinc-800 my-2" />

      {/* Quick Line Routing Picker Button */}
      <button
        onClick={onOpenLineRoutingPicker}
        title={`Line Routing Style: ${activeLineRouting} (Click to change)`}
        className="relative group p-2 rounded-lg flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-all text-xs font-mono"
      >
        <span className="text-sm font-bold">
          {activeLineRouting === 'straight' && '―'}
          {activeLineRouting === 'orthogonal' && '┌─┘'}
          {activeLineRouting === 'curved' && '∿'}
          {(activeLineRouting === 'stepped' || (activeLineRouting as string) === 'zigzag') && '⮑'}
        </span>
        <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
          Line Type: {activeLineRouting === 'stepped' ? 'multi-node orthogonal' : activeLineRouting}
        </span>
      </button>

      <div className="w-8 h-[1px] bg-zinc-800 my-1.5" />

      {/* File Operations (PNG Export, Save File, Open File) */}
      <div className="flex flex-col gap-1 w-full">
        {/* Export PNG */}
        <button
          onClick={onExportPng}
          title="Export Diagram as PNG"
          className="relative group p-2.5 rounded-lg flex items-center justify-center hover:bg-emerald-600/20 hover:text-emerald-400 text-zinc-400 transition-all"
        >
          <LuDownload size={18} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Export as PNG Image
          </span>
        </button>

        {/* Save to Local File */}
        <button
          onClick={onSaveToFile}
          title="Save Diagram to Local File (.whiteboard)"
          className="relative group p-2.5 rounded-lg flex items-center justify-center hover:bg-blue-600/20 hover:text-blue-400 text-zinc-400 transition-all"
        >
          <LuSave size={18} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Save to Local File (.whiteboard)
          </span>
        </button>

        {/* Open Local File */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Open Local File to edit again"
          className="relative group p-2.5 rounded-lg flex items-center justify-center hover:bg-amber-600/20 hover:text-amber-400 text-zinc-400 transition-all"
        >
          <LuFolderOpen size={18} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Open File to Edit Again
          </span>
        </button>

        <div className="w-8 h-[1px] bg-zinc-800 my-1 mx-auto" />

        {/* Clear Canvas */}
        <button
          onClick={onClearCanvas}
          title="Clear Canvas"
          className="relative group p-2.5 rounded-lg flex items-center justify-center hover:bg-red-600/20 hover:text-red-400 text-zinc-400 transition-all"
        >
          <LuTrash2 size={18} />
          <span className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-700/80 text-red-300 text-xs rounded shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            Clear Canvas
          </span>
        </button>
      </div>
    </aside>
  );
};
