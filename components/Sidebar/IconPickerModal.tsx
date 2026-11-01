import React, { useState, useMemo } from 'react';
import { ICON_CATEGORIES, searchIcons, getIconComponent } from '@/lib/icons-catalog';
import { LuSearch, LuX } from 'react-icons/lu';

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string) => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectIcon,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredIcons = useMemo(() => {
    if (search.trim()) {
      return searchIcons(search);
    }
    if (selectedCategory === 'all') {
      const all: string[] = [];
      ICON_CATEGORIES.forEach((c) => all.push(...c.icons));
      return Array.from(new Set(all));
    }
    const cat = ICON_CATEGORIES.find((c) => c.id === selectedCategory);
    return cat ? cat.icons : [];
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/90">
          <div>
            <h3 className="text-base font-semibold text-white">React Icons Library</h3>
            <p className="text-xs text-zinc-400">
              Select an icon to add to the canvas. Scalable from 2px to 500px+.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuX size={18} />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-900/50">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search thousands of React Icons (e.g. server, cloud, user, database)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700/60 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {!search && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                All Icons
              </button>
              {ICON_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white font-medium'
                      : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredIcons.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No icons found matching &quot;{search}&quot;. Try another term.
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {filteredIcons.map((iconName) => {
                const IconComponent = getIconComponent(iconName);
                const displayName = iconName.replace(/^(Lu|Fa)/, '');
                return (
                  <button
                    key={iconName}
                    onClick={() => {
                      onSelectIcon(iconName);
                      onClose();
                    }}
                    className="group flex flex-col items-center justify-center p-3 rounded-lg border border-zinc-800/80 bg-zinc-800/30 hover:bg-zinc-800 hover:border-blue-500/50 hover:scale-105 transition-all text-zinc-300 hover:text-white"
                    title={iconName}
                  >
                    <div className="text-zinc-200 group-hover:text-blue-400 transition-colors">
                      <IconComponent size={24} />
                    </div>
                    <span className="mt-1.5 text-[10px] truncate max-w-full text-zinc-400 group-hover:text-zinc-200">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 border-t border-zinc-800 bg-zinc-950/60 text-xs text-zinc-500 flex justify-between items-center">
          <span>Showing {filteredIcons.length} icons</span>
          <span className="text-zinc-400">Resizable on canvas from 2px to 500px+</span>
        </div>
      </div>
    </div>
  );
};

