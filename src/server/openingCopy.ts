/**
 * Preluarea balanței de pornire din altă societate a aplicației.
 *
 * Modulul reia fluxul importului de fișier, dar sursa rândurilor este balanța
 * validată a unei alte societăți:
 * - previzualizarea validează lotul destinație, lotul sursă (validat, aceeași
 *   perioadă/tip de preluare) și maparea conturilor pe simbol în planul de
 *   conturi al societății destinație;
 * - salvarea reia integral previzualizarea, apoi, într-o singură tranzacție,
 *   înregistrează importul de tip COMPANY_COPY și înlocuiește liniile lotului.
 * Soldurile terților (clienți/furnizori) nu se copiază.
 */

import crypto from 'crypto';
import { db } from './db';
import { fromBani, toBani } from './money';
import { getOpeningBalanceLines } from './openingBalance';
import { BatchStatus, BatchType } from './openingBalance';
import { FileImportDuplicate, ImportError } from './openingImport';

// =========================================================================
// 1. TIPURI
// =========================================================================

/** Datele primite de la client pentru preluarea balanței din altă societate. */
export type CompanyCopyPayload = {
  target_batch_id: number;
  source_company_id: number;
  version?: number;
  confirm_replace?: boolean;
  confirm_reimport?: boolean;
};

export type CompanyCopyRowStatus = 'OK' | 'ERROR';

/** Un rând preluat din balanța sursă, mapat pe planul de conturi destinație. */
export type CompanyCopyRow = {
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
  status: CompanyCopyRowStatus;
  messages: string[];
};

/** Societatea și lotul din care se preiau soldurile. */
export type CompanyCopySource = {
  company_id: number;
  name: string;
  cui: string;
  fiscal_year: number;
  batch_id: number;
  integrity_hash: string | null;
  validated_at: string | null;
};

