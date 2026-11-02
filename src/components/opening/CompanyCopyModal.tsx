/**
 * Preluarea balanței de pornire din altă societate a utilizatorului.
 *
 * Fluxul are două etape: previzualizarea (sursă, erori, totaluri, rânduri mapate
 * pe simbol) și aplicarea preluării. Confirmările suplimentare (reimport pentru
 * aceeași amprentă, înlocuirea conturilor existente) sunt cerute doar când
 * previzualizarea semnalează situația respectivă.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { X, Copy, AlertCircle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { api } from '../../services/api';
import {
  CompanyListItem,
  OpeningBalanceLine,
  OpeningBatch,
  OpeningVerificationResult,
} from '../../types/company';

interface CompanyCopyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  batch: OpeningBatch;
  onDone: (result: {
    batch: OpeningBatch;
    lines: OpeningBalanceLine[];
    verification: OpeningVerificationResult;
    note?: string;
  }) => void;
}

// =========================================================================
// TIPURI (oglindesc rezultatul previzualizării din server/openingCopy.ts)
// =========================================================================

type CopyRowStatus = 'OK' | 'ERROR';

interface CopyRow {
  symbol: string;
  name: string;
  source_account_id: number;
  target_account_id: number | null;
  debit_initial: number;
  credit_initial: number;
  debit_prev: number;
  credit_prev: number;
  currency: string;
  currency_amount: number;
  exchange_rate: number;
  exchange_rate_date: string | null;
  exchange_rate_source: string;
  status: CopyRowStatus;
  messages: string[];
}

interface CopySource {
  company_id: number;
  name: string;
  cui: string;
  fiscal_year: number;
  batch_id: number;
  integrity_hash: string | null;
  validated_at: string | null;
}

interface CopyDuplicate {
  id: number;
  created_at: string;
  user_name: string | null;
}

interface CopyPreview {
  source: CopySource;
  rows: CopyRow[];
  errors: string[];
  totals: {
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
  };
  is_balanced: boolean;
  content_hash: string;
  duplicate_of: CopyDuplicate | null;
  existing_lines_count: number;
  can_commit: boolean;
}

// =========================================================================
// HELPERE
// =========================================================================

const fmt = (value: number): string =>
  new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

const fmtDateTime = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'short' });
};

const describeError = (err: any): string => {
  const status = err?.status;
  const code = err?.code;
  const message = err?.message || 'Eroare necunoscută';
  // 403: se afișează mesajul serverului, fără reformulare.
  if (code === 'FORBIDDEN' || status === 403) return message;
  if (code === 'CONFLICT' || status === 409) {
    return `Conflict: balanța a fost modificată între timp. Reîncărcați și reluați preluarea. (${message})`;
  }
  if (code === 'CONFIRMATION_REQUIRED') {
    return `Este necesară o confirmare suplimentară. (${message})`;
  }
  if (code === 'VALIDATION' || status === 400) {
    return `Date invalide: ${message}`;
  }
  return message;
};

const STATUS_BADGE: Record<CopyRowStatus, string> = {
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900',
  ERROR: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-900',
};

// =========================================================================
// COMPONENTĂ
// =========================================================================

export const CompanyCopyModal: React.FC<CompanyCopyModalProps> = ({
  isOpen,
  onClose,
  companyId,
  batch,
  onDone,
}) => {
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [sourceCompanyId, setSourceCompanyId] = useState<number | null>(null);
  const [preview, setPreview] = useState<CopyPreview | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmReimport, setConfirmReimport] = useState(false);
  const [busy, setBusy] = useState<'companies' | 'preview' | 'commit' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setPreview(null);
    setSourceCompanyId(null);
    setConfirmReplace(false);
    setConfirmReimport(false);
    setError(null);

    let cancelled = false;
    setBusy('companies');
    (async () => {
      try {
        const list = await api.getCompanies();
        if (cancelled) return;
        setCompanies(list.filter((company) => company.id !== companyId));
      } catch (err: any) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) setBusy(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  const errorRows = useMemo(
    () => (preview ? preview.rows.filter((row) => row.status === 'ERROR').length : 0),
    [preview]
  );

  if (!isOpen) return null;

  const handlePreview = async () => {
    if (sourceCompanyId === null) return;
    setBusy('preview');
    setError(null);
    setPreview(null);
    setConfirmReplace(false);
    setConfirmReimport(false);
    try {
      const result = (await api.previewCompanyCopy(companyId, {
        target_batch_id: batch.id,
        source_company_id: sourceCompanyId,
      })) as CopyPreview;
      setPreview(result);
    } catch (err: any) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (sourceCompanyId === null || !preview || !preview.can_commit) return;
    setBusy('commit');
    setError(null);
    try {
      const result = await api.commitCompanyCopy(companyId, {
        target_batch_id: batch.id,
        source_company_id: sourceCompanyId,
        version: batch.version,
        confirm_replace: confirmReplace,
        confirm_reimport: confirmReimport,
      });
      onDone({
        batch: result.batch,
        lines: result.lines,
        verification: result.verification,
        note: result.note,
      });
      onClose();
    } catch (err: any) {
      setError(describeError(err));
    } finally {
      setBusy(null);
    }
  };

  const requireReimport = preview !== null && preview.duplicate_of !== null;
  const requireReplace = preview !== null && preview.existing_lines_count > 0;
  const confirmationsOk =
    (!requireReimport || confirmReimport) && (!requireReplace || confirmReplace);
  const canApply =
    preview !== null && preview.can_commit && confirmationsOk && busy === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Preluare balanță din altă societate
              </h2>
              <p className="text-xs text-slate-500">
                Lot curent {batch.fiscal_year} · v{batch.version} · {batch.base_currency}
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
            Se preiau doar balanțe validate. Conturile se asociază după simbol. Soldurile terților nu
            se copiază.
          </p>

          {/* Selectarea sursei */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Societate sursă
              </label>
              <select
                value={sourceCompanyId ?? ''}
                onChange={(e) => {
                  setSourceCompanyId(e.target.value === '' ? null : Number(e.target.value));
                  setPreview(null);
                  setConfirmReplace(false);
                  setConfirmReimport(false);
                }}
                disabled={busy === 'companies' || busy === 'commit'}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium"
              >
                <option value="">
                  {busy === 'companies' ? 'Se încarcă societățile…' : '— Alege societatea sursă —'}
                </option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name} · CUI {company.cui}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => void handlePreview()}
              disabled={sourceCompanyId === null || busy !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === 'preview' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              Previzualizează
            </button>
          </div>

          {preview && (
            <>
              {/* Sursa */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Societate</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {preview.source.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">CUI</div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {preview.source.cui}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Exercițiu</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {preview.source.fiscal_year}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Validat la</div>
                    <div className="text-slate-700 dark:text-slate-300">
                      {fmtDateTime(preview.source.validated_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Amprentă</div>
                    <div className="font-mono text-slate-700 dark:text-slate-300">
                      {preview.source.integrity_hash
                        ? preview.source.integrity_hash.slice(0, 12)
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Erori previzualizare */}
              {preview.errors.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <ul className="space-y-0.5">
                    {preview.errors.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Totaluri și echilibru */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      Debit inițial
                    </div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {fmt(preview.totals.debit_initial)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      Credit inițial
                    </div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {fmt(preview.totals.credit_initial)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      Debit precedent
                    </div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {fmt(preview.totals.debit_prev)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                      Credit precedent
                    </div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {fmt(preview.totals.credit_prev)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                      preview.is_balanced
                        ? STATUS_BADGE.OK
                        : STATUS_BADGE.ERROR
                    }`}
                  >
                    {preview.is_balanced ? 'Echilibrat' : 'Dezechilibrat'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {preview.rows.length} rânduri · {errorRows} cu probleme · lotul curent are deja{' '}
                    {preview.existing_lines_count} conturi cu solduri
                  </span>
                </div>
              </div>

              {/* Rândurile preluate */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 dark:bg-slate-950/40 text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold">Simbol</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Denumire</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Debit iniț.</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Credit iniț.</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Debit prec.</th>
                        <th className="px-2 py-1.5 text-right font-semibold">Credit prec.</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Monedă</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Stare</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row) => (
                        <tr
                          key={`${row.symbol}-${row.source_account_id}`}
                          className="border-t border-slate-100 dark:border-slate-800"
                        >
                          <td className="px-2 py-1.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {row.symbol}
                            {row.target_account_id === null && (
                              <span className="ml-1 text-[10px] font-medium text-red-600">
                                (necorelat)
                              </span>
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
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                {row.messages.join(' · ')}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {preview.rows.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-2 py-3 text-center text-slate-500">
                            Balanța sursă nu conține rânduri de preluat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicat și confirmări */}
              {preview.duplicate_of && (
                <label className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <input
                    type="checkbox"
                    checked={confirmReimport}
                    onChange={(e) => setConfirmReimport(e.target.checked)}
                    disabled={busy === 'commit'}
                    className="mt-0.5"
                  />
                  <span>
                    Același conținut a fost preluat la{' '}
                    {fmtDateTime(preview.duplicate_of.created_at)} de{' '}
                    {preview.duplicate_of.user_name || 'utilizator necunoscut'}. Confirm reimportul
                    (valorile se înlocuiesc, nu se adună).
                  </span>
                </label>
              )}

              {preview.existing_lines_count > 0 && (
                <label className="flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <input
                    type="checkbox"
                    checked={confirmReplace}
                    onChange={(e) => setConfirmReplace(e.target.checked)}
                    disabled={busy === 'commit'}
                    className="mt-0.5"
                  />
                  <span>
                    Balanța conține deja {preview.existing_lines_count} conturi cu solduri. Confirm
                    înlocuirea lor cu valorile preluate.
                  </span>
                </label>
              )}

              {preview.can_commit ? (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Previzualizarea este completă și poate fi aplicată în lotul curent.</span>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Preluarea nu poate fi aplicată în starea curentă. Remediați erorile semnalate mai
                    sus.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy === 'commit'}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg disabled:opacity-50"
          >
            Anulează
          </button>
          <button
            onClick={() => void handleCommit()}
            disabled={!canApply}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === 'commit' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Aplică preluarea
          </button>
        </div>
      </div>
    </div>
  );
};
