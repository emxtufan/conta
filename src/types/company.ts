export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'VIEWER';
  is_active: number;
}

export interface Address {
  id?: number;
  company_id?: number;
  type: 'HEADQUARTERS' | 'FISCAL_DOMICILE';
  country: string;
  county: string;
  city: string;
  sector?: string | null;
  postal_code?: string | null;
  street: string;
  number: string;
  building?: string | null;
  staircase?: string | null;
  floor?: string | null;
  apartment?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface BankAccount {
  id?: number;
  company_id?: number;
  bank_name: string;
  iban: string;
  currency: string;
  holder_name: string;
  is_default: boolean;
  is_active: boolean;
}

export interface FiscalRegime {
  id?: number;
  company_id?: number;
  start_date: string;
  end_date?: string | null;
  is_vat_payer: boolean;
  vat_periodicity: 'MONTHLY' | 'QUARTERLY';
  vat_on_collection: boolean;
  taxation_type: 'MICRO' | 'PROFIT' | 'SPECIFIC';
  fiscal_period?: string;
}

export interface CompanySettings {
  manages_inventory: boolean;
  inventory_evaluation_method: 'FIFO' | 'CMP';
  inventory_type: 'PERMANENT' | 'INTERMITTENT';
  document_series_config?: any;
  display_preferences?: any;
  internal_notes?: string;
}

export interface CompanyListItem {
  id: number;
  internal_code: string;
  name: string;
  cui: string;
  fiscal_attribute?: string | null;
  reg_com?: string | null;
  accounting_type: string;
  caen_code?: string | null;
  share_capital: number;
  currency: string;
  start_date: string;
  is_active: number;
  version: number;
  is_vat_payer?: number;
  vat_periodicity?: string;
  vat_on_collection?: number;
  taxation_type?: string;
}

export interface CompanyDetailed extends CompanyListItem {
  headquarters: Address | null;
  has_different_fiscal_domicile: boolean;
  fiscal_domicile: Address | null;
  bank_accounts: BankAccount[];
  fiscal_regimes: FiscalRegime[];
  current_fiscal_regime: FiscalRegime | null;
  settings: CompanySettings | null;
  audit_logs: AuditLog[];
}

export interface AuditLog {
  id: number;
  company_id: number | null;
  user_id: number | null;
  user_name?: string;
  user_email?: string;
  entity_type: string;
  entity_id: number;
  action: 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'ACTIVATE';
  old_values: string | null;
  new_values: string | null;
  timestamp: string;
}

export interface CAENCode {
  code: string;
  title: string;
  version: string;
  valid_from: string;
  valid_to: string | null;
}

export interface AcceptanceTestItem {
  id: number;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

// ========================================================
// ETAPA 2: PLAN DE CONTURI & CONTURI AUTOMATE
// ========================================================

export type AccountNature = 'A' | 'P' | 'B';
export type AccountType = 'SYNTHETIC' | 'ANALYTIC';

export interface AccountItem {
  id: number;
  company_id: number;
  symbol: string;
  name: string;
  type: AccountType;
  parent_id: number | null;
  parent_symbol?: string | null;
  nature: AccountNature;
  allow_direct_entry: number;
  is_active: number;
  is_system: number;
  has_children?: number;
  created_at: string;
  updated_at: string;
}

export type AutoSettingCategory = 
  | 'CASA_BANCA' 
  | 'DECONTURI' 
  | 'CLIENTI_FURNIZORI' 
  | 'TVA' 
  | 'INCHIDERE_REZULTAT' 
  | 'COMPENSARE';

export interface AutomaticAccountSettingItem {
  id: number;
  company_id: number;
  category: AutoSettingCategory;
  setting_key: string;
  account_id: number | null;
  label: string;
  description: string;
  default_symbol: string;
  is_required: number;
  updated_at: string;
  updated_by: number | null;
  // Joined account details
  account_symbol?: string | null;
  account_name?: string | null;
  account_nature?: AccountNature | null;
  account_type?: AccountType | null;
  account_is_active?: number | null;
}

export interface AutomaticAccountHistoryItem {
  id: number;
  company_id: number;
  setting_key: string;
  category: string;
  old_account_id: number | null;
  new_account_id: number | null;
  old_account_symbol: string | null;
  new_account_symbol: string | null;
  old_account_name: string | null;
  new_account_name: string | null;
  changed_by: number | null;
  changed_by_name: string | null;
  changed_at: string;
  notes: string | null;
}

export interface OfficialCatalogResponse {
  version: string;
  valid_from: string;
  total_accounts: number;
  accounts: Array<{
    id: number;
    symbol: string;
    name: string;
    type: string;
    parent_symbol: string | null;
    nature: string;
    version: string;
    valid_from: string;
  }>;
}

// ========================================================
// ETAPA 3: SETĂRI DIVERSE & CONFIGURĂRI OPERAȚIONALE
// ========================================================

export type ClosingMode = 'MONTHLY' | 'QUARTERLY';
export type DueDateMode = 'CALENDAR' | 'WORKING_DAYS';
export type NegativeStocksPolicy = 'BLOCK' | 'ALLOW_WITH_PERMISSION';
export type CogsDateMode = 'OPERATION_DATE' | 'MONTH_END';
export type PriceDiffStrategy = 'CUMULATIVE_YEAR_START' | 'MONTHLY_ISOLATED';

export interface CompanyOperationalSettings {
  id: number;
  company_id: number;
  
  // 1. Contabilitate
  closing_mode: ClosingMode;
  auto_desc_include_partner: number;
  auto_desc_include_item: number;
  auto_desc_include_doc_number: number;
  auto_desc_include_doc_date: number;
  inventory_price_diff_cumulative: number;
  inventory_price_diff_strategy: PriceDiffStrategy;
  
  // 2. Facturare și scadențe
  due_date_mode: DueDateMode;
  delay_days_mode: DueDateMode;
  vat_inclusive_calculation: number;
  default_payment_term_days: number;
  standard_vat_rate: number;
  
  // 3. Filiale și puncte de lucru
  has_branches: number;
  default_branch_index: string;
  
  // 4. Gestiuni și stocuri
  inventory_module_enabled: number;
  negative_stocks_policy: NegativeStocksPolicy;
  filter_items_by_warehouse: number;
  suggest_last_client_price: number;
  track_batches_and_expiry: number;
  cogs_accounting_date_mode: CogsDateMode;
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
  changed_by: number | null;
  changed_by_name: string | null;
  changed_at: string;
  version: number;
}

// =========================================================================
// ETAPA 4: PRELUARE DATE CONTABILE (BALANȚA DE PORNIRE)
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
  exchange_rate_source?: string;
  value_source?: string;
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

export interface ImportPreviewItem {
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
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningsCount: number;
  items: ImportPreviewItem[];
  calculatedTotals: {
    debit_initial: number;
    credit_initial: number;
    debit_prev: number;
    credit_prev: number;
  };
}


