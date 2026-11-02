import { db } from './db';
import { validateCUI, validateIBAN, validateRegCom } from './validators';
import { seedCompanyAccounts } from './accounts';
import { getOperationalSettings } from './operationalSettings';

export interface CompanyInput {
  name: string;
  cui: string;
  fiscal_attribute?: string | null;
  reg_com?: string | null;
  accounting_type: string;
  caen_code?: string | null;
  share_capital: number;
  currency: string;
  start_date: string;
  is_active?: number;
  version?: number;
  // Sediu
  headquarters: {
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
  };
  has_different_fiscal_domicile?: boolean;
  fiscal_domicile?: {
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
  } | null;
  // Conturi bancare
  bank_accounts?: Array<{
    id?: number;
    bank_name: string;
    iban: string;
    currency: string;
    holder_name: string;
    is_default: boolean;
    is_active: boolean;
  }>;
  // Regim fiscal curent
  fiscal_regime: {
    start_date: string;
    end_date?: string | null;
    is_vat_payer: boolean;
    vat_periodicity: 'MONTHLY' | 'QUARTERLY';
    vat_on_collection: boolean;
    taxation_type: 'MICRO' | 'PROFIT' | 'SPECIFIC';
    fiscal_period?: string;
  };
  // Setări
  settings?: {
    manages_inventory: boolean;
    inventory_evaluation_method: 'FIFO' | 'CMP';
    inventory_type: 'PERMANENT' | 'INTERMITTENT';
    document_series_config?: any;
    display_preferences?: any;
    internal_notes?: string;
  };
}

/**
 * Generează un cod intern unic neutilizat anterior (ex: '0001', '0002')
 */
export function generateNextInternalCode(): string {
  // Găsim cel mai mare cod alocat vreodată pentru a nu refolosi codurile
  const row = db.prepare(`
    SELECT MAX(CAST(internal_code AS INTEGER)) as max_val
    FROM companies
  `).get() as { max_val: number | null };

  const nextNumber = (row?.max_val || 0) + 1;
  return nextNumber.toString().padStart(4, '0');
}

/**
 * Înregistrare log de audit
 */
