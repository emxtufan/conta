import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  OpeningBalanceLine,
  OpeningBatch,
  OpeningCounterpartyItem,
} from '../../types/company';

// =========================================================================
// CONSTANTE
// =========================================================================

type PartnerType = 'CLIENT' | 'SUPPLIER';

// Prefixele de conturi sintetice acceptate pentru fiecare tip de terț
const COUNTERPARTY_PREFIXES: Record<PartnerType, string[]> = {
  SUPPLIER: ['401', '403', '404', '408'],
  CLIENT: ['411', '413', '418'],
};

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  CLIENT: 'Client',
  SUPPLIER: 'Furnizor',
};

// =========================================================================
// HELPERE NUMERICE / FORMATARE
// =========================================================================

/** Valoarea în bani întregi (centimi), conform regulii de calcul a panoului. */
const toBani = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
};

const fmtBani = (bani: number): string =>
  (bani / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtAmount = (value: number | null | undefined): string => fmtBani(toBani(value));

/**
 * Parsare strictă a sumelor introduse în format românesc: '.' separator de mii,
 * ',' separator zecimal, maximum 2 zecimale. Ex: „1.234,56” -> 1234.56.
 * Returnează null pentru text invalid sau câmp gol.
 */
const parseRoAmount = (raw: string): number | null => {
  const trimmed = String(raw ?? '').trim();
  if (trimmed === '') return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(trimmed) && !/^\d+(,\d{1,2})?$/.test(trimmed)) {
    return null;
  }
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
};

/** Afișează o sumă în câmp de formular, în format românesc („1.234,56”). */
const toRoInput = (value: number | null | undefined): string => {
  const bani = toBani(value ?? 0);
  const sign = bani < 0 ? '-' : '';
  const abs = Math.abs(bani);
  const intPart = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decPart = String(abs % 100).padStart(2, '0');
  return `${sign}${intPart},${decPart}`;
};

const fmtDate = (value: string): string => {
  const raw = String(value || '');
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return raw;
  return `${match[3]}.${match[2]}.${match[1]}`;
};

const describeApiError = (err: any): string => {
  const status = err?.status;
  const code = err?.code;
  const message = err?.message || 'Eroare necunoscută';
  if (code === 'CONFLICT' || status === 409) {
    return `Conflict: ${message}`;
  }
  if (code === 'FORBIDDEN' || status === 403) {
    return `Nu aveți dreptul să efectuați această operațiune. (${message})`;
  }
  if (code === 'VALIDATION' || status === 400) {
    return `Date invalide: ${message}`;
  }
  return message;
};

/** Tipul de terț dedus din simbolul contului (null dacă nu este cont de terț). */
const partnerTypeForSymbol = (symbol: string): PartnerType | null => {
  const s = String(symbol || '');
  if (COUNTERPARTY_PREFIXES.SUPPLIER.some((prefix) => s.startsWith(prefix))) return 'SUPPLIER';
  if (COUNTERPARTY_PREFIXES.CLIENT.some((prefix) => s.startsWith(prefix))) return 'CLIENT';
  return null;
};

/** Cont frunză (nu sumar sintetic, fără analitice) cu prefix de terț. */
const isCounterpartyLeaf = (line: OpeningBalanceLine): boolean => {
  if (line.is_synthetic_summary === true) return false;
  if (line.has_analytics === true) return false;
  return partnerTypeForSymbol(line.account_symbol) !== null;
};

// =========================================================================
// TIPURI LOCALE
// =========================================================================

interface OpeningCounterpartiesPanelProps {
  companyId: number;
  batch: OpeningBatch;
  lines: OpeningBalanceLine[];
  currencies: string[];
  readOnly: boolean;
  onChanged: () => void;
}

type SummaryStatus = 'concordant' | 'diff' | 'undetailed';

interface SummaryRow {
  accountId: number;
  symbol: string;
  name: string;
  type: PartnerType;
  soldBani: number;
  documentsBani: number;
  diffBani: number;
  status: SummaryStatus;
}

interface FormState {
  id?: number;
  partner_type: PartnerType;
  partner_name: string;
  partner_cui: string;
  doc_number: string;
  doc_date: string;
  currency: string;
  original_amount: string;
  remaining_amount: string;
  remaining_amount_ron: string;
  account_symbol: string;
  notes: string;
}

// =========================================================================
// COMPONENTĂ
// =========================================================================

