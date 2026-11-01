import React, { useEffect, useRef } from 'react';
import { CanvasElement, ViewTransform } from '@/types/canvas';

interface TextEditorOverlayProps {
  element: CanvasElement;
  viewTransform: ViewTransform;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  element,
  viewTransform,
  onCommit,
  onCancel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { x, y, text = '', fontSize = 20, fontFamily, strokeColor, textAlign = 'left' } = element;
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
      // Set cursor at end
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
      // Enter saves free text
      e.preventDefault();
      e.stopPropagation();
      onCommit(textareaRef.current?.value || '');
    }
  };

  const handleBlur = () => {
    onCommit(textareaRef.current?.value || '');
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${screenX}px`,
        top: `${screenY}px`,
        minWidth: `${Math.max(120, 160 * scale)}px`,
        maxWidth: '80vw',
        zIndex: 50,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
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
          minHeight: `${Math.max(24, fontSize * scale * 1.3)}px`,
          background: 'transparent',
          color: strokeColor || '#ffffff',
          fontSize: `${Math.max(12, fontSize * scale)}px`,
          fontFamily: fontFamily || 'Inter, sans-serif',
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