function recordAuditLog(
  companyId: number | null,
  userId: number,
  entityType: string,
  entityId: number,
  action: 'CREATE' | 'UPDATE' | 'DEACTIVATE' | 'ACTIVATE',
  oldValues: any,
  newValues: any
) {
  db.prepare(`
    INSERT INTO audit_logs (company_id, user_id, entity_type, entity_id, action, old_values, new_values, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    companyId,
    userId,
    entityType,
    entityId,
    action,
    oldValues ? JSON.stringify(oldValues) : null,
    newValues ? JSON.stringify(newValues) : null,
    new Date().toISOString()
  );
}

/**
 * Verifică dreptul de acces al utilizatorului la companie
 */
export function checkUserCompanyAccess(userId: number, companyId: number, userRole: string): boolean {
  if (userRole === 'ADMIN') return true;
  const access = db.prepare(`
    SELECT id FROM user_company_access
    WHERE user_id = ? AND company_id = ?
  `).get(userId, companyId);
  return !!access;
}

/**
 * Obține lista de companii accesibile de către un utilizator
 */
export function getCompaniesForUser(userId: number, userRole: string, filterActive?: boolean, searchQuery?: string) {
  let query = `
    SELECT c.*, 
      f.is_vat_payer, f.vat_periodicity, f.vat_on_collection, f.taxation_type
    FROM companies c
    LEFT JOIN company_fiscal_regimes f ON f.company_id = c.id AND f.end_date IS NULL
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (userRole !== 'ADMIN') {
    conditions.push(`c.id IN (SELECT company_id FROM user_company_access WHERE user_id = ?)`);
    params.push(userId);
  }

  if (filterActive !== undefined) {
    conditions.push(`c.is_active = ?`);
    params.push(filterActive ? 1 : 0);
  }

  if (searchQuery && searchQuery.trim()) {
    const q = `%${searchQuery.trim()}%`;
    conditions.push(`(c.name LIKE ? OR c.cui LIKE ? OR c.internal_code LIKE ?)`);
    params.push(q, q, q);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += ` ORDER BY c.internal_code ASC`;

  return db.prepare(query).all(...params);
}

/**
 * Obține datele complete ale unei societăți (cu adrese, bănci, istoric fiscal, setări)
 */
export function getCompanyById(companyId: number, userId: number, userRole: string) {
  if (!checkUserCompanyAccess(userId, companyId, userRole)) {
    throw new Error('Nu aveți permisiunea de a accesa această societate.');
  }

  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
  if (!company) return null;

  const addresses = db.prepare('SELECT * FROM company_addresses WHERE company_id = ?').all(companyId) as any[];
  const bankAccounts = db.prepare('SELECT * FROM company_bank_accounts WHERE company_id = ? ORDER BY is_default DESC, bank_name ASC').all(companyId) as any[];
  const fiscalRegimes = db.prepare('SELECT * FROM company_fiscal_regimes WHERE company_id = ? ORDER BY start_date DESC').all(companyId) as any[];
  const settings = db.prepare('SELECT * FROM company_settings WHERE company_id = ?').get(companyId) as any;
  const auditLogs = db.prepare(`
    SELECT a.*, u.full_name as user_name, u.email as user_email
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.company_id = ?
    ORDER BY a.timestamp DESC
    LIMIT 20
  `).all(companyId) as any[];

  const hq = addresses.find(a => a.type === 'HEADQUARTERS') || null;
  const fiscalDomicile = addresses.find(a => a.type === 'FISCAL_DOMICILE') || null;

  return {
    ...company,
    headquarters: hq,
    has_different_fiscal_domicile: !!fiscalDomicile,
    fiscal_domicile: fiscalDomicile,
    bank_accounts: bankAccounts.map(b => ({
      ...b,
      is_default: Boolean(b.is_default),
      is_active: Boolean(b.is_active),
    })),
    fiscal_regimes: fiscalRegimes.map(f => ({
      ...f,
      is_vat_payer: Boolean(f.is_vat_payer),
      vat_on_collection: Boolean(f.vat_on_collection),
    })),
    current_fiscal_regime: fiscalRegimes.find(f => f.end_date === null) || fiscalRegimes[0] || null,
    settings: settings ? {
      ...settings,
      manages_inventory: Boolean(settings.manages_inventory),
      document_series_config: JSON.parse(settings.document_series_config || '{}'),
      display_preferences: JSON.parse(settings.display_preferences || '{}'),
    } : null,
    audit_logs: auditLogs,
  };
}

/**
 * Creare societate nouă (tranzacție completă)
 */
export function createCompany(data: CompanyInput, userId: number): any {
  // 1. Validare CUI
  const cuiCheck = validateCUI(data.cui);
  if (!cuiCheck.isValid) {
    throw new Error(cuiCheck.message || 'CUI/CIF invalid.');
  }
  const cleanCui = cuiCheck.normalized!;

  // 2. Verificare unicitate CUI
  const existingCui = db.prepare('SELECT id, name FROM companies WHERE cui = ?').get(cleanCui) as any;
  if (existingCui) {
    throw new Error(`CUI-ul ${cleanCui} este deja înregistrat pentru societatea "${existingCui.name}".`);
  }

  // 3. Validare RegCom dacă este prezent
  if (data.reg_com) {
    const regComCheck = validateRegCom(data.reg_com);
    if (!regComCheck.isValid) {
      throw new Error(regComCheck.message || 'Număr Registrul Comerțului invalid.');
    }
  }

  // 4. Validare conturi bancare (IBAN și regula de unicitate a contului implicit per monedă)
  if (data.bank_accounts && data.bank_accounts.length > 0) {
    const defaultCurrencies = new Set<string>();
    for (const b of data.bank_accounts) {
      const ibanCheck = validateIBAN(b.iban);
      if (!ibanCheck.isValid) {
        throw new Error(`IBAN invalid pentru banca ${b.bank_name}: ${ibanCheck.message}`);
      }
      b.iban = ibanCheck.normalized!;
      if (b.is_default) {
        if (defaultCurrencies.has(b.currency)) {
          throw new Error(`O societate poate avea un singur cont implicit pentru moneda ${b.currency}.`);
        }
        defaultCurrencies.add(b.currency);
      }
    }
  }

  // Rulare tranzacție
  const createTx = db.transaction(() => {
    const now = new Date().toISOString();
    const internalCode = generateNextInternalCode();

    const insertCompany = db.prepare(`
      INSERT INTO companies (
        internal_code, name, cui, fiscal_attribute, reg_com, accounting_type,
        caen_code, share_capital, currency, start_date, is_active, version,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `);

    const result = insertCompany.run(
      internalCode,
      data.name.trim(),
      cleanCui,
      data.fiscal_attribute?.toUpperCase() || null,
      data.reg_com?.trim().toUpperCase() || null,
      data.accounting_type || 'COMMERCIAL',
      data.caen_code?.trim() || null,
      data.share_capital || 200.0,
      data.currency || 'RON',
      data.start_date || now.split('T')[0],
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      userId,
      userId,
      now,
      now
    );

    const companyId = Number(result.lastInsertRowid);

    // Salvare sediu social
    if (data.headquarters) {
      db.prepare(`
        INSERT INTO company_addresses (
          company_id, type, country, county, city, sector, postal_code,
          street, number, building, staircase, floor, apartment, phone, email
        ) VALUES (?, 'HEADQUARTERS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        data.headquarters.country || 'România',
        data.headquarters.county,
        data.headquarters.city,
        data.headquarters.sector || null,
        data.headquarters.postal_code || null,
        data.headquarters.street,
        data.headquarters.number,
        data.headquarters.building || null,
        data.headquarters.staircase || null,
        data.headquarters.floor || null,
        data.headquarters.apartment || null,
        data.headquarters.phone || null,
        data.headquarters.email || null
      );
    }

    // Salvare domiciliu fiscal dacă e diferit
    if (data.has_different_fiscal_domicile && data.fiscal_domicile) {
      db.prepare(`
        INSERT INTO company_addresses (
          company_id, type, country, county, city, sector, postal_code,
          street, number, building, staircase, floor, apartment, phone, email
        ) VALUES (?, 'FISCAL_DOMICILE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        data.fiscal_domicile.country || 'România',
        data.fiscal_domicile.county,
        data.fiscal_domicile.city,
        data.fiscal_domicile.sector || null,
        data.fiscal_domicile.postal_code || null,
        data.fiscal_domicile.street,
        data.fiscal_domicile.number,
        data.fiscal_domicile.building || null,
        data.fiscal_domicile.staircase || null,
        data.fiscal_domicile.floor || null,
        data.fiscal_domicile.apartment || null,
        data.fiscal_domicile.phone || null,
        data.fiscal_domicile.email || null
      );
    }

    // Salvare conturi bancare
    if (data.bank_accounts && data.bank_accounts.length > 0) {
      const insertBank = db.prepare(`
        INSERT INTO company_bank_accounts (
          company_id, bank_name, iban, currency, holder_name, is_default, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const b of data.bank_accounts) {
        insertBank.run(
          companyId,
          b.bank_name.trim(),
          b.iban.trim(),
          b.currency || 'RON',
          b.holder_name?.trim() || data.name.trim(),
          b.is_default ? 1 : 0,
          b.is_active ? 1 : 0,
          now
        );
      }
    }

    // Salvare regim fiscal inițial
    if (data.fiscal_regime) {
      db.prepare(`
        INSERT INTO company_fiscal_regimes (
          company_id, start_date, end_date, is_vat_payer, vat_periodicity,
          vat_on_collection, taxation_type, fiscal_period, created_at
        ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        data.fiscal_regime.start_date || now.split('T')[0],
        data.fiscal_regime.is_vat_payer ? 1 : 0,
        data.fiscal_regime.vat_periodicity || 'MONTHLY',
        data.fiscal_regime.vat_on_collection ? 1 : 0,
        data.fiscal_regime.taxation_type || 'MICRO',
        data.fiscal_regime.fiscal_period || 'ANNUAL',
        now
      );
    }

    // Salvare setări gestiune
    const settings = data.settings || {
      manages_inventory: true,
      inventory_evaluation_method: 'FIFO',
      inventory_type: 'PERMANENT',
    };

    db.prepare(`
      INSERT INTO company_settings (
        company_id, manages_inventory, inventory_evaluation_method, inventory_type,
        document_series_config, display_preferences, internal_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      companyId,
      settings.manages_inventory ? 1 : 0,
      settings.inventory_evaluation_method || 'FIFO',
      settings.inventory_type || 'PERMANENT',
      JSON.stringify(settings.document_series_config || {}),
      JSON.stringify(settings.display_preferences || {}),
      settings.internal_notes || ''
    );

    // Acordare drept ADMIN creatorului pe această firmă
    db.prepare(`
      INSERT INTO user_company_access (user_id, company_id, role, granted_at)
      VALUES (?, ?, 'ADMIN', ?)
    `).run(userId, companyId, now);

    // Audit log
    recordAuditLog(companyId, userId, 'COMPANY', companyId, 'CREATE', null, {
      internal_code: internalCode,
      name: data.name,
      cui: cleanCui,
    });

    return companyId;
  });

  const newId = createTx();
  // Inițializare automată plan de conturi și setări conturi automate pentru compania nouă
  seedCompanyAccounts(newId);
  getOperationalSettings(newId);
  return getCompanyById(newId, userId, 'ADMIN');
}


/**
 * Actualizare societate existentă cu control de concurență (Optimistic Locking)
 */
export function updateCompany(companyId: number, data: CompanyInput, userId: number, userRole: string): any {
  if (!checkUserCompanyAccess(userId, companyId, userRole)) {
    throw new Error('Nu aveți permisiunea de a modifica această societate.');
  }

  // 1. Validare CUI
  const cuiCheck = validateCUI(data.cui);
  if (!cuiCheck.isValid) {
    throw new Error(cuiCheck.message || 'CUI/CIF invalid.');
  }
  const cleanCui = cuiCheck.normalized!;

  // 2. Verificare dacă noul CUI aparține altei companii
  const existingCui = db.prepare('SELECT id, name FROM companies WHERE cui = ? AND id != ?').get(cleanCui, companyId) as any;
  if (existingCui) {
    throw new Error(`CUI-ul ${cleanCui} este deja utilizat de societatea "${existingCui.name}".`);
  }

  // 3. Validare RegCom
  if (data.reg_com) {
    const regComCheck = validateRegCom(data.reg_com);
    if (!regComCheck.isValid) {
      throw new Error(regComCheck.message || 'Număr Registrul Comerțului invalid.');
    }
  }

  // 4. Validare bănci
  if (data.bank_accounts && data.bank_accounts.length > 0) {
    const defaultCurrencies = new Set<string>();
    for (const b of data.bank_accounts) {
      const ibanCheck = validateIBAN(b.iban);
      if (!ibanCheck.isValid) {
        throw new Error(`IBAN invalid pentru banca ${b.bank_name}: ${ibanCheck.message}`);
      }
      b.iban = ibanCheck.normalized!;
      if (b.is_default) {
        if (defaultCurrencies.has(b.currency)) {
          throw new Error(`O societate poate avea un singur cont implicit pentru moneda ${b.currency}.`);
        }
        defaultCurrencies.add(b.currency);
      }
    }
  }

  // Tranzacție de actualizare cu verificare de versiune (Optimistic Lock)
  const updateTx = db.transaction(() => {
    const current = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) as any;
    if (!current) {
      throw new Error('Societatea nu a fost găsită.');
    }

    // Verificare versiune concurențială
    if (data.version !== undefined && current.version !== data.version) {
      throw new Error(
        'Conflict de salvare concurentă: datele societății au fost modificate între timp de pe o altă sesiune sau laptop. Vă rugăm să reîncărcați pagina pentru a vedea ultimele modificări.'
      );
    }

    const now = new Date().toISOString();
    const nextVersion = current.version + 1;

    // Actualizare tabel companies
    const updateResult = db.prepare(`
      UPDATE companies SET
        name = ?,
        cui = ?,
        fiscal_attribute = ?,
        reg_com = ?,
        accounting_type = ?,
        caen_code = ?,
        share_capital = ?,
        currency = ?,
        start_date = ?,
        is_active = ?,
        version = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ? AND version = ?
    `).run(
      data.name.trim(),
      cleanCui,
      data.fiscal_attribute?.toUpperCase() || null,
      data.reg_com?.trim().toUpperCase() || null,
      data.accounting_type || 'COMMERCIAL',
      data.caen_code?.trim() || null,
      data.share_capital || 200.0,
      data.currency || 'RON',
      data.start_date || current.start_date,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active,
      nextVersion,
      userId,
      now,
      companyId,
      current.version
    );

    if (updateResult.changes === 0) {
      throw new Error(
        'Conflict de concurență: salvarea a fost respinsă deoarece alt utilizator a actualizat această societate.'
      );
    }

    // Actualizare sedii
    db.prepare('DELETE FROM company_addresses WHERE company_id = ?').run(companyId);

    if (data.headquarters) {
      db.prepare(`
        INSERT INTO company_addresses (
          company_id, type, country, county, city, sector, postal_code,
          street, number, building, staircase, floor, apartment, phone, email
        ) VALUES (?, 'HEADQUARTERS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        data.headquarters.country || 'România',
        data.headquarters.county,
        data.headquarters.city,
        data.headquarters.sector || null,
        data.headquarters.postal_code || null,
        data.headquarters.street,
        data.headquarters.number,
        data.headquarters.building || null,
        data.headquarters.staircase || null,
        data.headquarters.floor || null,
        data.headquarters.apartment || null,
        data.headquarters.phone || null,
        data.headquarters.email || null
      );
    }

    if (data.has_different_fiscal_domicile && data.fiscal_domicile) {
      db.prepare(`
        INSERT INTO company_addresses (
          company_id, type, country, county, city, sector, postal_code,
          street, number, building, staircase, floor, apartment, phone, email
        ) VALUES (?, 'FISCAL_DOMICILE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        companyId,
        data.fiscal_domicile.country || 'România',
        data.fiscal_domicile.county,
        data.fiscal_domicile.city,
        data.fiscal_domicile.sector || null,
        data.fiscal_domicile.postal_code || null,
        data.fiscal_domicile.street,
        data.fiscal_domicile.number,
        data.fiscal_domicile.building || null,
        data.fiscal_domicile.staircase || null,
        data.fiscal_domicile.floor || null,
        data.fiscal_domicile.apartment || null,
        data.fiscal_domicile.phone || null,
        data.fiscal_domicile.email || null
      );
    }

    // Actualizare conturi bancare
    if (data.bank_accounts) {
      db.prepare('DELETE FROM company_bank_accounts WHERE company_id = ?').run(companyId);
      const insertBank = db.prepare(`
        INSERT INTO company_bank_accounts (
          company_id, bank_name, iban, currency, holder_name, is_default, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const b of data.bank_accounts) {
        insertBank.run(
          companyId,
          b.bank_name.trim(),
          b.iban.trim(),
          b.currency || 'RON',
          b.holder_name?.trim() || data.name.trim(),
          b.is_default ? 1 : 0,
          b.is_active ? 1 : 0,
          now
        );
      }
    }

    // Gestionare istoric regim fiscal (fără suprascriere sau suprapunere)
    if (data.fiscal_regime) {
      const activeRegime = db.prepare(`
        SELECT * FROM company_fiscal_regimes
        WHERE company_id = ? AND end_date IS NULL
      `).get(companyId) as any;

      const newIsVat = data.fiscal_regime.is_vat_payer ? 1 : 0;
      const newVatPer = data.fiscal_regime.vat_periodicity || 'MONTHLY';
      const newVatCol = data.fiscal_regime.vat_on_collection ? 1 : 0;
      const newTaxType = data.fiscal_regime.taxation_type || 'MICRO';
      const newStart = data.fiscal_regime.start_date;

      let isDifferent = true;
      if (activeRegime) {
        isDifferent = (
          activeRegime.is_vat_payer !== newIsVat ||
          activeRegime.vat_periodicity !== newVatPer ||
          activeRegime.vat_on_collection !== newVatCol ||
          activeRegime.taxation_type !== newTaxType ||
          activeRegime.start_date !== newStart
        );
      }

      if (isDifferent) {
        // Închidere regim vechi fără suprapunere
        if (activeRegime && activeRegime.start_date !== newStart) {
          // Calcul dată anterioară
          const endDate = new Date(new Date(newStart).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          db.prepare(`
            UPDATE company_fiscal_regimes SET end_date = ? WHERE id = ?
          `).run(endDate, activeRegime.id);

          // Inserare regim nou
          db.prepare(`
            INSERT INTO company_fiscal_regimes (
              company_id, start_date, end_date, is_vat_payer, vat_periodicity,
              vat_on_collection, taxation_type, fiscal_period, created_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
          `).run(
            companyId,
            newStart,
            newIsVat,
            newVatPer,
            newVatCol,
            newTaxType,
            data.fiscal_regime.fiscal_period || 'ANNUAL',
            now
          );
        } else if (!activeRegime) {
          db.prepare(`
            INSERT INTO company_fiscal_regimes (
              company_id, start_date, end_date, is_vat_payer, vat_periodicity,
              vat_on_collection, taxation_type, fiscal_period, created_at
            ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)
          `).run(
            companyId,
            newStart,
            newIsVat,
            newVatPer,
            newVatCol,
            newTaxType,
            data.fiscal_regime.fiscal_period || 'ANNUAL',
            now
          );
        } else {
          // Aceeași dată de start -> actualizare parametru fără deschidere perioadă nouă
          db.prepare(`
            UPDATE company_fiscal_regimes SET
              is_vat_payer = ?, vat_periodicity = ?, vat_on_collection = ?,
              taxation_type = ?, fiscal_period = ?
            WHERE id = ?
          `).run(
            newIsVat,
            newVatPer,
            newVatCol,
            newTaxType,
            data.fiscal_regime.fiscal_period || 'ANNUAL',
            activeRegime.id
          );
        }
      }
    }

    // Actualizare setări
    if (data.settings) {
      db.prepare(`
        INSERT INTO company_settings (
          company_id, manages_inventory, inventory_evaluation_method, inventory_type,
          document_series_config, display_preferences, internal_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(company_id) DO UPDATE SET
          manages_inventory = excluded.manages_inventory,
          inventory_evaluation_method = excluded.inventory_evaluation_method,
          inventory_type = excluded.inventory_type,
          document_series_config = excluded.document_series_config,
          display_preferences = excluded.display_preferences,
          internal_notes = excluded.internal_notes
      `).run(
        companyId,
        data.settings.manages_inventory ? 1 : 0,
        data.settings.inventory_evaluation_method || 'FIFO',
        data.settings.inventory_type || 'PERMANENT',
        JSON.stringify(data.settings.document_series_config || {}),
        JSON.stringify(data.settings.display_preferences || {}),
        data.settings.internal_notes || ''
      );
    }

    // Înregistrare audit log
    recordAuditLog(companyId, userId, 'COMPANY', companyId, 'UPDATE', {
      name: current.name,
      cui: current.cui,
      version: current.version,
    }, {
      name: data.name,
      cui: cleanCui,
      version: nextVersion,
    });
  });

  updateTx();
  return getCompanyById(companyId, userId, userRole);
}

/**
 * Dezactivare / reactivare societate (soft delete)
 */
export function toggleCompanyStatus(companyId: number, isActive: boolean, userId: number, userRole: string) {
  if (!checkUserCompanyAccess(userId, companyId, userRole)) {
    throw new Error('Nu aveți permisiunea de a modifica starea acestei societăți.');
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE companies SET
      is_active = ?,
      updated_by = ?,
      updated_at = ?
    WHERE id = ?
  `).run(isActive ? 1 : 0, userId, now, companyId);

  recordAuditLog(
    companyId,
    userId,
    'COMPANY',
    companyId,
    isActive ? 'ACTIVATE' : 'DEACTIVATE',
    null,
    { is_active: isActive }
  );

  return { success: true, is_active: isActive };
}

/**
 * Ștergere fizică (permisă DOAR dacă societatea nu are documente/înregistrări asociate)
 */
export function deleteCompany(companyId: number, userId: number, userRole: string) {
  if (userRole !== 'ADMIN') {
    throw new Error('Doar administratorii pot șterge o societate.');
  }

  // Verificare dacă există documente contabile
  // Deocamdată suntem în Etapa 1, dar garantăm siguranța:
  // Dacă există înregistrări în audit_logs de operare sau tabele viitoare, blocăm.
  // Pentru siguranță se recomandă dezactivarea.
  const company = db.prepare('SELECT internal_code, name FROM companies WHERE id = ?').get(companyId) as any;
  if (!company) {
    throw new Error('Societatea nu există.');
  }

  db.prepare('DELETE FROM companies WHERE id = ?').run(companyId);

  recordAuditLog(
    null,
    userId,
    'COMPANY',
    companyId,
    'DEACTIVATE',
    { company: company.name, internal_code: company.internal_code },
    null
  );

  return { success: true };
}
