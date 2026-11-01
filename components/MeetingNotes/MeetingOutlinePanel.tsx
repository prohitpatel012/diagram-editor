import React, { useMemo } from 'react';
import { MeetingSession, MeetingTocItem } from '@/types/meeting';
import {
  downloadSessionAsMarkdown,
  downloadSessionAsHtml,
  downloadSessionAsJson,
} from '@/lib/meeting-storage';
import {
  LuListTree,
  LuDownload,
  LuFileText,
  LuFileCode,
  LuPrinter,
  LuImage,
  LuCalendar,
  LuClock,
  LuShieldCheck,
  LuChevronRight,
} from 'react-icons/lu';

interface MeetingOutlinePanelProps {
  session: MeetingSession;
  onUpdateSession: (updates: Partial<MeetingSession>) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const MeetingOutlinePanel: React.FC<MeetingOutlinePanelProps> = ({
  session,
  onUpdateSession,
  isCollapsed,
  onToggleCollapse,
}) => {
  // Extract Table of Contents from HTML
  const tocItems = useMemo<MeetingTocItem[]>(() => {
    if (typeof window === 'undefined' || !session.content) return [];

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = session.content;
    const headings = tempDiv.querySelectorAll('h1, h2, h3');
    const items: MeetingTocItem[] = [];

    headings.forEach((h, idx) => {
      const text = h.textContent?.trim();
      if (!text) return;
      const level = parseInt(h.tagName.substring(1), 10) || 2;
      items.push({
        id: `heading_${idx}`,
        text,
        level,
      });
    });

    return items;
  }, [session.content]);

  // Jump to heading in editor
  const handleScrollToHeading = (text: string) => {
    const editor = document.querySelector('[contenteditable="true"]');
    if (!editor) return;

    const headings = editor.querySelectorAll('h1, h2, h3');
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].textContent?.trim() === text) {
        headings[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        (headings[i] as HTMLElement).classList.add('bg-blue-500/20', 'transition-all');
        setTimeout(() => {
          (headings[i] as HTMLElement).classList.remove('bg-blue-500/20');
        }, 1200);
        break;
      }
    }
  };

  const remainingDays = useMemo(() => {
    const diff = session.expiresAt - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return `${days} days ${hours} hours left`;
  }, [session.expiresAt]);

  if (isCollapsed) {
    return (
      <aside className="w-12 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col items-center py-4 select-none shrink-0">
        <button
          onClick={onToggleCollapse}
          title="Open Outline & Downloads"
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LuListTree size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 sm:w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col select-none shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LuListTree size={16} className="text-blue-400" />
          <h3 className="font-semibold text-white text-xs uppercase tracking-wider">
            Table of Contents &amp; Info
          </h3>
        </div>
        <button
          onClick={onToggleCollapse}
          title="Collapse Panel"
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <LuChevronRight size={16} />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1">
        {/* Table of Contents Section */}
        <div>
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Document Outline
          </span>
          {tocItems.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">
              Add H1, H2, or H3 headings in your notes to generate an outline automatically.
            </p>
          ) : (
            <div className="space-y-1">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleScrollToHeading(item.text)}
                  style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
                  className="w-full text-left py-1 pr-2 rounded-lg text-xs text-zinc-400 hover:text-blue-400 hover:bg-zinc-800/60 truncate transition-colors flex items-center gap-1.5"
                >
                  <span className="text-zinc-600 text-[10px]">•</span>
                  <span className="truncate">{item.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Meeting Metadata */}
        <div className="space-y-3 pt-3 border-t border-zinc-800 text-xs">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Meeting Details
          </span>

          {/* Date */}
          <div className="flex items-center justify-between text-zinc-300 bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400">
              <LuCalendar size={14} className="text-blue-400" />
              <span>Date</span>
            </div>
            <span className="font-medium text-white">
              {new Date(session.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* Screenshots Gallery Counter */}
          <div className="flex items-center justify-between text-zinc-300 bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400">
              <LuImage size={14} className="text-indigo-400" />
              <span>Screenshots</span>
            </div>
            <span className="font-semibold text-indigo-300 font-mono">
              {session.images ? session.images.length : 0} embedded
            </span>
          </div>

          {/* 7-Day Retention Status */}
          <div className="bg-emerald-950/30 border border-emerald-800/50 p-2.5 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <LuShieldCheck size={14} />
              <span>7-Day Session Active</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {remainingDays}. Your notes and pasted screenshots are kept safe in your browser without requiring external databases.
            </p>
          </div>
        </div>

        {/* Download Options */}
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
            Download &amp; Export
          </span>

          {/* Markdown Download */}
          <button
            onClick={() => downloadSessionAsMarkdown(session)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LuFileText size={15} className="text-blue-400" />
              <span>Download Markdown</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">.md</span>
          </button>

          {/* HTML Download */}
          <button
            onClick={() => downloadSessionAsHtml(session)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LuFileCode size={15} className="text-amber-400" />
              <span>Download HTML</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">.html</span>
          </button>

          {/* JSON Backup Download */}
          <button
            onClick={() => downloadSessionAsJson(session)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LuDownload size={15} className="text-emerald-400" />
              <span>Backup Session</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">.meeting</span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LuPrinter size={15} className="text-purple-400" />
              <span>Print to PDF</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">Ctrl+P</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

