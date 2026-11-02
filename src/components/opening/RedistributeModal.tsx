/**
 * Repartizarea soldurilor de preluare de pe un cont sintetic pe analiticele lui.
 *
 * Modalul pornește de la valorile deja salvate ale analiticelor și de la valorile
 * proprii ale contului sintetic. Se lucrează exclusiv în bani întregi, cu un
 * parser strict în format românesc (punctul separă miile, virgula zecimalele),
 * iar repartizarea poate fi trimisă doar când diferența pe fiecare coloană este 0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X, Shuffle, AlertCircle, Loader2, Wand2 } from 'lucide-react';
import { api } from '../../services/api';
import {
  OpeningBalanceLine,
  OpeningBatch,
  OpeningVerificationResult,
} from '../../types/company';

interface RedistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  batch: OpeningBatch;
  parentLine: OpeningBalanceLine;
  childLines: OpeningBalanceLine[];
  onDone: (result: {
    batch: OpeningBatch;
    lines: OpeningBalanceLine[];
    verification: OpeningVerificationResult;
  }) => void;
}

// =========================================================================
// HELPERE
// =========================================================================

type AmountField = 'debit_initial' | 'credit_initial' | 'debit_prev' | 'credit_prev';

type DraftRow = Record<AmountField, string>;
type Draft = Record<number, DraftRow>;

const FIELDS: AmountField[] = ['debit_initial', 'credit_initial', 'debit_prev', 'credit_prev'];

const FIELD_LABELS: Record<AmountField, string> = {
  debit_initial: 'Debit inițial',
  credit_initial: 'Credit inițial',
  debit_prev: 'Debit precedent',
  credit_prev: 'Credit precedent',
};

const EMPTY_ROW: DraftRow = {
  debit_initial: '0,00',
  credit_initial: '0,00',
  debit_prev: '0,00',
  credit_prev: '0,00',
};

/** Conversia lei → bani întregi, fără erori de reprezentare. */
const toBani = (value: number | null | undefined): number => Math.round((Number(value) || 0) * 100);