export function OpeningCounterpartiesPanel(props: OpeningCounterpartiesPanelProps) {
  const { companyId, batch, lines, currencies, readOnly, onChanged } = props;

  const baseCurrency = String(batch.base_currency || 'RON').trim().toUpperCase();

  const [items, setItems] = useState<OpeningCounterpartyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'ALL' | PartnerType>('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // -----------------------------------------------------------------------
  // ÎNCĂRCARE
  // -----------------------------------------------------------------------

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getOpeningCounterparties(companyId, batch.id);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(describeApiError(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, batch.id]);

  useEffect(() => {
    void load();
  }, [load]);

  // -----------------------------------------------------------------------
  // DERIVATE
  // -----------------------------------------------------------------------

  const currencyOptions = useMemo(() => {
    const list = (currencies || [])
      .map((currency) => String(currency || '').trim().toUpperCase())
      .filter(Boolean);
    if (!list.includes(baseCurrency)) list.unshift(baseCurrency);
    return Array.from(new Set(list));
  }, [currencies, baseCurrency]);

  const counterpartyLeafAccounts = useMemo(
    () =>
      lines
        .filter(isCounterpartyLeaf)
        .map((line) => ({
          account_id: line.account_id,
          account_symbol: String(line.account_symbol || ''),
          account_name: line.account_name,
          type: partnerTypeForSymbol(line.account_symbol) as PartnerType,
        }))
        .sort((a, b) => a.account_symbol.localeCompare(b.account_symbol)),
    [lines]
  );

  // Rezumat pe cont: conturile frunză de terț cu sold ≠ 0 sau cu documente înregistrate
  const summary = useMemo<SummaryRow[]>(() => {
    const itemsBySymbol = new Map<string, OpeningCounterpartyItem[]>();
    for (const item of items) {
      const key = String(item.account_symbol || '');
      const bucket = itemsBySymbol.get(key);
      if (bucket) bucket.push(item);
      else itemsBySymbol.set(key, [item]);
    }

    const rows: SummaryRow[] = [];
    for (const line of lines) {
      if (line.is_synthetic_summary === true) continue;
      if (line.has_analytics === true) continue;
      const symbol = String(line.account_symbol || '');
      const type = partnerTypeForSymbol(symbol);
      if (!type) continue;

      const debitBani = toBani(line.debit_final);
      const creditBani = toBani(line.credit_final);
      const soldBani = type === 'SUPPLIER' ? creditBani - debitBani : debitBani - creditBani;
      const accountItems = itemsBySymbol.get(symbol) || [];
      if (soldBani === 0 && accountItems.length === 0) continue;

      const documentsBani = accountItems.reduce(
        (acc, item) => acc + toBani(item.remaining_amount_ron ?? 0),
        0
      );
      const diffBani = soldBani - documentsBani;
      const status: SummaryStatus =
        accountItems.length === 0 ? 'undetailed' : diffBani === 0 ? 'concordant' : 'diff';

      rows.push({
        accountId: line.account_id,
        symbol,
        name: line.account_name,
        type,
        soldBani,
        documentsBani,
        diffBani,
        status,
      });
    }
    rows.sort((a, b) => a.symbol.localeCompare(b.symbol));
    return rows;
  }, [lines, items]);

  const accountOptions = useMemo(() => {
    const symbols = new Set<string>();
    summary.forEach((row) => symbols.add(row.symbol));
    items.forEach((item) => {
      if (item.account_symbol) symbols.add(String(item.account_symbol));
    });
    return Array.from(symbols).sort();
  }, [summary, items]);

  const visibleSummary = useMemo(
    () =>
      summary.filter(
        (row) =>
          (typeFilter === 'ALL' || row.type === typeFilter) &&
          (accountFilter === 'ALL' || row.symbol === accountFilter)
      ),
    [summary, typeFilter, accountFilter]
  );

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (typeFilter !== 'ALL' && item.partner_type !== typeFilter) return false;
      if (accountFilter !== 'ALL' && String(item.account_symbol || '') !== accountFilter) return false;
      if (!query) return true;
      return (
        String(item.partner_name || '').toLowerCase().includes(query) ||
        String(item.partner_cui || '').toLowerCase().includes(query) ||
        String(item.doc_number || '').toLowerCase().includes(query)
      );
    });
  }, [items, typeFilter, accountFilter, search]);

  const formAccounts = useMemo(
    () =>
      form
        ? counterpartyLeafAccounts.filter((account) => account.type === form.partner_type)
        : [],
    [counterpartyLeafAccounts, form]
  );

  const formCurrency = String(form?.currency || baseCurrency).toUpperCase();
  const formIsForeignCurrency = formCurrency !== baseCurrency;

  // -----------------------------------------------------------------------
  // ACȚIUNI
  // -----------------------------------------------------------------------

  const openCreateForm = () => {
    setFormError(null);
    setForm({
      partner_type: 'CLIENT',
      partner_name: '',
      partner_cui: '',
      doc_number: '',
      doc_date: '',
      currency: baseCurrency,
      original_amount: '',
      remaining_amount: '',
      remaining_amount_ron: '',
      account_symbol: '',
      notes: '',
    });
  };

  const openEditForm = (item: OpeningCounterpartyItem) => {
    setFormError(null);
    setForm({
      id: item.id,
      partner_type: item.partner_type,
      partner_name: item.partner_name || '',
      partner_cui: item.partner_cui || '',
      doc_number: item.doc_number || '',
      doc_date: String(item.doc_date || '').slice(0, 10),
      currency: String(item.currency || baseCurrency).toUpperCase(),
      original_amount: toRoInput(item.original_amount),
      remaining_amount: toRoInput(item.remaining_amount),
      remaining_amount_ron: toRoInput(item.remaining_amount_ron),
      account_symbol: String(item.account_symbol || ''),
      notes: item.notes || '',
    });
  };

  const closeForm = () => {
    setForm(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!form) return;
    setFormError(null);

    const name = form.partner_name.trim();
    const docNumber = form.doc_number.trim();
    const docDate = form.doc_date.trim();
    if (!name) {
      setFormError('Denumirea partenerului este obligatorie.');
      return;
    }
    if (!docNumber) {
      setFormError('Numărul documentului este obligatoriu.');
      return;
    }
    if (!docDate) {
      setFormError('Data documentului este obligatorie.');
      return;
    }

    const originalAmount = parseRoAmount(form.original_amount);
    if (originalAmount === null) {
      setFormError('Valoarea originală este obligatorie (format românesc, ex. 1.234,56).');
      return;
    }
    const remainingAmount = parseRoAmount(form.remaining_amount);
    if (remainingAmount === null) {
      setFormError(
        `Restul de ${form.partner_type === 'CLIENT' ? 'încasat' : 'plătit'} este obligatoriu (format românesc, ex. 1.234,56).`
      );
      return;
    }

    const currency = String(form.currency || baseCurrency).toUpperCase();
    let remainingAmountRon = remainingAmount;
    if (currency !== baseCurrency) {
      const parsedRon = parseRoAmount(form.remaining_amount_ron);
      if (parsedRon === null) {
        setFormError(`Restul în ${baseCurrency} este obligatoriu pentru documentele în valută.`);
        return;
      }
      remainingAmountRon = parsedRon;
    }

    const account = counterpartyLeafAccounts.find(
      (candidate) => candidate.account_symbol === form.account_symbol
    );
    if (!account) {
      setFormError('Selectați contul de terț în care se detaliază documentul.');
      return;
    }

    setSaving(true);
    try {
      await api.saveOpeningCounterpartyItem(companyId, batch.id, {
        id: form.id,
        partner_type: form.partner_type,
        partner_name: name,
        partner_cui: form.partner_cui.trim() || null,
        doc_number: docNumber,
        doc_date: docDate,
        currency,
        original_amount: originalAmount,
        remaining_amount: remainingAmount,
        remaining_amount_ron: remainingAmountRon,
        account_id: account.account_id,
        account_symbol: account.account_symbol,
        notes: form.notes.trim(),
      });
      setForm(null);
      setFormError(null);
      await load();
      onChanged();
    } catch (err) {
      setFormError(describeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: OpeningCounterpartyItem) => {
    if (!item.id || deletingId !== null) return;
    setDeleteError(null);
    setDeletingId(item.id);
    try {
      await api.deleteOpeningCounterpartyItem(companyId, batch.id, item.id);
      setConfirmDeleteId(null);
      await load();
      onChanged();
    } catch (err) {
      setDeleteError(describeApiError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const statusBadge = (status: SummaryStatus) => {
    if (status === 'concordant') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-semibold whitespace-nowrap">
          Concordant
        </span>
      );
    }
    if (status === 'diff') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-[10px] font-semibold whitespace-nowrap">
          Diferență
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-[10px] font-semibold whitespace-nowrap">
        Nedetaliat
      </span>
    );
  };

  // -----------------------------------------------------------------------
  // RENDER
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Text informativ */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Documentele istorice detaliază soldul deja inclus în balanța de pornire. Nu generează
          înregistrări contabile și nu creează datorii/creanțe noi.
        </span>
      </div>

      {/* Antet */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Solduri terți — documente istorice
          </h3>
          <span className="text-[11px] text-slate-500">
            {items.length} {items.length === 1 ? 'document' : 'documente'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load()}
            disabled={loading}
            title="Reîncarcă documentele"
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!readOnly && (
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Adaugă document
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {deleteError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{deleteError}</span>
        </div>
      )}

      {/* Tabel rezumat pe cont */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
          Sold de justificat pe conturi de terți
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Cont</th>
                <th className="px-3 py-2 text-left font-semibold">Denumire</th>
                <th className="px-3 py-2 text-left font-semibold">Tip</th>
                <th className="px-3 py-2 text-right font-semibold">Sold de justificat</th>
                <th className="px-3 py-2 text-right font-semibold">Total documente</th>
                <th className="px-3 py-2 text-right font-semibold">Diferență</th>
                <th className="px-3 py-2 text-center font-semibold">Stare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleSummary.map((row) => (
                <tr
                  key={row.accountId}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
                >
                  <td className="px-3 py-1.5 font-mono whitespace-nowrap text-slate-700 dark:text-slate-200">
                    {row.symbol}
                  </td>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300">
                    <span className="truncate block max-w-[18rem]">{row.name}</span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {PARTNER_TYPE_LABELS[row.type]}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {fmtBani(row.soldBani)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {fmtBani(row.documentsBani)}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${
                      row.diffBani === 0
                        ? 'text-slate-500'
                        : 'text-red-600 dark:text-red-400 font-semibold'
                    }`}
                  >
                    {fmtBani(row.diffBani)}
                  </td>
                  <td className="px-3 py-1.5 text-center">{statusBadge(row.status)}</td>
                </tr>
              ))}
              {visibleSummary.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Nu există conturi de clienți/furnizori cu sold sau documente în preluarea curentă.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 px-3 py-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Tip</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'ALL' | PartnerType)}
            className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">Toți</option>
            <option value="CLIENT">Clienți</option>
            <option value="SUPPLIER">Furnizori</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Cont</span>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-mono"
          >
            <option value="ALL">Toate conturile</option>
            {accountOptions.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 flex-1 min-w-[14rem]">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            Căutare denumire / CUI / nr. document
          </span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex: Popescu SRL, RO12345678, FV-1024"
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200"
            />
          </div>
        </label>
      </div>

      {/* Tabel documente */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Tip</th>
              <th className="px-3 py-2 text-left font-semibold">Denumire</th>
              <th className="px-3 py-2 text-left font-semibold">CUI/CIF</th>
              <th className="px-3 py-2 text-left font-semibold">Nr. document</th>
              <th className="px-3 py-2 text-left font-semibold">Dată</th>
              <th className="px-3 py-2 text-center font-semibold">Monedă</th>
              <th className="px-3 py-2 text-right font-semibold">Valoare originală</th>
              <th className="px-3 py-2 text-right font-semibold">Rest</th>
              <th className="px-3 py-2 text-right font-semibold">Rest în {baseCurrency}</th>
              <th className="px-3 py-2 text-left font-semibold">Cont</th>
              <th className="px-3 py-2 text-right font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredItems.map((item, index) => (
              <tr
                key={item.id ?? `row-${index}`}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30"
              >
                <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {PARTNER_TYPE_LABELS[item.partner_type]}
                </td>
                <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">
                  <span className="truncate block max-w-[16rem]">{item.partner_name}</span>
                </td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {item.partner_cui || ''}
                </td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {item.doc_number}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {fmtDate(item.doc_date)}
                </td>
                <td className="px-3 py-1.5 text-center whitespace-nowrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      String(item.currency || baseCurrency).toUpperCase() !== baseCurrency
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {String(item.currency || baseCurrency).toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {fmtAmount(item.original_amount)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {fmtAmount(item.remaining_amount)}
                </td>
                <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {fmtAmount(item.remaining_amount_ron)}
                </td>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {item.account_symbol}
                </td>
                <td className="px-3 py-1.5 text-right whitespace-nowrap">
                  {readOnly ? null : confirmDeleteId === item.id ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="text-[11px] text-red-600 dark:text-red-400">Ștergi?</span>
                      <button
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold disabled:opacity-50"
                      >
                        {deletingId === item.id ? 'Se șterge…' : 'Da'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 rounded text-[11px] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                      >
                        Nu
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEditForm(item)}
                        title="Editează documentul"
                        className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setConfirmDeleteId(item.id ?? null);
                        }}
                        title="Șterge documentul"
                        disabled={!item.id}
                        className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                  {items.length === 0
                    ? 'Nu există documente istorice înregistrate pentru această preluare.'
                    : 'Niciun document nu corespunde filtrelor selectate.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Formular adăugare/editare */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {form.id ? 'Editare document istoric' : 'Adăugare document istoric'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Detaliere sold terț — preluare {batch.fiscal_year}, moneda contabilă{' '}
                    {baseCurrency}
                  </p>
                </div>
              </div>
              <button
                onClick={closeForm}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Tip *
                  </label>
                  <select
                    value={form.partner_type}
                    onChange={(e) => {
                      const partnerType = e.target.value as PartnerType;
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              partner_type: partnerType,
                              account_symbol: counterpartyLeafAccounts.some(
                                (account) =>
                                  account.account_symbol === prev.account_symbol &&
                                  account.type === partnerType
                              )
                                ? prev.account_symbol
                                : '',
                            }
                          : prev
                      );
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium"
                  >
                    <option value="CLIENT">Client</option>
                    <option value="SUPPLIER">Furnizor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Denumire *
                  </label>
                  <input
                    type="text"
                    value={form.partner_name}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, partner_name: e.target.value } : prev))
                    }
                    placeholder="Ex: Popescu Comerț SRL"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    CUI/CIF
                  </label>
                  <input
                    type="text"
                    value={form.partner_cui}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, partner_cui: e.target.value } : prev))
                    }
                    placeholder="Ex: RO12345678"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Nr. document *
                  </label>
                  <input
                    type="text"
                    value={form.doc_number}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, doc_number: e.target.value } : prev))
                    }
                    placeholder="Ex: FV-1024"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Dată document *
                  </label>
                  <input
                    type="date"
                    value={form.doc_date}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, doc_date: e.target.value } : prev))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Data documentului trebuie să fie anterioară datei preluării.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Monedă
                  </label>
                  <select
                    value={formCurrency}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, currency: e.target.value } : prev))
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Valoare originală *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.original_amount}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, original_amount: e.target.value } : prev
                      )
                    }
                    placeholder="1.234,56"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    {form.partner_type === 'CLIENT' ? 'Rest de încasat *' : 'Rest de plătit *'}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.remaining_amount}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, remaining_amount: e.target.value } : prev
                      )
                    }
                    placeholder="1.234,56"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-mono"
                  />
                </div>

                {formIsForeignCurrency && (
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Rest în {baseCurrency} *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.remaining_amount_ron}
                      onChange={(e) =>
                        setForm((prev) =>
                          prev ? { ...prev, remaining_amount_ron: e.target.value } : prev
                        )
                      }
                      placeholder="1.234,56"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-mono"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Echivalentul în moneda contabilă, obligatoriu pentru documentele în valută.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Cont *
                  </label>
                  <select
                    value={form.account_symbol}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, account_symbol: e.target.value } : prev
                      )
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono"
                  >
                    <option value="">— Selectați contul —</option>
                    {formAccounts.map((account) => (
                      <option key={account.account_symbol} value={account.account_symbol}>
                        {account.account_symbol} — {account.account_name}
                      </option>
                    ))}
                  </select>
                  {formAccounts.length === 0 && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      Nu există conturi frunză de {PARTNER_TYPE_LABELS[form.partner_type].toLowerCase()} în
                      balanța de pornire.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Observații
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, notes: e.target.value } : prev))
                    }
                    rows={2}
                    placeholder="Detalii suplimentare despre documentul istoric"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg resize-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                * Sumele se introduc în format românesc („1.234,56”). Documentele istorice nu
                modifică balanța: ele justifică soldul conturilor de clienți și furnizori deja
                preluat.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-2">
              <button
                onClick={closeForm}
                disabled={saving}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
              >
                Anulează
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs disabled:opacity-50"
              >
                {saving ? (
                  'Se salvează…'
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Salvează documentul
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
