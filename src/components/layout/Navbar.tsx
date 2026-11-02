import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Plus, 
  Sun, 
  Moon, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  FlaskConical,
  AlertCircle
} from 'lucide-react';
import { User, CompanyListItem } from '../../types/company';

interface NavbarProps {
  user: User | null;
  companies: CompanyListItem[];
  activeCompanyId: number | null;
  onSelectCompany: (id: number) => void;
  onOpenCreateModal: () => void;
  onOpenTestsModal: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  companies,
  activeCompanyId,
  onSelectCompany,
  onOpenCreateModal,
  onOpenTestsModal,
  onLogout,
  darkMode,
  onToggleDarkMode,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeCompany = companies.find(c => c.id === activeCompanyId) || null;

  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors shrink-0 z-30">
      {/* Zone 1: Brand title, one line */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
          RO
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 block leading-tight">
            Contabilitate RO
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block leading-none">
            Sistem ERP Financiar-Contabil
          </span>
        </div>
      </div>

      {/* Zone 2: Selector Societate Activă & Instrumente */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg border transition-all text-left cursor-pointer ${
              activeCompany
                ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-500'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Building2 className={`w-4 h-4 shrink-0 ${activeCompany ? 'text-blue-600' : 'text-amber-600'}`} />
              <div className="truncate">
                {activeCompany ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {activeCompany.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      CUI: {activeCompany.fiscal_attribute ? `${activeCompany.fiscal_attribute} ` : ''}{activeCompany.cui} · Cod: {activeCompany.internal_code}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold">Nicio societate activă selectată</span>
                )}
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown companii */}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 max-h-80 overflow-y-auto">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                Societăți Accesibile ({companies.length})
              </div>

              {companies.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nu aveți nicio societate configurată.
                </div>
              ) : (
                companies.map((c) => {
                  const isSelected = c.id === activeCompanyId;
                  const isInactive = !c.is_active;

                  return (
                    <button
                      key={c.id}
                      disabled={isInactive}
                      onClick={() => {
                        if (!isInactive) {
                          onSelectCompany(c.id);
                          setDropdownOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                        isInactive
                          ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-950/50'
                          : isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 cursor-pointer'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold truncate">{c.name}</span>
                          {isInactive && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded">
                              Inactivă
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          Cod {c.internal_code} · CUI {c.cui} · {c.accounting_type}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}

              <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 px-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenCreateModal();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adaugă societate nouă</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Buton Teste de Acceptanță */}
        <button
          onClick={onOpenTestsModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
          title="Execută cele 12 teste de acceptanță pentru Etapa 1"
        >
          <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Rulare Teste (12)</span>
        </button>
      </div>

      {/* Zone 3: Profil utilizator & Teme */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Mod luminos' : 'Mod întunecat'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(prev => !prev)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block leading-none">
                  {user.full_name}
                </span>
                <span className="text-[10px] text-slate-400 block leading-none mt-0.5">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user.full_name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Deconectare</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};
