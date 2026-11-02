import * as XLSX from 'xlsx';
import { db } from './db';
import { getOpeningBalanceLines, verifyOpeningBalance, OpeningBatch } from './openingBalance';
import { formatBani, toBani, fromBani } from './money';

/**
 * Export balanță de pornire (CSV / XLSX) și șablon de import.
 *
 * CSV-ul folosește BOM UTF-8, separator ';' și terminatoare de linie CRLF,
 * astfel încât fișierul rezultat să poată fi reimportat fără transformări.
 */

const CSV_BOM = '\uFEFF';
const CSV_SEPARATOR = ';';
const CSV_CRLF = '\r\n';

/** Coloanele exportului complet de balanță de pornire (ordinea este obligatorie). */
const EXPORT_COLUMNS = [
  'Cont',
  'Denumire',
  'Debit inițial',
  'Credit inițial',
  'Debit precedent',
  'Credit precedent',
  'Sold debitor',
  'Sold creditor',
  'Monedă',
  'Sumă valută',
  'Curs',
  'Data curs',
  'Sursă curs',
  'Sursă valoare',
  'Observații',
  'Tip rând'
];

/** Coloanele șablonului de import (fișier gol, pregătit pentru completare manuală). */
const TEMPLATE_COLUMNS = [
  'Cont',
  'Denumire',
  'Debit inițial',
  'Credit inițial',
  'Debit precedent',
  'Credit precedent',
  'Monedă',
  'Sumă valută'
];

export interface OpeningExportFile {
  filename: string;
  mime: string;
  buffer: Buffer;
}

interface OpeningExportRow {
  account_symbol: string;
  account_name: string;
  debit_initial_bani: number;
  credit_initial_bani: number;
  debit_prev_bani: number;
  credit_prev_bani: number;
  debit_final_bani: number;
  credit_final_bani: number;
  currency: string;
  currency_amount_bani: number;
  exchange_rate: number;
  exchange_rate_date: string;
  exchange_rate_source: string;
  value_source: string;
  notes: string;
  row_type: string;
}

