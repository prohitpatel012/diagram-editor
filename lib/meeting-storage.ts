import { MeetingSession, MeetingImage, MeetingStatus } from '@/types/meeting';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DB_NAME = 'EraserMeetingNotesDB';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const IMAGES_STORE = 'images';
const SESSIONS_META_KEY = 'eraser_meeting_sessions_meta_v1';

// In-memory cache of object URLs for instant rendering of blobs
const blobUrlCache = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB is only available in browser'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        const imgStore = db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        imgStore.createIndex('sessionId', 'sessionId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Starter template for new users
export const STARTER_MEETING_SESSIONS: MeetingSession[] = [
  {
    id: 'session_arch_kickoff',
    title: 'Sprint Planning & Architecture Review',
    description: 'Weekly team engineering sync covering schema design, system diagrams, and feature delivery.',
    date: new Date().toISOString(),
    content: `
      <h2>🚀 Sprint Objectives &amp; Milestones</h2>
      <p>Welcome to your <strong>Meeting Notes &amp; Session Workspace</strong>! This workspace gives you a rich writing canvas with screenshot paste (<kbd>Ctrl+V</kbd>), auto-save, and guaranteed <strong>7-day session retention</strong>.</p>
      
      <blockquote>
        <p><strong>Goal:</strong> Provide a distraction-free place to capture team discussions, paste debugging screenshots directly from Snipping Tool, and track action items.</p>
      </blockquote>

      <h3>🎯 Action Items &amp; Checklists</h3>
      <ul class="task-list">
        <li data-checked="true"><input type="checkbox" checked /> Design database schema with ER diagram tool</li>
        <li data-checked="true"><input type="checkbox" checked /> Verify 7-day canvas session retention</li>
        <li data-checked="false"><input type="checkbox" /> Paste system performance screenshots directly using <kbd>Ctrl+V</kbd></li>
        <li data-checked="false"><input type="checkbox" /> Export meeting notes to Markdown or HTML</li>
      </ul>

      <h3>📊 Project Roadmap</h3>
      <table border="1">
        <thead>
          <tr>
            <th>Module</th>
            <th>Lead</th>
            <th>Status</th>
            <th>Target Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Interactive Whiteboard</td>
            <td>Frontend Team</td>
            <td><strong>Shipped</strong></td>
            <td>Q4 Milestone 1</td>
          </tr>
          <tr>
            <td>ER Diagram Builder</td>
            <td>Database Architect</td>
            <td><strong>Shipped</strong></td>
            <td>Q4 Milestone 2</td>
          </tr>
          <tr>
            <td>Meeting Notes &amp; Screenshots</td>
            <td>Core Product</td>
            <td><strong>Active</strong></td>
            <td>Current Sprint</td>
          </tr>
        </tbody>
      </table>

      <h3>💡 How to Paste Screenshots</h3>
      <p>Whenever you are on a call or inspecting an error, simply press <kbd>Win + Shift + S</kbd> to capture an area, then click inside this editor and press <kbd>Ctrl + V</kbd>. The screenshot will appear immediately inline without needing a database or cloud upload!</p>
    `.trim(),
    images: [],
    status: 'active',
    createdAt: Date.now() - 3600000 * 2,
    updatedAt: Date.now() - 1800000,
    lastSavedAt: Date.now() - 1800000,
    lastOpenedAt: Date.now(),
    expiresAt: Date.now() + SEVEN_DAYS_MS,
    isSavedToFile: false,
  },
  {
    id: 'session_product_roadmap',
    title: 'Customer Feedback & Design Review',
    description: 'Summary of user testing feedback on keyboard shortcuts and screenshot workflows.',
    date: new Date(Date.now() - 86400000).toISOString(),
    content: `
      <h2>📋 Customer Feedback Highlights</h2>
      <p>Summary of takeaways from user interviews this week:</p>
      <ul>
        <li><strong>Screenshot Pasting:</strong> Users want to paste multiple screenshots consecutively into one note without waiting for cloud uploads.</li>
        <li><strong>Safe Retention:</strong> Sessions must stay intact across browser refreshes and tab closures for at least 7 days.</li>
        <li><strong>Download Options:</strong> Fast export to Markdown (<kbd>.md</kbd>) and HTML is critical for team sharing.</li>
      </ul>
      <h3>Next Actions</h3>
      <p>Document release notes and share export with team members.</p>
    `.trim(),
    images: [],
    status: 'active',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000 + 7200000,
    lastSavedAt: Date.now() - 86400000 + 7200000,
    lastOpenedAt: Date.now() - 3600000,
    expiresAt: Date.now() - 86400000 + SEVEN_DAYS_MS,
    isSavedToFile: false,
  },
];

export async function getAllMeetingSessions(): Promise<MeetingSession[]> {
  if (typeof window === 'undefined') return STARTER_MEETING_SESSIONS;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SESSIONS_STORE, 'readonly');
      const store = tx.objectStore(SESSIONS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        let sessions = req.result as MeetingSession[];
        if (!sessions || sessions.length === 0) {
          // Initialize starters into IndexedDB
          const writeTx = db.transaction(SESSIONS_STORE, 'readwrite');
          const writeStore = writeTx.objectStore(SESSIONS_STORE);
          for (const s of STARTER_MEETING_SESSIONS) {
            writeStore.put(s);
          }
          sessions = [...STARTER_MEETING_SESSIONS];
        }

        // Sort by updatedAt descending
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(sessions);
      };

      req.onerror = () => {
        resolve(STARTER_MEETING_SESSIONS);
      };
    });
  } catch (err) {
    console.error('Failed to get meeting sessions from IndexedDB:', err);
    return STARTER_MEETING_SESSIONS;
  }
}

