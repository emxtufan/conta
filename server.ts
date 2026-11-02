import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { requireAuth, login, register, logout, AuthRequest } from './src/server/auth.js';
import { 
  getCompaniesForUser, 
  getCompanyById, 
  createCompany, 
  updateCompany, 
  toggleCompanyStatus,
  deleteCompany,
  generateNextInternalCode,
  checkUserCompanyAccess
} from './src/server/companies.js';
import { 
  getCompanyAccounts, 
  createAnalyticAccount, 
  updateCompanyAccount, 
  getAutomaticSettingsForCompany, 
  updateAutomaticSettings, 
  getAutomaticSettingsHistory,
  getOfficialChartOfAccountsCatalog
} from './src/server/accounts.js';
import {
  getOperationalSettings,
  updateOperationalSettings,
  getBranchLocations,
  createBranchLocation,
  updateBranchLocation,
  deleteBranchLocation,
  getCompanySettingsHistory,
  calculateDueDate,
  calculateDelayDays,
  calculateFromGrossPrice,
  buildAutoAccountingDescription,
  calculatePriceDifferenceCoefficient
} from './src/server/operationalSettings.js';
import {
  getOrCreateOpeningBatch,
  getOpeningBalanceLines,
  saveOpeningBalanceLines,
  redistributeToAnalytics,
  verifyOpeningBalance,
  validateOpeningBatch,
  invalidateOpeningBatch,
  getOpeningCounterparties,
  saveOpeningCounterpartyItem,
  deleteOpeningCounterpartyItem,
  previewOpeningImport,
  commitOpeningImport,
  copyOpeningBalanceFromCompany,
  getOpeningValidationLogs,
  getOpeningBalances,
  setupOpeningBatch,
  markVerificationStatus,
  countSubsequentOperations,
  getAllowedCurrencies
} from './src/server/openingBalance.js';
import { parseImportFile, previewHeaders } from './src/server/openingImport.js';
import { validateCUI, validateIBAN, validateRegCom } from './src/server/validators.js';
import { runAcceptanceTests } from './src/server/tests.js';
import { db } from './src/server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Răspuns de eroare pentru rutele de balanță de pornire.
 * Păstrează codul semantic al erorii: CONFLICT / SUBSEQUENT_OPERATIONS -> 409,
 * FORBIDDEN -> 403, orice altă eroare -> 400.
 */
