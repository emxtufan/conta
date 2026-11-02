import React from 'react';
import { ExternalLink, Keyboard, BookOpen, Printer, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onOpenShortcuts: () => void;
  onOpenMonografii: () => void;
  onOpenPrint: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenShortcuts,
  onOpenMonografii,
  onOpenPrint,
  darkMode,
  onToggleDarkMode,
  onResetView,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shrink-0">
      {/* Zone 1: Brand wordmark */}
      <button
        onClick={onResetView}
        className="text-left group flex items-center gap-2.5 whitespace-nowrap shrink-0 focus:outline-none"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
          SC
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 block leading-tight">
            Manual SAGA C
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-none">
            Cuprins Oficial · 98 Intrări
          </span>
        </div>
      </button>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
        <button
          onClick={onResetView}
          className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 text-left cursor-pointer"
        >
          Cuprins General
        </button>
        <button
          onClick={onOpenShortcuts}
          className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Keyboard className="w-4 h-4 text-slate-400" />
          <span>Taste Rapide</span>
        </button>
        <button
          onClick={onOpenMonografii}
          className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>Monografii Uzuale</span>
        </button>
        <button
          onClick={onOpenPrint}
          className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-400" />
          <span>Index Listare</span>
        </button>
      </nav>

      {/* Zone 3: Actions + Theme switch */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Comută pe modul luminos' : 'Comută pe modul întunecat'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Schimbă tema"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <a
          href="https://manual.sagasoft.ro/sagac/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <span>manual.sagasoft.ro</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
};
