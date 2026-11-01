import React from 'react';
import { FIGURE_DEFINITIONS } from '@/lib/constants';
import { FigureType } from '@/types/canvas';
import {
  LuDatabase,
  LuServer,
  LuCloud,
  LuTriangle,
  LuHexagon,
  LuStar,
  LuMessageSquare,
  LuUser,
  LuDiamond,
} from 'react-icons/lu';

interface FigurePickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFigure: (type: FigureType) => void;
}

export const FigurePickerPopup: React.FC<FigurePickerPopupProps> = ({
  isOpen,
  onClose,
  onSelectFigure,
}) => {
  if (!isOpen) return null;

  const getFigureIcon = (type: FigureType) => {
    switch (type) {
      case 'diamond':
        return <LuDiamond size={20} />;
      case 'cylinder':
        return <LuDatabase size={20} />;
      case 'cloud':
        return <LuCloud size={20} />;
      case 'server':
        return <LuServer size={20} />;
      case 'triangle':
        return <LuTriangle size={20} />;
      case 'hexagon':
        return <LuHexagon size={20} />;
      case 'star':
        return <LuStar size={20} />;
      case 'speech':
        return <LuMessageSquare size={20} />;
      case 'stickman':
        return <LuUser size={20} />;
    }
  };

  return (
    <div className="absolute left-16 top-24 z-50 w-72 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 text-zinc-100 backdrop-blur-md">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800 mb-2">
        <span className="text-xs font-semibold text-zinc-300">Figures & Flowcharts</span>
        <span className="text-[10px] text-zinc-500">Pick to draw</span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {FIGURE_DEFINITIONS.map((fig) => (
          <button
            key={fig.type}
            onClick={() => {
              onSelectFigure(fig.type);
              onClose();
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 hover:border-blue-500/50 hover:text-blue-400 transition-all text-zinc-300"
            title={fig.description}
          >
            <div className="mb-1">{getFigureIcon(fig.type)}</div>
            <span className="text-[10px] truncate max-w-full font-medium">
              {fig.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

