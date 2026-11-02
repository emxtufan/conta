import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Save, 
  RotateCcw, 
  History, 
  BookOpen, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeftRight, 
  Wallet, 
  Receipt, 
  Users, 
  Percent, 
  Scale, 
  FileText,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { 
  AutomaticAccountSettingItem, 
  AutoSettingCategory, 
  AccountItem, 
  CompanyDetailed 
} from '../../types/company';
import { AccountSelectModal } from './AccountSelectModal';
import { AnalyticAccountModal } from './AnalyticAccountModal';
import { AutomaticAccountsHistoryModal } from './AutomaticAccountsHistoryModal';
import { OfficialCatalogModal } from './OfficialCatalogModal';
import { CompensationVisualizer } from './CompensationVisualizer';

interface AutomaticAccountsViewProps {
  company: CompanyDetailed | null;
  onNavigateToCompanies: () => void;
}

export const AutomaticAccountsView: React.FC<AutomaticAccountsViewProps> = ({
  company,
  onNavigateToCompanies,
}) => {
  const [settings, setSettings] = useState<AutomaticAccountSettingItem[]>([]);
  // draftSettings păstrează modificările nesalvate ale utilizatorului
  const [draftSettings, setDraftSettings] = useState<Record<string, { account_id: number | null; account_symbol?: string; account_name?: string; account_nature?: any; account_type?: any }>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Category Tab
  const [activeCategory, setActiveCategory] = useState<AutoSettingCategory | 'COMPENSARE'>('CASA_BANCA');

  // Modals state
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [activeSelectSetting, setActiveSelectSetting] = useState<AutomaticAccountSettingItem | null>(null);

  const [analyticModalOpen, setAnalyticModalOpen] = useState(false);
  const [analyticParentSymbol, setAnalyticParentSymbol] = useState<string>('5121');

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);

  // Încărcare setări curente pentru compania activă
  const loadSettings = async () => {
    if (!company) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getAutomaticAccounts(company.id);
      setSettings(data);
      // Reset draft
      setDraftSettings({});
      setNotes({});
    } catch (err: any) {
      setErrorMessage('Eroare la încărcarea conturilor automate: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [company?.id]);

  // Număr modificări nesalvate
  const dirtyCount = Object.keys(draftSettings).length;

  // Gruparea setărilor pe categorii
  const categoryGroups = useMemo(() => {
    const map: Record<string, AutomaticAccountSettingItem[]> = {
      CASA_BANCA: [],
      DECONTURI: [],
      CLIENTI_FURNIZORI: [],
      TVA: [],
      INCHIDERE_REZULTAT: [],
      COMPENSARE: [],
    };

    for (const s of settings) {
      if (map[s.category]) {
        map[s.category].push(s);
      }
    }
    return map;
  }, [settings]);

  // Helper pentru a obține valoarea afișată a unei setări (din draft sau din settings salvat)
  const getEffectiveSetting = (s: AutomaticAccountSettingItem) => {
    const draft = draftSettings[s.setting_key];
    if (draft !== undefined) {
      return {
        ...s,
        account_id: draft.account_id,
        account_symbol: draft.account_symbol,
        account_name: draft.account_name,
        account_nature: draft.account_nature,
        account_type: draft.account_type,
        isDirty: true,
      };
    }
    return {
      ...s,
      isDirty: false,
    };
  };

  // Deschidere modal selecție pentru o setare anume
  const handleOpenSelect = (setting: AutomaticAccountSettingItem) => {
    setActiveSelectSetting(setting);
    setSelectModalOpen(true);
  };

  // Când utilizatorul selectează un cont din modal
  const handleAccountSelected = (account: AccountItem) => {
    if (!activeSelectSetting) return;

    // Verificăm dacă este diferit de cel salvat inițial
    const original = settings.find(s => s.setting_key === activeSelectSetting.setting_key);
    if (original && original.account_id === account.id) {
      // Revenit la original -> eliminăm din draft
      setDraftSettings(prev => {
        const next = { ...prev };
        delete next[activeSelectSetting.setting_key];
        return next;
      });
    } else {
      setDraftSettings(prev => ({
        ...prev,
        [activeSelectSetting.setting_key]: {
          account_id: account.id,
          account_symbol: account.symbol,
          account_name: account.name,
          account_nature: account.nature,
          account_type: account.type,
        },
      }));
    }
    setSaveSuccess(null);
  };

  // Resetare o setare specifică la default-ul din spec
  const handleResetToDefault = (setting: AutomaticAccountSettingItem) => {
    // Căutăm contul cu default_symbol
    api.getCompanyAccounts(company!.id, { search: setting.default_symbol }).then(accs => {
      const match = accs.find(a => a.symbol === setting.default_symbol);
      if (match) {
        handleAccountSelected(match);
      }
    });
  };

  // Anulare toate modificările nesalvate
  const handleDiscardChanges = () => {
    setDraftSettings({});
    setNotes({});
    setSaveSuccess(null);
    setErrorMessage(null);
  };

  // Salvare modificări pe server
  const handleSave = async () => {
    if (!company || dirtyCount === 0) return;

    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      const updates = Object.entries(draftSettings).map(([setting_key, val]) => ({
        setting_key,
        account_id: val.account_id,
        notes: notes[setting_key] || 'Actualizare din interfața Conturi automate',
      }));

      const updatedList = await api.updateAutomaticAccounts(company.id, updates);
      setSettings(updatedList);
      setDraftSettings({});
      setNotes({});
      setSaveSuccess(`Configurația conturilor automate a fost salvată cu succes pentru societatea "${company.name}".`);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare la salvarea configurației conturilor automate.');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{
    id: AutoSettingCategory | 'COMPENSARE';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
  }> = [
    { id: 'CASA_BANCA', label: 'Casa și banca', icon: Wallet, count: categoryGroups.CASA_BANCA.length },
    { id: 'DECONTURI', label: 'Deconturi', icon: Receipt, count: categoryGroups.DECONTURI.length },
    { id: 'CLIENTI_FURNIZORI', label: 'Clienți și furnizori', icon: Users, count: categoryGroups.CLIENTI_FURNIZORI.length },
    { id: 'TVA', label: 'TVA', icon: Percent, count: categoryGroups.TVA.length },
    { id: 'INCHIDERE_REZULTAT', label: 'Închidere venituri/cheltuieli', icon: Scale, count: categoryGroups.INCHIDERE_REZULTAT.length },
    { id: 'COMPENSARE', label: 'Compensări clienți-furnizori', icon: ArrowLeftRight, count: categoryGroups.COMPENSARE.length },
  ];

  if (!company) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-3">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Nicio societate activă selectată
        </h3>
        <p className="text-xs text-slate-500">
          Vă rugăm să selectați sau să creați o societate pentru a putea configura conturile contabile automate.
        </p>
        <button
          onClick={onNavigateToCompanies}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Mergi la Configurare Societăți
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>Configurare</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <button
              onClick={onNavigateToCompanies}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              Configurare societăți
            </button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-700 dark:text-slate-200 font-bold">Conturi automate</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
            <span>Conturi Automate Implicite</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
              {company.internal_code}
            </span>
          </h1>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {dirtyCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 rounded-lg flex items-center gap-1.5 border border-amber-200 dark:border-amber-900 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {dirtyCount} {dirtyCount === 1 ? 'modificare nesalvată' : 'modificări nesalvate'}
            </span>
          )}

          {dirtyCount > 0 && (
            <button
              onClick={handleDiscardChanges}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Anulează</span>
            </button>
          )}

          <button
            onClick={() => setCatalogModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Plan oficial OMFP 1802</span>
          </button>

          <button
            onClick={() => setHistoryModalOpen(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Jurnal istoric</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || dirtyCount === 0}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Se salvează...' : 'Salvare Modificări'}</span>
          </button>
        </div>
      </div>

      {/* Active Company Banner */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              {company.name}
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
              <span>CUI: <strong className="font-mono text-slate-700 dark:text-slate-300">{company.fiscal_attribute ? `${company.fiscal_attribute} ` : ''}{company.cui}</strong></span>
              <span>•</span>
              <span>Reg. Com: <span className="font-mono">{company.reg_com || '—'}</span></span>
              <span>•</span>
              <span>Monedă: <strong>{company.currency}</strong></span>
            </div>
          </div>
        </div>

        {/* Fiscal Regime Badges */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
            company.is_vat_payer
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {company.is_vat_payer ? 'Plătitor TVA' : 'Neplătitor TVA'}
            {company.vat_on_collection ? ' (TVA la Încasare)' : ''}
          </span>

          <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            Regim: {company.taxation_type === 'MICRO' ? 'Microîntreprindere' : 'Impozit pe Profit'}
          </span>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-blue-700 text-blue-100'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Se încarcă configurația conturilor automate...
        </div>
      ) : activeCategory === 'COMPENSARE' ? (
        <CompensationVisualizer
          setting={settings.find(s => s.setting_key === 'COMPENSARE_INTERMEDIAR')}
          onModifyClick={() => {
            const compSetting = settings.find(s => s.setting_key === 'COMPENSARE_INTERMEDIAR');
            if (compSetting) handleOpenSelect(compSetting);
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryGroups[activeCategory]?.map((setting) => {
              const effective = getEffectiveSetting(setting);
              const isDirty = effective.isDirty;
              const hasAccount = !!effective.account_id;

              return (
                <div
                  key={setting.setting_key}
                  className={`p-4 rounded-xl border transition-all ${
                    isDirty
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-xs ring-1 ring-amber-400/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Header: Label & Status Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {setting.label}
                        </h4>
                        {setting.is_required === 1 ? (
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.2 rounded font-medium">
                            Obligatoriu
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Opțional
                          </span>
                        )}
                        {isDirty && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold px-1.5 py-0.2 rounded">
                            Modificat
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {setting.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSelect(setting)}
                      className="px-2.5 py-1 text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition-colors shrink-0 cursor-pointer"
                    >
                      {hasAccount ? 'Schimbă' : 'Alege'}
                    </button>
                  </div>

                  {/* Account display box */}
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    {hasAccount ? (
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-blue-200 dark:border-blue-900 shrink-0">
                          {effective.account_symbol}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {effective.account_name}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span>Natură: <strong>{effective.account_nature || 'A'}</strong></span>
                            <span>•</span>
                            <span>Tip: {effective.account_type === 'ANALYTIC' ? 'Analitic' : 'Sintetic'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5" />
                        <span>Neconfigurat</span>
                      </div>
                    )}

                    {/* Quick actions for setting */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {setting.default_symbol && effective.account_symbol !== setting.default_symbol && (
                        <button
                          type="button"
                          onClick={() => handleResetToDefault(setting)}
                          title={`Resetează la simbolul implicit (${setting.default_symbol})`}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] rounded hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Implicit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setAnalyticParentSymbol(effective.account_symbol || setting.default_symbol || '5121');
                          setAnalyticModalOpen(true);
                        }}
                        title="Adaugă cont analitic sub acest cont"
                        className="px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Analitic</span>
                      </button>
                    </div>
                  </div>

                  {/* Explanatory footer per setting */}
                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Cod intern: <strong className="font-mono text-slate-500">{setting.setting_key}</strong></span>
                    {setting.default_symbol && (
                      <span>Recomandat: <strong className="font-mono text-slate-500">{setting.default_symbol}</strong></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Select Account Modal */}
      {activeSelectSetting && (
        <AccountSelectModal
          isOpen={selectModalOpen}
          onClose={() => {
            setSelectModalOpen(false);
            setActiveSelectSetting(null);
          }}
          companyId={company.id}
          settingLabel={activeSelectSetting.label}
          currentAccountId={getEffectiveSetting(activeSelectSetting).account_id}
          defaultSymbol={activeSelectSetting.default_symbol}
          allowedPrefixes={
            activeSelectSetting.setting_key.startsWith('CASA')
              ? ['531']
              : activeSelectSetting.setting_key.startsWith('BANCA')
              ? ['512']
              : activeSelectSetting.setting_key.startsWith('TVA')
              ? ['442']
              : activeSelectSetting.setting_key.startsWith('CLIENTI')
              ? ['411']
              : activeSelectSetting.setting_key.startsWith('FURNIZORI')
              ? ['401']
              : []
          }
          onSelect={handleAccountSelected}
        />
      )}

      {/* Quick Analytic Account Creation Modal */}
      <AnalyticAccountModal
        isOpen={analyticModalOpen}
        onClose={() => setAnalyticModalOpen(false)}
        companyId={company.id}
        initialParentSymbol={analyticParentSymbol}
        onAccountCreated={(newAcc) => {
          // Dacă modalul a fost deschis dintr-o setare curentă, o putem actualiza automat
          if (activeSelectSetting) {
            handleAccountSelected(newAcc);
          }
          setAnalyticModalOpen(false);
          loadSettings();
        }}
      />

      {/* History Audit Modal */}
      <AutomaticAccountsHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        companyId={company.id}
      />

      {/* Official Catalog OMFP 1802 Modal */}
      <OfficialCatalogModal
        isOpen={catalogModalOpen}
        onClose={() => setCatalogModalOpen(false)}
      />
    </div>
  );
};
