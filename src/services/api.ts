import { 
  User, 
  CompanyListItem, 
  CompanyDetailed, 
  CAENCode, 
  AcceptanceTestItem,
  AccountItem,
  AutomaticAccountSettingItem,
  AutomaticAccountHistoryItem,
  OfficialCatalogResponse,
  CompanyOperationalSettings,
  BranchLocation,
  CompanySettingsHistoryItem,
  BatchType,
  OpeningBatch,
  OpeningBalanceLine,
  OpeningCounterpartyItem,
  OpeningValidationLog,
  OpeningVerificationResult,
  ImportPreviewResult
} from '../types/company';

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('contabilitate_ro_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('contabilitate_ro_token', token);
    } else {
      localStorage.removeItem('contabilitate_ro_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || `Eroare server (Cod HTTP ${res.status})`;
      const error = new Error(errorMsg) as Error & { code?: string; status?: number };
      error.code = data?.code;
      error.status = res.status;
      throw error;
    }

    return data as T;
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async register(email: string, password: string, full_name: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name }),
    });
    this.setToken(res.token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/api/auth/me');
  }

  // Companies
  async getCompanies(filterActive?: boolean, search?: string): Promise<CompanyListItem[]> {
    const params = new URLSearchParams();
    if (filterActive !== undefined) params.append('active', String(filterActive));
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<CompanyListItem[]>(`/api/companies${qs}`);
  }

  async getNextCode(): Promise<{ next_code: string }> {
    return this.request<{ next_code: string }>('/api/companies/next-code');
  }

  async getCompany(id: number): Promise<CompanyDetailed> {
    return this.request<CompanyDetailed>(`/api/companies/${id}`);
  }

  async createCompany(data: any): Promise<CompanyDetailed> {
    return this.request<CompanyDetailed>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: number, data: any): Promise<CompanyDetailed> {
    return this.request<CompanyDetailed>(`/api/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleCompanyStatus(id: number, isActive: boolean): Promise<{ success: boolean; is_active: boolean }> {
    return this.request<{ success: boolean; is_active: boolean }>(`/api/companies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async deleteCompany(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/companies/${id}`, {
      method: 'DELETE',
    });
  }

  // CAEN & Validation
  async getCAENCodes(): Promise<CAENCode[]> {
    return this.request<CAENCode[]>('/api/caen');
  }

  async checkCUI(cui: string): Promise<{ isValid: boolean; message?: string; normalized?: string; isDuplicate?: boolean; existingCompany?: string | null }> {
    return this.request(`/api/validate/cui?cui=${encodeURIComponent(cui)}`);
  }

  async checkIBAN(iban: string): Promise<{ isValid: boolean; message?: string; normalized?: string }> {
    return this.request(`/api/validate/iban?iban=${encodeURIComponent(iban)}`);
  }

  // Acceptance Tests Runner
  async runAcceptanceTests(): Promise<{ results: AcceptanceTestItem[] }> {
    return this.request<{ results: AcceptanceTestItem[] }>('/api/tests/run', {
      method: 'POST',
    });
  }

  // ========================================================
  // ETAPA 2: PLAN DE CONTURI & CONTURI AUTOMATE
  // ========================================================
  async getOfficialAccounts(): Promise<OfficialCatalogResponse> {
    return this.request<OfficialCatalogResponse>('/api/official-accounts');
  }

  async getCompanyAccounts(
    companyId: number,
    filters?: {
      search?: string;
      nature?: string;
      type?: string;
      activeOnly?: boolean;
      directEntryOnly?: boolean;
    }
  ): Promise<AccountItem[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.nature) params.append('nature', filters.nature);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.activeOnly !== undefined) params.append('activeOnly', String(filters.activeOnly));
    if (filters?.directEntryOnly !== undefined) params.append('directEntryOnly', String(filters.directEntryOnly));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<AccountItem[]>(`/api/companies/${companyId}/accounts${qs}`);
  }

  async createAnalyticAccount(
    companyId: number,
    data: {
      parent_symbol: string;
      symbol: string;
      name: string;
      nature?: 'A' | 'P' | 'B';
      allow_direct_entry?: boolean;
    }
  ): Promise<AccountItem> {
    return this.request<AccountItem>(`/api/companies/${companyId}/accounts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompanyAccount(
    companyId: number,
    accountId: number,
    data: {
      name?: string;
      is_active?: boolean;
      allow_direct_entry?: boolean;
    }
  ): Promise<AccountItem> {
    return this.request<AccountItem>(`/api/companies/${companyId}/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAutomaticAccounts(companyId: number): Promise<AutomaticAccountSettingItem[]> {
    return this.request<AutomaticAccountSettingItem[]>(`/api/companies/${companyId}/automatic-accounts`);
  }

  async updateAutomaticAccounts(
    companyId: number,
    updates: Array<{
      setting_key: string;
      account_id: number | null;
      notes?: string;
    }>
  ): Promise<AutomaticAccountSettingItem[]> {
    return this.request<AutomaticAccountSettingItem[]>(`/api/companies/${companyId}/automatic-accounts`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
  }

  async getAutomaticAccountsHistory(
    companyId: number,
    settingKey?: string
  ): Promise<AutomaticAccountHistoryItem[]> {
    const qs = settingKey ? `?setting_key=${encodeURIComponent(settingKey)}` : '';
    return this.request<AutomaticAccountHistoryItem[]>(
      `/api/companies/${companyId}/automatic-accounts/history${qs}`
    );
  }

  // ========================================================
  // ETAPA 3: SETĂRI DIVERSE & MOTOARE DE CALCUL
  // ========================================================
  async getOperationalSettings(companyId: number): Promise<CompanyOperationalSettings> {
    return this.request<CompanyOperationalSettings>(`/api/companies/${companyId}/operational-settings`);
  }

  async updateOperationalSettings(
    companyId: number,
    data: Partial<CompanyOperationalSettings>
  ): Promise<CompanyOperationalSettings> {
    return this.request<CompanyOperationalSettings>(`/api/companies/${companyId}/operational-settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getBranches(companyId: number): Promise<BranchLocation[]> {
    return this.request<BranchLocation[]>(`/api/companies/${companyId}/branches`);
  }

  async createBranch(companyId: number, data: any): Promise<BranchLocation> {
    return this.request<BranchLocation>(`/api/companies/${companyId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBranch(companyId: number, branchId: number, data: any): Promise<BranchLocation> {
    return this.request<BranchLocation>(`/api/companies/${companyId}/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBranch(companyId: number, branchId: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/companies/${companyId}/branches/${branchId}`, {
      method: 'DELETE',
    });
  }

  async getSettingsHistory(companyId: number): Promise<CompanySettingsHistoryItem[]> {
    return this.request<CompanySettingsHistoryItem[]>(`/api/companies/${companyId}/settings-history`);
  }

  // Calcul utilitare
  async calculateDueDate(params: {
    issue_date: string;
    number_of_days: number;
    mode?: string;
    company_id?: number;
    calendar_id?: number;
  }): Promise<{ due_date: string }> {
    return this.request<{ due_date: string }>('/api/utilities/calculate-due-date', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async calculateDelay(params: {
    due_date: string;
    reference_date: string;
    mode?: string;
    company_id?: number;
  }): Promise<{ delay_days: number }> {
    return this.request<{ delay_days: number }>('/api/utilities/calculate-delay', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async calculateFromGross(params: {
    gross_amount: number;
    vat_rate_percent: number;
    rounding_decimals?: number;
  }): Promise<{ netAmount: number; vatAmount: number; grossAmount: number; formulaUsed: string }> {
    return this.request<{ netAmount: number; vatAmount: number; grossAmount: number; formulaUsed: string }>(
      '/api/utilities/calculate-from-gross',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  async calculatePriceDiffCoef(params: {
    initialStockValue: number;
    initialPriceDiff: number;
    incomingStockValue: number;
    incomingPriceDiff: number;
    strategy?: string;
  }): Promise<{ kCoefficient: number; formulaDescription: string; version: string }> {
    return this.request<{ kCoefficient: number; formulaDescription: string; version: string }>(
      '/api/utilities/calculate-price-diff-coef',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  // ========================================================
  // ETAPA 4: PRELUARE DATE CONTABILE (BALANȚA DE PORNIRE)
  // ========================================================
  async setupOpeningBalance(
    companyId: number,
    data: {
      fiscal_year: number;
      start_month: number;
      batch_type: BatchType;
      version: number;
    }
  ): Promise<{
    batch: OpeningBatch;
    lines: OpeningBalanceLine[];
    verification: OpeningVerificationResult;
  }> {
    return this.request(`/api/companies/${companyId}/opening-balance/setup`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOpeningBalance(companyId: number, year?: number): Promise<{
    batch: OpeningBatch;
    lines: OpeningBalanceLine[];
    verification: OpeningVerificationResult;
    subsequent_operations: number;
    currencies: string[];
  }> {
    const qs = year ? `?year=${year}` : '';
    return this.request<{
      batch: OpeningBatch;
      lines: OpeningBalanceLine[];
      verification: OpeningVerificationResult;
      subsequent_operations: number;
      currencies: string[];
    }>(`/api/companies/${companyId}/opening-balance${qs}`);
  }

  async saveOpeningBalance(
    companyId: number,
    data: {
      batch_id: number;
      batch_type: string;
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
    }
  ): Promise<{
    success: boolean;
    version: number;
    batch: OpeningBatch;
    lines: OpeningBalanceLine[];
    verification: OpeningVerificationResult;
  }> {
    return this.request(`/api/companies/${companyId}/opening-balance`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async verifyOpeningBalance(companyId: number, batchId: number): Promise<{
    verification: OpeningVerificationResult;
    batch: OpeningBatch;
  }> {
    return this.request<{
      verification: OpeningVerificationResult;
      batch: OpeningBatch;
    }>(`/api/companies/${companyId}/opening-balance/verify`, {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId }),
    });
  }

  async validateOpeningBalance(companyId: number, batchId: number, version: number): Promise<{
    success: boolean;
    integrity_hash: string;
    batch: OpeningBatch;
  }> {
    return this.request(`/api/companies/${companyId}/opening-balance/validate`, {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, version }),
    });
  }

  async invalidateOpeningBalance(
    companyId: number,
    batchId: number,
    reason: string
  ): Promise<{ success: boolean; batch: OpeningBatch }> {
    return this.request(`/api/companies/${companyId}/opening-balance/invalidate`, {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, reason }),
    });
  }

  async getOpeningCounterparties(companyId: number, batchId: number): Promise<OpeningCounterpartyItem[]> {
    return this.request<OpeningCounterpartyItem[]>(
      `/api/companies/${companyId}/opening-balance/counterparties?batchId=${batchId}`
    );
  }

  async saveOpeningCounterpartyItem(
    companyId: number,
    batchId: number,
    item: {
      id?: number;
      partner_type: 'CLIENT' | 'SUPPLIER';
      partner_name: string;
      partner_cui?: string | null;
      doc_number: string;
      doc_date: string;
      currency?: string;
      original_amount: number;
      remaining_amount: number;
      remaining_amount_ron?: number;
      account_id: number;
      account_symbol: string;
      notes?: string;
    }
  ): Promise<OpeningCounterpartyItem> {
    return this.request<OpeningCounterpartyItem>(`/api/companies/${companyId}/opening-balance/counterparties`, {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, item }),
    });
  }

  async deleteOpeningCounterpartyItem(
    companyId: number,
    batchId: number,
    itemId: number
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      `/api/companies/${companyId}/opening-balance/counterparties/${itemId}?batchId=${batchId}`,
      { method: 'DELETE' }
    );
  }

  async previewOpeningImport(
    companyId: number,
    rows: any[]
  ): Promise<ImportPreviewResult> {
    return this.request<ImportPreviewResult>(`/api/companies/${companyId}/opening-balance/import/preview`, {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
  }

  async commitOpeningImport(
    companyId: number,
    batchId: number,
    rows: any[]
  ): Promise<{ success: boolean; importedCount: number; batch: OpeningBatch }> {
    return this.request(`/api/companies/${companyId}/opening-balance/import/commit`, {
      method: 'POST',
      body: JSON.stringify({ batch_id: batchId, rows }),
    });
  }

  async copyOpeningBalanceFromCompany(
    targetCompanyId: number,
    sourceCompanyId: number,
    fiscalYear: number
  ): Promise<{ success: boolean; copiedCount: number; batch: OpeningBatch }> {
    return this.request(`/api/companies/${targetCompanyId}/opening-balance/copy-from-company`, {
      method: 'POST',
      body: JSON.stringify({ sourceCompanyId, fiscalYear }),
    });
  }

  async getOpeningValidationLogs(companyId: number, batchId: number): Promise<OpeningValidationLog[]> {
    return this.request<OpeningValidationLog[]>(
      `/api/companies/${companyId}/opening-balance/logs?batchId=${batchId}`
    );
  }
}

export const api = new ApiService();


