import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Upload,
  Download,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  FileSpreadsheet,
  Search,
} from 'lucide-react';
import { api } from '../../services/api';
import {
  AmountFormat,
  FileImportPayload,
  FileImportPreview,
  FileImportRowStatus,
  ImportMapping,
  OpeningBalanceLine,
  OpeningBatch,
  OpeningVerificationResult,
} from '../../types/company';

interface OpeningImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  batch: OpeningBatch;
  onImported: (result: {
    batch: OpeningBatch;
    lines: OpeningBalanceLine[];
    verification: OpeningVerificationResult;
  }) => void;
}

// =========================================================================
// HELPERE
// =========================================================================

type MappingState = Record<keyof ImportMapping, number>;

const EMPTY_MAPPING: MappingState = {
  account: -1,
  name: -1,
  debit_initial: -1,
  credit_initial: -1,
  debit_prev: -1,
  credit_prev: -1,
  currency: -1,
  currency_amount: -1,
};

/** Ordinea contează la maparea automată: câmpurile mai specifice se rezolvă primele. */
const FIELD_ORDER: Array<keyof ImportMapping> = [
  'account',
  'name',
  'debit_initial',
  'credit_initial',
  'debit_prev',
  'credit_prev',
  'currency_amount',
  'currency',
];

const FIELD_LABELS: Record<keyof ImportMapping, string> = {
  account: 'Cont',
  name: 'Denumire',
  debit_initial: 'Debit inițial',
  credit_initial: 'Credit inițial',
  debit_prev: 'Debit precedent',
  credit_prev: 'Credit precedent',
  currency: 'Valută',
  currency_amount: 'Sumă în valută',
};

const FIELD_ALIASES: Record<keyof ImportMapping, string[]> = {
  account: ['cont', 'cont contabil', 'simbol', 'simbol cont', 'cod cont', 'cod'],
  name: ['denumire', 'denumire cont', 'nume', 'nume cont'],
  debit_initial: ['debit initial', 'sold debitor initial', 'sold debitor', 'debit init'],
  credit_initial: ['credit initial', 'sold creditor initial', 'sold creditor', 'credit init'],
  debit_prev: ['debit precedent', 'debit perioada precedenta', 'debit anterior', 'rulaj debitor'],
  credit_prev: ['credit precedent', 'credit perioada precedenta', 'credit anterior', 'rulaj creditor'],
  currency: ['moneda', 'valuta'],
  currency_amount: ['suma valuta', 'suma in valuta', 'suma moneda', 'valuta suma'],
};

const REQUIRED_FIELDS: Array<keyof ImportMapping> = [
  'account',
  'debit_initial',
  'credit_initial',
  'debit_prev',
  'credit_prev',
];

const normalizeLabel = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const autoMapColumns = (columns: Array<{ index: number; label: string }>): MappingState => {
  const mapping: MappingState = { ...EMPTY_MAPPING };
  const used = new Set<number>();

  // Pas 1: potrivire exactă pe eticheta normalizată.
  for (const field of FIELD_ORDER) {
    const aliases = FIELD_ALIASES[field];
    const found = columns.find(
      (column) => !used.has(column.index) && aliases.includes(normalizeLabel(column.label))
    );
    if (found) {
      mapping[field] = found.index;
      used.add(found.index);
    }
  }

  // Pas 2: potrivire parțială, doar pentru câmpurile rămase nemapate.
  for (const field of FIELD_ORDER) {
    if (mapping[field] >= 0) continue;
    const aliases = FIELD_ALIASES[field];
    const found = columns.find((column) => {
      if (used.has(column.index)) return false;
      const label = normalizeLabel(column.label);
      return aliases.some((alias) => label.includes(alias));
    });
    if (found) {
      mapping[field] = found.index;
      used.add(found.index);
    }
  }

  return mapping;
};

const fmt = (value: number): string =>
  new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const describeError = (err: any): string => {
  const status = err?.status;
  const code = err?.code;
  const message = err?.message || 'Eroare necunoscută';
  if (code === 'CONFLICT' || status === 409) {
    return `Conflict de versiune: preluarea a fost modificată între timp. Reîncărcați și reluați importul. (${message})`;
  }
  if (code === 'CONFIRMATION_REQUIRED') {
    return `Este necesară o confirmare suplimentară pentru acest import. (${message})`;
  }
  if (code === 'FORBIDDEN' || status === 403) {
    return `Nu aveți dreptul să efectuați această operațiune. (${message})`;
  }
  if (code === 'VALIDATION' || status === 400) {
    return `Date invalide: ${message}`;
  }
  return message;
};

const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('Fișierul nu a putut fi citit.'));
    reader.readAsDataURL(file);
  });

