import { db } from './db';
import { validateCUI } from './validators';

export interface AutoDescriptionConfig {
  includePartner: boolean;
  includeItem: boolean;
  includeDocNumber: boolean;
  includeDocDate: boolean;
}

export interface CompanyOperationalSettings {
  id: number;
  company_id: number;
  
  // 1. Contabilitate
  closing_mode: 'MONTHLY' | 'QUARTERLY';
  auto_desc_include_partner: number;
  auto_desc_include_item: number;
  auto_desc_include_doc_number: number;
  auto_desc_include_doc_date: number;
  inventory_price_diff_cumulative: number;
  inventory_price_diff_strategy: 'CUMULATIVE_YEAR_START' | 'MONTHLY_ISOLATED';
  
  // 2. Facturare și scadențe
  due_date_mode: 'CALENDAR' | 'WORKING_DAYS';
  delay_days_mode: 'CALENDAR' | 'WORKING_DAYS';
  vat_inclusive_calculation: number;
  default_payment_term_days: number;
  standard_vat_rate: number;
  
  // 3. Filiale și puncte de lucru
  has_branches: number;
  default_branch_index: string;
  
  // 4. Gestiuni și stocuri
  inventory_module_enabled: number;
  negative_stocks_policy: 'BLOCK' | 'ALLOW_WITH_PERMISSION';
  filter_items_by_warehouse: number;
  suggest_last_client_price: number;
  track_batches_and_expiry: number;
  cogs_accounting_date_mode: 'OPERATION_DATE' | 'MONTH_END';
  explicit_inter_warehouse_accounting: number;
  
  // 5. Producție
  production_long_cycle: number;
  production_variable_output: number;
  
  // 6. Rapoarte și afișare
  report_show_date: number;
  report_show_time: number;
  report_show_page_number: number;
  report_show_company_name: number;
  report_show_period: number;
  report_date_format: string;
  report_currency_precision: number;
  
  version: number;
  updated_at: string;
  updated_by: number | null;
}

