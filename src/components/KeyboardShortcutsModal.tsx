import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', desc: 'Deschide ajutorul contextual din manualul oficial pentru ecranul activ' },
    { key: 'F2', desc: 'Adaugă o înregistrare nouă (antet factură, rând de articol, salariat, terț)' },
    { key: 'F3', desc: 'Modifică înregistrarea curentă selectată în tabel' },
    { key: 'F4', desc: 'Salvează modificările aduse înregistrării curente' },
    { key: 'F5', desc: 'Actualizează / reîmprospătează datele din tabel sau balanță' },
    { key: 'F7', desc: 'Activează căutarea și filtrarea rapidă în tabele' },
    { key: 'F8', desc: 'Șterge rândul sau documentul curent selectat (cu confirmare)' },
    { key: 'F10 / Esc', desc: 'Închide fereastra activă sau iese din ecranul de operare' },
    { key: 'Ctrl + Enter', desc: 'Validare rapidă a documentului (antet factură, NIR, bon de consum)' },
    { key: 'TAB / Enter', desc: 'Trecerea la următorul câmp cu declanșarea automată a formulelor de calcul' },
    { key: 'Săgeată Jos', desc: 'În câmpurile de partener sau articol, deschide lista completă de selecție' },
    { key: 'Ctrl + U', desc: 'Schimbare rapidă de utilizator / reautentificare' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Taste Rapide & Comenzi în SAGA C
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Utilizarea scurtăturilor de la tastatură permite introducerea documentelor contabile fără mouse, sporind viteza de operare de până la 3 ori.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {shortcuts.map((s, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 text-xs bg-slate-50/50 dark:bg-slate-950/40"
              >
                <kbd className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 font-mono text-[11px] font-semibold shadow-2xs">
                  {s.key}
                </kbd>
                <span className="text-slate-700 dark:text-slate-300 text-right max-w-xs font-normal">
                  {s.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Am înțeles
          </button>
        </div>
      </div>
    </div>
  );
};
