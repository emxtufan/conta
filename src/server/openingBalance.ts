import crypto from 'crypto';
import { db } from './db';
import { fromBani, parseAmount, toBani } from './money';

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
    const result = db.prepare(`
      INSERT INTO accounting_opening_batches (
        company_id, fiscal_year, start_month, batch_type, status,
        total_debit_initial, total_credit_initial, total_debit_prev, total_credit_prev,
        notes, version, created_at, updated_at
      ) VALUES (?, ?, ?, 'NO_ACTIVITY', 'DRAFT', 0.0, 0.0, 0.0, 0.0, '', 1, ?, ?)
    `).run(companyId, fiscalYear, startMonth, now, now);

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
    if (line.has_analytics && !line.is_synthetic_summary) {
      // Dacă nu este rezumat calculat automat, verificăm dacă este în baza de date cu valori
      const dbSaved = db.prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ? AND account_id = ?').get(batchId, line.account_id) as any;
      if (dbSaved && (dbSaved.debit_initial > 0 || dbSaved.credit_initial > 0 || dbSaved.debit_prev > 0 || dbSaved.credit_prev > 0)) {
        errors.push(`Contul sintetic ${line.account_symbol} conține solduri introduse direct, deși există conturi analitice configurate. Introduceți soldurile exclusiv pe conturile analitice.`);
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
  const counterparties = db.prepare(`
    SELECT partner_type, SUM(remaining_amount) as total_remaining
    FROM accounting_opening_counterparty_items
    WHERE batch_id = ?
    GROUP BY partner_type
  `).all(batchId) as any[];

  let supplierTotalBani = 0;
  let clientTotalBani = 0;
  for (const cp of counterparties) {
    if (cp.partner_type === 'SUPPLIER') supplierTotalBani = toBani(cp.total_remaining);
    if (cp.partner_type === 'CLIENT') clientTotalBani = toBani(cp.total_remaining);
  }

  // Căutăm soldul total pe contul 401 (Furnizori) și analiticele sale
  const supplierLines = lines.filter(l => l.account_symbol.startsWith('401'));
  const supplierTargetBani = supplierLines
    .filter(l => !l.is_synthetic_summary)
    .reduce((sum, l) => sum + toBani(l.credit_final), 0);
  const supplierDiffBani = supplierTotalBani - supplierTargetBani;

  // Căutăm soldul total pe contul 4111 (Clienți) și analiticele sale
  const clientLines = lines.filter(l => l.account_symbol.startsWith('4111'));
  const clientTargetBani = clientLines
    .filter(l => !l.is_synthetic_summary)
    .reduce((sum, l) => sum + toBani(l.debit_final), 0);
  const clientDiffBani = clientTotalBani - clientTargetBani;

  const supplierTotal = fromBani(supplierTotalBani);
  const supplierTarget = fromBani(supplierTargetBani);
  const supplierDiff = fromBani(supplierDiffBani);
  const clientTotal = fromBani(clientTotalBani);
  const clientTarget = fromBani(clientTargetBani);
  const clientDiff = fromBani(clientDiffBani);

  if (supplierTargetBani > 0 && supplierDiffBani !== 0) {
    warnings.push(`Soldul creditor al furnizorilor (401: ${supplierTarget.toFixed(2)} lei) nu este justificat complet de facturile neachitate din submodulul Terți (Total introdus: ${supplierTotal.toFixed(2)} lei, Diferență: ${supplierDiff.toFixed(2)} lei).`);
  }

  if (clientTargetBani > 0 && clientDiffBani !== 0) {
    warnings.push(`Soldul debitor al clienților (4111: ${clientTarget.toFixed(2)} lei) nu este justificat complet de facturile neîncasate din submodulul Terți (Total introdus: ${clientTotal.toFixed(2)} lei, Diferență: ${clientDiff.toFixed(2)} lei).`);
  }

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
      notes?: string;
    }>;
  },
  userId: number,
  userName: string
): { success: boolean; version: number; batch: OpeningBatch } {
  const currentBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!currentBatch) {
    throw new Error('Lotul de preluare nu a fost găsit.');
  }

  if (currentBatch.status === 'VALIDATED') {
    throw new Error('Balanța de pornire este validată și blocată. Pentru modificări este necesară o operațiune de devalidare documentată.');
  }

  // Optimistic Locking
  if (currentBatch.version !== data.version) {
    throw new Error(`Conflict de concurență (Optimistic Locking): datele au fost actualizate de un alt utilizator. Reîncărcați ecranul (versiunea curentă: ${currentBatch.version}, versiunea trimisă: ${data.version}).`);
  }

  const now = new Date().toISOString();
  const nextVersion = currentBatch.version + 1;

  const tx = db.transaction(() => {
    // 1. Actualizare detalii batch
    db.prepare(`
      UPDATE accounting_opening_batches SET
        batch_type = ?,
        start_month = ?,
        notes = ?,
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(data.batch_type, data.start_month, data.notes || '', nextVersion, now, batchId);

    // 2. Pregătire upsert pentru fiecare cont cu valori nenule
    const upsertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        exchange_rate_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(batch_id, account_id) DO UPDATE SET
        debit_initial = excluded.debit_initial,
        credit_initial = excluded.credit_initial,
        debit_prev = excluded.debit_prev,
        credit_prev = excluded.credit_prev,
        currency = excluded.currency,
        currency_amount = excluded.currency_amount,
        exchange_rate = excluded.exchange_rate,
        exchange_rate_date = excluded.exchange_rate_date,
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
      `Salvat ${data.lines.length} conturi. Tip: ${data.batch_type}, Luna: ${data.start_month}, Versiune: ${nextVersion}`,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, version: nextVersion, batch: updatedBatch };
}

// =========================================================================
// 5. VALIDARE BALANȚĂ DE PORNIRE (LOCK ȘI AMPRENTĂ DE INTEGRITATE)
// =========================================================================

export function validateOpeningBatch(
  companyId: number,
  batchId: number,
  userId: number,
  userName: string
): { success: boolean; integrity_hash: string; batch: OpeningBatch } {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) {
    throw new Error('Lotul de preluare nu există.');
  }

  if (batch.status === 'VALIDATED') {
    throw new Error('Balanța este deja validată.');
  }

  // 1. Verificare reguli blocante
  const verif = verifyOpeningBalance(companyId, batchId);
  if (!verif.isValid) {
    throw new Error(`Validarea nu poate fi efectuată deoarece există ${verif.errors.length} erori blocante: ${verif.errors[0]}`);
  }

  // 2. Generare amprentă de integritate (SHA-256)
  const lines = db.prepare('SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ? ORDER BY account_symbol ASC').all(batchId);
  const counterparties = db.prepare('SELECT * FROM accounting_opening_counterparty_items WHERE batch_id = ? ORDER BY id ASC').all(batchId);

  const payload = JSON.stringify({
    batchId,
    companyId,
    fiscalYear: batch.fiscal_year,
    startMonth: batch.start_month,
    batchType: batch.batch_type,
    totals: verif.totals,
    lines,
    counterparties,
    timestamp: new Date().toISOString()
  });

  const hash = crypto.createHash('sha256').update(payload).digest('hex');
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
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, integrity_hash: hash, batch: updatedBatch };
}

// =========================================================================
// 6. DEVALIDARE / CORECTARE BALANȚĂ DE PORNIRE
// =========================================================================

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

  // Verificare dacă există operațiuni contabile ulterioare (note contabile închise, jurnale etc.)
  // În etapele următoare se va interoga tabela de articole contabile (ex: accounting_journal_entries)
  // Pregătim verificarea:
  const subsequentOperationsCount = 0; // Se va conecta în Etapa 5/6
  if (subsequentOperationsCount > 0) {
    throw new Error('Există operațiuni contabile ulterioare. Corectarea balanței necesită un flux contabil controlat.');
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

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'INVALIDATE', ?, ?, ?, ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      cleanReason,
      `Balanța a revenit în starea Ciornă (Versiunea: ${nextVersion}). Amprenta anterioară a fost invalidată.`,
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
    account_id: number;
    account_symbol: string;
    notes?: string;
  }
): OpeningCounterpartyItem {
  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) throw new Error('Lotul de preluare nu există.');
  if (batch.status === 'VALIDATED') throw new Error('Balanța este validată și nu permite adăugarea de documente istorice.');

  const name = (data.partner_name || '').trim();
  const docNum = (data.doc_number || '').trim();
  const docDate = (data.doc_date || '').trim();
  const origAmt = round2(data.original_amount);
  const remAmt = round2(data.remaining_amount);
  const curr = data.currency || 'RON';

  if (!name) throw new Error('Denumirea partenerului este obligatorie.');
  if (!docNum) throw new Error('Numărul documentului (factură/chitanță) este obligatoriu.');
  if (!docDate) throw new Error('Data documentului este obligatorie.');
  if (remAmt <= 0) throw new Error('Suma rămasă neachitată / neîncasată trebuie să fie mai mare decât zero.');
  if (origAmt < remAmt) throw new Error('Suma originală a facturii nu poate fi mai mică decât suma rămasă.');

  // Verificare cont contabil asociat
  const acc = db.prepare('SELECT id, symbol FROM accounting_accounts WHERE id = ? AND company_id = ?').get(data.account_id, companyId) as any;
  if (!acc) throw new Error('Contul contabil asociat terțului nu există în această societate.');

  const now = new Date().toISOString();

  if (data.id) {
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
      acc.id,
      acc.symbol,
      data.notes || '',
      data.id,
      batchId
    );
    return db.prepare('SELECT * FROM accounting_opening_counterparty_items WHERE id = ?').get(data.id) as OpeningCounterpartyItem;
  } else {
    const res = db.prepare(`
      INSERT INTO accounting_opening_counterparty_items (
        batch_id, partner_type, partner_name, partner_cui, doc_number, doc_date,
        currency, original_amount, remaining_amount, account_id, account_symbol,
        notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      acc.id,
      acc.symbol,
      data.notes || '',
      now
    );
    return db.prepare('SELECT * FROM accounting_opening_counterparty_items WHERE id = ?').get(Number(res.lastInsertRowid)) as OpeningCounterpartyItem;
  }
}

export function deleteOpeningCounterpartyItem(batchId: number, itemId: number): { success: boolean } {
  const batch = db.prepare('SELECT status FROM accounting_opening_batches WHERE id = ?').get(batchId) as { status: string };
  if (!batch) throw new Error('Lotul nu există.');
  if (batch.status === 'VALIDATED') throw new Error('Nu se poate șterge un document dintr-o balanță validată.');

  db.prepare('DELETE FROM accounting_opening_counterparty_items WHERE id = ? AND batch_id = ?').run(itemId, batchId);
  return { success: true };
}

// =========================================================================
// 8. IMPORT BALANȚĂ DIN CSV / EXCEL CU VALIDARE ȘI PREVIZUALIZARE
// =========================================================================

export interface ImportRowInput {
  symbol: string;
  name?: string;
  debit_initial?: any;
  credit_initial?: any;
  debit_prev?: any;
  credit_prev?: any;
  currency?: string;
  notes?: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningsCount: number;
  items: Array<{
    rowIndex: number;
    symbol: string;
    name: string;
    accountId: number | null;
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
    currency: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  calculatedTotals: {
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
  };
}

export function previewOpeningImport(
  companyId: number,
  rows: ImportRowInput[]
): ImportPreviewResult {
  const companyAccounts = db.prepare(`
    SELECT id, symbol, name, is_active, type, parent_id
    FROM accounting_accounts
    WHERE company_id = ?
  `).all(companyId) as any[];

  const accountBySymbol = new Map<string, any>();
  for (const acc of companyAccounts) {
    accountBySymbol.set(acc.symbol.trim(), acc);
  }

  const seenSymbols = new Set<string>();
  let validRows = 0;
  let errorRows = 0;
  let warningsCount = 0;

  let totalDInit = 0.0;
  let totalCInit = 0.0;
  let totalDPrev = 0.0;
  let totalCPrev = 0.0;

  const items: ImportPreviewResult['items'] = [];

  rows.forEach((r, idx) => {
    const rawSymbol = (r.symbol || '').trim();
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawSymbol) {
      errors.push('Simbolul contului lipsește.');
    }

    const matchedAcc = accountBySymbol.get(rawSymbol);
    if (!matchedAcc) {
      errors.push(`Contul "${rawSymbol}" nu există în planul de conturi al societății.`);
    } else if (matchedAcc.is_active === 0) {
      errors.push(`Contul "${rawSymbol}" este marcat ca inactiv în planul de conturi.`);
    }

    if (seenSymbols.has(rawSymbol)) {
      errors.push(`Contul "${rawSymbol}" apare duplicat în fișierul de import.`);
    }
    seenSymbols.add(rawSymbol);

    const dInit = parseRomanianNumber(r.debit_initial);
    const cInit = parseRomanianNumber(r.credit_initial);
    const dPrev = parseRomanianNumber(r.debit_prev);
    const cPrev = parseRomanianNumber(r.credit_prev);

    if (dInit < 0 || cInit < 0 || dPrev < 0 || cPrev < 0) {
      errors.push('Valorile nu pot fi negative.');
    }

    // Monedă
    const currency = (r.currency || 'RON').trim().toUpperCase();
    if (!['RON', 'EUR', 'USD', 'GBP', 'CHF'].includes(currency)) {
      warnings.push(`Moneda "${currency}" nu este în lista standard (RON, EUR, USD, GBP, CHF).`);
      warningsCount++;
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validRows++;
      totalDInit += dInit;
      totalCInit += cInit;
      totalDPrev += dPrev;
      totalCPrev += cPrev;
    } else {
      errorRows++;
    }

    items.push({
      rowIndex: idx + 1,
      symbol: rawSymbol,
      name: matchedAcc ? matchedAcc.name : (r.name || 'Cont necunoscut'),
      accountId: matchedAcc ? matchedAcc.id : null,
      debit_initial: dInit,
      credit_initial: cInit,
      debit_prev: dPrev,
      credit_prev: cPrev,
      currency,
      isValid,
      errors,
      warnings
    });
  });

  return {
    totalRows: rows.length,
    validRows,
    errorRows,
    warningsCount,
    items,
    calculatedTotals: {
      debit_initial: round2(totalDInit),
      credit_initial: round2(totalCInit),
      debit_prev: round2(totalDPrev),
      credit_prev: round2(totalCPrev)
    }
  };
}

export function commitOpeningImport(
  companyId: number,
  batchId: number,
  rows: ImportRowInput[],
  userId: number,
  userName: string
): { success: boolean; importedCount: number; batch: OpeningBatch } {
  const preview = previewOpeningImport(companyId, rows);
  if (preview.errorRows > 0) {
    const firstErr = preview.items.find(i => !i.isValid);
    throw new Error(`Fișierul conține ${preview.errorRows} erori care împiedică importul. Rând ${firstErr?.rowIndex}: ${firstErr?.errors.join(', ')}`);
  }

  const batch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  if (!batch) throw new Error('Lotul de preluare nu există.');
  if (batch.status === 'VALIDATED') throw new Error('Balanța este validată și nu poate fi suprascrisă.');

  const now = new Date().toISOString();
  const nextVersion = batch.version + 1;

  const tx = db.transaction(() => {
    // Curățare date anterioare din lot
    db.prepare('DELETE FROM accounting_opening_balance_lines WHERE batch_id = ?').run(batchId);

    const insertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        exchange_rate_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, NULL, ?, ?, ?)
    `);

    let count = 0;
    for (const item of preview.items) {
      if (item.debit_initial > 0 || item.credit_initial > 0 || item.debit_prev > 0 || item.credit_prev > 0) {
        insertStmt.run(
          batchId,
          item.accountId,
          item.symbol,
          item.debit_initial,
          item.credit_initial,
          item.debit_prev,
          item.credit_prev,
          item.currency,
          item.currency !== 'RON' ? (item.debit_prev || item.credit_prev) : 0,
          '',
          now,
          now
        );
        count++;
      }
    }

    // Actualizare totaluri și versiune în batch
    const verif = verifyOpeningBalance(companyId, batchId);
    db.prepare(`
      UPDATE accounting_opening_batches SET
        total_debit_initial = ?,
        total_credit_initial = ?,
        total_debit_prev = ?,
        total_credit_prev = ?,
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      verif.totals.total_debit_initial,
      verif.totals.total_credit_initial,
      verif.totals.total_debit_prev,
      verif.totals.total_credit_prev,
      nextVersion,
      now,
      batchId
    );

    // Înregistrare log audit
    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'IMPORT', ?, ?, 'Import fișier CSV / Excel', ?, ?)
    `).run(
      batchId,
      userId,
      userName,
      `Importat cu succes ${count} conturi cu solduri din totalul de ${preview.totalRows} rânduri analizate.`,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(batchId) as OpeningBatch;
  return { success: true, importedCount: preview.validRows, batch: updatedBatch };
}

// =========================================================================
// 9. IMPORT BALANȚĂ DINTR-O ALTĂ SOCIETATE DIN APLICAȚIE
// =========================================================================

export function copyOpeningBalanceFromCompany(
  sourceCompanyId: number,
  targetCompanyId: number,
  fiscalYear: number,
  userId: number,
  userName: string
): { success: boolean; copiedCount: number; batch: OpeningBatch } {
  if (sourceCompanyId === targetCompanyId) {
    throw new Error('Societatea sursă și societatea destinație trebuie să fie diferite.');
  }

  // Verificare sursă
  const sourceBatch = db.prepare(`
    SELECT * FROM accounting_opening_batches
    WHERE company_id = ? AND fiscal_year = ?
  `).get(sourceCompanyId, fiscalYear) as OpeningBatch | undefined;

  if (!sourceBatch) {
    throw new Error(`Nu există o balanță de pornire configurată pentru societatea sursă în anul ${fiscalYear}.`);
  }

  const sourceLines = db.prepare(`
    SELECT * FROM accounting_opening_balance_lines WHERE batch_id = ?
  `).all(sourceBatch.id) as any[];

  if (sourceLines.length === 0) {
    throw new Error('Balanța de pornire din societatea sursă nu are linii de conturi cu solduri.');
  }

  // Obținere sau creare batch destinație
  const targetBatch = getOrCreateOpeningBatch(targetCompanyId, fiscalYear, sourceBatch.start_month, userId, userName);
  if (targetBatch.status === 'VALIDATED') {
    throw new Error('Balanța societății destinație este deja validată și nu poate fi suprascrisă.');
  }

  // Mapare conturi pe societatea destinație după simbol
  const targetAccounts = db.prepare(`
    SELECT id, symbol FROM accounting_accounts WHERE company_id = ? AND is_active = 1
  `).all(targetCompanyId) as any[];

  const targetAccountMap = new Map<string, number>();
  for (const acc of targetAccounts) {
    targetAccountMap.set(acc.symbol, acc.id);
  }

  const now = new Date().toISOString();
  const nextVersion = targetBatch.version + 1;
  let copiedCount = 0;

  const tx = db.transaction(() => {
    // Curățare date vechi
    db.prepare('DELETE FROM accounting_opening_balance_lines WHERE batch_id = ?').run(targetBatch.id);

    const insertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        exchange_rate_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const sl of sourceLines) {
      const targetAccId = targetAccountMap.get(sl.account_symbol);
      if (targetAccId) {
        insertStmt.run(
          targetBatch.id,
          targetAccId,
          sl.account_symbol,
          sl.debit_initial,
          sl.credit_initial,
          sl.debit_prev,
          sl.credit_prev,
          sl.currency,
          sl.currency_amount,
          sl.exchange_rate,
          sl.exchange_rate_date,
          `Preluat din societatea ID ${sourceCompanyId}`,
          now,
          now
        );
        copiedCount++;
      }
    }

    // Actualizare batch destinație
    db.prepare(`
      UPDATE accounting_opening_batches SET
        batch_type = ?,
        start_month = ?,
        version = ?,
        updated_at = ?
      WHERE id = ?
    `).run(sourceBatch.batch_type, sourceBatch.start_month, nextVersion, now, targetBatch.id);

    // Verificare și actualizare totaluri
    const verif = verifyOpeningBalance(targetCompanyId, targetBatch.id);
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
      targetBatch.id
    );

    // Audit log
    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'COPY_COMPANY', ?, ?, 'Preluare date din altă societate a aplicației', ?, ?)
    `).run(
      targetBatch.id,
      userId,
      userName,
      `Preluat balanța din societatea sursă #${sourceCompanyId}. Copiat ${copiedCount} conturi conforme.`,
      now
    );
  });

  tx();

  const updatedBatch = db.prepare('SELECT * FROM accounting_opening_batches WHERE id = ?').get(targetBatch.id) as OpeningBatch;
  return { success: true, copiedCount, batch: updatedBatch };
}

