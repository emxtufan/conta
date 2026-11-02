import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Building2, 
  MapPin, 
  CreditCard, 
  Receipt, 
  Package, 
  Sliders, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Check, 
  CheckCircle2, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { CompanyDetailed, CAENCode, BankAccount, FiscalRegime } from '../../types/company';
import { validateCUI, validateIBAN, validateRegCom } from '../../utils/validators';

interface CompanyFormProps {
  initialData?: CompanyDetailed | null;
  caenCodes: CAENCode[];
  nextInternalCode: string;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  isFirstCompany?: boolean;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({
  initialData,
  caenCodes,
  nextInternalCode,
  onSave,
  onClose,
  isFirstCompany = false,
}) => {
  const isEditing = Boolean(initialData && initialData.id);

  // Active tab state (1 to 6)
  const [activeTab, setActiveTab] = useState<number>(1);

  // Form dirty state to prompt before closing
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Submitting and error state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ----------------------------------------------------
  // TAB 1: Date Generale
  // ----------------------------------------------------
  const [internalCode, setInternalCode] = useState(initialData?.internal_code || nextInternalCode);
  const [name, setName] = useState(initialData?.name || '');
  const [cui, setCui] = useState(initialData?.cui || '');
  const [fiscalAttribute, setFiscalAttribute] = useState(initialData?.fiscal_attribute || '');
  const [regCom, setRegCom] = useState(initialData?.reg_com || '');
  const [accountingType, setAccountingType] = useState(initialData?.accounting_type || 'COMMERCIAL');
  const [caenCode, setCaenCode] = useState(initialData?.caen_code || '6920');
  const [shareCapital, setShareCapital] = useState<number>(initialData?.share_capital || 200);
  const [currency, setCurrency] = useState(initialData?.currency || 'RON');
  const [startDate, setStartDate] = useState(initialData?.start_date || new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState<number>(initialData?.is_active !== undefined ? initialData.is_active : 1);
  const [version, setVersion] = useState<number>(initialData?.version || 1);

  // Real-time CUI validation state
  const [cuiError, setCuiError] = useState<string | null>(null);

  const handleCuiChange = (val: string) => {
    setIsDirty(true);
    setCui(val);
    if (!val) {
      setCuiError('CUI-ul este obligatoriu.');
      return;
    }
    const check = validateCUI(val);
    if (!check.isValid) {
      setCuiError(check.message || 'CUI invalid');
    } else {
      setCuiError(null);
    }
  };

  // ----------------------------------------------------
  // TAB 2: Sediu Social & Domiciliu Fiscal
  // ----------------------------------------------------
  const [hqCountry, setHqCountry] = useState(initialData?.headquarters?.country || 'România');
  const [hqCounty, setHqCounty] = useState(initialData?.headquarters?.county || 'București');
  const [hqCity, setHqCity] = useState(initialData?.headquarters?.city || 'Sector 1');
  const [hqSector, setHqSector] = useState(initialData?.headquarters?.sector || '');
  const [hqPostalCode, setHqPostalCode] = useState(initialData?.headquarters?.postal_code || '');
  const [hqStreet, setHqStreet] = useState(initialData?.headquarters?.street || '');
  const [hqNumber, setHqNumber] = useState(initialData?.headquarters?.number || '');
  const [hqBuilding, setHqBuilding] = useState(initialData?.headquarters?.building || '');
  const [hqStaircase, setHqStaircase] = useState(initialData?.headquarters?.staircase || '');
  const [hqFloor, setHqFloor] = useState(initialData?.headquarters?.floor || '');
  const [hqApartment, setHqApartment] = useState(initialData?.headquarters?.apartment || '');
  const [hqPhone, setHqPhone] = useState(initialData?.headquarters?.phone || '');
  const [hqEmail, setHqEmail] = useState(initialData?.headquarters?.email || '');

  const [hasDifferentFiscalDomicile, setHasDifferentFiscalDomicile] = useState(
    initialData?.has_different_fiscal_domicile || false
  );

  const [fdCountry, setFdCountry] = useState(initialData?.fiscal_domicile?.country || 'România');
  const [fdCounty, setFdCounty] = useState(initialData?.fiscal_domicile?.county || '');
  const [fdCity, setFdCity] = useState(initialData?.fiscal_domicile?.city || '');
  const [fdSector, setFdSector] = useState(initialData?.fiscal_domicile?.sector || '');
  const [fdPostalCode, setFdPostalCode] = useState(initialData?.fiscal_domicile?.postal_code || '');
  const [fdStreet, setFdStreet] = useState(initialData?.fiscal_domicile?.street || '');
  const [fdNumber, setFdNumber] = useState(initialData?.fiscal_domicile?.number || '');
  const [fdBuilding, setFdBuilding] = useState(initialData?.fiscal_domicile?.building || '');
  const [fdStaircase, setFdStaircase] = useState(initialData?.fiscal_domicile?.staircase || '');
  const [fdFloor, setFdFloor] = useState(initialData?.fiscal_domicile?.floor || '');
  const [fdApartment, setFdApartment] = useState(initialData?.fiscal_domicile?.apartment || '');
  const [fdPhone, setFdPhone] = useState(initialData?.fiscal_domicile?.phone || '');
  const [fdEmail, setFdEmail] = useState(initialData?.fiscal_domicile?.email || '');

  // ----------------------------------------------------
  // TAB 3: Conturi Bancare
  // ----------------------------------------------------
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    if (initialData?.bank_accounts && initialData.bank_accounts.length > 0) {
      return initialData.bank_accounts;
    }
    return [
      {
        bank_name: 'Banca Transilvania',
        iban: '',
        currency: 'RON',
        holder_name: '',
        is_default: true,
        is_active: true,
      }
    ];
  });

