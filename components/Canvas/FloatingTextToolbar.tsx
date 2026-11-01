import React from 'react';
import { CanvasElement, ViewTransform } from '@/types/canvas';
import { FONT_FAMILIES, FONT_SIZE_PRESETS, DEFAULT_STROKE_COLORS } from '@/lib/constants';
import {
  LuPlus,
  LuMinus,
  LuBold,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
} from 'react-icons/lu';

interface FloatingTextToolbarProps {
  element: CanvasElement;
  viewTransform: ViewTransform;
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
}

export const FloatingTextToolbar: React.FC<FloatingTextToolbarProps> = ({
  element,
  viewTransform,
  onUpdateElement,
}) => {
  const { x, y, width, fontSize = 20, fontFamily = FONT_FAMILIES[0].value, fontWeight = 'normal', textAlign = 'left', strokeColor = '#ffffff' } = element;
  const { x: panX, y: panY, scale } = viewTransform;

  // Position floating bar right above the text element
  const screenX = x * scale + panX;
  const screenY = Math.max(70, y * scale + panY - 48);

  const handleDecreaseSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = fontSize || 20;
    const nextSize = Math.max(8, cur - 2);
    onUpdateElement({ fontSize: nextSize });
  };

  const handleIncreaseSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cur = fontSize || 20;
    const nextSize = Math.min(160, cur + 2);
    onUpdateElement({ fontSize: nextSize });
  };

  const toggleBold = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateElement({ fontWeight: fontWeight === 'bold' ? 'normal' : 'bold' });
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        zIndex: 45,
      }}
      className="flex items-center gap-1.5 p-1 bg-zinc-900 border border-zinc-700/90 rounded-lg shadow-xl text-zinc-200 text-xs backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-100"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Font Family Selector */}
      <select
        value={fontFamily}
        onChange={(e) => onUpdateElement({ fontFamily: e.target.value })}
        className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-100 outline-none max-w-[130px] truncate cursor-pointer hover:bg-zinc-700/80"
        title="Font Family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <div className="w-[1px] h-4 bg-zinc-750 bg-zinc-700" />

      {/* Font Size Stepper [-] Size [+] */}
      <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded overflow-hidden">
        <button
          onClick={handleDecreaseSize}
          title="Decrease text size ( -2px )"
          className="px-1.5 py-1 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
        >
          <LuMinus size={12} />
        </button>

        <span className="px-1.5 font-mono text-[11px] min-w-[28px] text-center font-medium text-white">
          {fontSize}px
        </span>

        <button
          onClick={handleIncreaseSize}
          title="Increase text size ( +2px )"
          className="px-1.5 py-1 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
        >
          <LuPlus size={12} />
        </button>
      </div>

      {/* Bold Toggle */}
      <button
        onClick={toggleBold}
        title="Toggle Bold"
        className={`p-1 rounded border transition-colors ${
          fontWeight === 'bold'
            ? 'bg-blue-600 border-blue-500 text-white'
            : 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
        }`}
      >
        <LuBold size={13} />
      </button>

      {/* Alignment */}
      <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded overflow-hidden">
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            onClick={() => onUpdateElement({ textAlign: align })}
            title={`Align ${align}`}
            className={`p-1 hover:bg-zinc-700 transition-colors ${
              textAlign === align ? 'bg-blue-600/40 text-blue-300' : 'text-zinc-400'
            }`}
          >
            {align === 'left' && <LuAlignLeft size={12} />}
            {align === 'center' && <LuAlignCenter size={12} />}
            {align === 'right' && <LuAlignRight size={12} />}
          </button>
        ))}
      </div>

      <div className="w-[1px] h-4 bg-zinc-700" />

      {/* Quick Color Picker */}
      <div className="flex items-center gap-1 pl-0.5">
        <input
          type="color"
          value={strokeColor.startsWith('#') ? strokeColor : '#ffffff'}
          onChange={(e) => onUpdateElement({ strokeColor: e.target.value })}
          className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
          title="Text Color"
        />
      </div>
    </div>
  );
};

