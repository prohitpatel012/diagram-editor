import React from 'react';
import { CanvasElement, Point } from '@/types/canvas';
import { FigureRenderer } from './FigureRenderer';
import { getIconComponent } from '@/lib/icons-catalog';

interface CanvasElementRendererProps {
  element: CanvasElement;
  isSelected?: boolean;
}

export function getSvgPathFromPoints(points?: Point[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// Distance from point to line segment
export function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  return Math.hypot(p.x - projX, p.y - projY);
}

// Ensure line/arrow has an array of points (start, intermediate bends, end)
export function ensureLinePoints(element: CanvasElement): Point[] {
  if (element.points && element.points.length >= 2) {
    return element.points;
  }
  const x1 = element.x;
  const y1 = element.y;
  const x2 = element.x + element.width;
  const y2 = element.y + element.height;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const mx = x1 + dx * 0.5;
    return [
      { x: x1, y: y1 },
      { x: mx, y: y1 },
      { x: mx, y: y2 },
      { x: x2, y: y2 },
    ];
  } else {
    const my = y1 + dy * 0.5;
    return [
      { x: x1, y: y1 },
      { x: x1, y: my },
      { x: x2, y: my },
      { x: x2, y: y2 },
    ];
  }
}

// Convert any sequence of waypoints into right-angled orthogonal segments
export function getOrthogonalVertices(rawPoints: Point[]): Point[] {
  if (rawPoints.length <= 1) return rawPoints;
  const vertices: Point[] = [{ x: rawPoints[0].x, y: rawPoints[0].y }];

  for (let i = 0; i < rawPoints.length - 1; i++) {
    const cur = vertices[vertices.length - 1];
    const next = rawPoints[i + 1];
    const dx = next.x - cur.x;
    const dy = next.y - cur.y;

    if (Math.abs(dx) < 1e-3 || Math.abs(dy) < 1e-3) {
      // Already orthogonal (pure horizontal or vertical)
      vertices.push({ x: next.x, y: next.y });
    } else {
      // Non-orthogonal step: choose orientation based on incoming direction
      const prev = vertices.length >= 2 ? vertices[vertices.length - 2] : null;
      let horizontalFirst = true;

      if (prev) {
        const prevDx = Math.abs(cur.x - prev.x);
        const prevDy = Math.abs(cur.y - prev.y);
        // If arrived horizontally, step vertically first; otherwise step horizontally
        horizontalFirst = prevDx < prevDy;
      } else {
        horizontalFirst = Math.abs(dx) >= Math.abs(dy);
      }

      if (horizontalFirst) {
        vertices.push({ x: next.x, y: cur.y });
      } else {
        vertices.push({ x: cur.x, y: next.y });
      }
      vertices.push({ x: next.x, y: next.y });
    }
  }

  // Deduplicate adjacent coincident vertices
  const clean: Point[] = [];
  for (const v of vertices) {
    if (clean.length === 0) {
      clean.push(v);
    } else {
      const last = clean[clean.length - 1];
      if (Math.hypot(v.x - last.x, v.y - last.y) > 0.5) {
        clean.push(v);
      }
    }
  }
  return clean;
}

