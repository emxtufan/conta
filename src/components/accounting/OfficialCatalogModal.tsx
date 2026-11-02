import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, BookOpen, Layers, CheckCircle2, ShieldCheck, Filter } from 'lucide-react';
import { api } from '../../services/api';
import { OfficialCatalogResponse } from '../../types/company';

interface OfficialCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialCatalogModal: React.FC<OfficialCatalogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [data, setData] = useState<OfficialCatalogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  useEffect(() => {
    if (!isOpen) return;

    const loadCatalog = async () => {
      setLoading(true);
      try {
        const res = await api.getOfficialAccounts();
        setData(res);
      } catch (err: any) {
        console.error('Eroare catalog oficial:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, [isOpen]);

  const classes = [
    { id: 'ALL', label: 'Toate clasele' },
    { id: '1', label: 'Clasa 1 (Capitaluri)' },
    { id: '2', label: 'Clasa 2 (Imobilizări)' },
    { id: '3', label: 'Clasa 3 (Stocuri)' },
    { id: '4', label: 'Clasa 4 (Terți)' },
    { id: '5', label: 'Clasa 5 (Trezorerie)' },
    { id: '6', label: 'Clasa 6 (Cheltuieli)' },
    { id: '7', label: 'Clasa 7 (Venituri)' },
  ];

  const filteredAccounts = useMemo(() => {
    if (!data?.accounts) return [];
    const q = search.trim().toLowerCase();

    return data.accounts.filter(a => {
      if (selectedClass !== 'ALL' && !a.symbol.startsWith(selectedClass)) {
        return false;
      }
      if (q) {
        return a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, search, selectedClass]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Planul General de Conturi Oficial
                </h3>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded font-mono">
                  {data?.version || 'OMFP 1802/2014'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Nomenclator normativ oficial aprobat prin Ordinul MFP nr. 1802/2014, aplicabil de la {data?.valid_from || '2015-01-01'}
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

        {/* Toolbar */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută în planul oficial de conturi..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedClass === cls.id
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cls.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Se încarcă catalogul oficial...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Simbol</th>
                  <th className="py-2.5 px-4 font-semibold">Denumire Cont</th>
                  <th className="py-2.5 px-4 font-semibold">Natură</th>
                  <th className="py-2.5 px-4 font-semibold">Grad</th>
                  <th className="py-2.5 px-4 font-semibold">Cont Părinte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.symbol} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {acc.symbol}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {acc.name}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        acc.nature === 'A'
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : acc.nature === 'P'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                      }`}>
                        {acc.nature === 'A' ? 'Activ (A)' : acc.nature === 'P' ? 'Pasiv (P)' : 'Bifuncțional (B)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {acc.symbol.length <= 3 ? 'Sintetic grad 1' : 'Sintetic grad 2'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                      {acc.parent_symbol || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>{filteredAccounts.length} conturi afișate</span>
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