export interface BranchLocation {
  id: number;
  company_id: number;
  internal_code: string;
  name: string;
  cui: string | null;
  branch_index: string;
  address: string;
  city: string;
  county: string;
  start_date: string;
  end_date: string | null;
  is_active: number;
  d112_separate_taxation: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettingsHistoryItem {
  id: number;
  company_id: number;
  setting_type: string;
  old_values: string | null;
  new_values: string | null;
  changed_by: number;
  changed_by_name: string;
  changed_at: string;
  version: number;
}

export interface WorkCalendarException {
  id: number;
  calendar_id: number;
  date: string;
  description: string;
  is_legal_holiday: number;
  is_working_day: number;
}

// =========================================================================
// 1. REUSABLE UTILITIES & EXACT ARITHMETIC ENGINES
// =========================================================================

/**
 * Construiește descrierea unui articol contabil pe baza șablonului configurat al societății
 */
export function buildAutoAccountingDescription(
  params: {
    partnerName?: string;
    itemName?: string;
    documentNumber?: string;
    documentDate?: string;
    operationType?: string;
  },
  config: AutoDescriptionConfig
): string {
  const parts: string[] = [];

  if (params.operationType) {
    parts.push(params.operationType);
  }

  if (config.includeDocNumber && params.documentNumber) {
    parts.push(`nr. ${params.documentNumber}`);
  }

  if (config.includeDocDate && params.documentDate) {
    parts.push(`din ${params.documentDate}`);
  }

  if (config.includePartner && params.partnerName) {
    parts.push(`- ${params.partnerName}`);
  }

  if (config.includeItem && params.itemName) {
    parts.push(`(${params.itemName})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'Articol contabil automat';
}

/**
 * Calcul scadență (due date): fie în zile calendaristice, fie în zile lucrătoare
 * Ține cont de weekend-uri și sărbători legale conform calendarului versionat
 */
export function calculateDueDate(
  issueDateStr: string,
  numberOfDays: number,
  calendarId?: number | null,
  mode: 'CALENDAR' | 'WORKING_DAYS' = 'CALENDAR',
  companyId?: number
): string {
  if (numberOfDays < 0) {
    throw new Error('Numărul de zile de scadență nu poate fi negativ.');
  }

  const issueDate = new Date(issueDateStr);
  if (isNaN(issueDate.getTime())) {
    throw new Error(`Data emiterii "${issueDateStr}" este invalidă.`);
  }

  if (numberOfDays === 0) {
    return issueDateStr.split('T')[0];
  }

  // Mod calendaristic standard
  if (mode === 'CALENDAR') {
    const target = new Date(issueDate);
    target.setDate(target.getDate() + numberOfDays);
    return target.toISOString().split('T')[0];
  }

  // Mod zile lucrătoare
  // Încărcăm excepțiile de sărbători legale pentru anii relevanți
  const year = issueDate.getFullYear();
  const holidaysSet = getHolidaysSet(year, companyId, calendarId);

  let currentDate = new Date(issueDate);
  let addedWorkingDays = 0;

  while (addedWorkingDays < numberOfDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const dateStr = currentDate.toISOString().split('T')[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaysSet.has(dateStr);

    if (!isWeekend && !isHoliday) {
      addedWorkingDays++;
    }
  }

  return currentDate.toISOString().split('T')[0];
}

/**
 * Calcul număr de zile de întârziere raportat la data scadenței
 */
export function calculateDelayDays(
  dueDateStr: string,
  referenceDateStr: string,
  mode: 'CALENDAR' | 'WORKING_DAYS' = 'CALENDAR',
  companyId?: number
): number {
  const dueDate = new Date(dueDateStr);
  const refDate = new Date(referenceDateStr);

  if (isNaN(dueDate.getTime()) || isNaN(refDate.getTime())) {
    throw new Error('Date invalide pentru calculul întârzierii.');
  }

  if (refDate <= dueDate) {
    return 0;
  }

  if (mode === 'CALENDAR') {
    const diffTime = refDate.getTime() - dueDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Mod zile lucrătoare
  const year = dueDate.getFullYear();
  const holidaysSet = getHolidaysSet(year, companyId);

  let current = new Date(dueDate);
  let delayedWorkingDays = 0;

  while (current < refDate) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaysSet.has(dateStr);

    if (!isWeekend && !isHoliday) {
      delayedWorkingDays++;
    }
  }

  return delayedWorkingDays;
}

/**
 * Extragere Net și TVA pornind de la prețul brut (inclusiv TVA) folosind aritmetică zecimală exactă
 * Previne erorile de rotunjire IEEE-754 în virgulă mobilă
 */
export function calculateFromGrossPrice(
  grossAmount: number,
  vatRatePercent: number,
  roundingDecimals: number = 2
): { netAmount: number; vatAmount: number; grossAmount: number; formulaUsed: string } {
  if (grossAmount < 0) {
    throw new Error('Valoarea brută a facturii nu poate fi negativă.');
  }
  if (vatRatePercent < 0 || vatRatePercent > 100) {
    throw new Error('Cota TVA trebuie să fie între 0% și 100%.');
  }

  const multiplier = Math.pow(10, roundingDecimals);

  // Folosim reprezentare în unități întregi (cenți/bani) pentru precizie
  // Bază = Brut / (1 + Cota/100) = (Brut * 100) / (100 + Cota)
  const factor = 100 + vatRatePercent;
  const netExact = (grossAmount * 100) / factor;
  const netRounded = Math.round((netExact + Number.EPSILON) * multiplier) / multiplier;

  // TVA se determină ca diferență directă pentru a garanta că Baza + TVA = Brut exact
  const vatExact = grossAmount - netRounded;
  const vatRounded = Math.round((vatExact + Number.EPSILON) * multiplier) / multiplier;

  // Verificare reconciliere exactă
  const reconciledGross = Math.round((netRounded + vatRounded + Number.EPSILON) * multiplier) / multiplier;

  return {
    netAmount: netRounded,
    vatAmount: vatRounded,
    grossAmount: reconciledGross,
    formulaUsed: `Bază = Brut * 100 / (100 + ${vatRatePercent}%), TVA = Brut - Bază (rotunjire la ${roundingDecimals} zecimale)`
  };
}

/**
 * Calcul coeficient K de repartizare a diferențelor de preț pentru gestiuni global-valorice (OMFP 1802)
 */
export function calculatePriceDifferenceCoefficient(
  params: {
    initialStockValue: number; // Si 371
    initialPriceDiff: number;  // Si 378
    incomingStockValue: number; // Rc 371
    incomingPriceDiff: number;  // Rc 378
  },
  strategy: 'CUMULATIVE_YEAR_START' | 'MONTHLY_ISOLATED' = 'CUMULATIVE_YEAR_START'
): { kCoefficient: number; formulaDescription: string; version: string } {
  const totalDiff = params.initialPriceDiff + params.incomingPriceDiff;
  const totalStock = params.initialStockValue + params.incomingStockValue;

  if (totalStock <= 0) {
    return {
      kCoefficient: 0,
      formulaDescription: 'Stoc total nul sau negativ (coeficient 0)',
      version: 'OMFP 1802/2014 v1.0',
    };
  }

  const k = totalDiff / totalStock;
  const kRounded = Math.round((k + Number.EPSILON) * 10000) / 10000; // 4 zecimale

  const desc = strategy === 'CUMULATIVE_YEAR_START'
    ? 'K = (Si378_an + Rc378_cumulat) / (Si371_an + Rc371_cumulat) — Metodă rulaje cumulate anuale'
    : 'K = (Si378_luna + Rc378_luna) / (Si371_luna + Rc371_luna) — Metodă izolată lunară';

  return {
    kCoefficient: kRounded,
    formulaDescription: desc,
    version: 'OMFP 1802/2014 v1.0',
  };
}

/**
 * Helper intern pentru preluarea sărbătorilor legale dintr-un an
 */
function getHolidaysSet(year: number, companyId?: number, calendarId?: number | null): Set<string> {
  const set = new Set<string>();

  let query = `
    SELECT e.date 
    FROM work_calendar_exceptions e
    JOIN work_calendars c ON e.calendar_id = c.id
    WHERE (c.year = ? OR c.year = ? + 1)
      AND e.is_working_day = 0
  `;
  const params: any[] = [year, year];

  if (calendarId) {
    query += ' AND c.id = ?';
    params.push(calendarId);
  } else if (companyId) {
    query += ' AND (c.company_id = ? OR c.company_id IS NULL)';
    params.push(companyId);
  } else {
    query += ' AND c.company_id IS NULL';
  }

  const rows = db.prepare(query).all(...params) as Array<{ date: string }>;
  for (const r of rows) {
    set.add(r.date);
  }

  return set;
}

// =========================================================================
// 2. SETĂRI OPERAȚIONALE CRUD & OPTIMISTIC LOCKING
// =========================================================================

export function getOperationalSettings(companyId: number): CompanyOperationalSettings {
  let settings = db
    .prepare('SELECT * FROM company_operational_settings WHERE company_id = ?')
    .get(companyId) as CompanyOperationalSettings | undefined;

  if (!settings) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO company_operational_settings (
        company_id, closing_mode, auto_desc_include_partner, auto_desc_include_item,
        auto_desc_include_doc_number, auto_desc_include_doc_date, inventory_price_diff_cumulative,
        inventory_price_diff_strategy, due_date_mode, delay_days_mode, vat_inclusive_calculation,
        default_payment_term_days, standard_vat_rate, has_branches, default_branch_index,
        inventory_module_enabled, negative_stocks_policy, filter_items_by_warehouse,
        suggest_last_client_price, track_batches_and_expiry, cogs_accounting_date_mode,
        explicit_inter_warehouse_accounting, production_long_cycle, production_variable_output,
        report_show_date, report_show_time, report_show_page_number, report_show_company_name,
        report_show_period, report_date_format, report_currency_precision, version, updated_at
      ) VALUES (
        ?, 'MONTHLY', 1, 1, 1, 1, 1, 'CUMULATIVE_YEAR_START', 'CALENDAR', 'CALENDAR', 0,
        30, 19.0, 0, 'A', 1, 'BLOCK', 0, 1, 0, 'OPERATION_DATE', 0, 0, 0,
        1, 1, 1, 1, 1, 'DD.MM.YYYY', 2, 1, ?
      )
    `).run(companyId, now);

    settings = db
      .prepare('SELECT * FROM company_operational_settings WHERE company_id = ?')
      .get(companyId) as CompanyOperationalSettings;
  }

  return settings;
}

export function updateOperationalSettings(
  companyId: number,
  input: Partial<CompanyOperationalSettings>,
  userId: number,
  userName?: string
): CompanyOperationalSettings {
  const current = getOperationalSettings(companyId);

  // Verificare Optimistic Locking
  if (input.version !== undefined && input.version !== current.version) {
    throw new Error(
      `Conflict de concurență (Optimistic Locking): Setările societății au fost modificate între timp de un alt utilizator (versiunea dvs: ${input.version}, versiunea din baza de date: ${current.version}). Vă rugăm să reîncărcați setările.`
    );
  }

  const now = new Date().toISOString();
  const newVersion = current.version + 1;

  const merged = {
    ...current,
    ...input,
    version: newVersion,
    updated_at: now,
    updated_by: userId,
  };

  const updateStmt = db.prepare(`
    UPDATE company_operational_settings SET
      closing_mode = ?,
      auto_desc_include_partner = ?,
      auto_desc_include_item = ?,
      auto_desc_include_doc_number = ?,
      auto_desc_include_doc_date = ?,
      inventory_price_diff_cumulative = ?,
      inventory_price_diff_strategy = ?,
      due_date_mode = ?,
      delay_days_mode = ?,
      vat_inclusive_calculation = ?,
      default_payment_term_days = ?,
      standard_vat_rate = ?,
      has_branches = ?,
      default_branch_index = ?,
      inventory_module_enabled = ?,
      negative_stocks_policy = ?,
      filter_items_by_warehouse = ?,
      suggest_last_client_price = ?,
      track_batches_and_expiry = ?,
      cogs_accounting_date_mode = ?,
      explicit_inter_warehouse_accounting = ?,
      production_long_cycle = ?,
      production_variable_output = ?,
      report_show_date = ?,
      report_show_time = ?,
      report_show_page_number = ?,
      report_show_company_name = ?,
      report_show_period = ?,
      report_date_format = ?,
      report_currency_precision = ?,
      version = ?,
      updated_at = ?,
      updated_by = ?
    WHERE company_id = ? AND version = ?
  `);

  const historyStmt = db.prepare(`
    INSERT INTO company_settings_history (
      company_id, setting_type, old_values, new_values, changed_by, changed_by_name, changed_at, version
    ) VALUES (?, 'OPERATIONAL_SETTINGS', ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    const result = updateStmt.run(
      merged.closing_mode,
      merged.auto_desc_include_partner ? 1 : 0,
      merged.auto_desc_include_item ? 1 : 0,
      merged.auto_desc_include_doc_number ? 1 : 0,
      merged.auto_desc_include_doc_date ? 1 : 0,
      merged.inventory_price_diff_cumulative ? 1 : 0,
      merged.inventory_price_diff_strategy,
      merged.due_date_mode,
      merged.delay_days_mode,
      merged.vat_inclusive_calculation ? 1 : 0,
      merged.default_payment_term_days,
      merged.standard_vat_rate,
      merged.has_branches ? 1 : 0,
      merged.default_branch_index,
      merged.inventory_module_enabled ? 1 : 0,
      merged.negative_stocks_policy,
      merged.filter_items_by_warehouse ? 1 : 0,
      merged.suggest_last_client_price ? 1 : 0,
      merged.track_batches_and_expiry ? 1 : 0,
      merged.cogs_accounting_date_mode,
      merged.explicit_inter_warehouse_accounting ? 1 : 0,
      merged.production_long_cycle ? 1 : 0,
      merged.production_variable_output ? 1 : 0,
      merged.report_show_date ? 1 : 0,
      merged.report_show_time ? 1 : 0,
      merged.report_show_page_number ? 1 : 0,
      merged.report_show_company_name ? 1 : 0,
      merged.report_show_period ? 1 : 0,
      merged.report_date_format,
      merged.report_currency_precision,
      newVersion,
      now,
      userId,
      companyId,
      current.version
    );

    if (result.changes === 0) {
      throw new Error('Conflict de salvare concurentă: versiunea a fost deja modificată de altcineva.');
    }

    historyStmt.run(
      companyId,
      JSON.stringify(current),
      JSON.stringify(merged),
      userId,
      userName || 'Utilizator',
      now,
      newVersion
    );
  });

  tx();

  return getOperationalSettings(companyId);
}

// =========================================================================
// 3. FILIALE ȘI PUNCTE DE LUCRU CRUD
// =========================================================================

export function getBranchLocations(companyId: number): BranchLocation[] {
  return db
    .prepare('SELECT * FROM branch_locations WHERE company_id = ? ORDER BY internal_code ASC')
    .all(companyId) as BranchLocation[];
}

export function createBranchLocation(
  companyId: number,
  data: {
    internal_code: string;
    name: string;
    cui?: string | null;
    branch_index: string;
    address: string;
    city: string;
    county: string;
    start_date: string;
    end_date?: string | null;
    d112_separate_taxation?: boolean;
    notes?: string;
  },
  userId: number,
  userName?: string
): BranchLocation {
  const code = data.internal_code ? data.internal_code.trim().toUpperCase() : '';
  const name = data.name ? data.name.trim() : '';
  const branchIdx = data.branch_index ? data.branch_index.trim().toUpperCase() : 'A';

  if (!code) throw new Error('Codul intern al filialei este obligatoriu.');
  if (!name || name.length < 3) throw new Error('Denumirea filialei trebuie să aibă minim 3 caractere.');
  if (branchIdx.length !== 1 || !/^[A-Z0-9]$/.test(branchIdx)) {
    throw new Error('Indicele de filială trebuie să fie exact un caracter (o literă de la A-Z sau o cifră de la 0-9).');
  }

  // Validare CUI secundar dacă este specificat
  let cleanCui: string | null = null;
  if (data.cui && data.cui.trim()) {
    const cuiCheck = validateCUI(data.cui);
    if (!cuiCheck.isValid) {
      throw new Error(`CUI filială invalid: ${cuiCheck.message}`);
    }
    cleanCui = cuiCheck.normalized!;
  }

  // Verificare unicitate cod și indice în cadrul societății
  const existingCode = db
    .prepare('SELECT id FROM branch_locations WHERE company_id = ? AND internal_code = ?')
    .get(companyId, code);
  if (existingCode) {
    throw new Error(`Codul de filială "${code}" este deja utilizat în această societate.`);
  }

  const existingIdx = db
    .prepare('SELECT id FROM branch_locations WHERE company_id = ? AND branch_index = ?')
    .get(companyId, branchIdx);
  if (existingIdx) {
    throw new Error(`Indicele de filială "${branchIdx}" este deja alocat unui alt punct de lucru în această societate.`);
  }

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO branch_locations (
      company_id, internal_code, name, cui, branch_index, address, city, county,
      start_date, end_date, is_active, d112_separate_taxation, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `);

  const info = insert.run(
    companyId,
    code,
    name,
    cleanCui,
    branchIdx,
    data.address ? data.address.trim() : '',
    data.city ? data.city.trim() : '',
    data.county ? data.county.trim() : '',
    data.start_date || now.split('T')[0],
    data.end_date || null,
    data.d112_separate_taxation ? 1 : 0,
    data.notes || '',
    now,
    now
  );

  const createdId = Number(info.lastInsertRowid);

  // Activare automată has_branches pe societate
  db.prepare('UPDATE company_operational_settings SET has_branches = 1 WHERE company_id = ?').run(companyId);

  // Istoric
  db.prepare(`
    INSERT INTO company_settings_history (
      company_id, setting_type, old_values, new_values, changed_by, changed_by_name, changed_at, version
    ) VALUES (?, 'BRANCH_CREATE', NULL, ?, ?, ?, ?, 1)
  `).run(companyId, JSON.stringify({ id: createdId, code, name }), userId, userName || 'Utilizator', now);

  return db.prepare('SELECT * FROM branch_locations WHERE id = ?').get(createdId) as BranchLocation;
}

export function updateBranchLocation(
  companyId: number,
  branchId: number,
  data: Partial<BranchLocation>,
  userId: number,
  userName?: string
): BranchLocation {
  const current = db
    .prepare('SELECT * FROM branch_locations WHERE company_id = ? AND id = ?')
    .get(companyId, branchId) as BranchLocation | undefined;

  if (!current) {
    throw new Error('Punctul de lucru specificat nu a fost găsit în această societate.');
  }

  const now = new Date().toISOString();
  const newName = data.name !== undefined ? data.name.trim() : current.name;
  const newActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active;
  const newD112 = data.d112_separate_taxation !== undefined ? (data.d112_separate_taxation ? 1 : 0) : current.d112_separate_taxation;

  db.prepare(`
    UPDATE branch_locations SET
      name = ?,
      address = ?,
      city = ?,
      county = ?,
      is_active = ?,
      d112_separate_taxation = ?,
      notes = ?,
      updated_at = ?
    WHERE company_id = ? AND id = ?
  `).run(
    newName,
    data.address !== undefined ? data.address.trim() : current.address,
    data.city !== undefined ? data.city.trim() : current.city,
    data.county !== undefined ? data.county.trim() : current.county,
    newActive,
    newD112,
    data.notes !== undefined ? data.notes : current.notes,
    now,
    companyId,
    branchId
  );

  db.prepare(`
    INSERT INTO company_settings_history (
      company_id, setting_type, old_values, new_values, changed_by, changed_by_name, changed_at, version
    ) VALUES (?, 'BRANCH_UPDATE', ?, ?, ?, ?, ?, 1)
  `).run(companyId, JSON.stringify(current), JSON.stringify({ id: branchId, name: newName }), userId, userName || 'Utilizator', now);

  return db.prepare('SELECT * FROM branch_locations WHERE id = ?').get(branchId) as BranchLocation;
}

export function deleteBranchLocation(
  companyId: number,
  branchId: number,
  userId: number,
  userName?: string
): { success: boolean } {
  const current = db
    .prepare('SELECT * FROM branch_locations WHERE company_id = ? AND id = ?')
    .get(companyId, branchId) as BranchLocation | undefined;

  if (!current) {
    throw new Error('Punctul de lucru nu există.');
  }

  const now = new Date().toISOString();
  db.prepare('DELETE FROM branch_locations WHERE company_id = ? AND id = ?').run(companyId, branchId);

  // Istoric
  db.prepare(`
    INSERT INTO company_settings_history (
      company_id, setting_type, old_values, new_values, changed_by, changed_by_name, changed_at, version
    ) VALUES (?, 'BRANCH_DELETE', ?, NULL, ?, ?, ?, 1)
  `).run(companyId, JSON.stringify(current), userId, userName || 'Utilizator', now);

  return { success: true };
}

// =========================================================================
// 4. ISTORIC SETĂRI DIVERSE
// =========================================================================

export function getCompanySettingsHistory(companyId: number): CompanySettingsHistoryItem[] {
  return db
    .prepare('SELECT * FROM company_settings_history WHERE company_id = ? ORDER BY id DESC LIMIT 50')
    .all(companyId) as CompanySettingsHistoryItem[];
}
