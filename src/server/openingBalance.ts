import crypto from 'crypto';
import { db } from './db';
import { fromBani, parseAmount, toBani } from './money';

// =========================================================================
// HELPER PENTRU ERORI CU COD (CONFLICT / SUBSEQUENT_OPERATIONS / FORBIDDEN / VALIDATION)
// =========================================================================

export type OpeningErrorCode = 'CONFLICT' | 'SUBSEQUENT_OPERATIONS' | 'FORBIDDEN' | 'VALIDATION';

function openingError(message: string, code: OpeningErrorCode = 'VALIDATION'): Error {
  const err = new Error(message) as Error & { code: OpeningErrorCode };
  err.code = code;
  return err;
}

// =========================================================================
// TIPURI ȘI INTERFEȚE PRELUARE DATE CONTABILE
// =========================================================================

export type BatchType = 'NO_ACTIVITY' | 'YEAR_START' | 'DURING_YEAR';
export type BatchStatus = 'DRAFT' | 'IN_VERIFICATION' | 'VALIDATED';

export interface OpeningBatch {
  id: number;
  company_id: number;
  fiscal_year: number;
  start_month: number;
  batch_type: BatchType;
  status: BatchStatus;
  setup_completed: number;
  base_currency: string;
  total_debit_initial: number;
  total_credit_initial: number;
  total_debit_prev: number;
  total_credit_prev: number;
  integrity_hash: string | null;
  validated_at: string | null;
  validated_by: number | null;
  validated_by_name: string | null;
  notes: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OpeningBalanceLine {
  id?: number;
  batch_id: number;
  account_id: number;
  account_symbol: string;
  account_name: string;
  account_nature: string;
  account_type: 'SYNTHETIC' | 'ANALYTIC';
  parent_id: number | null;
  parent_symbol: string | null;
  debit_initial: number;
  credit_initial: number;
  debit_prev: number;
  credit_prev: number;
  debit_final: number;
  credit_final: number;
  currency: string;
  currency_amount: number;
  exchange_rate: number;
  exchange_rate_date: string | null;
  notes: string;
  is_synthetic_summary?: boolean;
  has_analytics?: boolean;
  own_values?: {
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
  } | null;
}

export interface OpeningCounterpartyItem {
  id?: number;
  batch_id: number;
  partner_type: 'CLIENT' | 'SUPPLIER';
  partner_name: string;
  partner_cui: string | null;
  doc_number: string;
  doc_date: string;
  currency: string;
  original_amount: number;
  remaining_amount: number;
  remaining_amount_ron: number;
  account_id: number;
  account_symbol: string;
  notes: string;
  created_at?: string;
}

export interface OpeningValidationLog {
  id: number;
  batch_id: number;
  action: string;
  user_id: number | null;
  user_name: string | null;
  reason: string | null;
  details: string | null;
  created_at: string;
}

export interface OpeningVerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totals: {
    total_debit_initial: number;
    total_credit_initial: number;
    diff_initial: number;
    total_debit_prev: number;
    total_credit_prev: number;
    diff_prev: number;
    total_debit_final: number;
    total_credit_final: number;
    diff_final: number;
  };
  counterparty_summary: {
    supplier_total: number;
    supplier_target: number;
    supplier_diff: number;
    client_total: number;
    client_target: number;
    client_diff: number;
  };
}

// =========================================================================
// HELPERE PENTRU ARITMETICĂ ZECIMALĂ EXACTĂ
// =========================================================================

export function round2(num: number): number {
  if (isNaN(num) || !isFinite(num)) return 0.0;
  return fromBani(toBani(num));
}

/**
 * Parsare sigură pentru valori numerice românești sau standard internaționale:
 * Ex: "1.234,56" -> 1234.56
 * Ex: "1234.56" -> 1234.56
 * Ex: " 1 234,50 " -> 1234.50
 */
export function parseRomanianNumber(val: any): number {
  const parsed = parseAmount(String(val ?? ''), 'RO');
  return parsed.ok ? fromBani(parsed.bani) : 0.0;
}

// =========================================================================
// HELPERE MONEDE (LISTA MONEDELOR PERMISE PENTRU O SOCIETATE)
// =========================================================================

/**
 * Returnează lista monedelor permise pentru o societate: monedele standard
 * (RON, EUR, USD, GBP, CHF), moneda contabilă a societății și monedele
 * conturilor bancare configurate. Rezultatul este unic, sortat, cu RON primul.
 */
export function getAllowedCurrencies(companyId: number): string[] {
  const standard = ['RON', 'EUR', 'USD', 'GBP', 'CHF'];

  const company = db
    .prepare('SELECT currency FROM companies WHERE id = ?')
    .get(companyId) as { currency: string | null } | undefined;
  const bankAccounts = db
    .prepare('SELECT DISTINCT currency FROM company_bank_accounts WHERE company_id = ?')
    .all(companyId) as { currency: string | null }[];

  const unique = new Set<string>(standard);
  if (company && company.currency) {
    const companyCurrency = String(company.currency).trim().toUpperCase();
    if (companyCurrency) unique.add(companyCurrency);
  }
  for (const row of bankAccounts) {
    if (row.currency) {
      const bankCurrency = String(row.currency).trim().toUpperCase();
      if (bankCurrency) unique.add(bankCurrency);
    }
  }

  const rest = Array.from(unique).filter(c => c !== 'RON').sort();
  return ['RON', ...rest];
}

// =========================================================================
// 1. GESTIONARE LOT PRELUARE (BATCH)
// =========================================================================

export function getOrCreateOpeningBatch(
  companyId: number,
  fiscalYear: number = new Date().getFullYear(),
  startMonth: number = 1,
  userId?: number,
  userName?: string
): OpeningBatch {
  let batch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE company_id = ? AND fiscal_year = ?')
    .get(companyId, fiscalYear) as OpeningBatch | undefined;

  if (!batch) {
    const now = new Date().toISOString();
    const company = db.prepare('SELECT currency FROM companies WHERE id = ?').get(companyId) as
      | { currency: string | null }
      | undefined;
    const baseCurrency = (company && company.currency ? String(company.currency).trim() : '') || 'RON';

    const result = db.prepare(`
      INSERT INTO accounting_opening_batches (
        company_id, fiscal_year, start_month, batch_type, status, base_currency,
        total_debit_initial, total_credit_initial, total_debit_prev, total_credit_prev,
        notes, version, created_at, updated_at
      ) VALUES (?, ?, ?, 'NO_ACTIVITY', 'DRAFT', ?, 0.0, 0.0, 0.0, 0.0, '', 1, ?, ?)
    `).run(companyId, fiscalYear, startMonth, baseCurrency, now, now);

    const batchId = Number(result.lastInsertRowid);

    // Înregistrare log inițial
    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'CREATE', ?, ?, 'Inițializare lot preluare balanță de pornire', 'Creat lot pentru exercițiul ' || ?, ?)
    `).run(batchId, userId || null, userName || 'Sistem', fiscalYear, now);

    batch = db
      .prepare('SELECT * FROM accounting_opening_batches WHERE id = ?')
      .get(batchId) as OpeningBatch;
  }

  return batch;
}

/**
 * Configurarea tipului de preluare (pas obligatoriu înainte de introducerea soldurilor).
 * Stabilește tipul preluării, luna de start, marchează lotul ca pregătit și resetează
 * ciclul de verificare/validare (status DRAFT, versiune incrementată).
 */
export function setupOpeningBatch(
  companyId: number,
  data: {
    fiscal_year: number;
    start_month: number;
    batch_type: BatchType;
    version: number;
  },
  userId: number,
  userName: string
): { success: boolean; batch: OpeningBatch } {
  if (!data.batch_type || !['NO_ACTIVITY', 'YEAR_START', 'DURING_YEAR'].includes(data.batch_type)) {
    throw openingError('Tipul preluării este invalid.');
  }

  const startMonth = Number(data.start_month);
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    throw openingError('Luna de start trebuie să fie între 1 și 12.');
  }

  if (data.batch_type === 'YEAR_START' && startMonth !== 1) {
    throw openingError('Preluarea la început de an pornește din ianuarie.');
  }

  if (data.batch_type === 'DURING_YEAR' && (startMonth < 2 || startMonth > 12)) {
    throw openingError('Preluarea în cursul anului pornește dintr-o lună între 2 și 12.');
  }

  let batch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE company_id = ? AND fiscal_year = ?')
    .get(companyId, data.fiscal_year) as OpeningBatch | undefined;

  if (!batch) {
    batch = getOrCreateOpeningBatch(companyId, data.fiscal_year, startMonth, userId, userName);
  }

  if (batch.status === 'VALIDATED') {
    throw openingError(
      'Balanța de pornire este validată și blocată. Pentru modificări este necesară o operațiune de devalidare documentată.',
      'CONFLICT'
    );
  }

  if (batch.version !== data.version) {
    throw openingError(
      `Conflict de concurență (Optimistic Locking): datele au fost actualizate de un alt utilizator. Reîncărcați ecranul (versiunea curentă: ${batch.version}, versiunea trimisă: ${data.version}).`,
      'CONFLICT'
    );
  }

  if (data.batch_type === 'NO_ACTIVITY') {
    const existingLines = db.prepare(`
      SELECT COUNT(*) AS cnt FROM accounting_opening_balance_lines
      WHERE batch_id = ? AND (
        debit_initial <> 0 OR credit_initial <> 0 OR debit_prev <> 0 OR credit_prev <> 0 OR currency_amount <> 0
      )
    `).get(batch.id) as { cnt: number };

    if (existingLines && existingLines.cnt > 0) {
      throw openingError(
        'Există solduri introduse. Ștergeți-le înainte de a alege «fără activitate anterioară».'
      );
    }
  }

  const now = new Date().toISOString();
  const nextVersion = batch.version + 1;

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE accounting_opening_batches SET
        batch_type = ?,
        start_month = ?,
        status = 'DRAFT',
        setup_completed = 1,
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(data.batch_type, startMonth, nextVersion, now, batch!.id);

    db.prepare(`UPDATE companies SET opening_status = 'DRAFT' WHERE id = ?`).run(companyId);

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'SETUP', ?, ?, 'Configurare tip preluare balanță de pornire', ?, ?)
    `).run(
      batch!.id,
      userId,
      userName,
      `Tip preluare: ${data.batch_type}, Luna de start: ${startMonth}, Monedă de bază: ${batch!.base_currency || 'RON'}, Versiune: ${nextVersion}`,
      now
    );
  });

  tx();

  const updatedBatch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE id = ?')
    .get(batch.id) as OpeningBatch;

  return { success: true, batch: updatedBatch };
}

