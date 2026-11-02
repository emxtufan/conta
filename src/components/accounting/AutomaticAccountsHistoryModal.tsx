import React, { useState, useEffect } from 'react';
import { X, History, ArrowRight, User, Calendar, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { AutomaticAccountHistoryItem } from '../../types/company';

interface AutomaticAccountsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
}

export const AutomaticAccountsHistoryModal: React.FC<AutomaticAccountsHistoryModalProps> = ({
  isOpen,
  onClose,
  companyId,
}) => {
  const [history, setHistory] = useState<AutomaticAccountHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const items = await api.getAutomaticAccountsHistory(companyId);
        setHistory(items);
      } catch (err: any) {
        console.error('Eroare la încărcarea istoricului:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen, companyId]);

  const uniqueKeys = Array.from(new Set(history.map(h => h.setting_key)));

  const filteredHistory = selectedKey === 'ALL'
    ? history
    : history.filter(h => h.setting_key === selectedKey);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Jurnal Trasabilitate & Istoric Modificări
              </h3>
              <p className="text-xs text-slate-500">
                Evidența completă a modificărilor efectuate asupra conturilor automate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter bar */}
        {uniqueKeys.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filtrează după operațiune:</span>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="ALL">Toate operațiunile ({history.length})</option>
              {uniqueKeys.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Se încarcă istoricul...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Nu există modificări înregistrate încă.
              </p>
              <p className="text-[11px] text-slate-400">
                Configurația curentă utilizează conturile inițiale sau nu au fost operate modificări.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                    {item.setting_key}
                  </span>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {item.changed_by_name || 'Utilizator'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.changed_at).toLocaleString('ro-RO')}
                    </span>
                  </div>
                </div>

                {/* Account change comparison */}
                <div className="flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Cont Anterior</div>
                    <div className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate">
                      {item.old_account_symbol ? (
                        <>
                          <span className="text-rose-600">{item.old_account_symbol}</span> — {item.old_account_name}
                        </>
                      ) : (
                        <span className="italic text-slate-400">Neconfigurat</span>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Cont Nou</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.new_account_symbol ? (
                        <>
                          <span className="text-emerald-600">{item.new_account_symbol}</span> — {item.new_account_name}
                        </>
                      ) : (
                        <span className="italic text-slate-400">Neconfigurat</span>
                      )}
                    </div>
                  </div>
                </div>

                {item.notes && (
                  <div className="text-[11px] text-slate-500 italic">
                    Notă: {item.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredHistory.length} înregistrări în jurnal</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
