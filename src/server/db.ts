import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(DATA_DIR, 'contabilitate.db');
// Directorul părinte al bazei de date poate fi suprascris prin DB_PATH (ex: medii de test)
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
export const db = new Database(DB_PATH);

// Activare mod WAL pentru concurență și blocare rapidă
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function hashPassword(password: string): string {
  const salt = 'contabilitate_ro_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

/**
 * Adaugă o coloană doar dacă nu există deja (migrație idempotentă pe DB existente).
 * SQLite nu permite DEFAULT non-constant (CURRENT_TIMESTAMP) la ADD COLUMN,
 * deci definiția trebuie să folosească doar valori implicite literale.
 */
function ensureColumn(table: string, column: string, definition: string): void {
  const columns = db.pragma(`table_info(${table})`) as Array<{ name: string }>;
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

/**
 * Inițializare schemă relațională și migrații
 */
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ACCOUNTANT',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      internal_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      cui TEXT UNIQUE NOT NULL,
      fiscal_attribute TEXT,
      reg_com TEXT,
      accounting_type TEXT NOT NULL DEFAULT 'COMMERCIAL',
      caen_code TEXT,
      share_capital REAL NOT NULL DEFAULT 200.0,
      currency TEXT NOT NULL DEFAULT 'RON',
      start_date TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      version INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'HEADQUARTERS',
      country TEXT NOT NULL DEFAULT 'România',
      county TEXT NOT NULL,
      city TEXT NOT NULL,
      sector TEXT,
      postal_code TEXT,
      street TEXT NOT NULL,
      number TEXT NOT NULL,
      building TEXT,
      staircase TEXT,
      floor TEXT,
      apartment TEXT,
      phone TEXT,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS company_bank_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      bank_name TEXT NOT NULL,
      iban TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RON',
      holder_name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(company_id, iban)
    );

    CREATE TABLE IF NOT EXISTS company_fiscal_regimes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_vat_payer INTEGER NOT NULL DEFAULT 1,
      vat_periodicity TEXT DEFAULT 'MONTHLY',
      vat_on_collection INTEGER NOT NULL DEFAULT 0,
      taxation_type TEXT NOT NULL DEFAULT 'MICRO',
      fiscal_period TEXT DEFAULT 'ANNUAL',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      manages_inventory INTEGER NOT NULL DEFAULT 1,
      inventory_evaluation_method TEXT NOT NULL DEFAULT 'FIFO',
      inventory_type TEXT NOT NULL DEFAULT 'PERMANENT',
      document_series_config TEXT DEFAULT '{}',
      display_preferences TEXT DEFAULT '{}',
      internal_notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS user_company_access (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      granted_at TEXT NOT NULL,
      UNIQUE(user_id, company_id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      old_values TEXT,
      new_values TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS caen_codes (
      code TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT 'Rev.2',
      valid_from TEXT NOT NULL DEFAULT '2008-01-01',
      valid_to TEXT
    );

    -- ========================================================
    -- ETAPA 2: PLAN DE CONTURI & CONTURI AUTOMATE
    -- ========================================================

    -- Catalog oficial Plan General de Conturi OMFP 1802/2014
    CREATE TABLE IF NOT EXISTS official_chart_of_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'SYNTHETIC', -- 'SYNTHETIC' | 'ANALYTIC'
      parent_symbol TEXT,
      nature TEXT NOT NULL, -- 'A' (Activ), 'P' (Pasiv), 'B' (Bifuncțional)
      version TEXT NOT NULL DEFAULT 'OMFP 1802/2014',
      valid_from TEXT NOT NULL DEFAULT '2015-01-01',
      valid_to TEXT,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    -- Plan de conturi specific per societate
    CREATE TABLE IF NOT EXISTS accounting_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'SYNTHETIC', -- 'SYNTHETIC' | 'ANALYTIC'
      parent_id INTEGER REFERENCES accounting_accounts(id) ON DELETE RESTRICT,
      nature TEXT NOT NULL DEFAULT 'A', -- 'A' | 'P' | 'B'
      allow_direct_entry INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(company_id, symbol)
    );

    -- Configurare conturi automate per societate
    CREATE TABLE IF NOT EXISTS automatic_account_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category TEXT NOT NULL, -- 'CASA_BANCA' | 'DECONTURI' | 'CLIENTI_FURNIZORI' | 'TVA' | 'INCHIDERE_REZULTAT' | 'COMPENSARE'
      setting_key TEXT NOT NULL,
      account_id INTEGER REFERENCES accounting_accounts(id) ON DELETE SET NULL,
      label TEXT NOT NULL,
      description TEXT,
      default_symbol TEXT,
      is_required INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id),
      UNIQUE(company_id, setting_key)
    );

    -- Istoric modificări conturi automate pentru trasabilitate și audit
    CREATE TABLE IF NOT EXISTS automatic_account_setting_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      setting_key TEXT NOT NULL,
      category TEXT NOT NULL,
      old_account_id INTEGER,
      new_account_id INTEGER,
      old_account_symbol TEXT,
      new_account_symbol TEXT,
      old_account_name TEXT,
      new_account_name TEXT,
      changed_by INTEGER REFERENCES users(id),
      changed_by_name TEXT,
      changed_at TEXT NOT NULL,
      notes TEXT
    );

    -- ========================================================
    -- ETAPA 3: SETĂRI DIVERSE & CONFIGURĂRI OPERAȚIONALE
    -- ========================================================

    -- Setări operaționale societate (6 categorii)
    CREATE TABLE IF NOT EXISTS company_operational_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER UNIQUE NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      
      -- 1. Contabilitate
      closing_mode TEXT NOT NULL DEFAULT 'MONTHLY', -- 'MONTHLY' | 'QUARTERLY'
      auto_desc_include_partner INTEGER NOT NULL DEFAULT 1,
      auto_desc_include_item INTEGER NOT NULL DEFAULT 1,
      auto_desc_include_doc_number INTEGER NOT NULL DEFAULT 1,
      auto_desc_include_doc_date INTEGER NOT NULL DEFAULT 1,
      inventory_price_diff_cumulative INTEGER NOT NULL DEFAULT 1,
      inventory_price_diff_strategy TEXT NOT NULL DEFAULT 'CUMULATIVE_YEAR_START', -- 'CUMULATIVE_YEAR_START' | 'MONTHLY_ISOLATED'
      
      -- 2. Facturare și scadențe
      due_date_mode TEXT NOT NULL DEFAULT 'CALENDAR', -- 'CALENDAR' | 'WORKING_DAYS'
      delay_days_mode TEXT NOT NULL DEFAULT 'CALENDAR', -- 'CALENDAR' | 'WORKING_DAYS'
      vat_inclusive_calculation INTEGER NOT NULL DEFAULT 0,
      default_payment_term_days INTEGER NOT NULL DEFAULT 30,
      standard_vat_rate REAL NOT NULL DEFAULT 19.0,
      
      -- 3. Filiale și puncte de lucru
      has_branches INTEGER NOT NULL DEFAULT 0,
      default_branch_index TEXT DEFAULT 'A',
      
      -- 4. Gestiuni și stocuri
      inventory_module_enabled INTEGER NOT NULL DEFAULT 1,
      negative_stocks_policy TEXT NOT NULL DEFAULT 'BLOCK', -- 'BLOCK' | 'ALLOW_WITH_PERMISSION'
      filter_items_by_warehouse INTEGER NOT NULL DEFAULT 0,
      suggest_last_client_price INTEGER NOT NULL DEFAULT 1,
      track_batches_and_expiry INTEGER NOT NULL DEFAULT 0,
      cogs_accounting_date_mode TEXT NOT NULL DEFAULT 'OPERATION_DATE', -- 'OPERATION_DATE' | 'MONTH_END'
      explicit_inter_warehouse_accounting INTEGER NOT NULL DEFAULT 0,
      
      -- 5. Producție
      production_long_cycle INTEGER NOT NULL DEFAULT 0,
      production_variable_output INTEGER NOT NULL DEFAULT 0,
      
      -- 6. Rapoarte și afișare
      report_show_date INTEGER NOT NULL DEFAULT 1,
      report_show_time INTEGER NOT NULL DEFAULT 1,
      report_show_page_number INTEGER NOT NULL DEFAULT 1,
      report_show_company_name INTEGER NOT NULL DEFAULT 1,
      report_show_period INTEGER NOT NULL DEFAULT 1,
      report_date_format TEXT NOT NULL DEFAULT 'DD.MM.YYYY', -- 'DD.MM.YYYY' | 'YYYY-MM-DD'
      report_currency_precision INTEGER NOT NULL DEFAULT 2,
      
      version INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      updated_by INTEGER REFERENCES users(id)
    );

    -- Filiale și puncte de lucru
    CREATE TABLE IF NOT EXISTS branch_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      internal_code TEXT NOT NULL,
      name TEXT NOT NULL,
      cui TEXT,
      branch_index TEXT NOT NULL DEFAULT 'A',
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      county TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      d112_separate_taxation INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(company_id, internal_code),
      UNIQUE(company_id, branch_index)
    );

    -- Calendare de lucru per societate sau calendar național (company_id NULL)
    CREATE TABLE IF NOT EXISTS work_calendars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      year INTEGER NOT NULL,
      weekend_days TEXT NOT NULL DEFAULT '[0, 6]', -- JSON array: 0=Duminică, 6=Sâmbătă
      is_default INTEGER NOT NULL DEFAULT 1,
      UNIQUE(company_id, year)
    );

    -- Zile libere legale și excepții calendaristice
    CREATE TABLE IF NOT EXISTS work_calendar_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      calendar_id INTEGER NOT NULL REFERENCES work_calendars(id) ON DELETE CASCADE,
      date TEXT NOT NULL, -- 'YYYY-MM-DD'
      description TEXT NOT NULL,
      is_legal_holiday INTEGER NOT NULL DEFAULT 1,
      is_working_day INTEGER NOT NULL DEFAULT 0,
      UNIQUE(calendar_id, date)
    );

    -- Jurnal audit și istoric modificări setări diverse
    CREATE TABLE IF NOT EXISTS company_settings_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      setting_type TEXT NOT NULL, -- 'OPERATIONAL_SETTINGS' | 'BRANCH' | 'WORK_CALENDAR'
      old_values TEXT,
      new_values TEXT,
      changed_by INTEGER REFERENCES users(id),
      changed_by_name TEXT,
      changed_at TEXT NOT NULL,
      version INTEGER NOT NULL
    );

    -- ========================================================
    -- ETAPA 4: PRELUARE DATE CONTABILE (BALANȚA DE PORNIRE)
    -- ========================================================

    -- Lotul de preluare balanță de pornire per societate și exercițiu financiar
    CREATE TABLE IF NOT EXISTS accounting_opening_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      fiscal_year INTEGER NOT NULL,
      start_month INTEGER NOT NULL DEFAULT 1, -- 1=Ian, 2=Feb, etc.
      batch_type TEXT NOT NULL DEFAULT 'NO_ACTIVITY', -- 'NO_ACTIVITY' | 'YEAR_START' | 'DURING_YEAR'
      status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'IN_VERIFICATION' | 'VALIDATED'
      total_debit_initial REAL NOT NULL DEFAULT 0.0,
      total_credit_initial REAL NOT NULL DEFAULT 0.0,
      total_debit_prev REAL NOT NULL DEFAULT 0.0,
      total_credit_prev REAL NOT NULL DEFAULT 0.0,
      integrity_hash TEXT,
      validated_at TEXT,
      validated_by INTEGER REFERENCES users(id),
      validated_by_name TEXT,
      notes TEXT DEFAULT '',
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(company_id, fiscal_year)
    );

    -- Liniile balanței de pornire pe conturi contabile
    CREATE TABLE IF NOT EXISTS accounting_opening_balance_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES accounting_opening_batches(id) ON DELETE CASCADE,
      account_id INTEGER NOT NULL REFERENCES accounting_accounts(id) ON DELETE CASCADE,
      account_symbol TEXT NOT NULL,
      debit_initial REAL NOT NULL DEFAULT 0.0,
      credit_initial REAL NOT NULL DEFAULT 0.0,
      debit_prev REAL NOT NULL DEFAULT 0.0,
      credit_prev REAL NOT NULL DEFAULT 0.0,
      currency TEXT NOT NULL DEFAULT 'RON',
      currency_amount REAL NOT NULL DEFAULT 0.0,
      exchange_rate REAL DEFAULT 1.0,
      exchange_rate_date TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(batch_id, account_id)
    );

    -- Solduri terți la preluare (submodul clienți și furnizori neachitați/neîncasați)
    CREATE TABLE IF NOT EXISTS accounting_opening_counterparty_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES accounting_opening_batches(id) ON DELETE CASCADE,
      partner_type TEXT NOT NULL, -- 'CLIENT' | 'SUPPLIER'
      partner_name TEXT NOT NULL,
      partner_cui TEXT,
      doc_number TEXT NOT NULL,
      doc_date TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'RON',
      original_amount REAL NOT NULL DEFAULT 0.0,
      remaining_amount REAL NOT NULL DEFAULT 0.0,
      account_id INTEGER NOT NULL REFERENCES accounting_accounts(id) ON DELETE CASCADE,
      account_symbol TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    -- Jurnal de validare, devalidare, verificare și audit al balanței de pornire
    CREATE TABLE IF NOT EXISTS accounting_opening_validation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL REFERENCES accounting_opening_batches(id) ON DELETE CASCADE,
      action TEXT NOT NULL, -- 'CREATE' | 'SAVE' | 'CHECK' | 'VALIDATE' | 'INVALIDATE' | 'IMPORT' | 'COPY_COMPANY'
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      reason TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    -- Istoric importuri balanță de pornire (trasabilitate fișier/sursă și idempotență)
    CREATE TABLE IF NOT EXISTS accounting_opening_imports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      batch_id INTEGER NOT NULL REFERENCES accounting_opening_batches(id) ON DELETE CASCADE,
      fiscal_year INTEGER NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('CSV','XLSX','COMPANY_COPY','ROWS')),
      file_name TEXT DEFAULT '',
      content_hash TEXT NOT NULL,
      source_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      row_count INTEGER NOT NULL DEFAULT 0,
      total_debit_initial REAL NOT NULL DEFAULT 0,
      total_credit_initial REAL NOT NULL DEFAULT 0,
      total_debit_prev REAL NOT NULL DEFAULT 0,
      total_credit_prev REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'COMMITTED' CHECK(status IN ('COMMITTED','SUPERSEDED')),
      user_id INTEGER REFERENCES users(id),
      user_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(batch_id, content_hash)
    );

    -- Indexuri pentru viteză de căutare
    CREATE INDEX IF NOT EXISTS idx_companies_cui ON companies(cui);
    CREATE INDEX IF NOT EXISTS idx_companies_internal_code ON companies(internal_code);
    CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active);
    CREATE INDEX IF NOT EXISTS idx_user_access ON user_company_access(user_id, company_id);
    CREATE INDEX IF NOT EXISTS idx_fiscal_regimes_comp ON company_fiscal_regimes(company_id, start_date);
    CREATE INDEX IF NOT EXISTS idx_accounts_comp_symbol ON accounting_accounts(company_id, symbol);
    CREATE INDEX IF NOT EXISTS idx_accounts_comp_parent ON accounting_accounts(company_id, parent_id);
    CREATE INDEX IF NOT EXISTS idx_accounts_comp_active ON accounting_accounts(company_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_auto_settings_comp ON automatic_account_settings(company_id);
    CREATE INDEX IF NOT EXISTS idx_auto_history_comp ON automatic_account_setting_history(company_id, changed_at);
    CREATE INDEX IF NOT EXISTS idx_op_settings_comp ON company_operational_settings(company_id);
    CREATE INDEX IF NOT EXISTS idx_branch_comp ON branch_locations(company_id);
    CREATE INDEX IF NOT EXISTS idx_work_cal_comp ON work_calendars(company_id, year);
    CREATE INDEX IF NOT EXISTS idx_cal_exceptions_date ON work_calendar_exceptions(calendar_id, date);
    CREATE INDEX IF NOT EXISTS idx_settings_hist_comp ON company_settings_history(company_id, changed_at);
    CREATE INDEX IF NOT EXISTS idx_opening_batch_comp ON accounting_opening_batches(company_id, fiscal_year);
    CREATE INDEX IF NOT EXISTS idx_opening_lines_batch ON accounting_opening_balance_lines(batch_id);
    CREATE INDEX IF NOT EXISTS idx_opening_lines_acc ON accounting_opening_balance_lines(account_id);
    CREATE INDEX IF NOT EXISTS idx_opening_counterparty_batch ON accounting_opening_counterparty_items(batch_id);
    CREATE INDEX IF NOT EXISTS idx_opening_logs_batch ON accounting_opening_validation_logs(batch_id);
    CREATE INDEX IF NOT EXISTS idx_opening_imports_comp ON accounting_opening_imports(company_id, fiscal_year);
  `);


  // ========================================================
  // MIGRAȚII IDEMPOTENTE PENTRU BAZE DE DATE EXISTENTE
  // ========================================================

  // Loturile de preluare: marcaj configurare finalizată + monedă de bază
  ensureColumn('accounting_opening_batches', 'setup_completed', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('accounting_opening_batches', 'base_currency', `TEXT NOT NULL DEFAULT 'RON'`);

  // Liniile balanței de pornire: trasabilitate sursă curs/valoare și import
  // exchange_rate_source: '' | 'BNR' | 'MANUAL' | 'DOCUMENT'
  ensureColumn('accounting_opening_balance_lines', 'exchange_rate_source', `TEXT DEFAULT ''`);
  // value_source: 'MANUAL' | 'IMPORT' | 'COPY'
  ensureColumn('accounting_opening_balance_lines', 'value_source', `TEXT NOT NULL DEFAULT 'MANUAL'`);
  ensureColumn('accounting_opening_balance_lines', 'source_import_id', 'INTEGER NULL');
  ensureColumn('accounting_opening_balance_lines', 'created_at', 'TEXT');
  ensureColumn('accounting_opening_balance_lines', 'updated_at', 'TEXT');

  // Societăți: starea balanței de pornire (NONE | DRAFT | VALIDATED)
  ensureColumn('companies', 'opening_status', `TEXT NOT NULL DEFAULT 'NONE'`);
  ensureColumn('companies', 'opening_validated_at', 'TEXT NULL');

  // Solduri terți la preluare: monedă și câmpuri de audit
  ensureColumn('accounting_opening_counterparty_items', 'currency', `TEXT DEFAULT 'RON'`);
  ensureColumn('accounting_opening_counterparty_items', 'created_at', 'TEXT');
  ensureColumn('accounting_opening_counterparty_items', 'updated_at', 'TEXT');
  ensureColumn('accounting_opening_counterparty_items', 'created_by', 'INTEGER REFERENCES users(id)');
  // Soldul în moneda de bază al documentului, folosit la justificarea soldului contului
  ensureColumn('accounting_opening_counterparty_items', 'remaining_amount_ron', 'REAL NOT NULL DEFAULT 0');

  // Index unic pe documentele de terți; duplicatele istorice nu blochează pornirea aplicației
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_opening_cp_doc
        ON accounting_opening_counterparty_items(batch_id, partner_type, partner_name, doc_number, doc_date)
    `);
  } catch (error) {
    console.warn(
      '[db] Indexul unic ux_opening_cp_doc nu a putut fi creat (există duplicate în datele istorice):',
      error
    );
  }

  // Populare utilizator demonstrativ/admin dacă nu există
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count === 0) {
    const now = new Date().toISOString();
    const defaultPassword = hashPassword('Admin123!');
    db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin@contabilitate.ro', defaultPassword, 'Administrator Sistem', 'ADMIN', 1, now, now);
  }

  // Populare catalog oficial CAEN Rev.2 esențial cu versiune și valabilitate
  const existingCaen = db.prepare('SELECT COUNT(*) as count FROM caen_codes').get() as { count: number };
  if (existingCaen.count === 0) {
    const insertCaen = db.prepare(`
      INSERT INTO caen_codes (code, title, version, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?)
    `);

    const standardCaen = [
      ['6920', 'Activități de contabilitate și audit financiar; consultanță în domeniul fiscal', 'Rev.2', '2008-01-01', null],
      ['6201', 'Activități de realizare a software-ului la comandă (software orientat client)', 'Rev.2', '2008-01-01', null],
      ['6202', 'Activități de consultanță în tehnologia informației', 'Rev.2', '2008-01-01', null],
      ['7022', 'Activități de consultanță pentru afaceri și management', 'Rev.2', '2008-01-01', null],
      ['4711', 'Comerț cu amănuntul în magazine nespecializate, cu vânzare predominantă de produse alimentare, băuturi și tutun', 'Rev.2', '2008-01-01', null],
      ['4619', 'Intermedieri în comerțul cu produse diverse', 'Rev.2', '2008-01-01', null],
      ['4120', 'Lucrări de construcții a clădirilor rezidențiale și nerezidențiale', 'Rev.2', '2008-01-01', null],
      ['4941', 'Transporturi rutiere de mărfuri', 'Rev.2', '2008-01-01', null],
      ['5610', 'Restaurante', 'Rev.2', '2008-01-01', null],
      ['6820', 'Închirierea și subînchirierea bunurilor imobiliare proprii sau închiriate', 'Rev.2', '2008-01-01', null],
      ['8621', 'Activități de asistență medicală generală', 'Rev.2', '2008-01-01', null],
      ['7112', 'Activități de inginerie și consultanță tehnică legate de acestea', 'Rev.2', '2008-01-01', null],
      ['4520', 'Întreținerea și repararea autovehiculelor', 'Rev.2', '2008-01-01', null],
      ['8299', 'Alte activități de servicii suport pentru întreprinderi n.c.a.', 'Rev.2', '2008-01-01', null]
    ];

    const insertMany = db.transaction((rows: (string | null)[][]) => {
      for (const row of rows) {
        insertCaen.run(row[0], row[1], row[2], row[3], row[4]);
      }
    });
    insertMany(standardCaen);
  }

  // Populare Plan Oficial de Conturi OMFP 1802/2014
  const existingAccounts = db.prepare('SELECT COUNT(*) as count FROM official_chart_of_accounts').get() as { count: number };
  if (existingAccounts.count === 0) {
    const insertOfficial = db.prepare(`
      INSERT INTO official_chart_of_accounts (symbol, name, type, parent_symbol, nature, version, valid_from, valid_to, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Format: [symbol, name, type, parent_symbol, nature]
    const officialAccounts: [string, string, string, string | null, string][] = [
      // Clasa 1: Conturi de capitaluri, provizioane, împrumuturi
      ['101', 'Capital', 'SYNTHETIC', null, 'P'],
      ['1011', 'Capital subscris nevărsat', 'SYNTHETIC', '101', 'P'],
      ['1012', 'Capital subscris vărsat', 'SYNTHETIC', '101', 'P'],
      ['106', 'Rezerve', 'SYNTHETIC', null, 'P'],
      ['1061', 'Rezerve legale', 'SYNTHETIC', '106', 'P'],
      ['117', 'Rezultatul reportat', 'SYNTHETIC', null, 'B'],
      ['1171', 'Rezultatul reportat reprezentând profitul nerepartizat sau pierderea neacoperită', 'SYNTHETIC', '117', 'B'],
      ['121', 'Profit sau pierdere (Rezultatul exercițiului)', 'SYNTHETIC', null, 'B'],

      // Clasa 2: Conturi de imobilizări
      ['211', 'Terenuri și amenajări de terenuri', 'SYNTHETIC', null, 'A'],
      ['212', 'Construcții', 'SYNTHETIC', null, 'A'],
      ['213', 'Instalații tehnice și mijloace de transport', 'SYNTHETIC', null, 'A'],
      ['2131', 'Echipamente tehnologice (mașini, utilaje)', 'SYNTHETIC', '213', 'A'],
      ['2133', 'Mijloace de transport', 'SYNTHETIC', '213', 'A'],
      ['214', 'Mobilier, aparatură birotică, echipamente de protecție', 'SYNTHETIC', null, 'A'],
      ['281', 'Amortizări privind imobilizările corporale', 'SYNTHETIC', null, 'P'],
      ['2813', 'Amortizarea instalațiilor și a mijloacelor de transport', 'SYNTHETIC', '281', 'P'],

      // Clasa 3: Conturi de stocuri și producție în curs de execuție
      ['301', 'Materii prime', 'SYNTHETIC', null, 'A'],
      ['302', 'Materiale consumabile', 'SYNTHETIC', null, 'A'],
      ['3021', 'Materiale auxiliare', 'SYNTHETIC', '302', 'A'],
      ['3022', 'Combustibili', 'SYNTHETIC', '302', 'A'],
      ['303', 'Materiale de natura obiectelor de inventar', 'SYNTHETIC', null, 'A'],
      ['345', 'Produse finite', 'SYNTHETIC', null, 'A'],
      ['371', 'Mărfuri', 'SYNTHETIC', null, 'A'],
      ['378', 'Diferențe de preț la mărfuri (adaos comercial)', 'SYNTHETIC', null, 'B'],

      // Clasa 4: Conturi de terți
      ['401', 'Furnizori interni', 'SYNTHETIC', null, 'P'],
      ['404', 'Furnizori de imobilizări', 'SYNTHETIC', null, 'P'],
      ['408', 'Furnizori - facturi nesosite', 'SYNTHETIC', null, 'P'],
      ['409', 'Furnizori - debitori', 'SYNTHETIC', null, 'A'],
      ['4091', 'Furnizori - debitori pentru cumpărări de bunuri de natura stocurilor', 'SYNTHETIC', '409', 'A'],
      ['4092', 'Furnizori - debitori pentru prestări de servicii', 'SYNTHETIC', '409', 'A'],
      ['411', 'Clienți', 'SYNTHETIC', null, 'A'],
      ['4111', 'Clienți interni', 'SYNTHETIC', '411', 'A'],
      ['4118', 'Clienți incerți sau în litigiu', 'SYNTHETIC', '411', 'A'],
      ['418', 'Clienți - facturi de întocmit', 'SYNTHETIC', null, 'A'],
      ['419', 'Clienți - creditori (Avansuri încasate de la clienți)', 'SYNTHETIC', null, 'P'],
      ['421', 'Personal - salarii datorate', 'SYNTHETIC', null, 'P'],
      ['427', 'Rețineri din salarii datorate terților', 'SYNTHETIC', null, 'P'],
      ['428', 'Alte datorii și creanțe în legătură cu personalul', 'SYNTHETIC', null, 'B'],
      ['4281', 'Alte datorii în legătură cu personalul', 'SYNTHETIC', '428', 'P'],
      ['4282', 'Alte creanțe în legătură cu personalul', 'SYNTHETIC', '428', 'A'],
      ['431', 'Asigurări sociale', 'SYNTHETIC', null, 'P'],
      ['4315', 'Contribuția de asigurări sociale (CAS - 25%)', 'SYNTHETIC', '431', 'P'],
      ['4316', 'Contribuția de asigurări sociale de sănătate (CASS - 10%)', 'SYNTHETIC', '431', 'P'],
      ['436', 'Contribuția asiguratorie pentru muncă (CAM - 2.25%)', 'SYNTHETIC', null, 'P'],
      ['441', 'Impozitul pe profit/venit', 'SYNTHETIC', null, 'P'],
      ['4411', 'Impozitul pe profit', 'SYNTHETIC', '441', 'P'],
      ['4418', 'Impozitul pe veniturile microîntreprinderilor', 'SYNTHETIC', '441', 'P'],
      ['442', 'Taxa pe valoarea adăugată (TVA)', 'SYNTHETIC', null, 'B'],
      ['4423', 'TVA de plată', 'SYNTHETIC', '442', 'P'],
      ['4424', 'TVA de recuperat', 'SYNTHETIC', '442', 'A'],
      ['4426', 'TVA deductibilă', 'SYNTHETIC', '442', 'A'],
      ['4427', 'TVA colectată', 'SYNTHETIC', '442', 'P'],
      ['4428', 'TVA neexigibilă', 'SYNTHETIC', '442', 'B'],
      ['444', 'Impozitul pe veniturile din salarii', 'SYNTHETIC', null, 'P'],
      ['455', 'Sume datorate acționarilor/asociaților', 'SYNTHETIC', null, 'P'],
      ['4551', 'Acționari / asociați - conturi curente', 'SYNTHETIC', '455', 'P'],
      ['471', 'Cheltuieli înregistrate în avans', 'SYNTHETIC', null, 'A'],
      ['472', 'Venituri înregistrate în avans', 'SYNTHETIC', null, 'P'],
      ['473', 'Decontări din operații în curs de clarificare', 'SYNTHETIC', null, 'B'],

      // Clasa 5: Conturi de trezorerie
      ['511', 'Valori de încasat', 'SYNTHETIC', null, 'A'],
      ['5112', 'Cecuri de încasat', 'SYNTHETIC', '511', 'A'],
      ['512', 'Conturi curente la bănci', 'SYNTHETIC', null, 'A'],
      ['5121', 'Conturi la bănci în lei', 'SYNTHETIC', '512', 'A'],
      ['5124', 'Conturi la bănci în valută', 'SYNTHETIC', '512', 'A'],
      ['5125', 'Sume în curs de decontare (carduri / POS / intermediar)', 'SYNTHETIC', '512', 'A'],
      ['531', 'Casa', 'SYNTHETIC', null, 'A'],
      ['5311', 'Casa în lei', 'SYNTHETIC', '531', 'A'],
      ['5314', 'Casa în valută', 'SYNTHETIC', '531', 'A'],
      ['541', 'Acreditive', 'SYNTHETIC', null, 'A'],
      ['5411', 'Acreditive în lei', 'SYNTHETIC', '541', 'A'],
      ['5412', 'Acreditive în valută', 'SYNTHETIC', '541', 'A'],
      ['542', 'Avansuri de trezorerie (Deconturi)', 'SYNTHETIC', null, 'A'],
      ['581', 'Viramente interne (Transferuri de trezorerie)', 'SYNTHETIC', null, 'B'],

      // Clasa 6: Conturi de cheltuieli
      ['601', 'Cheltuieli cu materiile prime', 'SYNTHETIC', null, 'A'],
      ['602', 'Cheltuieli cu materialele consumabile', 'SYNTHETIC', null, 'A'],
      ['605', 'Cheltuieli privind utilitățile (energie, apă)', 'SYNTHETIC', null, 'A'],
      ['607', 'Cheltuieli privind mărfurile', 'SYNTHETIC', null, 'A'],
      ['611', 'Cheltuieli cu întreținerea și reparațiile', 'SYNTHETIC', null, 'A'],
      ['612', 'Cheltuieli cu redevențele, locațiile de gestiune și chiriile', 'SYNTHETIC', null, 'A'],
      ['624', 'Cheltuieli cu transportul de bunuri și personal', 'SYNTHETIC', null, 'A'],
      ['627', 'Cheltuieli cu serviciile bancare și asimilate', 'SYNTHETIC', null, 'A'],
      ['628', 'Alte cheltuieli cu serviciile executate de terți', 'SYNTHETIC', null, 'A'],
      ['641', 'Cheltuieli cu salariile personalului', 'SYNTHETIC', null, 'A'],
      ['646', 'Cheltuieli privind contribuția asiguratorie pentru muncă', 'SYNTHETIC', null, 'A'],
      ['658', 'Alte cheltuieli de exploatare', 'SYNTHETIC', null, 'A'],
      ['665', 'Cheltuieli din diferențe de curs valutar', 'SYNTHETIC', null, 'A'],
      ['666', 'Cheltuieli privind dobânzile', 'SYNTHETIC', null, 'A'],
      ['681', 'Cheltuieli de exploatare privind amortizările', 'SYNTHETIC', null, 'A'],
      ['6811', 'Cheltuieli de exploatare privind amortizarea imobilizărilor', 'SYNTHETIC', '681', 'A'],
      ['691', 'Cheltuieli cu impozitul pe profit', 'SYNTHETIC', null, 'A'],
      ['698', 'Cheltuieli cu impozitul pe veniturile microîntreprinderilor', 'SYNTHETIC', null, 'A'],

      // Clasa 7: Conturi de venituri
      ['701', 'Venituri din vânzarea produselor finite', 'SYNTHETIC', null, 'P'],
      ['704', 'Venituri din servicii prestate', 'SYNTHETIC', null, 'P'],
      ['707', 'Venituri din vânzarea mărfurilor', 'SYNTHETIC', null, 'P'],
      ['708', 'Venituri din activități diverse', 'SYNTHETIC', null, 'P'],
      ['758', 'Alte venituri din exploatare', 'SYNTHETIC', null, 'P'],
      ['7581', 'Venituri din despăgubiri, amenzi și penalități', 'SYNTHETIC', '758', 'P'],
      ['765', 'Venituri din diferențe de curs valutar', 'SYNTHETIC', null, 'P'],
      ['766', 'Venituri din dobânzi', 'SYNTHETIC', null, 'P']
    ];

    const insertAccountsTx = db.transaction(() => {
      for (const item of officialAccounts) {
        insertOfficial.run(
          item[0],
          item[1],
          item[2],
          item[3],
          item[4],
          'OMFP 1802/2014',
          '2015-01-01',
          null,
          1
        );
      }
    });
    insertAccountsTx();
  }

  // Populare calendar național standard de lucru și sărbători legale (România)
  const existingCalendars = db.prepare('SELECT COUNT(*) as count FROM work_calendars WHERE company_id IS NULL').get() as { count: number };
  if (existingCalendars.count === 0) {
    const insertCal = db.prepare(`
      INSERT INTO work_calendars (company_id, name, year, weekend_days, is_default)
      VALUES (NULL, ?, ?, '[0, 6]', 1)
    `);

    const insertExc = db.prepare(`
      INSERT INTO work_calendar_exceptions (calendar_id, date, description, is_legal_holiday, is_working_day)
      VALUES (?, ?, ?, 1, 0)
    `);

    const holidayData: Record<number, Array<[string, string]>> = {
      2025: [
        ['2025-01-01', 'Anul Nou'],
        ['2025-01-02', 'A doua zi de Anul Nou'],
        ['2025-01-06', 'Boboteaza'],
        ['2025-01-07', 'Sfântul Ioan Botezătorul'],
        ['2025-01-24', 'Ziua Unirii Principatelor Române'],
        ['2025-04-18', 'Vinerea Mare'],
        ['2025-04-20', 'Paștele Ortodox'],
        ['2025-04-21', 'A doua zi de Paște'],
        ['2025-05-01', 'Ziua Muncii'],
        ['2025-06-01', 'Ziua Copilului'],
        ['2025-06-08', 'Rusaliile'],
        ['2025-06-09', 'A doua zi de Rusalii'],
        ['2025-08-15', 'Adormirea Maicii Domnului'],
        ['2025-11-30', 'Sfântul Andrei'],
        ['2025-12-01', 'Ziua Națională a României'],
        ['2025-12-25', 'Crăciunul'],
        ['2025-12-26', 'A doua zi de Crăciun'],
      ],
      2026: [
        ['2026-01-01', 'Anul Nou'],
        ['2026-01-02', 'A doua zi de Anul Nou'],
        ['2026-01-06', 'Boboteaza'],
        ['2026-01-07', 'Sfântul Ioan Botezătorul'],
        ['2026-01-24', 'Ziua Unirii Principatelor Române'],
        ['2026-04-10', 'Vinerea Mare'],
        ['2026-04-12', 'Paștele Ortodox'],
        ['2026-04-13', 'A doua zi de Paște'],
        ['2026-05-01', 'Ziua Muncii'],
        ['2026-05-31', 'Rusaliile'],
        ['2026-06-01', 'Ziua Copilului / A doua zi de Rusalii'],
        ['2026-08-15', 'Adormirea Maicii Domnului'],
        ['2026-11-30', 'Sfântul Andrei'],
        ['2026-12-01', 'Ziua Națională a României'],
        ['2026-12-25', 'Crăciunul'],
        ['2026-12-26', 'A doua zi de Crăciun'],
      ],
      2027: [
        ['2027-01-01', 'Anul Nou'],
        ['2027-01-02', 'A doua zi de Anul Nou'],
        ['2027-01-06', 'Boboteaza'],
        ['2027-01-07', 'Sfântul Ioan Botezătorul'],
        ['2027-01-24', 'Ziua Unirii Principatelor Române'],
        ['2027-04-30', 'Vinerea Mare'],
        ['2027-05-01', 'Ziua Muncii'],
        ['2027-05-02', 'Paștele Ortodox'],
        ['2027-05-03', 'A doua zi de Paște'],
        ['2027-06-01', 'Ziua Copilului'],
        ['2027-06-20', 'Rusaliile'],
        ['2027-06-21', 'A doua zi de Rusalii'],
        ['2027-08-15', 'Adormirea Maicii Domnului'],
        ['2027-11-30', 'Sfântul Andrei'],
        ['2027-12-01', 'Ziua Națională a României'],
        ['2027-12-25', 'Crăciunul'],
        ['2027-12-26', 'A doua zi de Crăciun'],
      ],
    };

    const seedCalendarsTx = db.transaction(() => {
      for (const [yearStr, holidays] of Object.entries(holidayData)) {
        const year = parseInt(yearStr, 10);
        const calInfo = insertCal.run(`Calendar Național România ${year}`, year);
        const calId = Number(calInfo.lastInsertRowid);

        for (const [date, desc] of holidays) {
          insertExc.run(calId, date, desc);
        }
      }
    });

    seedCalendarsTx();
  }
}

// Rulare inițializare la încărcarea modulului
initDatabase();

