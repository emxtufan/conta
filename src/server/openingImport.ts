/**
 * Import fișiere CSV / XLSX pentru balanța de pornire.
 *
 * Modulul se ocupă exclusiv de partea de citire și normalizare a fișierului:
 * - fișierul este decodat din base64 și transformat în celule uniforme (ImportCell);
 * - CSV-ul este parsat cu un parser propriu, conform RFC4180, fără a folosi
 *   biblioteca xlsx (care ar reinterpreta valorile de tip „1.234,56”);
 * - XLSX-ul este citit cu biblioteca xlsx, din prima foaie;
 * - coloanele sunt mapate pe câmpurile balanței, iar sumele sunt convertite în
 *   bani întregi prin utilitarele din money.ts.
 */

import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { db } from './db';
import { AmountFormat, fromBani, parseAmount, toBani } from './money';
import { BatchStatus, BatchType, getAllowedCurrencies } from './openingBalance';

// =========================================================================
// TIPURI
// =========================================================================

/** O celulă normalizată: t='n' pentru numere, t='s' pentru text. */
export type ImportCell = { t: 'n' | 's'; v: string; w: string };

export type ImportSourceType = 'CSV' | 'XLSX';

export type ParsedImportFile = { source_type: ImportSourceType; rows: ImportCell[][] };

/** Indici de coloană 0-based; câmpurile opționale lipsesc dacă nu sunt mapate. */
export type ImportMapping = {
  account: number;
  name?: number;
  debit_initial: number;
  credit_initial: number;
  debit_prev: number;
  credit_prev: number;
  currency?: number;
  currency_amount?: number;
};

export type ImportMapOptions = { has_header: boolean; number_format: AmountFormat };

export type ImportMappedItem = {
  row_no: number;
  symbol: string;
  name: string;
  debit_initial_bani: number;
  credit_initial_bani: number;
  debit_prev_bani: number;
  credit_prev_bani: number;
  currency: string;
  currency_amount_bani: number;
  errors: string[];
};

export type ImportMapResult = { items: ImportMappedItem[]; missing_columns: string[] };

export type ImportHeaderColumn = { index: number; label: string };

export type ImportHeaderPreview = { columns: ImportHeaderColumn[]; sample: string[][] };

// =========================================================================
// CONSTANTE
// =========================================================================

/** Dimensiunea maximă acceptată pentru un fișier încărcat (5 MB). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Numărul maxim de rânduri acceptate dintr-un fișier. */
const MAX_ROWS = 5000;

/** Numărul de rânduri de mostră returnate pentru previzualizare. */
const SAMPLE_ROWS = 20;

type CsvDelimiter = ';' | ',' | '\t';

/** Ordinea contează: la egalitate se păstrează ';' (primul candidat). */
const CSV_DELIMITERS: CsvDelimiter[] = [';', ',', '\t'];

/** Etichetele în română folosite în mesajele de eroare și în missing_columns. */
const IMPORT_FIELD_LABELS: Record<keyof ImportMapping, string> = {
  account: 'Cont',
  name: 'Denumire',
  debit_initial: 'Debit inițial',
  credit_initial: 'Credit inițial',
  debit_prev: 'Debit precedent',
  credit_prev: 'Credit precedent',
  currency: 'Valută',
  currency_amount: 'Sumă în valută'
};

/** Câmpurile fără de care un rând nu poate fi importat. */
const REQUIRED_IMPORT_FIELDS: Array<keyof ImportMapping> = [
  'account',
  'debit_initial',
  'credit_initial',
  'debit_prev',
  'credit_prev'
];

// =========================================================================
// HELPER-E PENTRU CELULE
// =========================================================================

/** Construiește o celulă de text: v = w = textul fără spații la capete. */
function textCell(raw: string): ImportCell {
  const text = String(raw ?? '').trim();
  return { t: 's', v: text, w: text };
}

/**
 * Textul afișabil al unei celule.
 * Pentru celulele numerice se folosește w (textul formatat din fișier), nu v.
 */
function cellText(cell: ImportCell | undefined): string {
  if (!cell) return '';
  const raw = cell.t === 'n' ? cell.w : cell.v;
  return String(raw ?? '').trim();
}

function isCellEmpty(cell: ImportCell): boolean {
  return cell.t === 's' && cell.v === '';
}

function isRowEmpty(row: ImportCell[]): boolean {
  return row.every(isCellEmpty);
}

/** Elimină rândurile complet goale de la finalul fișierului. */
function trimTrailingEmptyRows(rows: ImportCell[][]): ImportCell[][] {
  let end = rows.length;
  while (end > 0 && isRowEmpty(rows[end - 1])) end--;
  return rows.slice(0, end);
}

function countColumns(rows: ImportCell[][]): number {
  let max = 0;
  for (const row of rows) {
    if (row.length > max) max = row.length;
  }
  return max;
}

