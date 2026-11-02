import React, { useMemo } from 'react';
import { ManualEntry, LevelFilter } from '../types';
import { 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Bookmark, 
  BookmarkCheck,
  Layers,
  X,
  Link as LinkIcon,
  Check
} from 'lucide-react';

interface SidebarTreeProps {
  entries: ManualEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  levelFilter: LevelFilter;
  onLevelFilterChange: (filter: LevelFilter) => void;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  expandedParents: Set<string>;
  onToggleExpand: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const SidebarTree: React.FC<SidebarTreeProps> = ({
  entries,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  levelFilter,
  onLevelFilterChange,
  bookmarks,
  onToggleBookmark,
  expandedParents,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Group entries by parent
  const { filteredEntries, counts } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    
    const matchesQuery = (e: ManualEntry) => {
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.chapterName.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.tags.some(t => t.toLowerCase().includes(q)) ||
        (e.keyAccounts && e.keyAccounts.some(a => a.toLowerCase().includes(q))) ||
        (e.regulations && e.regulations.some(r => r.toLowerCase().includes(q)))
      );
    };

    const matchesLevel = (e: ManualEntry) => {
      if (levelFilter === 'all') return true;
      if (levelFilter === 'bookmarked') return bookmarks.includes(e.id);
      return e.level === levelFilter;
    };

    const filtered = entries.filter(e => matchesQuery(e) && matchesLevel(e));

    const totalLevel1 = entries.filter(e => e.level === 1).length;
    const totalLevel2 = entries.filter(e => e.level === 2).length;
    const totalLevel3 = entries.filter(e => e.level === 3).length;

    return {
      filteredEntries: filtered,
      counts: {
        all: entries.length,
        level1: totalLevel1,
        level2: totalLevel2,
        level3: totalLevel3,
        bookmarked: bookmarks.length,
      }
    };
  }, [entries, searchQuery, levelFilter, bookmarks]);

  const handleCopyLink = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Check if an item has children in the full dataset
  const hasChildren = (id: string) => {
    return entries.some(e => e.parentId === id);
  };

  return (
    <aside className="w-80 md:w-96 flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shrink-0">
      {/* Search Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Caută în manual (titlu, cont, SAF-T, e-Factura)..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Level Filters (Functional Tabs) */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 rounded-lg text-[11px] overflow-x-auto">
          <button
            onClick={() => onLevelFilterChange('all')}
            className={`px-2.5 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Toate ({counts.all})
          </button>
          <button
            onClick={() => onLevelFilterChange(1)}
            className={`px-2 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 1
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Capitole ({counts.level1})
          </button>
          <button
            onClick={() => onLevelFilterChange(2)}
            className={`px-2 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 2
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Subcap. ({counts.level2})
          </button>
          <button
            onClick={() => onLevelFilterChange(3)}
            className={`px-2 py-1 font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              levelFilter === 3
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Secțiuni ({counts.level3})
          </button>
          {counts.bookmarked > 0 && (
            <button
              onClick={() => onLevelFilterChange('bookmarked')}
              className={`px-2 py-1 font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                levelFilter === 'bookmarked'
                  ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:text-amber-900'
              }`}
            >
              <Bookmark className="w-3 h-3 fill-current" />
              <span>({counts.bookmarked})</span>
            </button>
          )}
        </div>

        {/* Tree controls & Metadata banner */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 px-0.5">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {filteredEntries.length === entries.length
                ? '11 capitole · 98 intrări · 3 niveluri'
                : `${filteredEntries.length} rezultate găsite`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExpandAll}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              Extinde
            </button>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <button
              onClick={onCollapseAll}
              className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              Restrânge
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Nu a fost găsită nicio intrare pentru filtrul aplicat.
            <div className="mt-2">
              <button
                onClick={() => {
                  onSearchChange('');
                  onLevelFilterChange('all');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Resetează filtrele
              </button>
            </div>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isSelected = entry.id === selectedId;
            const isBookmarked = bookmarks.includes(entry.id);
            const isParent = hasChildren(entry.id);
            const isExpanded = expandedParents.has(entry.id);

            // Indentation and marker by level
            let indentClass = 'pl-2';
            if (entry.level === 2) indentClass = 'pl-6';
            if (entry.level === 3) indentClass = 'pl-10';

            return (
              <div
                key={entry.id}
                className={`group relative flex items-center justify-between rounded-md py-1.5 pr-2 transition-colors cursor-pointer ${indentClass} ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
                onClick={() => onSelect(entry.id)}
              >
                {/* Left side: Expander / Marker + Title */}
                <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                  {/* Expander button or bullet */}
                  {isParent ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(entry.id);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-transform"
                      title={isExpanded ? 'Restrânge ramura' : 'Extinde ramura'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : entry.level === 3 ? (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-[9px] text-slate-400 select-none">
                      ◦
                    </span>
                  ) : entry.level === 2 ? (
                    <span className="w-3.5 h-3.5 flex items-center justify-center text-xs text-slate-400 select-none">
                      •
                    </span>
                  ) : (
                    <span className="w-3.5 h-3.5 flex items-center justify-center font-mono text-[10px] text-slate-400">
                      §
                    </span>
                  )}

                  {/* Hierarchical Code Badge */}
                  <span className={`text-[10px] font-mono tabular-nums shrink-0 ${
                    entry.level === 1 
                      ? 'font-bold text-slate-900 dark:text-slate-100' 
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {entry.code}
                  </span>

                  {/* Title */}
                  <span className={`truncate text-xs ${
                    entry.level === 1 
                      ? 'font-bold text-slate-900 dark:text-slate-100' 
                      : entry.level === 2
                      ? 'font-medium'
                      : 'font-normal'
                  }`}>
                    {entry.title}
                  </span>
                </div>

                {/* Right side: Actions (Bookmark + Copy link) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleCopyLink(e, entry.id)}
                    title="Copiază link direct către această secțiune"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <LinkIcon className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleBookmark(entry.id);
                    }}
                    title={isBookmarked ? 'Elimină din salvate' : 'Salvează la favorite'}
                    className={`p-1 rounded ${
                      isBookmarked
                        ? 'text-amber-600 dark:text-amber-400 opacity-100'
                        : 'text-slate-400 hover:text-amber-600'
                    }`}
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Sursă: Manualul oficial SAGA C</span>
        <span>Verificat 02.11.2026</span>
      </div>
    </aside>
  );
};
