import React, { useState } from 'react';
import { MeetingSession } from '@/types/meeting';
import {
  LuPlus,
  LuSearch,
  LuCalendar,
  LuTrash2,
  LuPencil,
  LuClock,
  LuImage,
  LuFileText,
  LuChevronLeft,
  LuChevronRight,
  LuTriangleAlert,
  LuDownload,
} from 'react-icons/lu';

interface MeetingSidebarProps {
  sessions: MeetingSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<MeetingSession | null>(null);

  // Filter sessions by search query
  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query)) ||
      s.content.toLowerCase().includes(query)
    );
  });

  const handleStartRename = (e: React.MouseEvent, session: MeetingSession) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleConfirmRename = () => {
    if (editingSessionId && editingTitle.trim()) {
      onRenameSession(editingSessionId, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const calculateRemainingDays = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return '0d left';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return `${days}d ${hours}h left`;
  };

  if (isCollapsed) {
    return (
      <aside className="w-14 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 select-none shrink-0 transition-all">
        <button
          onClick={onToggleCollapse}
          title="Expand Meeting Sidebar"
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors mb-4"
        >
          <LuChevronRight size={18} />
        </button>
        <button
          onClick={onCreateSession}
          title="New Meeting Session"
          className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all"
        >
          <LuPlus size={20} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 sm:w-80 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col select-none shrink-0 transition-all">
      {/* Header & New Meeting Button */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              <LuFileText size={16} />
            </div>
            <div>
              <h2 className="font-semibold text-white text-sm">Meeting Sessions</h2>
              <span className="text-[10px] text-zinc-400">7-Day Rolling Retention</span>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuChevronLeft size={16} />
          </button>
        </div>

        {/* New Meeting CTA */}
        <button
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
        >
          <LuPlus size={16} />
          <span>New Meeting Session</span>
        </button>

        {/* Search Bar */}
        <div className="relative">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings, notes, dates..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-10 px-4 text-zinc-500 text-xs">
            No meeting sessions found matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isEditing = editingSessionId === session.id;
            const remaining = calculateRemainingDays(session.expiresAt);

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group relative p-3 rounded-xl transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600/10 border-blue-500/40 text-white shadow-md'
                    : 'bg-zinc-800/30 border-transparent hover:bg-zinc-800/70 hover:border-zinc-700/60 text-zinc-300'
                }`}
              >
                {/* Title & Actions */}
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={handleConfirmRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmRename();
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="bg-zinc-800 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-white font-medium outline-none w-full"
                    />
                  ) : (
                    <h3 className="text-xs font-semibold truncate leading-snug">
                      {session.title}
                    </h3>
                  )}

                  {/* Actions on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(e, session)}
                      title="Rename"
                      className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-700/60"
                    >
                      <LuPencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(session);
                      }}
                      title="Delete Session"
                      className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <LuTrash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Date & Metadata */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <LuCalendar size={12} className="text-zinc-500" />
                    <span>{new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Screenshots count */}
                    {session.images && session.images.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-medium">
                        <LuImage size={11} />
                        <span>{session.images.length}</span>
                      </span>
                    )}

                    {/* 7-day retention countdown */}
                    <span
                      title="Session retained for 7 days from last active update"
                      className="flex items-center gap-1 text-[10px] font-mono text-emerald-400"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{remaining}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
        <span>{sessions.length} sessions saved</span>
        <span className="flex items-center gap-1 text-zinc-400">
          <LuClock size={12} />
          <span>Auto-saving</span>
        </span>
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-9 h-9 rounded-full bg-red-400/10 flex items-center justify-center">
                <LuTriangleAlert size={18} />
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm">Delete Meeting Session?</h4>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 bg-zinc-800/40 border border-zinc-800 p-2.5 rounded-lg">
              Are you sure you want to delete <strong className="text-white">&quot;{sessionToDelete.title}&quot;</strong>? All notes and pasted screenshots inside this session will be removed.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSession(sessionToDelete.id);
                  setSessionToDelete(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
              >
                Delete Session
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

