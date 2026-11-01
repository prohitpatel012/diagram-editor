import { CanvasSettings, StrokeStyle, FillStyle, FigureType } from '@/types/canvas';

export const DEFAULT_STROKE_COLORS = [
  '#ffffff', // Pure white
  '#cbd5e1', // Slate 300
  '#94a3b8', // Slate 400
  '#64748b', // Slate 500
  '#1e293b', // Slate 800
  '#000000', // Black
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

export const DEFAULT_FILL_COLORS = [
  'transparent',
  '#ffffff',
  '#f8fafc',
  '#1e293b',
  '#0f172a',
  '#ef444420', // Red soft
  '#f9731620', // Orange soft
  '#f59e0b20', // Amber soft
  '#10b98120', // Emerald soft
  '#06b6d420', // Cyan soft
  '#3b82f620', // Blue soft
  '#6366f120', // Indigo soft
  '#8b5cf620', // Violet soft
  '#ec489920', // Pink soft
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
];

export const CANVAS_BACKGROUNDS = [
  { label: 'Dark Slate', value: '#0f172a' },
  { label: 'Eraser Slate', value: '#121417' },
  { label: 'Zinc Dark', value: '#18181b' },
  { label: 'Pure Black', value: '#09090b' },
  { label: 'Clean White', value: '#ffffff' },
  { label: 'Warm Slate', value: '#f8fafc' },
];

export const STROKE_WIDTH_PRESETS = [
  { label: 'Thin (1px)', value: 1 },
  { label: 'Medium (2px)', value: 2 },
  { label: 'Thick (4px)', value: 4 },
  { label: 'Bold (8px)', value: 8 },
];

export const STROKE_STYLES: { label: string; value: StrokeStyle }[] = [
  { label: 'Solid', value: 'solid' },
  { label: 'Dashed', value: 'dashed' },
  { label: 'Dotted', value: 'dotted' },
];

export const LINE_ROUTING_OPTIONS: { label: string; value: 'straight' | 'orthogonal' | 'curved' | 'zigzag'; description: string }[] = [
  { label: 'Straight', value: 'straight', description: 'Direct straight line' },
  { label: 'Orthogonal (Elbow)', value: 'orthogonal', description: 'Right-angle connector to connect components' },
  { label: 'Curved (Smooth)', value: 'curved', description: 'Smooth Bézier curve connector' },
  { label: 'Zigzag Wave', value: 'zigzag', description: 'Zigzag alternating wave line' },
];

export const FILL_STYLES: { label: string; value: FillStyle }[] = [
  { label: 'Transparent', value: 'transparent' },
  { label: 'Semi-fill', value: 'semi' },
  { label: 'Solid', value: 'solid' },
];

export const CORNER_RADIUS_PRESETS = [
  { label: 'Sharp', value: 0 },
  { label: 'Rounded', value: 8 },
  { label: 'Smooth', value: 16 },
  { label: 'Pill', value: 9999 },
];

export const FONT_FAMILIES = [
  { label: 'Inter (Sans)', value: '"Inter", var(--font-sans), system-ui, sans-serif' },
  { label: 'Fira Code (Mono)', value: '"Fira Code", var(--font-mono), monospace' },
  { label: 'Caveat (Handwritten)', value: '"Caveat", cursive, "Comic Sans MS", sans-serif' },
  { label: 'Serif (Classic)', value: 'Georgia, Cambria, "Times New Roman", serif' },
  { label: 'System UI', value: 'system-ui, -apple-system, sans-serif' },
];

export const FONT_SIZE_PRESETS = [12, 16, 20, 24, 32, 48, 64];

export const FIGURE_DEFINITIONS: { type: FigureType; label: string; description: string }[] = [
  { type: 'diamond', label: 'Decision (Diamond)', description: 'Flowchart decision node' },
  { type: 'cylinder', label: 'Database / Storage', description: 'Database cylinder table' },
  { type: 'cloud', label: 'Cloud Service', description: 'Network cloud infrastructure' },
  { type: 'server', label: 'Server / Node', description: 'Compute node or machine' },
  { type: 'triangle', label: 'Triangle / Warning', description: 'Hierarchical node or warning' },
  { type: 'hexagon', label: 'Hexagon / Process', description: 'Microservice or state' },
  { type: 'star', label: 'Star / Bookmark', description: 'Highlight or key feature' },
  { type: 'speech', label: 'Speech Bubble', description: 'Commentary or annotation' },
  { type: 'stickman', label: 'User / Actor', description: 'User or client actor' },
];

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  gridType: 'dots',
  backgroundColor: '#121417',
  snapToGrid: false,
  gridSize: 20,
};

export const STORAGE_KEY = 'eraser_whiteboard_workspace_session_v1';
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