// =========================================================================
// PARSARE CSV (RFC4180)
// =========================================================================

/**
 * Găsește prima linie nevidă din text, ținând cont de ghilimele
 * (un newline din interiorul ghilimelelor nu încheie linia).
 */
function findFirstNonEmptyLine(text: string): string {
  let line = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      line += ch;
      if (ch === '"') {
        if (text[i + 1] === '"') {
          line += '"';
          i++;
        } else {
          inQuotes = false;
        }
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      line += ch;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (line.trim() !== '') return line;
      line = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
      continue;
    }

    line += ch;
  }

  return line;
}

/** Cel mai frecvent delimitator din prima linie nevidă, ignorând ghilimelele. */
function detectCsvDelimiter(text: string): CsvDelimiter {
  const line = findFirstNonEmptyLine(text);
  const counts: Record<CsvDelimiter, number> = { ';': 0, ',': 0, '\t': 0 };

  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === ';' || ch === ',' || ch === '\t')) {
      counts[ch]++;
    }
  }

  let best: CsvDelimiter = ';';
  for (const candidate of CSV_DELIMITERS) {
    if (counts[candidate] > counts[best]) best = candidate;
  }
  return best;
}

/**
 * Parser CSV propriu, conform RFC4180: ghilimele, "" ca ghilimea escapată,
 * newline în interiorul ghilimelelor, terminatori CRLF sau LF.
 * Toate celulele rezultate sunt de tip text.
 */
function parseCsvRows(buf: Buffer): ImportCell[][] {
  let text = buf.toString('utf8');
  // BOM UTF-8 eliminat
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const delimiter = detectCsvDelimiter(text);
  const rows: ImportCell[][] = [];
  let row: ImportCell[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"' && field === '') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === delimiter) {
      row.push(textCell(field));
      field = '';
      i++;
      continue;
    }

    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++;
      row.push(textCell(field));
      field = '';
      rows.push(row);
      row = [];
      continue;
    }

    field += ch;
    i++;
  }

  // Ultimul rând, dacă fișierul nu se termină cu un terminator de linie
  if (field !== '' || row.length > 0) {
    row.push(textCell(field));
    rows.push(row);
  }

  return rows;
}

// =========================================================================
// PARSARE XLSX
// =========================================================================

/** Citește prima foaie a unui fișier XLSX, pe baza range-ului declarat. */
function parseXlsxRows(buf: Buffer): ImportCell[][] {
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName] as Record<string, any> | undefined;
  if (!sheet) return [];

  const ref = sheet['!ref'];
  if (typeof ref !== 'string' || ref === '') return [];

  const range = XLSX.utils.decode_range(ref);
  const rows: ImportCell[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: ImportCell[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;

      if (!cell) {
        row.push(textCell(''));
        continue;
      }

      if (cell.t === 'n') {
        const value = String(cell.v);
        row.push({ t: 'n', v: value, w: typeof cell.w === 'string' ? cell.w : value });
        continue;
      }

      const text = String(cell.w ?? cell.v ?? '').trim();
      row.push({ t: 's', v: text, w: text });
    }
    rows.push(row);
  }

  return rows;
}

// =========================================================================
// 1. PARSARE FIȘIER
// =========================================================================

/**
 * Parsează un fișier încărcat (base64) în rânduri de celule normalizate.
 * Tipul fișierului este dedus din extensia numelui.
 */
export function parseImportFile(fileName: string, contentBase64: string): ParsedImportFile {
  const buf = Buffer.from(String(contentBase64 ?? ''), 'base64');

  if (buf.length > MAX_FILE_BYTES) {
    throw new Error('Fișierul depășește 5 MB.');
  }

  const name = String(fileName ?? '').trim().toLowerCase();

  let sourceType: ImportSourceType;
  let parsedRows: ImportCell[][];

  if (name.endsWith('.csv')) {
    sourceType = 'CSV';
    parsedRows = parseCsvRows(buf);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    sourceType = 'XLSX';
    parsedRows = parseXlsxRows(buf);
  } else {
    throw new Error('Format neacceptat. Folosiți CSV sau XLSX.');
  }

  const rows = trimTrailingEmptyRows(parsedRows);
  if (rows.length > MAX_ROWS) {
    throw new Error('Maxim 5000 de rânduri.');
  }

  return { source_type: sourceType, rows };
}

// =========================================================================
// 2. MAPAREA COLOANELOR PE RÂNDURI
// =========================================================================

/** Indexul de coloană rezolvat, sau null dacă lipsește / este în afara fișierului. */
function resolveColumn(
  mapping: ImportMapping,
  field: keyof ImportMapping,
  columnCount: number
): number | null {
  const idx = mapping[field];
  if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= columnCount) {
    return null;
  }
  return idx;
}

