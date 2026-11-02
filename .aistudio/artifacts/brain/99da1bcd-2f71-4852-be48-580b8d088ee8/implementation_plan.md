# Contabilitate RO — Etapa 1: Arhitectură & Configurare Societăți

Aplicație profesională completă de gestiune contabilă și financiară pentru România, construită modular pornind de la structura de referință a ERP-urilor românești (stil SAGA C), cu implementare originală, server backend dedicat, persistență relațională, autentificare securizată și modulul complet Configurare Societăți.

## User Review & Critical Decisions

> [!IMPORTANT]
> Deciziile arhitecturale cheie confirmate în Faza 1:
> - **Persistență Relațională**: Bază de date relațională server-side persistentă (SQLite în modul WAL cu tranzacții ACID, constrângeri de integritate referențială `FOREIGN KEY`, și schemă strict compatibilă PostgreSQL / Drizzle).
> - **Autentificare & Sesiuni**: Autentificare securizată prin backend cu utilizatori, parole hash-uite (PBKDF2/Argon2/bcrypt), token-uri de sesiune securizate și middleware de autorizare pe fiecare rută API.
> - **Primul contact (Zero-State)**: La prima autentificare, dacă utilizatorul nu are nicio societate configurată, sistemul deschide direct formularul complet structurat pe 6 taburi pentru crearea primei societăți.

---

## 1. Overview & Core Concept

- **Ce realizează**: Aplicația oferă un mediu de lucru multi-firmă accesibil simultan din browser pe mai multe stații de lucru, cu izolare strictă a datelor per societate, gestiune a permisiunilor de acces și configurare completă a parametrilor statutari, fiscali și de adresabilitate ai entităților economice din România.
- **Utilizatori țintă**: Contabili autorizați, experți contabili, directori economici și antreprenori români care au nevoie de un sistem robust de evidență financiară.
- **Valoare livrată în Etapa 1**: Infrastructura de bază ERP funcțională (Backend Express + Bază de date + Frontend React Tailwind v4), autentificare, selector de firmă activă cu protecție la nivel de sesiune, lista societăților cu filtre/căutare și formularul avansat pe 6 taburi pentru societăți, pregătit pentru modulele contabile ulterioare.

---

## 2. User Experience & Visual Design

### Fluxuri Utilizator Principale
1. **Autentificare**: Ecran de conectare cu credențiale securizate, sesiune persistentă și deconectare rapidă.
2. **Onboarding societate inițială**: Detectarea automată a absenței societăților asociate și comutarea automată pe formularul pe 6 taburi cu generarea codului intern `0001`.
3. **Navigare în Dashboard**:
   - **Header de lucru**: Denumirea aplicației, selectorul companiei active (cu dropdown inteligent, badge de stare, CUI și schimbare context), comutator Light/Dark mode și profil utilizator conectat.
   - **Sidebar ERP**: Meniu structurat conform nomenclatorului contabil românesc:
     1. Acasă
     2. Configurare (Configurare societăți - *Activ*, Configurare salarii - *Etapă viitoare*, Configurare utilizatori - *Etapă viitoare*)
     3. Nomenclatoare (*Etapă viitoare*)
     4. Operații (*Etapă viitoare*)
     5. Situații (*Etapă viitoare*)
     6. Diverse (*Etapă viitoare*)
     7. Administrare (*Etapă viitoare*)
     8. Ajutor (*Etapă viitoare*)
