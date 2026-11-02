import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  BookOpen,
  Save,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Upload,
  Download,
  History,
  Users,
  Info,
  Copy,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  BatchType,
  CompanyDetailed,
  OpeningBalanceLine,
  OpeningBatch,
  OpeningVerificationResult,
} from '../../types/company';
import { AnalyticAccountModal } from '../accounting/AnalyticAccountModal';
import { CurrencyDetailsModal } from './CurrencyDetailsModal';
import { OpeningImportModal } from './OpeningImportModal';
import { OpeningCounterpartiesPanel } from './OpeningCounterpartiesPanel';
import { OpeningHistoryModal } from './OpeningHistoryModal';
import { RedistributeModal } from './RedistributeModal';
import { CompanyCopyModal } from './CompanyCopyModal';

// =========================================================================
// CONSTANTE
// =========================================================================

const RO_MONTHS = [
  'Ianuarie',
  'Februarie',
  'Martie',
  'Aprilie',
  'Mai',
  'Iunie',
  'Iulie',
  'August',
  'Septembrie',
  'Octombrie',
  'Noiembrie',
  'Decembrie',
];

const BATCH_TYPES: { id: BatchType; label: string }[] = [
  { id: 'NO_ACTIVITY', label: 'Fără activitate' },
  { id: 'YEAR_START', label: 'La început de an' },
  { id: 'DURING_YEAR', label: 'În cursul anului' },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Ciornă',
  IN_VERIFICATION: 'În verificare',
  VALIDATED: 'Validat',
};

// Exercițiile fiscale disponibile în selectorul din antet: an curent −2 … +1
const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, index) => CURRENT_YEAR - 2 + index);

// =========================================================================
// HELPERE NUMERICE / FORMATARE
// =========================================================================

const toNum = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const raw = typeof value === 'number' ? String(value) : String(value).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const isNumericOrEmpty = (value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '') return true;
  return /^-?\d+([.,]\d+)?$/.test(trimmed);
};

const fmt = (value: number): string =>
  new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const fmtCell = (value: number | string): string => {
  const n = toNum(value);
  return n === 0 ? '' : fmt(n);
};

const describeApiError = (err: any): string => {
  const status = err?.status;
  const code = err?.code;
  const message = err?.message || 'Eroare necunoscută';
  if (code === 'CONFLICT' || status === 409) {
    return `Conflict de versiune: datele au fost modificate între timp. Reîncărcați preluarea și reluați. (${message})`;
  }
  if (code === 'SUBSEQUENT_OPERATIONS') {
    return `Nu se poate modifica preluarea: există deja operațiuni ulterioare înregistrate în perioadă. (${message})`;
  }
  if (code === 'FORBIDDEN' || status === 403) {
    return `Nu aveți dreptul să efectuați această operațiune. (${message})`;
  }
  if (code === 'VALIDATION' || status === 400) {
    return `Date invalide: ${message}`;
  }
  return message;
};

// =========================================================================
// TIPURI LOCALE
// =========================================================================

interface OpeningBalanceViewProps {
  company: CompanyDetailed | null;
  onNavigateToCompanies: () => void;
}

interface EditableAmounts {
  debit_initial: string;
  credit_initial: string;
  debit_prev: string;
  credit_prev: string;
  notes: string;
}

interface CurrencyEdit {
  currency: string;
  currency_amount: number;
  exchange_rate: number;
  exchange_rate_date: string | null;
}

type AmountField = 'debit_initial' | 'credit_initial' | 'debit_prev' | 'credit_prev';

const AMOUNT_FIELDS: AmountField[] = ['debit_initial', 'credit_initial', 'debit_prev', 'credit_prev'];

const EMPTY_EDIT = (line: OpeningBalanceLine): EditableAmounts => ({
  debit_initial: toNum(line.debit_initial) ? String(line.debit_initial) : '',
  credit_initial: toNum(line.credit_initial) ? String(line.credit_initial) : '',
  debit_prev: toNum(line.debit_prev) ? String(line.debit_prev) : '',
  credit_prev: toNum(line.credit_prev) ? String(line.credit_prev) : '',
  notes: line.notes ?? '',
});

// =========================================================================
// COMPONENTĂ
// =========================================================================

