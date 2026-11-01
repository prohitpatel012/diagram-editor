import React, { useState } from 'react';
import { ValidationIssue } from '@/types/er';
import { LuCircleCheck, LuTriangleAlert, LuCircleAlert, LuChevronDown, LuChevronUp } from 'react-icons/lu';

interface ERValidationBannerProps {
  issues: ValidationIssue[];
  onSelectTable?: (tableId: string) => void;
  onSelectRelationship?: (relId: string) => void;
}

export const ERValidationBanner: React.FC<ERValidationBannerProps> = ({
  issues,
  onSelectTable,
  onSelectRelationship,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
        <LuCircleCheck size={14} />
        <span>Schema Valid</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
          errors.length > 0
            ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
        }`}
      >
        {errors.length > 0 ? <LuCircleAlert size={14} /> : <LuTriangleAlert size={14} />}
        <span>
          {errors.length > 0
            ? `${errors.length} Error${errors.length > 1 ? 's' : ''}`
            : `${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`}
        </span>
        {isExpanded ? <LuChevronUp size={12} /> : <LuChevronDown size={12} />}
      </button>

      {/* Expanded issues dropdown */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-3 z-50 text-xs text-zinc-200 backdrop-blur-md max-h-72 overflow-auto divide-y divide-zinc-800">
          <div className="pb-2 font-bold text-white flex items-center justify-between">
            <span>Schema Diagnostics</span>
            <span className="text-[10px] text-zinc-500">{issues.length} item(s)</span>
          </div>

          <div className="pt-2 space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  if (issue.tableId) onSelectTable?.(issue.tableId);
                  if (issue.relationshipId) onSelectRelationship?.(issue.relationshipId);
                  setIsExpanded(false);
                }}
                className="p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800 cursor-pointer transition-colors border border-zinc-800/80"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {issue.severity === 'error' ? (
                    <LuCircleAlert size={13} className="text-red-400 shrink-0" />
                  ) : (
                    <LuTriangleAlert size={13} className="text-amber-400 shrink-0" />
                  )}
                  <span className={issue.severity === 'error' ? 'text-red-300' : 'text-amber-300'}>
                    {issue.title}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
