export type Tool =
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'draw'
  | 'text'
  | 'icon'
  | 'figure';

export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'draw'
  | 'text'
  | 'icon'
  | 'figure';

export type StrokeStyle = 'solid' | 'dashed' | 'dotted';
export type FillStyle = 'solid' | 'semi' | 'transparent';
export type ArrowHead = 'none' | 'arrow' | 'triangle' | 'circle';
export type LineRouting = 'straight' | 'orthogonal' | 'curved' | 'zigzag';

export type FigureType =
  | 'diamond'
  | 'cylinder'
  | 'cloud'
  | 'server'
  | 'triangle'
  | 'hexagon'
  | 'star'
  | 'speech'
  | 'stickman';

export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // In degrees

  // Stroke & Colors
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  fillStyle: FillStyle;
  opacity: number; // 0 - 100
  cornerRadius?: number; // 0, 8, 16, 9999

  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';

  // Free draw / multi-point lines
  points?: Point[];

  // Arrow & Line specific
  lineRouting?: LineRouting;
  startArrow?: ArrowHead;
  endArrow?: ArrowHead;
  curved?: boolean;

  // Icon specific
  iconName?: string;
  iconPack?: 'lu' | 'fa';

  // Figure specific
  figureType?: FigureType;

  // Ordering & State
  zIndex: number;
  isLocked?: boolean;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasSettings {
  gridType: 'dots' | 'lines' | 'none';
  backgroundColor: string;
  snapToGrid: boolean;
  gridSize: number;
}

export interface BoardSession {
  version: number;
  id: string;
  title: string;
  elements: CanvasElement[];
  viewTransform: ViewTransform;
  settings: CanvasSettings;
  createdAt: number;
  lastActive: number;
  isSavedToFile?: boolean;
}

export type ResizeHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'start'
  | 'end';
