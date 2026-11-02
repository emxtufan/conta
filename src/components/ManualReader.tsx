import React, { useState } from 'react';
import { ManualEntry } from '../types';
import { 
  ExternalLink, 
  Link as LinkIcon, 
  Check, 
  Bookmark, 
  BookmarkCheck, 
  Keyboard, 
  BookOpen, 
  AlertCircle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  ShieldCheck,
  Tag,
  FileEdit,
  Save,
  Share2
} from 'lucide-react';

interface ManualReaderProps {
  entry: ManualEntry;
  allEntries: ManualEntry[];
  onSelectEntry: (id: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  userNote: string;
  onSaveNote: (entryId: string, note: string) => void;
}

export const ManualReader: React.FC<ManualReaderProps> = ({
  entry,
  allEntries,
  onSelectEntry,
  isBookmarked,
  onToggleBookmark,
  userNote,
  onSaveNote,
}) => {
  const [copied, setCopied] = useState(false);
  const [noteText, setNoteText] = useState(userNote);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteSavedFeedback, setNoteSavedFeedback] = useState(false);

  // Sync noteText when entry changes
  React.useEffect(() => {
    setNoteText(userNote);
    setIsEditingNote(false);
  }, [entry.id, userNote]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}#${entry.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNote = () => {
    onSaveNote(entry.id, noteText);
    setIsEditingNote(false);
    setNoteSavedFeedback(true);
    setTimeout(() => setNoteSavedFeedback(false), 2000);
  };

  // Find currentIndex and prev/next
  const currentIndex = allEntries.findIndex(e => e.id === entry.id);
  const prevEntry = currentIndex > 0 ? allEntries[currentIndex - 1] : null;
  const nextEntry = currentIndex < allEntries.length - 1 ? allEntries[currentIndex + 1] : null;

  // Breadcrumbs chain
  const breadcrumbs: ManualEntry[] = [];
  let curr: ManualEntry | undefined = entry;
  while (curr) {
    breadcrumbs.unshift(curr);
    curr = allEntries.find(e => e.id === curr?.parentId);
  }

  // Children entries
  const childEntries = allEntries.filter(e => e.parentId === entry.id);

  return (
    <article className="flex-1 flex flex-col h-full overflow-y-auto bg-white dark:bg-slate-900 transition-colors">
      {/* Top Header & Breadcrumb Bar */}
      <div className="sticky top-0 z-10 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-between gap-4">
        {/* Breadcrumb path */}
        <nav aria-label="Cale de navigare" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto">
          <span>Manual SAGA C</span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
          {breadcrumbs.map((b, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={b.id}>
                {isLast ? (
                  <span className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {b.title}
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectEntry(b.id)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      {b.title}
                    </button>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">/</span>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Action icons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
            title="Copiază link direct"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Link copiat</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Distribuie</span>
              </>
            )}
          </button>

          <button
            onClick={() => onToggleBookmark(entry.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              isBookmarked
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {isBookmarked ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                <span>Salvat</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Salvează</span>
              </>
            )}
          </button>

          <a
            href={entry.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer shadow-xs"
            title="Deschide în manualul oficial sagasoft.ro"
          >
            <span>Deschide oficial</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-4xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Title & Metadata Strip */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
              Secțiunea {entry.code}
            </span>
            <span aria-hidden="true">·</span>
            <span>{entry.chapterName}</span>
            <span aria-hidden="true">·</span>
            <span>Nivel {entry.level} ({entry.level === 1 ? 'Capitol principal' : entry.level === 2 ? 'Subcapitol' : 'Secțiune detaliată'})</span>
            <span aria-hidden="true">·</span>
            <span>Verificat 2 noiembrie 2026</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {entry.title}
          </h1>

          <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300 font-normal">
            {entry.summary}
          </p>
        </div>

        {/* Quick Reference Chips: Shortcuts & Accounts & Regulations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Shortcuts Box */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Keyboard className="w-4 h-4 text-blue-600" />
              <span>Taste Rapide în SAGA C</span>
            </div>
            {entry.shortcuts && entry.shortcuts.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {entry.shortcuts.map((sc, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="font-mono text-[11px]">{sc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                F1 pentru ajutor contextual · F2 Adăugare
              </p>
            )}
          </div>

          {/* Key Accounts Box */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Conturi Contabile Implicate</span>
            </div>
            {entry.keyAccounts && entry.keyAccounts.length > 0 ? (
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {entry.keyAccounts.map((acc, i) => (
                  <div key={i} className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                    {acc}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Conform planului de conturi OMFP 1802
              </p>
            )}
          </div>

          {/* Regulations Box */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Cadru Legal & Conformitate</span>
            </div>
            {entry.regulations && entry.regulations.length > 0 ? (
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                {entry.regulations.map((reg, i) => (
                  <li key={i} className="line-clamp-2" title={reg}>
                    {reg}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Legea contabilității nr. 82/1991
              </p>
            )}
          </div>
        </div>

        {/* Detailed Operational Guidance */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span>Descriere & Procedură de Lucru</span>
          </h2>
          <div className="prose dark:prose-invert max-w-none text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {entry.content}
          </div>
        </section>

        {/* Step-by-Step Operating Instructions */}
        {entry.keySteps && entry.keySteps.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pași de operare recomandați în program
            </h2>
            <ol className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
              {entry.keySteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Practical Tips & Warnings */}
        {entry.practicalTips && entry.practicalTips.length > 0 && (
          <section className="p-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Atenționări & Recomandări din Practică</span>
            </div>
            <ul className="space-y-1.5 text-xs text-amber-900/90 dark:text-amber-300 leading-relaxed">
              {entry.practicalTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-600 select-none">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Child Sub-sections list if present */}
        {childEntries.length > 0 && (
          <section className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Subcapitole și secțiuni incluse ({childEntries.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {childEntries.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectEntry(c.id)}
                  className="p-3 text-left rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {c.code}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                    {c.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                    {c.summary}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Personal Notes for this Screen */}
        <section className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
              <FileEdit className="w-4 h-4 text-blue-600" />
              <span>Notițe Interne Cabinet / Firmă</span>
            </div>
            {noteSavedFeedback && (
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Salvat!
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Puteți nota aici convențiile contabile specifice entității dvs. (ex: analitice folosite, persoană responsabilă, reguli de validare). Se salvează automat pe acest calculator.
          </p>

          <textarea
            value={noteText}
            onChange={(e) => {
              setNoteText(e.target.value);
              setIsEditingNote(true);
            }}
            placeholder="Introduceți observații sau instrucțiuni interne pentru acest ecran SAGA C..."
            rows={3}
            className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
          />

          {isEditingNote && (
            <div className="flex justify-end">
              <button
                onClick={handleSaveNote}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvează notița</span>
              </button>
            </div>
          )}
        </section>

        {/* Prev / Next Navigation Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
          {prevEntry ? (
            <button
              onClick={() => onSelectEntry(prevEntry.id)}
              className="flex items-center gap-2 text-left group hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
              <div>
                <span className="text-[11px] text-slate-400 block leading-none">Anteriorul</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {prevEntry.code} {prevEntry.title}
                </span>
              </div>
            </button>
          ) : (
            <div />
          )}

          {nextEntry && (
            <button
              onClick={() => onSelectEntry(nextEntry.id)}
              className="flex items-center gap-2 text-right group hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <div>
                <span className="text-[11px] text-slate-400 block leading-none">Următorul</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                  {nextEntry.code} {nextEntry.title}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
