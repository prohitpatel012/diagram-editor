import { ERDiagram, ERViewSettings } from '@/types/er';
import { StorageStatus } from './storage';
import { SEVEN_DAYS_MS } from './constants';

export const ER_STORAGE_KEY = 'eraser_er_diagram_workspace_session_v1';
export const LEGACY_ER_STORAGE_KEY = 'er_diagram_active_v1';

export interface ERDiagramSession {
  version: number;
  id: string;
  title: string;
  diagram: ERDiagram;
  viewSettings?: ERViewSettings;
  viewport?: {
    scale: number;
    pan: { x: number; y: number };
  };
  createdAt: number;
  lastActive: number;
  isSavedToFile?: boolean;
}

export function saveERSessionToStorage(
  diagram: ERDiagram,
  viewSettings?: ERViewSettings,
  viewport?: { scale: number; pan: { x: number; y: number } },
  isSavedToFile: boolean = false
): StorageStatus {
  if (typeof window === 'undefined') {
    return {
      hasSession: false,
      isExpired: false,
      remainingDays: 7,
      remainingHours: 0,
      lastActiveDate: null,
      isSavedToFile: false,
    };
  }

  try {
    const raw = localStorage.getItem(ER_STORAGE_KEY);
    let createdAt = Date.now();
    let id = diagram.id || 'er_' + Math.random().toString(36).substring(2, 9);
    let wasSavedToFile = isSavedToFile;

    if (raw) {
      try {
        const existing = JSON.parse(raw) as ERDiagramSession;
        if (existing.createdAt) createdAt = existing.createdAt;
        if (existing.id) id = existing.id;
        if (existing.isSavedToFile) wasSavedToFile = wasSavedToFile || existing.isSavedToFile;
      } catch {
        // Fall back to defaults
      }
    }

    const session: ERDiagramSession = {
      version: 1,
      id,
      title: diagram.name || 'Untitled ER Diagram',
      diagram,
      viewSettings,
      viewport,
      createdAt,
      lastActive: Date.now(),
      isSavedToFile: wasSavedToFile,
    };

    localStorage.setItem(ER_STORAGE_KEY, JSON.stringify(session));

    return {
      hasSession: true,
      isExpired: false,
      remainingDays: 7,
      remainingHours: 0,
      lastActiveDate: new Date(session.lastActive),
      isSavedToFile: wasSavedToFile,
    };
  } catch (err) {
    console.error('Failed to save ER diagram session to localStorage:', err);
    return {
      hasSession: false,
      isExpired: false,
      remainingDays: 7,
      remainingHours: 0,
      lastActiveDate: null,
      isSavedToFile: false,
    };
  }
}

export function loadERSessionFromStorage(): {
  session: ERDiagramSession | null;
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
    let raw = localStorage.getItem(ER_STORAGE_KEY);
    let isLegacy = false;

    // Check if modern session exists; if not, check legacy key
    if (!raw) {
      const legacyRaw = localStorage.getItem(LEGACY_ER_STORAGE_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
        isLegacy = true;
      }
    }

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

    const parsed = JSON.parse(raw);

    // If it was legacy format (directly ERDiagram), wrap into session
    let session: ERDiagramSession;
    if (isLegacy || (parsed.tables && !parsed.diagram)) {
      session = {
        version: 1,
        id: parsed.id || 'er_' + Date.now(),
        title: parsed.name || 'Untitled ER Diagram',
        diagram: parsed as ERDiagram,
        createdAt: parsed.createdAt || Date.now(),
        lastActive: parsed.updatedAt || Date.now(),
        isSavedToFile: false,
      };
      // Migrate to new storage key
      localStorage.setItem(ER_STORAGE_KEY, JSON.stringify(session));
      localStorage.removeItem(LEGACY_ER_STORAGE_KEY);
    } else {
      session = parsed as ERDiagramSession;
    }

    const now = Date.now();
    const elapsed = now - (session.lastActive || session.createdAt || now);
    const isExpired = elapsed > SEVEN_DAYS_MS && !session.isSavedToFile;

    const remainingMs = Math.max(0, SEVEN_DAYS_MS - elapsed);
    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

    if (isExpired) {
      localStorage.removeItem(ER_STORAGE_KEY);
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
  } catch (err) {
    console.error('Failed to load ER diagram session:', err);
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

export function clearERSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ER_STORAGE_KEY);
    localStorage.removeItem(LEGACY_ER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear ER session:', e);
  }
}

export function exportERDiagramToFile(diagram: ERDiagram): void {
  if (typeof window === 'undefined') return;
  const data: ERDiagramSession = {
    version: 1,
    id: 'export_' + Date.now(),
    title: diagram.name || 'er-diagram',
    diagram,
    createdAt: Date.now(),
    lastActive: Date.now(),
    isSavedToFile: true,
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const sanitizedTitle = (diagram.name || 'er_diagram').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const fileName = `${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.erdiagram`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Mark session as saved to file in localStorage
  saveERSessionToStorage(diagram, undefined, undefined, true);
}

export function readERDiagramFile(file: File): Promise<ERDiagramSession> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.diagram && Array.isArray(parsed.diagram.tables)) {
          resolve(parsed as ERDiagramSession);
        } else if (Array.isArray(parsed.tables)) {
          // Plain ERDiagram
          resolve({
            version: 1,
            id: parsed.id || 'imported_' + Date.now(),
            title: parsed.name || file.name.replace(/\.[^/.]+$/, ''),
            diagram: parsed as ERDiagram,
            createdAt: Date.now(),
            lastActive: Date.now(),
            isSavedToFile: true,
          });
        } else {
          throw new Error('Invalid ER Diagram file format: missing tables array');
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