// Render rounded right-angle orthogonal path from vertices (Eraser.io style)
export function renderRoundedOrthogonalPath(vertices: Point[], cornerRadius = 10): string {
  if (vertices.length === 0) return '';
  if (vertices.length === 1) return `M ${vertices[0].x} ${vertices[0].y}`;
  if (vertices.length === 2) {
    return `M ${vertices[0].x.toFixed(1)} ${vertices[0].y.toFixed(1)} L ${vertices[1].x.toFixed(1)} ${vertices[1].y.toFixed(1)}`;
  }

  let d = `M ${vertices[0].x.toFixed(1)} ${vertices[0].y.toFixed(1)}`;

  for (let i = 1; i < vertices.length - 1; i++) {
    const pPrev = vertices[i - 1];
    const pCur = vertices[i];
    const pNext = vertices[i + 1];

    const d1x = pCur.x - pPrev.x;
    const d1y = pCur.y - pPrev.y;
    const len1 = Math.hypot(d1x, d1y);

    const d2x = pNext.x - pCur.x;
    const d2y = pNext.y - pCur.y;
    const len2 = Math.hypot(d2x, d2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r > 1 && len1 > 0.1 && len2 > 0.1) {
      const enterX = pCur.x - (d1x / len1) * r;
      const enterY = pCur.y - (d1y / len1) * r;
      const exitX = pCur.x + (d2x / len2) * r;
      const exitY = pCur.y + (d2y / len2) * r;

      d += ` L ${enterX.toFixed(1)} ${enterY.toFixed(1)}`;
      d += ` Q ${pCur.x.toFixed(1)} ${pCur.y.toFixed(1)}, ${exitX.toFixed(1)} ${exitY.toFixed(1)}`;
    } else {
      d += ` L ${pCur.x.toFixed(1)} ${pCur.y.toFixed(1)}`;
    }
  }

  const last = vertices[vertices.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

// Generate path for lines and arrows (Straight, Orthogonal Elbow, Curved Bézier, Multi-Node Stepped)
export function getLinePath(element: CanvasElement): string {
  const x1 = element.x;
  const y1 = element.y;
  const x2 = element.x + element.width;
  const y2 = element.y + element.height;
  const routing = element.lineRouting || 'straight';

  const dx = x2 - x1;
  const dy = y2 - y1;

  // 1. Multi-Node Stepped Orthogonal Connector (Movable Nodes, Eraser.io style)
  if (routing === 'stepped' || routing === 'zigzag') {
    const pts = ensureLinePoints(element);
    const vertices = getOrthogonalVertices(pts);
    return renderRoundedOrthogonalPath(vertices, 10);
  }

  // 2. Simple Orthogonal / Elbow Connector (1-bend right-angle connector)
  if (routing === 'orthogonal') {
    if (element.points && element.points.length > 2) {
      const vertices = getOrthogonalVertices(element.points);
      return renderRoundedOrthogonalPath(vertices, 10);
    }

    const sx = dx >= 0 ? 1 : -1;
    const sy = dy >= 0 ? 1 : -1;

    if (Math.abs(dx) > Math.abs(dy)) {
      const mx = x1 + dx * 0.5;
      const r = Math.min(12, Math.abs(dx) * 0.5, Math.abs(dy) * 0.5);

      if (r > 1) {
        return `M ${x1} ${y1} ` +
          `L ${(mx - sx * r).toFixed(1)} ${y1} ` +
          `Q ${mx} ${y1}, ${mx} ${(y1 + sy * r).toFixed(1)} ` +
          `L ${mx} ${(y2 - sy * r).toFixed(1)} ` +
          `Q ${mx} ${y2}, ${(mx + sx * r).toFixed(1)} ${y2} ` +
          `L ${x2} ${y2}`;
      }
      return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`;
    } else {
      const my = y1 + dy * 0.5;
      const r = Math.min(12, Math.abs(dx) * 0.5, Math.abs(dy) * 0.5);

      if (r > 1) {
        return `M ${x1} ${y1} ` +
          `L ${x1} ${(my - sy * r).toFixed(1)} ` +
          `Q ${x1} ${my}, ${(x1 + sx * r).toFixed(1)} ${my} ` +
          `L ${(x2 - sx * r).toFixed(1)} ${my} ` +
          `Q ${x2} ${my}, ${x2} ${(my + sy * r).toFixed(1)} ` +
          `L ${x2} ${y2}`;
      }
      return `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`;
    }
  }

  // 3. Smooth Curved Connector (S-curve Bézier)
  if (routing === 'curved') {
    if (Math.abs(dx) > Math.abs(dy)) {
      return `M ${x1} ${y1} C ${x1 + dx * 0.5} ${y1}, ${x2 - dx * 0.5} ${y2}, ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} C ${x1} ${y1 + dy * 0.5}, ${x2} ${y2 - dy * 0.5}, ${x2} ${y2}`;
    }
  }

  // 4. Default: Straight Line
  if (element.points && element.points.length >= 2) {
    let d = `M ${element.points[0].x} ${element.points[0].y}`;
    for (let i = 1; i < element.points.length; i++) {
      d += ` L ${element.points[i].x} ${element.points[i].y}`;
    }
    return d;
  }
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

export const CanvasElementRenderer: React.FC<CanvasElementRendererProps> = ({
  element,
}) => {
  const {
    id,
    type,
    x,
    y,
    width,
    height,
    rotation = 0,
    strokeColor,
    fillColor,
    strokeWidth,
    strokeStyle,
    opacity = 100,
    cornerRadius = 0,
    text,
    fontSize = 18,
    fontFamily = 'Inter, sans-serif',
    fontWeight = 'normal',
    textAlign = 'left',
    points,
    iconName,
  } = element;

  // Compute strokeDasharray
  let strokeDasharray: string | undefined = undefined;
  if (strokeStyle === 'dashed') {
    strokeDasharray = `${strokeWidth * 3} ${strokeWidth * 2}`;
  } else if (strokeStyle === 'dotted') {
    strokeDasharray = `${strokeWidth} ${strokeWidth * 2}`;
  }

  const normalizedOpacity = Math.max(0.05, Math.min(1, opacity / 100));

  const transform = rotation
    ? `rotate(${rotation} ${x + width / 2} ${y + height / 2})`
    : undefined;

  return (
    <g
      id={`el-${id}`}
      data-element-id={id}
      transform={transform}
      opacity={normalizedOpacity}
      style={{ cursor: 'pointer' }}
    >
      {/* 1. Rectangle */}
      {type === 'rectangle' && (
        <g>
          <rect
            x={x}
            y={y}
            width={Math.max(1, width)}
            height={Math.max(1, height)}
            rx={Math.min(cornerRadius, Math.min(width, height) / 2)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          {text && (
            <text
              x={x + width / 2}
              y={y + height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={strokeColor}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              pointerEvents="none"
              style={{ userSelect: 'none' }}
            >
              {text.split('\n').map((line, idx, arr) => (
                <tspan
                  key={idx}
                  x={x + width / 2}
                  dy={idx === 0 ? -(arr.length - 1) * (fontSize * 0.6) : fontSize * 1.2}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </g>
      )}

      {/* 2. Ellipse / Circle */}
      {type === 'ellipse' && (
        <g>
          <ellipse
            cx={x + width / 2}
            cy={y + height / 2}
            rx={Math.max(1, Math.abs(width / 2))}
            ry={Math.max(1, Math.abs(height / 2))}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          {text && (
            <text
              x={x + width / 2}
              y={y + height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={strokeColor}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              pointerEvents="none"
              style={{ userSelect: 'none' }}
            >
              {text.split('\n').map((line, idx, arr) => (
                <tspan
                  key={idx}
                  x={x + width / 2}
                  dy={idx === 0 ? -(arr.length - 1) * (fontSize * 0.6) : fontSize * 1.2}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </g>
      )}

      {/* 3. Arrow (Straight, Orthogonal Elbow, Curved, Zigzag) */}
      {type === 'arrow' && (
        <g>
          <defs>
            <marker
              id={`arrow-head-${id}`}
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth={Math.max(6, strokeWidth * 3)}
              markerHeight={Math.max(6, strokeWidth * 3)}
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={strokeColor} />
            </marker>
          </defs>
          <path
            d={getLinePath(element)}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={`url(#arrow-head-${id})`}
          />
        </g>
      )}

      {/* 4. Line (Straight, Orthogonal Elbow, Curved, Zigzag) */}
      {type === 'line' && (
        <path
          d={getLinePath(element)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* 5. Free Draw */}
      {type === 'draw' && points && (
        <path
          d={getSvgPathFromPoints(points)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* 6. Text (Clean Free Text - No border, no box) */}
      {type === 'text' && text && (
        <g>
          <text
            x={x}
            y={y + fontSize * 0.9}
            fill={strokeColor}
            fontSize={fontSize}
            fontFamily={fontFamily}
            fontWeight={fontWeight}
            textAnchor={textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start'}
            pointerEvents="none"
            style={{ userSelect: 'none' }}
          >
            {text.split('\n').map((line, idx) => (
              <tspan
                key={idx}
                x={
                  textAlign === 'center'
                    ? x + width / 2
                    : textAlign === 'right'
                    ? x + width
                    : x
                }
                dy={idx === 0 ? 0 : fontSize * 1.25}
              >
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )}

      {/* 7. Icon (React Icons) */}
      {type === 'icon' && iconName && (
        <g transform={`translate(${x}, ${y})`}>
          <svg
            width={Math.max(2, width)}
            height={Math.max(2, height)}
            viewBox="0 0 24 24"
            style={{ overflow: 'visible' }}
          >
            {React.createElement(getIconComponent(iconName), {
              size: '100%',
              color: strokeColor,
              style: { width: '100%', height: '100%' },
            })}
          </svg>
        </g>
      )}

      {/* 8. Figure */}
      {type === 'figure' && (
        <g>
          <FigureRenderer element={element} strokeDasharray={strokeDasharray} />
          {text && (
            <text
              x={x + width / 2}
              y={y + height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={strokeColor}
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              pointerEvents="none"
              style={{ userSelect: 'none' }}
            >
              {text.split('\n').map((line, idx, arr) => (
                <tspan
                  key={idx}
                  x={x + width / 2}
                  dy={idx === 0 ? -(arr.length - 1) * (fontSize * 0.6) : fontSize * 1.2}
                >
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </g>
      )}
    </g>
  );
};
