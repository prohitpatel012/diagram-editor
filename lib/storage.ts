import { BoardSession, CanvasElement, CanvasSettings, ViewTransform } from '@/types/canvas';
import { STORAGE_KEY, SEVEN_DAYS_MS, DEFAULT_CANVAS_SETTINGS } from './constants';

export interface StorageStatus {
  hasSession: boolean;
  isExpired: boolean;
  remainingDays: number;
  remainingHours: number;
  lastActiveDate: Date | null;
  isSavedToFile: boolean;
}

export function saveSessionToStorage(
  elements: CanvasElement[],
  viewTransform: ViewTransform,
  settings: CanvasSettings,
  title: string = 'Untitled Diagram',
  isSavedToFile: boolean = false
): void {
  if (typeof window === 'undefined') return;

  try {
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    let createdAt = Date.now();
    let id = 'whiteboard_' + Math.random().toString(36).substring(2, 9);

    if (existingRaw) {
      try {
        const existing = JSON.parse(existingRaw) as BoardSession;
        if (existing.createdAt) createdAt = existing.createdAt;
        if (existing.id) id = existing.id;
        if (existing.isSavedToFile) isSavedToFile = isSavedToFile || existing.isSavedToFile;
      } catch {
        // Fall back to new
      }
    }

    const session: BoardSession = {
      version: 1,
      id,
      title,
      elements,
      viewTransform,
      settings,
      createdAt,
      lastActive: Date.now(),
      isSavedToFile,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save whiteboard session to localStorage:', error);
  }
}

export function loadSessionFromStorage(): {
  session: BoardSession | null;
  status: StorageStatus;
} {
  if (typeof window === 'undefined') {
    return {
      session: null,
      status: {
        hasSession: false,
        isExpired: false,
        remainingDays: 7,
        remainingHours: 0,
        lastActiveDate: null,
        isSavedToFile: false,
      },
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        session: null,
        status: {
          hasSession: false,
          isExpired: false,
          remainingDays: 7,
          remainingHours: 0,
          lastActiveDate: null,
          isSavedToFile: false,
        },
      };
    }

    const session = JSON.parse(raw) as BoardSession;
    const now = Date.now();
    const elapsed = now - (session.lastActive || session.createdAt || now);
    const isExpired = elapsed > SEVEN_DAYS_MS && !session.isSavedToFile;

    const remainingMs = Math.max(0, SEVEN_DAYS_MS - elapsed);
    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (isExpired) {
      // Clean up expired session
      localStorage.removeItem(STORAGE_KEY);
      return {
        session: null,
        status: {
          hasSession: false,
          isExpired: true,
          remainingDays: 0,
          remainingHours: 0,
          lastActiveDate: new Date(session.lastActive),
          isSavedToFile: false,
        },
      };
    }

    // Ensure backwards compatibility with default settings if missing
    if (!session.settings) {
      session.settings = DEFAULT_CANVAS_SETTINGS;
    }

    return {
      session,
      status: {
        hasSession: true,
        isExpired: false,
        remainingDays,
        remainingHours,
        lastActiveDate: new Date(session.lastActive),
        isSavedToFile: !!session.isSavedToFile,
      },
    };
  } catch (error) {
    console.error('Failed to load session from localStorage:', error);
    return {
      session: null,
      status: {
        hasSession: false,
        isExpired: false,
        remainingDays: 7,
        remainingHours: 0,
        lastActiveDate: null,
        isSavedToFile: false,
      },
    };
  }
}

export function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}

// Export board data to a JSON file (.whiteboard)
export function exportToLocalFile(
  elements: CanvasElement[],
  viewTransform: ViewTransform,
  settings: CanvasSettings,
  title: string = 'whiteboard-diagram'
): void {
  const data: BoardSession = {
    version: 1,
    id: 'export_' + Date.now(),
    title,
    elements,
    viewTransform,
    settings,
    createdAt: Date.now(),
    lastActive: Date.now(),
    isSavedToFile: true,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'diagram';
  const fileName = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.whiteboard`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Update storage to mark as saved
  saveSessionToStorage(elements, viewTransform, settings, title, true);
}

// Open and read a whiteboard file from the user's computer
export function readLocalFile(file: File): Promise<BoardSession> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as BoardSession;
        if (!parsed.elements || !Array.isArray(parsed.elements)) {
          throw new Error('Invalid file format: missing elements array');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

