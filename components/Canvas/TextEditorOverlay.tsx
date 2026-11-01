import React, { useEffect, useRef, useState } from 'react';
import { CanvasElement, ViewTransform } from '@/types/canvas';
import { FONT_FAMILIES } from '@/lib/constants';
import { LuMinus, LuPlus } from 'react-icons/lu';

interface TextEditorOverlayProps {
  element: CanvasElement;
  viewTransform: ViewTransform;
  onCommit: (text: string, updates?: Partial<CanvasElement>) => void;
  onCancel: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  element,
  viewTransform,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentFontSize, setCurrentFontSize] = useState(element.fontSize || 20);
  const [currentFontFamily, setCurrentFontFamily] = useState(element.fontFamily || FONT_FAMILIES[0].value);

  const { x, y, text = '', strokeColor, textAlign = 'left' } = element;
  const { x: panX, y: panY, scale } = viewTransform;

  // Convert canvas coords to viewport screen pixels
  const screenX = x * scale + panX;
  const screenY = y * scale + panY;

  // Auto-resize textarea to fit text content
  const adjustSize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(28 * scale, textareaRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
      adjustSize();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onCommit(textareaRef.current?.value || '', {
        fontSize: currentFontSize,
        fontFamily: currentFontFamily,
      });
    }
  };

  const handleBlur = () => {
    onCommit(textareaRef.current?.value || '', {
      fontSize: currentFontSize,
      fontFamily: currentFontFamily,
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        minWidth: `${Math.max(140, 180 * scale)}px`,
        maxWidth: '85vw',
        zIndex: 50,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Floating mini toolbar while writing */}
      <div className="flex items-center gap-1.5 mb-1.5 p-1 bg-zinc-900 border border-zinc-700/80 rounded-lg shadow-xl text-zinc-200 text-xs w-max backdrop-blur-md select-none">
        <select
          value={currentFontFamily}
          onChange={(e) => {
            setCurrentFontFamily(e.target.value);
            adjustSize();
          }}
          className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[11px] text-zinc-100 outline-none max-w-[120px] truncate"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => setCurrentFontSize((s) => Math.max(8, s - 2))}
            title="Decrease font size"
            className="px-1.5 py-0.5 hover:bg-zinc-700 text-zinc-300 hover:text-white"
          >
            <LuMinus size={11} />
          </button>
          <span className="px-1 font-mono text-[10px] min-w-[24px] text-center font-medium text-white">
            {currentFontSize}px
          </span>
          <button
            type="button"
            onClick={() => setCurrentFontSize((s) => Math.min(160, s + 2))}
            title="Increase font size"
            className="px-1.5 py-0.5 hover:bg-zinc-700 text-zinc-300 hover:text-white"
          >
            <LuPlus size={11} />
          </button>
        </div>
      </div>

      {/* Free Text Textarea - completely transparent and borderless */}
      <textarea
        ref={textareaRef}
        defaultValue={text}
        placeholder="Type free text..."
        onInput={adjustSize}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        rows={Math.max(1, text.split('\n').length)}
        style={{
          width: '100%',
          minHeight: `${Math.max(24, currentFontSize * scale * 1.3)}px`,
          background: 'transparent',
          color: strokeColor || '#ffffff',
          fontSize: `${Math.max(12, currentFontSize * scale)}px`,
          fontFamily: currentFontFamily,
          textAlign: textAlign,
          border: 'none',
          outline: 'none',
          padding: '0px 2px',
          margin: 0,
          resize: 'none',
          boxShadow: 'none',
          lineHeight: '1.25',
          caretColor: strokeColor || '#3b82f6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};
