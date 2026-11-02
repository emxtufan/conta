/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { User, CompanyListItem, CompanyDetailed, CAENCode } from './types/company';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { CompanyList } from './components/companies/CompanyList';
import { CompanyForm } from './components/companies/CompanyForm';
import { CompanyDetailsModal } from './components/companies/CompanyDetailsModal';
import { AcceptanceTestsModal } from './components/tests/AcceptanceTestsModal';
import { FutureModuleModal } from './components/common/FutureModuleModal';
import { HomeDashboard } from './components/dashboard/HomeDashboard';
import { AuthView } from './components/auth/AuthView';
import { AutomaticAccountsView } from './components/accounting/AutomaticAccountsView';
import { SettingsDiverseView } from './components/settings/SettingsDiverseView';
import { OpeningBalanceView } from './components/opening/OpeningBalanceView';
import { SAGA_MANUAL_ENTRIES } from './data/sagaManualData';
import { SidebarTree } from './components/SidebarTree';
import { ManualReader } from './components/ManualReader';
import { LevelFilter } from './types';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contabilitate_ro_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('contabilitate_ro_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('contabilitate_ro_theme', 'light');
    }
  }, [darkMode]);

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Active view
  const [activeView, setActiveView] = useState<ActiveView>('companies');

  // Companies state
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState<boolean>(false);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contabilitate_ro_active_company_id');
      return saved ? parseInt(saved, 10) : null;
    }
    return null;
  });
  const [activeCompanyDetailed, setActiveCompanyDetailed] = useState<CompanyDetailed | null>(null);

  // CAEN codes
  const [caenCodes, setCaenCodes] = useState<CAENCode[]>([]);
  const [nextInternalCode, setNextInternalCode] = useState<string>('0001');

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyDetailed | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<CompanyDetailed | null>(null);
  const [testsModalOpen, setTestsModalOpen] = useState(false);
  const [futureModalModule, setFutureModalModule] = useState<string | null>(null);

  // Reference SAGA Manual view state (when activeView === 'help_saga')
  const [selectedManualId, setSelectedManualId] = useState<string>('configurare-societati');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualLevelFilter, setManualLevelFilter] = useState<LevelFilter>('all');
  const [manualBookmarks, setManualBookmarks] = useState<string[]>(['configurare-societati']);
  const [manualExpandedParents, setManualExpandedParents] = useState<Set<string>>(
    new Set(['configurare', 'configurare-societati'])
  );

  // 1. Verificare inițială a sesiunii
  useEffect(() => {
    const checkAuth = async () => {
      const token = api.getToken();
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const { user } = await api.getMe();
        setCurrentUser(user);
      } catch (err) {
        api.setToken(null);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  // 2. Încărcare companii & coduri CAEN
  const loadCompanies = useCallback(async () => {
    if (!currentUser) return;
    setCompaniesLoading(true);
    try {
      const [list, caenList, codeData] = await Promise.all([
        api.getCompanies(),
        api.getCAENCodes(),
        api.getNextCode(),
      ]);

      setCompanies(list);
      setCaenCodes(caenList);
      setNextInternalCode(codeData.next_code);

      // Verificare dacă utilizatorul nu are nicio societate (Zero-state onboarding)
      if (list.length === 0) {
        setEditingCompany(null);
        setFormModalOpen(true);
      } else {
        // Dacă nu avem o societate activă selectată sau cea salvată nu mai e în listă, selectăm prima activă
        const currentActive = list.find(c => c.id === activeCompanyId && c.is_active === 1);
        if (!currentActive) {
          const firstActive = list.find(c => c.is_active === 1) || list[0];
          if (firstActive) {
            handleSelectActiveCompany(firstActive.id);
          }
        }
      }
    } catch (err: any) {
      console.error('Eroare la încărcarea companiilor:', err);
    } finally {
      setCompaniesLoading(false);
    }
  }, [currentUser, activeCompanyId]);

  useEffect(() => {
    if (currentUser) {
      loadCompanies();
    }
  }, [currentUser, loadCompanies]);

  // 3. Încărcare detalii societate activă
  useEffect(() => {
    if (!currentUser || !activeCompanyId) {
      setActiveCompanyDetailed(null);
      return;
    }

    const fetchDetailed = async () => {
      try {
        const detailed = await api.getCompany(activeCompanyId);
        setActiveCompanyDetailed(detailed);
      } catch (err) {
        console.error('Eroare detalii societate activă:', err);
      }
    };
    fetchDetailed();
  }, [currentUser, activeCompanyId]);

  // Selector companie activă
  const handleSelectActiveCompany = (id: number) => {
    setActiveCompanyId(id);
    localStorage.setItem('contabilitate_ro_active_company_id', id.toString());
  };

  // Salvare societate (Creare sau Editare)
  const handleSaveCompany = async (payload: any) => {
    if (editingCompany && editingCompany.id) {
      await api.updateCompany(editingCompany.id, payload);
    } else {
      const created = await api.createCompany(payload);
      handleSelectActiveCompany(created.id);
    }
    await loadCompanies();
  };

  // Schimbare status activ/inactiv
  const handleToggleCompanyStatus = async (id: number, currentStatus: number) => {
    const newStatus = currentStatus === 1 ? false : true;
    try {
      await api.toggleCompanyStatus(id, newStatus);
      await loadCompanies();
    } catch (err: any) {
      alert(`Eroare: ${err.message}`);
    }
  };

  // Ștergere societate protejată
  const handleDeleteCompany = async (id: number, name: string) => {
    const confirmed = window.confirm(
      `Sunteți sigur că doriți să ștergeți societatea "${name}"? Această acțiune este ireversibilă.`
    );
    if (!confirmed) return;

    try {
      await api.deleteCompany(id);
      if (activeCompanyId === id) {
        setActiveCompanyId(null);
        localStorage.removeItem('contabilitate_ro_active_company_id');
      }
      await loadCompanies();
    } catch (err: any) {
      alert(`Eroare la ștergere: ${err.message}`);
    }
  };

  // Deschidere modal editare cu detalii complete
  const handleOpenEdit = async (company: CompanyListItem) => {
    try {
      const detailed = await api.getCompany(company.id);
      setEditingCompany(detailed);
      setFormModalOpen(true);
    } catch (err: any) {
      alert(`Eroare la încărcarea datelor: ${err.message}`);
    }
  };

  // Deschidere modal vizualizare detalii
  const handleOpenDetails = async (company: CompanyListItem) => {
    try {
      const detailed = await api.getCompany(company.id);
      setViewingCompany(detailed);
      setDetailsModalOpen(true);
    } catch (err: any) {
      alert(`Eroare la încărcarea detaliilor: ${err.message}`);
    }
  };

  // Deconectare
  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCompanies([]);
    setActiveCompanyId(null);
    setActiveCompanyDetailed(null);
    localStorage.removeItem('contabilitate_ro_active_company_id');
  };

  // Render stare de verificare sesiune
  if (authChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 font-medium">
        Se inițializează sesiunea securizată Contabilitate RO...
      </div>
    );
  }

  // Dacă utilizatorul nu este autentificat, afișăm ecranul de login/register
  if (!currentUser) {
    return (
      <AuthView
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  // Active Manual Entry for Help View
  const selectedManualEntry = 
    SAGA_MANUAL_ENTRIES.find(e => e.id === selectedManualId) || 
    SAGA_MANUAL_ENTRIES[0];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header cu selector companie activă */}
      <Navbar
        user={currentUser}
        companies={companies}
        activeCompanyId={activeCompanyId}
        onSelectCompany={handleSelectActiveCompany}
        onOpenCreateModal={() => {
          setEditingCompany(null);
          setFormModalOpen(true);
        }}
        onOpenTestsModal={() => setTestsModalOpen(true)}
        onLogout={handleLogout}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
      />

      {/* Main Split Layout: Sidebar + Main Content Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Meniu lateral ERP */}
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          onOpenFutureModal={(moduleName) => setFutureModalModule(moduleName)}
        />

        {/* Viewport Principal */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {activeView === 'home' && (
            <HomeDashboard
              companies={companies}
              activeCompany={activeCompanyDetailed}
              onOpenCreate={() => {
                setEditingCompany(null);
                setFormModalOpen(true);
              }}
              onGoToCompanies={() => setActiveView('companies')}
              onOpenTests={() => setTestsModalOpen(true)}
            />
          )}

          {activeView === 'companies' && (
            <CompanyList
              companies={companies}
              activeCompanyId={activeCompanyId}
              onSelectActiveCompany={handleSelectActiveCompany}
              onOpenCreate={() => {
                setEditingCompany(null);
                setFormModalOpen(true);
              }}
              onOpenEdit={handleOpenEdit}
              onOpenDetails={handleOpenDetails}
              onToggleStatus={handleToggleCompanyStatus}
              onDeleteCompany={handleDeleteCompany}
              loading={companiesLoading}
            />
          )}

          {activeView === 'automatic_accounts' && (
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/50 dark:bg-slate-950/40">
              <div className="max-w-6xl mx-auto">
                <AutomaticAccountsView
                  company={activeCompanyDetailed}
                  onNavigateToCompanies={() => setActiveView('companies')}
                />
              </div>
            </div>
          )}

          {activeView === 'opening_balance' && (
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/50 dark:bg-slate-950/40">
              <div className="max-w-[1600px] mx-auto">
                <OpeningBalanceView
                  company={activeCompanyDetailed}
                  onNavigateToCompanies={() => setActiveView('companies')}
                />
              </div>
            </div>
          )}

          {activeView === 'settings_diverse' && (
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/50 dark:bg-slate-950/40">
              <div className="max-w-6xl mx-auto">
                <SettingsDiverseView
                  company={activeCompanyDetailed}
                  onNavigateToCompanies={() => setActiveView('companies')}
                />
              </div>
            </div>
          )}

          {activeView === 'help_saga' && (
            <div className="flex-1 flex overflow-hidden">
              <SidebarTree
                entries={SAGA_MANUAL_ENTRIES}
                selectedId={selectedManualId}
                onSelect={(id) => setSelectedManualId(id)}
                searchQuery={manualSearchQuery}
                onSearchChange={setManualSearchQuery}
                levelFilter={manualLevelFilter}
                onLevelFilterChange={setManualLevelFilter}
                bookmarks={manualBookmarks}
                onToggleBookmark={(id) => {
                  setManualBookmarks(prev => 
                    prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
                  );
                }}
                expandedParents={manualExpandedParents}
                onToggleExpand={(id) => {
                  setManualExpandedParents(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onExpandAll={() => {
                  setManualExpandedParents(new Set(SAGA_MANUAL_ENTRIES.map(e => e.id)));
                }}
                onCollapseAll={() => setManualExpandedParents(new Set())}
              />
              <ManualReader
                entry={selectedManualEntry}
                allEntries={SAGA_MANUAL_ENTRIES}
                onSelectEntry={(id) => setSelectedManualId(id)}
                isBookmarked={manualBookmarks.includes(selectedManualEntry.id)}
                onToggleBookmark={(id) => {
                  setManualBookmarks(prev => 
                    prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
                  );
                }}
                userNote=""
                onSaveNote={() => {}}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modale */}
      {formModalOpen && (
        <CompanyForm
          initialData={editingCompany}
          caenCodes={caenCodes}
          nextInternalCode={nextInternalCode}
          onSave={handleSaveCompany}
          onClose={() => {
            setFormModalOpen(false);
            setEditingCompany(null);
          }}
          isFirstCompany={companies.length === 0}
        />
      )}

      {detailsModalOpen && viewingCompany && (
        <CompanyDetailsModal
          company={viewingCompany}
          onClose={() => {
            setDetailsModalOpen(false);
            setViewingCompany(null);
          }}
          onEdit={() => {
            setDetailsModalOpen(false);
            setEditingCompany(viewingCompany);
            setFormModalOpen(true);
          }}
        />
      )}

      <AcceptanceTestsModal
        isOpen={testsModalOpen}
        onClose={() => setTestsModalOpen(false)}
        onTestsComplete={loadCompanies}
      />

      <FutureModuleModal
        moduleName={futureModalModule}
        onClose={() => setFutureModalModule(null)}
      />
    </div>
  );
}
