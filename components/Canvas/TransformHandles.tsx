import React from 'react';
import { CanvasElement, ResizeHandle, ViewTransform } from '@/types/canvas';
import { getLinePath, ensureLinePoints } from './CanvasElementRenderer';

interface TransformHandlesProps {
  element: CanvasElement;
  viewTransform: ViewTransform;
  onHandleMouseDown: (e: React.MouseEvent, handle: ResizeHandle | string) => void;
  onDeletePoint?: (index: number) => void;
}

export const TransformHandles: React.FC<TransformHandlesProps> = ({
  element,
  viewTransform,
  onHandleMouseDown,
  onDeletePoint,
}) => {
  const { x, y, width, height, type, lineRouting } = element;
  const { scale } = viewTransform;

  // Handle dimensions in canvas coordinate space (scaled so it looks ~9px on screen)
  const handleSize = Math.max(6, 9 / scale);
  const halfHandle = handleSize / 2;
  const strokeWidth = 1.5 / scale;

  if (type === 'line' || type === 'arrow') {
    const isMultiPointOrthogonal =
      lineRouting === 'stepped' ||
      lineRouting === 'zigzag' ||
      (element.points && element.points.length > 2);

    if (isMultiPointOrthogonal) {
      const pts = ensureLinePoints(element);
      const lastIdx = pts.length - 1;
      const lastPt = pts[lastIdx];
      const prevPt = pts.length >= 2 ? pts[lastIdx - 1] : { x: lastPt.x - 30, y: lastPt.y };
      const dirX = lastPt.x - prevPt.x;
      const dirY = lastPt.y - prevPt.y;
      const dist = Math.hypot(dirX, dirY) || 1;
      const extOffset = Math.max(16, 22 / scale);
      const extX = lastPt.x + (dirX / dist) * extOffset;
      const extY = lastPt.y + (dirY / dist) * extOffset;

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

          {/* Segment Midpoint Handles ('+' to add a new waypoint / elbow) */}
          {pts.slice(0, -1).map((p, i) => {
            const nextP = pts[i + 1];
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            return (
              <g
                key={`mid-${i}`}
                style={{ cursor: 'copy' }}
                onMouseDown={(e) => onHandleMouseDown(e, `mid-${i}`)}
              >
                <circle
                  cx={midX}
                  cy={midY}
                  r={handleSize * 0.6}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={1.2 / scale}
                />
                <text
                  x={midX}
                  y={midY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#3b82f6"
                  fontSize={handleSize * 0.75}
                  fontWeight="bold"
                  pointerEvents="none"
                  style={{ userSelect: 'none' }}
                >
                  +
                </text>
              </g>
            );
          })}

          {/* Waypoint Handles: Start, Intermediate Elbows, and Last Node */}
          {pts.map((p, idx) => {
            const isStart = idx === 0;
            const isLast = idx === lastIdx;

            if (isStart) {
              return (
                <circle
                  key={`pt-${idx}`}
                  cx={p.x}
                  cy={p.y}
                  r={handleSize * 0.75}
                  fill="#3b82f6"
                  stroke="#ffffff"
                  strokeWidth={strokeWidth}
                  style={{ cursor: 'crosshair' }}
                  onMouseDown={(e) => onHandleMouseDown(e, 'point-0')}
                >
                  <title>Start node (drag to move)</title>
                </circle>
              );
            }

            if (isLast) {
              return (
                <g key={`pt-${idx}`}>
                  {/* Glowing halo indicator on last node */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={handleSize * 1.15}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={1 / scale}
                    strokeDasharray={`${2 / scale} ${2 / scale}`}
                    pointerEvents="none"
                  />
                  {/* Last node main movable handle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={handleSize * 0.85}
                    fill="#2563eb"
                    stroke="#ffffff"
                    strokeWidth={strokeWidth * 1.4}
                    style={{ cursor: 'crosshair' }}
                    onMouseDown={(e) => onHandleMouseDown(e, `point-${idx}`)}
                  >
                    <title>Last node (drag to move or reposition)</title>
                  </circle>

                  {/* Extend Handle button beside last node to add another orthogonal step */}
                  <g
                    style={{ cursor: 'pointer' }}
                    onMouseDown={(e) => onHandleMouseDown(e, 'extend')}
                  >
                    <circle
                      cx={extX}
                      cy={extY}
                      r={handleSize * 0.75}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={1.2 / scale}
                    />
                    <text
                      x={extX}
                      y={extY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#ffffff"
                      fontSize={handleSize * 0.9}
                      fontWeight="bold"
                      pointerEvents="none"
                      style={{ userSelect: 'none' }}
                    >
                      +
                    </text>
                  </g>
                </g>
              );
            }

            // Intermediate elbow waypoint
            return (
              <g
                key={`pt-${idx}`}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onDeletePoint?.(idx);
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={handleSize * 0.7}
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth={strokeWidth * 1.3}
                  style={{ cursor: 'move' }}
                  onMouseDown={(e) => onHandleMouseDown(e, `point-${idx}`)}
                >
                  <title>Elbow waypoint (drag to move, double-click to remove)</title>
                </circle>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={handleSize * 0.28}
                  fill="#3b82f6"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </g>
      );
    }

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
        >
          <title>Start node</title>
        </circle>

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
        >
          <title>End node</title>
        </circle>
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
