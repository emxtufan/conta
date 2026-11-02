import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calculator } from 'lucide-react';
import { OpeningBalanceLine } from '../../types/company';

interface CurrencyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: OpeningBalanceLine | null;
  onSave: (currency: string, currencyAmount: number, exchangeRate: number, exchangeRateDate: string | null) => void;
  readOnly?: boolean;
}

export const CurrencyDetailsModal: React.FC<CurrencyDetailsModalProps> = ({
  isOpen,
  onClose,
  line,
  onSave,
  readOnly = false,
}) => {
  const [currency, setCurrency] = useState('EUR');
  const [currencyAmount, setCurrencyAmount] = useState('0.00');
  const [exchangeRate, setExchangeRate] = useState('4.9750');
  const [exchangeRateDate, setExchangeRateDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (line) {
      setCurrency(line.currency || 'EUR');
      setCurrencyAmount((line.currency_amount || 0).toString());
      setExchangeRate((line.exchange_rate || 4.975).toString());
      setExchangeRateDate(line.exchange_rate_date || new Date().toISOString().split('T')[0]);
    }
  }, [line]);

  if (!isOpen || !line) return null;

  const parsedAmount = parseFloat(currencyAmount) || 0;
  const parsedRate = parseFloat(exchangeRate) || 1;
  const calculatedRon = Math.round((parsedAmount * parsedRate + Number.EPSILON) * 100) / 100;

  const handleSave = () => {
    onSave(currency, parsedAmount, parsedRate, exchangeRateDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Preluarea soldurilor în valută
              </h2>
              <p className="text-xs text-slate-500">
                Cont {line.account_symbol} — {line.account_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
              Moneda
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-medium"
            >
              <option value="EUR">EUR — Euro</option>
              <option value="USD">USD — Dolar SUA</option>
              <option value="GBP">GBP — Liră Sterlină</option>
              <option value="CHF">CHF — Franc Elvețian</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
              Suma în valuta originală
            </label>
            <input
              type="number"
              step="0.01"
              value={currencyAmount}
              onChange={(e) => setCurrencyAmount(e.target.value)}
              disabled={readOnly}
              className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Curs de referință (BNR)
              </label>
              <input
                type="number"
                step="0.0001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Data cursului
              </label>
              <input
                type="date"
                value={exchangeRateDate}
                onChange={(e) => setExchangeRateDate(e.target.value)}
                disabled={readOnly}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Calculat în RON */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                Echivalent contabil în RON:
              </span>
            </div>
            <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200 text-sm">
              {calculatedRon.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            * Verificările și totalurile balanței generale se efectuează exclusiv în moneda contabilă (RON).
            Sumele în valută sunt păstrate distinct pentru evidența analitică conform OMFP 1802/2014.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg"
          >
            Anulează
          </button>
          {!readOnly && (
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
            >
              Salvează detalii valută
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