// =========================================================================
// 2. CITIRE ȘI CALCUL BALANȚĂ DE PORNIRE PE CONTURI
// =========================================================================

export function getOpeningBalanceLines(batchId: number, companyId: number): OpeningBalanceLine[] {
  // 1. Obține toate conturile active ale companiei (sintetice și analitice)
  const accounts = db.prepare(`
    SELECT 
      a.id as account_id, 
      a.symbol as account_symbol, 
      a.name as account_name, 
      a.nature as account_nature, 
      a.type as account_type,
      a.parent_id,
      p.symbol as parent_symbol
    FROM accounting_accounts a
    LEFT JOIN accounting_accounts p ON a.parent_id = p.id
    WHERE a.company_id = ? AND a.is_active = 1
    ORDER BY a.symbol ASC
  `).all(companyId) as any[];

  // 2. Obține liniile deja salvate în lot
  const savedLines = db.prepare(`
    SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ?
  `).all(batchId) as any[];

  const savedMap = new Map<number, any>();
  for (const sl of savedLines) {
    savedMap.set(sl.account_id, sl);
  }

  // 3. Creează lista de linii de bază
  const lines: OpeningBalanceLine[] = accounts.map(acc => {
    const saved = savedMap.get(acc.account_id);
    const debitInitBani = saved ? toBani(saved.debit_initial) : 0;
    const creditInitBani = saved ? toBani(saved.credit_initial) : 0;
    const debitPrevBani = saved ? toBani(saved.debit_prev) : 0;
    const creditPrevBani = saved ? toBani(saved.credit_prev) : 0;
    const currencyAmountBani = saved ? toBani(saved.currency_amount) : 0;

    const diffBani = debitPrevBani - creditPrevBani;
    const debitFinalBani = diffBani > 0 ? diffBani : 0;
    const creditFinalBani = diffBani < 0 ? -diffBani : 0;

    return {
      id: saved ? saved.id : undefined,
      batch_id: batchId,
      account_id: acc.account_id,
      account_symbol: acc.account_symbol,
      account_name: acc.account_name,
      account_nature: acc.account_nature,
      account_type: acc.account_type,
      parent_id: acc.parent_id,
      parent_symbol: acc.parent_symbol,
      debit_initial: fromBani(debitInitBani),
      credit_initial: fromBani(creditInitBani),
      debit_prev: fromBani(debitPrevBani),
      credit_prev: fromBani(creditPrevBani),
      debit_final: fromBani(debitFinalBani),
      credit_final: fromBani(creditFinalBani),
      currency: saved ? saved.currency : 'RON',
      currency_amount: fromBani(currencyAmountBani),
      exchange_rate: saved ? saved.exchange_rate : 1.0,
      exchange_rate_date: saved ? saved.exchange_rate_date : null,
      notes: saved ? saved.notes : '',
      is_synthetic_summary: false,
      has_analytics: false,
      own_values: null,
    };
  });

  // 4. Agregare inteligentă a conturilor analitice pe contul părinte sintetic
  // Identificăm dacă părinții au analitice cu valori
  const parentChildrenMap = new Map<number, OpeningBalanceLine[]>();
  for (const line of lines) {
    if (line.parent_id) {
      if (!parentChildrenMap.has(line.parent_id)) {
        parentChildrenMap.set(line.parent_id, []);
      }
      parentChildrenMap.get(line.parent_id)!.push(line);
    }
  }

  for (const line of lines) {
    if (parentChildrenMap.has(line.account_id)) {
      const children = parentChildrenMap.get(line.account_id)!;
      line.has_analytics = true;

      // Verificăm dacă cel puțin un analitic are valori introduse
      const hasChildValues = children.some(c => 
        c.debit_initial > 0 || c.credit_initial > 0 || c.debit_prev > 0 || c.credit_prev > 0
      );

      if (hasChildValues) {
        // În acest caz, contul sintetic acționează ca totalizator agregat
        line.is_synthetic_summary = true;

        // Valorile proprii salvate pe sintetic se pierd la agregare; le păstrăm
        // separat pentru a putea semnala dubla preluare (direct + pe analitice).
        const ownDebitInitialBani = toBani(line.debit_initial);
        const ownCreditInitialBani = toBani(line.credit_initial);
        const ownDebitPrevBani = toBani(line.debit_prev);
        const ownCreditPrevBani = toBani(line.credit_prev);
        const hasOwnValues = ownDebitInitialBani !== 0 || ownCreditInitialBani !== 0
          || ownDebitPrevBani !== 0 || ownCreditPrevBani !== 0;
        line.own_values = hasOwnValues
          ? {
              debit_initial: fromBani(ownDebitInitialBani),
              credit_initial: fromBani(ownCreditInitialBani),
              debit_prev: fromBani(ownDebitPrevBani),
              credit_prev: fromBani(ownCreditPrevBani),
            }
          : null;

        const childDebitInitialBani = children.reduce((sum, c) => sum + toBani(c.debit_initial), 0);
        const childCreditInitialBani = children.reduce((sum, c) => sum + toBani(c.credit_initial), 0);
        const childDebitPrevBani = children.reduce((sum, c) => sum + toBani(c.debit_prev), 0);
        const childCreditPrevBani = children.reduce((sum, c) => sum + toBani(c.credit_prev), 0);

        line.debit_initial = fromBani(childDebitInitialBani);
        line.credit_initial = fromBani(childCreditInitialBani);
        line.debit_prev = fromBani(childDebitPrevBani);
        line.credit_prev = fromBani(childCreditPrevBani);

        const diffBani = childDebitPrevBani - childCreditPrevBani;
        line.debit_final = fromBani(diffBani > 0 ? diffBani : 0);
        line.credit_final = fromBani(diffBani < 0 ? -diffBani : 0);

        // Agregare valută: suma în valută se totalizează doar dacă toți copiii
        // cu sumă în valută sunt în aceeași monedă; altfel nu se amestecă valutele.
        const childrenWithCurrency = children.filter(c => toBani(c.currency_amount) !== 0);
        const childCurrencies = Array.from(new Set(
          childrenWithCurrency.map(c => String(c.currency || '').trim().toUpperCase())
        ));

        if (childCurrencies.length === 1) {
          line.currency = childCurrencies[0];
          const childCurrencyAmountBani = childrenWithCurrency.reduce((sum, c) => sum + toBani(c.currency_amount), 0);
          line.currency_amount = fromBani(childCurrencyAmountBani);
        } else {
          line.currency = '';
          line.currency_amount = 0;
        }
      }
    }
  }

  return lines;
}

