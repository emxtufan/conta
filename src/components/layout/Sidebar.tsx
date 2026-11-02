import React, { useState } from 'react';
import { 
  Home, 
  Settings, 
  BookOpen, 
  ArrowLeftRight, 
  BarChart3, 
  FolderPlus, 
  Shield, 
  HelpCircle, 
  ChevronRight, 
  ChevronDown,
  Building2,
  Users,
  Wallet,
  Clock
} from 'lucide-react';

export type ActiveView = 
  | 'home'
  | 'companies'
  | 'automatic_accounts'
  | 'settings_diverse'
  | 'opening_balance'
  | 'help_saga';

interface SidebarProps {
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onOpenFutureModal: (moduleName: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  onOpenFutureModal,
}) => {
  const [configExpanded, setConfigExpanded] = useState(true);
  const [companiesSubExpanded, setCompaniesSubExpanded] = useState(true);

  return (
    <aside className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0 select-none">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        Meniu Principal
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {/* 1. Acasă */}
        <button
          onClick={() => onSelectView('home')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeView === 'home'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Acasă (Panou)</span>
        </button>

        {/* 2. Configurare (Grup cu submeniuri) */}
        <div className="space-y-0.5">
          <button
            onClick={() => setConfigExpanded(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Configurare</span>
            </div>
            {configExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {configExpanded && (
            <div className="pl-4 pr-1 space-y-1">
              {/* Grup Configurare societăți */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Configurare societăți</span>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Secțiune activă" />
                </div>

                <div className="pl-3 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                  {/* Lista societăți */}
                  <button
                    onClick={() => onSelectView('companies')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                      activeView === 'companies'
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span>Societăți (Listă & Formular)</span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                      Etapa 1
                    </span>
                  </button>

                  {/* Conturi automate - ACTIV ETAPA 2 */}
                  <button
                    onClick={() => onSelectView('automatic_accounts')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                      activeView === 'automatic_accounts'
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3 h-3 text-blue-600" />
                      <span>Conturi automate</span>
                    </div>
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded">
                      Etapa 2
                    </span>
                  </button>

                  {/* Setări diverse - ACTIV ETAPA 3 */}
                  <button
                    onClick={() => onSelectView('settings_diverse')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                      activeView === 'settings_diverse'
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span>Setări diverse</span>
                    <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                      Etapa 3
                    </span>
                  </button>

                  {/* Preluare date contabile - ACTIV ETAPA 4 */}
                  <button
                    onClick={() => onSelectView('opening_balance')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md font-medium transition-colors cursor-pointer text-[11px] ${
                      activeView === 'opening_balance'
                        ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span>Preluare date contabile</span>
                    <span className="text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded">
                      Etapa 4
                    </span>
                  </button>
                </div>
              </div>

              {/* Configurare salarii - ETAPĂ VIITOARE */}
              <button
                onClick={() => onOpenFutureModal('Configurare Salarii')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configurare salarii</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Etapa viitoare</span>
              </button>

              {/* Configurare utilizatori - ETAPĂ VIITOARE */}
              <button
                onClick={() => onOpenFutureModal('Configurare Utilizatori')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configurare utilizatori</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">Etapa viitoare</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Nomenclatoare - ETAPĂ VIITOARE */}
        <button
          onClick={() => onOpenFutureModal('Nomenclatoare (Terți, Articole, Conturi, Gestiuni)')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>Nomenclatoare</span>
          </div>
          <span className="text-[10px] text-slate-400">Etapa viitoare</span>
        </button>

        {/* 4. Operații - ETAPĂ VIITOARE */}
        <button
          onClick={() => onOpenFutureModal('Operații (Intrări, Ieșiri, Trezorerie, Închidere)')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <ArrowLeftRight className="w-4 h-4 text-slate-400" />
            <span>Operații</span>
          </div>
          <span className="text-[10px] text-slate-400">Etapa viitoare</span>
        </button>

        {/* 5. Situații - ETAPĂ VIITOARE */}
        <button
          onClick={() => onOpenFutureModal('Situații (Balanțe, Jurnale TVA, Bilanț, SAF-T)')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span>Situații</span>
          </div>
          <span className="text-[10px] text-slate-400">Etapa viitoare</span>
        </button>

        {/* 6. Diverse - ETAPĂ VIITOARE */}
        <button
          onClick={() => onOpenFutureModal('Diverse (Comenzi, Contracte, e-Transport)')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-4 h-4 text-slate-400" />
            <span>Diverse</span>
          </div>
          <span className="text-[10px] text-slate-400">Etapa viitoare</span>
        </button>

        {/* 7. Administrare - ETAPĂ VIITOARE */}
        <button
          onClick={() => onOpenFutureModal('Administrare (Întreținere BD, Serii documente)')}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-slate-400" />
            <span>Administrare</span>
          </div>
          <span className="text-[10px] text-slate-400">Etapa viitoare</span>
        </button>

        {/* 8. Ajutor (Include Ghidul de referință SAGA C) */}
        <button
          onClick={() => onSelectView('help_saga')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
            activeView === 'help_saga'
              ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-100 font-bold'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Ajutor & Referință</span>
          </div>
          <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">98 topics</span>
        </button>
      </nav>

      {/* Footer status bar */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Stare sistem:</span>
          <span className="text-emerald-600 font-medium">Operațional</span>
        </div>
        <div className="text-[10px] text-slate-400">
          Etapa 4: Preluare date contabile (Activ)
        </div>
      </div>
    </aside>
  );
};
