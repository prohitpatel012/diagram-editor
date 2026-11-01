import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  CanvasElementRenderer,
  distToSegment,
  ensureLinePoints,
  getOrthogonalVertices,
} from './CanvasElementRenderer';
import { TransformHandles } from './TransformHandles';
import { TextEditorOverlay } from './TextEditorOverlay';
import { FloatingTextToolbar } from './FloatingTextToolbar';
import { LuArrowRight, LuChevronRight, LuMoveHorizontal } from 'react-icons/lu';

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
  onOpenIconPicker?: () => void;
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
  onOpenIconPicker,
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
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandle | string | null>(null);
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

  // Canvas Container Dimensions & Resize Tracking
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1200,
    height: 800,
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Compute Total World Content Bounds
  const contentBounds = useMemo(() => {
    if (elements.length === 0) {
      return { minX: 0, maxX: 1200, minY: 0, maxY: 800 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const el of elements) {
      if (el.points && el.points.length > 0) {
        for (const pt of el.points) {
          minX = Math.min(minX, pt.x);
          maxX = Math.max(maxX, pt.x);
          minY = Math.min(minY, pt.y);
          maxY = Math.max(maxY, pt.y);
        }
      }
      const left = Math.min(el.x, el.x + (el.width || 0));
      const right = Math.max(el.x, el.x + (el.width || 0));
      const top = Math.min(el.y, el.y + (el.height || 0));
      const bottom = Math.max(el.y, el.y + (el.height || 0));
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    }

    return {
      minX: Number.isFinite(minX) ? minX : 0,
      maxX: Number.isFinite(maxX) ? maxX : 1200,
      minY: Number.isFinite(minY) ? minY : 0,
      maxY: Number.isFinite(maxY) ? maxY : 800,
    };
  }, [elements]);

  // Viewport World Coordinates & Generous Virtual Canvas Expansion
  const scale = Math.max(0.01, viewTransform.scale);
  const visibleLeft = -viewTransform.x / scale;
  const visibleRight = (containerSize.width - viewTransform.x) / scale;
  const visibleTop = -viewTransform.y / scale;
  const visibleBottom = (containerSize.height - viewTransform.y) / scale;
  const visibleWidth = containerSize.width / scale;
  const visibleHeight = containerSize.height / scale;

  // Virtual Canvas Bounds: Dynamically expands as user moves right or draws to the right
  const scrollMinX = Math.min(-1000, contentBounds.minX - 600, visibleLeft - 200);
  const scrollMaxX = Math.max(4000, contentBounds.maxX + 2500, visibleRight + 1200);
  const scrollMinY = Math.min(-600, contentBounds.minY - 500, visibleTop - 200);
  const scrollMaxY = Math.max(3000, contentBounds.maxY + 1800, visibleBottom + 800);

  const totalSpanX = Math.max(1, scrollMaxX - scrollMinX);
  const totalSpanY = Math.max(1, scrollMaxY - scrollMinY);

  // Scrollbar Thumb Percentages
  const hThumbWidthPct = Math.max(6, Math.min(100, (visibleWidth / totalSpanX) * 100));
  const maxScrollableX = Math.max(1, totalSpanX - visibleWidth);
  const hOffsetProgress = Math.max(0, Math.min(1, (visibleLeft - scrollMinX) / maxScrollableX));
  const hThumbLeftPct = hOffsetProgress * (100 - hThumbWidthPct);

  const vThumbHeightPct = Math.max(6, Math.min(100, (visibleHeight / totalSpanY) * 100));
  const maxScrollableY = Math.max(1, totalSpanY - visibleHeight);
  const vOffsetProgress = Math.max(0, Math.min(1, (visibleTop - scrollMinY) / maxScrollableY));
  const vThumbTopPct = vOffsetProgress * (100 - vThumbHeightPct);

  // Scrollbar Track Refs
  const hTrackRef = useRef<HTMLDivElement>(null);
  const vTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingHThumb = useRef(false);
  const isDraggingVThumb = useRef(false);
  const dragStartCoord = useRef(0);
  const dragStartViewOffset = useRef(0);

  // Horizontal Scrollbar Handlers
  const handleHThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingHThumb.current = true;
    dragStartCoord.current = e.clientX;
    dragStartViewOffset.current = viewTransform.x;

    const handlePointerMove = (ev: MouseEvent) => {
      if (!isDraggingHThumb.current || !hTrackRef.current) return;
      const trackRect = hTrackRef.current.getBoundingClientRect();
      const usableTrackPx = trackRect.width * (1 - hThumbWidthPct / 100);
      if (usableTrackPx <= 0) return;

      const deltaPixel = ev.clientX - dragStartCoord.current;
      const fractionDelta = deltaPixel / usableTrackPx;
      const deltaWorld = fractionDelta * maxScrollableX;
      const newViewX = dragStartViewOffset.current - deltaWorld * scale;
      onViewTransformChange({
        ...viewTransform,
        x: newViewX,
      });
    };

    const handlePointerUp = () => {
      isDraggingHThumb.current = false;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleHTrackClick = (e: React.MouseEvent) => {
    if (!hTrackRef.current) return;
    const rect = hTrackRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetWorldX = scrollMinX + clickRatio * totalSpanX - visibleWidth / 2;
    onViewTransformChange({
      ...viewTransform,
      x: -targetWorldX * scale,
    });
  };

  // Vertical Scrollbar Handlers
  const handleVThumbMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingVThumb.current = true;
    dragStartCoord.current = e.clientY;
    dragStartViewOffset.current = viewTransform.y;

    const handlePointerMove = (ev: MouseEvent) => {
      if (!isDraggingVThumb.current || !vTrackRef.current) return;
      const trackRect = vTrackRef.current.getBoundingClientRect();
      const usableTrackPx = trackRect.height * (1 - vThumbHeightPct / 100);
      if (usableTrackPx <= 0) return;

      const deltaPixel = ev.clientY - dragStartCoord.current;
      const fractionDelta = deltaPixel / usableTrackPx;
      const deltaWorld = fractionDelta * maxScrollableY;
      const newViewY = dragStartViewOffset.current - deltaWorld * scale;
      onViewTransformChange({
        ...viewTransform,
        y: newViewY,
      });
    };

    const handlePointerUp = () => {
      isDraggingVThumb.current = false;
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  };

  const handleVTrackClick = (e: React.MouseEvent) => {
    if (!vTrackRef.current) return;
    const rect = vTrackRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const targetWorldY = scrollMinY + clickRatio * totalSpanY - visibleHeight / 2;
    onViewTransformChange({
      ...viewTransform,
      y: -targetWorldY * scale,
    });
  };

  // Quick Action: Expand Canvas to the Right (+800px)
  const handleExpandCanvasRight = () => {
    onViewTransformChange({
      ...viewTransform,
      x: viewTransform.x - 800 * scale,
    });
  };

  // Quick Action: Scroll to rightmost content
  const hasContentOnRight = contentBounds.maxX > visibleRight + 60;
  const handleScrollToRightContent = () => {
    const targetX = -(contentBounds.maxX - visibleWidth * 0.8) * scale;
    onViewTransformChange({
      ...viewTransform,
      x: targetX,
    });
  };

  // Keyboard Shortcuts (Space for Pan, Escape, Delete, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        let dx = e.deltaX;
        let dy = e.deltaY;
        // Shift + Wheel scrolls horizontally
        if (e.shiftKey && dx === 0 && dy !== 0) {
          dx = dy;
          dy = 0;
        }
        onViewTransformChange({
          ...viewTransform,
          x: viewTransform.x - dx,
          y: viewTransform.y - dy,
        });
      }
    },
    [viewTransform, onViewTransformChange]
  );

  // Mouse Down: Start Pan, Select, Draw, or Move
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed || currentTool === 'pan') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y });
      return;
    }

    if (e.button !== 0) return;

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
        fontFamily: '"Inter", var(--font-sans), system-ui, sans-serif',
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
        points:
          currentTool === 'draw'
            ? [{ x: snappedX, y: snappedY }]
            : ['line', 'arrow'].includes(currentTool) && activeLineRouting === 'stepped'
            ? [
                { x: snappedX, y: snappedY },
                { x: snappedX, y: snappedY },
                { x: snappedX, y: snappedY },
                { x: snappedX, y: snappedY },
              ]
            : undefined,
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
        if (el.type === 'line' || el.type === 'arrow') {
          const pts =
            el.points && el.points.length >= 2
              ? el.points
              : [
                  { x: el.x, y: el.y },
                  { x: el.x + el.width, y: el.y + el.height },
                ];

          const isOrthogonal =
            el.lineRouting === 'stepped' ||
            el.lineRouting === 'zigzag' ||
            el.lineRouting === 'orthogonal';

          const vertices = isOrthogonal && pts.length >= 2 ? getOrthogonalVertices(pts) : pts;

          for (let i = 0; i < vertices.length - 1; i++) {
            if (distToSegment(world, vertices[i], vertices[i + 1]) <= 14) {
              return true;
            }
          }
          return false;
        }

        if (el.type === 'draw' && el.points) {
          return el.points.some((pt) => Math.hypot(pt.x - world.x, pt.y - world.y) < 14);
        }

        const left = Math.min(el.x, el.x + el.width);
        const top = Math.min(el.y, el.y + el.height);
        const right = Math.max(el.x, el.x + el.width);
        const bottom = Math.max(el.y, el.y + el.height);
        return world.x >= left && world.x <= right && world.y >= top && world.y <= bottom;
      });

      if (clickedEl) {
        if (e.shiftKey) {
          if (selectedIds.includes(clickedEl.id)) {
            onSelectElements(selectedIds.filter((id) => id !== clickedEl.id));
          } else {
            onSelectElements([...selectedIds, clickedEl.id]);
          }
        } else {
          if (!selectedIds.includes(clickedEl.id)) {
            onSelectElements([clickedEl.id]);
          }
        }

        setIsDraggingElements(true);
        setDragStartPoint(world);
        setInitialElementPositions(
          elements.map((el) => ({ id: el.id, x: el.x, y: el.y }))
        );
      } else {
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
  const handleResizeHandleMouseDown = (e: React.MouseEvent, handle: ResizeHandle | string) => {
    e.stopPropagation();
    if (selectedIds.length !== 1) return;
    const target = elements.find((el) => el.id === selectedIds[0]);
    if (!target) return;

    const world = screenToWorld(e.clientX, e.clientY);

    // 1. Segment midpoint '+' handle: insert a new waypoint and drag it
    if (typeof handle === 'string' && handle.startsWith('mid-')) {
      const midIdx = parseInt(handle.replace('mid-', ''), 10);
      const currentPts = ensureLinePoints(target);
      if (midIdx >= 0 && midIdx < currentPts.length - 1) {
        const p1 = currentPts[midIdx];
        const p2 = currentPts[midIdx + 1];
        const newMidPt = {
          x: snapValue((p1.x + p2.x) / 2),
          y: snapValue((p1.y + p2.y) / 2),
        };
        const nextPts = [
          ...currentPts.slice(0, midIdx + 1),
          newMidPt,
          ...currentPts.slice(midIdx + 1),
        ];

        const updatedEl: CanvasElement = {
          ...target,
          points: nextPts,
        };

        const nextElements = elements.map((el) => (el.id === target.id ? updatedEl : el));
        onElementsChange(nextElements);

        setActiveResizeHandle(`point-${midIdx + 1}`);
        setInitialResizeElement({ ...updatedEl });
        setDragStartPoint(world);
        return;
      }
    }

    // 2. Extend handle beside last node: append a new step and drag it
    if (handle === 'extend') {
      const currentPts = ensureLinePoints(target);
      const lastIdx = currentPts.length - 1;
      const lastPt = currentPts[lastIdx];
      const prevPt = currentPts.length >= 2 ? currentPts[lastIdx - 1] : { x: lastPt.x - 30, y: lastPt.y };
      const dirX = lastPt.x - prevPt.x;
      const dirY = lastPt.y - prevPt.y;
      const dist = Math.hypot(dirX, dirY) || 1;
      const stepDist = 60;
      const newPt = {
        x: snapValue(lastPt.x + (dirX / dist) * stepDist),
        y: snapValue(lastPt.y + (dirY / dist) * stepDist),
      };

      const nextPts = [...currentPts, newPt];
      const updatedEl: CanvasElement = {
        ...target,
        points: nextPts,
        width: newPt.x - nextPts[0].x,
        height: newPt.y - nextPts[0].y,
      };

      const nextElements = elements.map((el) => (el.id === target.id ? updatedEl : el));
      onElementsChange(nextElements);

      setActiveResizeHandle(`point-${nextPts.length - 1}`);
      setInitialResizeElement({ ...updatedEl });
      setDragStartPoint(world);
      return;
    }

    setActiveResizeHandle(handle);
    setInitialResizeElement({ ...target });
    setDragStartPoint(world);
  };

  // Delete intermediate waypoint on double click
  const handleDeletePoint = (pointIndex: number) => {
    if (selectedIds.length !== 1) return;
    const target = elements.find((el) => el.id === selectedIds[0]);
    if (!target || !target.points || target.points.length <= 2) return;
    if (pointIndex <= 0 || pointIndex >= target.points.length - 1) return;

    const nextPts = target.points.filter((_, idx) => idx !== pointIndex);
    const p0 = nextPts[0];
    const pLast = nextPts[nextPts.length - 1];
    const updatedEl: CanvasElement = {
      ...target,
      x: p0.x,
      y: p0.y,
      width: pLast.x - p0.x,
      height: pLast.y - p0.y,
      points: nextPts,
    };
    const nextElements = elements.map((el) => (el.id === target.id ? updatedEl : el));
    onElementsChange(nextElements);
    onCommitHistory(nextElements);
  };

  // Mouse Move: Pan, Draw, Drag, Resize, Marquee
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      onViewTransformChange({
        ...viewTransform,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    // Edge Auto-Panning: Automatically expand view when drawing, dragging, or resizing near edges
    if (drawingElement || isDraggingElements || activeResizeHandle) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const edgeMargin = 45;
        const distRight = rect.right - e.clientX;
        const distBottom = rect.bottom - e.clientY;
        const distLeft = e.clientX - rect.left;
        const distTop = e.clientY - rect.top;

        let panDx = 0;
        let panDy = 0;

        if (distRight < edgeMargin && distRight >= 0) {
          panDx = -Math.round((edgeMargin - distRight) * 0.8 + 8);
        } else if (distLeft < edgeMargin && distLeft >= 0) {
          panDx = Math.round((edgeMargin - distLeft) * 0.8 + 8);
        }

        if (distBottom < edgeMargin && distBottom >= 0) {
          panDy = -Math.round((edgeMargin - distBottom) * 0.8 + 8);
        } else if (distTop < edgeMargin && distTop >= 0) {
          panDy = Math.round((edgeMargin - distTop) * 0.8 + 8);
        }

        if (panDx !== 0 || panDy !== 0) {
          onViewTransformChange({
            ...viewTransform,
            x: viewTransform.x + panDx,
            y: viewTransform.y + panDy,
          });
        }
      }
    }

    // 2. Resizing an Element
    if (activeResizeHandle && initialResizeElement) {
      const dx = world.x - dragStartPoint.x;
      const dy = world.y - dragStartPoint.y;
      const init = initialResizeElement;

      let nextX = init.x;
      let nextY = init.y;
      let nextW = init.width;
      let nextH = init.height;

      if (init.type === 'arrow' || init.type === 'line') {
        // Handle dragging a specific waypoint ('point-0', 'point-1', etc.)
        if (typeof activeResizeHandle === 'string' && activeResizeHandle.startsWith('point-')) {
          const ptIdx = parseInt(activeResizeHandle.replace('point-', ''), 10);
          const initPts = ensureLinePoints(init);
          if (ptIdx >= 0 && ptIdx < initPts.length) {
            const origPt = initPts[ptIdx];
            const newPt = {
              x: snapValue(origPt.x + dx),
              y: snapValue(origPt.y + dy),
            };

            const nextPts = initPts.map((p, idx) => (idx === ptIdx ? newPt : { ...p }));
            const p0 = nextPts[0];
            const pLast = nextPts[nextPts.length - 1];

            const updated = elements.map((el) =>
              el.id === init.id
                ? {
                    ...el,
                    x: p0.x,
                    y: p0.y,
                    width: pLast.x - p0.x,
                    height: pLast.y - p0.y,
                    points: nextPts,
                  }
                : el
            );
            onElementsChange(updated);
            return;
          }
        }

        if (activeResizeHandle === 'start') {
          if (init.points && init.points.length >= 2) {
            const nextPts = init.points.map((p, idx) =>
              idx === 0 ? { x: snapValue(p.x + dx), y: snapValue(p.y + dy) } : p
            );
            const p0 = nextPts[0];
            const pLast = nextPts[nextPts.length - 1];
            const updated = elements.map((el) =>
              el.id === init.id
                ? {
                    ...el,
                    x: p0.x,
                    y: p0.y,
                    width: pLast.x - p0.x,
                    height: pLast.y - p0.y,
                    points: nextPts,
                  }
                : el
            );
            onElementsChange(updated);
            return;
          }
          nextX = init.x + dx;
          nextY = init.y + dy;
          nextW = init.width - dx;
          nextH = init.height - dy;
        } else if (activeResizeHandle === 'end') {
          if (init.points && init.points.length >= 2) {
            const lastIdx = init.points.length - 1;
            const nextPts = init.points.map((p, idx) =>
              idx === lastIdx ? { x: snapValue(p.x + dx), y: snapValue(p.y + dy) } : p
            );
            const p0 = nextPts[0];
            const pLast = nextPts[lastIdx];
            const updated = elements.map((el) =>
              el.id === init.id
                ? {
                    ...el,
                    x: p0.x,
                    y: p0.y,
                    width: pLast.x - p0.x,
                    height: pLast.y - p0.y,
                    points: nextPts,
                  }
                : el
            );
            onElementsChange(updated);
            return;
          }
          nextW = init.width + dx;
          nextH = init.height + dy;
        }
      } else {
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

        // Multi-node stepped orthogonal connector drawing
        if (
          (drawingElement.type === 'line' || drawingElement.type === 'arrow') &&
          (drawingElement.lineRouting === 'stepped' || drawingElement.lineRouting === 'zigzag')
        ) {
          const endX = snapValue(world.x);
          const endY = snapValue(world.y);
          const dx = endX - startX;
          const dy = endY - startY;

          let pts: Point[];
          if (Math.abs(dx) >= Math.abs(dy)) {
            const mx = snapValue(startX + dx * 0.5);
            pts = [
              { x: startX, y: startY },
              { x: mx, y: startY },
              { x: mx, y: endY },
              { x: endX, y: endY },
            ];
          } else {
            const my = snapValue(startY + dy * 0.5);
            pts = [
              { x: startX, y: startY },
              { x: startX, y: my },
              { x: endX, y: my },
              { x: endX, y: endY },
            ];
          }

          setDrawingElement({
            ...drawingElement,
            width: snapValue(dx),
            height: snapValue(dy),
            points: pts,
          });
          return;
        }

        let w = world.x - startX;
        let h = world.y - startY;

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
          Math.abs(finalElement.height) >= 5 ||
          (finalElement.points && finalElement.points.length >= 2)
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

  // Double click handling:
  // - Icons: NEVER delete or shrink! Select and open Icon Picker to change icon.
  // - Lines / Arrows / Drawings: Select only.
  // - Text / Shapes: Open in-place text editor.
  // - Blank canvas: Create new free text element.
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
      // 1. Icon: Select it and open Icon Picker without any destructive resize/delete!
      if (clickedEl.type === 'icon') {
        onSelectElements([clickedEl.id]);
        if (onOpenIconPicker) {
          onOpenIconPicker();
        }
        return;
      }

      // 2. Lines / Arrows / Free Draw: Select only
      if (clickedEl.type === 'line' || clickedEl.type === 'arrow' || clickedEl.type === 'draw') {
        onSelectElements([clickedEl.id]);
        return;
      }

      // 3. Text or Shapes with text (Rectangle, Ellipse, Figure)
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
        fontFamily: '"Inter", var(--font-sans), system-ui, sans-serif',
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

  // Single selected element for floating toolbar
  const singleSelectedElement = selectedIds.length === 1 && !editingElementId
    ? elements.find((el) => el.id === selectedIds[0])
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
                  onDeletePoint={handleDeletePoint}
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

      {/* Floating Quick Typography Toolbar for selected text */}
      {singleSelectedElement && singleSelectedElement.type === 'text' && (
        <FloatingTextToolbar
          element={singleSelectedElement}
          viewTransform={viewTransform}
          onUpdateElement={(updates) => {
            const next = elements.map((el) =>
              el.id === singleSelectedElement.id ? { ...el, ...updates } : el
            );
            onElementsChange(next);
            onCommitHistory(next);
          }}
        />
      )}

      {/* Inline Text Editor Overlay (Seamless Free Text) */}
      {editingElement && (
        <TextEditorOverlay
          element={editingElement}
          viewTransform={viewTransform}
          onCommit={(newText, updates) => {
            if (editingElement.type === 'text') {
              if (!newText.trim()) {
                // Discard empty text cleanly
                const next = elements.filter((el) => el.id !== editingElement.id);
                onElementsChange(next);
                onCommitHistory(next);
                onSelectElements([]);
              } else {
                const lines = newText.split('\n');
                const maxLineLen = Math.max(...lines.map((l) => l.length));
                const fontSize = updates?.fontSize || editingElement.fontSize || 20;
                const approxW = Math.max(80, maxLineLen * (fontSize * 0.62));
                const approxH = Math.max(30, lines.length * (fontSize * 1.3));

                const next = elements.map((el) =>
                  el.id === editingElement.id
                    ? {
                        ...el,
                        ...updates,
                        text: newText,
                        width: approxW,
                        height: approxH,
                      }
                    : el
                );
                onElementsChange(next);
                onCommitHistory(next);
              }
            } else {
              // For shapes (rectangle, ellipse, figure):
              // NEVER delete the shape or change its width/height! Only update label!
              const next = elements.map((el) =>
                el.id === editingElement.id
                  ? {
                      ...el,
                      ...updates,
                      text: newText.trim() ? newText : undefined,
                    }
                  : el
              );
              onElementsChange(next);
              onCommitHistory(next);
            }
            setEditingElementId(null);
          }}
          onCancel={() => {
            if (editingElement.type === 'text' && (!editingElement.text || !editingElement.text.trim())) {
              const next = elements.filter((el) => el.id !== editingElement.id);
              onElementsChange(next);
              onCommitHistory(next);
              onSelectElements([]);
            }
            setEditingElementId(null);
          }}
        />
      )}

      {/* Floating Canvas Quick Action Bar (Expand Right & Content Indicator) */}
      <div className="absolute bottom-6 right-80 z-30 flex items-center gap-2 pointer-events-auto select-none">
        {hasContentOnRight && (
          <button
            type="button"
            onClick={handleScrollToRightContent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/95 hover:bg-blue-500 text-white rounded-lg text-xs font-medium shadow-lg backdrop-blur-md transition-all border border-blue-400/40 animate-pulse"
            title="There are drawn elements further to the right. Click to pan directly to them."
          >
            <span>Content on right</span>
            <LuChevronRight size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={handleExpandCanvasRight}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/95 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-lg text-xs font-medium shadow-md border border-zinc-700/80 backdrop-blur-md transition-all hover:border-blue-500/50"
          title="Expand canvas viewport to the right (+800px)"
        >
          <LuMoveHorizontal size={14} className="text-blue-400" />
          <span>Expand Right</span>
          <LuArrowRight size={13} className="text-zinc-400" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/90 rounded-lg text-[11px] text-zinc-400 border border-zinc-800 backdrop-blur-md">
          <span>Width:</span>
          <span className="font-mono text-zinc-200 font-semibold">{Math.round(totalSpanX)}px</span>
        </div>
      </div>

      {/* Interactive Horizontal Scrollbar */}
      <div
        ref={hTrackRef}
        onClick={handleHTrackClick}
        className="absolute bottom-1.5 left-20 right-80 h-3 hover:h-4 bg-zinc-900/80 hover:bg-zinc-900/95 border border-zinc-800/80 rounded-full z-20 cursor-pointer transition-all duration-150 backdrop-blur-md group"
        title="Horizontal scrollbar: drag thumb or click track to scroll canvas horizontally"
      >
        <div
          onMouseDown={handleHThumbMouseDown}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: `${hThumbWidthPct}%`,
            left: `${hThumbLeftPct}%`,
          }}
          className="absolute top-0.5 bottom-0.5 bg-zinc-500/80 group-hover:bg-blue-500 active:bg-blue-600 rounded-full cursor-grab active:cursor-grabbing transition-colors"
        />
      </div>

      {/* Interactive Vertical Scrollbar */}
      <div
        ref={vTrackRef}
        onClick={handleVTrackClick}
        className="absolute top-20 bottom-10 right-76 w-3 hover:w-4 bg-zinc-900/80 hover:bg-zinc-900/95 border border-zinc-800/80 rounded-full z-20 cursor-pointer transition-all duration-150 backdrop-blur-md group"
        title="Vertical scrollbar: drag thumb or click track to scroll canvas vertically"
      >
        <div
          onMouseDown={handleVThumbMouseDown}
          onClick={(e) => e.stopPropagation()}
          style={{
            height: `${vThumbHeightPct}%`,
            top: `${vThumbTopPct}%`,
          }}
          className="absolute left-0.5 right-0.5 bg-zinc-500/80 group-hover:bg-blue-500 active:bg-blue-600 rounded-full cursor-grab active:cursor-grabbing transition-colors"
        />
      </div>
    </div>
  );
};
