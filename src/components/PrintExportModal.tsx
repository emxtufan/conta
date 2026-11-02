import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileText } from 'lucide-react';
import { ManualEntry } from '../types';

interface PrintExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ManualEntry[];
  onSelectTopic: (id: string) => void;
}

export const PrintExportModal: React.FC<PrintExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectTopic,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const generateFullText = () => {
    let out = `Structura completă a manualului SAGA C\n`;
    out += `Cuprinsul meniului Content, cu toate capitolele și subcapitolele în ordinea din manual. Fiecare titlu are link către pagina corespunzătoare.\n`;
    out += `Sursă: Manualul oficial SAGA C | Verificat la 2 noiembrie 2026\n`;
    out += `11 capitole principale · 98 de intrări · 3 niveluri\n\n`;

    entries.forEach((e) => {
      const url = `${window.location.origin}${window.location.pathname}#${e.id}`;
      if (e.level === 1) {
        out += `${e.title} [${url}]\n`;
      } else if (e.level === 2) {
        out += `•\t${e.title} [${url}]\n`;
      } else if (e.level === 3) {
        out += `◦\t${e.title} [${url}]\n`;
      }
    });

    return out;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFullText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Structura Completă a Manualului SAGA C (Index & Listare)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>11 capitole principale · 98 de intrări · 3 niveluri</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copiat în clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiază text cuprins</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Tipărește (Print)</span>
            </button>
          </div>
        </div>

        {/* Printable Preview Body */}
        <div className="p-6 overflow-y-auto space-y-4 print:p-0 font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Structura completă a manualului SAGA C
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-0.5">
              Cuprinsul meniului Content, cu toate capitolele și subcapitolele în ordinea din manual. Fiecare titlu are link către pagina corespunzătoare.
            </p>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>Sursă: Manualul oficial SAGA C</span>
              <span aria-hidden="true">·</span>
              <span>Verificat la 2 noiembrie 2026</span>
              <span aria-hidden="true">·</span>
              <span>11 capitole principale · 98 de intrări · 3 niveluri</span>
            </div>
          </div>

          <div className="space-y-1 font-mono text-[12px]">
            {entries.map((entry) => {
              let indent = '';
              let prefix = '';
              let styleClass = 'font-bold text-slate-900 dark:text-slate-100 pt-2';

              if (entry.level === 2) {
                indent = 'pl-6';
                prefix = '•\t';
                styleClass = 'font-semibold text-slate-800 dark:text-slate-200';
              } else if (entry.level === 3) {
                indent = 'pl-12';
                prefix = '◦\t';
                styleClass = 'font-normal text-slate-600 dark:text-slate-400';
              }

              return (
                <div key={entry.id} className={`flex items-baseline justify-between py-0.5 ${indent} ${styleClass}`}>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectTopic(entry.id);
                    }}
                    className="hover:text-blue-600 dark:hover:text-blue-400 text-left hover:underline cursor-pointer"
                  >
                    <span>{prefix}</span>
                    <span>{entry.title}</span>
                  </button>
                  <span className="text-[10px] text-slate-400 font-normal ml-2 shrink-0">
                    #{entry.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
