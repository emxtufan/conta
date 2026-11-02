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
import { AmountFormat, parseAmount, toBani } from './money';

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
