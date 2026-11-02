import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';
import { api } from '../../services/api';
import { AccountItem, AccountNature } from '../../types/company';

interface AnalyticAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  initialParentSymbol?: string;
  onAccountCreated: (newAccount: AccountItem) => void;
}

export const AnalyticAccountModal: React.FC<AnalyticAccountModalProps> = ({
  isOpen,
  onClose,
  companyId,
  initialParentSymbol = '',
  onAccountCreated,
}) => {
  const [parentSymbol, setParentSymbol] = useState(initialParentSymbol);
  const [suffix, setSuffix] = useState('');
  const [name, setName] = useState('');
  const [nature, setNature] = useState<AccountNature>('A');
  const [allowDirectEntry, setAllowDirectEntry] = useState(true);
  const [parentAccounts, setParentAccounts] = useState<AccountItem[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Încărcare conturi sintetice pentru selecția părintelui
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuffix('');
    setName('');
    setParentSymbol(initialParentSymbol);

    const loadParents = async () => {
      setLoadingParents(true);
      try {
        const accounts = await api.getCompanyAccounts(companyId, { activeOnly: true });
        // Filtrăm preferențial conturile sintetice
        const synthetics = accounts.filter(a => a.type === 'SYNTHETIC');
        setParentAccounts(synthetics);

        // Dacă avem un parentSymbol inițial, actualizăm natura
        const selected = synthetics.find(a => a.symbol === initialParentSymbol) || synthetics[0];
        if (selected) {
          setParentSymbol(selected.symbol);
          setNature(selected.nature);
        }
      } catch (err: any) {
        setError('Eroare la încărcarea conturilor sintetice: ' + err.message);
      } finally {
        setLoadingParents(false);
      }
    };

    loadParents();
  }, [isOpen, companyId, initialParentSymbol]);

  // Când utilizatorul schimbă părintele, actualizăm natura
  const handleParentChange = (sym: string) => {
    setParentSymbol(sym);
    const parent = parentAccounts.find(a => a.symbol === sym);
    if (parent) {
      setNature(parent.nature);
    }
  };

  const fullSymbol = parentSymbol ? `${parentSymbol}.${suffix.trim()}` : suffix.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentSymbol) {
      setError('Vă rugăm selectați contul părinte.');
      return;
    }
    if (!suffix.trim()) {
      setError('Vă rugăm specificați sufixul analiticului (ex: 01, 0001, BT).');
      return;
    }
    if (!name.trim() || name.trim().length < 3) {
      setError('Denumirea contului trebuie să conțină cel puțin 3 caractere.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await api.createAnalyticAccount(companyId, {
        parent_symbol: parentSymbol,
        symbol: fullSymbol,
        name: name.trim(),
        nature,
        allow_direct_entry: allowDirectEntry,
      });

      onAccountCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Eroare la crearea contului analitic.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Adăugare Cont Analitic Nou
              </h3>
              <p className="text-xs text-slate-500">
                Creează un analitic personalizat pentru această societate
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Cont părinte */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Cont sintetic părinte <span className="text-rose-500">*</span>
            </label>
            {loadingParents ? (
              <div className="text-xs text-slate-400 py-2">Se încarcă conturile...</div>
            ) : (
              <select
                value={parentSymbol}
                onChange={(e) => handleParentChange(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {parentAccounts.map((p) => (
                  <option key={p.id} value={p.symbol}>
                    {p.symbol} — {p.name} ({p.nature})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              Analiticul va moșteni proprietățile contului sintetic.
            </p>
          </div>

          {/* Simbol analitic */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Simbol cont analitic <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {parentSymbol ? `${parentSymbol}.` : '---.'}
              </span>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value.replace(/[^0-9A-Za-z_-]/g, ''))}
                placeholder="ex: 01 sau 0001"
                className="flex-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 font-mono font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">
                Previzualizare simbol complet:
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded">
                {fullSymbol || '---'}
              </span>
            </div>
          </div>

          {/* Denumire cont */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Denumire analitic <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Banca Transilvania - Cont curent RON sau Casierie Magazin 1"
              className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Natură & Înregistrări directe */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Natură contabilă
              </label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value as AccountNature)}
                className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="A">Activ (A)</option>
                <option value="P">Pasiv (P)</option>
                <option value="B">Bifuncțional (B)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
                <input
                  type="checkbox"
                  checked={allowDirectEntry}
                  onChange={(e) => setAllowDirectEntry(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Permite înregistrări directe
                </span>
              </label>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving || !suffix.trim() || !name.trim()}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>Se salvează...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Creează Cont Analitic</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
