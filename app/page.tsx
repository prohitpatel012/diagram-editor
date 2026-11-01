'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Tool,
  CanvasElement,
  ViewTransform,
  CanvasSettings,
  FigureType,
  LineRouting,
} from '@/types/canvas';
import {
  saveSessionToStorage,
  loadSessionFromStorage,
  clearSessionFromStorage,
  exportToLocalFile,
  readLocalFile,
  StorageStatus,
} from '@/lib/storage';
import { exportSvgToPng } from '@/lib/export';
import { DEFAULT_CANVAS_SETTINGS } from '@/lib/constants';
import { TopBar } from '@/components/TopBar/TopBar';
import { LeftSidebar } from '@/components/Sidebar/LeftSidebar';
import { RightSidebar } from '@/components/Inspector/RightSidebar';
import { InfiniteCanvas } from '@/components/Canvas/InfiniteCanvas';
import { IconPickerModal } from '@/components/Sidebar/IconPickerModal';
import { FigurePickerPopup } from '@/components/Sidebar/FigurePickerPopup';
import { LineRoutingPopup } from '@/components/Sidebar/LineRoutingPopup';
import { ensureLinePoints } from '@/components/Canvas/CanvasElementRenderer';
import { ERDiagramEditor } from '@/components/ERDiagram/ERDiagramEditor';

const STARTER_ELEMENTS: CanvasElement[] = [
  {
    id: 'starter_title',
    type: 'text',
    x: 80,
    y: 60,
    width: 360,
    height: 40,
    strokeColor: '#ffffff',
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'transparent',
    opacity: 100,
    text: '🚀 Cloud System Architecture',
    fontSize: 26,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 'bold',
    textAlign: 'left',
    zIndex: 1,
  },
  {
    id: 'starter_free_text_tip',
    type: 'text',
    x: 80,
    y: 105,
    width: 440,
    height: 30,
    strokeColor: '#38bdf8',
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'transparent',
    opacity: 90,
    text: '💡 Double-click anywhere on the canvas to write free text instantly!',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    textAlign: 'left',
    zIndex: 2,
  },
  {
    id: 'starter_cloud',
    type: 'figure',
    figureType: 'cloud',
    x: 80,
    y: 160,
    width: 220,
    height: 140,
    strokeColor: '#38bdf8',
    fillColor: '#0284c725',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'semi',
    opacity: 100,
    text: 'API Gateway',
    fontSize: 16,
    zIndex: 3,
  },
  {
    id: 'starter_orthogonal_arrow',
    type: 'arrow',
    lineRouting: 'orthogonal', // Right-angle stepped connector connecting 2 components
    x: 300,
    y: 230,
    width: 170,
    height: 60,
    strokeColor: '#38bdf8',
    fillColor: 'transparent',
    strokeWidth: 2.5,
    strokeStyle: 'solid',
    fillStyle: 'transparent',
    opacity: 100,
    zIndex: 4,
  },
  {
    id: 'starter_server',
    type: 'figure',
    figureType: 'server',
    x: 470,
    y: 220,
    width: 180,
    height: 140,
    strokeColor: '#818cf8',
    fillColor: '#4f46e520',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'semi',
    opacity: 100,
    text: 'App Server',
    fontSize: 16,
    zIndex: 5,
  },
  {
    id: 'starter_curved_arrow',
    type: 'arrow',
    lineRouting: 'curved', // Smooth Bézier S-curve connector
    x: 650,
    y: 270,
    width: 150,
    height: -80,
    strokeColor: '#a78bfa',
    fillColor: 'transparent',
    strokeWidth: 2.5,
    strokeStyle: 'dashed',
    fillStyle: 'transparent',
    opacity: 100,
    zIndex: 6,
  },
  {
    id: 'starter_db',
    type: 'figure',
    figureType: 'cylinder',
    x: 800,
    y: 120,
    width: 160,
    height: 150,
    strokeColor: '#34d399',
    fillColor: '#05966925',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'semi',
    opacity: 100,
    text: 'PostgreSQL DB',
    fontSize: 16,
    zIndex: 7,
  },
  {
    id: 'starter_react_icon',
    type: 'icon',
    iconName: 'LuDatabase',
    x: 855,
    y: 280,
    width: 48,
    height: 48,
    strokeColor: '#10b981',
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'transparent',
    opacity: 100,
    zIndex: 8,
  },
  {
    id: 'starter_stepped_line',
    type: 'arrow',
    lineRouting: 'stepped', // Multi-Node Orthogonal Connector (Eraser.io style)
    x: 470,
    y: 380,
    width: 280,
    height: 80,
    points: [
      { x: 470, y: 380 },
      { x: 580, y: 380 },
      { x: 580, y: 460 },
      { x: 750, y: 460 },
    ],
    strokeColor: '#f59e0b',
    fillColor: 'transparent',
    strokeWidth: 2.5,
    strokeStyle: 'solid',
    fillStyle: 'transparent',
    opacity: 100,
    zIndex: 9,
  },
  {
    id: 'starter_stepped_label',
    type: 'text',
    x: 760,
    y: 445,
    width: 230,
    height: 30,
    strokeColor: '#f59e0b',
    fillColor: 'transparent',
    strokeWidth: 2,
    strokeStyle: 'solid',
    fillStyle: 'transparent',
    opacity: 100,
    text: '⮑ Multi-Node Orthogonal (Eraser)',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    textAlign: 'left',
    zIndex: 10,
  },
  {
    id: 'starter_box',
    type: 'rectangle',
    x: 80,
    y: 360,
    width: 360,
    height: 120,
    strokeColor: '#64748b',
    fillColor: '#1e293b40',
    strokeWidth: 2,
    strokeStyle: 'dotted',
    fillStyle: 'semi',
    cornerRadius: 12,
    opacity: 90,
    text: '✨ Line Connector Types:\n• Orthogonal (Elbow / Right-angles)\n• Curved (Smooth S-curve)\n• Zigzag (Wave / Sawtooth)\n• Straight Line',
    fontSize: 14,
    zIndex: 11,
  },
];