function sendOpeningError(res: Response, err: any) {
  const code = err && typeof err.code === 'string' ? err.code : null;
  let status = 400;
  if (code === 'CONFLICT' || code === 'SUBSEQUENT_OPERATIONS') {
    status = 409;
  } else if (code === 'FORBIDDEN') {
    status = 403;
  }
  res.status(status).json({
    error: err && err.message ? err.message : 'Eroare la procesarea balanței de pornire.',
    code
  });
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // ----------------------------------------------------
  // RUTE DE AUTENTIFICARE
  // ----------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email-ul și parola sunt obligatorii.' });
      }

      const result = login(email, password);
      if (!result) {
        return res.status(401).json({ error: 'Email sau parolă incorectă.' });
      }

      res.json(result);
    } catch (err: any) {
      console.error('Eroare login:', err);
      res.status(500).json({ error: err.message || 'Eroare la autentificare.' });
    }
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { email, password, full_name } = req.body;
      if (!email || !password || !full_name) {
        return res.status(400).json({ error: 'Toate câmpurile sunt obligatorii.' });
      }

      const result = register(email, password, full_name);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();
      logout(token);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // ----------------------------------------------------
  // RUTE NOMENCLATOR CAEN
  // ----------------------------------------------------
  app.get('/api/caen', requireAuth, (_req: Request, res: Response) => {
    try {
      const codes = db.prepare('SELECT * FROM caen_codes ORDER BY code ASC').all();
      res.json(codes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // RUTE VALIDARE RAPIDĂ CUI & IBAN
  // ----------------------------------------------------
  app.get('/api/validate/cui', (req: Request, res: Response) => {
    const cui = req.query.cui as string;
    const check = validateCUI(cui);
    if (!check.isValid) {
      return res.json(check);
    }
    // Verificare existență
    const existing = db.prepare('SELECT id, name FROM companies WHERE cui = ?').get(check.normalized!) as any;
    res.json({
      ...check,
      isDuplicate: !!existing,
      existingCompany: existing ? existing.name : null,
    });
  });

  app.get('/api/validate/iban', (req: Request, res: Response) => {
    const iban = req.query.iban as string;
    const check = validateIBAN(iban);
    res.json(check);
  });

  // ----------------------------------------------------
  // RUTE COMPANII
  // ----------------------------------------------------
  app.get('/api/companies', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const filterActive = req.query.active !== undefined ? req.query.active === 'true' : undefined;
      const search = req.query.search as string;
      const list = getCompaniesForUser(req.user!.id, req.user!.role, filterActive, search);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/companies/next-code', requireAuth, (_req: Request, res: Response) => {
    try {
      const nextCode = generateNextInternalCode();
      res.json({ next_code: nextCode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      const company = getCompanyById(companyId, req.user!.id, req.user!.role);
      if (!company) {
        return res.status(404).json({ error: 'Societatea nu a fost găsită.' });
      }

      res.json(company);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  });

  app.post('/api/companies', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const created = createCompany(req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      const updated = updateCompany(companyId, req.body, req.user!.id, req.user!.role);
      res.json(updated);
    } catch (err: any) {
      if (err.message.includes('Conflict')) {
        return res.status(409).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/companies/:id/status', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      const { is_active } = req.body;
      const result = toggleCompanyStatus(companyId, Boolean(is_active), req.user!.id, req.user!.role);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/companies/:id', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      const result = deleteCompany(companyId, req.user!.id, req.user!.role);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // RUTE PLAN DE CONTURI & CONTURI AUTOMATE (ETAPA 2)
  // ----------------------------------------------------
  app.get('/api/official-accounts', requireAuth, (_req: Request, res: Response) => {
    try {
      const catalog = getOfficialChartOfAccountsCatalog();
      res.json({
        version: 'OMFP 1802/2014',
        valid_from: '2015-01-01',
        total_accounts: catalog.length,
        accounts: catalog,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/accounts', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const search = req.query.search as string;
      const nature = req.query.nature as string;
      const type = req.query.type as string;
      const activeOnly = req.query.activeOnly === 'true';
      const directEntryOnly = req.query.directEntryOnly === 'true';

      const accounts = getCompanyAccounts(companyId, {
        search,
        nature,
        type,
        activeOnly,
        directEntryOnly,
      });

      res.json(accounts);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/accounts', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const created = createAnalyticAccount(companyId, req.body, req.user!.id);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id/accounts/:accountId', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      const accountId = parseInt(req.params.accountId, 10);
      if (isNaN(companyId) || isNaN(accountId)) {
        return res.status(400).json({ error: 'Parametri invalizi.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const updated = updateCompanyAccount(companyId, accountId, req.body, req.user!.id);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/automatic-accounts', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const settings = getAutomaticSettingsForCompany(companyId);
      res.json(settings);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id/automatic-accounts', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Lista de actualizări este invalidă (se așteaptă array de "updates").' });
      }

      const updatedSettings = updateAutomaticSettings(
        companyId,
        updates,
        req.user!.id,
        req.user!.full_name
      );

      res.json(updatedSettings);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/automatic-accounts/history', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const settingKey = req.query.setting_key as string;
      const history = getAutomaticSettingsHistory(companyId, settingKey);
      res.json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // RUTE SETĂRI DIVERSE & OPERAȚIONALE (ETAPA 3)
  // ----------------------------------------------------
  app.get('/api/companies/:id/operational-settings', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const settings = getOperationalSettings(companyId);
      res.json(settings);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id/operational-settings', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const updated = updateOperationalSettings(
        companyId,
        req.body,
        req.user!.id,
        req.user!.full_name
      );
      res.json(updated);
    } catch (err: any) {
      if (err.message.includes('Conflict')) {
        return res.status(409).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // Rute Filiale și puncte de lucru
  app.get('/api/companies/:id/branches', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const branches = getBranchLocations(companyId);
      res.json(branches);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/branches', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const created = createBranchLocation(companyId, req.body, req.user!.id, req.user!.full_name);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/companies/:id/branches/:branchId', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      const branchId = parseInt(req.params.branchId, 10);
      if (isNaN(companyId) || isNaN(branchId)) {
        return res.status(400).json({ error: 'Parametri invalizi.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const updated = updateBranchLocation(companyId, branchId, req.body, req.user!.id, req.user!.full_name);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/companies/:id/branches/:branchId', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      const branchId = parseInt(req.params.branchId, 10);
      if (isNaN(companyId) || isNaN(branchId)) {
        return res.status(400).json({ error: 'Parametri invalizi.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const result = deleteBranchLocation(companyId, branchId, req.user!.id, req.user!.full_name);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/settings-history', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: 'ID companie invalid.' });
      }

      checkUserCompanyAccess(req.user!.id, companyId, req.user!.role);

      const history = getCompanySettingsHistory(companyId);
      res.json(history);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Motoare de calcul reutilizabile & testabile
  app.post('/api/utilities/calculate-due-date', requireAuth, (req: Request, res: Response) => {
    try {
      const { issue_date, number_of_days, calendar_id, mode, company_id } = req.body;
      const dueDate = calculateDueDate(
        issue_date,
        parseInt(number_of_days, 10),
        calendar_id ? parseInt(calendar_id, 10) : null,
        mode || 'CALENDAR',
        company_id ? parseInt(company_id, 10) : undefined
      );
      res.json({ due_date: dueDate });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/utilities/calculate-delay', requireAuth, (req: Request, res: Response) => {
    try {
      const { due_date, reference_date, mode, company_id } = req.body;
      const delayDays = calculateDelayDays(
        due_date,
        reference_date,
        mode || 'CALENDAR',
        company_id ? parseInt(company_id, 10) : undefined
      );
      res.json({ delay_days: delayDays });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/utilities/calculate-from-gross', requireAuth, (req: Request, res: Response) => {
    try {
      const { gross_amount, vat_rate_percent, rounding_decimals } = req.body;
      const result = calculateFromGrossPrice(
        parseFloat(gross_amount),
        parseFloat(vat_rate_percent),
        rounding_decimals ? parseInt(rounding_decimals, 10) : 2
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/utilities/calculate-auto-description', requireAuth, (req: Request, res: Response) => {
    try {
      const { params, config } = req.body;
      const description = buildAutoAccountingDescription(params || {}, config || {
        includePartner: true,
        includeItem: true,
        includeDocNumber: true,
        includeDocDate: true,
      });
      res.json({ description });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/utilities/calculate-price-diff-coef', requireAuth, (req: Request, res: Response) => {
    try {
      const { initialStockValue, initialPriceDiff, incomingStockValue, incomingPriceDiff, strategy } = req.body;
      const result = calculatePriceDifferenceCoefficient(
        {
          initialStockValue: parseFloat(initialStockValue) || 0,
          initialPriceDiff: parseFloat(initialPriceDiff) || 0,
          incomingStockValue: parseFloat(incomingStockValue) || 0,
          incomingPriceDiff: parseFloat(incomingPriceDiff) || 0,
        },
        strategy || 'CUMULATIVE_YEAR_START'
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });



  // ----------------------------------------------------
  // ETAPA 4: PRELUARE DATE CONTABILE (BALANȚA DE PORNIRE)
  // ----------------------------------------------------
  app.get('/api/companies/:id/opening-balance', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Nu aveți permisiunea de a accesa această societate.' });
      }

      const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
      const batch = getOrCreateOpeningBatch(companyId, year, 1, req.user!.id, req.user!.full_name);
      const lines = getOpeningBalanceLines(batch.id, companyId);
      const verification = verifyOpeningBalance(companyId, batch.id);
      const subsequent_operations = countSubsequentOperations(companyId, year);

      res.json({ batch, lines, verification, subsequent_operations, currencies: getAllowedCurrencies(companyId) });
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  app.put('/api/companies/:id/opening-balance', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Nu aveți permisiunea de a modifica această societate.' });
      }

      const { batch_id, batch_type, start_month, notes, version, lines } = req.body;
      const result = saveOpeningBalanceLines(
        companyId,
        batch_id,
        { batch_type, start_month: parseInt(start_month, 10) || 1, notes, version, lines },
        req.user!.id,
        req.user!.full_name
      );

      const updatedLines = getOpeningBalanceLines(result.batch.id, companyId);
      const verification = verifyOpeningBalance(companyId, result.batch.id);

      res.json({ ...result, lines: updatedLines, verification });
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  app.post('/api/companies/:id/opening-balance/redistribute', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Nu aveți permisiunea de a modifica această societate.' });
      }

      const { batch_id, parent_account_id, version, allocations } = req.body;
      const result = redistributeToAnalytics(
        companyId,
        batch_id,
        { parent_account_id, version: Number(version), allocations },
        req.user!.id,
        req.user!.full_name
      );

      const lines = getOpeningBalanceLines(result.batch.id, companyId);
      const verification = verifyOpeningBalance(companyId, result.batch.id);

      res.json({
        success: result.success,
        version: result.batch.version,
        batch: result.batch,
        lines,
        verification
      });
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  app.post('/api/companies/:id/opening-balance/setup', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Nu aveți permisiunea de a modifica această societate.' });
      }

      const { fiscal_year, start_month, batch_type, version } = req.body;
      const result = setupOpeningBatch(
        companyId,
        {
          fiscal_year: parseInt(fiscal_year, 10) || new Date().getFullYear(),
          start_month: parseInt(start_month, 10) || 1,
          batch_type,
          version: Number(version)
        },
        req.user!.id,
        req.user!.full_name
      );

      const lines = getOpeningBalanceLines(result.batch.id, companyId);
      const verification = verifyOpeningBalance(companyId, result.batch.id);

      res.json({ batch: result.batch, lines, verification });
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  app.post('/api/companies/:id/opening-balance/verify', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const { batch_id } = req.body;
      const verification = verifyOpeningBalance(companyId, batch_id);
      const marked = markVerificationStatus(
        companyId,
        batch_id,
        verification.errors.length > 0,
        req.user!.id,
        req.user!.full_name
      );
      res.json({ verification, batch: marked.batch });
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  app.post('/api/companies/:id/opening-balance/validate', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const { batch_id, version } = req.body;
      const result = validateOpeningBatch(
        companyId,
        batch_id,
        Number(version),
        req.user!.id,
        req.user!.full_name
      );
      res.json(result);
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  app.post('/api/companies/:id/opening-balance/invalidate', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const { batch_id, reason } = req.body;
      const result = invalidateOpeningBatch(companyId, batch_id, reason, req.user!.id, req.user!.full_name);
      res.json(result);
    } catch (err: any) {
      sendOpeningError(res, err);
    }
  });

  // Solduri terți
  app.get('/api/companies/:id/opening-balance/counterparties', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const batchId = parseInt(req.query.batchId as string, 10);
      const items = getOpeningCounterparties(batchId);
      res.json(items);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/opening-balance/counterparties', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const { batch_id, item } = req.body;
      const saved = saveOpeningCounterpartyItem(companyId, batch_id, item);
      res.json(saved);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/companies/:id/opening-balance/counterparties/:itemId', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const itemId = parseInt(req.params.itemId, 10);
      const batchId = parseInt(req.query.batchId as string, 10);
      const result = deleteOpeningCounterpartyItem(batchId, itemId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Import și Copiere din altă firmă
  app.post('/api/companies/:id/opening-balance/import/preview', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const { rows } = req.body;
      const preview = previewOpeningImport(companyId, rows || []);
      res.json(preview);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/opening-balance/import/commit', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const { batch_id, rows } = req.body;
      const result = commitOpeningImport(companyId, batch_id, rows || [], req.user!.id, req.user!.full_name);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/companies/:id/opening-balance/copy-from-company', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const targetCompanyId = parseInt(req.params.id, 10);
      const { sourceCompanyId, fiscalYear } = req.body;

      if (!checkUserCompanyAccess(req.user!.id, targetCompanyId, req.user!.role) ||
          !checkUserCompanyAccess(req.user!.id, parseInt(sourceCompanyId, 10), req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis: aveți nevoie de permisiuni pe ambele societăți.' });
      }

      const result = copyOpeningBalanceFromCompany(
        parseInt(sourceCompanyId, 10),
        targetCompanyId,
        parseInt(fiscalYear, 10) || new Date().getFullYear(),
        req.user!.id,
        req.user!.full_name
      );
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/companies/:id/opening-balance/logs', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const companyId = parseInt(req.params.id, 10);
      if (!checkUserCompanyAccess(req.user!.id, companyId, req.user!.role)) {
        return res.status(403).json({ error: 'Acces interzis.' });
      }

      const batchId = parseInt(req.query.batchId as string, 10);
      const logs = getOpeningValidationLogs(batchId);
      res.json(logs);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // TESTE DE ACCEPTANȚĂ
  // ----------------------------------------------------
  app.post('/api/tests/run', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const results = await runAcceptanceTests(req.user!.id);
      res.json({ results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // INTEGRARE VITE / STATIC ASSETS
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Contabilitate RO pornit pe http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Eroare pornire server:', err);
  process.exit(1);
});