function pickCell(row: ImportCell[], idx: number | null): ImportCell | undefined {
  if (idx === null) return undefined;
  return row[idx];
}

/**
 * Convertește o celulă de sumă în bani întregi.
 * Celulele numerice trec prin toBani (rotunjire la bani), cele text prin
 * parseAmount cu formatul numeric ales; celulele goale valorează 0.
 */
function amountFromCell(
  cell: ImportCell | undefined,
  fmt: AmountFormat,
  label: string,
  errors: string[]
): number {
  if (!cell) return 0;

  if (cell.t === 'n') {
    try {
      return toBani(Number(cell.v));
    } catch (err: any) {
      errors.push(`${label}: ${err && err.message ? err.message : 'Valoare numerică invalidă'}`);
      return 0;
    }
  }

  const text = cell.v.trim();
  if (text === '') return 0;

  const parsed = parseAmount(text, fmt);
  if (!parsed.ok) {
    errors.push(`${label}: ${parsed.error}`);
    return 0;
  }
  return parsed.bani;
}

export function mapImportRows(
  rows: ImportCell[][],
  mapping: ImportMapping,
  opts: ImportMapOptions
): ImportMapResult {
  const columnCount = countColumns(rows);

  const resolved: Record<keyof ImportMapping, number | null> = {
    account: resolveColumn(mapping, 'account', columnCount),
    name: resolveColumn(mapping, 'name', columnCount),
    debit_initial: resolveColumn(mapping, 'debit_initial', columnCount),
    credit_initial: resolveColumn(mapping, 'credit_initial', columnCount),
    debit_prev: resolveColumn(mapping, 'debit_prev', columnCount),
    credit_prev: resolveColumn(mapping, 'credit_prev', columnCount),
    currency: resolveColumn(mapping, 'currency', columnCount),
    currency_amount: resolveColumn(mapping, 'currency_amount', columnCount)
  };

  const missing_columns: string[] = [];
  for (const field of REQUIRED_IMPORT_FIELDS) {
    if (resolved[field] === null) missing_columns.push(IMPORT_FIELD_LABELS[field]);
  }

  const items: ImportMappedItem[] = [];
  const startIndex = opts.has_header ? 1 : 0;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    const symbol = cellText(pickCell(row, resolved.account));
    const name = cellText(pickCell(row, resolved.name));

    const debitInitial = amountFromCell(
      pickCell(row, resolved.debit_initial),
      opts.number_format,
      IMPORT_FIELD_LABELS.debit_initial,
      errors
    );
    const creditInitial = amountFromCell(
      pickCell(row, resolved.credit_initial),
      opts.number_format,
      IMPORT_FIELD_LABELS.credit_initial,
      errors
    );
    const debitPrev = amountFromCell(
      pickCell(row, resolved.debit_prev),
      opts.number_format,
      IMPORT_FIELD_LABELS.debit_prev,
      errors
    );
    const creditPrev = amountFromCell(
      pickCell(row, resolved.credit_prev),
      opts.number_format,
      IMPORT_FIELD_LABELS.credit_prev,
      errors
    );
    const currencyAmount = amountFromCell(
      pickCell(row, resolved.currency_amount),
      opts.number_format,
      IMPORT_FIELD_LABELS.currency_amount,
      errors
    );

    // Orice sumă nenulă (inclusiv suma în valută) arată că rândul conține date
    const hasAmounts =
      debitInitial !== 0 ||
      creditInitial !== 0 ||
      debitPrev !== 0 ||
      creditPrev !== 0 ||
      currencyAmount !== 0;

    if (symbol === '') {
      if (!hasAmounts) continue; // rând fără cont și fără sume: ignorat
      errors.unshift('Cont lipsă');
    }

    const currencyText = cellText(pickCell(row, resolved.currency));
    const currency = currencyText === '' ? 'RON' : currencyText.toUpperCase();

    items.push({
      row_no: i + 1,
      symbol,
      name,
      debit_initial_bani: debitInitial,
      credit_initial_bani: creditInitial,
      debit_prev_bani: debitPrev,
      credit_prev_bani: creditPrev,
      currency,
      currency_amount_bani: currencyAmount,
      errors
    });
  }

  return { items, missing_columns };
}

// =========================================================================
// 3. PREVIZUALIZAREA ANTETULUI
// =========================================================================

/**
 * Construiește lista de coloane (eticheta = textul din primul rând) și un eșantion
 * cu primele 20 de rânduri, ca text afișabil.
 */
