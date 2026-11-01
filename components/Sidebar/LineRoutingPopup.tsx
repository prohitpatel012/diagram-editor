import React from 'react';
import { LineRouting } from '@/types/canvas';
import { LINE_ROUTING_OPTIONS } from '@/lib/constants';

interface LineRoutingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  activeRouting: LineRouting;
  onSelectRouting: (routing: LineRouting) => void;
}

export const LineRoutingPopup: React.FC<LineRoutingPopupProps> = ({
  isOpen,
  onClose,
  activeRouting,
  onSelectRouting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-16 top-48 z-50 w-64 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-2.5 text-zinc-100 backdrop-blur-md">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-zinc-800 mb-2">
        <span className="text-xs font-semibold text-zinc-300">Line & Connector Types</span>
        <span className="text-[10px] text-zinc-500">Pick routing</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {LINE_ROUTING_OPTIONS.map((opt) => {
          const isSelected = activeRouting === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => {
                onSelectRouting(opt.value);
                onClose();
              }}
              className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'border-zinc-800 bg-zinc-800/40 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <div>
                <div className="text-xs font-medium flex items-center gap-1.5">
                  <span>{opt.label}</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{opt.description}</div>
              </div>
              <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0 text-blue-400">
                {opt.value === 'straight' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <line x1="4" y1="12" x2="20" y2="12" />
                  </svg>
                )}
                {opt.value === 'orthogonal' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 4 6 L 12 6 Q 14 6 14 8 L 14 16 Q 14 18 16 18 L 20 18" />
                  </svg>
                )}
                {opt.value === 'curved' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 4 6 C 14 6, 10 18, 20 18" />
                  </svg>
                )}
                {opt.value === 'stepped' && (
                  <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                    <path d="M 4 6 L 11 6 Q 13 6 13 8 L 13 14 Q 13 16 15 16 L 20 16" />
                    <circle cx="4" cy="6" r="1.5" fill="currentColor" />
                    <circle cx="13" cy="11" r="1.5" fill="currentColor" />
                    <circle cx="20" cy="16" r="1.5" fill="currentColor" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

