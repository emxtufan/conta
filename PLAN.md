# PLAN — Saga Clonner

## Obiectiv
Aplicație de contabilitate RO inspirată funcțional de SAGA C (cod propriu). Etape: 1 Configurare societăți ✅, 2 Conturi automate + Plan de conturi ✅, 3 Setări diverse ✅, 4 Preluare date contabile (balanța de pornire) ✅ implementat, teste în curs, 5 Preluare stocuri inițiale ⏳ următorul.

## Decizii Etapa 4
- Sume: aritmetică în bani întregi (src/server/money.ts); stocare REAL cu 2 zecimale; parser RO strict ('.' mii, ',' zecimale, max 2 zecimale, grupuri de 3 obligatorii) — „1234.56” în format RO = eroare (ambiguu).
- Un lot de preluare per (societate, exercițiu): accounting_opening_batches; stări DRAFT → IN_VERIFICATION (după „Verifică” fără erori) → VALIDATED. Tip preluare: NO_ACTIVITY / YEAR_START (luna 1, precedent = inițial) / DURING_YEAR (luna 2–12, precedent = cumulat inclusiv sold inițial).
- Sold final = max(DP−CP,0) / max(CP−DP,0). Echilibrul se verifică doar pe totaluri (DI=CI, DP=CP), pe linii frunză; sinteticele cu analitice sunt totalizatoare; valori directe pe sintetic + analitice = eroare de dublare.
- Valută: currency, currency_amount, exchange_rate, exchange_rate_date, exchange_rate_source pe linie; totalurile doar în moneda contabilă; avertizare dacă sumă×curs diferă de echivalent cu >1 leu; fără reevaluare.
- Terți (accounting_opening_counterparty_items): doar detaliu analitic, nu generează înregistrări; verificare pe cont: Σ rest în RON = sold de justificat; prefixe 401/403/404/408 furnizori, 411/413/418 clienți; data documentului < data preluării.
- Repartizare sintetic → analitice (redistributeToAnalytics) cu conservare exactă pe cele 4 coloane.
- Import CSV/XLSX stateless: parse → asociere coloane → preview server → commit tranzacțional care ÎNLOCUIEȘTE liniile; amprentă conținut (sha256) în accounting_opening_imports pentru detecție duplicat; confirmări explicite (reimport, înlocuire).
- Copiere din altă societate: doar din balanță VALIDATĂ, același an/tip/lună, mapare pe simbol, ADMIN pe ambele societăți, proveniență (value_source='COPY', source_company_id, amprenta sursei în log). Terții nu se copiază.
- Validare: amprentă SHA-256 deterministă (computeOpeningIntegrityHash); companies.opening_status='VALIDATED'. Devalidare: ADMIN + motiv; blocată dacă există operațiuni ulterioare (tabela accounting_entries, inexistentă încă → countSubsequentOperations=0).
- Concurență: optimistic locking pe version (409 CONFLICT).
- Serviciu pentru motorul viitor: getOpeningBalances(companyId, fiscalYear, startPeriod) + GET /api/companies/:id/opening-balance/snapshot — doar date validate, verifică amprenta, separă opening / previous_totals / previous_turnover / balance_at_start; nu creează note contabile.

## Fișiere Etapa 4
Backend: src/server/money.ts, openingBalance.ts, openingImport.ts, openingExport.ts, openingCopy.ts, db.ts (migrații), server.ts (rute /api/companies/:id/opening-balance/*). Frontend: src/components/opening/OpeningBalanceView.tsx, OpeningImportModal.tsx, OpeningCounterpartiesPanel.tsx, OpeningHistoryModal.tsx, RedistributeModal.tsx, CompanyCopyModal.tsx, CurrencyDetailsModal.tsx; Sidebar.tsx, App.tsx. Teste: src/server/openingTests.ts, scripts/run-tests.ts (`npm test`, DB temporară).

## Pași Etapa 4
- [x] Motor de calcul în bani, verificări, stări, validare/devalidare
- [x] Valută, terți, repartizare
- [x] Import CSV/XLSX, șablon, export CSV/XLSX
- [x] Copiere controlată din altă societate
- [x] Interfață completă
- [ ] Teste automate rulate și trecute
- [ ] Test manual în browser

## Probleme deschise / limitări
- Loturile validate înainte de amprenta deterministă (dacă există în DB-ul de dezvoltare) vor da eroare de amprentă la getOpeningBalances → re-validare.
- Ștergerea/inactivarea unui cont din plan după validare nu e blocată în modulul planului de conturi.
- Lucrul cu proceduri de muncitor: fișierele sursă sunt LF (core.autocrlf=input) — edit_file al muncitorului nu suportă CRLF.
