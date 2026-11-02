import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit3, 
  Eye, 
  Power, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Layers, 
  FileText,
  Filter,
  Trash2
} from 'lucide-react';
import { CompanyListItem } from '../../types/company';

interface CompanyListProps {
  companies: CompanyListItem[];
  activeCompanyId: number | null;
  onSelectActiveCompany: (id: number) => void;
  onOpenCreate: () => void;
  onOpenEdit: (company: CompanyListItem) => void;
  onOpenDetails: (company: CompanyListItem) => void;
  onToggleStatus: (id: number, currentStatus: number) => void;
  onDeleteCompany: (id: number, name: string) => void;
  loading: boolean;
}

export const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  activeCompanyId,
  onSelectActiveCompany,
  onOpenCreate,
  onOpenEdit,
  onOpenDetails,
  onToggleStatus,
  onDeleteCompany,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || (
        c.name.toLowerCase().includes(q) ||
        c.cui.toLowerCase().includes(q) ||
        c.internal_code.toLowerCase().includes(q) ||
        (c.reg_com && c.reg_com.toLowerCase().includes(q))
      );

      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? c.is_active === 1 :
        c.is_active === 0;

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Top Banner / Breadcrumb & Action */}
      <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Configurare</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">Configurare societăți</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-0.5">
            Societăți Comerciale ({companies.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gestiunea entităților economice, parametrizare fiscală, adrese și conturi bancare.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Adaugă Societate</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Caută după denumire, CUI sau cod intern..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status segmented filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Toate ({companies.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Active ({companies.filter(c => c.is_active === 1).length})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1 font-medium rounded-md transition-colors cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Inactive ({companies.filter(c => c.is_active === 0).length})
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-xs text-slate-500">
            Se încarcă datele din baza de date persistentă...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto space-y-3">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Nicio societate găsită
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {companies.length === 0
                ? 'Nu există nicio societate înregistrată în baza de date. Apăsați butonul de mai jos pentru a configura prima firmă.'
                : 'Nicio societate nu corespunde criteriilor de căutare sau filtrelor selectate.'}
            </p>
            {companies.length === 0 ? (
              <button
                onClick={onOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Configurează prima societate</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Resetează filtrele
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 w-20">Cod</th>
                  <th className="py-3 px-4">Denumire societate</th>
                  <th className="py-3 px-4">CUI/CIF</th>
                  <th className="py-3 px-4">Reg. Com.</th>
                  <th className="py-3 px-4">Tip Contabilitate</th>
                  <th className="py-3 px-4">Cod CAEN</th>
                  <th className="py-3 px-4">Regim TVA</th>
                  <th className="py-3 px-4">Stare</th>
                  <th className="py-3 px-4 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCompanies.map((company) => {
                  const isActiveCompany = company.id === activeCompanyId;
                  const isInactive = company.is_active === 0;

                  return (
                    <tr
                      key={company.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isActiveCompany ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                      } ${isInactive ? 'opacity-60 bg-slate-50/30' : ''}`}
                    >
                      {/* Cod intern */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {company.internal_code}
                      </td>

                      {/* Denumire societate */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {company.name}
                          </span>
                          {isActiveCompany && (
                            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/80 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Activă pe ecran
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Cap. social: {company.share_capital.toLocaleString('ro-RO')} {company.currency} · Data start: {company.start_date}
                        </div>
                      </td>

                      {/* CUI */}
                      <td className="py-3 px-4 font-mono">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {company.fiscal_attribute ? `${company.fiscal_attribute} ` : ''}{company.cui}
                        </span>
                      </td>

                      {/* Reg. Com. */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {company.reg_com || '-'}
                      </td>

                      {/* Tip contabilitate */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {company.accounting_type === 'COMMERCIAL' ? 'Comercială (Legea 82)' :
                         company.accounting_type === 'MICRO' ? 'Microîntreprindere' :
                         company.accounting_type === 'ONG' ? 'Organizație Non-Profit' :
                         company.accounting_type}
                      </td>

                      {/* CAEN */}
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {company.caen_code || '-'}
                      </td>

                      {/* Regim TVA */}
                      <td className="py-3 px-4">
                        {company.is_vat_payer ? (
                          <div className="text-[11px] space-y-0.5">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                              Plătitor TVA ({company.vat_periodicity === 'MONTHLY' ? 'Lunar' : 'Trimestrial'})
                            </span>
                            {Boolean(company.vat_on_collection) && (
                              <div className="text-[10px] text-slate-400">TVA la încasare</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-normal">Neplătitor TVA</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {company.is_active === 1 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Activă</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                            <XCircle className="w-3 h-3" />
                            <span>Inactivă</span>
                          </span>
                        )}
                      </td>

                      {/* Acțiuni */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Selectează societate activă */}
                          {!isActiveCompany && company.is_active === 1 && (
                            <button
                              onClick={() => onSelectActiveCompany(company.id)}
                              className="px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors cursor-pointer"
                              title="Setează ca societate de lucru curentă"
                            >
                              Selectează
                            </button>
                          )}

                          {/* Vizualizare detalii */}
                          <button
                            onClick={() => onOpenDetails(company)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Vizualizare fișă societate și istoric audit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Editare */}
                          <button
                            onClick={() => onOpenEdit(company)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title="Editează societatea (6 taburi)"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle activ/inactiv */}
                          <button
                            onClick={() => onToggleStatus(company.id, company.is_active)}
                            className={`p-1.5 rounded transition-colors cursor-pointer ${
                              company.is_active === 1
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            title={company.is_active === 1 ? 'Dezactivează societatea' : 'Reactivează societatea'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Ștergere protejată */}
                          <button
                            onClick={() => onDeleteCompany(company.id, company.name)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                            title="Șterge societatea (protejat)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