export async function getMeetingSession(id: string): Promise<MeetingSession | null> {
  if (typeof window === 'undefined') return null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SESSIONS_STORE, 'readonly');
      const store = tx.objectStore(SESSIONS_STORE);
      const req = store.get(id);

      req.onsuccess = () => {
        const session = req.result as MeetingSession | undefined;
        if (session) {
          // Update lastOpenedAt
          session.lastOpenedAt = Date.now();
          saveMeetingSession(session).catch(console.error);
          resolve(session);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveMeetingSession(session: MeetingSession): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  // Ensure expiresAt is at least 7 days from last active update
  const updatedExpiresAt = Math.max(session.expiresAt || now + SEVEN_DAYS_MS, now + SEVEN_DAYS_MS);

  const updated: MeetingSession = {
    ...session,
    updatedAt: now,
    lastSavedAt: now,
    expiresAt: updatedExpiresAt,
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save meeting session to IndexedDB:', err);
  }
}

export async function createNewMeetingSession(
  title: string = 'Untitled Meeting Notes',
  description: string = ''
): Promise<MeetingSession> {
  const now = Date.now();
  const id = 'session_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 7);

  const newSession: MeetingSession = {
    id,
    title: title.trim() || 'Untitled Meeting Notes',
    description,
    date: new Date().toISOString(),
    content: `<h2>Meeting Objectives</h2><p>Start typing notes, format with the toolbar, or paste screenshots with <kbd>Ctrl+V</kbd>...</p>`,
    images: [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastSavedAt: now,
    lastOpenedAt: now,
    expiresAt: now + SEVEN_DAYS_MS,
    isSavedToFile: false,
  };

  await saveMeetingSession(newSession);
  return newSession;
}

export async function deleteMeetingSession(id: string): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, IMAGES_STORE], 'readwrite');
      tx.objectStore(SESSIONS_STORE).delete(id);

      // Clean up images associated with this session
      const imgStore = tx.objectStore(IMAGES_STORE);
      const index = imgStore.index('sessionId');
      const req = index.getAllKeys(id);

      req.onsuccess = () => {
        const keys = req.result;
        for (const key of keys) {
          imgStore.delete(key);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete meeting session:', err);
  }
}

// Save image binary blob into IndexedDB and return MeetingImage metadata with blob URL
export async function saveMeetingImageBlob(
  sessionId: string,
  fileOrBlob: Blob | File,
  filename?: string
): Promise<MeetingImage> {
  const imageId = 'img_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  const mimeType = fileOrBlob.type || 'image/png';
  const originalFilename = filename || (fileOrBlob instanceof File ? fileOrBlob.name : `screenshot_${Date.now()}.png`);

  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readwrite');
    const store = tx.objectStore(IMAGES_STORE);
    const req = store.put({
      id: imageId,
      sessionId,
      blob: fileOrBlob,
      mimeType,
      originalFilename,
      fileSize: fileOrBlob.size,
      createdAt: Date.now(),
    });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  // Create and cache an Object URL
  const objectUrl = URL.createObjectURL(fileOrBlob);
  blobUrlCache.set(imageId, objectUrl);

  const meetingImage: MeetingImage = {
    id: imageId,
    sessionId,
    url: objectUrl,
    originalFilename,
    mimeType,
    fileSize: fileOrBlob.size,
    createdAt: Date.now(),
  };

  return meetingImage;
}

// Retrieve or restore Object URL for an image from IndexedDB
export async function getMeetingImageUrl(imageId: string): Promise<string | null> {
  if (blobUrlCache.has(imageId)) {
    return blobUrlCache.get(imageId)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IMAGES_STORE, 'readonly');
      const store = tx.objectStore(IMAGES_STORE);
      const req = store.get(imageId);

      req.onsuccess = () => {
        const record = req.result;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          blobUrlCache.set(imageId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Export / Download Options
export function downloadSessionAsMarkdown(session: MeetingSession): void {
  // Convert HTML to simple readable markdown
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = session.content;

  let md = `# ${session.title}\n\n`;
  if (session.description) {
    md += `*${session.description}*\n\n`;
  }
  md += `**Meeting Date:** ${new Date(session.date).toLocaleString()}\n`;
  md += `**Last Saved:** ${new Date(session.lastSavedAt).toLocaleString()}\n\n---\n\n`;

  // Basic HTML -> Markdown conversion
  let text = session.content
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<li data-checked="true"[^>]*>.*?<\/input>(.*?)<\/li>/gi, '- [x] $1\n')
    .replace(/<li data-checked="false"[^>]*>.*?<\/input>(.*?)<\/li>/gi, '- [ ] $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<hr\s*\/?>/gi, '\n---\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n\n')
    .replace(/<[^>]+>/g, '');

  md += text.trim();

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = session.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'meeting_notes';
  a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSessionAsHtml(session: MeetingSession): void {
  const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${session.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; line-height: 1.6; }
    h1, h2, h3 { color: #111827; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; color: #4b5563; font-style: italic; background: #f0f9ff; padding: 12px 16px; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin: 16px 0; }
    .task-list { list-style: none; padding-left: 0; }
    .task-list li { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #1e293b; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>${session.title}</h1>
  ${session.description ? `<p style="color: #6b7280; font-size: 1.1em;">${session.description}</p>` : ''}
  <p><small>Date: ${new Date(session.date).toLocaleString()} | Saved via Eraser Meeting Workspace</small></p>
  <hr/>
  ${session.content}
</body>
</html>`;

  const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = session.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'meeting_notes';
  a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadSessionAsJson(session: MeetingSession): void {
  const jsonStr = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = session.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'meeting_session';
  a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.meeting`;
  a.click();
  URL.revokeObjectURL(url);
}