// =========================================================================
// 3. VERIFICARE BALANȚĂ DE PORNIRE (MOTORUL CONTABIL)
// =========================================================================

export function verifyOpeningBalance(companyId: number, batchId: number): OpeningVerificationResult {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) {
    throw new Error('Lotul de preluare a balanței nu există.');
  }

  const lines = getOpeningBalanceLines(batchId, companyId);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Moneda contabilă de referință și monedele permise pentru societate
  const baseCurrency = String(batch.base_currency || 'RON').trim().toUpperCase();
  const allowedCurrencies = getAllowedCurrencies(companyId);

  // Pentru calculul balanței se iau în considerare fie liniile frunză (analitice), fie sinteticele fără analitice.
  // Evităm dubla adunare a sinteticelor agregate!
  let totalDebitInitialBani = 0;
  let totalCreditInitialBani = 0;
  let totalDebitPrevBani = 0;
  let totalCreditPrevBani = 0;

  // Verificări structurale:
  for (const line of lines) {
    // 1. Verificare valori negative
    if (line.debit_initial < 0 || line.credit_initial < 0 || line.debit_prev < 0 || line.credit_prev < 0) {
      errors.push(`Contul ${line.account_symbol} (${line.account_name}) conține valori negative în coloanele de totaluri.`);
    }

    // 2. Verificare convenție pentru început de an (YEAR_START)
    if (batch.batch_type === 'YEAR_START') {
      if (toBani(line.debit_prev) !== toBani(line.debit_initial)) {
        errors.push(`Contul ${line.account_symbol}: La preluarea de început de an, Debit precedent (${line.debit_prev}) trebuie să fie egal cu Debit inițial an (${line.debit_initial}).`);
      }
      if (toBani(line.credit_prev) !== toBani(line.credit_initial)) {
        errors.push(`Contul ${line.account_symbol}: La preluarea de început de an, Credit precedent (${line.credit_prev}) trebuie să fie egal cu Credit inițial an (${line.credit_initial}).`);
      }
    }

    // 3. Verificare convenție în cursul anului (DURING_YEAR)
    // Totalurile precedente includ soldurile inițiale conform convenției de import SAGA C
    if (batch.batch_type === 'DURING_YEAR') {
      if (toBani(line.debit_prev) < toBani(line.debit_initial)) {
        errors.push(`Contul ${line.account_symbol}: Debit precedent (${line.debit_prev}) nu poate fi mai mic decât Debit inițial an (${line.debit_initial}).`);
      }
      if (toBani(line.credit_prev) < toBani(line.credit_initial)) {
        errors.push(`Contul ${line.account_symbol}: Credit precedent (${line.credit_prev}) nu poate fi mai mic decât Credit inițial an (${line.credit_initial}).`);
      }
    }

    // 4. Verificare dublă înregistrare pe cont părinte și analitice
    // Verificăm dacă utilizatorul a introdus sume direct pe un cont părinte care are și analitice cu sume
    if (line.is_synthetic_summary && line.own_values) {
      errors.push(`Contul ${line.account_symbol} are solduri introduse atât direct, cât și pe analitice. Ștergeți soldul sintetic (dublă preluare).`);
    }
    if (line.has_analytics && !line.is_synthetic_summary) {
      // Dacă nu este rezumat calculat automat, verificăm dacă este în baza de date cu valori
      const dbSaved = db.prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ? AND account_id = ?').get(batchId, line.account_id) as any;
      if (dbSaved && (dbSaved.debit_initial > 0 || dbSaved.credit_initial > 0 || dbSaved.debit_prev > 0 || dbSaved.credit_prev > 0)) {
        errors.push(`Contul sintetic ${line.account_symbol} conține solduri introduse direct, deși există conturi analitice configurate. Introduceți soldurile exclusiv pe conturile analitice.`);
      }
    }

    // 5. Verificări valutare (doar pe liniile de detaliu, nu pe totalizatoarele agregate)
    if (!line.is_synthetic_summary) {
      const lineCurrency = String(line.currency || 'RON').trim().toUpperCase();
      const currencyAmountBani = toBani(line.currency_amount);
      const debitFinalBani = toBani(line.debit_final);
      const creditFinalBani = toBani(line.credit_final);
      // Soldul RON al liniei: debitor dacă există, altfel creditor
      const soldBani = debitFinalBani !== 0 ? debitFinalBani : creditFinalBani;
      const rate = Number(line.exchange_rate) || 0;

      if (lineCurrency === baseCurrency) {
        if (currencyAmountBani !== 0) {
          warnings.push(`Cont ${line.account_symbol}: suma în valută ignorată pentru moneda contabilă.`);
        }
      } else {
        if (!allowedCurrencies.includes(lineCurrency)) {
          errors.push(`Cont ${line.account_symbol}: moneda ${lineCurrency} nu este configurată.`);
        }

        if (soldBani !== 0 && currencyAmountBani === 0) {
          errors.push(`Cont ${line.account_symbol}: lipsește suma în valută originală.`);
        }

        if (currencyAmountBani !== 0 && soldBani === 0) {
          errors.push(`Cont ${line.account_symbol}: suma în valută nu are echivalent contabil în ${baseCurrency}.`);
        }

        if (rate > 0 && rate !== 1) {
          if (!line.exchange_rate_date) {
            warnings.push(`Cont ${line.account_symbol}: lipsește data cursului.`);
          }

          // Echivalentul RON estimat cu cursul liniei (4 zecimale, rotunjire half-up),
          // exclusiv pentru avertizare — nu se recalculează automat soldul.
          const rateE4 = Math.round(rate * 10000);
          const product = BigInt(currencyAmountBani) * BigInt(rateE4);
          const expectedBani = product >= 0n
            ? (product + 5000n) / 10000n
            : -((-product + 5000n) / 10000n);
          const differenceBani = expectedBani - BigInt(soldBani);
          const absDifferenceBani = differenceBani < 0n ? -differenceBani : differenceBani;

          if (absDifferenceBani > 100n) {
            warnings.push(`Cont ${line.account_symbol}: echivalentul RON (${fromBani(soldBani).toFixed(2)}) diferă de suma în valută × curs (${fromBani(Number(expectedBani)).toFixed(2)}).`);
          }
        }
      }
    }

    // Adunare la totalurile balanței:
    // Dacă contul are analitice cu valori, adunăm doar analiticele.
    // Dacă contul sintetic NU are analitice, îl adunăm.
    if (!line.is_synthetic_summary) {
      totalDebitInitialBani += toBani(line.debit_initial);
      totalCreditInitialBani += toBani(line.credit_initial);
      totalDebitPrevBani += toBani(line.debit_prev);
      totalCreditPrevBani += toBani(line.credit_prev);
    }
  }

  const totalDebitInitial = fromBani(totalDebitInitialBani);
  const totalCreditInitial = fromBani(totalCreditInitialBani);
  const totalDebitPrev = fromBani(totalDebitPrevBani);
  const totalCreditPrev = fromBani(totalCreditPrevBani);

  const diffInitialBani = totalDebitInitialBani - totalCreditInitialBani;
  const diffPrevBani = totalDebitPrevBani - totalCreditPrevBani;
  const diffInitial = fromBani(diffInitialBani);
  const diffPrev = fromBani(diffPrevBani);

  // Verificare egalitate debit-credit inițial an
  if (diffInitialBani !== 0) {
    errors.push(`Balanța este dezechilibrată la începutul anului: Total debit inițial (${totalDebitInitial.toFixed(2)}) diferă de Total credit inițial (${totalCreditInitial.toFixed(2)}) cu diferența de ${fromBani(Math.abs(diffInitialBani)).toFixed(2)} lei.`);
  }

  // Verificare egalitate debit-credit precedent
  if (diffPrevBani !== 0) {
    errors.push(`Balanța este dezechilibrată la totaluri precedente: Total debit precedent (${totalDebitPrev.toFixed(2)}) diferă de Total credit precedent (${totalCreditPrev.toFixed(2)}) cu diferența de ${fromBani(Math.abs(diffPrevBani)).toFixed(2)} lei.`);
  }

  // Verificare cazul fără activitate
  if (batch.batch_type === 'NO_ACTIVITY') {
    if (totalDebitInitialBani > 0 || totalCreditInitialBani > 0 || totalDebitPrevBani > 0 || totalCreditPrevBani > 0) {
      warnings.push('Ați selectat tipul „Societate fără activitate anterioară”, dar există conturi cu solduri introduse. Pentru o societate nouă, balanța de pornire se validează cu solduri zero.');
    }
  }

  // 5. Verificare concordanță solduri terți (submodul Clienți & Furnizori)
  // Documentele se grupează pe contul contabil pe care au fost introduse, iar soldul
  // de justificat este soldul liniei de cont, cu semnul specific tipului de terț.
  const counterpartyRows = db.prepare(`
    SELECT account_id, account_symbol, partner_type, remaining_amount_ron
    FROM accounting_opening_counterparty_items
    WHERE batch_id = ?
  `).all(batchId) as Array<{
    account_id: number;
    account_symbol: string;
    partner_type: 'CLIENT' | 'SUPPLIER';
    remaining_amount_ron: number;
  }>;

  const linesByAccountId = new Map<number, OpeningBalanceLine>();
  for (const line of lines) {
    linesByAccountId.set(line.account_id, line);
  }

  const itemsByAccountId = new Map<number, { symbol: string; partnerType: 'CLIENT' | 'SUPPLIER'; totalBani: number }>();
  let supplierTotalBani = 0;
  let clientTotalBani = 0;
  for (const row of counterpartyRows) {
    const rowBani = toBani(row.remaining_amount_ron);
    const existing = itemsByAccountId.get(row.account_id);
    if (existing) {
      existing.totalBani += rowBani;
    } else {
      itemsByAccountId.set(row.account_id, {
        symbol: row.account_symbol,
        partnerType: row.partner_type,
        totalBani: rowBani
      });
    }
    if (row.partner_type === 'SUPPLIER') supplierTotalBani += rowBani;
    if (row.partner_type === 'CLIENT') clientTotalBani += rowBani;
  }

  // Fiecare cont cu documente trebuie să aibă soldul acoperit exact de suma rămasă pe documente
  for (const [accountId, accountItems] of itemsByAccountId) {
    const line = linesByAccountId.get(accountId);
    const lineSymbol = line ? line.account_symbol : accountItems.symbol;
    const debitFinalBani = line ? toBani(line.debit_final) : 0;
    const creditFinalBani = line ? toBani(line.credit_final) : 0;
    const soldBani = accountItems.partnerType === 'SUPPLIER'
      ? creditFinalBani - debitFinalBani
      : debitFinalBani - creditFinalBani;

    if (accountItems.totalBani !== soldBani) {
      errors.push(`Detaliile pe documente pentru ${lineSymbol} (${fromBani(accountItems.totalBani).toFixed(2)}) diferă de soldul contului (${fromBani(soldBani).toFixed(2)}).`);
    }
  }

  // Conturile de terți cu sold, dar fără documente justificative
  for (const line of lines) {
    if (line.is_synthetic_summary) continue;
    const symbol = line.account_symbol;
    const isSupplierAccount = symbol.startsWith('401');
    const isClientAccount = symbol.startsWith('4111');
    if (!isSupplierAccount && !isClientAccount) continue;
    if (itemsByAccountId.has(line.account_id)) continue;

    const soldBani = isSupplierAccount
      ? toBani(line.credit_final) - toBani(line.debit_final)
      : toBani(line.debit_final) - toBani(line.credit_final);

    if (soldBani !== 0) {
      warnings.push(`Soldul ${symbol} nu este detaliat pe documente.`);
    }
  }

  // Totalurile pe tip de terț: suma rămasă pe documente față de soldul conturilor de terți
  const supplierTargetBani = lines
    .filter(l => !l.is_synthetic_summary && l.account_symbol.startsWith('401'))
    .reduce((sum, l) => sum + toBani(l.credit_final) - toBani(l.debit_final), 0);
  const clientTargetBani = lines
    .filter(l => !l.is_synthetic_summary && l.account_symbol.startsWith('4111'))
    .reduce((sum, l) => sum + toBani(l.debit_final) - toBani(l.credit_final), 0);

  const supplierTotal = fromBani(supplierTotalBani);
  const supplierTarget = fromBani(supplierTargetBani);
  const supplierDiff = fromBani(supplierTotalBani - supplierTargetBani);
  const clientTotal = fromBani(clientTotalBani);
  const clientTarget = fromBani(clientTargetBani);
  const clientDiff = fromBani(clientTotalBani - clientTargetBani);

  const isValid = errors.length === 0;

  const totalDebitFinalBani = lines
    .filter(l => !l.is_synthetic_summary)
    .reduce((s, l) => s + toBani(l.debit_final), 0);
  const totalCreditFinalBani = lines
    .filter(l => !l.is_synthetic_summary)
    .reduce((s, l) => s + toBani(l.credit_final), 0);

  return {
    isValid,
    errors,
    warnings,
    totals: {
      total_debit_initial: totalDebitInitial,
      total_credit_initial: totalCreditInitial,
      diff_initial: diffInitial,
      total_debit_prev: totalDebitPrev,
      total_credit_prev: totalCreditPrev,
      diff_prev: diffPrev,
      total_debit_final: fromBani(totalDebitFinalBani),
      total_credit_final: fromBani(totalCreditFinalBani),
      diff_final: fromBani(totalDebitFinalBani - totalCreditFinalBani)
    },
    counterparty_summary: {
      supplier_total: supplierTotal,
      supplier_target: supplierTarget,
      supplier_diff: supplierDiff,
      client_total: clientTotal,
      client_target: clientTarget,
      client_diff: clientDiff
    }
  };
}