4. **Lista Societăților**: Tabel profesional de date cu paginare, căutare live (denumire/CUI), filtre de stare (active/inactive), acțiuni rapide (Editare, Selectare ca activă, Activare/Dezactivare) și prevenirea ștergerii dacă există dependențe.
5. **Formularul Societății (6 Taburi)**:
   - **Tab 1: Date generale**: Cod intern generat automat (fără reutilizare), denumire, atribut fiscal separat (RO / neplătitor), CUI/CIF cu verificare sintactică și calcul cifră de control, Nr. Reg. Com. (format J/F/C), tip contabilitate (Comercială, Micro, ONG, etc.), Cod CAEN cu versiune/valabilitate, capital social, monedă, data începerii evidenței, status.
   - **Tab 2: Sediu social**: Adresă completă structurată pe câmpuri independente (Țară, Județ, Localitate, Sector, Cod poștal, Stradă, Număr, Bloc, Scară, Etaj, Apartament, Date contact) + opțiune distinctă de Domiciliu fiscal dacă diferă de sediul social.
   - **Tab 3: Conturi bancare**: Gestionare nelimitată de conturi (Bancă, IBAN cu validare MOD 97 și format ISO 13616, Monedă, Titular, Cont implicit per monedă, Activ/Inactiv).
   - **Tab 4: Configurare fiscală**: Istoric fiscal cronologic (fără suprapuneri) cu dată început/sfârșit: plătitor TVA, periodicitate (lunar/trimestrial), TVA la încasare (da/nu), tip impozitare (Micro/Profit/Specific), perioadă fiscală.
   - **Tab 5: Setări gestiune**: Parametrizare pregătitoare (Gestionează stocuri: da/nu, metodă evaluare FIFO/CMP, metodă inventar permanent/intermitent).
   - **Tab 6: Setări suplimentare**: Serii documente, preferințe de lucru, date de contact și observații interne.

### Direcție Vizuală & Ergonomie
- **Design System**: Enterprise SaaS / ERP cu contrast ridicat, conform constituției `frontend-design` și ghidului `3_saas_dashboard.md`.
- **Tipografie**: `Plus Jakarta Sans` pentru structura grafică și navigare, cuplat cu `JetBrains Mono` / `tabular-nums` pentru date numerice, CUI, IBAN, coduri CAEN și registre.
- **Paletă Cromatică**: 60% pânză neutră (alb / ardezie închisă `#0f172a`), 30% suprafețe structurale (`#f8fafc` / `#1e293b`, borduri discrete fine de 1px), 10% accent albastru profesional ERP (`#2563eb`).
- **Zero-Pill Discipline**: Metadate afișate prin text curat cu separatori tipografici (`·`), fără etichete ornamentale sau statusuri false.

---

## 3. Key Product Decisions & Trade-Offs

- **Bază de date server-side SQLite (WAL Mode)**:
  - *Abordare*: Baza de date este găzduită pe serverul Node.js în `/data/contabilitate.db`, folosind mod WAL (Write-Ahead Logging) pentru concurență multi-client, constrângeri de integritate referențială și tranzacții atomice.
  - *De ce*: Asigură persistență reală, fără date pierdute la refresh, compatibilitate 100% cu interogările SQL standard și izolare garantată a tranzacțiilor.
- **Controlul Concurenței (Optimistic Locking)**:
  - *Abordare*: Fiecare societate deține o coloană `version` incrementată la fiecare salvare. Dacă un al doilea utilizator încearcă să salveze o versiune modificată între timp de pe alt laptop, serverul respinge salvarea cu cod HTTP 409 Conflict și afișează utilizatorului modificările concurente fără pierdere mută de date.