export type CompanyCopyPreview = {
  source: CompanyCopySource;
  rows: CompanyCopyRow[];
  errors: string[];
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

/** Rezultatul salvării preluării în balanța de pornire. */
export type CompanyCopyCommitResult = {
  success: true;
  import_id: number;
  batch: any;
  note: string;
};

/** Lotul de preluare, redus la câmpurile necesare validării copierii. */
type CopyBatchRow = {
  id: number;
  company_id: number;
  fiscal_year: number;
  start_month: number;
  batch_type: BatchType;
  status: BatchStatus;
  setup_completed: number;
  integrity_hash: string | null;
  validated_at: string | null;
  version: number;
};

/** Cont contabil din planul de conturi al societății destinație. */
type CopyCompanyAccount = {
  id: number;
  symbol: string;
  name: string;
  is_active: number;
  parent_id: number | null;
};

// =========================================================================
// 2. DREPTURI DE ACCES PENTRU PRELUAREA ÎNTRE SOCIETĂȚI
// =========================================================================

/** Utilizatorul este administrator global sau administrator al societății date. */
function isCompanyAdmin(userId: number, companyId: number): boolean {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(userId) as
    | { role: string }
    | undefined;

  if (user && user.role === 'ADMIN') return true;

  const access = db.prepare(`
    SELECT role FROM user_company_access
    WHERE user_id = ? AND company_id = ?
  `).get(userId, companyId) as { role: string } | undefined;

  return !!access && access.role === 'ADMIN';
}

// =========================================================================
// 3. PREVIZUALIZAREA PRELUĂRII DIN ALTĂ SOCIETATE
// =========================================================================

/**
 * Previzualizează preluarea soldurilor din balanța validată a altei societăți:
 * validează lotul destinație și lotul sursă, mapează conturile pe simbol în
 * planul de conturi al destinației, calculează totalurile în bani, amprenta de
 * conținut și semnalează preluările duplicate.
 */
export function previewCompanyCopy(
  targetCompanyId: number,
  payload: CompanyCopyPayload
): CompanyCopyPreview {
  const sourceCompanyId = Number(payload.source_company_id);

  if (sourceCompanyId === targetCompanyId) {
    throw new ImportError('Sursa și destinația trebuie să fie societăți diferite.', 'VALIDATION');
  }

  const targetBatch = db.prepare(`
    SELECT id, company_id, fiscal_year, start_month, batch_type, status,
           setup_completed, integrity_hash, validated_at, version
    FROM accounting_opening_batches
    WHERE id = ? AND company_id = ?
  `).get(payload.target_batch_id, targetCompanyId) as CopyBatchRow | undefined;

  if (!targetBatch) {
    throw new ImportError('Lotul de preluare a balanței nu există.', 'VALIDATION');
  }
  if (targetBatch.status === 'VALIDATED') {
    throw new ImportError('Balanța este validată.', 'CONFLICT');
  }
  if (!targetBatch.setup_completed) {
    throw new ImportError('Alegeți întâi tipul preluării.', 'VALIDATION');
  }

  // Lotul sursă: aceeași societate sursă, același an fiscal ca destinația
  const sourceBatch = db.prepare(`
    SELECT id, company_id, fiscal_year, start_month, batch_type, status,
           setup_completed, integrity_hash, validated_at, version
    FROM accounting_opening_batches
    WHERE company_id = ? AND fiscal_year = ?
  `).get(sourceCompanyId, targetBatch.fiscal_year) as CopyBatchRow | undefined;

  if (!sourceBatch) {
    throw new ImportError(
      `Societatea sursă nu are balanță de pornire pentru ${targetBatch.fiscal_year}.`,
      'VALIDATION'
    );
  }
  if (sourceBatch.status !== 'VALIDATED') {
    throw new ImportError(
      'Balanța sursă nu este validată. Se pot prelua doar date validate.',
      'VALIDATION'
    );
  }
  if (
    sourceBatch.batch_type !== targetBatch.batch_type ||
    sourceBatch.start_month !== targetBatch.start_month
  ) {
    throw new ImportError(
      `Perioada/tipul preluării diferă: sursa ${sourceBatch.batch_type}/luna ${sourceBatch.start_month}, destinația ${targetBatch.batch_type}/luna ${targetBatch.start_month}.`,
      'VALIDATION'
    );
  }

  const sourceCompany = db.prepare('SELECT id, name, cui FROM companies WHERE id = ?').get(
    sourceCompanyId
  ) as { id: number; name: string; cui: string } | undefined;

  const source: CompanyCopySource = {
    company_id: sourceCompanyId,
    name: sourceCompany ? sourceCompany.name : '',
    cui: sourceCompany ? sourceCompany.cui : '',
    fiscal_year: sourceBatch.fiscal_year,
    batch_id: sourceBatch.id,
    integrity_hash: sourceBatch.integrity_hash ?? null,
    validated_at: sourceBatch.validated_at ?? null
  };

  // Planul de conturi al societății destinație
  const targetAccounts = db.prepare(`
    SELECT id, symbol, name, is_active, parent_id
    FROM accounting_accounts
    WHERE company_id = ?
  `).all(targetCompanyId) as CopyCompanyAccount[];

  const accountsBySymbol = new Map<string, CopyCompanyAccount>();
  for (const account of targetAccounts) {
    const symbol = account.symbol.trim();
    if (!accountsBySymbol.has(symbol)) accountsBySymbol.set(symbol, account);
  }

  // Conturile care au analitice active în planul destinației
  const accountsWithActiveAnalytics = new Set<number>();
  for (const account of targetAccounts) {
    if (account.parent_id !== null && account.is_active === 1) {
      accountsWithActiveAnalytics.add(account.parent_id);
    }
  }

  // Rândurile sursă: linii de cont cu solduri, fără rândurile sintetice de total
  const sourceLines = getOpeningBalanceLines(sourceBatch.id, sourceCompanyId);

  // Sursa cursului valutar nu vine în liniile citite, deci se ia direct din lotul sursă
  const sourceRateSources = new Map<number, string>();
  const sourceRateRows = db.prepare(`
    SELECT account_id, exchange_rate_source
    FROM accounting_opening_balance_lines
    WHERE batch_id = ?
  `).all(sourceBatch.id) as { account_id: number; exchange_rate_source: string | null }[];

  for (const sourceRateRow of sourceRateRows) {
    sourceRateSources.set(sourceRateRow.account_id, sourceRateRow.exchange_rate_source || '');
  }

  const errors: string[] = [];
  const rows: CompanyCopyRow[] = [];

  for (const line of sourceLines) {
    if (line.is_synthetic_summary) continue;

    const debitInitialBani = toBani(line.debit_initial);
    const creditInitialBani = toBani(line.credit_initial);
    const debitPrevBani = toBani(line.debit_prev);
    const creditPrevBani = toBani(line.credit_prev);
    const currencyAmountBani = toBani(line.currency_amount);

    if (
      debitInitialBani === 0 &&
      creditInitialBani === 0 &&
      debitPrevBani === 0 &&
      creditPrevBani === 0 &&
      currencyAmountBani === 0
    ) {
      continue;
    }

    const symbol = line.account_symbol.trim();
    const targetAccount = accountsBySymbol.get(symbol) ?? null;
    const messages: string[] = [];

    if (!targetAccount) {
      messages.push(`Contul ${symbol} nu există în societatea destinație.`);
    } else if (targetAccount.is_active !== 1) {
      messages.push(`Contul ${symbol} este inactiv în societatea destinație.`);
    } else if (accountsWithActiveAnalytics.has(targetAccount.id)) {
      messages.push(`Contul ${symbol} are analitice în destinație.`);
    }

    rows.push({
      symbol,
      name: line.account_name,
      source_account_id: line.account_id,
      target_account_id: targetAccount ? targetAccount.id : null,
      debit_initial: fromBani(debitInitialBani),
      credit_initial: fromBani(creditInitialBani),
      debit_prev: fromBani(debitPrevBani),
      credit_prev: fromBani(creditPrevBani),
      currency: line.currency,
      currency_amount: fromBani(currencyAmountBani),
      exchange_rate: line.exchange_rate || 1.0,
      exchange_rate_date: line.exchange_rate_date ?? null,
      exchange_rate_source: sourceRateSources.get(line.account_id) ?? '',
      status: messages.length > 0 ? 'ERROR' : 'OK',
      messages
    });
  }

  if (rows.length === 0) {
    errors.push('Balanța sursă nu are solduri de preluat.');
  }

  // Totaluri și verificarea echilibrului (toate calculele se fac în bani)
  let totalDebitInitialBani = 0;
  let totalCreditInitialBani = 0;
  let totalDebitPrevBani = 0;
  let totalCreditPrevBani = 0;

  for (const row of rows) {
    if (row.status !== 'OK') continue;
    totalDebitInitialBani += toBani(row.debit_initial);
    totalCreditInitialBani += toBani(row.credit_initial);
    totalDebitPrevBani += toBani(row.debit_prev);
    totalCreditPrevBani += toBani(row.credit_prev);
  }

  const isBalanced =
    totalDebitInitialBani === totalCreditInitialBani &&
    totalDebitPrevBani === totalCreditPrevBani;

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
    errors.push(`Balanța preluată nu este echilibrată: ${parts.join('; ')}.`);
  }

  // Amprenta de conținut a rândurilor care se preiau
  const hashPayload = rows
    .filter(row => row.status === 'OK')
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

  // Preluare deja commitată cu aceeași amprentă
  const duplicate = db.prepare(`
    SELECT id, created_at, user_name
    FROM accounting_opening_imports
    WHERE batch_id = ? AND content_hash = ? AND status = 'COMMITTED'
    ORDER BY id ASC
    LIMIT 1
  `).get(targetBatch.id, contentHash) as FileImportDuplicate | undefined;

  // Linii existente în lotul destinație, cu cel puțin o valoare nenulă
  const existingLines = db.prepare(`
    SELECT COUNT(*) AS line_count
    FROM accounting_opening_balance_lines
    WHERE batch_id = ?
      AND (debit_initial != 0 OR credit_initial != 0 OR debit_prev != 0 OR credit_prev != 0)
  `).get(targetBatch.id) as { line_count: number };

  // Preluarea poate fi confirmată doar fără erori blocante
  const canCommit = errors.length === 0 && !rows.some(row => row.status === 'ERROR');

  return {
    source,
    rows,
    errors,
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
// 4. SALVAREA PRELUĂRII ÎN BALANȚA DE PORNIRE
// =========================================================================

/**
 * Salvează în balanța de pornire rândurile valide preluate din altă societate.
 *
 * Se reia integral previzualizarea (aceleași validări ca la pasul anterior), apoi,
 * într-o singură tranzacție: importurile anterioare cu altă amprentă devin istorice
 * (SUPERSEDED), se înregistrează preluarea curentă, liniile lotului sunt înlocuite
 * cu rândurile valide din societatea sursă, totalurile lotului sunt recalculate,
 * iar versiunea lotului este incrementată. Soldurile terților nu sunt atinse.
 */
export function commitCompanyCopy(
  targetCompanyId: number,
  payload: CompanyCopyPayload,
  userId: number,
  userName: string
): CompanyCopyCommitResult {
  // 1. Preluarea între societăți cere drept de administrare pe ambele societăți
  const sourceCompanyId = Number(payload.source_company_id);

  if (!isCompanyAdmin(userId, targetCompanyId) || !isCompanyAdmin(userId, sourceCompanyId)) {
    throw new ImportError(
      'Preluarea din altă societate necesită drept de administrare pe ambele societăți.',
      'FORBIDDEN'
    );
  }

  // 2. Aceleași validări ca la previzualizare
  const preview = previewCompanyCopy(targetCompanyId, payload);

  if (!preview.can_commit) {
    throw new ImportError('Preluarea conține erori; nu s-a salvat nimic.', 'VALIDATION');
  }

  const batch = db.prepare(`
    SELECT id, company_id, fiscal_year, status, version
    FROM accounting_opening_batches
    WHERE id = ? AND company_id = ?
  `).get(payload.target_batch_id, targetCompanyId) as
    | { id: number; company_id: number; fiscal_year: number; status: BatchStatus; version: number }
    | undefined;

  if (!batch) {
    throw new ImportError('Lotul de preluare a balanței nu există.', 'VALIDATION');
  }

  // 3. Blocare optimistă: versiunea din payload este obligatorie și trebuie să
  // corespundă versiunii lotului (lotul nu trebuie să fi fost modificat între timp)
  if (payload.version === undefined || payload.version !== batch.version) {
    throw new ImportError('Balanța a fost modificată între timp. Reîncărcați.', 'CONFLICT');
  }

  // 4. Confirmări explicite pentru reimport și pentru înlocuirea soldurilor existente
  if (preview.duplicate_of && !payload.confirm_reimport) {
    throw new ImportError(
      `Același conținut a fost deja preluat la ${preview.duplicate_of.created_at} de ${preview.duplicate_of.user_name || 'utilizator necunoscut'}. Confirmați reimportul (valorile se înlocuiesc, nu se adună).`,
      'CONFIRMATION_REQUIRED'
    );
  }

  if (preview.existing_lines_count > 0 && !payload.confirm_replace) {
    throw new ImportError(
      `Balanța conține deja ${preview.existing_lines_count} conturi cu solduri. Confirmați înlocuirea lor cu valorile preluate.`,
      'CONFIRMATION_REQUIRED'
    );
  }

  const rowsToCopy = preview.rows.filter(row => row.status === 'OK');
  const fileName = `Copie din ${preview.source.name} (${preview.source.cui}) / ${preview.source.fiscal_year}`;
  const now = new Date().toISOString();

  let importId = 0;

  const tx = db.transaction(() => {
    // 5. Importurile anterioare cu altă amprentă de conținut devin istorice
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
          source_company_id, row_count, total_debit_initial, total_credit_initial,
          total_debit_prev, total_credit_prev, status, user_id, user_name, created_at, updated_at
        ) VALUES (?, ?, ?, 'COMPANY_COPY', ?, ?, ?, ?, ?, ?, ?, ?, 'COMMITTED', ?, ?, ?, ?)
      `).run(
        targetCompanyId,
        batch.id,
        batch.fiscal_year,
        fileName,
        preview.content_hash,
        preview.source.company_id,
        rowsToCopy.length,
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

    // 6. Liniile lotului sunt înlocuite cu valorile preluate din sursă
    db.prepare('DELETE FROM accounting_opening_balance_lines WHERE batch_id = ?').run(batch.id);

    const insertStmt = db.prepare(`
      INSERT INTO accounting_opening_balance_lines (
        batch_id, account_id, account_symbol, debit_initial, credit_initial,
        debit_prev, credit_prev, currency, currency_amount, exchange_rate,
        exchange_rate_date, exchange_rate_source,
        notes, value_source, source_import_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', 'COPY', ?, ?, ?)
    `);

    for (const row of rowsToCopy) {
      insertStmt.run(
        batch.id,
        row.target_account_id,
        row.symbol,
        row.debit_initial,
        row.credit_initial,
        row.debit_prev,
        row.credit_prev,
        row.currency,
        row.currency_amount,
        row.exchange_rate,
        row.exchange_rate_date,
        row.exchange_rate_source,
        importId,
        now,
        now
      );
    }

    // 7. Totalurile lotului se aliniază cu valorile preluate
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

    // 8. Urmă de audit pentru preluare
    const details = JSON.stringify({
      source_company_id: preview.source.company_id,
      source_batch_id: preview.source.batch_id,
      source_integrity_hash: preview.source.integrity_hash,
      rows: rowsToCopy.length
    });

    db.prepare(`
      INSERT INTO accounting_opening_validation_logs (
        batch_id, action, user_id, user_name, reason, details, created_at
      ) VALUES (?, 'COPY_COMPANY', ?, ?, 'Preluare balanță din altă societate', ?, ?)
    `).run(batch.id, userId || null, userName || 'Sistem', details, now);
  });

  tx();

  const updatedBatch = db
    .prepare('SELECT * FROM accounting_opening_batches WHERE id = ?')
    .get(batch.id);

  return {
    success: true,
    import_id: importId,
    batch: updatedBatch,
    note: 'Soldurile terților (clienți și furnizori) nu se copiază; acestea se completează separat în societatea destinație.'
  };
}