// =========================================================================
// 3b. MARCARE STARE VERIFICARE (DRAFT <-> IN_VERIFICATION)
// =========================================================================

/**
 * Marchează rezultatul rulării «Verifică balanța»: fără erori blocante lotul
 * trece în IN_VERIFICATION, cu erori revine în DRAFT. Lotul validat nu se modifică.
 */
export function markVerificationStatus(
  companyId: number,
  batchId: number,
  hasErrors: boolean,
  userId: number,
  userName: string
): { success: boolean; status: BatchStatus; batch: OpeningBatch } {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch | undefined;
  if (!batch) {
    throw openingError('Lotul de preluare nu există.');
  }

  if (batch.status === 'VALIDATED') {
    return { success: true, status: batch.status, batch };
  }

  const verif = verifyOpeningBalance(companyId, batchId);
  const nextStatus: BatchStatus = hasErrors ? 'DRAFT' : 'IN_VERIFICATION';
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE accounting_opening_batches SET
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(nextStatus, now, batchId);

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'VERIFY', ?, ?, 'Verificare balanță de pornire', ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      `Verificare finalizată: ${verif.errors.length} erori, ${verif.warnings.length} avertizări. Stare lot: ${nextStatus}`,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, status: updatedBatch.status, batch: updatedBatch };
}

// =========================================================================
// 4. SALVARE LINII BALANȚĂ CU TRANZACȚIE ȘI OPTIMISTIC LOCKING
// =========================================================================