export function previewHeaders(rows: ImportCell[][]): ImportHeaderPreview {
  const columnCount = countColumns(rows);
  const headerRow = rows.length > 0 ? rows[0] : [];

  const columns: ImportHeaderColumn[] = [];
  for (let i = 0; i < columnCount; i++) {
    const label = cellText(headerRow[i]);
    columns.push({ index: i, label: label !== '' ? label : `Coloana ${i + 1}` });
  }

  const sample: string[][] = rows.slice(0, SAMPLE_ROWS).map(row => {
    const line: string[] = [];
    for (let i = 0; i < columnCount; i++) {
      const cell = row[i];
      line.push(cell ? String(cell.w ?? '').trim() : '');
    }
    return line;
  });

  return { columns, sample };
}

// =========================================================================
// 4. PREVIZUALIZARE IMPORT CU VALIDARE COMPLETĂ
// =========================================================================

/** Datele primite de la client pentru previzualizarea unui import de fișier. */
export type FileImportPayload = {
  batch_id: number;
  file_name: string;
  content_base64: string;
  mapping: ImportMapping;
  has_header: boolean;
  number_format: AmountFormat;
  version?: number;
  confirm_replace?: boolean;
  confirm_reimport?: boolean;
};

export type FileImportRowStatus = 'OK' | 'WARNING' | 'ERROR' | 'SKIPPED';

/** Un rând din previzualizare, cu sumele exprimate în lei. */
export type FileImportRow = {
  row_no: number;
  symbol: string;
  name: string;
  account_id: number | null;
  debit_initial: number;
  credit_initial: number;
  debit_prev: number;
  credit_prev: number;
  currency: string;
  currency_amount: number;
  status: FileImportRowStatus;
  messages: string[];
};

/** Importul deja commitat care are aceeași amprentă de conținut. */
export type FileImportDuplicate = {
  id: number;
  created_at: string;
  user_name: string | null;
};

export type FileImportPreview = {
  source_type: ImportSourceType;
  rows: FileImportRow[];
  errors: string[];
  warnings: string[];
  totals: {
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
  };
  is_balanced: boolean;
  content_hash: string;
  duplicate_of: FileImportDuplicate | null;
  existing_lines_count: number;
  can_commit: boolean;
};

export type ImportErrorCode = 'VALIDATION' | 'CONFLICT' | 'CONFIRMATION_REQUIRED' | 'FORBIDDEN';

/** Eroare cu cod, pentru deosebirea erorilor de validare de cele de conflict. */
export class ImportError extends Error {
  code: ImportErrorCode;

  constructor(message: string, code: ImportErrorCode = 'VALIDATION') {
    super(message);
    this.name = 'ImportError';
    this.code = code;
  }
}

/** Lotul de preluare, redus la câmpurile necesare validării importului. */
type ImportBatchRow = {
  id: number;
  company_id: number;
  batch_type: BatchType;
  status: BatchStatus;
  setup_completed: number;
  base_currency: string;
};

/** Cont contabil din planul de conturi al societății. */
type CompanyAccount = {
  id: number;
  symbol: string;
  name: string;
  is_active: number;
  parent_id: number | null;
};

/** Rând în lucru: sumele rămân în bani până la construirea rezultatului. */
type WorkingImportRow = {
  row_no: number;
  symbol: string;
  name: string;
  account_id: number | null;
  account: CompanyAccount | null;
  debit_initial_bani: number;
  credit_initial_bani: number;
  debit_prev_bani: number;
  credit_prev_bani: number;
  currency: string;
  currency_amount_bani: number;
  errors: string[];
  warnings: string[];
  /** Motivul pentru care rândul este ignorat la import, dacă este cazul. */
  skipped_reason: string | null;
};

/** Un rând are date dacă are cel puțin o sumă nenulă. */
function hasNonZeroSums(row: WorkingImportRow): boolean {
  return (
    row.debit_initial_bani !== 0 ||
    row.credit_initial_bani !== 0 ||
    row.debit_prev_bani !== 0 ||
    row.credit_prev_bani !== 0 ||
    row.currency_amount_bani !== 0
  );
}

/**
 * Previzualizează importul unui fișier în balanța de pornire: parsează fișierul,
 * validează fiecare rând împotriva planului de conturi și a regulilor lotului
 * (YEAR_START / DURING_YEAR), calculează totalurile în bani, amprenta de conținut
 * și semnalează eventualele importuri duplicate.
 */
