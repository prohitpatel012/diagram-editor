export interface MeetingImage {
  id: string;
  sessionId: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  caption?: string;
  createdAt: number;
}

export type MeetingStatus = 'active' | 'archived' | 'completed';

export interface MeetingSession {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string
  content: string; // Rich-text HTML content
  images: MeetingImage[];
  status: MeetingStatus;
  createdAt: number;
  updatedAt: number;
  lastSavedAt: number;
  lastOpenedAt: number;
  expiresAt: number; // Retained for at least 7 days from creation/last update
  isSavedToFile?: boolean;
}

export type AutosaveState = 'saved' | 'saving' | 'error' | 'offline';

export interface MeetingTocItem {
  id: string;
  text: string;
  level: number; // 1 for H1, 2 for H2, 3 for H3
}

export interface MeetingTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
}