export function saveOpeningBalanceLines(
  companyId: number,
  batchId: number,
  data: {
    batch_type: BatchType;
    start_month: number;
    notes?: string;
    version: number;
    lines: Array<{
      account_id: number;
      account_symbol: string;
      debit_initial: number;
      credit_initial: number;
      debit_prev: number;
      credit_prev: number;
      currency?: string;
      currency_amount?: number;
      exchange_rate?: number;
      exchange_rate_date?: string | null;
      exchange_rate_source?: string;
      notes?: string;
    }>;
  },
  userId: number,
  userName: string
): { success: boolean; version: number; batch: OpeningBatch } {
  const currentBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!currentBatch) {
    throw openingError('Lotul de preluare nu a fost găsit.');
  }

  if (!currentBatch.setup_completed) {
    throw openingError('Alegeți întâi tipul preluării');
  }

  if (currentBatch.status === 'VALIDATED') {
    throw openingError('Balanța de pornire este validată și blocată. Pentru modificări este necesară o operațiune de devalidare documentată.', 'CONFLICT');
  }

  // Optimistic Locking
  if (currentBatch.version !== data.version) {
    throw openingError(`Conflict de concurență (Optimistic Locking): datele au fost actualizate de un alt utilizator. Reîncărcați ecranul (versiunea curentă: ${currentBatch.version}, versiunea trimisă: ${data.version}).`, 'CONFLICT');
  }

  const existingRows = db
    .prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ?')
    .all(batchId) as Array<{
      account_id: number;
      debit_initial: number;
      credit_initial: number;
      debit_prev: number;
      credit_prev: number;
      currency: string;
      currency_amount: number;
      exchange_rate: number;
      exchange_rate_date: string | null;
      exchange_rate_source: string | null;
      value_source: string;
      notes: string;
    }>;
  const existingByAccount = new Map(existingRows.map((row) => [row.account_id, row]));

  const now = new Date().toISOString();
  const nextVersion = currentBatch.version + 1;

  const tx = db.transaction(() => {
    // 1. Actualizare detalii batch (tipul și luna de start se stabilesc doar la configurare)
    db.prepare(`
      UPDATE accounting_opening_batches SET
        notes = ?,
        status = 'DRAFT',
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(data.notes || '', nextVersion, now, batchId);

    // 2. Pregătire upsert pentru fiecare cont cu valori nenule
    const upsertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        exchange_rate_date, exchange_rate_source, value_source, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(batch_id, account_id) DO UPDATE SET
        debit_initial = excluded.debit_initial,
        credit_initial = excluded.credit_initial,
        debit_prev = excluded.debit_prev,
        credit_prev = excluded.credit_prev,
        currency = excluded.currency,
        currency_amount = excluded.currency_amount,
        exchange_rate = excluded.exchange_rate,
        exchange_rate_date = excluded.exchange_rate_date,
        exchange_rate_source = excluded.exchange_rate_source,
        value_source = excluded.value_source,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `);

    const deleteStmt = db.prepare(`
      DELETE FROM accounting_opening_balance_lines WHERE batch_id = ? AND account_id = ?
    `);

    for (const l of data.lines) {
      const dInitBani = toBani(l.debit_initial);
      const cInitBani = toBani(l.credit_initial);
      const dPrevBani = toBani(l.debit_prev);
      const cPrevBani = toBani(l.credit_prev);
      const curr = l.currency || 'RON';
      const currAmtBani = toBani(l.currency_amount || 0);
      const exRate = l.exchange_rate || 1.0;
      const exDate = l.exchange_rate_date || null;
      const note = (l.notes || '').trim();

      const existing = existingByAccount.get(l.account_id);

      // Sursa cursului: dacă nu vine în payload, păstrăm valoarea existentă în DB
      const payloadRateSource = (l.exchange_rate_source || '').trim();
      const exRateSource = payloadRateSource || (existing?.exchange_rate_source || '');

      // Sursa valorii: MANUAL doar când linia se modifică efectiv, altfel păstrăm sursa existentă
      const valuesUnchanged = !!existing
        && toBani(existing.debit_initial) === dInitBani
        && toBani(existing.credit_initial) === cInitBani
        && toBani(existing.debit_prev) === dPrevBani
        && toBani(existing.credit_prev) === cPrevBani
        && (existing.currency || 'RON') === curr
        && toBani(existing.currency_amount || 0) === currAmtBani
        && (existing.exchange_rate || 1.0) === exRate
        && (existing.exchange_rate_date || null) === exDate
        && (existing.notes || '') === note;
      const valueSource = valuesUnchanged ? existing!.value_source : 'MANUAL';

      // Dacă toate valorile sunt zero și nu are monedă străină/note, eliminăm din DB pentru a evita salvarea duplicărilor inutile
      if (dInitBani === 0 && cInitBani === 0 && dPrevBani === 0 && cPrevBani === 0 && curr === 'RON' && currAmtBani === 0 && !note) {
        deleteStmt.run(batchId, l.account_id);
      } else {
        upsertStmt.run(
          batchId,
          l.account_id,
          l.account_symbol,
          fromBani(dInitBani),
          fromBani(cInitBani),
          fromBani(dPrevBani),
          fromBani(cPrevBani),
          curr,
          fromBani(currAmtBani),
          exRate,
          exDate,
          exRateSource,
          valueSource,
          note,
          now,
          now
        );
      }
    }

    // 3. Recalculare totaluri în batch
    const verif = verifyOpeningBalance(companyId, batchId);
    db.prepare(`
      UPDATE accounting_opening_batches SET
        total_debit_initial = ?,
        total_credit_initial = ?,
        total_debit_prev = ?,
        total_credit_prev = ?
      WHERE id = ?
    `).run(
      verif.totals.total_debit_initial,
      verif.totals.total_credit_initial,
      verif.totals.total_debit_prev,
      verif.totals.total_credit_prev,
      batchId
    );

    // 4. Jurnalizare
    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'SAVE', ?, ?, 'Salvare modificări balanță de pornire', ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      `Salvat ${data.lines.length} conturi. Tip: ${currentBatch.batch_type}, Luna: ${currentBatch.start_month}, Versiune: ${nextVersion}`,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, version: nextVersion, batch: updatedBatch };
}

// =========================================================================
// 4b. REPARTIZARE SOLD PĂRINTE PE CONTURI ANALITICE (REDISTRIBUTE)
// =========================================================================

/**
 * Verifică dacă un cont este descendent (direct sau indirect) al unui cont părinte,
 * urmărind lanțul de parent_id în planul de conturi al societății.
 */
function isDescendantAccount(companyId: number, accountId: number, ancestorId: number): boolean {
  let currentId: number | null = accountId;
  let guard = 0;
  while (currentId !== null && guard < 100) {
    const row = db
      .prepare('SELECT parent_id FROM accounting_accounts WHERE company_id = ? AND id = ?')
      .get(companyId, currentId) as { parent_id: number | null } | undefined;
    if (!row) return false;
    if (row.parent_id === ancestorId) return true;
    currentId = row.parent_id;
    guard++;
  }
  return false;
}