export function previewFileImport(companyId: number, payload: FileImportPayload): FileImportPreview {
  const batch = db.prepare(`
    SELECT id, company_id, batch_type, status, setup_completed, base_currency
    FROM accounting_opening_batches
    WHERE id = ? AND company_id = ?
  `).get(payload.batch_id, companyId) as ImportBatchRow | undefined;

  if (!batch) {
    throw new ImportError('Lotul de preluare a balanței nu există.', 'VALIDATION');
  }
  if (batch.status === 'VALIDATED') {
    throw new ImportError('Balanța este validată.', 'CONFLICT');
  }
  if (!batch.setup_completed) {
    throw new ImportError('Alegeți întâi tipul preluării.', 'VALIDATION');
  }
  if (batch.batch_type === 'NO_ACTIVITY') {
    throw new ImportError('Preluarea fără activitate anterioară nu acceptă import de solduri.', 'VALIDATION');
  }

  // 2. Parsare fișier și mapare coloane
  const parsed = parseImportFile(payload.file_name, payload.content_base64);
  const mapped = mapImportRows(parsed.rows, payload.mapping, {
    has_header: payload.has_header,
    number_format: payload.number_format
  });

  const errors: string[] = [];
  const warnings: string[] = [];

  if (mapped.missing_columns.length > 0) {
    errors.push(`Coloane obligatorii nemapate: ${mapped.missing_columns.join(', ')}`);
  }

  // 3. Planul de conturi al societății
  const companyAccounts = db.prepare(`
    SELECT id, symbol, name, is_active, parent_id
    FROM accounting_accounts
    WHERE company_id = ?
  `).all(companyId) as CompanyAccount[];

  const accountsBySymbol = new Map<string, CompanyAccount>();
  const childrenByParent = new Map<number, number[]>();

  for (const acc of companyAccounts) {
    const symbol = acc.symbol.trim();
    if (!accountsBySymbol.has(symbol)) accountsBySymbol.set(symbol, acc);

    if (acc.parent_id !== null) {
      const children = childrenByParent.get(acc.parent_id);
      if (children) children.push(acc.id);
      else childrenByParent.set(acc.parent_id, [acc.id]);
    }
  }

  // Conturile care au analitice active în plan
  const accountsWithActiveAnalytics = new Set<number>();
  for (const acc of companyAccounts) {
    if (acc.parent_id !== null && acc.is_active === 1) {
      accountsWithActiveAnalytics.add(acc.parent_id);
    }
  }

  const baseCurrency = String(batch.base_currency || 'RON').trim().toUpperCase();
  const allowedCurrencies = getAllowedCurrencies(companyId);

  // 4. Validarea fiecărui rând (toate calculele se fac în bani)
  const seenSymbols = new Map<string, number>();
  const working: WorkingImportRow[] = [];

  for (const item of mapped.items) {
    const rowErrors: string[] = [...item.errors];
    const rowWarnings: string[] = [];

    const symbol = item.symbol;
    const account = symbol === '' ? null : accountsBySymbol.get(symbol) ?? null;

    if (symbol !== '') {
      if (!account) {
        rowErrors.push(`Contul ${symbol} nu există în planul de conturi.`);
      } else if (account.is_active !== 1) {
        rowErrors.push(`Contul ${symbol} este inactiv.`);
      }

      const firstRowNo = seenSymbols.get(symbol);
      if (firstRowNo === undefined) {
        seenSymbols.set(symbol, item.row_no);
      } else {
        rowErrors.push(`Cont duplicat (rândurile ${firstRowNo}, ${item.row_no}).`);
      }
    }

    if (
      item.debit_initial_bani < 0 ||
      item.credit_initial_bani < 0 ||
      item.debit_prev_bani < 0 ||
      item.credit_prev_bani < 0
    ) {
      rowErrors.push('Valorile nu pot fi negative.');
    }

    if (batch.batch_type === 'YEAR_START') {
      if (
        item.debit_prev_bani !== item.debit_initial_bani ||
        item.credit_prev_bani !== item.credit_initial_bani
      ) {
        rowErrors.push('La început de an, totalurile precedente trebuie să fie egale cu soldurile inițiale.');
      }
    } else if (batch.batch_type === 'DURING_YEAR') {
      if (
        item.debit_prev_bani < item.debit_initial_bani ||
        item.credit_prev_bani < item.credit_initial_bani
      ) {
        rowErrors.push('Totalul precedent nu poate fi mai mic decât soldul inițial.');
      }
    }

    if (!allowedCurrencies.includes(item.currency)) {
      rowErrors.push(`Moneda ${item.currency} nu este configurată pentru această societate.`);
    }

    const hasSums =
      item.debit_initial_bani !== 0 ||
      item.credit_initial_bani !== 0 ||
      item.debit_prev_bani !== 0 ||
      item.credit_prev_bani !== 0;

    if (item.currency !== baseCurrency && hasSums && item.currency_amount_bani === 0) {
      rowErrors.push('Lipsește suma în valută.');
    }

    let name = item.name;
    if (account) {
      if (name.trim() === '') {
        name = account.name;
      } else if (name.trim().toLowerCase() !== account.name.trim().toLowerCase()) {
        rowWarnings.push(`Denumirea „${name}” diferă de denumirea din planul de conturi („${account.name}”).`);
      }
    }

    working.push({
      row_no: item.row_no,
      symbol,
      name,
      account_id: account ? account.id : null,
      account,
      debit_initial_bani: item.debit_initial_bani,
      credit_initial_bani: item.credit_initial_bani,
      debit_prev_bani: item.debit_prev_bani,
      credit_prev_bani: item.credit_prev_bani,
      currency: item.currency,
      currency_amount_bani: item.currency_amount_bani,
      errors: rowErrors,
      warnings: rowWarnings,
      skipped_reason: null
    });
  }

  // 5. Sintetic și analitic în același fișier
  const rowsByAccountId = new Map<number, WorkingImportRow>();
  for (const row of working) {
    if (row.account_id !== null && !rowsByAccountId.has(row.account_id)) {
      rowsByAccountId.set(row.account_id, row);
    }
  }

  for (const row of working) {
    const account = row.account;
    if (!account || !hasNonZeroSums(row)) continue;

    // Toți descendenții contului (prin parent_id), prezenți în fișier cu sume
    const descendantRows: WorkingImportRow[] = [];
    const visited = new Set<number>();
    const stack = [...(childrenByParent.get(account.id) ?? [])];

    while (stack.length > 0) {
      const childId = stack.pop() as number;
      if (visited.has(childId)) continue;
      visited.add(childId);

      const childRow = rowsByAccountId.get(childId);
      if (childRow && hasNonZeroSums(childRow)) descendantRows.push(childRow);

      for (const grandChildId of childrenByParent.get(childId) ?? []) {
        stack.push(grandChildId);
      }
    }

    if (descendantRows.length === 0) {
      if (accountsWithActiveAnalytics.has(account.id)) {
        row.warnings.push(`Contul ${row.symbol} are analitice; soldul trebuie repartizat înainte de validare.`);
      }
      continue;
    }

    // Frunzele din fișier: descendenții care nu au la rândul lor descendenți în fișier
    const fileDescendantIds = new Set<number>();
    for (const descendant of descendantRows) {
      if (descendant.account_id !== null) fileDescendantIds.add(descendant.account_id);
    }

    let leafDebitInitialBani = 0;
    let leafCreditInitialBani = 0;
    let leafDebitPrevBani = 0;
    let leafCreditPrevBani = 0;

    for (const descendant of descendantRows) {
      const descendantChildren =
        descendant.account_id === null ? [] : childrenByParent.get(descendant.account_id) ?? [];
      if (descendantChildren.some(id => fileDescendantIds.has(id))) continue;

      leafDebitInitialBani += descendant.debit_initial_bani;
      leafCreditInitialBani += descendant.credit_initial_bani;
      leafDebitPrevBani += descendant.debit_prev_bani;
      leafCreditPrevBani += descendant.credit_prev_bani;
    }

    if (
      row.debit_initial_bani === leafDebitInitialBani &&
      row.credit_initial_bani === leafCreditInitialBani &&
      row.debit_prev_bani === leafDebitPrevBani &&
      row.credit_prev_bani === leafCreditPrevBani
    ) {
      row.skipped_reason = 'Rând sintetic de total ignorat (egal cu suma analiticelor).';
      row.errors = [];
      row.warnings = [];
    } else {
      row.errors.push(`Dublare sintetic/analitic pentru ${row.symbol}.`);
    }
  }

  // Stabilirea statusului final al rândurilor
  const rows: FileImportRow[] = [];

  for (const row of working) {
    let status: FileImportRowStatus;
    let messages: string[];

    if (row.skipped_reason !== null) {
      status = 'SKIPPED';
      messages = [row.skipped_reason];
    } else if (row.errors.length > 0) {
      status = 'ERROR';
      messages = [...row.errors, ...row.warnings];
    } else if (!hasNonZeroSums(row)) {
      status = 'SKIPPED';
      messages = ['Rând fără solduri (toate sumele sunt zero).'];
    } else if (row.warnings.length > 0) {
      status = 'WARNING';
      messages = [...row.warnings];
    } else {
      status = 'OK';
      messages = [];
    }

    if (status === 'WARNING') {
      for (const message of messages) warnings.push(`Rând ${row.row_no}: ${message}`);
    }

    rows.push({
      row_no: row.row_no,
      symbol: row.symbol,
      name: row.name,
      account_id: row.account_id,
      debit_initial: fromBani(row.debit_initial_bani),
      credit_initial: fromBani(row.credit_initial_bani),
      debit_prev: fromBani(row.debit_prev_bani),
      credit_prev: fromBani(row.credit_prev_bani),
      currency: row.currency,
      currency_amount: fromBani(row.currency_amount_bani),
      status,
      messages
    });
  }

  // 6. Totaluri și verificarea echilibrului
  let totalDebitInitialBani = 0;
  let totalCreditInitialBani = 0;
  let totalDebitPrevBani = 0;
  let totalCreditPrevBani = 0;

  for (const row of rows) {
    if (row.status !== 'OK' && row.status !== 'WARNING') continue;
    totalDebitInitialBani += toBani(row.debit_initial);
    totalCreditInitialBani += toBani(row.credit_initial);
    totalDebitPrevBani += toBani(row.debit_prev);
    totalCreditPrevBani += toBani(row.credit_prev);
  }

  const isBalanced =
    totalDebitInitialBani === totalCreditInitialBani && totalDebitPrevBani === totalCreditPrevBani;

  if (!isBalanced) {
    const parts: string[] = [];
    if (totalDebitInitialBani !== totalCreditInitialBani) {
      parts.push(
        `debit inițial ${fromBani(totalDebitInitialBani).toFixed(2)} ≠ credit inițial ${fromBani(totalCreditInitialBani).toFixed(2)}`
      );
    }
    if (totalDebitPrevBani !== totalCreditPrevBani) {
      parts.push(
        `debit precedent ${fromBani(totalDebitPrevBani).toFixed(2)} ≠ credit precedent ${fromBani(totalCreditPrevBani).toFixed(2)}`
      );
    }
    errors.push(`Balanța importată nu este echilibrată: ${parts.join('; ')}.`);
  }

  // 7. Amprenta de conținut a rândurilor care se importă
  const hashPayload = rows
    .filter(row => row.status === 'OK' || row.status === 'WARNING')
    .slice()
    .sort((a, b) => (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0))
    .map(row => [
      row.symbol,
      toBani(row.debit_initial),
      toBani(row.credit_initial),
      toBani(row.debit_prev),
      toBani(row.credit_prev),
      row.currency,
      toBani(row.currency_amount)
    ]);

  const contentHash = crypto.createHash('sha256').update(JSON.stringify(hashPayload)).digest('hex');

  // 8. Import deja commitat cu aceeași amprentă
  const duplicate = db.prepare(`
    SELECT id, created_at, user_name
    FROM accounting_opening_imports
    WHERE batch_id = ? AND content_hash = ? AND status = 'COMMITTED'
    ORDER BY id ASC
    LIMIT 1
  `).get(batch.id, contentHash) as FileImportDuplicate | undefined;

  // 9. Linii existente în lot, cu cel puțin o valoare nenulă
  const existingLines = db.prepare(`
    SELECT COUNT(*) AS line_count
    FROM accounting_opening_balance_lines
    WHERE batch_id = ?
      AND (debit_initial != 0 OR credit_initial != 0 OR debit_prev != 0 OR credit_prev != 0)
  `).get(batch.id) as { line_count: number };

  // 10. Importul poate fi confirmat doar fără erori blocante
  const canCommit = errors.length === 0 && !rows.some(row => row.status === 'ERROR');

  return {
    source_type: parsed.source_type,
    rows,
    errors,
    warnings,
    totals: {
      debit_initial: fromBani(totalDebitInitialBani),
      credit_initial: fromBani(totalCreditInitialBani),
      debit_prev: fromBani(totalDebitPrevBani),
      credit_prev: fromBani(totalCreditPrevBani)
    },
    is_balanced: isBalanced,
    content_hash: contentHash,
    duplicate_of: duplicate ?? null,
    existing_lines_count: existingLines.line_count,
    can_commit: canCommit
  };
}