/** Escapează un câmp CSV: ghilimele doar când apare separatorul, ghilimea sau linie nouă. */
function csvField(value: string | number): string {
  const s = String(value ?? '');
  if (s.includes(CSV_SEPARATOR) || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(fields: Array<string | number>): string {
  return fields.map(csvField).join(CSV_SEPARATOR);
}

/** Cursul de schimb este afișat cu virgulă zecimală, consecvent cu sumele în format RO. */
function formatRate(rate: number): string {
  const value = Number.isFinite(rate) ? rate : 0;
  return value.toFixed(4).replace('.', ',');
}

function getCompanyOrThrow(companyId: number): { name: string; cui: string } {
  const company = db
    .prepare('SELECT name, cui FROM companies WHERE id = ?')
    .get(companyId) as { name: string; cui: string } | undefined;

  if (!company) {
    throw new Error('Societatea nu a fost găsită.');
  }

  return company;
}

/** Construiește liniile exportului: doar conturile cu valori, inclusiv rândurile sumar. */
function buildExportRows(batchId: number, companyId: number): OpeningExportRow[] {
  const lines = getOpeningBalanceLines(batchId, companyId);

  const savedLines = db
    .prepare(`
      SELECT account_id, exchange_rate_source, value_source
      FROM accounting_opening_balance_lines
      WHERE batch_id = ?
    `)
    .all(batchId) as Array<{
    account_id: number;
    exchange_rate_source: string | null;
    value_source: string | null;
  }>;

  const savedMap = new Map<number, { exchange_rate_source: string | null; value_source: string | null }>();
  for (const saved of savedLines) {
    savedMap.set(saved.account_id, saved);
  }

  const rows: OpeningExportRow[] = [];

  for (const line of lines) {
    const debitInitialBani = toBani(line.debit_initial);
    const creditInitialBani = toBani(line.credit_initial);
    const debitPrevBani = toBani(line.debit_prev);
    const creditPrevBani = toBani(line.credit_prev);

    // Rândurile complet goale nu se exportă; rândurile sumar cu valori rămân incluse.
    if (debitInitialBani === 0 && creditInitialBani === 0 && debitPrevBani === 0 && creditPrevBani === 0) {
      continue;
    }

    const saved = savedMap.get(line.account_id);
    let rowType = 'Sintetic';
    if (line.is_synthetic_summary) {
      rowType = 'Sintetic – total analitice';
    } else if (line.account_type === 'ANALYTIC') {
      rowType = 'Analitic';
    }

    rows.push({
      account_symbol: line.account_symbol,
      account_name: line.account_name,
      debit_initial_bani: debitInitialBani,
      credit_initial_bani: creditInitialBani,
      debit_prev_bani: debitPrevBani,
      credit_prev_bani: creditPrevBani,
      debit_final_bani: toBani(line.debit_final),
      credit_final_bani: toBani(line.credit_final),
      currency: line.currency || '',
      currency_amount_bani: toBani(line.currency_amount),
      exchange_rate: line.exchange_rate || 0,
      exchange_rate_date: line.exchange_rate_date || '',
      exchange_rate_source: saved?.exchange_rate_source || '',
      value_source: saved?.value_source || '',
      notes: line.notes || '',
      row_type: rowType
    });
  }

  rows.sort((a, b) => (a.account_symbol < b.account_symbol ? -1 : a.account_symbol > b.account_symbol ? 1 : 0));

  return rows;
}

function buildExportCsv(rows: OpeningExportRow[]): Buffer {
  const csvLines: string[] = [csvRow(EXPORT_COLUMNS)];

  for (const row of rows) {
    csvLines.push(csvRow([
      row.account_symbol,
      row.account_name,
      formatBani(row.debit_initial_bani, 'RO'),
      formatBani(row.credit_initial_bani, 'RO'),
      formatBani(row.debit_prev_bani, 'RO'),
      formatBani(row.credit_prev_bani, 'RO'),
      formatBani(row.debit_final_bani, 'RO'),
      formatBani(row.credit_final_bani, 'RO'),
      row.currency,
      formatBani(row.currency_amount_bani, 'RO'),
      formatRate(row.exchange_rate),
      row.exchange_rate_date,
      row.exchange_rate_source,
      row.value_source,
      row.notes,
      row.row_type
    ]));
  }

  return Buffer.from(CSV_BOM + csvLines.join(CSV_CRLF) + CSV_CRLF, 'utf8');
}

function buildExportXlsx(
  rows: OpeningExportRow[],
  company: { name: string; cui: string },
  batch: OpeningBatch,
  totals: {
    total_debit_initial: number;
    total_credit_initial: number;
    total_debit_prev: number;
    total_credit_prev: number;
    total_debit_final: number;
    total_credit_final: number;
  }
): Buffer {
  const balantaData: Array<Array<string | number>> = [[...EXPORT_COLUMNS]];

  for (const row of rows) {
    balantaData.push([
      row.account_symbol,
      row.account_name,
      fromBani(row.debit_initial_bani),
      fromBani(row.credit_initial_bani),
      fromBani(row.debit_prev_bani),
      fromBani(row.credit_prev_bani),
      fromBani(row.debit_final_bani),
      fromBani(row.credit_final_bani),
      row.currency,
      fromBani(row.currency_amount_bani),
      row.exchange_rate,
      row.exchange_rate_date,
      row.exchange_rate_source,
      row.value_source,
      row.notes,
      row.row_type
    ]);
  }

  const infoData: Array<Array<string | number>> = [
    ['Câmp', 'Valoare'],
    ['Societate', company.name],
    ['CUI', company.cui],
    ['Exercițiu', batch.fiscal_year],
    ['Luna începerii', batch.start_month],
    ['Tip preluare', batch.batch_type],
    ['Stare', batch.status],
    ['Versiune', batch.version],
    ['Validat de', batch.validated_by_name || ''],
    ['Validat la', batch.validated_at || ''],
    ['Amprentă integritate', batch.integrity_hash || ''],
    ['Total debit inițial', fromBani(totals.total_debit_initial)],
    ['Total credit inițial', fromBani(totals.total_credit_initial)],
    ['Total debit precedent', fromBani(totals.total_debit_prev)],
    ['Total credit precedent', fromBani(totals.total_credit_prev)],
    ['Sold debitor total', fromBani(totals.total_debit_final)],
    ['Sold creditor total', fromBani(totals.total_credit_final)],
    ['Data exportului', new Date().toISOString()]
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(balantaData), 'Balanta');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(infoData), 'Info');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Export complet al balanței de pornire pentru un lot.
 * Loghează operațiunea cu acțiunea 'EXPORT' în jurnalul de validare.
 */
export function buildOpeningExport(
  companyId: number,
  batchId: number,
  format: 'csv' | 'xlsx',
  userId: number,
  userName: string
): OpeningExportFile {
  const batch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE id = ? AND company_id = ?')
    .get(batchId, companyId) as OpeningBatch | undefined;

  if (!batch) {
    throw new Error('Lotul de balanță de pornire nu a fost găsit.');
  }

  const company = getCompanyOrThrow(companyId);
  const rows = buildExportRows(batchId, companyId);
  const verification = verifyOpeningBalance(companyId, batchId);

  const filename = `balanta_pornire_${company.cui}_${batch.fiscal_year}.${format}`;

  let mime: string;
  let buffer: Buffer;
  if (format === 'xlsx') {
    mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    buffer = buildExportXlsx(rows, company, batch, verification.totals);
  } else {
    mime = 'text/csv; charset=utf-8';
    buffer = buildExportCsv(rows);
  }

  db.prepare(`
    INSERT INTO accounting_opening_validation_logs (
      batch_id, action, user_id, user_name, reason, details, created_at
    ) VALUES (?, 'EXPORT', ?, ?, 'Export balanță de pornire', ?, ?)
  `).run(
    batchId,
    userId || null,
    userName || 'Sistem',
    `Format: ${format}, rânduri: ${rows.length}`,
    new Date().toISOString()
  );

  return { filename, mime, buffer };
}

/**
 * Șablon CSV gol pentru importul balanței de pornire.
 * Conține doar conturile active fără analitice active, cu sume goale.
 */
export function buildImportTemplate(companyId: number): OpeningExportFile {
  const company = getCompanyOrThrow(companyId);

  const accounts = db.prepare(`
    SELECT a.symbol, a.name
    FROM accounting_accounts a
    WHERE a.company_id = ? AND a.is_active = 1
      AND NOT EXISTS (
        SELECT 1 FROM accounting_accounts c
        WHERE c.parent_id = a.id AND c.is_active = 1
      )
    ORDER BY a.symbol ASC
  `).all(companyId) as Array<{ symbol: string; name: string }>;

  const csvLines: string[] = [csvRow(TEMPLATE_COLUMNS)];

  for (const account of accounts) {
    csvLines.push(csvRow([
      account.symbol,
      account.name,
      '',
      '',
      '',
      '',
      '',
      ''
    ]));
  }

  const buffer = Buffer.from(CSV_BOM + csvLines.join(CSV_CRLF) + CSV_CRLF, 'utf8');

  return {
    filename: `sablon_balanta_pornire_${company.cui}.csv`,
    mime: 'text/csv; charset=utf-8',
    buffer
  };
}
