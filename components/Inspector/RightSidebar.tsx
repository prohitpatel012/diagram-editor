import React from 'react';
import {
  CanvasElement,
  CanvasSettings,
  StrokeStyle,
  FillStyle,
  FigureType,
} from '@/types/canvas';
import {
  DEFAULT_STROKE_COLORS,
  DEFAULT_FILL_COLORS,
  STROKE_WIDTH_PRESETS,
  STROKE_STYLES,
  LINE_ROUTING_OPTIONS,
  CORNER_RADIUS_PRESETS,
  FONT_FAMILIES,
  FIGURE_DEFINITIONS,
  CANVAS_BACKGROUNDS,
} from '@/lib/constants';
import { StorageStatus } from '@/lib/storage';
import {
  LuBringToFront,
  LuSendToBack,
  LuCopy,
  LuTrash2,
  // LuGrid,
  LuSparkles,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuClock,
  LuSlidersHorizontal,
  LuGrid2X2,
  LuCheckCheck,
  // LuCheckCircle2,
  // LuSliders,
} from 'react-icons/lu';

interface RightSidebarProps {
  selectedElements: CanvasElement[];
  onUpdateElement: (updates: Partial<CanvasElement>) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canvasSettings: CanvasSettings;
  onUpdateCanvasSettings: (settings: Partial<CanvasSettings>) => void;
  storageStatus: StorageStatus;
  onOpenIconPicker: () => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedElements,
  onUpdateElement,
  onBringToFront,
  onSendToBack,
  onDuplicate,
  onDelete,
  canvasSettings,
  onUpdateCanvasSettings,
  storageStatus,
  onOpenIconPicker,
}) => {
  const isSelected = selectedElements.length > 0;
  const primaryElement = selectedElements[0];

  return (
    <aside className="fixed right-3 top-16 z-40 w-72 max-h-[calc(100vh-5rem)] overflow-y-auto bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl p-4 backdrop-blur-md text-zinc-200 text-xs scrollbar-thin">
      {isSelected && primaryElement ? (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-semibold text-white capitalize flex items-center gap-1.5 text-sm">
              <LuSlidersHorizontal size={14} className="text-blue-400" />
              {selectedElements.length > 1
                ? `${selectedElements.length} elements selected`
                : `${primaryElement.type} Properties`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onDuplicate}
                title="Duplicate (Ctrl+D)"
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <LuCopy size={14} />
              </button>
              <button
                onClick={onDelete}
                title="Delete (Delete / Backspace)"
                className="p-1.5 rounded hover:bg-red-900/30 text-zinc-400 hover:text-red-400"
              >
                <LuTrash2 size={14} />
              </button>
            </div>
          </div>

          {/* 1. Stroke / Border & Foreground Color */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Border & Foreground Color</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={primaryElement.strokeColor?.startsWith('#') ? primaryElement.strokeColor : '#ffffff'}
                  onChange={(e) => onUpdateElement({ strokeColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
                />
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {primaryElement.strokeColor}
                </span>
              </div>
            </div>
            {/* Color Swatches */}
            <div className="grid grid-cols-8 gap-1 pt-1">
              {DEFAULT_STROKE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onUpdateElement({ strokeColor: color })}
                  style={{ backgroundColor: color }}
                  className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${primaryElement.strokeColor === color
                    ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                    : 'border-zinc-700/60'
                    }`}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* 2. Background / Fill Color (for Rectangle, Ellipse, Figure) */}
          {primaryElement.type !== 'line' && primaryElement.type !== 'arrow' && primaryElement.type !== 'draw' && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Background / Fill Color</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={
                      primaryElement.fillColor?.startsWith('#')
                        ? primaryElement.fillColor.slice(0, 7)
                        : '#ffffff'
                    }
                    onChange={(e) => onUpdateElement({ fillColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border border-zinc-700 bg-transparent p-0"
                  />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    {primaryElement.fillColor === 'transparent' ? 'None' : primaryElement.fillColor}
                  </span>
                </div>
              </div>

              {/* Quick Fill style toggles */}
              <div className="flex items-center gap-1 py-1">
                {(['transparent', 'semi', 'solid'] as FillStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      if (style === 'transparent') {
                        onUpdateElement({ fillColor: 'transparent', fillStyle: 'transparent' });
                      } else if (style === 'semi') {
                        const base = primaryElement.strokeColor || '#3b82f6';
                        onUpdateElement({ fillColor: base + '33', fillStyle: 'semi' });
                      } else {
                        onUpdateElement({
                          fillColor: primaryElement.strokeColor || '#3b82f6',
                          fillStyle: 'solid',
                        });
                      }
                    }}
                    className={`flex-1 py-1 px-1.5 text-[11px] rounded border transition-colors capitalize ${primaryElement.fillStyle === style
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 font-medium'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                      }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              {/* Fill Palette Swatches */}
              <div className="grid grid-cols-8 gap-1 pt-0.5">
                {DEFAULT_FILL_COLORS.map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => onUpdateElement({ fillColor: color })}
                    style={{ backgroundColor: color === 'transparent' ? 'transparent' : color }}
                    className={`w-6 h-6 rounded-md border relative transition-transform hover:scale-110 ${primaryElement.fillColor === color
                      ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                      : 'border-zinc-700/60'
                      }`}
                    title={color === 'transparent' ? 'Transparent' : color}
                  >
                    {color === 'transparent' && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-red-400 font-bold">
                        /
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Border Style: Solid, Dashed, Dotted */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <span className="text-zinc-400 font-medium">Border / Stroke Style</span>
            <div className="grid grid-cols-3 gap-1.5">
              {STROKE_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => onUpdateElement({ strokeStyle: style.value })}
                  className={`py-1.5 px-2 rounded border flex flex-col items-center justify-center transition-all ${primaryElement.strokeStyle === style.value
                    ? 'bg-blue-600/20 border-blue-500 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                  <span className="text-[11px] mb-1">{style.label}</span>
                  <div
                    className="w-12 h-[2px] bg-zinc-300"
                    style={{
                      borderTop: `2px ${style.value === 'solid' ? 'solid' : style.value} currentColor`,
                      background: 'none',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 4. Stroke Width */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Stroke Width</span>
              <span className="text-zinc-400 font-mono text-[11px]">{primaryElement.strokeWidth}px</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {STROKE_WIDTH_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onUpdateElement({ strokeWidth: p.value })}
                  className={`py-1 rounded border text-[11px] transition-colors ${primaryElement.strokeWidth === p.value
                    ? 'bg-blue-600 border-blue-500 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                  {p.value}px
                </button>
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="24"
              value={primaryElement.strokeWidth}
              onChange={(e) => onUpdateElement({ strokeWidth: Number(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* 5. Corner Radius (for Rectangle) */}
          {primaryElement.type === 'rectangle' && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Corner Radius</span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {primaryElement.cornerRadius || 0}px
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {CORNER_RADIUS_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => onUpdateElement({ cornerRadius: p.value })}
                    className={`py-1 rounded border text-[11px] transition-colors ${(primaryElement.cornerRadius || 0) === p.value
                      ? 'bg-blue-600 border-blue-500 text-white font-medium'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 6. Opacity */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Opacity</span>
              <span className="text-zinc-400 font-mono text-[11px]">{primaryElement.opacity}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={primaryElement.opacity}
              onChange={(e) => onUpdateElement({ opacity: Number(e.target.value) })}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* 6.5 Line & Arrow Routing Types (Straight, Orthogonal Elbow, Curved, Zigzag) */}
          {(primaryElement.type === 'line' || primaryElement.type === 'arrow') && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 font-medium">Line Routing / Connector</span>
                <span className="text-blue-400 text-[10px] font-mono capitalize">
                  {primaryElement.lineRouting || 'straight'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {LINE_ROUTING_OPTIONS.map((opt) => {
                  const isCur = (primaryElement.lineRouting || 'straight') === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => onUpdateElement({ lineRouting: opt.value })}
                      className={`p-2 rounded-lg border flex flex-col items-start gap-1 transition-all ${
                        isCur
                          ? 'bg-blue-600/25 border-blue-500 text-white shadow-sm'
                          : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                      title={opt.description}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[11px] font-medium text-zinc-200">{opt.label}</span>
                        <span className="text-xs text-blue-400 font-mono">
                          {opt.value === 'straight' && '―'}
                          {opt.value === 'orthogonal' && '┌─┘'}
                          {opt.value === 'curved' && '∿'}
                          {opt.value === 'zigzag' && '⚡'}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-500 line-clamp-1">
                        {opt.value === 'orthogonal' ? 'Connects 2+ components' : opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. Icon specific controls */}
          {primaryElement.type === 'icon' && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-zinc-400 font-medium">React Icon Settings</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400 text-[11px]">Size (2px to 500px):</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="2"
                    max="1000"
                    value={Math.round(primaryElement.width)}
                    onChange={(e) => {
                      const sz = Math.max(2, Number(e.target.value) || 2);
                      onUpdateElement({ width: sz, height: sz });
                    }}
                    className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-right font-mono text-xs text-white"
                  />
                  <span className="text-zinc-500">px</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[2, 16, 32, 64].map((size) => (
                  <button
                    key={size}
                    onClick={() => onUpdateElement({ width: size, height: size })}
                    className="py-1 rounded border border-zinc-800 bg-zinc-800/40 text-[10px] hover:bg-zinc-800 text-zinc-300"
                  >
                    {size}px
                  </button>
                ))}
              </div>
              <button
                onClick={onOpenIconPicker}
                className="w-full py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-200 text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <LuSparkles size={14} className="text-amber-400" />
                Change Icon ({primaryElement.iconName?.replace(/^(Lu|Fa)/, '')})
              </button>
            </div>
          )}

          {/* 8. Figure specific controls */}
          {primaryElement.type === 'figure' && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-zinc-400 font-medium">Figure Shape</span>
              <select
                value={primaryElement.figureType}
                onChange={(e) => onUpdateElement({ figureType: e.target.value as FigureType })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                {FIGURE_DEFINITIONS.map((f) => (
                  <option key={f.type} value={f.type}>
                    {f.label}
                  </option>
                ))}
              </select>

              {/* Label inside figure */}
              <div className="space-y-1">
                <span className="text-zinc-400 text-[11px]">Inner Label:</span>
                <input
                  type="text"
                  placeholder="Double click figure or type here..."
                  value={primaryElement.text || ''}
                  onChange={(e) => onUpdateElement({ text: e.target.value })}
                  className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* 9. Text specific controls */}
          {(primaryElement.type === 'text' || primaryElement.text) && (
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <span className="text-zinc-400 font-medium">Typography</span>
              {/* Font Size */}
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">Size:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="8"
                    max="144"
                    value={primaryElement.fontSize || 18}
                    onChange={(e) => onUpdateElement({ fontSize: Number(e.target.value) })}
                    className="w-16 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-right font-mono text-xs text-white"
                  />
                  <span className="text-zinc-500">px</span>
                </div>
              </div>
              {/* Font Family */}
              <select
                value={primaryElement.fontFamily || FONT_FAMILIES[0].value}
                onChange={(e) => onUpdateElement({ fontFamily: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.label} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
              {/* Text Align */}
              <div className="flex items-center gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => onUpdateElement({ textAlign: align })}
                    className={`flex-1 py-1 rounded border flex items-center justify-center transition-colors ${primaryElement.textAlign === align
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                      }`}
                  >
                    {align === 'left' && <LuAlignLeft size={14} />}
                    {align === 'center' && <LuAlignCenter size={14} />}
                    {align === 'right' && <LuAlignRight size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 10. Layer Arrangement */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <span className="text-zinc-400 font-medium">Layer Ordering</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onBringToFront}
                className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-300 flex items-center justify-center gap-1 transition-colors"
              >
                <LuBringToFront size={14} /> Bring to Front
              </button>
              <button
                onClick={onSendToBack}
                className="py-1.5 px-2 bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-zinc-300 flex items-center justify-center gap-1 transition-colors"
              >
                <LuSendToBack size={14} /> Send to Back
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Canvas & Workspace Settings (When nothing is selected) */
        <div className="space-y-4">
          <div className="border-b border-zinc-800 pb-2">
            <span className="font-semibold text-white flex items-center gap-1.5 text-sm">
              <LuGrid2X2 size={14} className="text-blue-400" />
              Canvas Settings
            </span>
            <p className="text-[10px] text-zinc-500 mt-0.5">Global whiteboard workspace</p>
          </div>

          {/* Canvas Background */}
          <div className="space-y-1.5">
            <span className="text-zinc-400 font-medium">Canvas Background</span>
            <div className="grid grid-cols-2 gap-1.5">
              {CANVAS_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => onUpdateCanvasSettings({ backgroundColor: bg.value })}
                  className={`py-1.5 px-2 rounded border flex items-center gap-2 transition-all ${canvasSettings.backgroundColor === bg.value
                    ? 'border-blue-500 bg-blue-600/20 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0"
                    style={{ backgroundColor: bg.value }}
                  />
                  <span className="truncate">{bg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid Style */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-800">
            <span className="text-zinc-400 font-medium">Grid Style</span>
            <div className="grid grid-cols-3 gap-1">
              {(['dots', 'lines', 'none'] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => onUpdateCanvasSettings({ gridType: style })}
                  className={`py-1.5 rounded border capitalize transition-colors ${canvasSettings.gridType === style
                    ? 'bg-blue-600 border-blue-500 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Snap to Grid */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-zinc-400 font-medium">Snap to Grid</span>
            <button
              onClick={() => onUpdateCanvasSettings({ snapToGrid: !canvasSettings.snapToGrid })}
              className={`w-10 h-5 rounded-full transition-colors relative ${canvasSettings.snapToGrid ? 'bg-blue-600' : 'bg-zinc-700'
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${canvasSettings.snapToGrid ? 'right-0.5' : 'left-0.5'
                  }`}
              />
            </button>
          </div>

          {/* 7-Day Session Card */}
          <div className="p-3 bg-zinc-800/40 border border-zinc-800 rounded-lg space-y-1.5 pt-2.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
              <LuCheckCheck size={13} />
              <span>Session Auto-Save Active</span>
            </div>
            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Your diagram state is kept automatically across page refreshes.
            </p>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60">
              <LuClock size={11} className="text-blue-400" />
              <span>Retention: {storageStatus.remainingDays}d {storageStatus.remainingHours}h remaining</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
