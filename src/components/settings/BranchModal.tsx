import React, { useState, useEffect } from 'react';
import { X, Building, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { BranchLocation } from '../../types/company';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: number;
  editingBranch?: BranchLocation | null;
  onSaved: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  companyId,
  editingBranch,
  onSaved,
}) => {
  const [internalCode, setInternalCode] = useState('');
  const [name, setName] = useState('');
  const [cui, setCui] = useState('');
  const [branchIndex, setBranchIndex] = useState('A');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [d112Separate, setD112Separate] = useState(false);
  const [notes, setNotes] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingBranch) {
      setInternalCode(editingBranch.internal_code);
      setName(editingBranch.name);
      setCui(editingBranch.cui || '');
      setBranchIndex(editingBranch.branch_index || 'A');
      setAddress(editingBranch.address);
      setCity(editingBranch.city);
      setCounty(editingBranch.county);
      setStartDate(editingBranch.start_date);
      setD112Separate(editingBranch.d112_separate_taxation === 1);
      setNotes(editingBranch.notes || '');
    } else {
      setInternalCode('');
      setName('');
      setCui('');
      setBranchIndex('A');
      setAddress('');
      setCity('');
      setCounty('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setD112Separate(false);
      setNotes('');
    }
    setError(null);
  }, [isOpen, editingBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalCode.trim()) {
      setError('Codul intern este obligatoriu.');
      return;
    }
    if (!name.trim() || name.trim().length < 3) {
      setError('Denumirea punctului de lucru trebuie să aibă cel puțin 3 caractere.');
      return;
    }
    if (branchIndex.trim().length !== 1 || !/^[A-Za-z0-9]$/.test(branchIndex.trim())) {
      setError('Indicele de filială trebuie să fie exact 1 caracter (o literă sau o cifră).');
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      internal_code: internalCode.trim().toUpperCase(),
      name: name.trim(),
      cui: cui.trim() ? cui.trim() : null,
      branch_index: branchIndex.trim().toUpperCase(),
      address: address.trim(),
      city: city.trim(),
      county: county.trim(),
      start_date: startDate,
      d112_separate_taxation: d112Separate,
      notes: notes.trim(),
    };

    try {
      if (editingBranch) {
        await api.updateBranch(companyId, editingBranch.id, payload);
      } else {
        await api.createBranch(companyId, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Eroare la salvarea punctului de lucru.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingBranch ? 'Editare Punct de Lucru / Filială' : 'Adăugare Punct de Lucru / Filială'}
              </h3>
              <p className="text-xs text-slate-500">
                Gestiune locații secundare, magazine și puncte de lucru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cod intern <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={internalCode}
                onChange={(e) => setInternalCode(e.target.value.toUpperCase())}
                placeholder="ex: PL01 sau MAG1"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono font-semibold text-slate-900 dark:text-slate-100 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Indice filială (1 caracter) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={1}
                value={branchIndex}
                onChange={(e) => setBranchIndex(e.target.value.toUpperCase())}
                placeholder="ex: A"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono font-bold text-center text-blue-600 dark:text-blue-400 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Folosit ca identificator unic scurt</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Denumire punct de lucru <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Magazin Central sau Depozit Ilfov"
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CUI secundar (opțional)
              </label>
              <input
                type="text"
                value={cui}
                onChange={(e) => setCui(e.target.value)}
                placeholder="Dacă are CUI separat"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data activării
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Județ
              </label>
              <input
                type="text"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="ex: București sau Cluj"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Localitate
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex: Sector 1 sau Cluj-Napoca"
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Adresă completă
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Strada, număr, clădire..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* D112 separat */}
          <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={d112Separate}
                onChange={(e) => setD112Separate(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Obligații fiscale separate în Declarația 112 (D112)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bifați dacă punctul de lucru are peste 5 salariați și deține cod de identificare fiscală propriu pentru virarea impozitului pe veniturile din salarii către bugetul local respectiv (Legea nr. 227/2015 Codul Fiscal).
                </p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Observații interne
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Note opționale despre locație..."
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3.5 py-1.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Se salvează...' : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{editingBranch ? 'Actualizează Punct Lucru' : 'Salvează Punct Lucru'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
