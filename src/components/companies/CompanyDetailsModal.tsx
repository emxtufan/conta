import React from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  CreditCard, 
  Receipt, 
  History, 
  CheckCircle2, 
  XCircle,
  ShieldAlert,
  Sliders
} from 'lucide-react';
import { CompanyDetailed } from '../../types/company';

interface CompanyDetailsModalProps {
  company: CompanyDetailed | null;
  onClose: () => void;
  onEdit: () => void;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({
  company,
  onClose,
  onEdit,
}) => {
  if (!company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {company.name}
                </h2>
                {company.is_active === 1 ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded">
                    Activă
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                    Inactivă
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Cod: {company.internal_code} · CUI: {company.fiscal_attribute ? `${company.fiscal_attribute} ` : ''}{company.cui} · Versiune: v{company.version}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
            >
              Editează
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Date generale */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Date Statutare & Fiscale</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block">Nr. Reg. Com.</span>
                <span className="font-mono font-semibold">{company.reg_com || 'Nespecificat'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Cod CAEN</span>
                <span className="font-mono font-semibold">{company.caen_code || 'Nespecificat'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Capital Social</span>
                <span className="font-semibold">{company.share_capital.toLocaleString('ro-RO')} {company.currency}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Data Start Evidență</span>
                <span className="font-semibold">{company.start_date}</span>
              </div>
            </div>
          </section>

          {/* Sediu */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>Adrese & Date de Contact</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Sediu Social</span>
                {company.headquarters ? (
                  <div>
                    <div className="font-semibold">
                      Str. {company.headquarters.street}, Nr. {company.headquarters.number}
                      {company.headquarters.building && `, Bl. ${company.headquarters.building}`}
                      {company.headquarters.apartment && `, Ap. ${company.headquarters.apartment}`}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {company.headquarters.city}, Jud. {company.headquarters.county}, {company.headquarters.country}
                    </div>
                    {company.headquarters.phone && (
                      <div className="text-slate-500 text-[11px] mt-1">Tel: {company.headquarters.phone}</div>
                    )}
                    {company.headquarters.email && (
                      <div className="text-slate-500 text-[11px]">Email: {company.headquarters.email}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">Nespecificat</span>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Domiciliu Fiscal</span>
                {company.has_different_fiscal_domicile && company.fiscal_domicile ? (
                  <div>
                    <div className="font-semibold">
                      Str. {company.fiscal_domicile.street}, Nr. {company.fiscal_domicile.number}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {company.fiscal_domicile.city}, Jud. {company.fiscal_domicile.county}
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-500 italic">Identic cu sediul social</span>
                )}
              </div>
            </div>
          </section>

          {/* Conturi Bancare */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Conturi Bancare ({company.bank_accounts.length})</span>
            </h3>
            <div className="space-y-2">
              {company.bank_accounts.map((acc, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{acc.bank_name}</span>
                      <span className="font-mono font-semibold text-blue-600">{acc.currency}</span>
                      {acc.is_default && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded">
                          Implicit
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                      {acc.iban}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-500">{acc.holder_name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Istoric Fiscal */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>Istoric Regim Fiscal & TVA ({company.fiscal_regimes.length})</span>
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {company.fiscal_regimes.map((reg, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between bg-slate-50/40 dark:bg-slate-950/30">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {reg.is_vat_payer ? `Plătitor TVA (${reg.vat_periodicity})` : 'Neplătitor TVA'}
                    </span>
                    <span className="text-slate-400 ml-2">· Impozitare: {reg.taxation_type}</span>
                    {reg.vat_on_collection && (
                      <span className="ml-2 text-blue-600 font-medium">· TVA la încasare</span>
                    )}
                  </div>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {reg.start_date} → {reg.end_date || 'În vigoare (curent)'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Jurnal de Audit */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <History className="w-4 h-4 text-slate-600" />
              <span>Jurnal de Audit & Modificări Recente</span>
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
              {company.audit_logs && company.audit_logs.length > 0 ? (
                company.audit_logs.map((log) => (
                  <div key={log.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{log.action}</span>
                      <span className="text-slate-400 ml-2">de către {log.user_name || 'Sistem'}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {new Date(log.timestamp).toLocaleString('ro-RO')}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-2 text-slate-400 italic">Nicio intrare de audit înregistrată.</div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};
