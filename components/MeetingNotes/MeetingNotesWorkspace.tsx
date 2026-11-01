import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MeetingSession, AutosaveState, MeetingImage } from '@/types/meeting';
import {
  getAllMeetingSessions,
  saveMeetingSession,
  createNewMeetingSession,
  deleteMeetingSession,
} from '@/lib/meeting-storage';
import { MeetingSidebar } from './MeetingSidebar';
import { RichTextEditor } from './RichTextEditor';
import { MeetingOutlinePanel } from './MeetingOutlinePanel';
import {
  LuCheck,
  LuClock,
  LuCalendar,
  LuDownload,
  LuFileText,
  LuFileCode,
  LuShieldCheck,
  LuTriangleAlert,
} from 'react-icons/lu';

export const MeetingNotesWorkspace: React.FC = () => {
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [activeSession, setActiveSession] = useState<MeetingSession | null>(null);

  // Autosave status
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sidebar collapse states
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const isInitialLoadRef = useRef(false);

  // 1. Initial Load of Sessions
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    isInitialLoadRef.current = true;

    getAllMeetingSessions().then((list) => {
      setSessions(list);
      if (list.length > 0) {
        setActiveSessionId(list[0].id);
        setActiveSession(list[0]);
      }
    });
  }, []);

  // Update active session when activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) return;
    const found = sessions.find((s) => s.id === activeSessionId);
    if (found) {
      setActiveSession(found);
    }
  }, [activeSessionId, sessions]);

  // 2. Debounced Autosave
  const scheduleAutosave = useCallback((updated: MeetingSession) => {
    setAutosaveState('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await saveMeetingSession(updated);
        setAutosaveState('saved');
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.error('Autosave error:', err);
        setAutosaveState('error');
      }
    }, 600);
  }, []);

  // Handle content change in rich-text editor
  const handleContentChange = useCallback(
    (newHtml: string) => {
      if (!activeSession) return;

      const updated: MeetingSession = {
        ...activeSession,
        content: newHtml,
        updatedAt: Date.now(),
        lastSavedAt: Date.now(),
      };

      setActiveSession(updated);
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      scheduleAutosave(updated);
    },
    [activeSession, scheduleAutosave]
  );

  // Handle title change
  const handleTitleChange = (newTitle: string) => {
    if (!activeSession) return;
    const updated = { ...activeSession, title: newTitle, updatedAt: Date.now() };
    setActiveSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    scheduleAutosave(updated);
  };

  // Handle description change
  const handleDescriptionChange = (newDesc: string) => {
    if (!activeSession) return;
    const updated = { ...activeSession, description: newDesc, updatedAt: Date.now() };
    setActiveSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    scheduleAutosave(updated);
  };

  // Handle image added to note
  const handleImageAdded = (image: MeetingImage) => {
    if (!activeSession) return;
    const updated = {
      ...activeSession,
      images: [...(activeSession.images || []), image],
      updatedAt: Date.now(),
    };
    setActiveSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    scheduleAutosave(updated);
  };

  // Create new session
  const handleCreateSession = async () => {
    const newSession = await createNewMeetingSession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveSession(newSession);
  };

  // Delete session
  const handleDeleteSession = async (id: string) => {
    await deleteMeetingSession(id);
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSessionId === id) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        setActiveSession(remaining[0]);
      } else {
        // If all deleted, create fresh one
        const fresh = await createNewMeetingSession();
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
        setActiveSession(fresh);
      }
    }
  };

  // Rename session
  const handleRenameSession = async (id: string, newTitle: string) => {
    const found = sessions.find((s) => s.id === id);
    if (!found) return;
    const updated = { ...found, title: newTitle, updatedAt: Date.now() };
    await saveMeetingSession(updated);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
    if (activeSessionId === id) {
      setActiveSession(updated);
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-3.25rem)] overflow-hidden bg-zinc-950 font-sans select-none">
      {/* Left Sidebar */}
      <MeetingSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onCreateSession={handleCreateSession}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        isCollapsed={isLeftSidebarCollapsed}
        onToggleCollapse={() => setIsLeftSidebarCollapsed((v) => !v)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        {activeSession ? (
          <>
            {/* Session Header / Title & Status Bar */}
            <div className="px-8 pt-5 pb-3 border-b border-zinc-800 bg-zinc-950 flex flex-col gap-2 shrink-0">
              <div className="flex items-center justify-between gap-4">
                {/* Editable Meeting Title */}
                <input
                  type="text"
                  value={activeSession.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Meeting Title..."
                  className="w-full text-xl sm:text-2xl font-bold text-white bg-transparent outline-none focus:ring-0 placeholder-zinc-600 transition-colors"
                />

                {/* Live Autosave Indicator */}
                <div className="flex items-center gap-2 text-xs shrink-0 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg shadow-sm">
                  {autosaveState === 'saving' ? (
                    <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Saving...</span>
                    </span>
                  ) : autosaveState === 'saved' ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <LuCheck size={13} />
                      <span>Saved ({lastSavedTime})</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-400 font-medium">
                      <LuTriangleAlert size={13} />
                      <span>Save pending</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Description & Date meta */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <input
                  type="text"
                  value={activeSession.description || ''}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Add meeting description, attendees, or context..."
                  className="flex-1 bg-transparent text-xs text-zinc-400 placeholder-zinc-600 outline-none"
                />

                <div className="flex items-center gap-3 shrink-0 text-[11px] text-zinc-500 font-mono">
                  <span className="flex items-center gap-1">
                    <LuCalendar size={12} className="text-zinc-400" />
                    <span>{new Date(activeSession.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-500">
                    <LuShieldCheck size={12} />
                    <span>7-day safe session</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Rich-Text Writing Canvas */}
            <div className="flex-1 h-full overflow-hidden">
              <RichTextEditor
                key={activeSession.id}
                sessionId={activeSession.id}
                initialContent={activeSession.content}
                onChange={handleContentChange}
                onImageAdded={handleImageAdded}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
            <p>No meeting session selected.</p>
            <button
              onClick={handleCreateSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Create New Session
            </button>
          </div>
        )}
      </main>

      {/* Right Outline & Info Panel */}
      {activeSession && (
        <MeetingOutlinePanel
          session={activeSession}
          onUpdateSession={(updates) => {
            const updated = { ...activeSession, ...updates, updatedAt: Date.now() };
            setActiveSession(updated);
            setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            scheduleAutosave(updated);
          }}
          isCollapsed={isRightSidebarCollapsed}
          onToggleCollapse={() => setIsRightSidebarCollapsed((v) => !v)}
        />
      )}
    </div>
  );
};
