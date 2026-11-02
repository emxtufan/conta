import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Save, 
  RotateCcw, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Calculator,
  Plus,
  Edit2,
  Trash2,
  Building,
  Layers,
  Factory,
  Printer,
  Sparkles,
  Info,
  Check,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';
import { 
  CompanyDetailed, 
  CompanyOperationalSettings, 
  BranchLocation,
  CompanySettingsHistoryItem,
  ClosingMode,
  DueDateMode,
  NegativeStocksPolicy,
  CogsDateMode,
  PriceDiffStrategy
} from '../../types/company';
import { BranchModal } from './BranchModal';

interface SettingsDiverseViewProps {
  company: CompanyDetailed | null;
  onNavigateToCompanies: () => void;
}

export const SettingsDiverseView: React.FC<SettingsDiverseViewProps> = ({
  company,
  onNavigateToCompanies,
}) => {
  const [settings, setSettings] = useState<CompanyOperationalSettings | null>(null);
  const [draft, setDraft] = useState<Partial<CompanyOperationalSettings>>({});
  const [branches, setBranches] = useState<BranchLocation[]>([]);
  const [history, setHistory] = useState<CompanySettingsHistoryItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Tab
  type TabId = 'contabilitate' | 'facturare' | 'filiale' | 'gestiuni' | 'productie' | 'rapoarte';
  const [activeTab, setActiveTab] = useState<TabId>('contabilitate');

  // Branch Modal state
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchLocation | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Interactive Calculators state
  // 1. Calculator Scadență
  const [testIssueDate, setTestIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [testDays, setTestDays] = useState(30);
  const [testDueDateResult, setTestDueDateResult] = useState<string>('');
  const [testRefDate, setTestRefDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().split('T')[0];
  });
  const [testDelayResult, setTestDelayResult] = useState<number>(0);

  // 2. Calculator Preț cu TVA (Aritmetică exactă)
  const [testGrossAmount, setTestGrossAmount] = useState<number>(1190.0);
  const [testVatRate, setTestVatRate] = useState<number>(19.0);
  const [testGrossCalcResult, setTestGrossCalcResult] = useState<any>(null);

  // 3. Simulator Coeficient K diferențe de preț
  const [kSi371, setKSi371] = useState<number>(10000);
  const [kSi378, setKSi378] = useState<number>(2000);
  const [kRc371, setKRc371] = useState<number>(25000);
  const [kRc378, setKRc378] = useState<number>(5000);
  const [kCalcResult, setKCalcResult] = useState<any>(null);

  // Încărcare date
  const loadData = async () => {
    if (!company) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const [opSettings, branchList] = await Promise.all([
        api.getOperationalSettings(company.id),
        api.getBranches(company.id),
      ]);
      setSettings(opSettings);
      setDraft(opSettings);
      setBranches(branchList);
    } catch (err: any) {
      setErrorMessage('Eroare la încărcarea setărilor: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [company?.id]);

  // Recalculare interactivă scadențe
  useEffect(() => {
    const runDueDateCalc = async () => {
      try {
        const mode = draft.due_date_mode || 'CALENDAR';
        const res = await api.calculateDueDate({
          issue_date: testIssueDate,
          number_of_days: testDays,
          mode,
          company_id: company?.id,
        });
        setTestDueDateResult(res.due_date);

        const delayMode = draft.delay_days_mode || 'CALENDAR';
        const delayRes = await api.calculateDelay({
          due_date: res.due_date,
          reference_date: testRefDate,
          mode: delayMode,
          company_id: company?.id,
        });
        setTestDelayResult(delayRes.delay_days);
      } catch (err) {
        // Ignoră erori temporare de input
      }
    };
    runDueDateCalc();
  }, [testIssueDate, testDays, testRefDate, draft.due_date_mode, draft.delay_days_mode, company?.id]);

  // Recalculare interactivă din preț brut cu TVA
  useEffect(() => {
    const runGrossCalc = async () => {
      try {
        const res = await api.calculateFromGross({
          gross_amount: testGrossAmount,
          vat_rate_percent: testVatRate,
          rounding_decimals: 2,
        });
        setTestGrossCalcResult(res);
      } catch (err) {
        // Ignoră
      }
    };
    runGrossCalc();
  }, [testGrossAmount, testVatRate]);

  // Recalculare interactivă coeficient K
  useEffect(() => {
    const runKCalc = async () => {
      try {
        const strategy = draft.inventory_price_diff_strategy || 'CUMULATIVE_YEAR_START';
        const res = await api.calculatePriceDiffCoef({
          initialStockValue: kSi371,
          initialPriceDiff: kSi378,
          incomingStockValue: kRc371,
          incomingPriceDiff: kRc378,
          strategy,
        });
        setKCalcResult(res);
      } catch (err) {
        // Ignoră
      }
    };
    runKCalc();
  }, [kSi371, kSi378, kRc371, kRc378, draft.inventory_price_diff_strategy]);

  // Modificări nesalvate
  const isDirty = useMemo(() => {
    if (!settings || !draft) return false;
    return JSON.stringify(settings) !== JSON.stringify({ ...settings, ...draft });
  }, [settings, draft]);

  const handleFieldChange = (key: keyof CompanyOperationalSettings, value: any) => {
    setDraft(prev => ({
      ...prev,
      [key]: value,
    }));
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    if (!company || !isDirty || !settings) return;

    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      const updated = await api.updateOperationalSettings(company.id, {
        ...draft,
        version: settings.version, // optimistic locking check
      });
      setSettings(updated);
      setDraft(updated);
      setSaveSuccess(`Setările diverse au fost salvate cu succes pentru societatea "${company.name}".`);
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare la salvarea setărilor.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (settings) {
      setDraft(settings);
    }
    setSaveSuccess(null);
    setErrorMessage(null);
  };

  // Previzualizare descriere articol contabil automat
  const sampleAutoDescription = useMemo(() => {
    const parts: string[] = ['Factură fiscală'];
    if (draft.auto_desc_include_doc_number) parts.push('nr. FACT-2026-0042');
    if (draft.auto_desc_include_doc_date) parts.push('din 15.03.2026');
    if (draft.auto_desc_include_partner) parts.push('- ALFA DISTRIBUTION SRL');
    if (draft.auto_desc_include_item) parts.push('(Servicii consultanță contabilă)');
    return parts.join(' ');
  }, [draft]);

  const tabs: Array<{
    id: TabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'contabilitate', label: '1. Contabilitate', icon: Calculator },
    { id: 'facturare', label: '2. Facturare & Scadențe', icon: FileText },
    { id: 'filiale', label: '3. Filiale & Puncte de lucru', icon: Building },
    { id: 'gestiuni', label: '4. Gestiuni & Stocuri', icon: Layers },
    { id: 'productie', label: '5. Producție', icon: Factory },
    { id: 'rapoarte', label: '6. Rapoarte & Afișare', icon: Printer },
  ];

  if (!company) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-3">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Nicio societate activă selectată
        </h3>
        <p className="text-xs text-slate-500">
          Vă rugăm să selectați o societate pentru a putea configura parametrii operaționali.
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
      {/* Top Header & Breadcrumb */}
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
            <span className="text-slate-700 dark:text-slate-200 font-bold">Setări diverse</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 flex items-center gap-2">
            <span>Setări Diverse & Politici Operaționale</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
              v{settings?.version || 1}
            </span>
          </h1>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center flex-wrap gap-2">
          {isDirty && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 rounded-lg flex items-center gap-1.5 border border-amber-200 dark:border-amber-900 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Modificări nesalvate
            </span>
          )}

          {isDirty && (
            <button
              onClick={handleDiscard}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Anulează</span>
            </button>
          )}

          <button
            onClick={async () => {
              const h = await api.getSettingsHistory(company.id);
              setHistory(h);
              setHistoryModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <History className="w-3.5 h-3.5 text-amber-600" />
            <span>Jurnal istoric</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Se salvează...' : 'Salvare Setări'}</span>
          </button>
        </div>
      </div>

      {/* Active Company Card */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            {company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100">
              {company.name} <span className="font-mono text-slate-400 font-normal">({company.internal_code})</span>
            </div>
            <div className="text-[11px] text-slate-500">
              CUI: <strong className="font-mono text-slate-700 dark:text-slate-300">{company.fiscal_attribute ? `${company.fiscal_attribute} ` : ''}{company.cui}</strong>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-2">
          <span>Stare stocuri: <strong className={draft.inventory_module_enabled ? 'text-emerald-600' : 'text-slate-500'}>{draft.inventory_module_enabled ? 'Activat' : 'Dezactivat'}</strong></span>
          <span>•</span>
          <span>Filiale: <strong className={draft.has_branches ? 'text-blue-600' : 'text-slate-500'}>{draft.has_branches ? `${branches.length} puncte lucru` : 'Fără filiale'}</strong></span>
        </div>
      </div>

      {/* Feedback alerts */}
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

      {/* 6 Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content for Tabs */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          Se încarcă configurația operațională...
        </div>
      ) : (
        <div className="space-y-5">
          {/* ======================================================== */}
          {/* TAB 1: CONTABILITATE */}
          {/* ======================================================== */}
          {activeTab === 'contabilitate' && (
            <div className="space-y-5">
              {/* Mod închidere venituri și cheltuieli */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Mod de Închidere Venituri și Cheltuieli (Contul 121)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Stabilește periodicitatea automată pentru închiderea conturilor din clasa 6 și clasa 7 prin rezultatul exercițiului.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-3 ${
                    draft.closing_mode === 'MONTHLY'
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950'
                  }`}>
                    <input
                      type="radio"
                      name="closing_mode"
                      value="MONTHLY"
                      checked={draft.closing_mode === 'MONTHLY'}
                      onChange={() => handleFieldChange('closing_mode', 'MONTHLY')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Închidere lunară (Implicit / Standard)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Fiecare lună calendaristică va genera automat nota contabilă 121 = 6xx și 7xx = 121 la validarea închiderii de lună.
                      </div>
                    </div>
                  </label>

                  <label className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-3 ${
                    draft.closing_mode === 'QUARTERLY'
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950'
                  }`}>
                    <input
                      type="radio"
                      name="closing_mode"
                      value="QUARTERLY"
                      checked={draft.closing_mode === 'QUARTERLY'}
                      onChange={() => handleFieldChange('closing_mode', 'QUARTERLY')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Închidere trimestrială
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Motorul de închidere nu va genera închideri lunare de venituri și cheltuieli în lunile intermediare (1, 2, 4, 5, 7, 8, 10, 11).
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Descrierea articolelor contabile automate */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Formatul Descrierii Articolelor Contabile Automate
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Selectați elementele componente care vor fi incluse automat în descrierea fiecărei note contabile generate din facturi, bonuri și încasări.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.auto_desc_include_partner}
                      onChange={(e) => handleFieldChange('auto_desc_include_partner', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Include denumirea partenerului
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.auto_desc_include_item}
                      onChange={(e) => handleFieldChange('auto_desc_include_item', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Include denumirea articolului
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.auto_desc_include_doc_number}
                      onChange={(e) => handleFieldChange('auto_desc_include_doc_number', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Include numărul documentului
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.auto_desc_include_doc_date}
                      onChange={(e) => handleFieldChange('auto_desc_include_doc_date', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Include data documentului
                    </span>
                  </label>
                </div>

                {/* Previzualizare descriere */}
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-500">Previzualizare descriere notă generată:</span>
                  </div>
                  <div className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    "{sampleAutoDescription}"
                  </div>
                </div>
              </div>

              {/* Calcul pentru gestiuni global-valorice */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Calcul Coeficient K pentru Gestiuni Global-Valorice (Preț cu amănuntul)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configurați formula utilizată pentru descărcarea adaosului comercial (cont 378) și a TVA neexigibilă (cont 4428).
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={!!draft.inventory_price_diff_cumulative}
                      onChange={(e) => handleFieldChange('inventory_price_diff_cumulative', e.target.checked ? 1 : 0)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Folosește rulaje cumulate în calculul coeficientului de repartizare a diferențelor de preț
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Dacă este activat, coeficientul K se calculează luând în considerare soldul de la începutul anului și rulajele cumulate de la 1 ianuarie până în luna curentă conform OMFP 1802/2014.
                      </p>
                    </div>
                  </label>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className={`p-3 rounded-lg border cursor-pointer ${
                      draft.inventory_price_diff_strategy === 'CUMULATIVE_YEAR_START'
                        ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="diff_strat"
                        checked={draft.inventory_price_diff_strategy === 'CUMULATIVE_YEAR_START'}
                        onChange={() => handleFieldChange('inventory_price_diff_strategy', 'CUMULATIVE_YEAR_START')}
                        className="mr-2"
                      />
                      <span className="font-semibold">Rulaje cumulate de la începutul anului (Standard)</span>
                    </label>

                    <label className={`p-3 rounded-lg border cursor-pointer ${
                      draft.inventory_price_diff_strategy === 'MONTHLY_ISOLATED'
                        ? 'bg-blue-50/50 dark:bg-blue-950/40 border-blue-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="diff_strat"
                        checked={draft.inventory_price_diff_strategy === 'MONTHLY_ISOLATED'}
                        onChange={() => handleFieldChange('inventory_price_diff_strategy', 'MONTHLY_ISOLATED')}
                        className="mr-2"
                      />
                      <span className="font-semibold">Calcul strict pe baza rulajelor lunare</span>
                    </label>
                  </div>
                </div>

                {/* Simulator interactiv coeficient K */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-blue-600" />
                      Simulator Verificare Formulă Coeficient K:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {kCalcResult?.version}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500">Si 371 (Stoc inițial):</span>
                      <input
                        type="number"
                        value={kSi371}
                        onChange={(e) => setKSi371(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Si 378 (Diferențe inițiale):</span>
                      <input
                        type="number"
                        value={kSi378}
                        onChange={(e) => setKSi378(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Rc 371 (Intrări stoc):</span>
                      <input
                        type="number"
                        value={kRc371}
                        onChange={(e) => setKRc371(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Rc 378 (Adaos intrări):</span>
                      <input
                        type="number"
                        value={kRc378}
                        onChange={(e) => setKRc378(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">{kCalcResult?.formulaDescription}</span>
                    <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                      K = {kCalcResult?.kCoefficient} ({((kCalcResult?.kCoefficient || 0) * 100).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FACTURARE ȘI SCADENȚE */}
          {/* ======================================================== */}
          {activeTab === 'facturare' && (
            <div className="space-y-5">
              {/* Calculul Scadențelor & Zile de întârziere */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Reguli de Calcul pentru Scadențe și Întârzieri
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alegeți dacă termenele de plată se calculează în zile calendaristice sau în zile lucrătoare (excluzând weekend-urile și sărbătorile legale oficiale din România).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Scadență factură */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Calcul scadență facturi:
                    </span>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="due_mode"
                          checked={draft.due_date_mode === 'CALENDAR'}
                          onChange={() => handleFieldChange('due_date_mode', 'CALENDAR')}
                          className="text-blue-600"
                        />
                        <span>Zile calendaristice (Standard comercial)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="due_mode"
                          checked={draft.due_date_mode === 'WORKING_DAYS'}
                          onChange={() => handleFieldChange('due_date_mode', 'WORKING_DAYS')}
                          className="text-blue-600"
                        />
                        <span>Zile lucrătoare (Exclusiv Luni–Vineri fără sărbători)</span>
                      </label>
                    </div>
                  </div>

                  {/* Zile de întârziere */}
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Calcul zile de întârziere (Penalități):
                    </span>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="delay_mode"
                          checked={draft.delay_days_mode === 'CALENDAR'}
                          onChange={() => handleFieldChange('delay_days_mode', 'CALENDAR')}
                          className="text-blue-600"
                        />
                        <span>Zile calendaristice de depășire</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="delay_mode"
                          checked={draft.delay_days_mode === 'WORKING_DAYS'}
                          onChange={() => handleFieldChange('delay_days_mode', 'WORKING_DAYS')}
                          className="text-blue-600"
                        />
                        <span>Doar zile lucrătoare de depășire</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Simulator interactiv de scadență */}
                <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Test Interactiv: calculateDueDate(issueDate, numberOfDays, mode)
                    </span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono px-2 py-0.5 rounded">
                      Mod activ: {draft.due_date_mode === 'WORKING_DAYS' ? 'Zile lucrătoare' : 'Zile calendaristice'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500">Data emiterii facturii:</span>
                      <input
                        type="date"
                        value={testIssueDate}
                        onChange={(e) => setTestIssueDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Termen plată (zile):</span>
                      <input
                        type="number"
                        value={testDays}
                        onChange={(e) => setTestDays(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Data curentă (referință):</span>
                      <input
                        type="date"
                        value={testRefDate}
                        onChange={(e) => setTestRefDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-xs">
                        <div className="text-[10px] text-slate-400">Scadență calculată:</div>
                        <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {testDueDateResult}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Întârziere: <strong className={testDelayResult > 0 ? 'text-rose-600' : 'text-slate-600'}>{testDelayResult} zile</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculul vânzărilor din prețul cu TVA (Aritmetică zecimală exactă) */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Calculul Vânzărilor din Prețul cu TVA (Calcul Invers)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pentru comerțul cu amănuntul sau facturile emise la preț final brut, sistemul determină baza impozabilă și TVA prin descompunere zecimală exactă.
                  </p>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={!!draft.vat_inclusive_calculation}
                    onChange={(e) => handleFieldChange('vat_inclusive_calculation', e.target.checked ? 1 : 0)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Calculează valoarea facturii pornind de la prețul final cu TVA
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Permite introducerea prețului cu TVA inclus pe liniile de factură, baza și TVA-ul fiind calculate automat cu garanția egalității matematice exacte Bază + TVA = Brut.
                    </p>
                  </div>
                </label>

                {/* Simulator interactiv preț cu TVA */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Motor Aritmetic Zecimal Exact (calculateFromGrossPrice):
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Fără erori de virgulă mobilă
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500">Valoare totală brută (cu TVA):</span>
                      <input
                        type="number"
                        step="0.01"
                        value={testGrossAmount}
                        onChange={(e) => setTestGrossAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500">Cotă TVA aplicabilă (%):</span>
                      <select
                        value={testVatRate}
                        onChange={(e) => setTestVatRate(parseFloat(e.target.value))}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
                      >
                        <option value={19}>19% (Standard)</option>
                        <option value={9}>9% (Redusă - alimente, medicamente)</option>
                        <option value={5}>5% (Redusă - cărți, lemne foc)</option>
                        <option value={0}>0% (Scutit cu drept de deducere)</option>
                      </select>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Bază impozabilă (Net):</span>
                        <strong className="font-mono text-slate-900 dark:text-slate-100">{testGrossCalcResult?.netAmount?.toFixed(2)} RON</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Valoare TVA:</span>
                        <strong className="font-mono text-blue-600">{testGrossCalcResult?.vatAmount?.toFixed(2)} RON</strong>
                      </div>
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[11px] font-bold">
                        <span>Total reconciliat:</span>
                        <span className="font-mono text-emerald-600">{testGrossCalcResult?.grossAmount?.toFixed(2)} RON</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: FILIALE ȘI PUNCTE DE LUCRU */}
          {/* ======================================================== */}
          {activeTab === 'filiale' && (
            <div className="space-y-5">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Evidență Filiale și Puncte de Lucru
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gestionați sucursalele, magazinele și depozitele secundare cu indice unic de identificare și tratament fiscal D112.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingBranch(null);
                      setBranchModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Adaugă punct de lucru</span>
                  </button>
                </div>

                <label className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={!!draft.has_branches}
                    onChange={(e) => handleFieldChange('has_branches', e.target.checked ? 1 : 0)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Societatea are filiale sau puncte de lucru active
                  </span>
                </label>

                {/* Tabel Puncte de Lucru */}
                {branches.length === 0 ? (
                  <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Building className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">
                      Nu există puncte de lucru configurate încă pentru această societate.
                    </p>
                    <button
                      onClick={() => {
                        setEditingBranch(null);
                        setBranchModalOpen(true);
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Configurează primul punct de lucru
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 text-[11px] border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Cod Intern</th>
                          <th className="py-2.5 px-2 text-center">Indice</th>
                          <th className="py-2.5 px-3">Denumire Punct Lucru</th>
                          <th className="py-2.5 px-3">CUI Secundar</th>
                          <th className="py-2.5 px-3">Localitate / Județ</th>
                          <th className="py-2.5 px-3">Tratament D112</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {branches.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                              {b.internal_code}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {b.branch_index}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {b.name}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                              {b.cui || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">
                              {b.city ? `${b.city}, ${b.county}` : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              {b.d112_separate_taxation === 1 ? (
                                <span className="text-[10px] bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded border border-purple-200 dark:border-purple-900">
                                  D112 Separat (&gt;5 salariați)
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Standard</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded">
                                Activ
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBranch(b);
                                    setBranchModalOpen(true);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded cursor-pointer"
                                  title="Editează"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(`Sigur ștergeți punctul de lucru "${b.name}"?`)) {
                                      await api.deleteBranch(company.id, b.id);
                                      loadData();
                                    }
                                  }}
                                  className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded cursor-pointer"
                                  title="Șterge"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: GESTIUNI ȘI STOCURI */}
          {/* ======================================================== */}
          {activeTab === 'gestiuni' && (
            <div className="space-y-5">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Modulul de Stocuri și Politici Cantitativ-Valorice
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controlul comportamentului operațional pentru gestiuni, articole, loturi și mișcări de magazie.
                  </p>
                </div>

                {/* Activare modul stocuri */}
                <div className={`p-4 rounded-xl border transition-colors ${
                  draft.inventory_module_enabled
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={!!draft.inventory_module_enabled}
                      onChange={(e) => handleFieldChange('inventory_module_enabled', e.target.checked ? 1 : 0)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        Activează modulul de stocuri pentru această societate
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Dacă este debifat, meniurile operaționale de stocuri (intrări stoc, bonuri de consum, transferuri, producție) sunt ascunse, datele istorice fiind păstrate intacte fără posibilitate de creare operațiuni noi.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Politica privind stocurile negative */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Politica privind stocurile negative la descărcare / vânzare:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className={`p-3 rounded-lg border cursor-pointer ${
                      draft.negative_stocks_policy === 'BLOCK'
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="neg_stock"
                        checked={draft.negative_stocks_policy === 'BLOCK'}
                        onChange={() => handleFieldChange('negative_stocks_policy', 'BLOCK')}
                        className="mr-2"
                      />
                      <span className="font-semibold">Blochează ieșirile care generează stoc negativ (Recomandat)</span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Nu permite validarea avizelor sau facturilor dacă stocul disponibil este insuficient.
                      </p>
                    </label>

                    <label className={`p-3 rounded-lg border cursor-pointer ${
                      draft.negative_stocks_policy === 'ALLOW_WITH_PERMISSION'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}>
                      <input
                        type="radio"
                        name="neg_stock"
                        checked={draft.negative_stocks_policy === 'ALLOW_WITH_PERMISSION'}
                        onChange={() => handleFieldChange('negative_stocks_policy', 'ALLOW_WITH_PERMISSION')}
                        className="mr-2"
                      />
                      <span className="font-semibold">Permite stoc negativ conform politicii cu avertisment</span>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Permite operarea temporară cu regularizare automată la recepția ulterioară.
                      </p>
                    </label>
                  </div>
                </div>

                {/* Opțiuni suplimentare stocuri */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.filter_items_by_warehouse}
                      onChange={(e) => handleFieldChange('filter_items_by_warehouse', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Afișează numai articolele relevante pentru gestiunea selectată
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.suggest_last_client_price}
                      onChange={(e) => handleFieldChange('suggest_last_client_price', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Propune ultimul preț practicat pentru clientul selectat
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.track_batches_and_expiry}
                      onChange={(e) => handleFieldChange('track_batches_and_expiry', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Activează urmărirea stocurilor pe loturi și date de expirare
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.explicit_inter_warehouse_accounting}
                      onChange={(e) => handleFieldChange('explicit_inter_warehouse_accounting', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Contabilizare explicită a transferurilor între gestiuni
                    </span>
                  </label>
                </div>

                {/* Data notelor contabile de descărcare a stocului */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Data notelor contabile de descărcare a stocului (607/601 = 371/301):
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cogs_date"
                        checked={draft.cogs_accounting_date_mode === 'OPERATION_DATE'}
                        onChange={() => handleFieldChange('cogs_accounting_date_mode', 'OPERATION_DATE')}
                        className="text-blue-600"
                      />
                      <span>Data fiecărei operațiuni individuale</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cogs_date"
                        checked={draft.cogs_accounting_date_mode === 'MONTH_END'}
                        onChange={() => handleFieldChange('cogs_accounting_date_mode', 'MONTH_END')}
                        className="text-blue-600"
                      />
                      <span>Ultima zi a perioadei de închidere lunară</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: PRODUCȚIE */}
          {/* ======================================================== */}
          {activeTab === 'productie' && (
            <div className="space-y-5">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Parametrii Modulului de Producție
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configurații specifice pentru activitățile de prelucrare, fabricație și consumuri de materii prime.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.production_long_cycle}
                      onChange={(e) => handleFieldChange('production_long_cycle', e.target.checked ? 1 : 0)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Producție cu ciclu de execuție mai lung de o lună
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Activează suportul pentru ordine de producție deschise, producție neterminată la sfârșitul lunii (cont 331 / 711) și colectarea costurilor pe mai multe perioade fiscale.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.production_variable_output}
                      onChange={(e) => handleFieldChange('production_variable_output', e.target.checked ? 1 : 0)}
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        Producție cu randament variabil (cantitate necunoscută inițial)
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Permite lansarea ordinelor de producție fără a impune o cantitate finită fixă la pornire, cantitatea recepționată fiind înregistrată la finalul procesului tehnologic.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: RAPOARTE ȘI AFIȘARE */}
          {/* ======================================================== */}
          {activeTab === 'rapoarte' && (
            <div className="space-y-5">
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Preferințe de Generare și Afișare Rapoarte
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configurați elementele care apar pe documentele tipărite, balanțe, jurnale TVA și rapoarte de gestiune.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.report_show_date}
                      onChange={(e) => handleFieldChange('report_show_date', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600"
                    />
                    <span>Afișează data generării</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.report_show_time}
                      onChange={(e) => handleFieldChange('report_show_time', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600"
                    />
                    <span>Afișează ora generării</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.report_show_page_number}
                      onChange={(e) => handleFieldChange('report_show_page_number', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600"
                    />
                    <span>Afișează numărul paginii</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.report_show_company_name}
                      onChange={(e) => handleFieldChange('report_show_company_name', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600"
                    />
                    <span>Afișează societatea activă</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!draft.report_show_period}
                      onChange={(e) => handleFieldChange('report_show_period', e.target.checked ? 1 : 0)}
                      className="rounded text-blue-600"
                    />
                    <span>Afișează perioada raportată</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Format afișare dată
                    </label>
                    <select
                      value={draft.report_date_format || 'DD.MM.YYYY'}
                      onChange={(e) => handleFieldChange('report_date_format', e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono"
                    >
                      <option value="DD.MM.YYYY">ZZ.LL.AAAA (ex: 15.03.2026)</option>
                      <option value="YYYY-MM-DD">AAAA-LL-ZZ (ex: 2026-03-15)</option>
                      <option value="DD/MM/YYYY">ZZ/LL/AAAA (ex: 15/03/2026)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Precizie monetară zecimală
                    </label>
                    <select
                      value={draft.report_currency_precision || 2}
                      onChange={(e) => handleFieldChange('report_currency_precision', parseInt(e.target.value, 10))}
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-mono"
                    >
                      <option value={2}>2 zecimale (0,00 RON) — Standard comercial</option>
                      <option value={4}>4 zecimale (0,0000 RON) — Înaltă precizie (producție/valute)</option>
                    </select>
                  </div>
                </div>

                {/* Previzualizare antet raport */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Previzualizare Antet Tipăritură:
                  </span>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-slate-800 dark:text-slate-200 font-bold">
                      <span>{draft.report_show_company_name ? company.name : ''}</span>
                      <span>{draft.report_show_page_number ? 'Pagina: 1 din 4' : ''}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{draft.report_show_period ? 'Perioada: 01.01.2026 - 31.01.2026' : ''}</span>
                      <span>
                        {draft.report_show_date ? 'Generat la: 15.03.2026 ' : ''}
                        {draft.report_show_time ? '14:35:20' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch Modal */}
      <BranchModal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        companyId={company.id}
        editingBranch={editingBranch}
        onSaved={loadData}
      />

      {/* History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Jurnal Istoric Modificări Setări Diverse
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
              {history.length === 0 ? (
                <div className="py-8 text-center text-slate-400">Nu există înregistrări în istoric.</div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-blue-600">{h.setting_type} (v{h.version})</span>
                      <span>{new Date(h.changed_at).toLocaleString('ro-RO')} de {h.changed_by_name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg text-xs font-semibold"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
