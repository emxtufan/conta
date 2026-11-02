import { db } from './db';

export interface AccountItem {
  id: number;
  company_id: number;
  symbol: string;
  name: string;
  type: 'SYNTHETIC' | 'ANALYTIC';
  parent_id: number | null;
  parent_symbol?: string | null;
  nature: 'A' | 'P' | 'B';
  allow_direct_entry: number;
  is_active: number;
  is_system: number;
  has_children?: number;
  created_at: string;
  updated_at: string;
}

export interface AutomaticAccountSettingItem {
  id: number;
  company_id: number;
  category: 'CASA_BANCA' | 'DECONTURI' | 'CLIENTI_FURNIZORI' | 'TVA' | 'INCHIDERE_REZULTAT' | 'COMPENSARE';
  setting_key: string;
  account_id: number | null;
  label: string;
  description: string;
  default_symbol: string;
  is_required: number;
  updated_at: string;
  updated_by: number | null;
  // Join fields
  account_symbol?: string | null;
  account_name?: string | null;
  account_nature?: string | null;
  account_type?: string | null;
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

/**
 * Definiții standard de setări conturi automate cu explicații și simboluri implicite
 */
export const DEFAULT_AUTOMATIC_SETTING_SPECS: Array<{
  category: 'CASA_BANCA' | 'DECONTURI' | 'CLIENTI_FURNIZORI' | 'TVA' | 'INCHIDERE_REZULTAT' | 'COMPENSARE';
  setting_key: string;
  label: string;
  description: string;
  default_symbol: string;
  is_required: boolean;
  allowed_prefixes: string[];
}> = [
  // 1. Casa și banca
  {
    category: 'CASA_BANCA',
    setting_key: 'CASA_1',
    label: 'Casa 1 (Casa în lei)',
    description: 'Contul principal pentru operațiuni curente de casă și numerar în monedă națională (lei).',
    default_symbol: '5311',
    is_required: true,
    allowed_prefixes: ['531', '5311'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'CASA_2',
    label: 'Casa 2 (Casa în valută)',
    description: 'Cont pentru operațiuni de casă în valută sau a doua casierie.',
    default_symbol: '5314',
    is_required: false,
    allowed_prefixes: ['531', '5314'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'CASA_3',
    label: 'Casa 3 (Casierie secundară/punct lucru)',
    description: 'Casierie opțională suplimentară pentru magazine, filiale sau puncte de lucru.',
    default_symbol: '',
    is_required: false,
    allowed_prefixes: ['531'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'BANCA_1',
    label: 'Banca 1 (Banca în lei)',
    description: 'Contul bancar principal în lei pentru viramente, plăți furnizori și încasări clienți.',
    default_symbol: '5121',
    is_required: true,
    allowed_prefixes: ['512', '5121'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'BANCA_2',
    label: 'Banca 2 (Banca în valută)',
    description: 'Cont bancar în valută pentru decontări externe sau operațiuni valutare.',
    default_symbol: '5124',
    is_required: false,
    allowed_prefixes: ['512', '5124'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'BANCA_3',
    label: 'Banca 3 (Cont bancar secundar/trezorerie)',
    description: 'Cont bancar opțional secundar sau cont deschis la Trezoreria Statului.',
    default_symbol: '',
    is_required: false,
    allowed_prefixes: ['512'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'TRANSFERURI_INTERNE',
    label: 'Transferuri interne (Viramente)',
    description: 'Cont de tranzit pentru mișcări de fonduri între bănci și casierii (ex: 581 = 5121 și 5311 = 581).',
    default_symbol: '581',
    is_required: true,
    allowed_prefixes: ['581'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'CE_DECONTARI_VALORI',
    label: 'Sume în curs de decontare (POS / carduri)',
    description: 'Cont utilizat pentru încasări prin terminale POS și sume virate cu cardul în curs de decontare.',
    default_symbol: '5125',
    is_required: false,
    allowed_prefixes: ['512', '5125'],
  },
  {
    category: 'CASA_BANCA',
    setting_key: 'CE_CECU_INCASAT',
    label: 'Efecte comerciale de încasat (Cecuri/BO)',
    description: 'Cont pentru cecuri și bilete la ordin primite de la clienți spre încasare.',
    default_symbol: '5112',
    is_required: false,
    allowed_prefixes: ['511', '5112'],
  },

  // 2. Deconturi
  {
    category: 'DECONTURI',
    setting_key: 'DECONTURI_1',
    label: 'Deconturi 1 (Avansuri trezorerie)',
    description: 'Cont pentru evidențierea avansurilor de trezorerie acordate angajaților/administratorilor.',
    default_symbol: '542',
    is_required: true,
    allowed_prefixes: ['542'],
  },
  {
    category: 'DECONTURI',
    setting_key: 'DECONTURI_2',
    label: 'Deconturi 2 (Creanțe personal)',
    description: 'Cont pentru debite, imputații, garanții sau avansuri speciale legate de salariați.',
    default_symbol: '4282',
    is_required: false,
    allowed_prefixes: ['4282', '428'],
  },
  {
    category: 'DECONTURI',
    setting_key: 'DECONTURI_3',
    label: 'Deconturi 3 (Datorii personal)',
    description: 'Cont pentru concedii neefectuate, ajutoare sau sume datorate personalului.',
    default_symbol: '4281',
    is_required: false,
    allowed_prefixes: ['4281', '428'],
  },

  // 3. Clienți și furnizori
  {
    category: 'CLIENTI_FURNIZORI',
    setting_key: 'CLIENTI_INTERNI',
    label: 'Clienți interni (România)',
    description: 'Contul general utilizat la facturarea clienților interni în lei/valută.',
    default_symbol: '4111',
    is_required: true,
    allowed_prefixes: ['4111', '411'],
  },
  {
    category: 'CLIENTI_FURNIZORI',
    setting_key: 'FURNIZORI_INTERNI',
    label: 'Furnizori interni (România)',
    description: 'Contul utilizat la înregistrarea achizițiilor de bunuri și servicii din țară.',
    default_symbol: '401',
    is_required: true,
    allowed_prefixes: ['401'],
  },
  {
    category: 'CLIENTI_FURNIZORI',
    setting_key: 'CLIENTI_EXTERNI',
    label: 'Clienți externi (UE / Non-UE)',
    description: 'Contul implicit pentru livrări intracomunitare și exporturi către clienți externi.',
    default_symbol: '4111',
    is_required: false,
    allowed_prefixes: ['4111', '411'],
  },
  {
    category: 'CLIENTI_FURNIZORI',
    setting_key: 'FURNIZORI_EXTERNI',
    label: 'Furnizori externi (Import / Achiziții UE)',
    description: 'Contul implicit pentru achiziții intracomunitare și importuri de la furnizori externi.',
    default_symbol: '401',
    is_required: false,
    allowed_prefixes: ['401'],
  },
  {
    category: 'CLIENTI_FURNIZORI',
    setting_key: 'AVANSURI_CLIENTI',
    label: 'Avansuri încasate de la clienți',
    description: 'Cont pentru evidențierea facturilor de avans emise clienților.',
    default_symbol: '419',
    is_required: true,
    allowed_prefixes: ['419'],
  },
  {
    category: 'CLIENTI_FURNIZORI',
    setting_key: 'AVANSURI_FURNIZORI',
    label: 'Avansuri plătite furnizorilor',
    description: 'Cont pentru facturile de avans achitate furnizorilor de mărfuri/stocuri/servicii.',
    default_symbol: '4091',
    is_required: true,
    allowed_prefixes: ['4091', '4092', '409'],
  },

  // 4. TVA
  {
    category: 'TVA',
    setting_key: 'TVA_COLECTATA',
    label: 'TVA colectată',
    description: 'TVA exigibilă aferentă livrărilor de bunuri și prestărilor de servicii taxabile (24% / 19% / 9% / 5%).',
    default_symbol: '4427',
    is_required: true,
    allowed_prefixes: ['4427', '442'],
  },
  {
    category: 'TVA',
    setting_key: 'TVA_DEDUCTIBILA',
    label: 'TVA deductibilă',
    description: 'TVA aferentă achizițiilor efectuate destinate operațiunilor taxabile.',
    default_symbol: '4426',
    is_required: true,
    allowed_prefixes: ['4426', '442'],
  },
  {
    category: 'TVA',
    setting_key: 'TVA_NEEXIGIBILA',
    label: 'TVA neexigibilă',
    description: 'TVA neexigibilă la facturare (ex: sistem TVA la încasare, adaos comercial la preț de vânzare).',
    default_symbol: '4428',
    is_required: true,
    allowed_prefixes: ['4428', '442'],
  },
  {
    category: 'TVA',
    setting_key: 'TVA_DE_PLATA',
    label: 'TVA de plată',
    description: 'Datoria fiscală către bugetul de stat rezultată din decontul periodic de TVA (4427 > 4426).',
    default_symbol: '4423',
    is_required: true,
    allowed_prefixes: ['4423', '442'],
  },
  {
    category: 'TVA',
    setting_key: 'TVA_DE_RECUPERAT',
    label: 'TVA de recuperat',
    description: 'Creanța fiscală asupra bugetului de stat rezultată când TVA deductibilă depășește TVA colectată.',
    default_symbol: '4424',
    is_required: true,
    allowed_prefixes: ['4424', '442'],
  },
  {
    category: 'TVA',
    setting_key: 'REGULARIZARE_TVA',
    label: 'Regularizări TVA la încasare',
    description: 'Cont utilizat pentru descărcarea TVA neexigibilă în momentul plății/încasării în regim TVA la încasare.',
    default_symbol: '4428',
    is_required: false,
    allowed_prefixes: ['4428', '442'],
  },

  // 5. Închiderea veniturilor și cheltuielilor
  {
    category: 'INCHIDERE_REZULTAT',
    setting_key: 'REZULTAT_EXERCITIU',
    label: 'Rezultatul exercițiului (Profit sau pierdere)',
    description: 'Contul pentru închiderea lunară a tuturor conturilor de venituri (clasa 7) și cheltuieli (clasa 6).',
    default_symbol: '121',
    is_required: true,
    allowed_prefixes: ['121'],
  },
  {
    category: 'INCHIDERE_REZULTAT',
    setting_key: 'REZULTAT_REPORTAT',
    label: 'Rezultatul reportat',
    description: 'Rezultatul reportat reprezentând profitul nerepartizat sau pierderea neacoperită din anii anteriori.',
    default_symbol: '1171',
    is_required: true,
    allowed_prefixes: ['1171', '117'],
  },
  {
    category: 'INCHIDERE_REZULTAT',
    setting_key: 'IMPOZIT_PROFIT_MICRO',
    label: 'Cheltuieli cu impozitul pe venit / profit',
    description: 'Cont de cheltuieli (698 pentru microîntreprinderi, respectiv 691 pentru plătitori de impozit pe profit).',
    default_symbol: '698',
    is_required: true,
    allowed_prefixes: ['698', '691', '69'],
  },

  // 6. Compensare clienți - furnizori
  {
    category: 'COMPENSARE',
    setting_key: 'COMPENSARE_INTERMEDIAR',
    label: 'Cont intermediar pentru compensări',
    description: 'Cont utilizat ca punte intermediară pentru stingerea reciprocă a creanțelor și datoriilor (ex: 401 = 5125 și 5125 = 4111).',
    default_symbol: '5125',
    is_required: true,
    allowed_prefixes: ['5125', '581', '473', '512'],
  },
];

/**
 * Inițializează planul de conturi și setările automate pentru o societate dată dacă nu există deja
 */
export function seedCompanyAccounts(companyId: number): void {
  const existingCount = db
    .prepare('SELECT COUNT(*) as count FROM accounting_accounts WHERE company_id = ?')
    .get(companyId) as { count: number };

  if (existingCount.count === 0) {
    const now = new Date().toISOString();

    // 1. Inserare conturi sintetice rădăcină (fără parent_symbol)
    const roots = db
      .prepare('SELECT * FROM official_chart_of_accounts WHERE parent_symbol IS NULL ORDER BY symbol ASC')
      .all() as any[];

    const insertAccount = db.prepare(`
      INSERT INTO accounting_accounts (
        company_id, symbol, name, type, parent_id, nature, allow_direct_entry, is_active, is_system, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const insertedMap = new Map<string, number>();

    const seedTx = db.transaction(() => {
      // Inserăm întâi sinteticele de grad 1 (root)
      for (const root of roots) {
        const info = insertAccount.run(
          companyId,
          root.symbol,
          root.name,
          root.type,
          null,
          root.nature,
          1,
          root.is_active,
          now,
          now
        );
        insertedMap.set(root.symbol, Number(info.lastInsertRowid));
      }

      // Inserăm apoi conturile care au parent_symbol
      const children = db
        .prepare('SELECT * FROM official_chart_of_accounts WHERE parent_symbol IS NOT NULL ORDER BY length(symbol) ASC, symbol ASC')
        .all() as any[];

      for (const child of children) {
        const parentId = insertedMap.get(child.parent_symbol) || null;
        const info = insertAccount.run(
          companyId,
          child.symbol,
          child.name,
          child.type,
          parentId,
          child.nature,
          1,
          child.is_active,
          now,
          now
        );
        insertedMap.set(child.symbol, Number(info.lastInsertRowid));
      }
    });

    seedTx();
  }

  // 2. Verificare și inițializare setări implicite conturi automate
  const existingSettingsCount = db
    .prepare('SELECT COUNT(*) as count FROM automatic_account_settings WHERE company_id = ?')
    .get(companyId) as { count: number };

  if (existingSettingsCount.count === 0) {
    const now = new Date().toISOString();
    const insertSetting = db.prepare(`
      INSERT INTO automatic_account_settings (
        company_id, category, setting_key, account_id, label, description, default_symbol, is_required, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const findAccountBySymbol = db.prepare(
      'SELECT id FROM accounting_accounts WHERE company_id = ? AND symbol = ?'
    );

    const seedSettingsTx = db.transaction(() => {
      for (const spec of DEFAULT_AUTOMATIC_SETTING_SPECS) {
        let accountId: number | null = null;
        if (spec.default_symbol) {
          const acc = findAccountBySymbol.get(companyId, spec.default_symbol) as { id: number } | undefined;
          if (acc) {
            accountId = acc.id;
          }
        }

        insertSetting.run(
          companyId,
          spec.category,
          spec.setting_key,
          accountId,
          spec.label,
          spec.description,
          spec.default_symbol,
          spec.is_required ? 1 : 0,
          now
        );
      }
    });

    seedSettingsTx();
  }
}

/**
 * Returnează planul de conturi al societății cu suport de căutare și filtrare
 */
export function getCompanyAccounts(
  companyId: number,
  options: {
    search?: string;
    nature?: string;
    type?: string;
    activeOnly?: boolean;
    directEntryOnly?: boolean;
  } = {}
): AccountItem[] {
  // Asigurăm inițializarea dacă e prima accesare
  seedCompanyAccounts(companyId);

  let query = `
    SELECT 
      a.*,
      p.symbol as parent_symbol,
      (SELECT COUNT(*) FROM accounting_accounts c WHERE c.parent_id = a.id) as has_children
    FROM accounting_accounts a
    LEFT JOIN accounting_accounts p ON a.parent_id = p.id
    WHERE a.company_id = ?
  `;

  const params: any[] = [companyId];

  if (options.activeOnly) {
    query += ' AND a.is_active = 1';
  }

  if (options.directEntryOnly) {
    query += ' AND a.allow_direct_entry = 1';
  }

  if (options.nature && ['A', 'P', 'B'].includes(options.nature.toUpperCase())) {
    query += ' AND a.nature = ?';
    params.push(options.nature.toUpperCase());
  }

  if (options.type && ['SYNTHETIC', 'ANALYTIC'].includes(options.type.toUpperCase())) {
    query += ' AND a.type = ?';
    params.push(options.type.toUpperCase());
  }

  if (options.search && options.search.trim()) {
    const s = `%${options.search.trim()}%`;
    query += ' AND (a.symbol LIKE ? OR a.name LIKE ?)';
    params.push(s, s);
  }

  query += ' ORDER BY a.symbol ASC';

  return db.prepare(query).all(...params) as AccountItem[];
}

/**
 * Returnează un cont după ID, verificând asocierea cu societatea
 */
export function getCompanyAccountById(companyId: number, accountId: number): AccountItem | null {
  return (
    (db
      .prepare(
        `SELECT a.*, p.symbol as parent_symbol 
         FROM accounting_accounts a
         LEFT JOIN accounting_accounts p ON a.parent_id = p.id
         WHERE a.company_id = ? AND a.id = ?`
      )
      .get(companyId, accountId) as AccountItem) || null
  );
}

/**
 * Creare cont analitic nou în cadrul societății
 */
export function createAnalyticAccount(
  companyId: number,
  data: {
    parent_symbol: string;
    symbol: string;
    name: string;
    nature?: 'A' | 'P' | 'B';
    allow_direct_entry?: boolean;
  },
  _userId: number
): AccountItem {
  // Asigurare existență plan
  seedCompanyAccounts(companyId);

  const cleanParentSymbol = data.parent_symbol ? data.parent_symbol.trim() : '';
  const cleanSymbol = data.symbol ? data.symbol.trim() : '';
  const cleanName = data.name ? data.name.trim() : '';

  if (!cleanParentSymbol) {
    throw new Error('Contul părinte este obligatoriu pentru crearea unui cont analitic.');
  }

  if (!cleanSymbol) {
    throw new Error('Simbolul contului analitic este obligatoriu.');
  }

  if (!cleanName || cleanName.length < 3) {
    throw new Error('Denumirea contului trebuie să aibă cel puțin 3 caractere.');
  }

  // 1. Verificare cont părinte
  const parent = db
    .prepare('SELECT * FROM accounting_accounts WHERE company_id = ? AND symbol = ?')
    .get(companyId, cleanParentSymbol) as AccountItem | undefined;

  if (!parent) {
    throw new Error(`Contul părinte "${cleanParentSymbol}" nu a fost găsit în planul de conturi al acestei societăți.`);
  }

  if (parent.is_active !== 1) {
    throw new Error(`Contul părinte "${cleanParentSymbol}" este inactiv și nu poate avea conturi analitice noi.`);
  }

  // 2. Validare structură simbol: trebuie să înceapă cu simbolul părintelui și punct (ex: 5121.01 sau 4111.0001)
  // Permitem fie '5121.01', fie dacă utilizatorul a introdus doar sufixul '01', îl concatenăm
  let finalSymbol = cleanSymbol;
  if (!cleanSymbol.startsWith(cleanParentSymbol + '.')) {
    if (cleanSymbol.startsWith('.')) {
      finalSymbol = cleanParentSymbol + cleanSymbol;
    } else if (/^[0-9A-Za-z_-]+$/.test(cleanSymbol)) {
      finalSymbol = `${cleanParentSymbol}.${cleanSymbol}`;
    } else {
      throw new Error(
        `Structura contului analitic este invalidă. Trebuie să înceapă cu "${cleanParentSymbol}." (exemplu: ${cleanParentSymbol}.01)`
      );
    }
  }

  // 3. Verificare unicitate simbol în societate
  const existing = db
    .prepare('SELECT id, name FROM accounting_accounts WHERE company_id = ? AND symbol = ?')
    .get(companyId, finalSymbol) as any;

  if (existing) {
    throw new Error(`Contul "${finalSymbol}" există deja în planul de conturi ("${existing.name}").`);
  }

  const now = new Date().toISOString();
  const nature = data.nature || parent.nature;
  const allowDirect = data.allow_direct_entry !== undefined ? (data.allow_direct_entry ? 1 : 0) : 1;

  const insert = db.prepare(`
    INSERT INTO accounting_accounts (
      company_id, symbol, name, type, parent_id, nature, allow_direct_entry, is_active, is_system, created_at, updated_at
    ) VALUES (?, ?, ?, 'ANALYTIC', ?, ?, ?, 1, 0, ?, ?)
  `);

  const info = insert.run(
    companyId,
    finalSymbol,
    cleanName,
    parent.id,
    nature,
    allowDirect,
    now,
    now
  );

  return getCompanyAccountById(companyId, Number(info.lastInsertRowid))!;
}

/**
 * Editare cont existent (denumire, activ/inactiv, înregistrări directe)
 */
export function updateCompanyAccount(
  companyId: number,
  accountId: number,
  data: {
    name?: string;
    is_active?: boolean;
    allow_direct_entry?: boolean;
  },
  _userId: number
): AccountItem {
  const current = getCompanyAccountById(companyId, accountId);
  if (!current) {
    throw new Error('Contul specificat nu există în această societate.');
  }

  // Verificare blocare dezactivare cont dacă este configurat în conturi automate
  if (data.is_active === false && current.is_active === 1) {
    const linkedSettings = db
      .prepare('SELECT label, setting_key FROM automatic_account_settings WHERE company_id = ? AND account_id = ?')
      .all(companyId, accountId) as any[];

    if (linkedSettings.length > 0) {
      const labels = linkedSettings.map(s => s.label).join(', ');
      throw new Error(
        `Contul ${current.symbol} nu poate fi dezactivat deoarece este setat ca și cont automat implicit pentru: ${labels}. Vă rugăm să alegeți mai întâi alt cont pentru aceste setări.`
      );
    }
  }

  const newName = data.name !== undefined ? data.name.trim() : current.name;
  if (!newName || newName.length < 3) {
    throw new Error('Denumirea contului trebuie să conțină cel puțin 3 caractere.');
  }

  const newActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active;
  const newDirect = data.allow_direct_entry !== undefined ? (data.allow_direct_entry ? 1 : 0) : current.allow_direct_entry;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE accounting_accounts 
    SET name = ?, is_active = ?, allow_direct_entry = ?, updated_at = ?
    WHERE company_id = ? AND id = ?
  `).run(newName, newActive, newDirect, now, companyId, accountId);

  return getCompanyAccountById(companyId, accountId)!;
}

/**
 * Returnează setările conturilor automate ale societății
 */
export function getAutomaticSettingsForCompany(companyId: number): AutomaticAccountSettingItem[] {
  seedCompanyAccounts(companyId);

  const query = `
    SELECT 
      s.*,
      a.symbol as account_symbol,
      a.name as account_name,
      a.nature as account_nature,
      a.type as account_type,
      a.is_active as account_is_active
    FROM automatic_account_settings s
    LEFT JOIN accounting_accounts a ON s.account_id = a.id
    WHERE s.company_id = ?
    ORDER BY s.id ASC
  `;

  return db.prepare(query).all(companyId) as AutomaticAccountSettingItem[];
}

/**
 * Actualizare setări conturi automate cu validare strictă, compatibilitate și jurnalizare istoric
 */
export function updateAutomaticSettings(
  companyId: number,
  updates: Array<{
    setting_key: string;
    account_id: number | null;
    notes?: string;
  }>,
  userId: number,
  userName?: string
): AutomaticAccountSettingItem[] {
  seedCompanyAccounts(companyId);

  const getSettingStmt = db.prepare(`
    SELECT s.*, a.symbol as current_symbol, a.name as current_name
    FROM automatic_account_settings s
    LEFT JOIN accounting_accounts a ON s.account_id = a.id
    WHERE s.company_id = ? AND s.setting_key = ?
  `);

  const getAccountStmt = db.prepare(`
    SELECT * FROM accounting_accounts WHERE company_id = ? AND id = ?
  `);

  const updateSettingStmt = db.prepare(`
    UPDATE automatic_account_settings
    SET account_id = ?, updated_at = ?, updated_by = ?
    WHERE company_id = ? AND setting_key = ?
  `);

  const insertHistoryStmt = db.prepare(`
    INSERT INTO automatic_account_setting_history (
      company_id, setting_key, category, old_account_id, new_account_id,
      old_account_symbol, new_account_symbol, old_account_name, new_account_name,
      changed_by, changed_by_name, changed_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  const updateTx = db.transaction(() => {
    for (const update of updates) {
      const currentSetting = getSettingStmt.get(companyId, update.setting_key) as any;
      if (!currentSetting) {
        throw new Error(`Setarea automată "${update.setting_key}" nu este recunoscută în sistem.`);
      }

      let newAccount: AccountItem | null = null;
      if (update.account_id !== null && update.account_id !== undefined) {
        newAccount = getAccountStmt.get(companyId, update.account_id) as AccountItem | undefined || null;
        if (!newAccount) {
          throw new Error(
            `Contul selectat pentru "${currentSetting.label}" nu aparține acestei societăți sau nu există.`
          );
        }

        // 1. Verificare cont activ (cerință: blocarea utilizării conturilor inactive)
        if (newAccount.is_active !== 1) {
          throw new Error(
            `Contul "${newAccount.symbol} - ${newAccount.name}" este inactiv și nu poate fi setat ca și cont automat implicit.`
          );
        }

        // 2. Validare compatibilitate specifică categoriei
        const spec = DEFAULT_AUTOMATIC_SETTING_SPECS.find(s => s.setting_key === update.setting_key);
        if (spec && spec.allowed_prefixes.length > 0) {
          const isCompatible = spec.allowed_prefixes.some(prefix => newAccount!.symbol.startsWith(prefix));
          if (!isCompatible) {
            // Nu blocăm dacă utilizatorul a creat un cont personalizat, dar semnalizăm avertisment dacă e din altă clasă
            const expectedClasses = spec.allowed_prefixes.map(p => `clasa ${p[0]}`).join(' sau ');
            if (newAccount.symbol[0] !== spec.default_symbol[0]) {
              throw new Error(
                `Contul "${newAccount.symbol}" nu este compatibil cu operațiunea "${currentSetting.label}". Se așteaptă un cont compatibil (${expectedClasses}).`
              );
            }
          }
        }
      } else {
        // Dacă este marcat ca obligatoriu, nu permitem golirea lui
        if (currentSetting.is_required === 1) {
          throw new Error(`Câmpul "${currentSetting.label}" este obligatoriu și nu poate fi lăsat necompletat.`);
        }
      }

      // Verificăm dacă s-a schimbat contul
      const oldAccountId = currentSetting.account_id;
      const newAccountId = newAccount ? newAccount.id : null;

      if (oldAccountId !== newAccountId) {
        // Scriem înregistrare în istoricul de trasabilitate
        insertHistoryStmt.run(
          companyId,
          currentSetting.setting_key,
          currentSetting.category,
          oldAccountId,
          newAccountId,
          currentSetting.current_symbol || null,
          newAccount ? newAccount.symbol : null,
          currentSetting.current_name || null,
          newAccount ? newAccount.name : null,
          userId,
          userName || 'Utilizator',
          now,
          update.notes || 'Actualizare manuală configurare conturi automate'
        );

        // Actualizăm valoarea
        updateSettingStmt.run(
          newAccountId,
          now,
          userId,
          companyId,
          update.setting_key
        );
      }
    }
  });

  updateTx();

  return getAutomaticSettingsForCompany(companyId);
}

/**
 * Returnează istoricul modificărilor conturilor automate pentru o societate
 */
export function getAutomaticSettingsHistory(companyId: number, settingKey?: string): AutomaticAccountHistoryItem[] {
  let query = `
    SELECT h.*
    FROM automatic_account_setting_history h
    WHERE h.company_id = ?
  `;
  const params: any[] = [companyId];

  if (settingKey) {
    query += ' AND h.setting_key = ?';
    params.push(settingKey);
  }

  query += ' ORDER BY h.id DESC LIMIT 100';

  return db.prepare(query).all(...params) as AutomaticAccountHistoryItem[];
}

/**
 * Returnează catalogul oficial de conturi OMFP 1802/2014
 */
export function getOfficialChartOfAccountsCatalog(): any[] {
  return db.prepare('SELECT * FROM official_chart_of_accounts ORDER BY symbol ASC').all();
}
