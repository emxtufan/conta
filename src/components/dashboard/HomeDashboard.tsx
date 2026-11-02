import React from 'react';
import { 
  Building2, 
  CheckCircle2, 
  Plus, 
  FlaskConical, 
  Layers, 
  Receipt, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Sliders
} from 'lucide-react';
import { CompanyListItem, CompanyDetailed } from '../../types/company';

interface HomeDashboardProps {
  companies: CompanyListItem[];
  activeCompany: CompanyDetailed | null;
  onOpenCreate: () => void;
  onGoToCompanies: () => void;
  onOpenTests: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  companies,
  activeCompany,
  onOpenCreate,
  onGoToCompanies,
  onOpenTests,
}) => {
  const activeCount = companies.filter(c => c.is_active === 1).length;

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50 dark:bg-slate-950">
      {/* Hero Welcome Banner */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Contabilitate RO · Etapa 1 (Arhitectură & Configurare Societăți)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Panou Principal de Gestiune
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Sistemul dumneavoastră ERP este conectat la baza de date relațională server-side persistentă. Gestionați mai multe entități economice, parametri fiscali și conturi bancare cu izolare strictă a datelor.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Societate Nouă</span>
          </button>
          <button
            onClick={onOpenTests}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <FlaskConical className="w-4 h-4" />
            <span>Verificare Teste (12)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Societăți */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Societăți Înregistrate</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {companies.length}
          </div>
          <span className="text-[10px] text-slate-400 block">În baza de date SQLite</span>
        </div>

        {/* Societăți Active */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 block">Societăți Active (Operaționale)</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600">
            {activeCount}
          </div>
          <span className="text-[10px] text-slate-400 block">{companies.length - activeCount} inactive</span>
        </div>

        {/* Societate Activă pe Ecran */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1 sm:col-span-2">
          <span className="text-[11px] font-semibold text-slate-500 block">Context de Lucru Activ</span>
          {activeCompany ? (
            <div className="space-y-0.5">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeCompany.name}
              </div>
              <div className="text-xs font-mono text-slate-500 flex items-center gap-2">
                <span>Cod: <strong>{activeCompany.internal_code}</strong></span>
                <span aria-hidden="true">·</span>
                <span>CUI: <strong>{activeCompany.fiscal_attribute ? `${activeCompany.fiscal_attribute} ` : ''}{activeCompany.cui}</strong></span>
                <span aria-hidden="true">·</span>
                <span>{activeCompany.accounting_type}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-600 font-semibold pt-1">
              Nicio societate activă selectată
            </div>
          )}
        </div>
      </div>

      {/* Focus on Company Details if active */}
      {activeCompany && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Parametri Activi pentru {activeCompany.name}
              </h2>
            </div>
            <button
              onClick={onGoToCompanies}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Deschide modulul Configurare societăți</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Sediu */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Sediu Social</span>
              {activeCompany.headquarters ? (
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Str. {activeCompany.headquarters.street}, Nr. {activeCompany.headquarters.number}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {activeCompany.headquarters.city}, Jud. {activeCompany.headquarters.county}
                  </div>
                </div>
              ) : (
                <span className="text-slate-400">Nespecificat</span>
              )}
            </div>

            {/* Regim Fiscal */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Regim Fiscal Curent</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {activeCompany.current_fiscal_regime?.is_vat_payer
                  ? `Plătitor TVA (${activeCompany.current_fiscal_regime.vat_periodicity === 'MONTHLY' ? 'Lunar' : 'Trimestrial'})`
                  : 'Neplătitor TVA'}
              </div>
              <div className="text-slate-500 text-[11px]">
                Impozitare: {activeCompany.current_fiscal_regime?.taxation_type || 'Micro'} · TVA la încasare: {activeCompany.current_fiscal_regime?.vat_on_collection ? 'Da' : 'Nu'}
              </div>
            </div>

            {/* Conturi Bancare */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Conturi Bancare</span>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {activeCompany.bank_accounts.length} conturi configurate
              </div>
              <div className="font-mono text-slate-500 text-[11px] truncate">
                {activeCompany.bank_accounts.find(b => b.is_default)?.iban || 'Fără cont implicit setat'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roadmap & Architecture Overview */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span>Arhitectura Modulară — Stadiu Implementare</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 dark:text-emerald-200">Etapa 1</span>
              <span className="text-[10px] font-bold bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-1.5 py-0.2 rounded">
                COMPLETĂ
              </span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">Configurare Societăți</div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Arhitectură backend, bază relațională, 6 taburi, CUI/IBAN/CAEN, istoric fiscal, blocare optimistă.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 space-y-1 opacity-75">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500">Etapa 2</span>
              <span className="text-[10px] text-slate-400">Urmează</span>
            </div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">Nomenclatoare</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Plan de conturi românesc (OMFP 1802), Terți cu verificare ANAF, Articole, Gestiuni.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 space-y-1 opacity-75">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500">Etapa 3</span>
              <span className="text-[10px] text-slate-400">Urmează</span>
            </div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">Operații Primare</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Intrări, Ieșiri, Trezorerie (registru casă/bancă), Descărcare stocuri, Închidere lună.
            </p>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30 space-y-1 opacity-75">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-500">Etapa 4</span>
              <span className="text-[10px] text-slate-400">Urmează</span>
            </div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">Situații & Declarații</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Balanțe cu 4-5 egalități, Jurnale TVA, Bilanț contabil, SAF-T D406, e-Factura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