const STATUS_BADGE: Record<FileImportRowStatus, string> = {
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900',
  WARNING: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-900',
  ERROR: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900',
  SKIPPED: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const STATUS_FILTERS: Array<{ value: 'ALL' | FileImportRowStatus; label: string }> = [
  { value: 'ALL', label: 'Toate' },
  { value: 'OK', label: 'Valide' },
  { value: 'WARNING', label: 'Avertismente' },
  { value: 'ERROR', label: 'Erori' },
  { value: 'SKIPPED', label: 'Ignorate' },
];

const STEP_LABELS = ['Fișier', 'Mapare coloane', 'Previzualizare', 'Rezultat'];

// =========================================================================
// COMPONENTĂ
// =========================================================================

export const OpeningImportModal: React.FC<OpeningImportModalProps> = ({
  isOpen,
  onClose,
  companyId,
  batch,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState<'parse' | 'preview' | 'commit' | 'template' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState('');
  const [contentBase64, setContentBase64] = useState('');
  const [sourceType, setSourceType] = useState<'CSV' | 'XLSX'>('CSV');
  const [rowCount, setRowCount] = useState(0);
  const [columns, setColumns] = useState<Array<{ index: number; label: string }>>([]);
  const [sample, setSample] = useState<string[][]>([]);

  const [hasHeader, setHasHeader] = useState(true);
  const [numberFormat, setNumberFormat] = useState<AmountFormat>('RO');
  const [mapping, setMapping] = useState<MappingState>({ ...EMPTY_MAPPING });

  const [preview, setPreview] = useState<FileImportPreview | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmReimport, setConfirmReimport] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'ALL' | FileImportRowStatus>('ALL');
  const [search, setSearch] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  // Reset la fiecare deschidere.
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setBusy(null);
    setError(null);
    setFileName('');
    setContentBase64('');
    setSourceType('CSV');
    setRowCount(0);
    setColumns([]);
    setSample([]);
    setHasHeader(true);
    setNumberFormat('RO');
    setMapping({ ...EMPTY_MAPPING });
    setPreview(null);
    setConfirmReplace(false);
    setConfirmReimport(false);
    setStatusFilter('ALL');
    setSearch('');
    setImportedCount(0);
  }, [isOpen]);

  const missingRequired = useMemo(
    () => REQUIRED_FIELDS.filter((field) => mapping[field] < 0),
    [mapping]
  );

  const dataSample = useMemo(
    () => (hasHeader ? sample.slice(1) : sample).slice(0, 5),
    [sample, hasHeader]
  );

  const filteredRows = useMemo(() => {
    if (!preview) return [];
    const needle = normalizeLabel(search);
    return preview.rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false;
      if (needle === '') return true;
      return (
        normalizeLabel(row.symbol).includes(needle) ||
        normalizeLabel(row.name).includes(needle)
      );
    });
  }, [preview, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<'ALL' | FileImportRowStatus, number> = {
      ALL: 0,
      OK: 0,
      WARNING: 0,
      ERROR: 0,
      SKIPPED: 0,
    };
    if (!preview) return counts;
    counts.ALL = preview.rows.length;
    for (const row of preview.rows) counts[row.status] += 1;
    return counts;
  }, [preview]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------- acțiuni

  const buildPayload = (overrides?: {
    confirm_replace?: boolean;
    confirm_reimport?: boolean;
  }): FileImportPayload => {
    const payload: FileImportPayload = {
      batch_id: batch.id,
      file_name: fileName,
      content_base64: contentBase64,
      mapping: {
        account: mapping.account,
        debit_initial: mapping.debit_initial,
        credit_initial: mapping.credit_initial,
        debit_prev: mapping.debit_prev,
        credit_prev: mapping.credit_prev,
      },
      has_header: hasHeader,
      number_format: numberFormat,
      version: batch.version,
      confirm_replace: overrides?.confirm_replace ?? confirmReplace,
      confirm_reimport: overrides?.confirm_reimport ?? confirmReimport,
    };
    if (mapping.name >= 0) payload.mapping.name = mapping.name;
    if (mapping.currency >= 0) payload.mapping.currency = mapping.currency;
    if (mapping.currency_amount >= 0) payload.mapping.currency_amount = mapping.currency_amount;
    return payload;
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setBusy('parse');
    try {
      const base64 = await readFileAsBase64(file);
      const parsed = await api.parseOpeningImportFile(companyId, file.name, base64);
      setFileName(file.name);
      setContentBase64(base64);
      setSourceType(parsed.source_type);
      setColumns(parsed.columns);
      setSample(parsed.sample);
      setRowCount(parsed.row_count);
      setHasHeader(true);
      setMapping(autoMapColumns(parsed.columns));
      setPreview(null);
      setConfirmReplace(false);
      setConfirmReimport(false);
      setStep(2);
    } catch (err: any) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setError(null);
    setBusy('template');
    try {
      await api.downloadOpeningTemplate(companyId);
    } catch (err: any) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const runPreview = async (overrides?: { confirm_replace?: boolean; confirm_reimport?: boolean }) => {
    setError(null);
    setBusy('preview');
    try {
      const result = await api.previewOpeningImport(companyId, buildPayload(overrides));
      setPreview(result);
      setStatusFilter('ALL');
      setSearch('');
      setStep(3);
    } catch (err: any) {
      setError(describeError(err));
      setPreview(null);
    } finally {
      setBusy(null);
    }
  };

  const handleToggleReplace = (value: boolean) => {
    setConfirmReplace(value);
    void runPreview({ confirm_replace: value });
  };

  const handleToggleReimport = (value: boolean) => {
    setConfirmReimport(value);
    void runPreview({ confirm_reimport: value });
  };

  const handleCommit = async () => {
    setError(null);
    setBusy('commit');
    try {
      const result = await api.commitOpeningImport(companyId, buildPayload());
      setImportedCount(result.lines.length);
      setStep(4);
      onImported({
        batch: result.batch,
        lines: result.lines,
        verification: result.verification,
      });
    } catch (err: any) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const setFieldMapping = (field: keyof ImportMapping, value: number) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
    setPreview(null);
  };

  // ---------------------------------------------------------------- render

  const renderStepper = () => (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, index) => {
        const number = index + 1;
        const active = step === number;
        const done = step > number;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border ${
                active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : done
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-white border-slate-300 text-slate-400 dark:bg-slate-900 dark:border-slate-700'
              }`}
            >
              {done ? <CheckCircle2 className="w-3 h-3" /> : number}
            </span>
            <span
              className={`text-[11px] font-semibold ${
                active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
            {number < STEP_LABELS.length && (
              <span className="w-4 h-px bg-slate-200 dark:bg-slate-700" />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderStepFile = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/40 px-4 py-6 text-center">
        <FileSpreadsheet className="w-8 h-8 mx-auto text-blue-600" />
        <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
          Selectați fișierul cu solduri de preluare
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          Formate acceptate: CSV și XLSX. Sumele pot fi în format românesc sau englez.
        </p>
        <button
          onClick={handleChooseFile}
          disabled={busy !== null}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy === 'parse' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Alege fișier
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => void handleFileChange(e)}
          className="hidden"
        />
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
        <span className="flex items-center gap-2 text-[11px] text-slate-500">
          <Info className="w-4 h-4 shrink-0" />
          Nu aveți fișierul pregătit? Descărcați șablonul cu conturile active ale societății.
        </span>
        <button
          onClick={() => void handleDownloadTemplate()}
          disabled={busy !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
        >
          {busy === 'template' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Descarcă șablon CSV
        </button>
      </div>
    </div>
  );

  const renderStepMapping = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 px-3 py-2 text-[11px] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1.5 font-semibold">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          {fileName}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-[10px]">
          {sourceType}
        </span>
        <span>{rowCount} rânduri</span>
        <span>{columns.length} coloane</span>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => {
              setHasHeader(e.target.checked);
              setPreview(null);
            }}
            className="rounded border-slate-300 dark:border-slate-700"
          />
          Primul rând este antet
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Format sume</span>
          <select
            value={numberFormat}
            onChange={(e) => {
              setNumberFormat(e.target.value as AmountFormat);
              setPreview(null);
            }}
            className="px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
          >
            <option value="RO">RO — 1.234,56</option>
            <option value="EN">EN — 1,234.56</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        {FIELD_ORDER.map((field) => {
          const required = REQUIRED_FIELDS.includes(field);
          const value = mapping[field];
          return (
            <div key={field} className="flex items-center gap-3">
              <label className="w-40 shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {FIELD_LABELS[field]}
                {required && <span className="ml-0.5 text-red-600">*</span>}
              </label>
              <select
                value={value}
                onChange={(e) => setFieldMapping(field, Number(e.target.value))}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 ${
                  required && value < 0
                    ? 'border-red-300 dark:border-red-800'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                <option value={-1}>— nemapat —</option>
                {columns.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {missingRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Coloane obligatorii nemapate: {missingRequired.map((field) => FIELD_LABELS[field]).join(', ')}.
          </span>
        </div>
      )}

      {dataSample.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50/60 dark:bg-slate-950/40 text-[11px] font-semibold text-slate-500">
            Primele {dataSample.length} rânduri din fișier
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column.index} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataSample.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-slate-100 dark:border-slate-800">
                    {columns.map((column) => (
                      <td
                        key={column.index}
                        className="px-2 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap"
                      >
                        {row[column.index] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderStepPreview = () => {
    if (!preview) return null;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-500">Debit inițial</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {fmt(preview.totals.debit_initial)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-500">Credit inițial</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {fmt(preview.totals.credit_initial)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-500">Debit precedent</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {fmt(preview.totals.debit_prev)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-500">Credit precedent</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {fmt(preview.totals.credit_prev)}
            </div>
          </div>
        </div>

        {preview.is_balanced ? (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Totalurile sunt echilibrate.</span>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Totalurile nu sunt echilibrate.</span>
          </div>
        )}

        {preview.errors.length > 0 && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300 space-y-1">
            {preview.errors.map((message) => (
              <div key={message} className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            ))}
          </div>
        )}

        {preview.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            {preview.warnings.map((message) => (
              <div key={message} className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            ))}
          </div>
        )}

        {preview.existing_lines_count > 0 && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmReplace}
              onChange={(e) => handleToggleReplace(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 dark:border-amber-800"
            />
            <span>
              Preluarea are deja {preview.existing_lines_count} rânduri. Confirm înlocuirea lor cu rândurile
              din fișier.
            </span>
          </label>
        )}

        {preview.duplicate_of && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmReimport}
              onChange={(e) => handleToggleReimport(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 dark:border-amber-800"
            />
            <span>
              Același fișier a fost importat la{' '}
              {new Date(preview.duplicate_of.created_at).toLocaleString('ro-RO')}
              {preview.duplicate_of.user_name ? ` de ${preview.duplicate_of.user_name}` : ''}. Confirm
              reimportul.
            </span>
          </label>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg border ${
                statusFilter === option.value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {option.label} ({statusCounts[option.value]})
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cont sau denumire"
              className="w-40 bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none"
            />
          </label>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left font-semibold">Rând</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Cont</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Denumire</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Debit iniț.</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Credit iniț.</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Debit prec.</th>
                  <th className="px-2 py-1.5 text-right font-semibold">Credit prec.</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Valută</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Stare</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.row_no} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-1.5 text-slate-500">{row.row_no}</td>
                    <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {row.symbol}
                      {row.account_id === null && (
                        <span className="ml-1 text-[10px] font-medium text-red-600">(necunoscut)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">{row.name}</td>
                    <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">
                      {fmt(row.debit_initial)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">
                      {fmt(row.credit_initial)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">
                      {fmt(row.debit_prev)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600 dark:text-slate-300">
                      {fmt(row.credit_prev)}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {row.currency}
                      {row.currency_amount !== 0 ? ` ${fmt(row.currency_amount)}` : ''}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_BADGE[row.status]}`}
                      >
                        {row.status}
                      </span>
                      {row.messages.length > 0 && (
                        <div className="mt-0.5 text-[10px] text-slate-500">{row.messages.join(' · ')}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-2 py-3 text-center text-slate-500">
                      Niciun rând pentru filtrele selectate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          {filteredRows.length} din {preview.rows.length} rânduri afișate
          {preview.can_commit ? '' : ' — importul nu poate fi confirmat în starea curentă.'}
        </p>
      </div>
    );
  };

  const renderStepResult = () => (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Import finalizat: {importedCount} rânduri preluate din {fileName}. Verificați soldurile în tabelul
          principal.
        </span>
      </div>
      <div className="flex items-center justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Închide
        </button>
      </div>
    </div>
  );

  const canPreview = missingRequired.length === 0 && contentBase64 !== '' && busy === null;
  const canCommit = preview !== null && preview.can_commit && busy === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Import solduri de preluare
              </h2>
              <p className="text-xs text-slate-500">
                Fișier CSV / XLSX · exercițiu {batch.fiscal_year} · lot v{batch.version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {renderStepper()}
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {step === 1 && renderStepFile()}
          {step === 2 && renderStepMapping()}
          {step === 3 && renderStepPreview()}
          {step === 4 && renderStepResult()}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-2">
          <button
            onClick={() => (step > 1 && step < 4 ? setStep(step - 1) : onClose())}
            disabled={busy !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {step > 1 && step < 4 ? (
              <>
                <ArrowLeft className="w-3.5 h-3.5" />
                Înapoi
              </>
            ) : (
              'Anulează'
            )}
          </button>

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                onClick={() => void runPreview()}
                disabled={!canPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {busy === 'preview' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                Previzualizează
              </button>
            )}
            {step === 3 && (
              <button
                onClick={() => void handleCommit()}
                disabled={!canCommit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === 'commit' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Importă soldurile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