export function redistributeToAnalytics(
  companyId: number,
  batchId: number,
  data: {
    parent_account_id: number;
    version: number;
    allocations: Array<{
      account_id: number;
      debit_initial: number | string;
      credit_initial: number | string;
      debit_prev: number | string;
      credit_prev: number | string;
    }>;
  },
  userId: number,
  userName: string
): { success: boolean; batch: OpeningBatch } {
  const batch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE id = ? AND company_id = ?')
    .get(batchId, companyId) as OpeningBatch | undefined;

  if (!batch) {
    throw openingError('Lotul de preluare nu a fost găsit.');
  }

  if (batch.status === 'VALIDATED') {
    throw openingError('Balanța de pornire este validată și blocată. Pentru modificări este necesară o operațiune de devalidare documentată.', 'CONFLICT');
  }

  // Optimistic Locking
  if (batch.version !== data.version) {
    throw openingError(`Conflict de concurență (Optimistic Locking): datele au fost actualizate de un alt utilizator. Reîncărcați ecranul (versiunea curentă: ${batch.version}, versiunea trimisă: ${data.version}).`, 'CONFLICT');
  }

  const allocations = Array.isArray(data.allocations) ? data.allocations : [];
  if (allocations.length === 0) {
    throw openingError('Selectați cel puțin un cont analitic pentru repartizare.');
  }

  const parentAccount = db
    .prepare('SELECT * FROM accounting_accounts WHERE company_id = ? AND id = ?')
    .get(companyId, data.parent_account_id) as { id: number; symbol: string } | undefined;

  if (!parentAccount) {
    throw openingError('Contul părinte nu a fost găsit în planul de conturi al acestei societăți.');
  }

  const parentLine = db
    .prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ? AND account_id = ?')
    .get(batchId, parentAccount.id) as any | undefined;

  const parentDebitInitBani = parentLine ? toBani(parentLine.debit_initial) : 0;
  const parentCreditInitBani = parentLine ? toBani(parentLine.credit_initial) : 0;
  const parentDebitPrevBani = parentLine ? toBani(parentLine.debit_prev) : 0;
  const parentCreditPrevBani = parentLine ? toBani(parentLine.credit_prev) : 0;

  if (
    !parentLine ||
    (parentDebitInitBani === 0 && parentCreditInitBani === 0 && parentDebitPrevBani === 0 && parentCreditPrevBani === 0)
  ) {
    throw openingError(`Contul ${parentAccount.symbol} nu are sold propriu de repartizat.`);
  }

  // 1. Validarea fiecărei alocări
  const seenAccountIds = new Set<number>();
  const prepared: Array<{
    account_id: number;
    account_symbol: string;
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
  }> = [];

  for (const allocation of allocations) {
    const accountId = Number(allocation.account_id);
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw openingError('Lista de repartizare conține un cont invalid.');
    }

    const account = db
      .prepare('SELECT * FROM accounting_accounts WHERE company_id = ? AND id = ?')
      .get(companyId, accountId) as { id: number; symbol: string; is_active: number } | undefined;

    if (!account) {
      throw openingError(`Contul analitic #${accountId} nu a fost găsit în planul de conturi al acestei societăți.`);
    }

    if (account.is_active !== 1) {
      throw openingError(`Analiticul ${account.symbol} este inactiv.`);
    }

    if (seenAccountIds.has(account.id)) {
      throw openingError(`Analiticul ${account.symbol} apare de mai multe ori în lista de repartizare.`);
    }
    seenAccountIds.add(account.id);

    if (!isDescendantAccount(companyId, account.id, parentAccount.id)) {
      throw openingError(`Contul ${account.symbol} nu este analitic (direct sau indirect) al contului ${parentAccount.symbol}.`);
    }

    const children = db
      .prepare('SELECT COUNT(*) as total FROM accounting_accounts WHERE company_id = ? AND parent_id = ?')
      .get(companyId, account.id) as { total: number } | undefined;
    if (children && children.total > 0) {
      throw openingError(`Analiticul ${account.symbol} are analitice proprii și nu poate primi sold direct.`);
    }

    const existingLine = db
      .prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ? AND account_id = ?')
      .get(batchId, account.id) as any | undefined;

    if (
      existingLine &&
      (toBani(existingLine.debit_initial) !== 0 ||
        toBani(existingLine.credit_initial) !== 0 ||
        toBani(existingLine.debit_prev) !== 0 ||
        toBani(existingLine.credit_prev) !== 0)
    ) {
      throw openingError(`Analiticul ${account.symbol} are deja solduri introduse.`);
    }

    const debitInitBani = toBani(allocation.debit_initial);
    const creditInitBani = toBani(allocation.credit_initial);
    const debitPrevBani = toBani(allocation.debit_prev);
    const creditPrevBani = toBani(allocation.credit_prev);

    if (debitInitBani < 0 || creditInitBani < 0 || debitPrevBani < 0 || creditPrevBani < 0) {
      throw openingError(`Analiticul ${account.symbol} are valori negative. Repartizarea acceptă doar sume pozitive.`);
    }

    prepared.push({
      account_id: account.id,
      account_symbol: account.symbol,
      debit_initial: debitInitBani,
      credit_initial: creditInitBani,
      debit_prev: debitPrevBani,
      credit_prev: creditPrevBani,
    });
  }

  // 2. Conservarea totalurilor părintelui pe fiecare coloană
  const columns: Array<{
    key: 'debit_initial' | 'credit_initial' | 'debit_prev' | 'credit_prev';
    label: string;
    parentBani: number;
  }> = [
    { key: 'debit_initial', label: 'debit inițial', parentBani: parentDebitInitBani },
    { key: 'credit_initial', label: 'credit inițial', parentBani: parentCreditInitBani },
    { key: 'debit_prev', label: 'debit precedent', parentBani: parentDebitPrevBani },
    { key: 'credit_prev', label: 'credit precedent', parentBani: parentCreditPrevBani },
  ];

  for (const column of columns) {
    const totalBani = prepared.reduce((sum, line) => sum + line[column.key], 0);
    if (totalBani !== column.parentBani) {
      throw openingError(
        `Repartizarea nu conservă totalul contului ${parentAccount.symbol}: ${column.label} ${fromBani(totalBani)} ≠ ${fromBani(column.parentBani)}.`
      );
    }
  }

  const now = new Date().toISOString();
  const nextVersion = batch.version + 1;

  // Valuta se preia de la părinte doar când repartizarea are o singură alocare
  const singleAllocation = prepared.length === 1;
  const currency = singleAllocation ? (parentLine.currency || 'RON') : 'RON';
  const currencyAmountBani = singleAllocation ? toBani(parentLine.currency_amount) : 0;
  const exchangeRate = singleAllocation ? (parentLine.exchange_rate || 1.0) : 1.0;
  const exchangeRateDate = singleAllocation ? (parentLine.exchange_rate_date || null) : null;
  const exchangeRateSource = singleAllocation ? (parentLine.exchange_rate_source || '') : '';

  const details = JSON.stringify({
    parent: { account_id: parentAccount.id, account_symbol: parentAccount.symbol },
    allocations: prepared.map((line) => ({
      account_id: line.account_id,
      account_symbol: line.account_symbol,
      debit_initial: fromBani(line.debit_initial),
      credit_initial: fromBani(line.credit_initial),
      debit_prev: fromBani(line.debit_prev),
      credit_prev: fromBani(line.credit_prev),
    })),
  });

  const tx = db.transaction(() => {
    const upsertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        exchange_rate_date, exchange_rate_source, value_source, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL', '', ?, ?)
      ON CONFLICT(batch_id, account_id) DO UPDATE SET
        account_symbol = excluded.account_symbol,
        debit_initial = excluded.debit_initial,
        credit_initial = excluded.credit_initial,
        debit_prev = excluded.debit_prev,
        credit_prev = excluded.credit_prev,
        currency = excluded.currency,
        currency_amount = excluded.currency_amount,
        exchange_rate = excluded.exchange_rate,
        exchange_rate_date = excluded.exchange_rate_date,
        exchange_rate_source = excluded.exchange_rate_source,
        value_source = excluded.value_source,
        updated_at = excluded.updated_at
    `);

    for (const line of prepared) {
      upsertStmt.run(
        batchId,
        line.account_id,
        line.account_symbol,
        fromBani(line.debit_initial),
        fromBani(line.credit_initial),
        fromBani(line.debit_prev),
        fromBani(line.credit_prev),
        currency,
        fromBani(currencyAmountBani),
        exchangeRate,
        exchangeRateDate,
        exchangeRateSource,
        now,
        now
      );
    }

    // Linia părintelui dispare: soldul propriu migrează integral pe analitice
    db.prepare('DELETE FROM accounting_opening_balance_lines WHERE batch_id = ? AND account_id = ?').run(
      batchId,
      parentAccount.id
    );

    db.prepare(`
      UPDATE accounting_opening_batches SET
        status = 'DRAFT',
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(nextVersion, now, batchId);

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'REDISTRIBUTE', ?, ?, 'Repartizare sold pe conturi analitice', ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      details,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, batch: updatedBatch };
}

// =========================================================================
// 5. VALIDARE BALANȚĂ DE PORNIRE (LOCK ȘI AMPRENTĂ DE INTEGRITATE)
// =========================================================================

/**
 * Calculează amprenta de integritate SHA-256 a unui lot de preluare, pe baza
 * datelor efectiv stocate: identificatorii lotului, totalurile verificate,
 * liniile de balanță (ordonate după simbolul contului) și documentele pe terți
 * (ordonate după id). Amprenta nu conține niciun element variabil în timp,
 * astfel încât poate fi recalculată oricând și comparată cu cea salvată la validare.
 */
export function computeOpeningIntegrityHash(batchId: number): string {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch | undefined;
  if (!batch) {
    throw new Error('Lotul de preluare nu există.');
  }

  const verif = verifyOpeningBalance(batch.company_id, batchId);
  const lines = db.prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ? ORDER BY account_symbol ASC').all(batchId);
  const counterparties = db.prepare('SELECT * FROM accounting_opening_counterparty_items WHERE batch_id = ? ORDER BY id ASC').all(batchId);

  const payload = JSON.stringify({
    batchId,
    companyId: batch.company_id,
    fiscalYear: batch.fiscal_year,
    startMonth: batch.start_month,
    batchType: batch.batch_type,
    totals: verif.totals,
    lines,
    counterparties
  });

  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function validateOpeningBatch(
  companyId: number,
  batchId: number,
  version: number,
  userId: number,
  userName: string
): { success: boolean; integrity_hash: string; batch: OpeningBatch } {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) {
    throw new Error('Lotul de preluare nu există.');
  }

  if (batch.status !== 'IN_VERIFICATION') {
    throw openingError('Rulați întâi «Verifică balanța».', 'VALIDATION');
  }

  if (batch.version !== version) {
    throw openingError(`Conflict de concurență (Optimistic Locking): datele au fost actualizate de un alt utilizator. Reîncărcați ecranul (versiunea curentă: ${batch.version}, versiunea trimisă: ${version}).`, 'CONFLICT');
  }

  // 1. Verificare reguli blocante
  const verif = verifyOpeningBalance(companyId, batchId);
  if (!verif.isValid) {
    throw new Error(`Validarea nu poate fi efectuată deoarece există ${verif.errors.length} erori blocante: ${verif.errors[0]}`);
  }

  // 2. Generare amprentă de integritate (SHA-256)
  const hash = computeOpeningIntegrityHash(batchId);
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE accounting_opening_batches SET
        status = 'VALIDATED',
        validated_at = ?,
        validated_by = ?,
        validated_by_name = ?,
        integrity_hash = ?,
        total_debit_initial = ?,
        total_credit_initial = ?,
        total_debit_prev = ?,
        total_credit_prev = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      now,
      userId,
      userName,
      hash,
      verif.totals.total_debit_initial,
      verif.totals.total_credit_initial,
      verif.totals.total_debit_prev,
      verif.totals.total_credit_prev,
      now,
      batchId
    );

    // Înregistrare în log de audit
    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'VALIDATE', ?, ?, 'Validare oficială balanță de pornire', ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      `Balanță validată cu succes. Hash integritate: ${hash.substring(0, 16)}... Total debit/credit inițial: ${verif.totals.total_debit_initial.toFixed(2)}, Total precedent: ${verif.totals.total_debit_prev.toFixed(2)}`,
      now
    );

    // Starea de preluare a firmei devine VALIDATED
    db.prepare(`
      UPDATE companies SET
        opening_status = 'VALIDATED',
        opening_validated_at = ?
      WHERE id = ?
    `).run(now, companyId);
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, integrity_hash: hash, batch: updatedBatch };
}

