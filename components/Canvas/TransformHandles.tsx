import React from 'react';
import { CanvasElement, ResizeHandle, ViewTransform } from '@/types/canvas';
import { getLinePath } from './CanvasElementRenderer';

interface TransformHandlesProps {
  element: CanvasElement;
  viewTransform: ViewTransform;
  onHandleMouseDown: (e: React.MouseEvent, handle: ResizeHandle) => void;
}

export const TransformHandles: React.FC<TransformHandlesProps> = ({
  element,
  viewTransform,
  onHandleMouseDown,
}) => {
  const { x, y, width, height, type } = element;
  const { scale } = viewTransform;

  // Handle dimensions in canvas coordinate space (scaled so it looks ~9px on screen)
  const handleSize = Math.max(6, 9 / scale);
  const halfHandle = handleSize / 2;
  const strokeWidth = 1.5 / scale;

  if (type === 'line' || type === 'arrow') {
    const x1 = x;
    const y1 = y;
    const x2 = x + width;
    const y2 = y + height;

    return (
      <g className="transform-handles">
        {/* Connection guide along the actual line path */}
        <path
          d={getLinePath(element)}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${4 / scale} ${4 / scale}`}
          pointerEvents="none"
        />

        {/* Start Handle */}
        <circle
          cx={x1}
          cy={y1}
          r={handleSize * 0.75}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => onHandleMouseDown(e, 'start')}
        />

        {/* End Handle */}
        <circle
          cx={x2}
          cy={y2}
          r={handleSize * 0.75}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={strokeWidth}
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => onHandleMouseDown(e, 'end')}
        />
      </g>
    );
  }

  // 8 handles coordinates
  const left = x;
  const top = y;
  const right = x + width;
  const bottom = y + height;
  const midX = x + width / 2;
  const midY = y + height / 2;

  const handles: { handle: ResizeHandle; cx: number; cy: number; cursor: string }[] = [
    { handle: 'nw', cx: left, cy: top, cursor: 'nwse-resize' },
    { handle: 'n', cx: midX, cy: top, cursor: 'ns-resize' },
    { handle: 'ne', cx: right, cy: top, cursor: 'nesw-resize' },
    { handle: 'e', cx: right, cy: midY, cursor: 'ew-resize' },
    { handle: 'se', cx: right, cy: bottom, cursor: 'nwse-resize' },
    { handle: 's', cx: midX, cy: bottom, cursor: 'ns-resize' },
    { handle: 'sw', cx: left, cy: bottom, cursor: 'nesw-resize' },
    { handle: 'w', cx: left, cy: midY, cursor: 'ew-resize' },
  ];

  return (
    <g className="transform-handles">
      {/* Outer bounding box */}
      <rect
        x={Math.min(left, right)}
        y={Math.min(top, bottom)}
        width={Math.abs(width)}
        height={Math.abs(height)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={strokeWidth}
        strokeDasharray={`${4 / scale} ${3 / scale}`}
        pointerEvents="none"
      />

      {/* 8 Resize square handles */}
      {handles.map(({ handle, cx, cy, cursor }) => (
        <rect
          key={handle}
          x={cx - halfHandle}
          y={cy - halfHandle}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          style={{ cursor }}
          onMouseDown={(e) => onHandleMouseDown(e, handle)}
        />
      ))}
    </g>
  );
};