const formatBani = (bani: number): string =>
  (bani / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Valoarea din câmpurile de text: fără separator de mii, cu virgulă zecimală. */
const formatBaniForInput = (bani: number): string => {
  const abs = Math.abs(bani);
  const whole = Math.floor(abs / 100);
  const cents = String(abs % 100).padStart(2, '0');
  return `${bani < 0 ? '-' : ''}${whole},${cents}`;
};

/**
 * Parser strict în format românesc: '.' este separator de mii (doar grupuri de 3),
 * ',' este separator zecimal (maximum 2 zecimale), textul vid înseamnă 0.
 * Returnează null pentru orice altă formă.
 */
const parseRoBani = (raw: string): number | null => {
  const str = String(raw ?? '')
    .trim()
    .replace(/[\s\u00A0]/g, '');
  if (str === '') return 0;

  let negative = false;
  let body = str;
  if (body.startsWith('-')) {
    negative = true;
    body = body.slice(1);
  }
  if (body === '') return null;

  const commaCount = (body.match(/,/g) || []).length;
  if (commaCount > 1) return null;

  let integerRaw = body;
  let decimals = '';
  if (commaCount === 1) {
    const idx = body.lastIndexOf(',');
    integerRaw = body.slice(0, idx);
    decimals = body.slice(idx + 1);
    if (!/^[0-9]{1,2}$/.test(decimals)) return null;
  }

  let integerDigits: string;
  if (integerRaw.includes('.')) {
    const groups = integerRaw.split('.');
    const firstGroupOk = /^[0-9]{1,3}$/.test(groups[0]);
    const restGroupsOk = groups.slice(1).every((group) => /^[0-9]{3}$/.test(group));
    if (!firstGroupOk || !restGroupsOk) return null;
    integerDigits = groups.join('');
  } else {
    if (!/^[0-9]+$/.test(integerRaw)) return null;
    integerDigits = integerRaw;
  }

  const bani = Number(integerDigits) * 100 + Number((decimals || '0').padEnd(2, '0'));
  if (!Number.isFinite(bani)) return null;
  return negative ? -bani : bani;
};

const describeError = (err: any): string => {
  const status = err?.status;
  const code = err?.code;
  const message = err?.message || 'Eroare necunoscută';
  if (code === 'CONFLICT' || status === 409) {
    return `Conflict de versiune: balanța a fost modificată între timp. Reîncărcați și reluați repartizarea. (${message})`;
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
// COMPONENTĂ
// =========================================================================

export const RedistributeModal: React.FC<RedistributeModalProps> = ({
  isOpen,
  onClose,
  companyId,
  batch,
  parentLine,
  childLines,
  onDone,
}) => {
  const [draft, setDraft] = useState<Draft>({});
  const [bulkAccountId, setBulkAccountId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Identitatea analiticelor: reinițializăm câmpurile doar când se schimbă lotul sau analiticele. */
  const childKey = useMemo(
    () => childLines.map((line) => line.account_id).join(','),
    [childLines]
  );

  useEffect(() => {
    if (!isOpen) return;
    const next: Draft = {};
    for (const line of childLines) {
      next[line.account_id] = {
        debit_initial: formatBaniForInput(toBani(line.debit_initial)),
        credit_initial: formatBaniForInput(toBani(line.credit_initial)),
        debit_prev: formatBaniForInput(toBani(line.debit_prev)),
        credit_prev: formatBaniForInput(toBani(line.credit_prev)),
      };
    }
    setDraft(next);
    setBulkAccountId(childLines.length > 0 ? childLines[0].account_id : null);
    setError(null);
    setSaving(false);
    // Reinițializarea depinde doar de identitatea analiticelor, nu de identitatea array-ului.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, batch.id, parentLine.account_id, childKey]);

  const parentBani = useMemo(
    () => ({
      debit_initial: toBani(parentLine.debit_initial),
      credit_initial: toBani(parentLine.credit_initial),
      debit_prev: toBani(parentLine.debit_prev),
      credit_prev: toBani(parentLine.credit_prev),
    }),
    [parentLine]
  );

  const parsed = useMemo(() => {
    const rows: Record<number, Record<AmountField, number | null>> = {};
    for (const line of childLines) {
      const row = draft[line.account_id] ?? EMPTY_ROW;
      rows[line.account_id] = {
        debit_initial: parseRoBani(row.debit_initial),
        credit_initial: parseRoBani(row.credit_initial),
        debit_prev: parseRoBani(row.debit_prev),
        credit_prev: parseRoBani(row.credit_prev),
      };
    }
    return rows;
  }, [draft, childLines]);

  const invalidCells = useMemo(
    () =>
      childLines.reduce(
        (total, line) =>
          total +
          FIELDS.filter((field) => (parsed[line.account_id]?.[field] ?? 0) === null).length,
        0
      ),
    [parsed, childLines]
  );

  const remainders = useMemo(() => {
    const out = {} as Record<AmountField, number>;
    for (const field of FIELDS) {
      const allocated = childLines.reduce(
        (sum, line) => sum + (parsed[line.account_id]?.[field] ?? 0),
        0
      );
      out[field] = parentBani[field] - allocated;
    }
    return out;
  }, [parsed, childLines, parentBani]);

  const balanced = FIELDS.every((field) => remainders[field] === 0);
  const canSubmit = balanced && invalidCells === 0 && childLines.length > 0 && !saving;

  if (!isOpen) return null;

  const setCell = (accountId: number, field: AmountField, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [accountId]: { ...(prev[accountId] ?? EMPTY_ROW), [field]: value },
    }));
  };

  const handleBulkAllocate = () => {
    if (bulkAccountId === null) return;
    const next: Draft = {};
    for (const line of childLines) {
      const isTarget = line.account_id === bulkAccountId;
      next[line.account_id] = {
        debit_initial: isTarget ? formatBaniForInput(parentBani.debit_initial) : '0,00',
        credit_initial: isTarget ? formatBaniForInput(parentBani.credit_initial) : '0,00',
        debit_prev: isTarget ? formatBaniForInput(parentBani.debit_prev) : '0,00',
        credit_prev: isTarget ? formatBaniForInput(parentBani.credit_prev) : '0,00',
      };
    }
    setDraft(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const allocations = childLines
      .map((line) => {
        const row = parsed[line.account_id];
        return {
          account_id: line.account_id,
          debit_initial: row?.debit_initial ?? 0,
          credit_initial: row?.credit_initial ?? 0,
          debit_prev: row?.debit_prev ?? 0,
          credit_prev: row?.credit_prev ?? 0,
        };
      })
      .filter(
        (row) =>
          row.debit_initial !== 0 ||
          row.credit_initial !== 0 ||
          row.debit_prev !== 0 ||
          row.credit_prev !== 0
      )
      .map((row) => ({
        account_id: row.account_id,
        debit_initial: row.debit_initial / 100,
        credit_initial: row.credit_initial / 100,
        debit_prev: row.debit_prev / 100,
        credit_prev: row.credit_prev / 100,
      }));

    setSaving(true);
    setError(null);
    try {
      const result = await api.redistributeOpeningBalance(companyId, batch.id, {
        parent_account_id: parentLine.account_id,
        version: batch.version,
        allocations,
      });
      onDone({ batch: result.batch, lines: result.lines, verification: result.verification });
      onClose();
    } catch (err: any) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const remainderClass = (value: number): string =>
    value === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Repartizare sold pe analitice
              </h2>
              <p className="text-xs text-slate-500">
                Cont {parentLine.account_symbol} — {parentLine.account_name} · exercițiu{' '}
                {batch.fiscal_year} · lot v{batch.version}
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

        {/* Body */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto text-xs">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Repartizarea mută soldul de pe contul sintetic pe analitice și conservă exact totalul.
          </p>

          {/* Valorile proprii ale sinteticului */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Valori proprii cont sintetic {parentLine.account_symbol}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FIELDS.map((field) => (
                <div key={field}>
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">
                    {FIELD_LABELS[field]}
                  </div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatBani(parentBani[field])}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ajutor: totul pe un analitic */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Analitic țintă
              </label>
              <select
                value={bulkAccountId ?? ''}
                onChange={(e) => setBulkAccountId(e.target.value === '' ? null : Number(e.target.value))}
                disabled={childLines.length === 0 || saving}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium"
              >
                {childLines.map((line) => (
                  <option key={line.account_id} value={line.account_id}>
                    {line.account_symbol} — {line.account_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleBulkAllocate}
              disabled={bulkAccountId === null || childLines.length === 0 || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Totul pe un analitic
            </button>
          </div>

          {/* Tabel analitice */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="max-h-72 overflow-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Analitic</th>
                    {FIELDS.map((field) => (
                      <th key={field} className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">
                        {FIELD_LABELS[field]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {childLines.map((line) => {
                    const row = draft[line.account_id] ?? EMPTY_ROW;
                    const values = parsed[line.account_id];
                    return (
                      <tr key={line.account_id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-2 py-1.5">
                          <div className="font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {line.account_symbol}
                          </div>
                          <div className="text-[10px] text-slate-500">{line.account_name}</div>
                        </td>
                        {FIELDS.map((field) => {
                          const invalid = (values?.[field] ?? 0) === null;
                          return (
                            <td key={field} className="px-1 py-1">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={row[field]}
                                onChange={(e) => setCell(line.account_id, field, e.target.value)}
                                disabled={saving}
                                aria-label={`${FIELD_LABELS[field]} ${line.account_symbol}`}
                                className={`w-full px-2 py-1 text-right font-mono rounded-lg border bg-white dark:bg-slate-950 ${
                                  invalid
                                    ? 'border-red-300 dark:border-red-900 text-red-600 dark:text-red-400'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {childLines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-3 text-center text-slate-500">
                        Contul sintetic nu are analitice în lotul curent.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-950/40">
                  <tr className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200">
                      Rămas de repartizat
                    </td>
                    {FIELDS.map((field) => (
                      <td
                        key={field}
                        className={`px-2 py-1.5 text-right font-mono font-semibold ${remainderClass(
                          remainders[field]
                        )}`}
                      >
                        {formatBani(remainders[field])}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {invalidCells > 0 && (
            <p className="text-[11px] text-red-600 dark:text-red-400">
              {invalidCells} celule nu respectă formatul românesc (punctul separă miile, virgula
              zecimalele, maximum 2 zecimale).
            </p>
          )}
          {invalidCells === 0 && !balanced && (
            <p className="text-[11px] text-slate-500">
              Repartizarea este posibilă doar când toate cele patru diferențe sunt 0,00.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
          >
            Anulează
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs disabled:opacity-50"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Repartizează
          </button>
        </div>
      </div>
    </div>
  );
};