// =========================================================================
// 6. DEVALIDARE / CORECTARE BALANȚĂ DE PORNIRE
// =========================================================================

/**
 * Numără operațiunile contabile din exercițiul curent sau ulterior.
 * Tabela de articole contabile poate să nu existe încă în schemă.
 */
export function countSubsequentOperations(companyId: number, fiscalYear: number): number {
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'accounting_entries'`)
    .get() as { name: string } | undefined;
  if (!table) {
    return 0;
  }

  const row = db.prepare(`
    SELECT COUNT(*) AS cnt FROM accounting_entries
    WHERE company_id = ? AND CAST(strftime('%Y', entry_date) AS INTEGER) >= ?
  `).get(companyId, fiscalYear) as { cnt: number } | undefined;

  return row ? row.cnt : 0;
}

export function invalidateOpeningBatch(
  companyId: number,
  batchId: number,
  reason: string,
  userId: number,
  userName: string
): { success: boolean; batch: OpeningBatch } {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) {
    throw new Error('Lotul de preluare nu există.');
  }

  if (batch.status !== 'VALIDATED') {
    throw new Error('Doar o balanță validată poate fi devalidată.');
  }

  const cleanReason = (reason || '').trim();
  if (cleanReason.length < 5) {
    throw new Error('Motivul devalidării este obligatoriu și trebuie să aibă minim 5 caractere.');
  }

  // Autorizare: administrator global sau administrator al firmei
  const isAdmin = db.prepare(`
    SELECT 1 FROM users WHERE id = ? AND role = 'ADMIN'
    UNION
    SELECT 1 FROM user_company_access WHERE user_id = ? AND company_id = ? AND role = 'ADMIN'
    LIMIT 1
  `).get(userId, userId, companyId);
  if (!isAdmin) {
    throw openingError('Nu aveți dreptul de a devalida balanța.', 'FORBIDDEN');
  }

  // Verificare dacă există operațiuni contabile ulterioare (note contabile închise, jurnale etc.)
  if (countSubsequentOperations(companyId, batch.fiscal_year) > 0) {
    throw openingError('Există operațiuni contabile ulterioare. Corectarea balanței necesită un flux contabil controlat.', 'SUBSEQUENT_OPERATIONS');
  }

  const now = new Date().toISOString();
  const nextVersion = batch.version + 1;

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE accounting_opening_batches SET
        status = 'DRAFT',
        validated_at = NULL,
        validated_by = NULL,
        validated_by_name = NULL,
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(nextVersion, now, batchId);

    // Starea de preluare a firmei revine în DRAFT
    db.prepare(`
      UPDATE companies SET
        opening_status = 'DRAFT',
        opening_validated_at = NULL
      WHERE id = ?
    `).run(companyId);

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'INVALIDATE', ?, ?, ?, ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      cleanReason,
      `Balanța a revenit în starea Ciornă (Versiunea: ${nextVersion}). Amprenta anterioară (${batch.integrity_hash || 'N/A'}) a fost invalidată.`,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, batch: updatedBatch };
}

// =========================================================================
// 7. SUBMODUL SOLDURI TERȚI LA PRELUARE (CLIENȚI & FURNIZORI)
// =========================================================================

export function getOpeningCounterparties(batchId: number): OpeningCounterpartyItem[] {
  return db.prepare(`
    SELECT * FROM accounting_opening_counterparty_items
    WHERE batch_id = ?
    ORDER BY partner_type DESC, partner_name ASC, doc_date ASC
  `).all(batchId) as OpeningCounterpartyItem[];
}

// Prefixele de conturi sintetice acceptate pentru fiecare tip de terț
const COUNTERPARTY_ACCOUNT_PREFIXES: Record<'CLIENT' | 'SUPPLIER', string[]> = {
  SUPPLIER: ['401', '403', '404', '408'],
  CLIENT: ['411', '413', '418'],
};

// Traduce o violare de unicitate (document duplicat pentru același terț) în eroare de conflict
function mapCounterpartyUniqueError(err: unknown): Error {
  if (String((err as Error)?.message || '').includes('UNIQUE')) {
    return openingError('Documentul există deja pentru acest terț.', 'CONFLICT');
  }
  return err as Error;
}

export function saveOpeningCounterpartyItem(
  companyId: number,
  batchId: number,
  data: {
    id?: number;
    partner_type: 'CLIENT' | 'SUPPLIER';
    partner_name: string;
    partner_cui?: string | null;
    doc_number: string;
    doc_date: string;
    currency?: string;
    original_amount: number;
    remaining_amount: number;
    /** Echivalentul în moneda de bază, obligatoriu pentru documentele în valută. */
    remaining_amount_ron?: number;
    account_id: number;
    account_symbol: string;
    notes?: string;
  }
): OpeningCounterpartyItem {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) throw openingError('Lotul de preluare nu există.');
  if (batch.status === 'VALIDATED') {
    throw openingError('Balanța este validată și nu permite adăugarea de documente istorice.', 'CONFLICT');
  }

  const name = (data.partner_name || '').trim();
  const docNum = (data.doc_number || '').trim();
  const docDate = (data.doc_date || '').trim();
  const origAmt = round2(data.original_amount);
  const remAmt = round2(data.remaining_amount);
  const baseCurrency = String(batch.base_currency || 'RON').trim().toUpperCase();
  const curr = String(data.currency || baseCurrency).trim().toUpperCase();

  if (!name) throw openingError('Denumirea partenerului este obligatorie.');
  if (!docNum) throw openingError('Numărul documentului (factură/chitanță) este obligatoriu.');
  if (!docDate) throw openingError('Data documentului este obligatorie.');

  const allowedCurrencies = getAllowedCurrencies(companyId);
  if (!allowedCurrencies.includes(curr)) {
    throw openingError(`Moneda ${curr} nu este configurată pentru această societate.`);
  }

  // Echivalentul în moneda de bază: la valută trebuie transmis explicit, la moneda de bază este chiar suma rămasă.
  let remAmtRon: number;
  if (curr === baseCurrency) {
    remAmtRon = remAmt;
  } else {
    remAmtRon = round2(Number(data.remaining_amount_ron));
    if (toBani(remAmtRon) <= 0) {
      throw openingError(`Suma rămasă în ${baseCurrency} este obligatorie pentru documentele în valută.`);
    }
  }

  if (toBani(remAmt) <= 0) throw openingError('Suma rămasă neachitată / neîncasată trebuie să fie mai mare decât zero.');
  if (toBani(origAmt) < toBani(remAmt)) throw openingError('Suma originală a facturii nu poate fi mai mică decât suma rămasă.');

  // Documentul istoric trebuie să fie anterior datei de început a preluării
  const startMonthStr = String(batch.start_month).padStart(2, '0');
  const openingStartDate = `${batch.fiscal_year}-${startMonthStr}-01`;
  if (docDate >= openingStartDate) {
    throw openingError('Documentul trebuie să fie anterior datei preluării.');
  }

  // Verificare cont contabil asociat
  const acc = db.prepare('SELECT id, symbol FROM accounting_accounts WHERE id = ? AND company_id = ?').get(data.account_id, companyId) as { id: number; symbol: string } | undefined;
  if (!acc) throw openingError('Contul contabil asociat terțului nu există în această societate.');

  // Tipul de terț trebuie să corespundă prefixului contului contabil
  const allowedPrefixes = COUNTERPARTY_ACCOUNT_PREFIXES[data.partner_type] || [];
  if (!allowedPrefixes.some(prefix => acc.symbol.startsWith(prefix))) {
    throw openingError(`Contul ${acc.symbol} nu corespunde tipului de terț.`);
  }

  // Conturile cu analitice active nu pot primi direct documente ale terților
  const activeAnalytics = db.prepare(`
    SELECT id FROM accounting_accounts
    WHERE parent_id = ? AND company_id = ? AND is_active = 1
    LIMIT 1
  `).get(acc.id, companyId);
  if (activeAnalytics) {
    throw openingError('Asociați documentul unui cont analitic.');
  }

  const now = new Date().toISOString();

  if (data.id) {
    try {
      db.prepare(`
        UPDATE accounting_opening_counterparty_items SET
          partner_type = ?,
          partner_name = ?,
          partner_cui = ?,
          doc_number = ?,
          doc_date = ?,
          currency = ?,
          original_amount = ?,
          remaining_amount = ?,
          remaining_amount_ron = ?,
          account_id = ?,
          account_symbol = ?,
          notes = ?
        WHERE id = ? AND batch_id = ?
      `).run(
        data.partner_type,
        name,
        data.partner_cui ? data.partner_cui.trim() : null,
        docNum,
        docDate,
        curr,
        origAmt,
        remAmt,
        remAmtRon,
        acc.id,
        acc.symbol,
        data.notes || '',
        data.id,
        batchId
      );
    } catch (err) {
      throw mapCounterpartyUniqueError(err);
    }
    return db.prepare('SELECT * FROM accounting_opening_counterparty_items WHERE id = ?').get(data.id) as OpeningCounterpartyItem;
  } else {
    let res: { lastInsertRowid: number | bigint };
    try {
      res = db.prepare(`
        INSERT INTO accounting_opening_counterparty_items (
          batch_id, partner_type, partner_name, partner_cui, doc_number, doc_date,
          currency, original_amount, remaining_amount, remaining_amount_ron, account_id,
          account_symbol, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        batchId,
        data.partner_type,
        name,
        data.partner_cui ? data.partner_cui.trim() : null,
        docNum,
        docDate,
        curr,
        origAmt,
        remAmt,
        remAmtRon,
        acc.id,
        acc.symbol,
        data.notes || '',
        now
      );
    } catch (err) {
      throw mapCounterpartyUniqueError(err);
    }
    return db.prepare('SELECT * FROM accounting_opening_counterparty_items WHERE id = ?').get(Number(res.lastInsertRowid)) as OpeningCounterpartyItem;
  }
}

