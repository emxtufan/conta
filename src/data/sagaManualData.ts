export interface ManualEntry {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  chapterNumber: number;
  chapterName: string;
  parentId: string | null;
  code: string;
  officialUrl: string;
  summary: string;
  tags: string[];
  shortcuts?: string[];
  keyAccounts?: string[];
  regulations?: string[];
  content: string;
  keySteps?: string[];
  practicalTips?: string[];
}

export const SAGA_MANUAL_ENTRIES: ManualEntry[] = [
  // ----------------------------------------------------
  // CAPITOLUL 1: INTRODUCERE
  // ----------------------------------------------------
  {
    id: "introducere",
    title: "Introducere",
    level: 1,
    chapterNumber: 1,
    chapterName: "Introducere",
    parentId: null,
    code: "1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#introducere",
    summary: "Prezentarea generală a programului SAGA C, destinația soluției pentru contabilitate financiară și de gestiune, cerințe de sistem și arhitectura modulară.",
    tags: ["introducere", "prezentare", "instalare", "compatibilitate", "cerinte sistem"],
    shortcuts: ["F1 - Manual context"],
    regulations: ["Legea contabilității nr. 82/1991", "OMFP 1802/2014"],
    content: "SAGA C este un sistem integrat de evidență contabilă în partidă dublă, stocuri și gestiune comercială, salarizare și producție destinat societăților comerciale, microîntreprinderilor, ONG-urilor și cabinetelor de contabilitate autorizate din România. Aplicația este concepută pentru operare ergonomică în regim mono-post sau rețea client-server, având la bază o viteză ridicată de procesare a datelor și conformitate riguroasă cu legislația fiscală din România.",
    keySteps: [
      "Instalarea kitului de bază SAGA C de pe site-ul oficial sagasoft.ro",
      "Crearea primului director de lucru (implicit C:\\SAGA C.3.0)",
      "Verificarea setărilor regionale Windows (format dată: zz.ll.aaaa, separator zecimal: virgulă sau punct)",
      "Inițializarea primei firme din meniul Configurare societăți"
    ],
    practicalTips: [
      "Efectuați întotdeauna backup înainte de orice actualizare de versiune din Administrare > Întreținere BD.",
      "Tasta F1 apelată în orice fereastră a aplicației deschide secțiunea din manual dedicată acelui ecran."
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 2: LICENTE
  // ----------------------------------------------------
  {
    id: "licente",
    title: "Licente",
    level: 1,
    chapterNumber: 2,
    chapterName: "Licente",
    parentId: null,
    code: "2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#licente",
    summary: "Condiții de licențiere, obținerea codurilor de activare, abonamentul anual de asistență și actualizări legislative.",
    tags: ["licenta", "activare", "abonament", "cod identificare", "actualizare"],
    shortcuts: ["Ajutor > Actualizare automata"],
    regulations: ["Contract de asistență și mentenanță Saga Software"],
    content: "Programul SAGA C se poate utiliza gratuit în variantă de bază (fără parolă la actualizări ulterioare pentru versiuni gratuite), iar accesul la versiunile actualizate periodic conform modificărilor Codului Fiscal, declarațiilor ANAF (D112, D300, D390, D394, D406 SAF-T) se face pe bază de abonament anual.",
    keySteps: [
      "Notarea codului de identificare generat unic de calculator la primul start",
      "Încheierea contractului de asistență pe portalul www.sagasoft.ro",
      "Introducerea codurilor de activare primite pe e-mail sau descărcate automat prin contul de utilizator",
      "Validarea stării licenței pentru fiecare modul activat (Contabilitate, Stocuri, Salarii)"
    ],
    practicalTips: [
      "Pentru a actualiza fără erori, închideți SAGA pe toate calculatoarele din rețea înainte de instalarea actualizării.",
      "Puteți verifica data expirării abonamentului direct în ecranul Ajutor > Despre."
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 3: CONSIDERATII GENERALE
  // ----------------------------------------------------
  {
    id: "consideratii-generale",
    title: "Consideratii generale",
    level: 1,
    chapterNumber: 3,
    chapterName: "Consideratii generale",
    parentId: null,
    code: "3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#consideratii-generale",
    summary: "Convenții de operare, structura ecranelor (antet și detalii), funcțiile butoanelor standard și scurtăturile din tastatură.",
    tags: ["interfata", "scurtaturi", "taste rapide", "butoane", "antet detalii"],
    shortcuts: ["F2 - Adăugare rând", "F3 - Modificare", "F4 - Salvare", "F7 - Căutare", "F10 - Ieșire"],
    content: "Toate ecranele de operare documente din SAGA C respectă o structură standard pe două tabele corelate: panoul de sus (antetul documentului: număr, serie, terț, dată, scadență) și panoul de jos (detaliile documentului: linii de articole, servicii, conturi, cantități, prețuri unitare, TVA).",
    keySteps: [
      "Fiecare tabel are bara proprie de butoane: Adaug, Modific, Sterg, Salvez, Renunt, Tiparire",
      "Trecerea de la un câmp la altul se recomandă să se facă cu tasta ENTER sau TAB pentru a declanșa calculele automate",
      "Salvarea antetului deblochează automat panoul de jos pentru introducerea liniilor de detaliu",
      "Validarea documentului generează nota contabilă și actualizează stocurile și situația terților"
    ],
    practicalTips: [
      "Utilizați cu precădere tasta ENTER pentru avansare; aceasta validează automat valorile introduse.",
      "Butonul 'Validare' blochează modificările accidentale; dacă doriți să corectați, apăsați 'Devalidez'."
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 4: CONFIGURARE
  // ----------------------------------------------------
  {
    id: "configurare",
    title: "Configurare",
    level: 1,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: null,
    code: "4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#configurare",
    summary: "Parametrizarea inițială a aplicației: date fiscale firmă, cote TVA, conturi implicite, preluare solduri și utilizatori.",
    tags: ["configurare", "societati", "setari", "salarii", "utilizatori"],
    content: "Meniul Configurare este punctul de pornire pentru orice entitate contabilă definită în SAGA C. Aici se stabilesc regimul fiscal al societății (plătitor/neplătitor de TVA, TVA la încasare, micro/profit), conturile automate folosite la închiderea lunii, soldurile inițiale de pornire și drepturile utilizatorilor.",
    keySteps: [
      "Crearea societății și completarea CUI-ului (cu preluare automată a datelor de pe serverul ANAF)",
      "Setarea conturilor automate pentru descărcare de gestiune și TVA",
      "Preluarea datelor contabile (solduri de pornire din balanța anterioară)",
      "Stabilirea utilizatorilor și a permisiunilor de acces"
    ]
  },
  {
    id: "configurare-societati",
    title: "Configurare societati",
    level: 2,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare",
    code: "4.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#configurare-societati",
    summary: "Datele de identificare ale firmei, verificare automată ANAF, regim TVA, conturi bancare și opțiuni de lucru.",
    tags: ["societate", "cui", "banca", "tva la incasare", "anaf"],
    shortcuts: ["F2 - Creare firmă nouă"],
    regulations: ["Codul Fiscal Art. 316 (Înregistrare TVA)", "Art. 282 (TVA la încasare)"],
    content: "Ecranul Configurare societăți permite crearea și întreținerea listei de societăți gestionate. Pentru fiecare firmă se introduc datele complete: Cod Fiscal, Nr. Reg. Com., adresă sediu, capital social, conturi bancare principale IBAN, precum și bifarea opțiunilor esențiale: Plătitor de TVA, Aplică TVA la încasare, Cu operații în valută, etc.",
    keySteps: [
      "Apăsați 'Adaug' și introduceți CUI-ul societății",
      "Apăsați butonul 'Verificare' pentru descărcarea automată a denumirii, adresei, stării TVA și TVA la încasare de pe ANAF",
      "Introduceți data începerii activității în program (luna și anul)",
      "Selectați moneda de bază și opțiunile de gestiune stocuri (FIFO, CMP, LIFO)"
    ],
    practicalTips: [
      "Bifa 'Aplică TVA la încasare' influențează direct modul în care SAGA C generează notele contabile cu conturile 4428.TP și 4428.TI.",
      "Păstrați la zi informația despre perioada fiscală TVA (lunar / trimestrial) din Setări diverse."
    ]
  },
  {
    id: "conturi-automate",
    title: "Conturi automate",
    level: 3,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare-societati",
    code: "4.1.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#conturi-automate",
    summary: "Definirea conturilor folosite de program pentru notele contabile automate generate la închiderea lunii sau la documente.",
    tags: ["conturi automate", "inchidere", "121", "4423", "4424", "607", "707"],
    keyAccounts: ["121", "4423", "4424", "4426", "4427", "4428", "665", "765", "668", "768"],
    regulations: ["Planul de conturi general OMFP 1802/2014"],
    content: "Fila Conturi automate stabilește planul de legătură pe care SAGA C îl folosește la operațiunile de descărcare automată: contul de rezultat al exercițiului (121), TVA de plată (4423), TVA de recuperat (4424), diferențe de curs valutar favorabile (765/768) și nefavorabile (665/668), precum și contul de decontare cu terții neidentificați.",
    keySteps: [
      "Verificați corespondența conturilor implicite cu planul de conturi al societății",
      "Dacă folosiți analitice pentru profit/pierdere (ex. 121.1), specificați analiticul corespunzător",
      "Asigurați-vă că sunt specificate conturile pentru rotunjiri (6588 / 7588)"
    ]
  },
  {
    id: "setari-diverse",
    title: "Setari diverse",
    level: 3,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare-societati",
    code: "4.1.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#setari-diverse",
    summary: "Opțiuni avansate de listare, rotunjiri, avertizări de stoc negativ, blocare introducere documente în perioade închise.",
    tags: ["setari diverse", "stoc negativ", "blocare perioada", "format tiparire"],
    content: "În această secțiune se personalizează funcționarea aplicației în raport cu politicile contabile interne: blocarea operării fără stoc disponibil, avertizare la depășirea termenelor de plată ale clienților, afișarea datelor delegatului pe factură, activarea suportului pentru e-Factura și e-Transport.",
    keySteps: [
      "Configurați avertizările de stoc și posibilitatea descărcării cu stoc negativ",
      "Bifați setarea de verificare a CUI la salvarea documentelor",
      "Stabiliți textul implicit de tipărit în subsolul facturilor (mențiuni TVA, clauze contractuale)"
    ]
  },
  {
    id: "preluare-date-contabile",
    title: "Preluare date contabile",
    level: 3,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare-societati",
    code: "4.1.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#preluare-date-contabile",
    summary: "Introducerea balanței de verificare la data începerii evidenței în SAGA C, rulaje cumulate și solduri inițiale.",
    tags: ["balanta initiala", "preluare solduri", "rulaje an", "cont 891"],
    keyAccounts: ["891 - Bilanț de deschidere"],
    regulations: ["OMFP 1802/2014 Secțiunea Bilanț de deschidere"],
    content: "Preluarea datelor se face pe baza ultimei balanțe încheiate înainte de trecerea pe SAGA C. Dacă trecerea se face în cursul anului, se completează atât soldurile la începutul anului (01 ianuarie), cât și rulajele cumulate până la luna precedentă începerii lucrului, permițând generarea corectă a balanțelor cu 4 sau 5 egalități.",
    keySteps: [
      "Introduceți data bilanțului de pornire",
      "Completați soldurile inițiale debitoare și creditoare",
      "Dacă începeți în cursul anului, completați coloanele de rulaje precedente",
      "Verificați egalitatea bilanțului (Total Debit = Total Credit)"
    ],
    practicalTips: [
      "Nu validați luna de început dacă Total Debit nu este perfect egal cu Total Credit.",
      "Soldurile terților (401, 4111) se introduc detaliat pe fiecare furnizor/client în utilitarul de preluare solduri terți."
    ]
  },
  {
    id: "preluare-stocuri-initiale",
    title: "Preluare stocuri initiale",
    level: 3,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare-societati",
    code: "4.1.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#preluare-stocuri-initiale",
    summary: "Încărcarea inventarului inițial de materii prime, mărfuri, produse finite pe gestiuni și prețuri unitare.",
    tags: ["stocuri initiale", "inventar", "pret achizitie", "gestiuni"],
    keyAccounts: ["301", "302", "303", "371", "345"],
    content: "Pentru firmele cu evidență cantitativ-valorică este obligatorie încărcarea stocurilor existente la data preluării. Se selectează gestiunea, codul articolului, unitatea de măsură, cantitatea faptică existentă și prețul unitar de înregistrare.",
    keySteps: [
      "Definiți gestiunile în Nomenclatoare > Gestiuni",
      "Definiți articolele în Nomenclatoare > Articole",
      "Introduceți cantitățile și prețurile în ecranul de Preluare stocuri",
      "Valoarea totală a stocurilor preluate trebuie să coincidă cu soldul conturilor de stocuri din Preluare date contabile"
    ]
  },
  {
    id: "configurare-salarii",
    title: "Configurare salarii",
    level: 2,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare",
    code: "4.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#configurare-salarii",
    summary: "Procente de contribuții sociale (CAS, CASS, CAM), deduceri personale, facilități fiscale pentru construcții/IT/agricol.",
    tags: ["salarii", "cas", "cass", "cam", "deducere", "facilitati"],
    regulations: ["Codul Fiscal Titlul V", "Declarația D112"],
    content: "Configurarea modulului de salarii centralizează procentele contribuțiilor sociale conform legislației în vigoare la data de 2 noiembrie 2026. Permite setarea salariului minim pe economie, a deducerilor personale de bază și suplimentare pentru copii, precum și activarea facilităților fiscale specifice domeniilor reglementate.",
    keySteps: [
      "Verificarea grilei de contribuții: CAS (25%), CASS (10%), CAM (2.25%), Impozit pe venit (10%)",
      "Setarea salariului de bază minim brut pe țară garantat în plată",
      "Configurarea opțiunilor pentru tichete de masă, tichete cadou și asigurări voluntare de sănătate"
    ]
  },
  {
    id: "configurare-utilizatori",
    title: "Configurare utilizatori",
    level: 2,
    chapterNumber: 4,
    chapterName: "Configurare",
    parentId: "configurare",
    code: "4.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#configurare-utilizatori",
    summary: "Gestionarea conturilor de operatori, parole, permisiuni diferențiate pe societăți și module (drepturi citire/scriere/validare).",
    tags: ["utilizatori", "parole", "drepturi", "securitate", "roluri"],
    shortcuts: ["Ctrl+U - Comutare utilizator"],
    content: "Permite definirea de utilizatori cu nume și parolă, acordarea accesului exclusiv pe anumite firme din portofoliu și limitarea acțiunilor pe care un operator le poate efectua (de exemplu: un operator de facturare poate adăuga doar Ieșiri fără a putea devalida închiderea de lună sau vizualiza balanța contabilă).",
    keySteps: [
      "Adăugarea contului de utilizator nou",
      "Setarea parolei de acces",
      "Selectarea societăților la care are drept de acces",
      "Bifarea drepturilor granulare: Adăugare, Modificare, Ștergere, Validare, Tipărire pe fiecare modul"
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 5: NOMENCLATOARE
  // ----------------------------------------------------
  {
    id: "nomenclatoare",
    title: "Nomenclatoare",
    level: 1,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: null,
    code: "5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#nomenclatoare",
    summary: "Baza de date cu cataloagele de referință: parteneri (terți), agenți de vânzări, plan de conturi, gestiuni, articole, salariați și coduri REGES.",
    tags: ["nomenclatoare", "cataloage", "parteneri", "articole", "conturi"],
    content: "Nomenclatoarele conțin datele structurate reutilizabile în toate documentele primare și raportările contabile. Corectitudinea configurării nomenclatoarelor asigură automatizarea generării declarațiilor fiscale și a rapoartelor de gestiune.",
    keySteps: [
      "Completarea nomenclatoarelor înainte de începerea introducerii documentelor curente",
      "Folosirea funcțiilor de verificare online la introducerea terților noi",
      "Atribuirea corectă a conturilor analitice și a tipurilor de articole"
    ]
  },
  {
    id: "terti",
    title: "Terti",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#terti",
    summary: "Catalogul clienților și furnizorilor, generare automată de analitice 4111/401, interogare automată în registrul ANAF, setare scadențe și conturi IBAN.",
    tags: ["terti", "clienti", "furnizori", "401", "4111", "verificare anaf", "cui"],
    keyAccounts: ["401 - Furnizori", "4111 - Clienți", "404 - Furnizori de imobilizări", "4118 - Clienți incerți"],
    regulations: ["Registrul persoanelor impozabile care aplică sistemul TVA la încasare", "Registrul RO e-Factura"],
    shortcuts: ["F2 - Adăugare terț nou", "F7 - Căutare după CUI sau nume"],
    content: "Catalogul Terți centralizează toți partenerii comerciali. La introducerea unui CUI nou, programul interoghează automat serviciul web ANAF completând denumirea oficială, sediul social, starea de plătitor de TVA, data aplicării TVA la încasare și înscrierea în registrul e-Factura.",
    keySteps: [
      "Apăsați 'Adaug' și introduceți CUI/CIF sau CNP",
      "Apăsați butonul 'Verificare' pentru preluarea automată a datelor oficiale",
      "SAGA C atribuie automat următorul cod analitic disponibil (ex: 4111.00045)",
      "Completați IBAN-ul și termenul de plată negociat în zile"
    ],
    practicalTips: [
      "Nu modificați manual rădăcina analiticului dacă ați operat deja tranzacții pe terțul respectiv.",
      "Verificați periodic terții cu opțiunea 'Verificare toți' înainte de depunerea declarației 394."
    ]
  },
  {
    id: "agenti",
    title: "Agenti",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#agenti",
    summary: "Evidența reprezentanților de vânzări sau agenților comerciali pentru repartizarea vânzărilor și calculul comisioanelor.",
    tags: ["agenti", "vanzari", "comisioane", "target"],
    content: "Nomenclatorul de agenți permite asocierea fiecărei facturi de ieșire sau comenzi unui reprezentant comercial dedicat. Astfel se pot extrage situații de vânzări pe agenți și calcula bonusurile de performanță.",
    keySteps: [
      "Definiți agentul cu nume, prenume, telefon și procentul standard de comision",
      "Asociați agentul clienților corespunzători sau selectați-l la emiterea fiecărei facturi de ieșire"
    ]
  },
  {
    id: "plan-de-conturi",
    title: "Plan de conturi",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#plan-de-conturi",
    summary: "Planul general de conturi românesc conform OMFP 1802/2014, creare conturi analitice la orice nivel, funcțiunea conturilor.",
    tags: ["plan de conturi", "analitice", "omfp 1802", "debit", "credit", "bifunctional"],
    regulations: ["Reglementările contabile aprobate prin OMFP 1802/2014"],
    content: "SAGA C include planul de conturi complet actualizat, structurat pe clasele 1-8. Utilizatorul poate adăuga conturi analitice noi pe oricâte niveluri prin adăugarea unui punct urmat de identificator (ex: 6022.01). Fiecare cont are definită funcțiunea (Activ, Pasiv, Bifuncțional).",
    keySteps: [
      "Selectați contul sintetic părinte",
      "Apăsați 'Adaug' și introduceți simbolul analiticului",
      "Stabiliți denumirea contului și funcțiunea contabilă",
      "Verificați dacă este cont de trezorerie sau cont cu evidență pe terți"
    ]
  },
  {
    id: "gestiuni",
    title: "Gestiuni",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#gestiuni",
    summary: "Definirea depozitelor, magazinelor și gestiunilor cantitativ-valorice sau global-valorice, cote TVA aferente și gestionar responsabil.",
    tags: ["gestiuni", "depozit", "magazin", "cantitativ-valoric", "global-valoric", "adaos comercial"],
    keyAccounts: ["371 - Mărfuri", "378 - Diferențe de preț", "4428.M - TVA neexigibilă mărfuri"],
    content: "În SAGA C gestiunile se împart în: Cantitativ-valorice (depozite de materii prime, materiale, produse finite sau mărfuri la preț de achiziție) și Global-valorice (magazine cu amănuntul, unde evidența se ține la preț de vânzare cu amănuntul inclusiv TVA, pe baza raportului de gestiune).",
    keySteps: [
      "Apăsați 'Adaug' și introduceți codul și denumirea gestiunii (ex: Depozit Central, Magazin 1)",
      "Selectați tipul gestiunii: Cantitativ-valorică sau Global-valorică",
      "Pentru gestiunile cu amănuntul, specificați cota de TVA și analiticele aferente (371.1, 378.1, 4428.1)"
    ]
  },
  {
    id: "articole",
    title: "Articole",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#articole",
    summary: "Catalogul bunurilor materiale și serviciilor: cod articol, denumire, unitate de măsură, cod de bare, cotă TVA, cod CPV și cod vamal NC.",
    tags: ["articole", "produse", "cod de bare", "um", "pret vanzare", "cod nc", "saf-t"],
    shortcuts: ["F2 - Articol nou", "F7 - Filtrare articole"],
    content: "Nomenclatorul de articole conține toate elementele tranzacționate. Fiecare articol are asociat un tip (materie primă, marfă, produs finit, serviciu vândut), cota de TVA (19%, 9%, 5%, 0%), prețul de vânzare fără TVA, codul de bare pentru scanare rapidă și codul NC necesar la raportarea SAF-T și e-Transport.",
    keySteps: [
      "Introduceți codul unic al articolului și denumirea completă",
      "Selectați unitatea de măsură (buc, kg, m, l)",
      "Alegeți cota legală de TVA",
      "Completați codul NC / codul vamal pentru conformitate SAF-T"
    ]
  },
  {
    id: "tipuri-de-articole-servicii",
    title: "Tipuri de articole-servicii",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#tipuri-de-articole-servicii",
    summary: "Configurarea categoriilor de articole și asocierea automată a conturilor contabile de stoc, cheltuială și venit.",
    tags: ["tipuri articole", "materii prime", "marfuri", "servicii", "conturi stoc"],
    keyAccounts: ["301/601", "302/602", "303/603", "371/607/707", "704"],
    content: "Tipul de articol dictează ce notă contabilă va genera SAGA C la intrarea și ieșirea bunului. De exemplu: tipul 'Mărfuri' asociază contul 371 la intrare și 607/707 la vânzare, pe când tipul 'Servicii prestate' generează direct 704 fără mișcare de stoc.",
    keySteps: [
      "Vizualizați tipurile predefinite din aplicație",
      "Dacă lucrați cu analitice distincte pe linii de afaceri, creați tipuri noi cu conturile dorite"
    ]
  },
  {
    id: "grupe",
    title: "Grupe",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#grupe",
    summary: "Centre de profit și de cost, segmente de activitate sau proiecte pentru contabilitatea managerială și raportare analitică.",
    tags: ["grupe", "centre de cost", "centre de profit", "proiecte", "analiza"],
    content: "Meniul Grupe permite clasificarea veniturilor, cheltuielilor, articolelor sau salariaților pe centre de responsabilitate (ex: Divizia Construcții, Divizia Retail, Proiectul X). La orice document se poate aloca o grupă, facilitând obținerea contului de profit și pierdere pe fiecare proiect în parte.",
    keySteps: [
      "Definiți grupele principale și subgrupele",
      "Asociați grupele în documentele de intrări, ieșiri sau note contabile"
    ]
  },
  {
    id: "filiale",
    title: "Filiale",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#filiale",
    summary: "Evidența punctelor de lucru, subunităților sau filialelor fără personalitate juridică ale societății.",
    tags: ["filiale", "puncte de lucru", "subunitati", "declaratia 112 sedii"],
    content: "Se utilizează pentru societățile cu mai multe puncte de lucru înregistrate fiscal la ANAF (care au cod fiscal propriu pentru impozitul pe salarii la sedii secundare cu peste 5 angajați).",
    keySteps: [
      "Introduceți denumirea punctului de lucru și adresa",
      "Completați codul fiscal alocat de ANAF pentru sediul secundar",
      "Alocați salariații ce își desfășoară activitatea în filiala respectivă"
    ]
  },
  {
    id: "salariati",
    title: "Salariati",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#salariati",
    summary: "Fișa personalului angajat: date personale, funcție COR, tip contract, salariu de bază, persoane în întreținere, sporuri și deduceri.",
    tags: ["salariati", "angajati", "cor", "cim", "salariu brut", "persoane intretinere"],
    regulations: ["Codul Muncii", "Ordinul comun pentru aprobarea modelului D112"],
    shortcuts: ["F2 - Adăugare salariat nou"],
    content: "Fișa fiecărui salariat stochează datele complete necesare calculului salarial și generării declarației unice 112: CNP, serie CI, adresa, data angajării, funcția conform clasificării COR, norma de lucru (ore/zi), salariul negociat brut, casa de sănătate, numărul persoanelor în întreținere și contul IBAN pentru virarea salariului pe card.",
    keySteps: [
      "Apăsați 'Adaug' și introduceți CNP-ul angajatului",
      "Completați funcția COR folosind căutarea inteligentă",
      "Selectați tipul contractului (durată nedeterminată/determinată) și timpul de lucru",
      "Configurați eventualele sporuri permanente (vechime, noapte, condiții vătămătoare)"
    ]
  },
  {
    id: "reges",
    title: "REGES",
    level: 2,
    chapterNumber: 5,
    chapterName: "Nomenclatoare",
    parentId: "nomenclatoare",
    code: "5.10",
    officialUrl: "https://manual.sagasoft.ro/sagac/#reges",
    summary: "Integrarea cu Registrul General de Evidență a Salariaților (fostul Revisal/REGES), export fișiere .rvs sau XML.",
    tags: ["reges", "revisal", "export rvs", "contracte munca", "itrm"],
    regulations: ["HG 905/2017 privind registrul general de evidență a salariaților"],
    content: "Modulul REGES permite gestionarea contractelor de muncă direct din SAGA C, înregistrând încheierea, modificarea (acte adiționale), suspendarea sau încetarea contractelor individuale de muncă, cu generarea automată a fișierului pentru transmiterea online către Inspecția Muncii.",
    keySteps: [
      "Configurați datele de angajator și reprezentant legal",
      "Înregistrați modificările de contract (salariu, funcție, normă)",
      "Apăsați butonul 'Generare fișier Registru' pentru fișierul destinat portalului REGES"
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 6: OPERATII
  // ----------------------------------------------------
  {
    id: "operatii",
    title: "Operatii",
    level: 1,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: null,
    code: "6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#operatii",
    summary: "Meniul principal de lucru zilnic: înregistrare facturi primite (Intrări), emitere facturi (Ieșiri), stocuri, trezorerie, salarii, e-Factura și închidere de lună.",
    tags: ["operatii", "intrari", "iesiri", "trezorerie", "stocuri", "inchidere", "e-factura"],
    content: "Meniul Operații concentrează fluxul tranzacțional complet al firmei. Orice document validat aici produce automat nota contabilă corespondentă în registrul jurnal, actualizează stocurile și se regăsește în jurnalele de TVA și fișele partenerilor.",
    keySteps: [
      "Operarea documentelor justificative în ordine cronologică",
      "Validarea documentelor pentru generarea automată a înregistrărilor contabile",
      "Efectuarea plăților și încasărilor prin modulul Casa-Bancă-Deconturi",
      "Închiderea lunară a conturilor de TVA și a veniturilor și cheltuielilor"
    ]
  },
  {
    id: "articole-contabile",
    title: "Articole contabile",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#articole-contabile",
    summary: "Introducerea manuală a notelor contabile diverse (note de compensare, salarii din alt program, amortizare manuală, repartizare dividende).",
    tags: ["articole contabile", "note contabile", "diverse", "debit credit", "monografii"],
    shortcuts: ["F2 - Adăugare notă nouă"],
    content: "Ecranul Articole contabile este destinat notelor contabile care nu provin direct din facturi, bonuri sau state de plată generate de SAGA C (de exemplu: constituirea capitalului social, repartizarea dividendelor 1171 = 457, compensări între terți pe baza ordinelor de compensare, reevaluări de active).",
    keySteps: [
      "Introduceți data și numărul documentului justificativ",
      "Selectați contul debitor și contul creditor",
      "Introduceți suma în lei (sau valută) și explicația clară a operațiunii",
      "Dacă tranzacția implică un terț, alegeți terțul pentru a actualiza fișa analitică"
    ]
  },
  {
    id: "intrari",
    title: "Intrari",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#intrari",
    summary: "Modulul de înregistrare a facturilor de achiziție, avizelor de însoțire a mărfii, bonurilor fiscale de carburant și DVI-urilor.",
    tags: ["intrari", "achizitii", "facturi primite", "furnizori", "nir"],
    content: "Meniul Intrări acoperă preluarea tuturor documentelor primare de achiziție de la furnizori. Permite generarea automată a Notei de Recepție și Constatare de Diferențe (NIR), recunoașterea automată a fișierelor XML e-Factura din SPV și descărcarea lor directă.",
    keySteps: [
      "Alegerea tipului de intrare: Factură, Aviz, Bon fiscal, Taxare inversă, Import",
      "Preluarea automată a facturilor din SPV prin modulul integrat e-Factura",
      "Verificarea liniilor și validarea NIR-ului"
    ]
  },
  {
    id: "intrari-lei",
    title: "Intrari - lei",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "intrari",
    code: "6.2.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#intrari-lei",
    summary: "Înregistrarea facturilor fiscale de achiziție în lei, calcul automat TVA, deducere integrală sau 50% auto, generare NIR.",
    tags: ["intrari lei", "factura cumparare", "tva deductibila", "nir", "auto 50%"],
    keyAccounts: ["401", "301", "371", "628", "4426", "4428.TP"],
    shortcuts: ["F2 - Factură nouă", "F4 - Salvare antet", "Ctrl+Enter - Validare"],
    regulations: ["Codul Fiscal Art. 297, 298 (Limitarea deducerii TVA pentru vehicule)"],
    content: "Reprezintă ecranul cel mai utilizat pentru cheltuielile curente în moneda națională. SAGA C gestionează automat cotele de TVA, aplicarea deducerii parțiale de 50% pentru cheltuielile cu autoturismele (nota automată 6022 = 4426 pentru TVA nedeductibilă), precum și regimul de TVA la încasare al furnizorului.",
    keySteps: [
      "Selectați furnizorul din listă sau adăugați-l cu F2 (CUI verificat online)",
      "Introduceți numărul documentului, data emiterii și data scadenței",
      "În panoul de jos adăugați articolele sau conturile de cheltuieli (ex. 628, 6022, 371)",
      "Apăsați 'Validare' și listați Nota de Recepție (NIR) sau nota contabilă"
    ],
    practicalTips: [
      "Dacă furnizorul aplică TVA la încasare, programul selectează automat bifa 'TVA la încasare' și contul 4428.TP.",
      "Butonul 'Plată' din subsol permite stingerea imediată a facturii prin casă (5311) sau bancă (5121)."
    ]
  },
  {
    id: "intrari-valuta",
    title: "Intrari - valuta",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "intrari",
    code: "6.2.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#intrari-valuta",
    summary: "Achiziții intracomunitare de bunuri (AIC), importuri extracomunitare (DVI), servicii intracomunitare, curs BNR automat și taxare inversă.",
    tags: ["intrari valuta", "aic", "import", "dvi", "curs bnr", "taxare inversa", "declaratia 390"],
    keyAccounts: ["401.val", "4426 = 4427", "665", "765"],
    regulations: ["Codul Fiscal Art. 326 (Taxarea inversă)", "Declarația 390 VIES"],
    content: "Gestionează achizițiile în valută (EUR, USD, etc.). Cursul de schimb BNR din data documentului este preluat automat prin conexiunea la internet. Pentru achizițiile intracomunitare de la furnizori înregistrați în VIES, se aplică automat mecanismul de taxare inversă (4426 = 4427), documentul fiind preluat automat în declarația 390.",
    keySteps: [
      "Selectați furnizorul extern și moneda",
      "Verificați cursul valutar al zilei afișat de program",
      "Alegeți tipul operațiunii: Factură, Achiziție intracomunitară sau Import cu DVI",
      "În cazul importurilor, introduceți taxele vamale și comisionul vamal în ecranul aferent"
    ]
  },
  {
    id: "iesiri",
    title: "Iesiri",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#iesiri",
    summary: "Emiterea și evidența facturilor de vânzare, avizelor, bonurilor fiscale, trimitere directă în RO e-Factura SPV.",
    tags: ["iesiri", "facturare", "vanzari", "clienti", "e-factura spv"],
    content: "Meniul Ieșiri este instrumentul complet de facturare pentru clienți persoane juridice sau fizice, exportul către case de marcat fiscale și transmiterea automată a fișierelor XML conforme UBL în Sistemul Național RO e-Factura.",
    keySteps: [
      "Emiterea facturii fiscale sau a avizului",
      "Validarea și descărcarea automată a stocului vândut",
      "Generarea și transmiterea fișierului XML în e-Factura"
    ]
  },
  {
    id: "iesiri-lei",
    title: "Iesiri - lei",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "iesiri",
    code: "6.3.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#iesiri-lei",
    summary: "Facturi de livrare bunuri și prestări servicii pe piața internă în lei, transmitere cu un clic în e-Factura, generare cod QR și încasare.",
    tags: ["iesiri lei", "factura client", "707", "704", "4111", "e-factura", "bon fiscal"],
    keyAccounts: ["4111", "707", "704", "4427", "4428.TI", "607 = 371"],
    shortcuts: ["F2 - Factură nouă", "Ctrl+Enter - Validare", "F4 - Salvare"],
    regulations: ["Legea 296/2023 RO e-Factura B2B și B2C", "Ordonanța de Urgență nr. 120/2021"],
    content: "Ecranul permite emiterea facturilor interne. La adăugarea liniilor de marfă sau produse, SAGA C descarcă gestiunea în mod automat pe baza metodei alese (FIFO / CMP). La validare, butonul 'e-Factura' devine activ, permițând generarea XML-ului și încărcarea securizată în SPV cu certificat digital calificat sau token OAuth.",
    keySteps: [
      "Apăsați 'Adaug', selectați clientul și confirmați data și seria facturii",
      "Introduceți articolele vândute, cantitățile și prețul unitar negociat",
      "Validați documentul – programul generează nota contabilă și descărcarea din gestiune",
      "Apăsați butonul 'e-Factura' > 'Generare și transmitere' pentru trimiterea la ANAF"
    ],
    practicalTips: [
      "Facturile validate pot fi încasate pe loc prin butonul 'Încasare' cu chitanță (5311) sau POS (5125/5121).",
      "După primirea indexului de încărcare din SPV, verificați starea de procesare pentru a descărca sigiliul Ministerului Finanțelor."
    ]
  },
  {
    id: "iesiri-valuta",
    title: "Iesiri - valuta",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "iesiri",
    code: "6.3.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#iesiri-valuta",
    summary: "Livrări intracomunitare de bunuri (LIC), prestări externe B2B (regula generală de la art. 278 alin. 2), exporturi, declarația 390.",
    tags: ["iesiri valuta", "lic", "export", "vies", "declaratia 390", "factura externa"],
    keyAccounts: ["4111.val", "707 / 704", "665 / 765"],
    regulations: ["Codul Fiscal Art. 294 (Scutiri pentru exporturi și livrări intracomunitare)"],
    content: "Permite facturarea clienților externi în orice valută. Pentru livrările intracomunitare către operatori economici cu cod valid VIES, se aplică regimul de scutire de TVA cu drept de deducere, datele fiind transferate automat în D390.",
    keySteps: [
      "Selectați clientul extern și moneda de facturare",
      "Stabiliți tipul: Livrare intracomunitară, Export sau Prestare intracomunitară",
      "Completați prețul în valută – SAGA C calculează automat echivalentul în lei la cursul BNR"
    ]
  },
  {
    id: "imobilizari",
    title: "Imobilizari",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#imobilizari",
    summary: "Registrul mijloacelor fixe și al imobilizărilor necorporale, durate normale de funcționare, plan de amortizare liniară/degresivă/accelerată.",
    tags: ["imobilizari", "mijloace fixe", "amortizare", "durata de viata", "2813", "catalog mijloace fixe"],
    keyAccounts: ["2131", "2133", "214", "2813", "6811"],
    regulations: ["HG 2139/2004 pentru aprobarea Catalogului privind clasificarea și duratele normale de funcționare a mijloacelor fixe"],
    content: "Modulul Imobilizări gestionează mijloacele fixe corporale și necorporale ale entității. Preia automat achizițiile operate pe conturile de imobilizări (clasa 2) în Intrări, calculează lunar planul de amortizare și generează nota contabilă lunară 6811 = 281x la închiderea lunii.",
    keySteps: [
      "Înregistrați achiziția mijlocului fix în Intrări pe contul 213x / 214",
      "Deschideți Imobilizări și asociați codul de clasificare conform HG 2139/2004",
      "Stabiliți durata normală de funcționare în luni și data punerii în funcțiune",
      "Generați și listați Fișa mijlocului fix și Registrul numerelor de inventar"
    ]
  },
  {
    id: "operatii-cu-stocuri",
    title: "Operatii cu stocuri",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#operatii-cu-stocuri",
    summary: "Gestionarea completă a mișcărilor interne de stocuri: transferuri între gestiuni, bonuri de consum, producție, inventariere și casări.",
    tags: ["stocuri", "transferuri", "bonuri de consum", "productie", "inventar", "reglari"],
    content: "Această secțiune grupează toate procesele interne de depozit și gestiune a materialelor și produselor, asigurând concordanța strictă între stocul faptic și evidența contabilă.",
    keySteps: [
      "Selectarea operațiunii specifice de depozit",
      "Completarea cantităților transferate, consumate sau realizate",
      "Validarea documentului pentru reflectarea imediată în fișele de magazie"
    ]
  },
  {
    id: "transferuri",
    title: "Transferuri",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#transferuri",
    summary: "Transferul bunurilor între gestiuni diferite (de la Depozit central la Punct de lucru sau de la en-gros la en-detail cu schimbare de preț).",
    tags: ["transferuri", "gestiuni", "aviz intern", "371", "481"],
    keyAccounts: ["371.magazin = 371.depozit", "378", "4428.M"],
    content: "Permite mutarea stocurilor între două gestiuni ale aceleiași societăți. Dacă transferul se face dintr-o gestiune cantitativ-valorică într-una global-valorică la preț de vânzare, programul calculează automat adaosul comercial și TVA neexigibilă.",
    keySteps: [
      "Selectați gestiunea predătoare și gestiunea primitoare",
      "Alegeți articolele și cantitățile de transferat",
      "Validați și tipăriți Avizul de însoțire / Nota de transfer intern"
    ]
  },
  {
    id: "bonuri-de-consum",
    title: "Bonuri de consum",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#bonuri-de-consum",
    summary: "Darea în consum a materiilor prime, materialelor consumabile, pieselor de schimb și combustibilului, generare automată notă 60x = 30x.",
    tags: ["bon consum", "consumabile", "601", "602", "301", "302", "descarcare"],
    keyAccounts: ["601 = 301", "6022 = 3022", "6028 = 3028"],
    shortcuts: ["F2 - Bon nou de consum"],
    content: "Documentul justificativ prin care materialele aflate în stoc sunt eliberate din magazie pentru a fi utilizate în activitatea curentă. SAGA C descarcă stocul la costul de achiziție conform metodei FIFO/CMP alese la configurare.",
    keySteps: [
      "Selectați data consumului și gestiunea de unde se scot materialele",
      "Adăugați articolele și cantitățile consumate",
      "Opțional, asociați grupa / centrul de cost pentru urmărirea cheltuielilor pe proiecte",
      "Validați și tipăriți Bonul de consum"
    ]
  },
  {
    id: "productie",
    title: "Productie",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#productie",
    summary: "Raport de producție pe bază de rețetă tehnologică sau lansare directă, generare produs finit și descărcare materii prime.",
    tags: ["productie", "reteta", "produse finite", "345", "711", "consum specific"],
    keyAccounts: ["345 = 711", "601 = 301"],
    content: "Modulul Producție automatizează obținerea de produse finite sau semifabricate. Dacă articolul are definită o rețetă tehnologică, la specificarea cantității de produs finit realizat, SAGA C generează automat bonurile de consum pentru ingredientele/materiile prime din compoziție.",
    keySteps: [
      "Definiți rețeta de fabricație în nomenclator (norme de consum)",
      "Înregistrați Raportul de producție cu data și cantitatea obținută",
      "Verificați costul antecalculat și consumul de materiale",
      "Validați producția pentru a intra produsele finite pe contul 345"
    ]
  },
  {
    id: "inventariere",
    title: "Inventariere",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#inventariere",
    summary: "Listarea listelor de inventariere pentru comisie, înregistrarea stocului faptic și reglarea automată a plusurilor/minusurilor de inventar.",
    tags: ["inventar", "plusuri inventar", "minusuri inventar", "comisie inventariere", "607", "6588"],
    regulations: ["OMFP 2861/2009 pentru aprobarea Normelor privind organizarea și efectuarea inventarierii"],
    content: "Permite generarea listelor de inventariere oarbe sau cu cantități scriptice. După numărarea fizică, se introduce stocul faptic, iar programul determină diferențele, permițând generarea automată a procesului verbal și a notelor contabile de imputare sau de descărcare.",
    keySteps: [
      "Selectați gestiunea și data efectuării inventarului",
      "Tipăriți listele de inventariere pentru comisia numită prin decizie",
      "Introduceți stocul faptic numărat",
      "Apăsați 'Procesare diferențe' pentru înregistrarea plusurilor (30x/371 = 60x/758) sau minusurilor"
    ]
  },
  {
    id: "dare-in-folosinta-obiecte-de-inventar",
    title: "Dare in folosinta obiecte de inventar",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#dare-in-folosinta-obiecte-de-inventar",
    summary: "Trecerea pe cheltuieli a materialelor de natura obiectelor de inventar (603 = 303) și urmărirea lor extracontabilă pe locuri de folosință în contul 8035.",
    tags: ["obiecte de inventar", "303", "603", "8035", "dare in folosinta", "responsabil"],
    keyAccounts: ["603 = 303", "Debit 8035 - Stocuri de natura obiectelor de inventar date în folosință"],
    content: "Permite darea în folosință a bunurilor de natura obiectelor de inventar (scule, echipamente de protecție, birotică sub plafonul de mijloace fixe). La validare, pe lângă nota de cheltuială, bunurile sunt înregistrate în evidența extracontabilă pe salariat sau departament.",
    keySteps: [
      "Selectați articolele din stocul contului 303",
      "Alegeți salariatul sau departamentul căruia i se încredințează bunurile",
      "Validați documentul și tipăriți procesul verbal de predare-primire"
    ]
  },
  {
    id: "dezmembrari",
    title: "Dezmembrari",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#dezmembrari",
    summary: "Dezmembrarea unui produs compus în piesele componente sau recuperarea de materiale din bunuri casate.",
    tags: ["dezmembrari", "piese de schimb", "casare", "recuperare"],
    content: "Se utilizează când un ansamblu sau un utilaj/marfă este desfăcut în componente distincte ce urmează a fi vândute sau utilizate separat ca piese de schimb sau deșeuri reciclabile.",
    keySteps: [
      "Selectați articolul sursă ce va fi descărcat din stoc",
      "Introduceți articolele rezultate și cotele procentuale de repartizare a valorii inițiale",
      "Validați operațiunea"
    ]
  },
  {
    id: "operatii-speciale",
    title: "Operatii speciale",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#operatii-speciale",
    summary: "Corecții de stoc, modificări de preț de înregistrare, reclasificări de stocuri (ex: din materii prime în mărfuri 371 = 301).",
    tags: ["operatii speciale", "reclasificare", "corectii stoc", "371 = 301"],
    content: "Ecran dedicat reclasificărilor de natură materială sau reglărilor specifice care nu se încadrează în fluxurile standard de intrare/ieșire.",
    keySteps: [
      "Selectați articolul inițial și noul articol/cont de destinație",
      "Introduceți cantitatea și validați nota contabilă de transformare"
    ]
  },
  {
    id: "reglari-descarcare",
    title: "Reglari descarcare",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#reglari-descarcare",
    summary: "Recalcularea descărcării de gestiune conform metodei FIFO/CMP în cazul introducerii documentelor retroactiv.",
    tags: ["reglare descarcare", "fifo", "cmp", "recalculare stoc", "istoric"],
    content: "Dacă s-au operat facturi sau intrări cu date din urmă, ordinea descărcării FIFO poate fi temporar denaturată. Butonul de reglare descărcare parcurge cronologic toate tranzacțiile de stoc și recalculează costul mărfurilor vândute și stocul final rămas.",
    keySteps: [
      "Accesați ecranul după ce ați terminat modificările pe lunile anterioare",
      "Apăsați butonul 'Recalculare descărcare stocuri'",
      "Verificați notele contabile de corecție generate automat"
    ],
    practicalTips: [
      "Rulați această operațiune înainte de închiderea definitivă a fiecărui trimestru fiscal."
    ]
  },
  {
    id: "schimbare-pret-de-vanzare-marfuri",
    title: "Schimbare pret de vanzare marfuri",
    level: 3,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii-cu-stocuri",
    code: "6.5.9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#schimbare-pret-de-vanzare-marfuri",
    summary: "Proces verbal de schimbare de preț pentru mărfurile din magazinele cu amănuntul, recalculare adaos și TVA neexigibilă.",
    tags: ["schimbare pret", "proces verbal", "adaos comercial", "magazin amănuntul", "378", "4428"],
    keyAccounts: ["371 = 378", "371 = 4428.M"],
    content: "Pentru gestiunile ținute la preț de vânzare cu amănuntul este obligatorie întocmirea Procesului Verbal de schimbare de preț la orice scumpire sau reducere de promoție a mărfurilor de la raft.",
    keySteps: [
      "Selectați magazinul / gestiunea global-valorică",
      "Introduceți prețul vechi și prețul nou de vânzare cu TVA inclus",
      "SAGA C generează Procesul Verbal și nota de recalculare a adaosului comercial (cont 378)"
    ]
  },
  {
    id: "casa-banca-deconturi",
    title: "Casa-Banca-Deconturi",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#casa-banca-deconturi",
    summary: "Evidența operațiunilor de trezorerie: registru de casă în lei/valută, extrase de cont bancar, deconturi de cheltuieli (avansuri de trezorerie).",
    tags: ["casa", "banca", "deconturi", "5311", "5121", "542", "registru de casa", "extras banca"],
    keyAccounts: ["5311", "5121", "542", "581", "401", "4111"],
    shortcuts: ["F2 - Înregistrare plată/încasare nouă", "F7 - Căutare după sumă/document"],
    regulations: ["Legea 70/2015 privind întărirea disciplinei financiare privind operațiunile de încasări și plăți în numerar"],
    content: "Modulul de trezorerie gestionează lichiditățile bănești. Include sub-secțiuni dedicate pentru Registrul de casă (cu avertizare automată la depășirea plafoanelor legale de numerar de 5.000 / 10.000 lei conform Legii 70/2015), Jurnalul de bancă (cu opțiune de import fișiere extras MT940 / CSV de la bănci) și Deconturile de trezorerie ale titularilor de avans.",
    keySteps: [
      "Alegeți registrul dorit (Casă lei, Casă valută, Cont bancă sau Deconturi)",
      "Introduceți data operațiunii și numărul chitanței / ordinului de plată",
      "Selectați terțul pentru a stinge automat factura restantă din listă",
      "Tipăriți Registrul zilnic de casă sau Dispozițiile de plată/încasare"
    ]
  },
  {
    id: "cecuri-bo-emise-primite",
    title: "Cecuri, BO emise-primite",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#cecuri-bo-emise-primite",
    summary: "Gestiunea instrumentelor de plată cu scadență viitoare: cecuri și bilete la ordin (BO) primite de la clienți sau emise către furnizori.",
    tags: ["cecuri", "bilete la ordin", "efecte de comert", "403", "413", "scadenta"],
    keyAccounts: ["413 - Efecte de primit de la clienți", "403 - Efecte de plătit furnizorilor"],
    content: "Permite urmărirea efectelor de comerț de la emitere până la decontarea lor finală în extrasul de bancă. Asigură evidența scadențarelor pentru a preveni incidentele de plată la CIP (Centrala Incidentelor de Plăți).",
    keySteps: [
      "Înregistrați primirea biletului la ordin de la client (nota 413 = 4111)",
      "La scadență, operați decontarea în bancă (nota 5121 = 413)"
    ]
  },
  {
    id: "state-salarii",
    title: "State salarii",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#state-salarii",
    summary: "Calculul complet al drepturilor salariale: pontaj ore lucrate/concedii/medicale, fluturași, stat de plată, rețineri, generare D112 și fișiere virament card.",
    tags: ["salarii", "stat de plata", "fluturasi", "concedii", "d112", "retineri", "421", "4315", "4316"],
    keyAccounts: ["641 = 421", "421 = 4315 (CAS)", "421 = 4316 (CASS)", "421 = 444 (Impozit)", "646 = 436 (CAM)"],
    regulations: ["Codul Fiscal Titlul V", "OUG 158/2005 privind concediile și indemnizațiile de asigurări sociale"],
    shortcuts: ["F2 - Calcul lună nouă", "Tipărire Fluturași"],
    content: "Modulul State de salarii calculează automat salariile lunare. Se completează pontajul (zile lucrate, concediu de odihnă, concediu medical cu calcul indemnizație suportată din FS/CCI), tichetele de masă acordate și reținerile (popriri, rate). La final generează nota contabilă de salarii și fișierul XML pentru Declarația 112 transmisă la ANAF.",
    keySteps: [
      "Selectați luna de calcul și apăsați 'Actualizare date'",
      "Introduceți orele lucrate, concediile medicale (cu seria și codul de indemnizație) sau de odihnă",
      "Verificați fluturașii și statul de plată general",
      "Validați statul – nota contabilă de salarii se înregistrează automat în Articole contabile",
      "Generați fișierul XML pentru Declarația 112 și semnați electronic PDF-ul generat"
    ]
  },
  {
    id: "inchidere-luna",
    title: "Inchidere luna",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#inchidere-luna",
    summary: "Operațiuni de sfârșit de lună: amortizare mijloace fixe, descărcare gestiune mărfuri, regularizare TVA (4423/4424), închidere 121, calcul impozit micro/profit.",
    tags: ["inchidere luna", "regularizare tva", "inchidere venituri cheltuieli", "121", "impozit profit", "impozit micro"],
    keyAccounts: ["4427/4426 = 4423/4424", "121 = 6xx", "7xx = 121", "691/698 = 4411/4418"],
    shortcuts: ["F4 - Validare operațiuni de închidere"],
    regulations: ["Codul Fiscal Titlul II și III", "OMFP 1802/2014"],
    content: "Ecranul Închidere lună este inima procesării contabile de final de perioadă. Include 5 pași succesivi esențiali: 1. Înregistrare amortizare imobilizări; 2. Descărcare de gestiune mărfuri și consumuri; 3. Închidere automată conturi de TVA (generare TVA de plată 4423 sau TVA de recuperat 4424); 4. Închiderea conturilor de venituri și cheltuieli prin 121; 5. Calculul impozitului pe profit (16%) sau al impozitului pe veniturile microîntreprinderilor (1% sau 3%).",
    keySteps: [
      "Verificați dacă toate documentele lunii sunt validate în Intrări, Ieșiri și Trezorerie",
      "Apăsați pe rând 'Validare' la fiecare tab din ecranul Închidere lună",
      "Dacă sunteți la final de trimestru, accesați tabul de Impozit pe profit / Micro pentru calculul fiscal",
      "Generați balanța de verificare și verificați soldurile finale"
    ],
    practicalTips: [
      "Dacă ați omis o factură și devalidați o lună anterioară, este obligatoriu să revalidați toate lunile următoare în ordine cronologică.",
      "Asigurați-vă că nu rămân solduri finale pe conturile 4426 sau 4427 la sfârșitul lunii."
    ]
  },
  {
    id: "e-factura",
    title: "e-Factura",
    level: 2,
    chapterNumber: 6,
    chapterName: "Operatii",
    parentId: "operatii",
    code: "6.10",
    officialUrl: "https://manual.sagasoft.ro/sagac/#e-factura",
    summary: "Centrul integrat RO e-Factura: autentificare ANAF prin certificat digital sau token OAuth, trimitere facturi emise, descărcare facturi furnizori din SPV și import direct în Intrări.",
    tags: ["e-factura", "spv", "anaf", "xml", "ubl", "token oauth", "semnatura electronica"],
    regulations: ["Legea nr. 296/2023", "OUG 120/2021 privind administrarea și utilizarea sistemului național RO e-Factura"],
    shortcuts: ["F5 - Sincronizare mesaje SPV"],
    content: "Modulul oficial SAGA C pentru e-Factura comunică direct cu serverele ANAF prin API-ul oficial. Permite conectarea atât prin token OAuth generat în contul SAGA, cât și prin smart card cu semnătură digitală calificată. Descarcă automat facturile primite de la furnizori și le convertește direct în recepții în ecranul de Intrări, eliminând tastarea manuală a datelor.",
    keySteps: [
      "Configurați autentificarea SPV (prin token ANAF salvat în setări)",
      "În fila 'Facturi emise', selectați facturile validate și trimiteți-le la ANAF",
      "În fila 'Răspunsuri ANAF', descărcați arhiva ZIP oficială cu recipisa semnată",
      "În fila 'Facturi primite', apăsați 'Descărcare mesaje SPV' și apoi 'Preluare în Intrări'"
    ],
    practicalTips: [
      "Păstrați arhivele ZIP descărcate; acestea constituie exemplarul original legal al facturii conform Codului Fiscal.",
      "Verificați mesajele de eroare ANAF dacă un fișier XML este respins (ex: cod poștal lipsă, CIF incorect, cod unitate de măsură nestandardizat)."
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 7: SITUATII
  // ----------------------------------------------------
  {
    id: "situatii",
    title: "Situatii",
    level: 1,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: null,
    code: "7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatii",
    summary: "Rapoarte contabile și comerciale: fișe de cont, balanțe cu 4-5 egalități, jurnale de TVA, registru jurnal, bilanț, SAF-T D406 și situații de stocuri.",
    tags: ["situatii", "rapoarte", "balanta", "fise", "jurnale", "saf-t", "bilant"],
    content: "Meniul Situații centralizează toate instrumentele de sinteză, control și raportare legală cerute de legislația contabilă din România și de conducerea entității. Se împarte în Situații Contabile și Situații Comerciale.",
    keySteps: [
      "Generarea rapoartelor pe perioade definite de utilizator (lună, trimestru, an)",
      "Exportul în formate externe: PDF, Excel (XLS), fișiere XML pentru ANAF",
      "Verificarea concordanței între rapoartele analitice de stoc și soldurile din balanța sintetică"
    ]
  },
  {
    id: "situatii-contabile",
    title: "Contabile",
    level: 2,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii",
    code: "7.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatii-contabile",
    summary: "Rapoartele contabile obligatorii conform Legii contabilității: fișa contului, balanța de verificare, cartea mare, jurnalele de TVA, registrul jurnal și declarațiile SAF-T.",
    tags: ["contabile", "balanta", "fisa cont", "cartea mare", "registru jurnal", "saf-t"],
    regulations: ["Legea contabilității 82/1991", "OMFP 1802/2014"],
    content: "Cuprinde registrele obligatorii cerute la orice control fiscal ANAF, permițând vizualizarea fiecărei tranzacții până la nivelul documentului primar justificativ.",
    keySteps: [
      "Selectarea intervalului de raportare",
      "Opțiuni de filtrare pe analitice sau clase de conturi",
      "Tipărire sau arhivare electronică securizată"
    ]
  },
  {
    id: "fisa-contului",
    title: "Fisa contului",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#fisa-contului",
    summary: "Urmărirea detaliată a tuturor mișcărilor debitoare și creditoare ale unui cont sintetic sau analitic, cu documente și conturi corespondente.",
    tags: ["fisa contului", "sold initial", "rulaj", "cont corespondent"],
    shortcuts: ["Dublu-click pe rând pentru deschiderea documentului primar"],
    content: "Afișează cronologic toate înregistrările contabile care au afectat un cont. Include soldul inițial, data fiecărui document, numărul documentului, explicația, contul corespondent și rulajele debitoare/creditoare.",
    keySteps: [
      "Introduceți simbolul contului căutat (ex: 5121 sau 401.00001)",
      "Alegeți perioada dorită",
      "Navigați direct în documentul sursă printr-un dublu-click pe rândul selectat"
    ]
  },
  {
    id: "balante",
    title: "Balante",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#balante",
    summary: "Balanța de verificare lunară cu 4, 5 sau 6 egalități: verificare egalitate Debit-Credit, sinteză pe clase de conturi, export Excel și PDF.",
    tags: ["balanta", "verificare", "4 egalitati", "5 egalitati", "egalitate debit credit"],
    regulations: ["Legea contabilității 82/1991 Art. 22"],
    shortcuts: ["F5 - Reîmprospătare date balanță"],
    content: "Balanța de verificare este principalul instrument de control contabil. SAGA C generează balanțe sintetice și analitice cu 4, 5 sau 6 serii de egalități, evidențiind soldurile inițiale la 01 ianuarie, rulajele cumulate precedente, rulajele lunii curente, totalul sumelor și soldurile finale debitoare sau creditoare.",
    keySteps: [
      "Selectați luna de raportare și tipul balanței (Sintetică sau Analitică)",
      "Apăsați 'Actualizare'",
      "Verificați dacă la finalul balanței Total Debit este perfect egal cu Total Credit",
      "Verificați dacă nu există solduri nefirești (creditoare pe conturi de activ sau debitoare pe pasiv)"
    ]
  },
  {
    id: "cartea-mare",
    title: "Cartea Mare",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#cartea-mare",
    summary: "Registrul Cartea Mare (formularul șah) cu evidențierea rulajelor pe conturi corespondente.",
    tags: ["cartea mare", "conturi corespondente", "registru contabil obligatoriu"],
    content: "Document contabil obligatoriu care sistematizează rulajele lunare ale fiecărui cont în corespondență cu celelalte conturi debitoare sau creditoare.",
    keySteps: [
      "Selectați anul și luna",
      "Tipăriți registrul pentru arhivare legală"
    ]
  },
  {
    id: "jurnale-tva",
    title: "Jurnale TVA",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#jurnale-tva",
    summary: "Jurnalul pentru Cumpărări și Jurnalul pentru Vânzări, conformitate cu decontul de TVA D300, defalcare pe cote de TVA (19%, 9%, 5%, taxare inversă).",
    tags: ["jurnal vanzari", "jurnal cumparari", "d300", "tva deductibila", "tva colectata", "baza impozabila"],
    regulations: ["Codul Fiscal Art. 321 (Evidența operațiunilor)"],
    content: "Jurnalele de TVA reflectă toate tranzacțiile de achiziții și livrări. Sumele sunt structurate exact pe căsuțele din Decontul de TVA (Formularul 300), permițând verificarea automată a bazei impozabile și a taxei colectate/deductibile.",
    keySteps: [
      "Generați Jurnalul de cumpărări și Jurnalul de vânzări pe luna/trimestrul de raportare",
      "Comparați totalurile jurnalelor cu soldurile conturilor 4426 și 4427 înainte de regularizare",
      "Comparați datele cu decontul D300 generat automat"
    ]
  },
  {
    id: "registrul-jurnal",
    title: "Registrul jurnal",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#registrul-jurnal",
    summary: "Registrul Jurnal obligatoriu în care se înscriu cronologic toate operațiunile patrimoniale ale societății.",
    tags: ["registrul jurnal", "cronologic", "inregistrari contabile"],
    regulations: ["Legea contabilității 82/1991 Art. 20"],
    content: "Conține lista completă a notelor contabile în ordinea cronologică a efectuării lor, cu indicarea documentului justificativ și a sumelor.",
    keySteps: [
      "Selectați perioada și listați sau exportați registrul în format PDF semnat electronic"
    ]
  },
  {
    id: "registrul-inventar",
    title: "Registrul Inventar",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#registrul-inventar",
    summary: "Gruparea tuturor elementelor de activ și pasiv inventariate la sfârșitul exercițiului financiar.",
    tags: ["registrul inventar", "active", "pasive", "sfarsit an"],
    regulations: ["Legea contabilității 82/1991 Art. 21"],
    content: "Registru contabil oficial întocmit la finele anului pe baza inventarului general al patrimoniului, cerut ca anexă la situațiile financiare anuale.",
    keySteps: [
      "Generați registrul la 31 decembrie pe baza soldurilor contabile confirmate prin inventar"
    ]
  },
  {
    id: "bilant",
    title: "Bilant",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#bilant",
    summary: "Generarea situațiilor financiare anuale și a raportărilor contabile semestriale, completare formulare și export fișier XML/PDF inteligent pentru ANAF.",
    tags: ["bilant", "situatii financiare anuale", "cont profit si pierdere", "raportare semestriala", "f10", "f20"],
    regulations: ["Ordinul anual al Ministrului Finanțelor pentru aprobarea sistemului de raportare contabilă"],
    content: "Modulul Bilanț preia datele din balanța la 31 decembrie (sau 30 iunie) și completează automat Formularul 10 (Bilanț), Formularul 20 (Contul de profit și pierdere), Formularul 30 (Date informative) și Formularul 40 (Situația activelor imobilizate). Permite generarea fișierului XML și atașarea arhivei zip cu note explicative.",
    keySteps: [
      "Închideți complet anul financiar (inclusiv contul 121 și impozitele)",
      "Deschideți modulul Bilanț și apăsați 'Actualizare'",
      "Verificați formulele de corelație între formularele F10, F20 și F30",
      "Generați fișierul XML pentru PDF-ul inteligent ANAF"
    ]
  },
  {
    id: "declaratia-406-saf-t",
    title: "Declaratia 406 - SAF-T",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-contabile",
    code: "7.1.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#declaratia-406-saf-t",
    summary: "Fișierul Standard de Control Fiscal (SAF-T / Declarația 406): validare structură XML, mapare coduri NC/CPV, nomenclator taxe și generare fișier lunar/trimestrial.",
    tags: ["saf-t", "d406", "declaratia 406", "standard audit file", "anaf", "cod nc", "tax code"],
    regulations: ["Ordinul ANAF nr. 1783/2021 privind natura informațiilor pe care contribuabilul trebuie să le declare prin SAF-T"],
    shortcuts: ["F5 - Validare consistență SAF-T"],
    content: "SAGA C include modulul complet de generare a declarației informative D406 (SAF-T). Modulul extrage automat datele despre Registrul Jurnal (GeneralLedgerEntries), Clienți (Customers), Furnizori (Suppliers), Produse (Products) și Taxe (TaxTable), verificând erorile de mapare înainte de transmiterea fișierului de mari dimensiuni.",
    keySteps: [
      "Asigurați-vă că toți terții au cod fiscal valid și județ/țară completate",
      "Verificați dacă articolele au asociate codurile NC/CPV corespunzătoare",
      "Selectați luna de raportare și apăsați 'Generare fișier SAF-T'",
      "Rulați DUKIntegrator din meniu pentru validarea structurii XML și generarea recipisei semnate"
    ],
    practicalTips: [
      "Pentru firmele cu volum mare de documente, generați fișierul din timp pentru a permite validarea structurii complexe XML.",
      "Modulul include funcție de 'Verificare date' care semnalează câmpurile lipsă cerute de specificația OECD."
    ]
  },
  {
    id: "situatii-comerciale",
    title: "Comerciale",
    level: 2,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii",
    code: "7.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatii-comerciale",
    summary: "Rapoarte de urmărire operațională a afacerii: solduri clienți/furnizori, fișe de magazie, aprovizionări, vânzări, ambalaje SGR RetuRO și rapoarte de gestiune.",
    tags: ["comerciale", "clienti", "furnizori", "stocuri", "sgr", "raport gestiune", "vanzari"],
    content: "Secțiunea oferă conducerii și departamentului comercial rapoarte detaliate despre rotația stocurilor, eficiența vânzărilor, termenele depășite de plată și trasabilitatea ambalajelor cu garanție.",
    keySteps: [
      "Filtrarea după perioadă, gestiune, terț sau agent de vânzări",
      "Trimiterea automată a extraselor de cont pentru confirmare de sold"
    ]
  },
  {
    id: "situatii-clienti-furnizori",
    title: "Situatii clienti - furnizori",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatii-clienti-furnizori",
    summary: "Urmărirea facturilor neîncasate de la clienți și a facturilor neachitate către furnizori, zile de întârziere, generare extras de cont / notificare de plată.",
    tags: ["solduri parteneri", "facturi neachitate", "clienti rau-platnici", "scadentar", "extras de cont"],
    keyAccounts: ["401", "4111"],
    shortcuts: ["F7 - Filtrare pe partener", "Generare extras de cont (Formular 14)"],
    content: "Oferă scadențarul complet al creanțelor și datoriilor. Se pot vizualiza facturile restante defalcate pe intervale de întârziere (0-30 zile, 31-60 zile, >90 zile), calcula penalități contractuale și imprima Extrase de cont oficiale conform legii contabilității.",
    keySteps: [
      "Selectați opțiunea 'Clienți' sau 'Furnizori'",
      "Bifați 'Doar cu sold' pentru a exclude partenerii stinși",
      "Selectați un partener pentru a vedea exact ce facturi compun soldul final",
      "Apăsați 'Tipărire extras' pentru a trimite confirmarea de sold la sfârșit de an"
    ]
  },
  {
    id: "situatie-cecuri-bilete-la-ordin",
    title: "Situatie cecuri-bilete la ordin",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-cecuri-bilete-la-ordin",
    summary: "Raportul centralizator al instrumentelor de debit aflate în portofoliu sau remise spre încasare/plată, grupate pe scadențe.",
    tags: ["situatie bo", "cecuri in portofoliu", "termen incasare"],
    content: "Urmărește stadiul fiecărui bilet la ordin sau cec (emis, primit, girat, decontat, refuzat la plată).",
    keySteps: [
      "Verificați instrumentele care ajung la scadență în săptămâna curentă"
    ]
  },
  {
    id: "fise-articole",
    title: "Fise articole",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#fise-articole",
    summary: "Fișa de magazie a fiecărui articol: intrări, ieșiri, preț mediu ponderat, stoc final în cantitate și valoare.",
    tags: ["fisa articol", "fisa magazie", "stoc disponibil", "pret achizitie"],
    content: "Documentul legal de evidență cantitativ-valorică la nivel de articol. Detaliază fiecare mișcare de intrare (factură furnizor) sau ieșire (factură client, bon de consum, transfer).",
    keySteps: [
      "Selectați gestiunea și articolul căutat",
      "Verificați dacă stocul scriptic este pozitiv și corelat cu realitatea din depozit"
    ]
  },
  {
    id: "situatie-aprovizionari",
    title: "Situatie aprovizionari",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-aprovizionari",
    summary: "Raport centralizator al achizițiilor de bunuri și servicii pe furnizori, articole, cantități și prețuri medii de cumpărare.",
    tags: ["aprovizionari", "raport achizitii", "pret mediu", "statistica furnizori"],
    content: "Permite analiza volumelor de achiziție, negocierea prețurilor cu furnizorii mari și identificarea fluctuațiilor de preț de cost.",
    keySteps: [
      "Filtrați după grupă de produse sau furnizor principal",
      "Exportați raportul în Excel pentru analiza de business"
    ]
  },
  {
    id: "situatie-vanzari",
    title: "Situatie vanzari",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-vanzari",
    summary: "Analiza vânzărilor pe clienți, agenți, grupe de articole, marjă brută și profitabilitate.",
    tags: ["vanzari", "raport vanzari", "adaos", "marja de profit", "top clienti"],
    content: "Prezintă vânzările realizate într-un interval, afișând prețul de vânzare, costul bunurilor descărcate și marja comercială brută obținută pe fiecare tranzacție.",
    keySteps: [
      "Selectați perioada și ordonați descrescător după valoarea totală vândută",
      "Analizați marja brută procentuală pe categorii de mărfuri"
    ]
  },
  {
    id: "situatie-consumuri",
    title: "Situatie consumuri",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-consumuri",
    summary: "Centralizatorul bonurilor de consum pe conturi de cheltuieli (601, 602, 603), gestiuni și proiecte (grupe).",
    tags: ["consumuri", "cheltuieli materiale", "urmarire bugete"],
    content: "Oferă o imagine exactă a resurselor materiale consumate intern pentru funcționarea activității sau executarea lucrărilor.",
    keySteps: [
      "Grupați după centrul de cost pentru a verifica încadrarea în bugetele stabilite"
    ]
  },
  {
    id: "situatie-obiecte-inventar",
    title: "Situatie obiecte inventar",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-obiecte-inventar",
    summary: "Raportul bunurilor aflate în folosință (cont extracontabil 8035), grupate pe angajați și locuri de folosință.",
    tags: ["obiecte inventar", "in folosinta", "salariati raspunzatori", "8035"],
    content: "Permite inventarierea bunurilor mici de patrimoniu care au fost trecute pe cheltuieli dar rămân fizic în posesia personalului.",
    keySteps: [
      "Generați fișa de inventar pe fiecare angajat la plecarea din firmă pentru lichidarea debitelor"
    ]
  },
  {
    id: "situatie-productie",
    title: "Situatie productie",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-productie",
    summary: "Rapoarte privind produsele finite obținute, consumurile specifice realizate versus rețeta normată și costul efectiv de producție.",
    tags: ["productie", "cost de productie", "consum specific", "abateri"],
    content: "Ajută la identificarea pierderilor tehnologice și la optimizarea normelor de fabricație.",
    keySteps: [
      "Comparați cantitățile planificate cu cele realizate efectiv"
    ]
  },
  {
    id: "situatie-stocuri",
    title: "Situatie stocuri",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-stocuri",
    summary: "Stocul faptic la data curentă sau la o dată din trecut: cantitate, preț unitar, valoare totală pe gestiuni, articole fără mișcare.",
    tags: ["situatie stocuri", "inventar curent", "stoc la zi", "valoare stoc"],
    content: "Raportul oferă inventarul complet al firmei la orice zi dorită din istoric. Include opțiuni de filtrare pentru articolele cu stoc zero sau articole fără mișcare în ultimele 90 de zile.",
    keySteps: [
      "Introduceți data la care doriți evaluarea patrimoniului de stocuri",
      "Comparați totalul valoric al stocurilor cu soldul conturilor 301, 302, 371 din balanță"
    ]
  },
  {
    id: "raport-de-gestiune",
    title: "Raport de gestiune",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.10",
    officialUrl: "https://manual.sagasoft.ro/sagac/#raport-de-gestiune",
    summary: "Raportul de gestiune zilnic obligatoriu pentru comerțul cu amănuntul: sold inițial marfă, intrări, vânzări zilnice conform raport Z și sold final.",
    tags: ["raport gestiune", "magazin amanuntul", "raport z", "vanzari zilnice"],
    regulations: ["Ordinul MFP nr. 2634/2015 privind documentele financiar-contabile"],
    content: "Documentul zilnic legal pentru magazinele cu gestiune global-valorică. Înregistrează intrările de marfă din facturi (la preț de vânzare) și ieșirile conform bonurilor fiscale / raportului fiscal Z al casei de marcat.",
    keySteps: [
      "Selectați gestiunea global-valorică",
      "Verificați concordanța zilnică între numerarul marcat pe casa fiscală și ieșirea de marfă"
    ]
  },
  {
    id: "situatie-ambalaje-sgr",
    title: "Situatie ambalaje SGR",
    level: 3,
    chapterNumber: 7,
    chapterName: "Situatii",
    parentId: "situatii-comerciale",
    code: "7.2.11",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-ambalaje-sgr",
    summary: "Evidența Sistemului de Garanție-Returnare (SGR RetuRO): ambalaje cumpărate (0.50 lei/buc), ambalaje vândute, garanții reținute/returnate și reconciliere financiară.",
    tags: ["sgr", "returo", "garantie 0.50 lei", "ambalaje primare", "evidenta ambalaje"],
    keyAccounts: ["461.SGR", "462.SGR", "401", "4111"],
    regulations: ["HG nr. 1074/2021 privind stabilirea sistemului de garanție-returnare pentru ambalaje primare nereutilizabile"],
    shortcuts: ["F5 - Reconciliere ambalaje SGR"],
    content: "Modulul oficial SAGA C dedicat obligațiilor legale legate de RetuRO SGR. Monitorizează numărul ambalajelor SGR facturate pe linia distinctă cu garanția de 0.50 lei la intrare și la ieșire, permițând raportarea automată a cantităților către administratorul RetuRO și reconcilierea contabilă.",
    keySteps: [
      "Verificați înregistrarea distinctă a garanției SGR în facturile de intrări și ieșiri",
      "Generați raportul lunar cu numărul de unități puse pe piață sau returnate",
      "Comparați soldul garanțiilor neîncasate cu registrul de gestiune RetuRO"
    ],
    practicalTips: [
      "Garanția SGR de 0.50 lei nu este purtătoare de TVA; asigurați-vă că folosiți tipul de articol special 'Garanție SGR' configurat fără TVA."
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 8: DIVERSE
  // ----------------------------------------------------
  {
    id: "diverse",
    title: "Diverse",
    level: 1,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: null,
    code: "8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#diverse",
    summary: "Module operaționale auxiliare: comenzi clienți/furnizori, contracte comerciale, cheltuieli în avans, diurne, e-Transport, acționari și declarații fiscale D205/Intrastat.",
    tags: ["diverse", "comenzi", "contracte", "e-transport", "diurne", "d205", "intrastat"],
    content: "Reunește funcționalitățile extinse de management comercial, evidență fiscală specială și conformitate logistică (cum ar fi generarea codurilor UIT pentru e-Transport).",
    keySteps: [
      "Gestionarea comenzilor și transformarea lor automată în facturi",
      "Urmărirea contractelor cu facturare recurentă periodică",
      "Monitorizarea transporturilor rutiere cu risc fiscal ridicat (e-Transport)"
    ]
  },
  {
    id: "comenzi",
    title: "Comenzi",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#comenzi",
    summary: "Înregistrarea comenzilor de la clienți și a comenzilor către furnizori, generare automată de proforme și rezervare de stoc.",
    tags: ["comenzi", "comenzi clienti", "comenzi furnizori", "proforme", "rezervare stoc"],
    content: "Permite operarea comenzilor comerciale. O comandă de client poate fi transformată cu un singur clic în factură de ieșire sau aviz, descărcând automat cantitățile comandate.",
    keySteps: [
      "Introduceți comanda primită de la client",
      "Verificați stocul disponibil în depozit",
      "Apăsați 'Facturare' pentru generarea automată a facturii fiscale în ecranul Ieșiri"
    ]
  },
  {
    id: "situatie-comenzi",
    title: "Situatie comenzi",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatie-comenzi",
    summary: "Monitorizarea gradului de onorare a comenzilor (comenzi deschise, parțial livrate, finalizate sau anulate).",
    tags: ["situatie comenzi", "comenzi nelivrate", "urmarire livrari"],
    content: "Afișează diferența dintre cantitățile comandate inițial și cele facturate efectiv, semnalând întârzierile de onorare către clienți.",
    keySteps: [
      "Filtrați după comenzi nefinalizate pentru planificarea livrărilor"
    ]
  },
  {
    id: "contracte",
    title: "Contracte",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#contracte",
    summary: "Gestiunea contractelor cu clienții: abonamente periodice, chirii, generare automată în masă a facturilor lunare recurente.",
    tags: ["contracte", "facturare automata", "recurenta", "abonamente", "chirii"],
    content: "Ideal pentru firmele care facturează servicii lunare recurente (mentenanță, chirii, servicii contabile). Permite generarea simultană a zeci sau sute de facturi pe baza contractelor active.",
    keySteps: [
      "Definiți contractul cu valoarea lunară, data de emitere și clientul",
      "La începutul fiecărei luni apăsați 'Generare facturi din contracte'",
      "Facturile sunt emise și gata de trimitere în e-Factura"
    ]
  },
  {
    id: "cheltuieli-venituri-in-avans",
    title: "Cheltuieli-Venituri in avans",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#cheltuieli-venituri-in-avans",
    summary: "Eșalonarea lunară automată a cheltuielilor și veniturilor înregistrate în avans prin conturile 471 și 472 (asigurări RCA/CASCO, chirii plătite în avans).",
    tags: ["cheltuieli in avans", "471", "472", "esalonare lunara", "asigurari"],
    keyAccounts: ["471 - Cheltuieli înregistrate în avans", "472 - Venituri înregistrate în avans", "613 = 471"],
    content: "Evită denaturarea rezultatului lunar prin repartizarea ratelor de cheltuială pe întreaga durată de valabilitate a contractului (ex: o poliță RCA anuală se împarte automat în 12 cote lunare egale).",
    keySteps: [
      "Înregistrați factura de achiziție pe contul 471 în Intrări",
      "În ecranul de eșalonare stabiliți numărul de luni și contul de cheltuială de destinație (ex: 613)",
      "La fiecare închidere de lună, SAGA C generează automat cota-parte de cheltuială"
    ]
  },
  {
    id: "import-date",
    title: "Import date",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#import-date",
    summary: "Importul automat de date din alte aplicații sau filiale: import documente XML/DBF/CSV, sincronizare cu magazine online (e-commerce).",
    tags: ["import date", "sincronizare", "xml", "csv", "ecommerce", "prestashop", "woocommerce"],
    content: "Permite conectarea SAGA C cu platforme exterioare: magazine online (WooCommerce, Shopify, PrestaShop), aplicații de distribuție pe teren ale agenților sau importul vânzărilor din alte softuri de gestiune.",
    keySteps: [
      "Selectați formatul fișierului de import (XML SAGA sau DBF)",
      "Alegeți directorul sursă și verificați datele afișate în previzualizare",
      "Apăsați 'Import' – documentele sunt adăugate automat în baza de date"
    ]
  },
  {
    id: "normare",
    title: "Normare",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#normare",
    summary: "Urmărirea timpului de lucru pe comenzi sau sarcini specifice, manoperă directă alocată pe produse.",
    tags: ["normare", "manopera", "timp de lucru", "pontaj comenzi"],
    content: "Utilizat în activitățile de service, reparații sau ateliere meșteșugărești pentru repartizarea orelor de manoperă pe fiecare comandă de producție în parte.",
    keySteps: [
      "Definiți operațiunile de producție și timpii normate",
      "Înregistrați realizările zilnice pe angajați"
    ]
  },
  {
    id: "diurne",
    title: "Diurne",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#diurne",
    summary: "Calculul diurnelor interne și externe pentru deplasări: verificarea plafoanelor neimpozabile (de 2.5 ori nivelul stabilit pentru instituții publice) și a plafonului de 3 salarii de bază.",
    tags: ["diurne", "deplasari", "ordin de deplasare", "plafon neimpozabil", "cod fiscal diurna"],
    regulations: ["Codul Fiscal Art. 76 alin. (2) lit. k)", "HG 714/2018"],
    content: "Calculează automat indemnizațiile de delegare/detașare interne și externe. Verifică încadrarea în plafonul neimpozabil legal și transferă automat diferențele ce depășesc plafonul în statul de salarii ca venituri asimilate salariilor supuse contribuțiilor sociale.",
    keySteps: [
      "Introduceți salariatul, destinația și intervalul orar de plecare/sosire",
      "Programul calculează numărul de zile de diurnă și suma cuvenită",
      "Tipăriți Ordinul de deplasare (decont de cheltuieli) conform normelor legale"
    ]
  },
  {
    id: "situatii-manageriale",
    title: "Situatii manageriale",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#situatii-manageriale",
    summary: "Rapoarte executive pentru conducere: flux de numerar (Cash-Flow), grafice evoluție venituri/cheltuieli, indicatori financiari de lichiditate și rentabilitate.",
    tags: ["situatii manageriale", "cash flow", "indicatori financiari", "profitabilitate", "grafice"],
    content: "Oferă antreprenorilor și directorilor financiari o privire de ansamblu asupra sănătății financiare a firmei, sintetizând evoluția cifrei de afaceri, a profitului net și a nevoii de fond de rulment.",
    keySteps: [
      "Selectați indicatorii doriți și perioada de comparare (an curent vs an precedent)",
      "Analizați structura cheltuielilor pentru optimizarea costurilor fixe"
    ]
  },
  {
    id: "masini",
    title: "Masini",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#masini",
    summary: "Parcul auto al societății: evidența autovehiculelor, foi de parcurs (FAAR), consum normat de combustibil, alocare automată deducere 50% TVA și impozit.",
    tags: ["masini", "parc auto", "foi de parcurs", "consum carburant", "deducere auto 50%"],
    content: "Centralizează vehiculele deținute în proprietate sau leasing. Permite întocmirea foilor de parcurs zilnice pentru justificarea deductibilității integrale (100%) a cheltuielilor cu vehiculele utilizate exclusiv pentru activitate economică.",
    keySteps: [
      "Introduceți numărul de înmatriculare, marca și norma de consum pe 100 km",
      "Înregistrați traseele parcurse în foaia de parcurs",
      "Corelați bonurile de combustibil introduse în Intrări cu foile de parcurs completate"
    ]
  },
  {
    id: "e-transport",
    title: "e-Transport",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.10",
    officialUrl: "https://manual.sagasoft.ro/sagac/#e-transport",
    summary: "Sistemul Național RO e-Transport: declararea transporturilor rutiere de bunuri cu risc fiscal ridicat și a transporturilor internaționale, obținere cod UIT de la ANAF.",
    tags: ["e-transport", "cod uit", "anaf", "transport rutier", "bunuri risc fiscal"],
    regulations: ["OUG nr. 41/2022 privind Sistemul național RO e-Transport", "Legea 296/2023"],
    content: "Gestionează obligațiile de raportare în sistemul e-Transport pentru vehicule cu masa maximă autorizată de minimum 2.5 tone și încărcătură de peste 500 kg sau valoare mai mare de 10.000 lei. Generează fișierul XML, comunică prin API cu serverele ANAF și stochează codul UIT obținut.",
    keySteps: [
      "Selectați transportul din avizele de ieșire sau facturile de achiziție intracomunitară",
      "Completați numărul mașinii de transport și punctul de trecere a frontierei / traseul",
      "Apăsați 'Generare și trimitere e-Transport' pentru obținerea codului unic UIT",
      "Înscrieți codul UIT pe documentul de transport (CMR / aviz) înmânat șoferului"
    ],
    practicalTips: [
      "Codul UIT are o valabilitate limitată legală (5 zile sau 15 zile pentru importuri); solicitați-l înainte de punerea în mișcare a vehiculului."
    ]
  },
  {
    id: "actionari",
    title: "Actionari",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.11",
    officialUrl: "https://manual.sagasoft.ro/sagac/#actionari",
    summary: "Registrul asociaților/acționarilor societății: cote de participare la capitalul social, dividende brute repartizate, impozit pe dividende reținut (8%) și dividende nete plătite.",
    tags: ["actionari", "asociati", "dividende", "impozit dividende", "457", "446"],
    keyAccounts: ["1171 = 457", "457 = 446 (Impozit 8%)", "457 = 5121/5311 (Plată net)"],
    content: "Evidențiază structura acționariatului și calculul dividendelor. La repartizarea profitului net prin hotărârea AGA, generează automat notele contabile și calculul impozitului pe dividende datorat bugetului de stat.",
    keySteps: [
      "Introduceți asociații cu CNP/CUI și procentul de deținere",
      "Înregistrați hotărârea AGA de repartizare dividende",
      "Programul calculează impozitul pe dividende și pregătește datele pentru Declarația 100 și Declarația 205"
    ]
  },
  {
    id: "declaratia-intrastat",
    title: "Declaratia intrastat",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.12",
    officialUrl: "https://manual.sagasoft.ro/sagac/#declaratia-intrastat",
    summary: "Raportarea statistică a schimburilor de bunuri între statele membre UE pentru firmele care au depășit pragurile valorice stabilite de INS.",
    tags: ["intrastat", "ins", "schimburi intracomunitare", "statistica", "cod nc"],
    regulations: ["Ordinul anual al Președintelui Institutului Național de Statistică privind pragurile valorice Intrastat"],
    content: "Generează fișierul lunar cerut de Institutul Național de Statistică pentru fluxurile de Introducere (achiziții UE) și Expediere (livrări UE), pe baza codurilor tarifare din nomenclatorul combinat (NC8).",
    keySteps: [
      "Verificați dacă toate articolele intrate/ieșite din spațiul UE au completate greutatea netă și codul NC",
      "Apăsați 'Generare fișier Intrastat' și validați-l cu aplicația furnizată de INS"
    ]
  },
  {
    id: "declaratia-205",
    title: "Declaratia 205",
    level: 2,
    chapterNumber: 8,
    chapterName: "Diverse",
    parentId: "diverse",
    code: "8.13",
    officialUrl: "https://manual.sagasoft.ro/sagac/#declaratia-205",
    summary: "Declarația informativă anuală privind impozitul reținut la sursă și câștigurile/pierderile din dividende, dobânzi, drepturi de autor și convenții civile.",
    tags: ["declaratia 205", "d205", "impozit retinut la sursa", "dividende asociati"],
    regulations: ["Codul Fiscal Art. 132"],
    content: "Declarație informativă anuală depusă la ANAF până în ultima zi a lunii februarie a anului următor, cuprinzând toți beneficiarii de venituri cu reținere la sursă (dividende plătite asociaților, contracte de drepturi de proprietate intelectuală, etc.).",
    keySteps: [
      "Selectați anul de raportare",
      "Verificați beneficiarii preluați automat din modulul Acționari și Stat de plată",
      "Generați fișierul XML și depuneți PDF-ul inteligent pe portalul e-Guvernare"
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 9: ADMINISTRARE
  // ----------------------------------------------------
  {
    id: "administrare",
    title: "Administrare",
    level: 1,
    chapterNumber: 9,
    chapterName: "Administrare",
    parentId: null,
    code: "9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#administrare",
    summary: "Mentenanța tehnică a bazelor de date SAGA C, copii de siguranță (backup), restaurare, reindexare și plaje de numere/serii pentru documente.",
    tags: ["administrare", "backup", "salvare baza date", "serii documente", "reindexare"],
    content: "Meniul de administrare conține instrumentele tehnice pentru menținerea integrității datelor și siguranței informațiilor contabile arhivate pe termen lung.",
    keySteps: [
      "Efectuarea copiilor de siguranță periodice pe suporturi externe (stick, cloud)",
      "Configurarea seriilor decizionale interne pentru facturi și chitanțe conform OMFP 2634/2015"
    ]
  },
  {
    id: "intretinere-bd",
    title: "Intretinere BD",
    level: 2,
    chapterNumber: 9,
    chapterName: "Administrare",
    parentId: "administrare",
    code: "9.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#intretinere-bd",
    summary: "Salvare de siguranță (copiere arhivă ZIP a bazei de date), restaurare date din copie anterioară, verificare integritate și reindexare fișiere.",
    tags: ["intretinere bd", "backup", "salvare", "restaurare", "reindexare", "integritate date"],
    shortcuts: ["Salvare rapidă bază de date"],
    content: "Cel mai important utilitar de protecție a datelor. Permite crearea unei arhive ZIP comprimate a firmei curente sau a tuturor firmelor din aplicație. În caz de defecțiune tehnică, datele pot fi restaurate integral în câteva secunde.",
    keySteps: [
      "Deschideți Administrare > Întreținere BD",
      "În fila 'Salvare/Restaurare', alegeți directorul de destinație și apăsați 'Start'",
      "Copiați fișierul ZIP obținut pe un dispozitiv extern sau serviciu de stocare cloud",
      "Fila 'Avansat' oferă opțiuni de Reindexare tabele în caz de cădere de curent"
    ],
    practicalTips: [
      "Efectuați o salvare de siguranță cel puțin o dată pe săptămână și obligatoriu înainte de fiecare actualizare a programului SAGA C."
    ]
  },
  {
    id: "numere-si-serii",
    title: "Numere si serii",
    level: 2,
    chapterNumber: 9,
    chapterName: "Administrare",
    parentId: "administrare",
    code: "9.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#numere-si-serii",
    summary: "Definirea seriilor decizionale și a plajelor de numere pentru documentele emise: facturi, chitanțe, avize, bonuri de consum, transferuri.",
    tags: ["numere si serii", "serii facturi", "plaja numere", "omfp 2634", "decizie numerotare"],
    regulations: ["OMFP nr. 2634/2015 privind documentele financiar-contabile (Decizia de numerotare)"],
    content: "Conform legislației, orice societate trebuie să emită la începutul fiecărui an o decizie internă de numerotare a documentelor. În acest ecran se configurează prefixul seriei (ex: FAC, BV, CH) și numărul de pornire pentru fiecare punct de lucru sau agent.",
    keySteps: [
      "Selectați tipul documentului (Facturi, Chitanțe, Avize, NIR-uri)",
      "Introduceți seria alocată și primul număr din plajă",
      "SAGA C va incrementa automat numărul la emiterea fiecărui document nou"
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 10: AJUTOR
  // ----------------------------------------------------
  {
    id: "ajutor",
    title: "Ajutor",
    level: 1,
    chapterNumber: 10,
    chapterName: "Ajutor",
    parentId: null,
    code: "10",
    officialUrl: "https://manual.sagasoft.ro/sagac/#ajutor",
    summary: "Manualul de utilizare integrat (tasta F1), actualizare automată a programului pe internet, acces la forumul de asistență SAGA și datele versiunii curente.",
    tags: ["ajutor", "manual", "f1", "actualizare automata", "forum saga", "asistenta"],
    shortcuts: ["F1 - Deschiderea manualului contextual"],
    content: "Meniul Ajutor asigură asistența permanentă a utilizatorului. Conține scurtătura directă către manualul oficial online (manual.sagasoft.ro), procedura de verificare și descărcare a noilor versiuni lansate de producător și legătura directă cu comunitatea celor peste 100.000 de contabili de pe forumul Saga Software.",
    keySteps: [
      "Apăsați 'Actualizare automată' pentru a verifica dacă a fost lansată o versiune nouă",
      "Consultați ecranul 'Despre' pentru a verifica numărul versiunii instalate și data expirării abonamentului",
      "Folosiți 'Manual de utilizare' sau apăsați F1 din orice fereastră pentru explicații detaliate"
    ]
  },

  // ----------------------------------------------------
  // CAPITOLUL 11: UTILE
  // ----------------------------------------------------
  {
    id: "utile",
    title: "Utile",
    level: 1,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: null,
    code: "11",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile",
    summary: "Ghiduri practice de lucru rapid, proceduri speciale de operare cu coduri de bare, conectare case de marcat fiscale, tratament fiscal al achizițiilor și ambalaje SGR.",
    tags: ["utile", "sfaturi", "ghiduri practice", "coduri de bare", "casa marcat", "tratament fiscal"],
    content: "Capitolul Utile reunește spețe avansate, proceduri de optimizare a timpului de tastare și instrucțiuni pas-cu-pas pentru cele mai frecvente operațiuni complexe din practica contabilă.",
    keySteps: [
      "Consultarea ghidurilor specifice pentru accelerarea operării zilnice",
      "Aplicarea corectă a tratamentelor fiscale conform Codului Fiscal"
    ]
  },
  {
    id: "utile-operare-rapida-iesiri",
    title: "Operare rapida din iesiri",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.1",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-operare-rapida-iesiri",
    summary: "Tehnici de introducere accelerată a facturilor de vânzare folosind tastatura exclusiv, duplicare documente și autocompletare pe baza istoricului partenerului.",
    tags: ["operare rapida", "productivitate", "taste rapide", "duplicare factura"],
    shortcuts: ["F2 urmat de Enter", "Săgeată Jos pentru selecție instant terț"],
    content: "Ghid dedicat reducerii timpului de introducere a documentelor. Explică utilizarea fluxului fără mouse (folosind doar tastele TAB, ENTER și săgeți), salvarea automată a liniilor și preluarea prețurilor din ultima livrare către acel client.",
    keySteps: [
      "Configurarea ordinii câmpurilor în Setări diverse",
      "Folosirea funcției de căutare după primele litere din denumire sau CIF",
      "Utilizarea opțiunii 'Copiere' pentru facturi identice emise lunar"
    ]
  },
  {
    id: "utile-preluare-solduri-tertilor",
    title: "Preluare solduri tertilor",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.2",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-preluare-solduri-tertilor",
    summary: "Procedura corectă de introducere a facturilor restante neîncasate/neachitate la data începerii evidenței contabile în SAGA C.",
    tags: ["preluare solduri", "facturi restante", "pornire firma", "sold 401", "sold 4111"],
    keyAccounts: ["401", "4111"],
    content: "La trecerea pe SAGA C nu este suficient să introduceți soldul global din balanță pe 401 sau 4111. În ecranul special de preluare solduri terți se introduc individual fiecare factură rămasă neachitată la acea dată, cu numărul documentului, data emiterii, data scadenței și restul de plată. Acest lucru permite stingerea punctuală a fiecărei facturi la prima încasare/plată ulterioară.",
    keySteps: [
      "Deschideți utilitarul din Configurare > Preluare solduri terți",
      "Selectați terțul și apăsați 'Adaug'",
      "Introduceți numărul facturii vechi, data inițială și valoarea restantă",
      "Suma tuturor facturilor preluate trebuie să coincidă perfect cu soldul contului din Preluare date contabile"
    ]
  },
  {
    id: "utile-etichete",
    title: "Etichete",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.3",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-etichete",
    summary: "Generarea și tipărirea etichetelor de preț și a etichetelor cu coduri de bare pentru mărfuri la imprimante termice sau foi A4.",
    tags: ["etichete", "cod de bare", "imprimanta termica", "etichete pret", "raft"],
    content: "Modul utilitar pentru magazine și depozite. Permite tipărirea etichetelor de raft sau de produs cu denumire, preț de vânzare cu TVA, unitate de măsură și cod de bare format EAN-13 sau Code-128 direct din facturile de intrare validate.",
    keySteps: [
      "Selectați documentul de intrare din care doriți să listați etichete",
      "Alegeți formatul etichetei (dimensiuni în mm sau număr de coloane pe coală)",
      "Apăsați 'Tipărire' pentru trimiterea la imprimantă"
    ]
  },
  {
    id: "utile-operare-cu-cod-de-bare",
    title: "Operare cu cod de bare",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.4",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-operare-cu-cod-de-bare",
    summary: "Configurarea cititoarelor de coduri de bare (scannere USB/Bluetooth) pentru adăugarea instantanee a articolelor pe facturi și bonuri.",
    tags: ["scanner", "cod de bare", "cititor usb", "vanzare rapida"],
    content: "Descrie configurarea scanerelor în emulare de tastatură. La scanarea unui produs la recepție sau facturare, SAGA C identifică automat articolul, adaugă o linie nouă și incrementează cantitatea fără intervenție manuală.",
    keySteps: [
      "Asigurați-vă că cititorul este configurat cu sufix ENTER",
      "Asociați codurile de bare în Nomenclatoare > Articole",
      "În ecranul de Ieșiri scanați produsele succesiv"
    ]
  },
  {
    id: "utile-operare-rapida-iesiri-avize",
    title: "Operare rapida din iesiri (avize si descarcare)",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.5",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-operare-rapida-iesiri-avize",
    summary: "Facturarea cumulată pe baza mai multor avize de însoțire a mărfii emise anterior către același client.",
    tags: ["facturare din avize", "avize de expeditie", "factura centralizatoare", "418"],
    keyAccounts: ["418 = 707", "4111 = 418"],
    content: "Procedura prin care livrările efectuate pe parcursul unei săptămâni sau luni pe bază de aviz de însoțire sunt grupate automat pe o singură factură fiscală de sfârșit de perioadă, închizând contul de clienți - facturi de întocmit (418).",
    keySteps: [
      "Emiteți livrările curente selectând tipul 'Aviz' în Ieșiri",
      "La emiterea facturii definitive, apăsați butonul 'Generare din avize'",
      "Bifați avizele clientului ce urmează a fi facturate cumulativ"
    ]
  },
  {
    id: "utile-conectarea-la-casa-de-marcat",
    title: "Conectarea la casa de marcat",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.6",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-conectarea-la-casa-de-marcat",
    summary: "Configurarea driverelor de comunicare (FiscalNet, Dprint, FPrint, etc.) pentru tipărirea automată a bonurilor fiscale direct din SAGA C.",
    tags: ["casa de marcat", "driver fiscal", "datecs", "custom", "activa", "bon fiscal"],
    content: "Instrucțiuni complete de legare a caselor de marcat cu jurnal electronic (Datecs, Daisy, Custom, Tremol, Sam4s) prin cablu serial/USB/rețea. La validarea unei facturi sau vânzări cu amănuntul, SAGA C trimite comanda de tipărire directă a bonului fiscal cu cod de bare și cote de TVA corelate.",
    keySteps: [
      "Instalați driverul pus la dispoziție de distribuitorul casei de marcat",
      "Configurați directorul de transfer comenzi din Setări diverse",
      "Asociați cotele de TVA din SAGA C cu departamentele din casa fiscală (ex: Cota A = 19%, Cota B = 9%)"
    ]
  },
  {
    id: "utile-introducerea-raportului-fiscal-z",
    title: "Introducerea raportului fiscal Z",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.7",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-introducerea-raportului-fiscal-z",
    summary: "Monografia contabilă și înregistrarea raportului zilnic Z emis de aparatul de marcat fiscal în Ieșiri și Registrul de Casă.",
    tags: ["raport z", "vanzare zilnica", "5311", "707", "4427", "casa de marcat"],
    keyAccounts: ["5311 = 707", "5311 = 4427", "5125 = 707 (încasări cu cardul POS)"],
    content: "La sfârșitul fiecărei zile lucrătoare se scoate Raportul Z de la casa fiscală. Înregistrarea lui în SAGA C se realizează prin crearea unui client fictiv 'Vânzări cu amănuntul' în Ieșiri, defalcând sumele încasate cu numerar (5311) de cele încasate prin card bancar / POS (cont 5125).",
    keySteps: [
      "Creați partenerul 'Vânzări magazin conform raport Z'",
      "Introduceți totalul brut defalcat pe cotele de TVA de pe raportul tipărit",
      "Înregistrați încasarea prin numerar și prin contul colector POS (5125)",
      "Verificați la sfârșitul lunii corelația cu decontul de TVA și extrasul bancar"
    ]
  },
  {
    id: "utile-productie-ciclu-lung",
    title: "Productie pentru ciclu de executie mai lung de o luna",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.8",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-productie-ciclu-lung",
    summary: "Evidența producției în curs de execuție la sfârșitul lunii prin contul 331 și reluarea acesteia la începutul lunii următoare conform OMFP 1802/2014.",
    tags: ["productie neterminata", "331", "711", "ciclu lung", "constructii", "servicii in curs"],
    keyAccounts: ["331 = 711 (la 31 ale lunii)", "711 = 331 (la 01 ale lunii următoare)"],
    regulations: ["OMFP 1802/2014 Punctul 286 (Producția în curs de execuție)"],
    content: "Pentru activitățile de construcții, reparații navale sau proiecte software complexe unde fabricarea durează mai multe luni, cheltuielile acumulate în conturile de clasă 6 trebuie compensate la finele fiecărei luni cu veniturile aferente producției în curs de execuție (331 = 711), pentru a nu denatura nejustificat rezultatul financiar.",
    keySteps: [
      "Determinați costul cheltuielilor încorporate în lucrările neterminate la sfârșitul lunii",
      "Înregistrați nota contabilă 331 = 711 în Articole contabile",
      "La prima zi a lunii următoare, reluați producția în curs prin nota inversă 711 = 331"
    ]
  },
  {
    id: "utile-memento",
    title: "Memento",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.9",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-memento",
    summary: "Agendă electronică de alerte și notificări: scadențe de declarații fiscale, expirări de contracte, ITP/RCA la parcul auto sau revizii.",
    tags: ["memento", "alerte", "scadente", "calendar fiscal", "notificari"],
    content: "Utilitar integrat pentru programarea memento-urilor contabile și administrative. La deschiderea programului, SAGA C afișează automat fereastra de avertizare cu sarcinile ajunse la scadență.",
    keySteps: [
      "Adăugați memento cu data, titlul și frecvența de repetare (unic, lunar, anual)",
      "Setați notificări cu X zile înainte de termenul limită"
    ]
  },
  {
    id: "utile-evidentierea-ambalajelor-sgr",
    title: "Evidentierea ambalajelor SGR",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.10",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-evidentierea-ambalajelor-sgr",
    summary: "Monografia contabilă completă a garanției SGR RetuRO pentru producători, distribuitori și comercianți cu amănuntul (conturi 461/462, tratament fără TVA).",
    tags: ["ghid sgr", "monografie sgr", "returo", "461", "462", "ambalaje"],
    keyAccounts: ["461.SGR = 401 (la intrare)", "4111 = 462.SGR (la ieșire)", "462.SGR = 5311/5121 (la restituire garanție către client)"],
    regulations: ["Ghidul fiscal ANAF și HG 1074/2021 privind sistemul de garanție-returnare"],
    content: "Ghid detaliat privind aplicarea regimului garanției de 0.50 lei conform normelor Ministerului Mediului și ANAF. Explică tratamentul pentru vânzarea prin automate RVM, decontarea cu administratorul RetuRO și facturarea tarifului de gestionare primit de comerciant (tariful de gestiune este purtător de TVA 19%, spre deosebire de garanția în sine).",
    keySteps: [
      "Configurarea articolului de garanție în Nomenclator cu tip 'Serviciu' și cota TVA 0%",
      "Înregistrarea garanției pe rând distinct în factură",
      "Înregistrarea facturii lunare pentru tariful de administrare emisă către RetuRO (704 = 4111 cu TVA 19%)"
    ]
  },
  {
    id: "utile-tratament-fiscal-al-intrarilor",
    title: "Tratament fiscal al intrarilor",
    level: 2,
    chapterNumber: 11,
    chapterName: "Utile",
    parentId: "utile",
    code: "11.11",
    officialUrl: "https://manual.sagasoft.ro/sagac/#utile-tratament-fiscal-al-intrarilor",
    summary: "Ghid cuprinzător privind încadrarea fiscală a achizițiilor: deducere TVA (100%, 50%, 0%), protocol, sponsorizări, taxare inversă deșeuri/cereale/imobile și cheltuieli nedeductibile.",
    tags: ["tratament fiscal", "deductibilitate", "protocol", "sponsorizare", "taxare inversa", "omfp 1802"],
    keyAccounts: ["623.1 - Cheltuieli de protocol", "623.2 - Cheltuieli de sponsorizare", "6588 - Alte cheltuieli de exploatare (nedeductibile)"],
    regulations: ["Codul Fiscal Art. 25 (Cheltuieli), Art. 297-298 (Deducerea TVA)"],
    content: "Manual de referință privind reflectarea în SAGA C a cheltuielilor cu regim fiscal special: 1. Cheltuieli de protocol (deductibile în limita a 2% aplicată bazei de calcul); 2. Cheltuieli sociale (limită 5% din fondul de salarii); 3. Cheltuieli de sponsorizare (credit fiscal în limitele legale); 4. Deducerea 50% pentru vehiculele mixte; 5. Operațiunile supuse taxării inverse conform art. 331 din Codul Fiscal (cereale, deșeuri, certificate verzi).",
    keySteps: [
      "Asocierea analiticului corespunzător la operarea facturii în Intrări",
      "Setarea tipului de deducere TVA în coloana dedicată din ecranul de recepție",
      "Verificarea calculului automat al cheltuielilor nedeductibile la închiderea de trimestru în modulul Impozit pe profit"
    ],
    practicalTips: [
      "Folosiți analitice distincte pentru cheltuielile nedeductibile (ex: 628.NED, 6588.NED) pentru a simplifica completarea declarației 101."
    ]
  }
];

export const TOTAL_MAIN_CHAPTERS = 11;
export const TOTAL_ENTRIES = SAGA_MANUAL_ENTRIES.length; // 98