  const handleAddBankAccount = () => {
    setIsDirty(true);
    setBankAccounts(prev => [
      ...prev,
      {
        bank_name: '',
        iban: '',
        currency: 'RON',
        holder_name: name || '',
        is_default: prev.length === 0,
        is_active: true,
      }
    ]);
  };

  const handleRemoveBankAccount = (index: number) => {
    setIsDirty(true);
    setBankAccounts(prev => prev.filter((_, i) => i !== index));
  };

  const handleBankAccountChange = (index: number, field: keyof BankAccount, value: any) => {
    setIsDirty(true);
    setBankAccounts(prev => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };

      // Regula: O societate poate avea un singur cont implicit per monedă
      if (field === 'is_default' && value === true) {
        copy.forEach((acc, i) => {
          if (i !== index && acc.currency === target.currency) {
            acc.is_default = false;
          }
        });
      }

      copy[index] = target;
      return copy;
    });
  };

  // ----------------------------------------------------
  // TAB 4: Configurare Fiscală
  // ----------------------------------------------------
  const activeFiscal = initialData?.current_fiscal_regime;
  const [isVatPayer, setIsVatPayer] = useState(activeFiscal ? activeFiscal.is_vat_payer : true);
  const [vatPeriodicity, setVatPeriodicity] = useState<'MONTHLY' | 'QUARTERLY'>(
    activeFiscal ? activeFiscal.vat_periodicity : 'MONTHLY'
  );
  const [vatOnCollection, setVatOnCollection] = useState(activeFiscal ? activeFiscal.vat_on_collection : false);
  const [taxationType, setTaxationType] = useState<'MICRO' | 'PROFIT' | 'SPECIFIC'>(
    activeFiscal ? activeFiscal.taxation_type : 'MICRO'
  );
  const [fiscalStartDate, setFiscalStartDate] = useState(
    activeFiscal ? activeFiscal.start_date : (startDate || new Date().toISOString().split('T')[0])
  );

  // ----------------------------------------------------
  // TAB 5: Setări Gestiune
  // ----------------------------------------------------
  const [managesInventory, setManagesInventory] = useState(
    initialData?.settings ? initialData.settings.manages_inventory : true
  );
  const [inventoryEvaluationMethod, setInventoryEvaluationMethod] = useState<'FIFO' | 'CMP'>(
    initialData?.settings ? initialData.settings.inventory_evaluation_method : 'FIFO'
  );
  const [inventoryType, setInventoryType] = useState<'PERMANENT' | 'INTERMITTENT'>(
    initialData?.settings ? initialData.settings.inventory_type : 'PERMANENT'
  );

  // ----------------------------------------------------
  // TAB 6: Setări Suplimentare
  // ----------------------------------------------------
  const [seriesPrefix, setSeriesPrefix] = useState(
    initialData?.settings?.document_series_config?.invoice_prefix || 'FAC'
  );
  const [seriesStartNumber, setSeriesStartNumber] = useState(
    initialData?.settings?.document_series_config?.start_number || '1'
  );
  const [vatInvoiceFooter, setVatInvoiceFooter] = useState(
    initialData?.settings?.display_preferences?.invoice_footer || 'TVA exigibilă la data emiterii conform Legii 227/2015.'
  );
  const [internalNotes, setInternalNotes] = useState(initialData?.settings?.internal_notes || '');

  // Confirm close handler
  const handleRequestClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validări obligatorii
    if (!name.trim()) {
      setActiveTab(1);
      setErrorMessage('Denumirea societății este obligatorie.');
      return;
    }

    const cuiCheck = validateCUI(cui);
    if (!cuiCheck.isValid) {
      setActiveTab(1);
      setErrorMessage(cuiCheck.message || 'CUI invalid.');
      return;
    }

    if (regCom) {
      const regComCheck = validateRegCom(regCom);
      if (!regComCheck.isValid) {
        setActiveTab(1);
        setErrorMessage(regComCheck.message || 'Număr Registru Comerțului invalid.');
        return;
      }
    }

    if (!hqStreet.trim() || !hqNumber.trim() || !hqCity.trim()) {
      setActiveTab(2);
      setErrorMessage('Adresa sediului social este incompletă (Strada, Numărul și Localitatea sunt obligatorii).');
      return;
    }

    // Validare conturi bancare dacă au fost introduse
    for (const b of bankAccounts) {
      if (b.iban.trim()) {
        const ibanCheck = validateIBAN(b.iban);
        if (!ibanCheck.isValid) {
          setActiveTab(3);
          setErrorMessage(`Cont bancar invalid (${b.bank_name || 'Bancă nespecificată'}): ${ibanCheck.message}`);
          return;
        }
      }
    }

    const payload = {
      name: name.trim(),
      cui: cuiCheck.normalized,
      fiscal_attribute: fiscalAttribute ? fiscalAttribute.toUpperCase() : null,
      reg_com: regCom ? regCom.trim().toUpperCase() : null,
      accounting_type: accountingType,
      caen_code: caenCode,
      share_capital: Number(shareCapital) || 200,
      currency: currency || 'RON',
      start_date: startDate,
      is_active: isActive,
      version: version,
      headquarters: {
        country: hqCountry,
        county: hqCounty,
        city: hqCity,
        sector: hqSector || null,
        postal_code: hqPostalCode || null,
        street: hqStreet,
        number: hqNumber,
        building: hqBuilding || null,
        staircase: hqStaircase || null,
        floor: hqFloor || null,
        apartment: hqApartment || null,
        phone: hqPhone || null,
        email: hqEmail || null,
      },
      has_different_fiscal_domicile: hasDifferentFiscalDomicile,
      fiscal_domicile: hasDifferentFiscalDomicile ? {
        country: fdCountry,
        county: fdCounty,
        city: fdCity,
        sector: fdSector || null,
        postal_code: fdPostalCode || null,
        street: fdStreet,
        number: fdNumber,
        building: fdBuilding || null,
        staircase: fdStaircase || null,
        floor: fdFloor || null,
        apartment: fdApartment || null,
        phone: fdPhone || null,
        email: fdEmail || null,
      } : null,
      bank_accounts: bankAccounts.filter(b => b.iban.trim().length > 0).map(b => ({
        ...b,
        holder_name: b.holder_name.trim() || name.trim(),
      })),
      fiscal_regime: {
        start_date: fiscalStartDate,
        is_vat_payer: isVatPayer,
        vat_periodicity: vatPeriodicity,
        vat_on_collection: vatOnCollection,
        taxation_type: taxationType,
        fiscal_period: 'ANNUAL',
      },
      settings: {
        manages_inventory: managesInventory,
        inventory_evaluation_method: inventoryEvaluationMethod,
        inventory_type: inventoryType,
        document_series_config: {
          invoice_prefix: seriesPrefix,
          start_number: seriesStartNumber,
        },
        display_preferences: {
          invoice_footer: vatInvoiceFooter,
        },
        internal_notes: internalNotes,
      }
    };

    setSubmitting(true);
    try {
      await onSave(payload);
      setIsDirty(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Eroare la salvarea societății.');
    } finally {
      setSubmitting(false);
    }
  };

  const tabs = [
    { id: 1, label: 'Date generale', icon: Building2 },
    { id: 2, label: 'Sediu social', icon: MapPin },
    { id: 3, label: 'Conturi bancare', icon: CreditCard },
    { id: 4, label: 'Configurare fiscală', icon: Receipt },
    { id: 5, label: 'Setări gestiune', icon: Package },
    { id: 6, label: 'Setări suplimentare', icon: Sliders },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Formular */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
              {isEditing ? 'EDIT' : 'NOU'}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? `Modificare Societate: ${initialData?.name}` : (isFirstCompany ? 'Configurare Prima Societate' : 'Adăugare Societate Nouă')}
              </h2>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>Cod intern alocat: <strong className="font-mono text-blue-600">{internalCode}</strong></span>
                {isEditing && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Versiune concurență: <strong className="font-mono">v{version}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleRequestClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950 px-4 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActiveTab = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActiveTab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Form Body Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Date generale */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cod intern */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cod Intern (Generat Automat)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={internalCode}
                    className="w-full p-2.5 text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400">Strict incremental, nereutilizabil</span>
                </div>

                {/* Atribut fiscal RO */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Atribut Fiscal
                  </label>
                  <select
                    value={fiscalAttribute}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFiscalAttribute(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="RO">RO (Plătitor TVA la CUI)</option>
                    <option value="">Fără atribut fiscal (Neplătitor)</option>
                  </select>
                </div>

                {/* CUI/CIF */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CUI / CIF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cui}
                    onChange={(e) => handleCuiChange(e.target.value)}
                    placeholder="ex: 1599110 (fără RO)"
                    className={`w-full p-2.5 text-xs font-mono font-semibold bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                      cuiError
                        ? 'border-rose-400 text-rose-900 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:ring-blue-500/20'
                    }`}
                  />
                  {cuiError ? (
                    <span className="text-[10px] text-rose-600 block mt-0.5">{cuiError}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400 block mt-0.5">Validat cu algoritmul modulo 11</span>
                  )}
                </div>
              </div>

              {/* Denumire societate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Denumire Completă Societate <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setIsDirty(true);
                    setName(e.target.value);
                  }}
                  placeholder="ex: SC EXEMPLU CONTABILITATE SRL"
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Nr. Reg. Com. */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nr. Registrul Comerțului
                  </label>
                  <input
                    type="text"
                    value={regCom}
                    onChange={(e) => {
                      setIsDirty(true);
                      setRegCom(e.target.value);
                    }}
                    placeholder="ex: J40/1234/2020"
                    className="w-full p-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Tip Contabilitate */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tip Contabilitate (Plan Conturi)
                  </label>
                  <select
                    value={accountingType}
                    onChange={(e) => {
                      setIsDirty(true);
                      setAccountingType(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="COMMERCIAL">Societate Comercială (OMFP 1802/2014)</option>
                    <option value="MICRO">Microîntreprindere (Evidență simplificată)</option>
                    <option value="ONG">Organizație Non-Profit / Asociație</option>
                    <option value="PFA">Partidă simplă / Profesie liberală</option>
                  </select>
                </div>

                {/* Cod CAEN principal */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cod CAEN Principal (Rev.2)
                  </label>
                  <select
                    value={caenCode}
                    onChange={(e) => {
                      setIsDirty(true);
                      setCaenCode(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                  >
                    {caenCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.title.substring(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Capital social */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Capital Social
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={shareCapital}
                    onChange={(e) => {
                      setIsDirty(true);
                      setShareCapital(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full p-2.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Moneda */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Moneda Capitalului
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setIsDirty(true);
                      setCurrency(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="RON">RON (Leu românesc)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="USD">USD (Dolar SUA)</option>
                  </select>
                </div>

                {/* Data început evidență */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Începerii Evidenței
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setIsDirty(true);
                      setStartDate(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stare Societate
                  </label>
                  <select
                    value={isActive}
                    onChange={(e) => {
                      setIsDirty(true);
                      setIsActive(parseInt(e.target.value, 10));
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value={1}>Activă (Operațională)</option>
                    <option value={0}>Inactivă (Suspendată)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Sediu social */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                  Sediu Social Principal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Țara
                    </label>
                    <input
                      type="text"
                      value={hqCountry}
                      onChange={(e) => {
                        setIsDirty(true);
                        setHqCountry(e.target.value);
                      }}
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Județ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hqCounty}
                      onChange={(e) => {
                        setIsDirty(true);
                        setHqCounty(e.target.value);
                      }}
                      placeholder="ex: București, Cluj, Timiș"
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Localitate <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hqCity}
                      onChange={(e) => {
                        setIsDirty(true);
                        setHqCity(e.target.value);
                      }}
                      placeholder="ex: Sector 1, Cluj-Napoca"
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Stradă <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hqStreet}
                      onChange={(e) => {
                        setIsDirty(true);
                        setHqStreet(e.target.value);
                      }}
                      placeholder="ex: Bulevardul Unirii"
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Număr <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={hqNumber}
                      onChange={(e) => {
                        setIsDirty(true);
                        setHqNumber(e.target.value);
                      }}
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cod Poștal
                    </label>
                    <input
                      type="text"
                      value={hqPostalCode}
                      onChange={(e) => {
                        setIsDirty(true);
                        setHqPostalCode(e.target.value);
                      }}
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bloc</label>
                    <input type="text" value={hqBuilding} onChange={(e) => { setIsDirty(true); setHqBuilding(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Scară</label>
                    <input type="text" value={hqStaircase} onChange={(e) => { setIsDirty(true); setHqStaircase(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Etaj</label>
                    <input type="text" value={hqFloor} onChange={(e) => { setIsDirty(true); setHqFloor(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Apartament</label>
                    <input type="text" value={hqApartment} onChange={(e) => { setIsDirty(true); setHqApartment(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Telefon Contact</label>
                    <input type="text" value={hqPhone} onChange={(e) => { setIsDirty(true); setHqPhone(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Oficial</label>
                    <input type="email" value={hqEmail} onChange={(e) => { setIsDirty(true); setHqEmail(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                  </div>
                </div>
              </div>

              {/* Domiciliu fiscal separat */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasDifferentFiscalDomicile"
                    checked={hasDifferentFiscalDomicile}
                    onChange={(e) => {
                      setIsDirty(true);
                      setHasDifferentFiscalDomicile(e.target.checked);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="hasDifferentFiscalDomicile" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                    Societatea are domiciliul fiscal diferit de sediul social
                  </label>
                </div>

                {hasDifferentFiscalDomicile && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Date Domiciliu Fiscal
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Județ</label>
                        <input type="text" value={fdCounty} onChange={(e) => { setIsDirty(true); setFdCounty(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Localitate</label>
                        <input type="text" value={fdCity} onChange={(e) => { setIsDirty(true); setFdCity(e.target.value); }} className="w-full p-2 text-xs bg-white dark:bg-slate-900 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Stradă și Număr</label>
                        <input type="text" value={fdStreet} onChange={(e) => { setIsDirty(true); setFdStreet(e.target.value); }} placeholder="Strada..." className="w-full p-2 text-xs bg-white dark:bg-slate-900 border rounded-lg" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Conturi Bancare */}
          {activeTab === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Conturi Bancare Descrise ({bankAccounts.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    O societate poate avea un singur cont implicit pentru fiecare monedă (RON, EUR, etc.).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddBankAccount}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adaugă cont bancar</span>
                </button>
              </div>

              <div className="space-y-3">
                {bankAccounts.map((account, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Contul #{idx + 1}
                      </span>
                      {bankAccounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBankAccount(idx)}
                          className="p-1 text-rose-500 hover:text-rose-700 rounded cursor-pointer"
                          title="Șterge acest cont"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Numele Băncii
                        </label>
                        <input
                          type="text"
                          value={account.bank_name}
                          onChange={(e) => handleBankAccountChange(idx, 'bank_name', e.target.value)}
                          placeholder="ex: Banca Transilvania, Trezorerie"
                          className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Cod IBAN (24 caractere, validare MOD-97)
                        </label>
                        <input
                          type="text"
                          value={account.iban}
                          onChange={(e) => handleBankAccountChange(idx, 'iban', e.target.value.toUpperCase())}
                          placeholder="RO89BTRL0000123456789012"
                          className="w-full p-2 text-xs font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">Monedă</label>
                        <select
                          value={account.currency}
                          onChange={(e) => handleBankAccountChange(idx, 'currency', e.target.value)}
                          className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                        >
                          <option value="RON">RON</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={account.is_default}
                            onChange={(e) => handleBankAccountChange(idx, 'is_default', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Cont implicit ({account.currency})
                          </span>
                        </label>

                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={account.is_active}
                            onChange={(e) => handleBankAccountChange(idx, 'is_active', e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded"
                          />
                          <span className="text-slate-600 dark:text-slate-400">Activ</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Configurare Fiscală */}
          {activeTab === 4 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 text-xs text-blue-950 dark:text-blue-200">
                <strong>Gestiune istoric fiscal:</strong> Modificarea regimului fiscal sau a statutului de plătitor de TVA nu suprascrie datele din trecut, ci deschide o perioadă fiscală nouă începând cu data aplicării.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data aplicării */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de la care sunt aplicabile setările
                  </label>
                  <input
                    type="date"
                    value={fiscalStartDate}
                    onChange={(e) => {
                      setIsDirty(true);
                      setFiscalStartDate(e.target.value);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Tip impozitare */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tip Impozitare
                  </label>
                  <select
                    value={taxationType}
                    onChange={(e) => {
                      setIsDirty(true);
                      setTaxationType(e.target.value as any);
                    }}
                    className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="MICRO">Microîntreprindere (1% / 3% venituri)</option>
                    <option value="PROFIT">Impozit pe profit (16%)</option>
                    <option value="SPECIFIC">Impozit specific / Regim mixt</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVatPayer}
                    onChange={(e) => {
                      setIsDirty(true);
                      setIsVatPayer(e.target.checked);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      Societatea este înregistrată în scopuri de TVA
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Conform art. 316 din Codul Fiscal (declarațiile 300, 394).
                    </span>
                  </div>
                </label>

                {isVatPayer && (
                  <div className="pl-7 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Periodicitate Declarare TVA
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="vatPeriodicity"
                            value="MONTHLY"
                            checked={vatPeriodicity === 'MONTHLY'}
                            onChange={() => {
                              setIsDirty(true);
                              setVatPeriodicity('MONTHLY');
                            }}
                          />
                          <span>Lunar (Cifră de afaceri &gt; 100.000 EUR sau achiziții AIC)</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type="radio"
                            name="vatPeriodicity"
                            value="QUARTERLY"
                            checked={vatPeriodicity === 'QUARTERLY'}
                            onChange={() => {
                              setIsDirty(true);
                              setVatPeriodicity('QUARTERLY');
                            }}
                          />
                          <span>Trimestrial</span>
                        </label>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vatOnCollection}
                        onChange={(e) => {
                          setIsDirty(true);
                          setVatOnCollection(e.target.checked);
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Aplică sistemul de TVA la încasare (conturi 4428.TI / 4428.TP)
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Istoric fiscal anterior dacă există */}
              {initialData?.fiscal_regimes && initialData.fiscal_regimes.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                    Istoric Perioade Fiscale Înregistrate ({initialData.fiscal_regimes.length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {initialData.fiscal_regimes.map((reg, i) => (
                      <div key={i} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold">
                            {reg.is_vat_payer ? `Plătitor TVA (${reg.vat_periodicity})` : 'Neplătitor TVA'}
                          </span>
                          <span className="text-slate-400 ml-2">· {reg.taxation_type}</span>
                        </div>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {reg.start_date} → {reg.end_date || 'În vigoare (curent)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Setări Gestiune */}
          {activeTab === 5 && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-pointer">
                <input
                  type="checkbox"
                  checked={managesInventory}
                  onChange={(e) => {
                    setIsDirty(true);
                    setManagesInventory(e.target.checked);
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Gestionează stocuri materiale și mărfuri
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Activează evidența cantitativ-valorică pe depozite și magazine.
                  </span>
                </div>
              </label>

              {managesInventory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Metodă de Evaluare la Ieșire
                    </label>
                    <select
                      value={inventoryEvaluationMethod}
                      onChange={(e) => {
                        setIsDirty(true);
                        setInventoryEvaluationMethod(e.target.value as any);
                      }}
                      className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="FIFO">FIFO (Primul intrat, primul ieșit - Recomandat OMFP 1802)</option>
                      <option value="CMP">CMP (Costul mediu ponderat)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Metodă de Inventariere
                    </label>
                    <select
                      value={inventoryType}
                      onChange={(e) => {
                        setIsDirty(true);
                        setInventoryType(e.target.value as any);
                      }}
                      className="w-full p-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      <option value="PERMANENT">Inventar Permanent (Înregistrare automată descărcare)</option>
                      <option value="INTERMITTENT">Inventar Intermitent (Descărcare la finele lunii)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Setări Suplimentare */}
          {activeTab === 6 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prefix Serie Facturi de Vânzare
                  </label>
                  <input
                    type="text"
                    value={seriesPrefix}
                    onChange={(e) => {
                      setIsDirty(true);
                      setSeriesPrefix(e.target.value.toUpperCase());
                    }}
                    placeholder="ex: FAC"
                    className="w-full p-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Număr de pornire facturi
                  </label>
                  <input
                    type="text"
                    value={seriesStartNumber}
                    onChange={(e) => {
                      setIsDirty(true);
                      setSeriesStartNumber(e.target.value);
                    }}
                    className="w-full p-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Text Mențiuni Subsol Factură (Clauze legale / TVA)
                </label>
                <textarea
                  rows={2}
                  value={vatInvoiceFooter}
                  onChange={(e) => {
                    setIsDirty(true);
                    setVatInvoiceFooter(e.target.value);
                  }}
                  className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observații Interne Cabinet / Societate
                </label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => {
                    setIsDirty(true);
                    setInternalNotes(e.target.value);
                  }}
                  placeholder="Instrucțiuni particulare, contract prestări servicii, responsabili..."
                  className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isDirty ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Există modificări nesalvate
              </span>
            ) : (
              <span>Date sincronizate</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Anulează
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'Se salvează în baza de date...' : (isEditing ? 'Salvează Modificările' : 'Creează Societatea')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmare la închidere cu modificări nesalvate */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Modificări Nesalvate
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ați efectuat modificări care nu au fost salvate. Sigur doriți să închideți formularul?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmClose(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Continuă editarea
              </button>
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  onClose();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Abandonează modificările
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