export function OpeningBalanceView({ company, onNavigateToCompanies }: OpeningBalanceViewProps) {
  const companyId = company?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [batch, setBatch] = useState<OpeningBatch | null>(null);
  const [lines, setLines] = useState<OpeningBalanceLine[]>([]);
  const [verification, setVerification] = useState<OpeningVerificationResult | null>(null);
  const [subsequentOperations, setSubsequentOperations] = useState(0);
  const [notes, setNotes] = useState('');
  const [editedValues, setEditedValues] = useState<Record<number, EditableAmounts>>({});
  const [currencyEdits, setCurrencyEdits] = useState<Record<number, CurrencyEdit>>({});
  const [currencies, setCurrencies] = useState<string[]>(['RON']);

  const [activeTab, setActiveTab] = useState<'solduri' | 'terti'>('solduri');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [redistributeLine, setRedistributeLine] = useState<OpeningBalanceLine | null>(null);

  const [currencyModalLine, setCurrencyModalLine] = useState<OpeningBalanceLine | null>(null);
  const [analyticModal, setAnalyticModal] = useState<{ isOpen: boolean; parentSymbol: string }>({
    isOpen: false,
    parentSymbol: '',
  });

  const [setupForm, setSetupForm] = useState<{
    fiscal_year: number;
    start_month: number;
    batch_type: BatchType;
  }>({
    fiscal_year: new Date().getFullYear(),
    start_month: 1,
    batch_type: 'YEAR_START',
  });

  const [fiscalYear, setFiscalYear] = useState<number>(new Date().getFullYear());

  const readOnly = batch?.status === 'VALIDATED';

  // ---------------------------------------------------------------- încărcare

  const applyResult = useCallback(
    (data: { batch?: OpeningBatch | null; lines?: OpeningBalanceLine[]; verification?: OpeningVerificationResult | null }) => {
      if (data.batch !== undefined) setBatch(data.batch ?? null);
      if (data.lines !== undefined) setLines(data.lines ?? []);
      if (data.verification !== undefined) setVerification(data.verification ?? null);
      if (data.batch) setNotes(data.batch.notes ?? '');
      setEditedValues({});
      setCurrencyEdits({});
    },
    []
  );

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOpeningBalance(companyId, fiscalYear);
      applyResult(data);
      setSubsequentOperations(data.subsequent_operations ?? 0);
      setCurrencies(data.currencies ?? ['RON']);
    } catch (err: any) {
      if (err?.status === 404) {
        setBatch(null);
        setLines([]);
        setVerification(null);
        setSubsequentOperations(0);
        setEditedValues({});
        setCurrencyEdits({});
      } else {
        setError(describeApiError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [companyId, fiscalYear, applyResult]);

  useEffect(() => {
    void load();
  }, [load]);

  // ---------------------------------------------------------------- setup

  const handleSetup = async () => {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.setupOpeningBalance(companyId, {
        fiscal_year: fiscalYear,
        start_month: setupForm.start_month,
        batch_type: setupForm.batch_type,
        version: batch?.version ?? 0,
      });
      applyResult(data);
      setSubsequentOperations(0);
      setNotice('Preluarea datelor contabile a fost configurată.');
    } catch (err: any) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------- acțiuni batch

  const handleVerify = async () => {
    if (!companyId || !batch) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.verifyOpeningBalance(companyId, batch.id);
      setVerification(data.verification);
      if (data.batch) setBatch(data.batch);
      setNotice(
        data.verification.isValid
          ? 'Verificare finalizată: preluarea este echilibrată.'
          : 'Verificare finalizată: există neconcordanțe semnalate mai jos.'
      );
    } catch (err: any) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!companyId || !batch) return;
    if (subsequentOperations > 0) {
      setError(
        `Nu se poate valida preluarea: există ${subsequentOperations} operațiuni ulterioare înregistrate în perioadă.`
      );
      return;
    }
    const confirmed = window.confirm(
      `Validați preluarea pentru exercițiul ${batch.fiscal_year}? După validare soldurile devin read-only.`
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.validateOpeningBalance(companyId, batch.id, batch.version);
      if (data.batch) setBatch(data.batch);
      await load();
      setNotice('Preluarea a fost validată cu succes.');
    } catch (err: any) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleInvalidate = async () => {
    if (!companyId || !batch) return;
    const reason = window.prompt('Motivul invalidării preluării:');
    if (!reason || !reason.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.invalidateOpeningBalance(companyId, batch.id, reason.trim());
      if (data.batch) setBatch(data.batch);
      await load();
      setNotice('Validarea a fost anulată; preluarea poate fi modificată din nou.');
    } catch (err: any) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------- editare linii

  const handleAmountChange = (line: OpeningBalanceLine, field: AmountField, value: string) => {
    setEditedValues((prev) => {
      const current = prev[line.account_id] ?? EMPTY_EDIT(line);
      return { ...prev, [line.account_id]: { ...current, [field]: value } };
    });
  };

  const handleCurrencySave = (
    currency: string,
    currencyAmount: number,
    exchangeRate: number,
    exchangeRateDate: string | null
  ) => {
    const line = currencyModalLine;
    if (!line) return;
    setCurrencyEdits((prev) => ({
      ...prev,
      [line.account_id]: {
        currency,
        currency_amount: currencyAmount,
        exchange_rate: exchangeRate,
        exchange_rate_date: exchangeRateDate,
      },
    }));
    setLines((prev) =>
      prev.map((l) =>
        l.account_id === line.account_id
          ? { ...l, currency, currency_amount: currencyAmount, exchange_rate: exchangeRate, exchange_rate_date: exchangeRateDate }
          : l
      )
    );
    setCurrencyModalLine(null);
  };

  const effectiveAmounts = (line: OpeningBalanceLine) => {
    const edit = editedValues[line.account_id];
    return {
      debit_initial: edit ? toNum(edit.debit_initial) : toNum(line.debit_initial),
      credit_initial: edit ? toNum(edit.credit_initial) : toNum(line.credit_initial),
      debit_prev: edit ? toNum(edit.debit_prev) : toNum(line.debit_prev),
      credit_prev: edit ? toNum(edit.credit_prev) : toNum(line.credit_prev),
    };
  };

  const soldFor = (amounts: { debit_initial: number; credit_initial: number; debit_prev: number; credit_prev: number }) => {
    const net = amounts.debit_initial + amounts.debit_prev - amounts.credit_initial - amounts.credit_prev;
    return net >= 0 ? { sold_d: net, sold_c: 0 } : { sold_d: 0, sold_c: -net };
  };

  const needsDistribution = (line: OpeningBalanceLine): boolean => {
    if (line.has_analytics !== true) return false;
    if (line.is_synthetic_summary === true) return false;
    if (line.account_type !== 'SYNTHETIC') return false;
    const amounts = effectiveAmounts(line);
    return AMOUNT_FIELDS.some((field) => amounts[field] !== 0);
  };

  /**
   * Liniile descendente frunză ale unui cont: se urcă pe `parent_symbol`, iar când
   * ierarhia nu este disponibilă se recurge la prefixul simbolului.
   */
  const descendantLeafLines = (parent: OpeningBalanceLine): OpeningBalanceLine[] => {
    const bySymbol = new Map<string, OpeningBalanceLine>();
    lines.forEach((line) => bySymbol.set(line.account_symbol, line));

    const isDescendant = (line: OpeningBalanceLine): boolean => {
      const visited = new Set<number>();
      let cursor: OpeningBalanceLine | undefined = line;
      while (cursor && !visited.has(cursor.account_id)) {
        visited.add(cursor.account_id);
        const parentSymbol = cursor.parent_symbol;
        if (!parentSymbol) break;
        if (parentSymbol === parent.account_symbol) return true;
        cursor = bySymbol.get(parentSymbol);
      }
      return (
        line.account_symbol !== parent.account_symbol &&
        line.account_symbol.startsWith(parent.account_symbol)
      );
    };

    return lines.filter((line) => {
      if (line.account_id === parent.account_id) return false;
      if (line.is_synthetic_summary === true) return false;
      if (line.has_analytics === true) return false;
      return isDescendant(line);
    });
  };

  const inputValue = (line: OpeningBalanceLine, field: AmountField): string => {
    const edit = editedValues[line.account_id];
    if (edit) return edit[field];
    return toNum(line[field]) ? String(line[field]) : '';
  };

  // ---------------------------------------------------------------- totaluri

  const totals = lines.reduce(
    (acc, line) => {
      // rândurile sumar nu se însumează suplimentar (valorile lor sunt deja pe rândurile componente)
      if (line.is_synthetic_summary === true) return acc;
      const amounts = effectiveAmounts(line);
      const sold = soldFor(amounts);
      acc.debit_initial += amounts.debit_initial;
      acc.credit_initial += amounts.credit_initial;
      acc.debit_prev += amounts.debit_prev;
      acc.credit_prev += amounts.credit_prev;
      acc.sold_d += sold.sold_d;
      acc.sold_c += sold.sold_c;
      return acc;
    },
    { debit_initial: 0, credit_initial: 0, debit_prev: 0, credit_prev: 0, sold_d: 0, sold_c: 0 }
  );

  const diffInitial = totals.debit_initial - totals.credit_initial;
  const diffPrev = totals.debit_prev - totals.credit_prev;
  const diffSold = totals.sold_d - totals.sold_c;
  const isBalanced = Math.abs(diffInitial) < 0.005 && Math.abs(diffPrev) < 0.005 && Math.abs(diffSold) < 0.005;

  const diffCell = (value: number) => {
    const zero = Math.abs(value) < 0.005;
    return (
      <span className={zero ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
        {zero ? '0,00' : fmt(value)}
      </span>
    );
  };

  // ---------------------------------------------------------------- salvare

  const dirtyIds = Array.from(
    new Set([...Object.keys(editedValues).map((k) => Number(k)), ...Object.keys(currencyEdits).map((k) => Number(k))])
  );

  // ---------------------------------------------------------------- export fișier

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!companyId || !batch) return;
    if (dirtyIds.length > 0) {
      setError(`Salvați întâi modificările: există ${dirtyIds.length} valori nesalvate.`);
      return;
    }
    setShowExport(false);
    setError(null);
    try {
      await api.downloadOpeningExport(companyId, batch.id, format);
    } catch (err: any) {
      setError(describeApiError(err));
    }
  };

  // ---------------------------------------------------------------- exercițiu fiscal

  const handleFiscalYearChange = (year: number) => {
    if (year === fiscalYear) return;
    if (dirtyIds.length > 0) {
      const confirmed = window.confirm(
        `Există ${dirtyIds.length} modificări nesalvate pentru exercițiul ${fiscalYear}. Dacă schimbați exercițiul fiscal, acestea se vor pierde. Continuați?`
      );
      if (!confirmed) return;
    }
    setFiscalYear(year);
  };

  const handleSave = async () => {
    if (!companyId || !batch) return;
    if (readOnly) {
      setError('Preluarea este validată și nu mai poate fi modificată. Anulați validarea pentru a o edita.');
      return;
    }
    if (dirtyIds.length === 0) {
      setNotice('Nu există modificări de salvat.');
      return;
    }
    const invalidId = dirtyIds.find((id) => {
      const edit = editedValues[id];
      if (!edit) return false;
      return AMOUNT_FIELDS.some((field) => !isNumericOrEmpty(edit[field]));
    });
    if (invalidId) {
      setError('Există valori numerice invalide. Verificați sumele introduse (separator zecimal „,” sau „.”).');
      return;
    }

    const payloadLines: Array<Record<string, any>> = [];
    dirtyIds.forEach((accountId) => {
      const line = lines.find((l) => l.account_id === accountId);
      if (!line) return;
      const edit = editedValues[accountId];
      const currencyEdit = currencyEdits[accountId];
      payloadLines.push({
        account_id: line.account_id,
        account_symbol: line.account_symbol,
        // valorile se trimit ca stringuri (acceptat de server)
        debit_initial: (edit ? edit.debit_initial || '0' : line.debit_initial) as any,
        credit_initial: (edit ? edit.credit_initial || '0' : line.credit_initial) as any,
        debit_prev: (edit ? edit.debit_prev || '0' : line.debit_prev) as any,
        credit_prev: (edit ? edit.credit_prev || '0' : line.credit_prev) as any,
        ...(currencyEdit
          ? {
              currency: currencyEdit.currency,
              currency_amount: currencyEdit.currency_amount as any,
              exchange_rate: currencyEdit.exchange_rate as any,
              exchange_rate_date: currencyEdit.exchange_rate_date,
            }
          : {}),
        notes: edit ? edit.notes : line.notes,
      });
    });

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.saveOpeningBalance(companyId, {
        batch_id: batch.id,
        batch_type: batch.batch_type,
        start_month: batch.start_month,
        notes,
        version: batch.version,
        lines: payloadLines,
      } as any);
      applyResult(data);
      setNotice(`Preluarea a fost salvată (versiunea ${data.version}).`);
    } catch (err: any) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Șterge soldurile introduse direct pe contul sintetic atunci când acestea se
   * suprapun cu analiticele. Se trimit doar valorile zero pentru linia sintetică.
   */
  const handleClearSynthetic = async (target: OpeningBalanceLine) => {
    if (!companyId || !batch) return;
    if (readOnly) {
      setError('Preluarea este validată și nu mai poate fi modificată. Anulați validarea pentru a o edita.');
      return;
    }
    if (dirtyIds.length > 0) {
      setError(`Salvați întâi modificările: există ${dirtyIds.length} valori nesalvate.`);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const data = await api.saveOpeningBalance(companyId, {
        batch_id: batch.id,
        batch_type: batch.batch_type,
        start_month: batch.start_month,
        notes,
        version: batch.version,
        lines: [
          {
            account_id: target.account_id,
            account_symbol: target.account_symbol,
            debit_initial: '0',
            credit_initial: '0',
            debit_prev: '0',
            credit_prev: '0',
          },
        ],
      } as any);
      applyResult(data);
      setNotice(`Soldul introdus direct pe ${target.account_symbol} a fost șters (versiunea ${data.version}).`);
    } catch (err: any) {
      setError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------- guard

  if (!company) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-3">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Nicio societate activă selectată
        </h3>
        <p className="text-xs text-slate-500">
          Vă rugăm să selectați sau să creați o societate pentru a putea prelua soldurile contabile.
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

  // ---------------------------------------------------------------- render

  return (
    <div className="space-y-5">
      {/* Bară de titlu și acțiuni */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Solduri de preluare
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {company.name} · exercițiu {fiscalYear} ·{' '}
            {RO_MONTHS[(batch ? batch.start_month : setupForm.start_month) - 1]}
            {batch && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {STATUS_LABELS[batch.status] ?? batch.status} · v{batch.version}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span>Exercițiu</span>
            <select
              value={fiscalYear}
              onChange={(e) => handleFiscalYearChange(Number(e.target.value))}
              disabled={loading || saving}
              className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              {FISCAL_YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => setShowImport((v) => !v)}
            disabled={
              !batch ||
              batch.batch_type === 'NO_ACTIVITY' ||
              readOnly ||
              batch.setup_completed === 0 ||
              dirtyIds.length > 0
            }
            title={
              !batch
                ? 'Configurați mai întâi preluarea soldurilor.'
                : batch.batch_type === 'NO_ACTIVITY'
                  ? 'Societatea fără activitate nu are solduri de preluare.'
                  : readOnly
                    ? 'Preluarea este validată — câmpurile sunt read-only.'
                    : batch.setup_completed === 0
                      ? 'Finalizați configurarea preluării înainte de import.'
                      : dirtyIds.length > 0
                        ? `Salvați cele ${dirtyIds.length} modificări nesalvate înainte de import.`
                        : 'Importați soldurile de preluare din fișier CSV / XLSX'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            onClick={() => setShowCopy(true)}
            disabled={
              !batch ||
              batch.batch_type === 'NO_ACTIVITY' ||
              readOnly ||
              batch.setup_completed === 0 ||
              dirtyIds.length > 0
            }
            title={
              !batch
                ? 'Configurați mai întâi preluarea soldurilor.'
                : batch.batch_type === 'NO_ACTIVITY'
                  ? 'Societatea fără activitate nu are solduri de preluare.'
                  : readOnly
                    ? 'Preluarea este validată — câmpurile sunt read-only.'
                    : batch.setup_completed === 0
                      ? 'Finalizați configurarea preluării înainte de preluarea din altă societate.'
                      : dirtyIds.length > 0
                        ? `Salvați cele ${dirtyIds.length} modificări nesalvate înainte de preluare.`
                        : 'Preluați balanța de pornire din altă societate'
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            Preluare din altă societate
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExport((v) => !v)}
              disabled={!batch || dirtyIds.length > 0}
              title={
                !batch
                  ? 'Configurați mai întâi preluarea soldurilor.'
                  : dirtyIds.length > 0
                    ? 'Salvați întâi modificările'
                    : 'Exportați soldurile de preluare'
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            {showExport && batch && (
              <div className="absolute right-0 mt-1 z-20 w-40 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                <button
                  onClick={() => void handleExport('csv')}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  CSV
                </button>
                <button
                  onClick={() => void handleExport('xlsx')}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Excel (XLSX)
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <History className="w-3.5 h-3.5" />
            Istoric
          </button>
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Reîncarcă
          </button>
          {batch && (
            <>
              <button
                onClick={() => void handleVerify()}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Verifică
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || readOnly}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Salvează{dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ''}
              </button>
              {batch.status === 'VALIDATED' ? (
                <button
                  onClick={() => void handleInvalidate()}
                  disabled={saving || subsequentOperations > 0}
                  title={
                    subsequentOperations > 0
                      ? 'Există operațiuni contabile ulterioare. Corectarea balanței necesită un flux contabil controlat.'
                      : 'Anulați validarea preluării'
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:opacity-50"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  Anulează validarea
                </button>
              ) : (
                <button
                  onClick={() => void handleValidate()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Validează
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Alerte */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}
      {batch?.status === 'VALIDATED' && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="space-y-0.5">
            <span className="block">
              Balanța de pornire este validată. Societatea este pregătită pentru operare contabilă. Valorile nu mai pot fi
              modificate direct.
            </span>
            {batch.validated_by_name && (
              <span className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Validat de {batch.validated_by_name}
                {batch.validated_at ? ` la ${new Date(batch.validated_at).toLocaleDateString('ro-RO')}` : ''}
              </span>
            )}
          </span>
        </div>
      )}
      {subsequentOperations > 0 && !readOnly && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Există {subsequentOperations} operațiuni înregistrate după perioada de preluare — validarea și modificarea
            soldurilor pot fi restricționate.
          </span>
        </div>
      )}

      {/* Modale: import / istoric / copiere societate / repartizare */}
      {batch && (
        <OpeningImportModal
          isOpen={showImport}
          onClose={() => setShowImport(false)}
          companyId={company.id}
          batch={batch}
          onImported={(r) => applyResult(r)}
        />
      )}
      {batch && (
        <OpeningHistoryModal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          companyId={company.id}
          batchId={batch.id}
        />
      )}
      {batch && (
        <CompanyCopyModal
          isOpen={showCopy}
          onClose={() => setShowCopy(false)}
          companyId={company.id}
          batch={batch}
          onDone={(r) => {
            applyResult(r);
            if (r.note) setNotice(r.note);
          }}
        />
      )}
      {batch && redistributeLine && (
        <RedistributeModal
          isOpen
          onClose={() => setRedistributeLine(null)}
          companyId={company.id}
          batch={batch}
          parentLine={redistributeLine}
          childLines={descendantLeafLines(redistributeLine)}
          onDone={(r) => applyResult(r)}
        />
      )}

      {/* Bara de taburi */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('solduri')}
          className={`px-4 py-2 text-xs font-semibold -mb-px border-b-2 ${
            activeTab === 'solduri'
              ? 'border-blue-600 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Solduri de preluare
        </button>
        <button
          onClick={() => setActiveTab('terti')}
          className={`px-4 py-2 text-xs font-semibold -mb-px border-b-2 flex items-center gap-1.5 ${
            activeTab === 'terti'
              ? 'border-blue-600 text-blue-700 dark:text-blue-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Solduri terți la preluare
        </button>
      </div>

      {activeTab === 'terti' && batch && (
        <OpeningCounterpartiesPanel
          companyId={company.id}
          batch={batch}
          lines={lines}
          currencies={currencies}
          readOnly={readOnly}
          onChanged={() => void load()}
        />
      )}

      {activeTab === 'solduri' && (
        <>
          {loading && !batch && <div className="p-6 text-center text-xs text-slate-500">Se încarcă preluarea…</div>}

          {/* Configurare batch (când nu există preluare) */}
          {!loading && !batch && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 max-w-2xl">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Configurare preluare</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Nu există încă o preluare de solduri pentru această societate. Alegeți tipul preluării și perioada
                  de început.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-500">Tip preluare</span>
                  <select
                    value={setupForm.batch_type}
                    onChange={(e) => setSetupForm((prev) => ({ ...prev, batch_type: e.target.value as BatchType }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  >
                    {BATCH_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-500">Luna de început</span>
                  <select
                    value={setupForm.start_month}
                    onChange={(e) => setSetupForm((prev) => ({ ...prev, start_month: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  >
                    {RO_MONTHS.map((month, index) => (
                      <option key={month} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-[11px] font-semibold text-slate-500">Exercițiu fiscal</span>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    value={setupForm.fiscal_year}
                    onChange={(e) => setSetupForm((prev) => ({ ...prev, fiscal_year: Number(e.target.value) }))}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  />
                </label>
              </div>

              {setupForm.batch_type === 'NO_ACTIVITY' && (
                <div className="flex items-start gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Societate fără activitate: nu se preiau solduri, preluarea se validează direct.</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => void handleSetup()}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Se configurează…' : 'Configurează preluarea'}
                </button>
              </div>
            </div>
          )}

          {/* Tabel solduri */}
          {batch && (
            <>
              {batch.batch_type === 'NO_ACTIVITY' ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-8 text-center space-y-2">
                  <Info className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Societate fără activitate</h4>
                  <p className="text-xs text-slate-500">
                    Societate fără activitate anterioară — balanța de pornire nu conține solduri. Verificați și validați preluarea.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Cont</th>
                        <th className="px-3 py-2 text-left font-semibold">Denumire cont</th>
                        <th className="px-3 py-2 text-right font-semibold">Debit inițial</th>
                        <th className="px-3 py-2 text-right font-semibold">Credit inițial</th>
                        <th className="px-3 py-2 text-right font-semibold">Debit perioadă</th>
                        <th className="px-3 py-2 text-right font-semibold">Credit perioadă</th>
                        <th className="px-3 py-2 text-right font-semibold">Sold debitor</th>
                        <th className="px-3 py-2 text-right font-semibold">Sold creditor</th>
                        <th className="px-3 py-2 text-center font-semibold">Valută</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {lines.map((line) => {
                        const amounts = effectiveAmounts(line);
                        const sold = soldFor(amounts);
                        const isSummary = line.is_synthetic_summary === true;
                        const ownValues = line.own_values ?? null;
                        const deRepartizat = needsDistribution(line);
                        const isAnalytic = line.account_type === 'ANALYTIC';
                        return (
                          <tr
                            key={line.account_id}
                            className={
                              isSummary
                                ? 'bg-slate-50/70 dark:bg-slate-900/40 font-semibold'
                                : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/30'
                            }
                          >
                            <td className={`px-3 py-1.5 font-mono whitespace-nowrap ${isAnalytic ? 'pl-7' : ''}`}>
                              {line.account_symbol}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">
                              <span className="flex items-center gap-1.5">
                                <span className="truncate max-w-[18rem]">{line.account_name}</span>
                                {deRepartizat && (
                                  readOnly ? (
                                    <span
                                      title="Cont sumar cu valori proprii salvate — soldurile trebuie repartizate pe conturi analitice."
                                      className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-semibold whitespace-nowrap"
                                    >
                                      De repartizat
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setRedistributeLine(line)}
                                      title="Cont sumar cu valori proprii salvate — soldurile trebuie repartizate pe conturi analitice."
                                      className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60 text-[10px] font-semibold whitespace-nowrap transition-colors"
                                    >
                                      Repartizează
                                    </button>
                                  )
                                )}
                                {isSummary && ownValues && (
                                  <>
                                    <span
                                      title={`Soldul introdus direct pe ${line.account_symbol} (D ${fmt(ownValues.debit_initial)} · C ${fmt(ownValues.credit_initial)} · D perioadă ${fmt(ownValues.debit_prev)} · C perioadă ${fmt(ownValues.credit_prev)}) se suprapune cu analiticele.`}
                                      className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-semibold whitespace-nowrap"
                                    >
                                      Dublare sintetic/analitic
                                    </span>
                                    {!readOnly && (
                                      <button
                                        type="button"
                                        onClick={() => void handleClearSynthetic(line)}
                                        disabled={saving || dirtyIds.length > 0}
                                        title={
                                          dirtyIds.length > 0
                                            ? `Salvați cele ${dirtyIds.length} modificări nesalvate înainte de a șterge soldul sintetic.`
                                            : 'Șterge valorile introduse direct pe contul sintetic; analiticele rămân neschimbate.'
                                        }
                                        className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/60 text-[10px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Șterge soldul sintetic
                                      </button>
                                    )}
                                  </>
                                )}
                              </span>
                            </td>
                            {AMOUNT_FIELDS.map((field) => (
                              <td key={field} className="px-1 py-1">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={inputValue(line, field)}
                                  disabled={readOnly}
                                  onChange={(e) => handleAmountChange(line, field, e.target.value)}
                                  placeholder="0,00"
                                  className="w-24 px-2 py-1 text-right bg-transparent border border-transparent rounded outline-none focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-500"
                                />
                              </td>
                            ))}
                            <td className="px-3 py-1.5 text-right text-slate-700 dark:text-slate-200">
                              {sold.sold_d ? fmt(sold.sold_d) : ''}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-700 dark:text-slate-200">
                              {sold.sold_c ? fmt(sold.sold_c) : ''}
                            </td>
                            <td className="px-2 py-1 text-center">
                              <button
                                onClick={() => setCurrencyModalLine(line)}
                                className={`px-2 py-1 rounded text-[11px] font-semibold ${
                                  line.currency && line.currency !== batch.base_currency
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Detalii valută"
                              >
                                {line.currency || batch.base_currency}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {lines.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                            Nu există conturi în preluarea curentă.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-900/60 font-semibold text-slate-700 dark:text-slate-200">
                      <tr className="border-t border-slate-200 dark:border-slate-700">
                        <td colSpan={2} className="px-3 py-2 text-right">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right">{fmtCell(totals.debit_initial)}</td>
                        <td className="px-3 py-2 text-right">{fmtCell(totals.credit_initial)}</td>
                        <td className="px-3 py-2 text-right">{fmtCell(totals.debit_prev)}</td>
                        <td className="px-3 py-2 text-right">{fmtCell(totals.credit_prev)}</td>
                        <td className="px-3 py-2 text-right">{fmtCell(totals.sold_d)}</td>
                        <td className="px-3 py-2 text-right">{fmtCell(totals.sold_c)}</td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={2} className="px-3 py-2 text-right">
                          Diferență
                        </td>
                        <td colSpan={2} className="px-3 py-2 text-right">
                          {diffCell(diffInitial)}
                        </td>
                        <td colSpan={2} className="px-3 py-2 text-right">
                          {diffCell(diffPrev)}
                        </td>
                        <td colSpan={2} className="px-3 py-2 text-right">
                          {diffCell(diffSold)}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">
                          {isBalanced ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Echilibrat</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">Dezechilibrat</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Note batch */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-500">Note preluare</label>
                <textarea
                  value={notes}
                  disabled={readOnly}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-70"
                  placeholder="Observații privind preluarea soldurilor…"
                />
              </div>

              {/* Verificare */}
              {verification && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                    {verification.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    Rezultat verificare: {verification.isValid ? 'valid' : 'neconcordanțe detectate'}
                  </div>
                  {verification.errors.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-xs text-red-600 dark:text-red-400">
                      {verification.errors.map((message, index) => (
                        <li key={`err-${index}`}>{message}</li>
                      ))}
                    </ul>
                  )}
                  {verification.warnings.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-xs text-amber-600 dark:text-amber-400">
                      {verification.warnings.map((message, index) => (
                        <li key={`warn-${index}`}>{message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modale */}
      <AnalyticAccountModal
        isOpen={analyticModal.isOpen}
        onClose={() => setAnalyticModal({ isOpen: false, parentSymbol: '' })}
        companyId={company.id}
        initialParentSymbol={analyticModal.parentSymbol}
        onAccountCreated={() => {
          setAnalyticModal({ isOpen: false, parentSymbol: '' });
          void load();
        }}
      />

      <CurrencyDetailsModal
        isOpen={currencyModalLine !== null}
        onClose={() => setCurrencyModalLine(null)}
        line={currencyModalLine}
        onSave={handleCurrencySave}
        readOnly={readOnly}
      />
    </div>
  );
}