export function deleteOpeningCounterpartyItem(batchId: number, itemId: number): { success: boolean } {
  const batch = db.prepare('SELECT status FROM accounting_opening_batches WHERE id = ?').get(batchId) as { status: string };
  if (!batch) throw openingError('Lotul nu există.');
  if (batch.status === 'VALIDATED') {
    throw openingError('Nu se poate șterge un document dintr-o balanță validată.', 'CONFLICT');
  }

  db.prepare('DELETE FROM accounting_opening_counterparty_items WHERE id = ? AND batch_id = ?').run(itemId, batchId);
  return { success: true };
}

// =========================================================================
// 10. SERVICIU CONTABIL REUTILIZABIL PENTRU MODULELE VIITOARE
// =========================================================================

/** Valorile unei laturi (debit / credit) exprimate în lei. */
export interface OpeningBalanceSideTotals {
  debit: number;
  credit: number;
}

/** Un cont frunză din instantaneul soldurilor de deschidere. */
export interface OpeningBalanceAccountSnapshot {
  account_id: number;
  account_symbol: string;
  account_name: string;
  account_type: 'SYNTHETIC' | 'ANALYTIC';
  opening: OpeningBalanceSideTotals;
  previous_totals: OpeningBalanceSideTotals;
  previous_turnover: OpeningBalanceSideTotals;
  balance_at_start: OpeningBalanceSideTotals;
}

/** Instantaneul soldurilor de deschidere consumat de motoarele contabile. */
export interface OpeningBalancesSnapshot {
  is_validated: boolean;
  batch: OpeningBatch | null;
  accounts: OpeningBalanceAccountSnapshot[];
}

/**
 * Oferă instantaneul soldurilor de deschidere (lotul validat și conturile frunză)
 * necesar motoarelor de Balanțe, Fișe de cont și Registre.
 *
 * Valorile se calculează în bani și se convertesc în lei la ieșire: soldul inițial
 * (opening), totalurile precedente (previous_totals), rulajele precedente
 * (previous_turnover = totaluri precedente − sold inițial) și soldul la începutul
 * perioadei (balance_at_start).
 *
 * @param companyId societatea pentru care se citește balanța de pornire
 * @param fiscalYear exercițiul financiar al lotului
 * @param startPeriod luna de început cerută; trebuie să coincidă cu luna lotului
 * @throws Error dacă luna cerută diferă de luna lotului sau dacă amprenta de
 * integritate recalculată nu corespunde celei salvate la validare
 */
export function getOpeningBalances(
  companyId: number,
  fiscalYear: number,
  startPeriod?: number
): OpeningBalancesSnapshot {
  const batch = db.prepare(`
    SELECT * FROM accounting_opening_batches
    WHERE company_id = ? AND fiscal_year = ?
  `).get(companyId, fiscalYear) as OpeningBatch | undefined;

  if (!batch) {
    return {
      is_validated: false,
      batch: null,
      accounts: []
    };
  }

  if (startPeriod !== undefined && startPeriod !== batch.start_month) {
    throw openingError(
      `Perioada de început cerută (${startPeriod}) nu corespunde cu luna de început a lotului de preluare (${batch.start_month}).`
    );
  }

  const isValidated = batch.status === 'VALIDATED';

  if (isValidated) {
    const recalculatedHash = computeOpeningIntegrityHash(batch.id);
    if (!batch.integrity_hash || recalculatedHash !== batch.integrity_hash) {
      throw openingError(
        `Amprenta de integritate a balanței de pornire nu corespunde datelor stocate (luna ${batch.start_month}, exercițiul ${batch.fiscal_year}). Balanța a fost modificată după validare și trebuie reverificată.`,
        'CONFLICT'
      );
    }
  }

  const lines = getOpeningBalanceLines(batch.id, companyId);
  const accounts: OpeningBalanceAccountSnapshot[] = [];

  for (const l of lines) {
    if (l.is_synthetic_summary) continue;

    const debitInitialBani = toBani(l.debit_initial);
    const creditInitialBani = toBani(l.credit_initial);
    const debitPrevBani = toBani(l.debit_prev);
    const creditPrevBani = toBani(l.credit_prev);

    // Conturile fără nicio valoare introdusă nu intră în snapshot-ul balanței
    if (debitInitialBani === 0 && creditInitialBani === 0 && debitPrevBani === 0 && creditPrevBani === 0) {
      continue;
    }

    const diffBani = debitPrevBani - creditPrevBani;

    accounts.push({
      account_id: l.account_id,
      account_symbol: l.account_symbol,
      account_name: l.account_name,
      account_type: l.account_type,
      opening: {
        debit: fromBani(debitInitialBani),
        credit: fromBani(creditInitialBani)
      },
      previous_totals: {
        debit: fromBani(debitPrevBani),
        credit: fromBani(creditPrevBani)
      },
      previous_turnover: {
        debit: fromBani(debitPrevBani - debitInitialBani),
        credit: fromBani(creditPrevBani - creditInitialBani)
      },
      balance_at_start: {
        debit: fromBani(diffBani > 0 ? diffBani : 0),
        credit: fromBani(diffBani < 0 ? -diffBani : 0)
      }
    });
  }

  return {
    is_validated: isValidated,
    batch,
    accounts
  };
}

// =========================================================================
// 11. JURNAL DE AUDIT / LOGS
// =========================================================================

export function getOpeningValidationLogs(batchId: number): OpeningValidationLog[] {
  return db.prepare(`
    SELECT * FROM accounting_opening_validation_logs
    WHERE batch_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(batchId) as OpeningValidationLog[];
}