// =========================================================================
// 5. SALVAREA IMPORTULUI ÎN BALANȚA DE PORNIRE
// =========================================================================

/** Lotul de preluare, redus la câmpurile necesare salvării importului. */
type CommitBatchRow = {
  id: number;
  company_id: number;
  fiscal_year: number;
  status: BatchStatus;
  version: number;
};

/** Rezultatul salvării unui import de fișier în balanța de pornire. */
export type FileImportCommitResult = {
  success: true;
  import_id: number;
  batch: any;
};

/**
 * Salvează în balanța de pornire rândurile valide ale unui fișier importat.
 *
 * Se reia integral previzualizarea (aceleași validări ca la pasul anterior), apoi,
 * într-o singură tranzacție: importurile anterioare cu altă amprentă devin istorice
 * (SUPERSEDED), se înregistrează importul curent, liniile lotului sunt înlocuite cu
 * rândurile OK/WARNING din fișier, totalurile lotului sunt recalculate, iar versiunea
 * lotului este incrementată. Soldurile terților nu sunt atinse.
 */
export function commitFileImport(
  companyId: number,
  payload: FileImportPayload,
  userId: number,
  userName: string
): FileImportCommitResult {
  // 1. Aceleași validări ca la previzualizare
  const preview = previewFileImport(companyId, payload);

  if (!preview.can_commit) {
    throw new ImportError('Importul conține erori; nu s-a salvat nimic.', 'VALIDATION');
  }

  const batch = db.prepare(`
    SELECT id, company_id, fiscal_year, status, version
    FROM accounting_opening_batches
    WHERE id = ? AND company_id = ?
  `).get(payload.batch_id, companyId) as CommitBatchRow | undefined;

  if (!batch) {
    throw new ImportError('Lotul de preluare a balanței nu există.', 'VALIDATION');
  }

  // 2. Blocare optimistă: versiunea din payload este obligatorie și trebuie să
  // corespundă versiunii lotului (lotul nu trebuie să fi fost modificat între timp)
  if (payload.version === undefined || payload.version !== batch.version) {
    throw new ImportError('Balanța a fost modificată între timp. Reîncărcați.', 'CONFLICT');
  }

  // 3. Confirmări explicite pentru reimport și pentru înlocuirea soldurilor existente
  if (preview.duplicate_of && !payload.confirm_reimport) {
    throw new ImportError(
      `Același conținut a fost deja importat la ${preview.duplicate_of.created_at} de ${preview.duplicate_of.user_name || 'utilizator necunoscut'}. Confirmați reimportul (valorile se înlocuiesc, nu se adună).`,
      'CONFIRMATION_REQUIRED'
    );
  }

  if (preview.existing_lines_count > 0 && !payload.confirm_replace) {
    throw new ImportError(
      `Balanța conține deja ${preview.existing_lines_count} conturi cu solduri. Confirmați înlocuirea lor cu valorile din fișier.`,
      'CONFIRMATION_REQUIRED'
    );
  }

  const rowsToImport = preview.rows.filter(row => row.status === 'OK' || row.status === 'WARNING');
  const now = new Date().toISOString();

  let importId = 0;

  const tx = db.transaction(() => {
    // 4. Importurile anterioare cu altă amprentă de conținut devin istorice
    db.prepare(`
      UPDATE accounting_opening_imports SET
        status = 'SUPERSEDED',
        updated_at = ?
      WHERE batch_id = ? AND status = 'COMMITTED' AND content_hash != ?
    `).run(now, batch.id, preview.content_hash);

    if (preview.duplicate_of) {
      // Reimport confirmat: se reactivează rândul existent, cu același conținut
      db.prepare(`
        UPDATE accounting_opening_imports SET
          status = 'COMMITTED',
          user_id = ?,
          user_name = ?,
          updated_at = ?
        WHERE id = ?
      `).run(userId, userName, now, preview.duplicate_of.id);

      importId = preview.duplicate_of.id;
    } else {
      const inserted = db.prepare(`
        INSERT INTO accounting_opening_imports (
          company_id, batch_id, fiscal_year, source_type, file_name, content_hash,
          row_count, total_debit_initial, total_credit_initial, total_debit_prev,
          total_credit_prev, status, user_id, user_name, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMMITTED', ?, ?, ?, ?)
      `).run(
        companyId,
        batch.id,
        batch.fiscal_year,
        preview.source_type,
        payload.file_name,
        preview.content_hash,
        rowsToImport.length,
        preview.totals.debit_initial,
        preview.totals.credit_initial,
        preview.totals.debit_prev,
        preview.totals.credit_prev,
        userId,
        userName,
        now,
        now
      );

      importId = Number(inserted.lastInsertRowid);
    }

    // 5. Liniile lotului sunt înlocuite cu valorile din fișier
    db.prepare('DELETE FROM accounting_opening_balance_lines WHERE batch_id = ?').run(batch.id);

    const insertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        notes, value_source, source_import_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, '', 'IMPORT', ?, ?, ?)
    `);

    for (const row of rowsToImport) {
      insertStmt.run(
        batch.id,
        row.account_id,
        row.symbol,
        row.debit_initial,
        row.credit_initial,
        row.debit_prev,
        row.credit_prev,
        row.currency,
        row.currency_amount,
        importId,
        now,
        now
      );
    }

    // 6. Totalurile lotului se aliniază cu valorile importate
    db.prepare(`
      UPDATE accounting_opening_batches SET
        total_debit_initial = ?,
        total_credit_initial = ?,
        total_debit_prev = ?,
        total_credit_prev = ?,
        status = 'DRAFT',
        version = version + 1,
        updated_at = ?
      WHERE id = ?
    `).run(
      preview.totals.debit_initial,
      preview.totals.credit_initial,
      preview.totals.debit_prev,
      preview.totals.credit_prev,
      now,
      batch.id
    );

    // 7. Urmă de audit pentru import
    const details = JSON.stringify({
      file_name: payload.file_name,
      content_hash: preview.content_hash,
      rows: rowsToImport.length,
      import_id: importId,
      replaced: preview.existing_lines_count
    });

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'IMPORT', ?, ?, 'Import fișier CSV / Excel', ?, ?)
    `).run(batch.id, userId || null, userName || 'Sistem', details, now);
  });

  tx();

  const updatedBatch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE id = ?')
    .get(batch.id);

  return { success: true, import_id: importId, batch: updatedBatch };
}