// =========================================================================
// 10. SERVICIU CONTABIL REUTILIZABIL PENTRU MODULELE VIITOARE
// =========================================================================

/**
 * Oferă datele de deschidere (solduri inițiale și totaluri precedente)
 * necesare motoarelor viitoare de Balanțe, Fișe de cont și Registre.
 */
export function getOpeningBalances(
  companyId: number,
  fiscalYear: number,
  _startPeriod?: number
): {
  batch: OpeningBatch | null;
  isValidated: boolean;
  balances: Map<string, {
    account_id: number;
    account_symbol: string;
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
    debit_final: number;
    credit_final: number;
  }>;
} {
  const batch = db.prepare(`
    SELECT * FROM accounting_opening_batches
    WHERE company_id = ? AND fiscal_year = ?
  `).get(companyId, fiscalYear) as OpeningBatch | undefined;

  const resultMap = new Map<string, any>();

  if (!batch) {
    return {
      batch: null,
      isValidated: false,
      balances: resultMap
    };
  }

  const lines = getOpeningBalanceLines(batch.id, companyId);
  for (const l of lines) {
    if (!l.is_synthetic_summary) {
      resultMap.set(l.account_symbol, {
        account_id: l.account_id,
        account_symbol: l.account_symbol,
        debit_initial: l.debit_initial,
        credit_initial: l.credit_initial,
        debit_prev: l.debit_prev,
        credit_prev: l.credit_prev,
        debit_final: l.debit_final,
        credit_final: l.credit_final
      });
    }
  }

  return {
    batch,
    isValidated: batch.status === 'VALIDATED',
    balances: resultMap
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
