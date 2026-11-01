import React, { useState } from 'react';
import { ERDiagram, ERTable, ERRelationship } from '@/types/er';
import { exportERDiagramToSQL, parseSQLToERDiagram } from '@/lib/er-sql';
import { ER_TEMPLATES } from '@/lib/er-templates';
import {
  LuCopy,
  LuDownload,
  LuCheck,
  LuFileCode,
  LuUpload,
  LuSparkles,
  LuX,
  LuCircleAlert,
} from 'react-icons/lu';

interface ERSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagram: ERDiagram;
  onImportDiagram: (imported: { tables: ERTable[]; relationships: ERRelationship[]; name?: string }) => void;
  onSelectTemplate: (templateId: string) => void;
  initialTab?: 'export' | 'import' | 'templates';
}

export const ERSqlModal: React.FC<ERSqlModalProps> = ({
  isOpen,
  onClose,
  diagram,
  onImportDiagram,
  onSelectTemplate,
  initialTab = 'export',
}) => {
  const [tab, setTab] = useState<'export' | 'import' | 'templates'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [sqlInput, setSqlInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generatedSQL = exportERDiagramToSQL(diagram);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(diagram.name || 'schema').replace(/\s+/g, '_').toLowerCase()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    if (!sqlInput.trim()) {
      setImportError('Please paste SQL DDL statements (e.g. CREATE TABLE...)');
      return;
    }

    try {
      const parsed = parseSQLToERDiagram(sqlInput);
      if (parsed.tables.length === 0) {
        setImportError(
          'No CREATE TABLE statements found. Make sure your SQL contains standard "CREATE TABLE table_name (...);"'
        );
        return;
      }
      onImportDiagram(parsed);
      onClose();
    } catch (err: any) {
      setImportError(err?.message || 'Failed to parse SQL. Please verify syntax.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-100 max-h-[90vh]">
        {/* Header with Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTab('export');
                setImportError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'export'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <LuFileCode size={14} /> Export SQL DDL
            </button>
            <button
              onClick={() => {
                setTab('import');
                setImportError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'import'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <LuUpload size={14} /> Import SQL Schema
            </button>
            <button
              onClick={() => {
                setTab('templates');
                setImportError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                tab === 'templates'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <LuSparkles size={14} /> Templates
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Tab 1: Export SQL */}
        {tab === 'export' && (
          <div className="p-6 flex flex-col flex-1 overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white">PostgreSQL DDL Script</h4>
                <p className="text-xs text-zinc-400">
                  Ready to run in psql, Supabase, Neon, or pgAdmin
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <LuCheck size={14} className="text-emerald-400" /> : <LuCopy size={14} />}
                  {copied ? 'Copied!' : 'Copy SQL'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <LuDownload size={14} /> Download .sql
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
              <pre className="p-4 font-mono text-xs text-emerald-300/90 overflow-auto h-[380px] leading-relaxed selection:bg-blue-500 selection:text-white">
                {generatedSQL}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Import SQL */}
        {tab === 'import' && (
          <div className="p-6 flex flex-col flex-1 overflow-hidden space-y-4">
            <div>
              <h4 className="font-bold text-sm text-white">Import from SQL DDL</h4>
              <p className="text-xs text-zinc-400">
                Paste any standard PostgreSQL `CREATE TABLE ...` script to generate an ER diagram instantly!
              </p>
            </div>

            {importError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300">
                <LuCircleAlert size={16} className="text-red-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex-1">
              <textarea
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                placeholder={`CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  total_cents INTEGER NOT NULL
);`}
                className="w-full h-[320px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() =>
                  setSqlInput(`CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(120)
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL
);`)
                }
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Insert sample SQL
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
                >
                  Generate ER Diagram
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Starter Templates */}
        {tab === 'templates' && (
          <div className="p-6 space-y-4">
            <div>
              <h4 className="font-bold text-sm text-white">Schema Starter Templates</h4>
              <p className="text-xs text-zinc-400">
                Choose a pre-designed database schema to populate your canvas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {ER_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    onSelectTemplate(tmpl.id);
                    onClose();
                  }}
                  className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/60 hover:border-blue-500/60 cursor-pointer transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-white group-hover:text-blue-400 transition-colors">
                        {tmpl.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono">
                        {tmpl.tablesCount} tables
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2">{tmpl.description}</p>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-blue-400 font-medium">
                    <span>Load Schema</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
