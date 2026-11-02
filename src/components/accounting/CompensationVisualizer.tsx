import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowDown, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  Scale, 
  Building, 
  Wallet,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { AutomaticAccountSettingItem } from '../../types/company';

interface CompensationVisualizerProps {
  setting: AutomaticAccountSettingItem | undefined;
  onModifyClick: () => void;
}

export const CompensationVisualizer: React.FC<CompensationVisualizerProps> = ({
  setting,
  onModifyClick,
}) => {
  const [simulationAmount, setSimulationAmount] = useState<number>(5420);
  const intermediateSymbol = setting?.account_symbol || '5125';
  const intermediateName = setting?.account_name || 'Sume în curs de decontare';

  const isCompatible = ['5125', '581', '473', '512'].some(p => intermediateSymbol.startsWith(p));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-xs">
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Mecanism de Compensare Reciprocă Terți</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
            Flux Contabil pentru Compensări Clienți — Furnizori
          </h3>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Stingerea concomitentă a datoriilor și creanțelor reciproce pentru același partener de afaceri
            (sau pe baza procesului-verbal de compensare / ordin de compensare) utilizând un cont intermediar de tranzit.
          </p>
        </div>

        {/* Current intermediate account badge */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Cont Intermediar Desemnat</div>
            <div className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span>{intermediateSymbol}</span>
              <span className="text-xs font-normal text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                — {intermediateName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onModifyClick}
            className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-md transition-colors cursor-pointer"
          >
            Schimbă
          </button>
        </div>
      </div>

      {!isCompatible && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <strong>Avertisment compatibilitate:</strong> Contul curent ({intermediateSymbol}) nu face parte din clasa uzuală de conturi de tranzit/decontare pentru compensare (recomandate: <strong>5125</strong>, <strong>581</strong> sau <strong>473</strong> conform practicilor OMFP 1802).
          </div>
        </div>
      )}

      {/* Visual Diagram of the 2-step Flow */}
      <div className="space-y-4">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Diagrama operațională a articolelor contabile generate automat:</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pasul 1: Stingere datorie Furnizor */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-mono">1</span>
                Stingere Datorie Furnizor
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono px-2 py-0.5 rounded">
                Debit 401 = Credit {intermediateSymbol}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <div className="text-rose-600 dark:text-rose-400 font-bold">
                  % 401 (Furnizori)
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-blue-600 dark:text-blue-400 font-bold">
                  {intermediateSymbol} (Cont Intermediar)
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Valoare compensată:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {simulationAmount.toLocaleString('ro-RO')} RON
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Debitează contul de furnizor (anulând datoria comercială existentă) și creditează contul intermediar.
            </p>
          </div>

          {/* Pasul 2: Încasare creanță Client */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono">2</span>
                Încasare Creanță Client
              </span>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono px-2 py-0.5 rounded">
                Debit {intermediateSymbol} = Credit 4111
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <div className="text-blue-600 dark:text-blue-400 font-bold">
                  {intermediateSymbol} (Cont Intermediar)
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                  4111 (Clienți)
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Valoare compensată:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {simulationAmount.toLocaleString('ro-RO')} RON
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Debitează contul intermediar și creditează contul de client (anulând creanța comercială existentă).
            </p>
          </div>
        </div>

        {/* Soldul final pe contul intermediar */}
        <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Echilibru Contabil & Sold Final pe Contul de Compensare
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Rulaj Debitor ({simulationAmount.toLocaleString('ro-RO')} RON) = Rulaj Creditor ({simulationAmount.toLocaleString('ro-RO')} RON).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Sold Cont {intermediateSymbol}</div>
              <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                0,00 RON
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Simulator Bar */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Testare simulare sumă compensare:</span>
          <div className="flex items-center gap-1.5">
            {[1000, 2500, 5420, 10000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setSimulationAmount(amt)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  simulationAmount === amt
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {amt.toLocaleString('ro-RO')} RON
              </button>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Conform legislației fiscale din România și OMFP 1802/2014</span>
        </div>
      </div>
    </div>
  );
};