export default function WhiteboardPage() {
  const [appMode, setAppMode] = useState<'whiteboard' | 'er-diagram'>('er-diagram');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('app_active_mode');
      if (saved === 'whiteboard' || saved === 'er-diagram') {
        setAppMode(saved);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSelectMode = (mode: 'whiteboard' | 'er-diagram') => {
    setAppMode(mode);
    try {
      localStorage.setItem('app_active_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  const [boardTitle, setBoardTitle] = useState('Untitled Diagram');
  const [erTitle, setErTitle] = useState('E-Commerce Platform Schema');
  const [erStorageStatus, setErStorageStatus] = useState<StorageStatus>({
    hasSession: true,
    isExpired: false,
    remainingDays: 7,
    remainingHours: 0,
    lastActiveDate: null,
    isSavedToFile: false,
  });
  const [currentTool, setCurrentTool] = useState<Tool>('select');
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 40, y: 40, scale: 1 });
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);

  // Active figure, icon, and line routing for placement
  const [activeFigureType, setActiveFigureType] = useState<FigureType>('cylinder');
  const [activeIconName, setActiveIconName] = useState<string>('LuDatabase');
  const [activeLineRouting, setActiveLineRouting] = useState<LineRouting>('straight');

  // Modals & Popups
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isFigurePickerOpen, setIsFigurePickerOpen] = useState(false);
  const [isLineRoutingPickerOpen, setIsLineRoutingPickerOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Active default styles for newly drawn shapes
  const [defaultStrokeColor, setDefaultStrokeColor] = useState('#ffffff');
  const [defaultFillColor, setDefaultFillColor] = useState('#3b82f620');

  // Storage and 7-day retention tracking
  const [storageStatus, setStorageStatus] = useState<StorageStatus>({
    hasSession: false,
    isExpired: false,
    remainingDays: 7,
    remainingHours: 0,
    lastActiveDate: null,
    isSavedToFile: false,
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<CanvasElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isInitializedRef = useRef(false);

  // 1. Initial Load: Restore from 7-day Local Storage
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const { session, status } = loadSessionFromStorage();
    setStorageStatus(status);

    if (session && session.elements && session.elements.length > 0) {
      setElements(session.elements);
      if (session.viewTransform) setViewTransform(session.viewTransform);
      if (session.settings) setCanvasSettings(session.settings);
      if (session.title) setBoardTitle(session.title);

      setHistory([session.elements]);
      setHistoryIndex(0);
    } else {
      // First-time starter template
      setElements(STARTER_ELEMENTS);
      setHistory([STARTER_ELEMENTS]);
      setHistoryIndex(0);
      saveSessionToStorage(STARTER_ELEMENTS, { x: 40, y: 40, scale: 1 }, DEFAULT_CANVAS_SETTINGS, 'Untitled Diagram');
    }
  }, []);

  // 2. Debounced Auto-Save to 7-Day Session Storage
  useEffect(() => {
    if (!isInitializedRef.current || elements.length === 0) return;

    const timer = setTimeout(() => {
      saveSessionToStorage(elements, viewTransform, canvasSettings, boardTitle, storageStatus.isSavedToFile);
    }, 400);

    return () => clearTimeout(timer);
  }, [elements, viewTransform, canvasSettings, boardTitle, storageStatus.isSavedToFile]);

  // History Commit
  const commitHistory = useCallback(
    (newElements: CanvasElement[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        next.push(newElements);
        if (next.length > 50) next.shift();
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    },
    [historyIndex]
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const targetState = history[prevIndex];
      setHistoryIndex(prevIndex);
      setElements(targetState);
      setSelectedIds([]);
    }
  }, [history, historyIndex]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const targetState = history[nextIndex];
      setHistoryIndex(nextIndex);
      setElements(targetState);
      setSelectedIds([]);
    }
  }, [history, historyIndex]);

  // Duplicate Selected Elements
  const handleDuplicate = useCallback(() => {
    if (selectedIds.length === 0) return;

    const duplicates: CanvasElement[] = [];
    const newSelectedIds: string[] = [];

    elements.forEach((el) => {
      if (selectedIds.includes(el.id)) {
        const newId = `${el.type}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const offset = 24;
        const duplicated: CanvasElement = {
          ...el,
          id: newId,
          x: el.x + offset,
          y: el.y + offset,
          points: el.points ? el.points.map((pt) => ({ x: pt.x + offset, y: pt.y + offset })) : undefined,
          zIndex: elements.length + duplicates.length + 1,
        };
        duplicates.push(duplicated);
        newSelectedIds.push(newId);
      }
    });

    const next = [...elements, ...duplicates];
    setElements(next);
    commitHistory(next);
    setSelectedIds(newSelectedIds);
  }, [elements, selectedIds, commitHistory]);

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleDuplicate]);

  // Update properties of selected elements
  const handleUpdateElement = (updates: Partial<CanvasElement>) => {
    if (selectedIds.length === 0) return;

    if (updates.strokeColor) setDefaultStrokeColor(updates.strokeColor);
    if (updates.fillColor) setDefaultFillColor(updates.fillColor);
    if (updates.lineRouting) setActiveLineRouting(updates.lineRouting);

    const next = elements.map((el) => {
      if (selectedIds.includes(el.id)) {
        let updated = { ...el, ...updates };
        if (
          updates.lineRouting === 'stepped' &&
          (el.type === 'line' || el.type === 'arrow') &&
          (!updated.points || updated.points.length < 2)
        ) {
          updated.points = ensureLinePoints(updated);
        }
        return updated;
      }
      return el;
    });

    setElements(next);
    commitHistory(next);
  };

  // Delete Selected Elements
  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    const next = elements.filter((el) => !selectedIds.includes(el.id));
    setElements(next);
    commitHistory(next);
    setSelectedIds([]);
  };

  // Layer Ordering: Bring to Front
  const handleBringToFront = () => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    const nonSelected = elements.filter((el) => !selectedIds.includes(el.id));
    const next = [...nonSelected, ...selected].map((el, idx) => ({ ...el, zIndex: idx + 1 }));
    setElements(next);
    commitHistory(next);
  };

  // Layer Ordering: Send to Back
  const handleSendToBack = () => {
    if (selectedIds.length === 0) return;
    const selected = elements.filter((el) => selectedIds.includes(el.id));
    const nonSelected = elements.filter((el) => !selectedIds.includes(el.id));
    const next = [...selected, ...nonSelected].map((el, idx) => ({ ...el, zIndex: idx + 1 }));
    setElements(next);
    commitHistory(next);
  };

  // Export as PNG
  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      await exportSvgToPng(svgRef.current, elements, canvasSettings, boardTitle, {
        padding: 50,
        scale: 2,
        withBackground: true,
      });
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Failed to export PNG. Please try again.');
    }
  };

  // Save to Local File (.whiteboard)
  const handleSaveToFile = () => {
    exportToLocalFile(elements, viewTransform, canvasSettings, boardTitle);
    setStorageStatus((prev) => ({ ...prev, isSavedToFile: true }));
  };

  // Open Local File
  const handleOpenLocalFile = async (file: File) => {
    try {
      const session = await readLocalFile(file);
      setElements(session.elements || []);
      if (session.viewTransform) setViewTransform(session.viewTransform);
      if (session.settings) setCanvasSettings(session.settings);
      if (session.title) setBoardTitle(session.title);

      setHistory([session.elements || []]);
      setHistoryIndex(0);
      setSelectedIds([]);

      saveSessionToStorage(
        session.elements,
        session.viewTransform || viewTransform,
        session.settings || canvasSettings,
        session.title || boardTitle,
        true
      );
    } catch (err) {
      console.error('Failed to open whiteboard file:', err);
      alert('Error opening file: Make sure it is a valid .whiteboard or .json file.');
    }
  };

  // Clear Canvas
  const handleConfirmClearCanvas = () => {
    setElements([]);
    commitHistory([]);
    setSelectedIds([]);
    clearSessionFromStorage();
    setShowClearConfirm(false);
  };

  // Fit elements to view
  const handleFitToContent = () => {
    if (elements.length === 0) {
      setViewTransform({ x: 40, y: 40, scale: 1 });
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of elements) {
      const x1 = Math.min(el.x, el.x + el.width);
      const y1 = Math.min(el.y, el.y + el.height);
      const x2 = Math.max(el.x, el.x + el.width);
      const y2 = Math.max(el.y, el.y + el.height);
      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    }

    const margin = 100;
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    const viewW = window.innerWidth - 360;
    const viewH = window.innerHeight - 100;

    const scaleX = viewW / (contentW + margin * 2);
    const scaleY = viewH / (contentH + margin * 2);
    const nextScale = Math.min(1.5, Math.max(0.2, Math.min(scaleX, scaleY)));

    const nextPanX = (viewW - contentW * nextScale) / 2 - minX * nextScale + 80;
    const nextPanY = (viewH - contentH * nextScale) / 2 - minY * nextScale + 60;

    setViewTransform({
      x: nextPanX,
      y: nextPanY,
      scale: nextScale,
    });
  };

  const selectedElements = elements.filter((el) => selectedIds.includes(el.id));

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 font-sans">
      {/* Top Bar */}
      <TopBar
        title={appMode === 'er-diagram' ? erTitle : boardTitle}
        onUpdateTitle={appMode === 'er-diagram' ? setErTitle : setBoardTitle}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        viewTransform={viewTransform}
        onZoomIn={() =>
          setViewTransform((v) => ({ ...v, scale: Math.min(5, v.scale * 1.2) }))
        }
        onZoomOut={() =>
          setViewTransform((v) => ({ ...v, scale: Math.max(0.1, v.scale * 0.8) }))
        }
        onResetZoom={() => setViewTransform((v) => ({ ...v, scale: 1 }))}
        onFitToContent={handleFitToContent}
        storageStatus={appMode === 'er-diagram' ? erStorageStatus : storageStatus}
        activeMode={appMode}
        onSelectMode={handleSelectMode}
      />

      {/* Main Mode View */}
      {appMode === 'er-diagram' ? (
        <div className="absolute inset-0 pt-13">
          <ERDiagramEditor
            currentTitle={erTitle}
            onTitleChange={setErTitle}
            onStorageStatusChange={setErStorageStatus}
          />
        </div>
      ) : (
        <>
          {/* Left Sidebar (Tools, File operations) */}
          <LeftSidebar
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
            onOpenIconPicker={() => setIsIconPickerOpen(true)}
            onOpenFigurePicker={() => setIsFigurePickerOpen((v) => !v)}
            selectedFigureType={activeFigureType}
            activeLineRouting={activeLineRouting}
            onOpenLineRoutingPicker={() => setIsLineRoutingPickerOpen((v) => !v)}
            onExportPng={handleExportPng}
            onSaveToFile={handleSaveToFile}
            onOpenLocalFile={handleOpenLocalFile}
            onClearCanvas={() => setShowClearConfirm(true)}
          />

          {/* Figure Picker Popup */}
          <FigurePickerPopup
            isOpen={isFigurePickerOpen}
            onClose={() => setIsFigurePickerOpen(false)}
            onSelectFigure={(figType) => {
              setActiveFigureType(figType);
              setCurrentTool('figure');
            }}
          />

          {/* Line Routing / Connector Types Popup */}
          <LineRoutingPopup
            isOpen={isLineRoutingPickerOpen}
            onClose={() => setIsLineRoutingPickerOpen(false)}
            activeRouting={activeLineRouting}
            onSelectRouting={(routing) => {
              setActiveLineRouting(routing);
              if (selectedIds.length > 0) {
                handleUpdateElement({ lineRouting: routing });
              } else {
                setCurrentTool('arrow');
              }
            }}
          />

          {/* Infinite Canvas */}
          <InfiniteCanvas
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
            elements={elements}
            onElementsChange={setElements}
            selectedIds={selectedIds}
            onSelectElements={setSelectedIds}
            viewTransform={viewTransform}
            onViewTransformChange={setViewTransform}
            canvasSettings={canvasSettings}
            activeFigureType={activeFigureType}
            activeIconName={activeIconName}
            activeLineRouting={activeLineRouting}
            defaultStrokeColor={defaultStrokeColor}
            defaultFillColor={defaultFillColor}
            svgRef={svgRef}
            onCommitHistory={commitHistory}
            onOpenIconPicker={() => setIsIconPickerOpen(true)}
          />

          {/* Right Sidebar (Properties Inspector & Canvas Settings) */}
          <RightSidebar
            selectedElements={selectedElements}
            onUpdateElement={handleUpdateElement}
            onBringToFront={handleBringToFront}
            onSendToBack={handleSendToBack}
            onBringForward={handleBringToFront}
            onSendBackward={handleSendToBack}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            canvasSettings={canvasSettings}
            onUpdateCanvasSettings={(settings) =>
              setCanvasSettings((prev) => ({ ...prev, ...settings }))
            }
            storageStatus={storageStatus}
            onOpenIconPicker={() => setIsIconPickerOpen(true)}
          />
        </>
      )}

      {/* React Icons Library Modal */}
      <IconPickerModal
        isOpen={isIconPickerOpen}
        onClose={() => setIsIconPickerOpen(false)}
        onSelectIcon={(iconName) => {
          setActiveIconName(iconName);
          if (selectedIds.length === 1) {
            const current = elements.find((el) => el.id === selectedIds[0]);
            if (current && current.type === 'icon') {
              handleUpdateElement({ iconName });
              return;
            }
          }
          setCurrentTool('icon');
        }}
      />

      {/* Clear Canvas Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-zinc-100 shadow-2xl">
            <h4 className="text-base font-semibold text-white">Clear Canvas?</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              This will remove all drawings and shapes on the current whiteboard.
              Make sure to save your work to a file if you want to keep it.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearCanvas}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition-colors"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
