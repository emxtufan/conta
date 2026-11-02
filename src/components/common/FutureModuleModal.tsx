import React from 'react';
import { X, Clock, Info } from 'lucide-react';

interface FutureModuleModalProps {
  moduleName: string | null;
  onClose: () => void;
}

export const FutureModuleModal: React.FC<FutureModuleModalProps> = ({
  moduleName,
  onClose,
}) => {
  if (!moduleName) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {moduleName}
          </h3>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
            Planificat pentru etapele viitoare ale proiectului Contabilitate RO
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Conform specificației din <strong>Etapa 1</strong>, este implementat exclusiv modulul complet <strong>Configurare Societăți</strong>, împreună cu arhitectura de bază, baza de date relațională și mecanismele de securitate.
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Acest modul va fi implementat în detaliu în etapele următoare ale dezvoltării.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
          >
            Am înțeles
          </button>
        </div>
      </div>
    </div>
  );
};
