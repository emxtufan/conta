import { useEffect, useState } from 'react';
import { X, History, Upload, FileSpreadsheet, User, Calendar, ShieldCheck, AlertCircle, Inbox } from 'lucide-react';
import { api } from '../../services/api';
import { OpeningValidationLog, OpeningImportRecord } from '../../types/company';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Creare',
  SETUP: 'Configurare tip preluare',
  SAVE: 'Salvare',
  VERIFY: 'Verificare',
  VALIDATE: 'Validare',
  INVALIDATE: 'Devalidare',
  IMPORT: 'Import fișier',
  COPY_COMPANY: 'Preluare din altă societate',
  REDISTRIBUTE: 'Repartizare pe analitice',
  EXPORT: 'Export',
};

const SOURCE_LABELS: Record<string, string> = {
  CSV: 'CSV',
  XLSX: 'XLSX',
  COMPANY_COPY: 'Altă societate',
};

const STATUS_LABELS: Record<string, string> = {
  COMMITTED: 'Aplicat',
  SUPERSEDED: 'Înlocuit',
};

const actionLabel = (action: string): string => ACTION_LABELS[action] || action;

const actionBadgeClass = (action: string): string => {
  if (action === 'VALIDATE') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50';
  }
  if (action === 'INVALIDATE') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50';
  }
  if (action === 'IMPORT' || action === 'COPY_COMPANY') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50';
  }
  return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
};

const statusBadgeClass = (status: string): string => {
  if (status === 'COMMITTED') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50';
};

const formatDateTime = (value: string): string => new Date(value).toLocaleString('ro-RO');

const formatAmount = (value: number): string =>
  (value ?? 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Returnează detaliile formatate dacă sunt JSON valid, altfel null. */
const formatJsonDetails = (details: string | null): string | null => {
  if (!details) return null;
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return null;
  }
};

export function OpeningHistoryModal(props: {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  batchId: number;
}) {
  const { isOpen, onClose, companyId, batchId } = props;

  const [activeTab, setActiveTab] = useState<'jurnal' | 'importuri'>('jurnal');
  const [logs, setLogs] = useState<OpeningValidationLog[]>([]);
  const [imports, setImports] = useState<OpeningImportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const [logItems, importItems] = await Promise.all([
          api.getOpeningValidationLogs(companyId, batchId),
          api.getOpeningImports(companyId, batchId),
        ]);
        if (!active) return;
        setLogs(logItems);
        setImports(importItems);
      } catch (err: any) {
        if (!active) return;
        console.error('Eroare la încărcarea istoricului lotului:', err);
        setLogs([]);
        setImports([]);
        setError(err?.message || 'Eroare la încărcarea istoricului lotului.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();

    return () => {
      active = false;
    };
  }, [isOpen, companyId, batchId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Istoric lot de preluare solduri
              </h2>
              <p className="text-xs text-slate-500">
                Jurnalul modificărilor și importurile înregistrate pentru lotul #{batchId}
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

        {/* Bara de taburi */}
        <div className="flex items-center gap-1 px-5 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('jurnal')}
            className={`px-4 py-2 text-xs font-semibold -mb-px border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'jurnal'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Jurnal modificări
          </button>
          <button
            onClick={() => setActiveTab('importuri')}
            className={`px-4 py-2 text-xs font-semibold -mb-px border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'importuri'
                ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Importuri și preluări
          </button>
        </div>

        {/* Conținut */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Se încarcă istoricul...</div>
          ) : error ? (
            <div className="py-12 px-6 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Nu am putut încărca istoricul lotului.
              </p>
              <p className="text-[11px] text-slate-500">{error}</p>
            </div>
          ) : activeTab === 'jurnal' ? (
            logs.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-1">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Nu există modificări înregistrate încă.
                </p>
                <p className="text-[11px] text-slate-400">
                  Jurnalul se completează automat la crearea, salvgardarea sau validarea lotului.
                </p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/60 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Data</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Acțiune</th>
                    <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Utilizator</th>
                    <th className="px-3 py-2 text-left font-semibold">Motiv</th>
                    <th className="px-3 py-2 text-left font-semibold">Detalii</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const formattedDetails = formatJsonDetails(log.details);
                    return (
                      <tr
                        key={log.id}
                        className="border-t border-slate-100 dark:border-slate-800 align-top hover:bg-slate-50/60 dark:hover:bg-slate-950/40"
                      >
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDateTime(log.created_at)}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${actionBadgeClass(
                              log.action
                            )}`}
                          >
                            {actionLabel(log.action)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {log.user_name || 'Sistem'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-xs">
                          {log.reason || <span className="italic text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-sm">
                          {formattedDetails ? (
                            <details>
                              <summary className="cursor-pointer text-blue-600 dark:text-blue-400 font-medium">
                                Vezi detalii
                              </summary>
                              <pre className="mt-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] whitespace-pre-wrap break-all">
                                {formattedDetails}
                              </pre>
                            </details>
                          ) : log.details ? (
                            <span className="break-words">{log.details}</span>
                          ) : (
                            <span className="italic text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : imports.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-1">
              <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Nu există importuri sau preluări pentru acest lot.
              </p>
              <p className="text-[11px] text-slate-400">
                Importurile din fișier CSV/XLSX și preluările din altă societate apar aici după aplicare.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Data</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Sursă</th>
                  <th className="px-3 py-2 text-left font-semibold">Fișier/descriere</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">Rânduri</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">DI</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">CI</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">DP</th>
                  <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">CP</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Stare</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Utilizator</th>
                  <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">Amprentă</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((record) => (
                  <tr
                    key={record.id}
                    className="border-t border-slate-100 dark:border-slate-800 align-top hover:bg-slate-50/60 dark:hover:bg-slate-950/40"
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTime(record.created_at)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                        <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                        {SOURCE_LABELS[record.source_type] || record.source_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-xs">
                      <div className="break-words" title={record.file_name}>
                        {record.file_name || <span className="italic text-slate-400">—</span>}
                      </div>
                      {record.source_type === 'COMPANY_COPY' && record.source_company_id !== null && (
                        <div className="text-[11px] text-slate-400">
                          De la societatea #{record.source_company_id}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300">
                      {record.row_count.toLocaleString('ro-RO')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatAmount(record.total_debit_initial)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatAmount(record.total_credit_initial)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatAmount(record.total_debit_prev)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {formatAmount(record.total_credit_prev)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${statusBadgeClass(
                          record.status
                        )}`}
                      >
                        {STATUS_LABELS[record.status] || record.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {record.user_name || 'Sistem'}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {record.content_hash ? (
                        <span
                          className="font-mono text-[11px] text-slate-500 dark:text-slate-400"
                          title={record.content_hash}
                        >
                          {record.content_hash.slice(0, 12)}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
}
