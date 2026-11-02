import React from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';

interface MonografiiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTopic: (topicId: string) => void;
}

export const MonografiiModal: React.FC<MonografiiModalProps> = ({
  isOpen,
  onClose,
  onSelectTopic,
}) => {
  if (!isOpen) return null;

  const monografii = [
    {
      title: 'Achiziție de mărfuri cu TVA la plată / TVA la încasare',
      topicId: 'intrari-lei',
      formula: '% = 401 (Furnizori)\n371 (Mărfuri) - Baza fără TVA\n4426 sau 4428.TP (TVA deductibilă / neexigibilă)',
      desc: 'Generată automat la validarea recepției (NIR) în ecranul Operații > Intrări - lei.'
    },
    {
      title: 'Vânzare mărfuri cu factură și descărcare automată gestiune',
      topicId: 'iesiri-lei',
      formula: '4111 (Clienți) = %\n                707 (Venituri din vânzarea mărfurilor)\n                4427 (TVA colectată)\nDescărcare automată: 607 (Cheltuieli cu mărfurile) = 371 (Mărfuri)',
      desc: 'Generată automat la validarea facturii de ieșire în Operații > Ieșiri - lei.'
    },
    {
      title: 'Monografia salariilor și a contribuțiilor sociale',
      topicId: 'state-salarii',
      formula: '641 = 421 (Salarii brute cuvenite)\n421 = %\n      4315 (CAS 25%)\n      4316 (CASS 10%)\n      444  (Impozit pe salarii 10%)\n646 = 436 (CAM 2.25% suportată de angajator)',
      desc: 'Înregistrată automat la validarea statului de plată în Operații > State salarii.'
    },
    {
      title: 'Regularizarea lunară a conturilor de TVA',
      topicId: 'inchidere-luna',
      formula: 'Dacă TVA colectată > TVA deductibilă:\n4427 = %\n       4426 (TVA deductibilă)\n       4423 (TVA de plată la buget)\n\nDacă TVA deductibilă > TVA colectată:\n% = 4426\n4427 (TVA colectată)\n4424 (TVA de recuperat)',
      desc: 'Calculată automat prin pasul 3 din ecranul Operații > Închidere lună.'
    },
    {
      title: 'Închiderea veniturilor și cheltuielilor (Contul 121)',
      topicId: 'inchidere-luna',
      formula: '121 = 6xx (Închiderea tuturor cheltuielilor de exploatare și financiare)\n7xx = 121 (Închiderea veniturilor din exploatare și financiare)',
      desc: 'Pasul 4 din Închidere lună – stabilește rezultatul exercițiului financiar (profit sau pierdere).'
    },
    {
      title: 'Sistemul de Garanție-Returnare SGR RetuRO',
      topicId: 'utile-evidentierea-ambalajelor-sgr',
      formula: 'La cumpărare: 461.SGR = 401 (0.50 lei/ambalaj, fără TVA)\nLa vânzare:    4111 = 462.SGR (0.50 lei/ambalaj, fără TVA)\nLa restituire: 462.SGR = 5311/5121 (plată numerar/card către client)',
      desc: 'Evidențierea garanțiilor nereutilizabile conform HG 1074/2021 și ghidului RetuRO.'
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Monografii Contabile Uzuale în SAGA C
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of monografii */}
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Principalele formule contabile generate automat de modulele SAGA C la validarea operațiunilor economice conform legislației românești.
          </p>

          <div className="space-y-3.5">
            {monografii.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {m.title}
                  </h3>
                  <button
                    onClick={() => {
                      onClose();
                      onSelectTopic(m.topicId);
                    }}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Vezi în manual</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <pre className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
                  {m.formula}
                </pre>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
