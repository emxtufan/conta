import React, { useState } from 'react';
import { 
  X, 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  ShieldCheck,
  Check,
  AlertTriangle
} from 'lucide-react';
import { AcceptanceTestItem } from '../../types/company';
import { api } from '../../services/api';

interface AcceptanceTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestsComplete: () => void;
}

export const AcceptanceTestsModal: React.FC<AcceptanceTestsModalProps> = ({
  isOpen,
  onClose,
  onTestsComplete,
}) => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<AcceptanceTestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await api.runAcceptanceTests();
      setResults(data.results);
      onTestsComplete();
    } catch (err: any) {
      setError(err.message || 'Eroare la rularea suitei de teste.');
    } finally {
      setRunning(false);
    }
  };

  const totalPassed = results ? results.filter(r => r.passed).length : 0;
  const totalTests = results ? results.length : 34;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <FlaskConical className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Suita de Teste de Acceptanță (Etapa 1, 2 & 3)
              </h2>
              <p className="text-xs text-slate-500">
                Validare completă automată (34/34 scenarii): Configurare societăți, Conturi automate și Setări diverse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Status */}
        <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            {results ? (
              <span className={`font-semibold ${totalPassed === totalTests ? 'text-emerald-600' : 'text-amber-600'}`}>
                Rezultat: {totalPassed} din {totalTests} teste trecute cu succes ({Math.round((totalPassed/totalTests)*100)}%)
              </span>
            ) : (
              <span className="text-slate-500">
                12 scenarii definite gata de execuție în baza de date
              </span>
            )}
          </div>

          <button
            onClick={handleRunTests}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Se execută testele...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{results ? 'Re-rulează Testele' : 'Pornește Toate Testele (1-12)'}</span>
              </>
            )}
          </button>
        </div>

        {/* Error if any */}
        {error && (
          <div className="m-4 p-3 rounded-lg bg-rose-50 text-rose-800 text-xs border border-rose-200">
            {error}
          </div>
        )}

        {/* Results List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {results ? (
            results.map((test) => (
              <div
                key={test.id}
                className={`p-3.5 rounded-xl border text-xs transition-colors space-y-1 ${
                  test.passed
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                    : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Test {test.id}: {test.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    test.passed 
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  }`}>
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                  {test.message}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-10 space-y-3 text-slate-500 text-xs">
              <FlaskConical className="w-8 h-8 mx-auto text-slate-400" />
              <p>
                Apăsați butonul <strong>„Pornește Toate Testele”</strong> pentru a valida pe viu:
              </p>
              <ul className="text-[11px] text-slate-400 space-y-1 max-w-md mx-auto text-left list-disc pl-8">
                <li>Creare și persistență fără pierdere de date la refresh</li>
                <li>Generare cod intern unic fără duplicare</li>
                <li>Respingere CUI și IBAN invalide cu explicație</li>
                <li>Salvare adrese și conturi bancare</li>
                <li>Istoric fiscal fără suprapuneri</li>
                <li>Blocare societăți inactive</li>
                <li>Izolare strictă la nivel de API</li>
                <li>Conflict controlat la modificări concurente (Optimistic Locking)</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
