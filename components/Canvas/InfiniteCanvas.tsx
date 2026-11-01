import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Tool,
  CanvasElement,
  ViewTransform,
  CanvasSettings,
  ResizeHandle,
  Point,
  FigureType,
  LineRouting,
} from '@/types/canvas';
import { CanvasElementRenderer } from './CanvasElementRenderer';
import { TransformHandles } from './TransformHandles';
import { TextEditorOverlay } from './TextEditorOverlay';

interface InfiniteCanvasProps {
  currentTool: Tool;
  onSelectTool: (tool: Tool) => void;
  elements: CanvasElement[];
  onElementsChange: (elements: CanvasElement[]) => void;
  selectedIds: string[];
  onSelectElements: (ids: string[]) => void;
  viewTransform: ViewTransform;
  onViewTransformChange: (transform: ViewTransform) => void;
  canvasSettings: CanvasSettings;
  activeFigureType: FigureType;
  activeIconName?: string;
  activeLineRouting?: LineRouting;
  defaultStrokeColor: string;
  defaultFillColor: string;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onCommitHistory: (elements: CanvasElement[]) => void;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  currentTool,
  onSelectTool,
  elements,
  onElementsChange,
  selectedIds,
  onSelectElements,
  viewTransform,
  onViewTransformChange,
  canvasSettings,
  activeFigureType,
  activeIconName = 'LuDatabase',
  activeLineRouting = 'straight',
  defaultStrokeColor,
  defaultFillColor,
  svgRef,
  onCommitHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 });

  // Dragging / Moving Elements
  const [isDraggingElements, setIsDraggingElements] = useState(false);
  const [dragStartPoint, setDragStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [initialElementPositions, setInitialElementPositions] = useState<{ id: string; x: number; y: number }[]>([]);

  // Resizing Element
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | null>(null);
  const [initialResizeElement, setInitialResizeElement] = useState<CanvasElement | null>(null);

  // New Element Creation (Drawing)
  const [drawingElement, setDrawingElement] = useState<CanvasElement | null>(null);

  // Marquee Selection Box
  const [marqueeBox, setMarqueeBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Inline Text Editing
  const [editingElementId, setEditingElementId] = useState<string | null>(null);

  // Coordinate Conversion Helpers
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      const originX = rect ? rect.left : 0;
      const originY = rect ? rect.top : 0;
      const x = (screenX - originX - viewTransform.x) / viewTransform.scale;
      const y = (screenY - originY - viewTransform.y) / viewTransform.scale;
      return { x, y };
    },
    [viewTransform]
  );

  const snapValue = useCallback(
    (val: number): number => {
      if (!canvasSettings.snapToGrid) return val;
      const sz = canvasSettings.gridSize || 20;
      return Math.round(val / sz) * sz;
    },
    [canvasSettings.snapToGrid, canvasSettings.gridSize]
  );

  // Keyboard Shortcuts (Space for Pan, Escape, Delete, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If typing in input/textarea, ignore
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      } else if (e.key === 'Escape') {
        onSelectElements([]);
        setDrawingElement(null);
        setEditingElementId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const next = elements.filter((el) => !selectedIds.includes(el.id));
          onElementsChange(next);
          onCommitHistory(next);
          onSelectElements([]);
        }
      } else if (e.key === 'v' || e.key === 'V') {
        onSelectTool('select');
      } else if (e.key === 'h' || e.key === 'H') {
        onSelectTool('pan');
      } else if (e.key === 'r' || e.key === 'R') {
        onSelectTool('rectangle');
      } else if (e.key === 'o' || e.key === 'O' || e.key === 'c' || e.key === 'C') {
        onSelectTool('ellipse');
      } else if (e.key === 'a' || e.key === 'A') {
        onSelectTool('arrow');
      } else if (e.key === 'l' || e.key === 'L') {
        onSelectTool('line');
      } else if (e.key === 'p' || e.key === 'P') {
        onSelectTool('draw');
      } else if (e.key === 't' || e.key === 'T') {
        onSelectTool('text');
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedIds.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        const next = elements.map((el) =>
          selectedIds.includes(el.id)
            ? {
                ...el,
                x: el.x + dx,
                y: el.y + dy,
                points: el.points ? el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) : undefined,
              }
            : el
        );
        onElementsChange(next);
        onCommitHistory(next);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    elements,
    selectedIds,
    onElementsChange,
    onCommitHistory,
    onSelectElements,
    onSelectTool,
  ]);

  // Wheel Handler: Free scrolling and Ctrl+Zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Zooming at mouse coordinate
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        const newScale = Math.min(5.0, Math.max(0.1, viewTransform.scale * zoomFactor));

        const rect = containerRef.current?.getBoundingClientRect();
        const mouseX = e.clientX - (rect ? rect.left : 0);
        const mouseY = e.clientY - (rect ? rect.top : 0);

        const worldX = (mouseX - viewTransform.x) / viewTransform.scale;
        const worldY = (mouseY - viewTransform.y) / viewTransform.scale;

        const newPanX = mouseX - worldX * newScale;
        const newPanY = mouseY - worldY * newScale;

        onViewTransformChange({
          x: newPanX,
          y: newPanY,
          scale: newScale,
        });
      } else {
        // Free infinite scroll in X and Y
        onViewTransformChange({
          ...viewTransform,
          x: viewTransform.x - e.deltaX,
          y: viewTransform.y - e.deltaY,
        });
      }
    },
    [viewTransform, onViewTransformChange]
  );

  // Mouse Down: Start Pan, Select, Draw, or Move
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse click or Space held or Pan tool: start pan
    if (e.button === 1 || isSpacePressed || currentTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing/selection

    const world = screenToWorld(e.clientX, e.clientY);
    const snappedX = snapValue(world.x);
    const snappedY = snapValue(world.y);

    // 1. Text Tool: Create free text immediately and open editor
    if (currentTool === 'text') {
      const newId = 'text_' + Date.now();
      const newTextElement: CanvasElement = {
        id: newId,
        type: 'text',
        x: snappedX,
        y: snappedY,
        width: 140,
        height: 32,
        strokeColor: defaultStrokeColor || '#ffffff',
        fillColor: 'transparent',
        strokeWidth: 2,
        strokeStyle: 'solid',
        fillStyle: 'transparent',
        opacity: 100,
        text: '',
        fontSize: 20,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'left',
        zIndex: elements.length + 1,
      };

      const next = [...elements, newTextElement];
      onElementsChange(next);
      onSelectElements([newId]);
      setEditingElementId(newId);
      onSelectTool('select');
      return;
    }

    // 2. Icon Tool: Place selected icon immediately
    if (currentTool === 'icon') {
      const newId = 'icon_' + Date.now();
      const newIconElement: CanvasElement = {
        id: newId,
        type: 'icon',
        x: snappedX - 32,
        y: snappedY - 32,
        width: 64,
        height: 64,
        strokeColor: defaultStrokeColor || '#3b82f6',
        fillColor: 'transparent',
        strokeWidth: 2,
        strokeStyle: 'solid',
        fillStyle: 'transparent',
        opacity: 100,
        iconName: activeIconName,
        zIndex: elements.length + 1,
      };

      const next = [...elements, newIconElement];
      onElementsChange(next);
      onCommitHistory(next);
      onSelectElements([newId]);
      onSelectTool('select');
      return;
    }

    // 3. Drawing Shapes (Rectangle, Ellipse, Arrow, Line, Free Draw, Figure)
    if (['rectangle', 'ellipse', 'arrow', 'line', 'draw', 'figure'].includes(currentTool)) {
      const newId = `${currentTool}_${Date.now()}`;
      const newEl: CanvasElement = {
        id: newId,
        type: currentTool as any,
        x: snappedX,
        y: snappedY,
        width: 0,
        height: 0,
        strokeColor: defaultStrokeColor,
        fillColor: defaultFillColor,
        strokeWidth: 2,
        strokeStyle: 'solid',
        fillStyle: defaultFillColor === 'transparent' ? 'transparent' : 'semi',
        opacity: 100,
        cornerRadius: currentTool === 'rectangle' ? 8 : 0,
        points: currentTool === 'draw' ? [{ x: snappedX, y: snappedY }] : undefined,
        lineRouting: ['line', 'arrow'].includes(currentTool) ? activeLineRouting : undefined,
        figureType: currentTool === 'figure' ? activeFigureType : undefined,
        zIndex: elements.length + 1,
      };
      setDrawingElement(newEl);
      return;
    }

    // 4. Selection Tool: Hit-testing elements or start Marquee
    if (currentTool === 'select') {
      const clickedEl = [...elements].reverse().find((el) => {
        // Line or arrow hit-test
        if (el.type === 'line' || el.type === 'arrow') {
          const x1 = el.x;
          const y1 = el.y;
          const x2 = el.x + el.width;
          const y2 = el.y + el.height;
          const minX = Math.min(x1, x2) - 12;
          const maxX = Math.max(x1, x2) + 12;
          const minY = Math.min(y1, y2) - 12;
          const maxY = Math.max(y1, y2) + 12;
          return world.x >= minX && world.x <= maxX && world.y >= minY && world.y <= maxY;
        }

        // Free draw hit-test
        if (el.type === 'draw' && el.points) {
          return el.points.some((pt) => Math.hypot(pt.x - world.x, pt.y - world.y) < 14);
        }

        // Box hit-test
        const left = Math.min(el.x, el.x + el.width);
        const top = Math.min(el.y, el.y + el.height);
        const right = Math.max(el.x, el.x + el.width);
        const bottom = Math.max(el.y, el.y + el.height);
        return world.x >= left && world.x <= right && world.y >= top && world.y <= bottom;
      });

      if (clickedEl) {
        if (e.shiftKey) {
          // Toggle selection
          if (selectedIds.includes(clickedEl.id)) {
            onSelectElements(selectedIds.filter((id) => id !== clickedEl.id));
          } else {
            onSelectElements([...selectedIds, clickedEl.id]);
          }
        } else {
          // Single select (or preserve if already part of multi-selection)
          if (!selectedIds.includes(clickedEl.id)) {
            onSelectElements([clickedEl.id]);
          }
        }

        // Start dragging selected elements
        setIsDraggingElements(true);
        setDragStartPoint(world);
        setInitialElementPositions(
          elements.map((el) => ({ id: el.id, x: el.x, y: el.y }))
        );
      } else {
        // Clicked on empty space: clear selection and start marquee
        if (!e.shiftKey) {
          onSelectElements([]);
        }
        setMarqueeBox({
          x1: world.x,
          y1: world.y,
          x2: world.x,
          y2: world.y,
        });
      }
    }
  };

  // Resize handle mouse down
  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (selectedIds.length !== 1) return;
    const target = elements.find((el) => el.id === selectedIds[0]);
    if (!target) return;

    setActiveResizeHandle(handle);
    setInitialResizeElement({ ...target });
    setDragStartPoint(screenToWorld(e.clientX, e.clientY));
  };

  // Mouse Move: Pan, Draw, Drag, Resize, Marquee
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. Panning
    if (isPanning) {
      onViewTransformChange({
        ...viewTransform,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    // 2. Resizing an Element
    if (activeResizeHandle && initialResizeElement) {
      const dx = world.x - dragStartPoint.x;
      const dy = world.y - dragStartPoint.y;
      const init = initialResizeElement;

      let nextX = init.x;
      let nextY = init.y;
      let nextW = init.width;
      let nextH = init.height;

      // Handle arrow start/end
      if (init.type === 'arrow' || init.type === 'line') {
        if (activeResizeHandle === 'start') {
          nextX = init.x + dx;
          nextY = init.y + dy;
          nextW = init.width - dx;
          nextH = init.height - dy;
        } else if (activeResizeHandle === 'end') {
          nextW = init.width + dx;
          nextH = init.height + dy;
        }
      } else {
        // Standard 8 handles
        if (activeResizeHandle.includes('e')) {
          nextW = Math.max(2, init.width + dx);
        }
        if (activeResizeHandle.includes('s')) {
          nextH = Math.max(2, init.height + dy);
        }
        if (activeResizeHandle.includes('w')) {
          const newW = Math.max(2, init.width - dx);
          nextX = init.x + (init.width - newW);
          nextW = newW;
        }
        if (activeResizeHandle.includes('n')) {
          const newH = Math.max(2, init.height - dy);
          nextY = init.y + (init.height - newH);
          nextH = newH;
        }

        // For icons or when shift is pressed, maintain 1:1 aspect ratio
        if (init.type === 'icon' || e.shiftKey) {
          const maxDim = Math.max(nextW, nextH);
          nextW = maxDim;
          nextH = maxDim;
        }
      }

      const updated = elements.map((el) =>
        el.id === init.id
          ? {
              ...el,
              x: snapValue(nextX),
              y: snapValue(nextY),
              width: snapValue(nextW),
              height: snapValue(nextH),
            }
          : el
      );
      onElementsChange(updated);
      return;
    }

    // 3. Dragging Elements
    if (isDraggingElements) {
      const dx = world.x - dragStartPoint.x;
      const dy = world.y - dragStartPoint.y;

      const updated = elements.map((el) => {
        if (selectedIds.includes(el.id)) {
          const initialPos = initialElementPositions.find((p) => p.id === el.id);
          const baseX = initialPos ? initialPos.x : el.x;
          const baseY = initialPos ? initialPos.y : el.y;

          const newX = snapValue(baseX + dx);
          const newY = snapValue(baseY + dy);

          // Update free draw points too
          let newPoints: Point[] | undefined = undefined;
          if (el.points && initialPos) {
            const shiftX = newX - initialPos.x;
            const shiftY = newY - initialPos.y;
            newPoints = el.points.map((pt) => ({ x: pt.x + shiftX, y: pt.y + shiftY }));
          }

          return {
            ...el,
            x: newX,
            y: newY,
            points: newPoints || el.points,
          };
        }
        return el;
      });
      onElementsChange(updated);
      return;
    }

    // 4. Drawing new element
    if (drawingElement) {
      if (drawingElement.type === 'draw') {
        const currentPoints = drawingElement.points || [];
        const nextPoints = [...currentPoints, { x: world.x, y: world.y }];
        setDrawingElement({
          ...drawingElement,
          points: nextPoints,
        });
      } else {
        const startX = drawingElement.x;
        const startY = drawingElement.y;
        let w = world.x - startX;
        let h = world.y - startY;

        // Shift key locks 1:1 aspect ratio for rectangles / circles / figures
        if (e.shiftKey && drawingElement.type !== 'arrow' && drawingElement.type !== 'line') {
          const size = Math.max(Math.abs(w), Math.abs(h));
          w = (w < 0 ? -1 : 1) * size;
          h = (h < 0 ? -1 : 1) * size;
        }

        setDrawingElement({
          ...drawingElement,
          width: snapValue(w),
          height: snapValue(h),
        });
      }
      return;
    }

    // 5. Marquee Box Selection
    if (marqueeBox) {
      setMarqueeBox({
        ...marqueeBox,
        x2: world.x,
        y2: world.y,
      });

      // Find all elements intersecting marquee box
      const minX = Math.min(marqueeBox.x1, world.x);
      const maxX = Math.max(marqueeBox.x1, world.x);
      const minY = Math.min(marqueeBox.y1, world.y);
      const maxY = Math.max(marqueeBox.y1, world.y);

      const insideIds = elements
        .filter((el) => {
          const elX1 = Math.min(el.x, el.x + el.width);
          const elX2 = Math.max(el.x, el.x + el.width);
          const elY1 = Math.min(el.y, el.y + el.height);
          const elY2 = Math.max(el.y, el.y + el.height);
          return elX1 <= maxX && elX2 >= minX && elY1 <= maxY && elY2 >= minY;
        })
        .map((el) => el.id);

      onSelectElements(insideIds);
    }
  };

  // Mouse Up: Commit Drawing, Dragging, or Resizing
  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (activeResizeHandle) {
      setActiveResizeHandle(null);
      setInitialResizeElement(null);
      onCommitHistory(elements);
    }

    if (isDraggingElements) {
      setIsDraggingElements(false);
      setInitialElementPositions([]);
      onCommitHistory(elements);
    }

    if (drawingElement) {
      let finalElement = { ...drawingElement };

      if (finalElement.type === 'draw') {
        if (finalElement.points && finalElement.points.length > 1) {
          const next = [...elements, finalElement];
          onElementsChange(next);
          onCommitHistory(next);
          onSelectElements([finalElement.id]);
        }
      } else {
        if (finalElement.type !== 'arrow' && finalElement.type !== 'line') {
          if (finalElement.width < 0) {
            finalElement.x += finalElement.width;
            finalElement.width = Math.abs(finalElement.width);
          }
          if (finalElement.height < 0) {
            finalElement.y += finalElement.height;
            finalElement.height = Math.abs(finalElement.height);
          }
        }

        if (
          Math.abs(finalElement.width) >= 5 ||
          Math.abs(finalElement.height) >= 5
        ) {
          const next = [...elements, finalElement];
          onElementsChange(next);
          onCommitHistory(next);
          onSelectElements([finalElement.id]);
        }
      }

      setDrawingElement(null);
      onSelectTool('select');
    }

    if (marqueeBox) {
      setMarqueeBox(null);
    }
  };

  // Double click on element or EMPTY CANVAS to write free text
  const handleDoubleClick = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const clickedEl = [...elements].reverse().find((el) => {
      const left = Math.min(el.x, el.x + el.width);
      const top = Math.min(el.y, el.y + el.height);
      const right = Math.max(el.x, el.x + el.width);
      const bottom = Math.max(el.y, el.y + el.height);
      return world.x >= left && world.x <= right && world.y >= top && world.y <= bottom;
    });

    if (clickedEl) {
      setEditingElementId(clickedEl.id);
      onSelectElements([clickedEl.id]);
    } else {
      // Double clicked anywhere on blank canvas -> Instant Free Text!
      const newId = 'text_' + Date.now();
      const newTextElement: CanvasElement = {
        id: newId,
        type: 'text',
        x: world.x,
        y: world.y,
        width: 140,
        height: 32,
        strokeColor: defaultStrokeColor || '#ffffff',
        fillColor: 'transparent',
        strokeWidth: 2,
        strokeStyle: 'solid',
        fillStyle: 'transparent',
        opacity: 100,
        text: '',
        fontSize: 20,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'left',
        zIndex: elements.length + 1,
      };

      const next = [...elements, newTextElement];
      onElementsChange(next);
      onSelectElements([newId]);
      setEditingElementId(newId);
    }
  };

  // Dynamic Cursor
  let canvasCursor = 'default';
  if (isPanning || isSpacePressed) {
    canvasCursor = isPanning ? 'grabbing' : 'grab';
  } else if (currentTool === 'pan') {
    canvasCursor = isPanning ? 'grabbing' : 'grab';
  } else if (currentTool === 'text') {
    canvasCursor = 'text';
  } else if (['rectangle', 'ellipse', 'arrow', 'line', 'draw', 'figure'].includes(currentTool)) {
    canvasCursor = 'crosshair';
  } else if (currentTool === 'icon') {
    canvasCursor = 'copy';
  }

  // Active element being edited inline
  const editingElement = editingElementId
    ? elements.find((el) => el.id === editingElementId)
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden select-none outline-none"
      style={{
        backgroundColor: canvasSettings.backgroundColor,
        cursor: canvasCursor,
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        ref={svgRef}
        id="eraser-infinite-canvas"
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ pointerEvents: 'auto' }}
      >
        <defs>
          {/* Subtle Dynamic Dot Grid pattern */}
          {canvasSettings.gridType === 'dots' && (
            <pattern
              id="grid-dots"
              width={canvasSettings.gridSize * viewTransform.scale}
              height={canvasSettings.gridSize * viewTransform.scale}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${viewTransform.x % (canvasSettings.gridSize * viewTransform.scale)}, ${
                viewTransform.y % (canvasSettings.gridSize * viewTransform.scale)
              })`}
            >
              <circle
                cx={canvasSettings.gridSize * viewTransform.scale * 0.5}
                cy={canvasSettings.gridSize * viewTransform.scale * 0.5}
                r={Math.max(0.75, 1 * Math.min(1.5, viewTransform.scale))}
                fill="rgba(148, 163, 184, 0.25)"
              />
            </pattern>
          )}

          {/* Lines Grid pattern */}
          {canvasSettings.gridType === 'lines' && (
            <pattern
              id="grid-lines"
              width={canvasSettings.gridSize * viewTransform.scale}
              height={canvasSettings.gridSize * viewTransform.scale}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${viewTransform.x % (canvasSettings.gridSize * viewTransform.scale)}, ${
                viewTransform.y % (canvasSettings.gridSize * viewTransform.scale)
              })`}
            >
              <path
                d={`M ${canvasSettings.gridSize * viewTransform.scale} 0 L 0 0 0 ${
                  canvasSettings.gridSize * viewTransform.scale
                }`}
                fill="none"
                stroke="rgba(148, 163, 184, 0.12)"
                strokeWidth="1"
              />
            </pattern>
          )}
        </defs>

        {/* Grid Background rect */}
        {canvasSettings.gridType !== 'none' && (
          <rect
            width="100%"
            height="100%"
            fill={`url(#grid-${canvasSettings.gridType})`}
            pointerEvents="none"
          />
        )}

        {/* Infinite Viewport Transformation Group */}
        <g
          id="canvas-viewport"
          transform={`translate(${viewTransform.x}, ${viewTransform.y}) scale(${viewTransform.scale})`}
        >
          {/* Group containing all committed canvas elements */}
          <g id="canvas-elements-group">
            {elements.map((element) => (
              <CanvasElementRenderer
                key={element.id}
                element={element}
                isSelected={selectedIds.includes(element.id)}
              />
            ))}
          </g>

          {/* Currently drawing preview element */}
          {drawingElement && (
            <g id="canvas-drawing-preview" opacity={0.85}>
              <CanvasElementRenderer element={drawingElement} />
            </g>
          )}

          {/* Transform & Resize Handles on selected element (suppressed while editing text) */}
          {selectedIds.length === 1 && !drawingElement && !isPanning && editingElementId !== selectedIds[0] && (
            (() => {
              const el = elements.find((item) => item.id === selectedIds[0]);
              return el ? (
                <TransformHandles
                  element={el}
                  viewTransform={viewTransform}
                  onHandleMouseDown={handleResizeHandleMouseDown}
                />
              ) : null;
            })()
          )}

          {/* Marquee Selection Rectangle */}
          {marqueeBox && (
            <rect
              x={Math.min(marqueeBox.x1, marqueeBox.x2)}
              y={Math.min(marqueeBox.y1, marqueeBox.y2)}
              width={Math.abs(marqueeBox.x2 - marqueeBox.x1)}
              height={Math.abs(marqueeBox.y2 - marqueeBox.y1)}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1.5 / viewTransform.scale}
              strokeDasharray={`${4 / viewTransform.scale} ${3 / viewTransform.scale}`}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>

      {/* Inline Text Editor Overlay (Seamless Free Text) */}
      {editingElement && (
        <TextEditorOverlay
          element={editingElement}
          viewTransform={viewTransform}
          onCommit={(newText) => {
            if (!newText.trim()) {
              // User left empty text -> discard empty element cleanly
              const next = elements.filter((el) => el.id !== editingElement.id);
              onElementsChange(next);
              onCommitHistory(next);
              onSelectElements([]);
            } else {
              // Calculate natural bounding width & height for free text
              const lines = newText.split('\n');
              const maxLineLen = Math.max(...lines.map((l) => l.length));
              const approxW = Math.max(80, maxLineLen * ((editingElement.fontSize || 20) * 0.62));
              const approxH = Math.max(30, lines.length * ((editingElement.fontSize || 20) * 1.3));

              const next = elements.map((el) =>
                el.id === editingElement.id
                  ? {
                      ...el,
                      text: newText,
                      width: approxW,
                      height: approxH,
                    }
                  : el
              );
              onElementsChange(next);
              onCommitHistory(next);
            }
            setEditingElementId(null);
          }}
          onCancel={() => {
            // If it had no text before, delete it
            if (!editingElement.text || !editingElement.text.trim()) {
              const next = elements.filter((el) => el.id !== editingElement.id);
              onElementsChange(next);
              onCommitHistory(next);
              onSelectElements([]);
            }
            setEditingElementId(null);
          }}
        />
      )}
    </div>
  );
};