- **Validare CUI & IBAN pe două niveluri**:
  - *Frontend*: Validare instantă la tastare cu feedback vizual (lungime, caractere, algoritmul românesc de control modulo 11 pentru CUI și algoritmul ISO 7064 MOD 97-10 pentru IBAN).
  - *Backend*: Re-validare obligatorie înainte de orice operațiune de scriere în baza de date.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arhitectură a Sistemului

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER (React SPA)                      │
│                                                                        │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │   Sidebar (ERP Nav)  │  │   Top Header (Companie activă, Auth)   │  │
│  └──────────────────────┘  └────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Router & Viewports                           │  │
│  │  ┌─────────────────────────┐  ┌───────────────────────────────┐  │  │
│  │  │ Lista Societăți (Tabel) │  │ Formular 6 Taburi (Edit/Add)  │  │  │
│  │  └─────────────────────────┘  └───────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST API (Bearer Session)
┌───────────────────────────────────▼────────────────────────────────────┐
│                      BACKEND SERVER (Node.js Express)                  │
│                                                                        │
│  ┌────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐ │
│  │  Auth & Session    │  │ Company Controller   │  │ Concurrency /   │ │
│  │  Middleware        │  │ & Validations        │  │ Optimistic Lock │ │
│  └────────────────────┘  └──────────────────────┘  └─────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                Database Access Layer & Transactions               │ │
│  └───────────────────────────────────┬───────────────────────────────┘ │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ SQL Queries & Migrations
┌──────────────────────────────────────▼─────────────────────────────────┐
│                 RELATIONAL DATABASE (contabilitate.db)                 │
│                                                                        │
│  • users                 • companies                • addresses        │
│  • bank_accounts         • fiscal_regimes (istoric) • settings         │
│  • user_company_access   • audit_logs               • caen_codes       │
└────────────────────────────────────────────────────────────────────────┘
```

### Schema Tabelelor Relaționale (Normalizate)

1. **`users`**: `id` (PK), `email` (UNIQUE), `password_hash`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`.
2. **`companies`**: `id` (PK), `internal_code` (UNIQUE, ex: '0001'), `name`, `cui` (UNIQUE), `fiscal_attribute` (RO/null), `reg_com`, `accounting_type`, `caen_code`, `share_capital`, `currency`, `start_date`, `is_active`, `version` (optimistic locking), `created_by`, `updated_by`, `created_at`, `updated_at`.
3. **`company_addresses`**: `id` (PK), `company_id` (FK), `type` ('HEADQUARTERS' | 'FISCAL_DOMICILE'), `country`, `county`, `city`, `sector`, `postal_code`, `street`, `number`, `building`, `staircase`, `floor`, `apartment`, `phone`, `email`.
4. **`company_bank_accounts`**: `id` (PK), `company_id` (FK), `bank_name`, `iban` (UNIQUE per company), `currency`, `holder_name`, `is_default`, `is_active`, `created_at`.
5. **`company_fiscal_regimes`**: `id` (PK), `company_id` (FK), `start_date`, `end_date` (NULL if ongoing), `is_vat_payer`, `vat_periodicity` ('MONTHLY' | 'QUARTERLY'), `vat_on_collection` (BOOLEAN), `taxation_type` ('MICRO' | 'PROFIT' | 'SPECIFIC'), `fiscal_period`, `created_at`.
6. **`company_settings`**: `id` (PK), `company_id` (FK, UNIQUE), `manages_inventory` (BOOLEAN), `inventory_evaluation_method` ('FIFO' | 'CMP'), `inventory_type` ('PERMANENT' | 'INTERMITTENT'), `document_series_config` (JSON), `display_preferences` (JSON), `internal_notes` (TEXT).
7. **`user_company_access`**: `id` (PK), `user_id` (FK), `company_id` (FK), `role` ('ADMIN' | 'ACCOUNTANT' | 'VIEWER'), `granted_at`.
8. **`audit_logs`**: `id` (PK), `company_id` (FK, nullable), `user_id` (FK), `entity_type`, `entity_id`, `action` ('CREATE' | 'UPDATE' | 'DEACTIVATE'), `old_values` (JSON), `new_values` (JSON), `timestamp`.
9. **`caen_codes`**: `code` (PK), `title`, `version` (ex: 'Rev.2'), `valid_from`, `valid_to`.

### Matricea de Teste de Acceptanță (12 Cazuri de Test Automate & Manuale)
1. **Creare prima societate**: Utilizatorul autorizat este direcționat automat către crearea societății.
2. **Persistență**: Societatea creată persistă în DB și reapare identic după refresh complet sau redeschidere browser.
3. **Generare cod intern**: Codurile se incrementează automat (`0001`, `0002`) fără posibilitate de coliziune sau refolosire.
4. **Respingere CUI invalid**: Validarea sintactică și cifra de control resping CUI-uri incorecte cu mesaj explicativ.
5. **Salvare date subsidiare**: Adresa, conturile bancare multiple și setările sunt salvate tranzacțional.
6. **Respingere IBAN invalid**: Cifra de control MOD 97 și structura RO resping IBAN-urile eronate.
7. **Editare societate**: Actualizările sunt reflectate corect în tabele și în istoricul de audit.
8. **Păstrare istoric fiscal**: Modificarea regimului TVA generează intervale fără suprapuneri și păstrează istoricul neschimbat.
9. **Blocare selecție inactivă**: O firmă marcată inactivă nu poate fi aleasă ca societate de lucru activă.
10. **Izolare autorizată la nivel de API**: Cererile pe societăți la care utilizatorul nu are acces returnează HTTP 403 Forbidden.
11. **Izolare context societate**: Schimbarea companiei active în header comută instantaneu tot contextul fără amestec de date.
12. **Conflict de concurență (Optimistic Locking)**: Salvarea concomitentă din 2 sesiuni diferite detectează versiunea desincronizată și returnează eroare 409 Conflict.
