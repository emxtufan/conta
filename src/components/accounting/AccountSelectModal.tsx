import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Plus, 
  Check, 
  Filter, 
  BookOpen, 
  CheckCircle2, 
  Layers, 
  Info,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { AccountItem, AccountNature, AccountType } from '../../types/company';
import { AnalyticAccountModal } from './AnalyticAccountModal';

interface AccountSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  settingLabel: string;
  currentAccountId: number | null;
  allowedPrefixes?: string[];
  defaultSymbol?: string;
  onSelect: (account: AccountItem) => void;
}

export const AccountSelectModal: React.FC<AccountSelectModalProps> = ({
  isOpen,
  onClose,
  companyId,
  settingLabel,
  currentAccountId,
  allowedPrefixes = [],
  defaultSymbol = '',
  onSelect,
}) => {
  const [search, setSearch] = useState('');
  const [natureFilter, setNatureFilter] = useState<'ALL' | AccountNature>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AccountType>('ALL');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stare pentru modal adăugare analitic
  const [analyticModalOpen, setAnalyticModalOpen] = useState(false);
  const [selectedParentForAnalytic, setSelectedParentForAnalytic] = useState<string>('');

  // Încărcare conturi societate
  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getCompanyAccounts(companyId);
      setAccounts(list);
    } catch (err: any) {
      setError('Eroare la încărcarea planului de conturi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setNatureFilter('ALL');
      setTypeFilter('ALL');
      loadAccounts();
    }
  }, [isOpen, companyId]);

  // Conturi filtrate
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return accounts.filter((acc) => {
      // Căutare după simbol sau denumire
      if (q) {
        const matchSymbol = acc.symbol.toLowerCase().includes(q);
        const matchName = acc.name.toLowerCase().includes(q);
        if (!matchSymbol && !matchName) return false;
      }

      // Filtru natură
      if (natureFilter !== 'ALL' && acc.nature !== natureFilter) {
        return false;
      }

      // Filtru tip (sintetic/analitic)
      if (typeFilter !== 'ALL' && acc.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [accounts, search, natureFilter, typeFilter]);

  // Sortare: punem conturile recomandate (care respectă allowedPrefixes) în frunte
  const sortedAccounts = useMemo(() => {
    if (allowedPrefixes.length === 0) return filteredAccounts;

    return [...filteredAccounts].sort((a, b) => {
      const aMatches = allowedPrefixes.some(p => a.symbol.startsWith(p));
      const bMatches = allowedPrefixes.some(p => b.symbol.startsWith(p));

      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [filteredAccounts, allowedPrefixes]);

  const handleAnalyticCreated = (newAcc: AccountItem) => {
    // Adăugăm noul cont în listă și îl selectăm automat
    setAccounts(prev => [...prev, newAcc]);
    onSelect(newAcc);
    onClose();
  };

  const handleOpenNewAnalytic = (parentSym?: string) => {
    // Dacă nu avem specificat un părinte, încercăm să folosim defaultSymbol sau primul prefix
    const parent = parentSym || defaultSymbol || (allowedPrefixes[0] || '5121');
    setSelectedParentForAnalytic(parent);
    setAnalyticModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
            <div>
              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Selectare Cont Contabil
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{settingLabel}</span>
                {allowedPrefixes.length > 0 && (
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-normal font-mono">
                    Recomandat: {allowedPrefixes.join(', ')}...
                  </span>
                )}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search & Filters Toolbar */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Caută după simbol cont (ex: 5121) sau denumire (ex: bancă)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenNewAnalytic()}
                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Adaugă analitic</span>
              </button>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Natură:</span>
                {(['ALL', 'A', 'P', 'B'] as const).map((nat) => (
                  <button
                    key={nat}
                    type="button"
                    onClick={() => setNatureFilter(nat)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      natureFilter === nat
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {nat === 'ALL' ? 'Toate' : nat === 'A' ? 'Activ' : nat === 'P' ? 'Pasiv' : 'Bifuncțional'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Tip:</span>
                {(['ALL', 'SYNTHETIC', 'ANALYTIC'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      typeFilter === t
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t === 'ALL' ? 'Toate' : t === 'SYNTHETIC' ? 'Sintetice' : 'Analitice'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Account List */}
          <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Se încarcă conturile...
              </div>
            ) : error ? (
              <div className="p-4 text-xs text-rose-600 text-center">{error}</div>
            ) : sortedAccounts.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  Nu a fost găsit niciun cont contabil conform criteriilor selectate.
                </p>
                <button
                  onClick={() => handleOpenNewAnalytic()}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Creează un cont analitic nou acum
                </button>
              </div>
            ) : (
              sortedAccounts.map((account) => {
                const isSelected = account.id === currentAccountId;
                const isRecommended = allowedPrefixes.some(p => account.symbol.startsWith(p));
                const isInactive = account.is_active !== 1;

                return (
                  <div
                    key={account.id}
                    onClick={() => {
                      if (!isInactive) {
                        onSelect(account);
                        onClose();
                      }
                    }}
                    className={`group px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                      isInactive
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40'
                        : isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 cursor-pointer'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Simbol */}
                      <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded shrink-0 border border-blue-200/50 dark:border-blue-800/50">
                        {account.symbol}
                      </span>

                      {/* Denumire & Badge-uri */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {account.name}
                          </span>
                          {isRecommended && (
                            <span className="shrink-0 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Recomandat
                            </span>
                          )}
                          {isInactive && (
                            <span className="shrink-0 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-semibold">
                              Inactiv
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>Natură: <strong className="text-slate-600 dark:text-slate-300">{account.nature === 'A' ? 'Activ (A)' : account.nature === 'P' ? 'Pasiv (P)' : 'Bifuncțional (B)'}</strong></span>
                          <span>•</span>
                          <span>Tip: <span className="font-medium text-slate-600 dark:text-slate-300">{account.type === 'ANALYTIC' ? 'Analitic' : 'Sintetic'}</span></span>
                          {account.parent_symbol && (
                            <>
                              <span>•</span>
                              <span>Părinte: <strong className="font-mono">{account.parent_symbol}</strong></span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acțiuni */}
                    <div className="flex items-center gap-2 shrink-0">
                      {account.type === 'SYNTHETIC' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNewAnalytic(account.symbol);
                          }}
                          title={`Adaugă cont analitic sub ${account.symbol}`}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-opacity cursor-pointer text-[11px] flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-950 px-1.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Analitic</span>
                        </button>
                      )}

                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          Selectează
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
            <span>
              Total conturi: <strong>{filteredAccounts.length}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Închide
            </button>
          </div>
        </div>
      </div>

      {/* Modal adăugare cont analitic */}
      <AnalyticAccountModal
        isOpen={analyticModalOpen}
        onClose={() => setAnalyticModalOpen(false)}
        companyId={companyId}
        initialParentSymbol={selectedParentForAnalytic}
        onAccountCreated={handleAnalyticCreated}
      />
    </>
  );
};
