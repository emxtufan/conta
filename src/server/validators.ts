/**
 * Validări specifice pentru entități comerciale și financiare din România
 */

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  normalized?: string;
}

/**
 * Validează sintactic un CUI/CIF din România și verifică cifra de control (modulo 11).
 * Nu verifică starea la ANAF, ci corectitudinea structurală și matematică.
 */
export function validateCUI(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, message: 'CUI/CIF este obligatoriu.' };
  }

  // Curățare spații și prefixul opțional RO
  let clean = input.trim().toUpperCase();
  if (clean.startsWith('RO')) {
    clean = clean.substring(2).trim();
  }

  // Trebuie să fie format doar din cifre
  if (!/^\d+$/.test(clean)) {
    return { isValid: false, message: 'CUI/CIF trebuie să conțină doar cifre (fără prefixul RO).' };
  }

  // Lungimea legală a unui CUI în România este între 2 și 10 cifre
  if (clean.length < 2 || clean.length > 10) {
    return { isValid: false, message: `CUI/CIF trebuie să aibă între 2 și 10 cifre. Ați introdus ${clean.length} cifre.` };
  }

  // CUI-urile speciale de test sau CIF-uri cu 2-5 cifre fără algoritm strict
  // Algoritmul standard cu cheia de control:
  // Cheia de testare: 7, 5, 3, 2, 1, 7, 5, 3, 2
  const weights = [7, 5, 3, 2, 1, 7, 5, 3, 2];
  const controlDigit = parseInt(clean.charAt(clean.length - 1), 10);
  const numberPart = clean.substring(0, clean.length - 1);

  // Aliniere la dreapta a cifrelor față de cheia de 9 ponderi
  const paddedWeights = weights.slice(weights.length - numberPart.length);
  let sum = 0;
  for (let i = 0; i < numberPart.length; i++) {
    sum += parseInt(numberPart.charAt(i), 10) * paddedWeights[i];
  }

  const calculatedControl = (sum * 10) % 11;
  const expectedControl = calculatedControl === 10 ? 0 : calculatedControl;

  if (controlDigit !== expectedControl) {
    return {
      isValid: false,
      message: `Cifra de control CUI este invalidă (așteptat: ${expectedControl}, introdus: ${controlDigit}). Verificați datele înscrise pe certificatul de înregistrare.`,
      normalized: clean,
    };
  }

  return { isValid: true, normalized: clean };
}

/**
 * Validează un IBAN din România conform standardului ISO 13616 și algoritmului MOD-97 (ISO 7064).
 */
export function validateIBAN(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: false, message: 'Codul IBAN este obligatoriu.' };
  }

  const clean = input.trim().replace(/\s+/g, '').toUpperCase();

  // Pentru România lungimea este exact de 24 caractere
  if (clean.startsWith('RO')) {
    if (clean.length !== 24) {
      return { isValid: false, message: `IBAN-ul din România trebuie să aibă exact 24 de caractere. Ați introdus ${clean.length}.` };
    }
  } else {
    // Alt IBAN internațional (între 15 și 34 caractere)
    if (clean.length < 15 || clean.length > 34) {
      return { isValid: false, message: `Lungime IBAN invalidă (${clean.length} caractere).` };
    }
  }

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)) {
    return { isValid: false, message: 'Format IBAN invalid. Trebuie să înceapă cu codul de țară (ex: RO) urmat de 2 cifre de control.' };
  }

  // Algoritmul ISO 7064 MOD 97-10:
  // Se mută primele 4 caractere la sfârșit
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Se convertesc literele în numere (A=10, B=11 ... Z=35)
  let numericString = '';
  for (let i = 0; i < rearranged.length; i++) {
    const code = rearranged.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      numericString += (code - 55).toString();
    } else {
      numericString += rearranged.charAt(i);
    }
  }

  // Calcul modulo 97 pe bucăți (pentru a evita overflow de număr mare)
  let remainder = 0;
  for (let i = 0; i < numericString.length; i += 7) {
    const chunk = remainder.toString() + numericString.substring(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }

  if (remainder !== 1) {
    return {
      isValid: false,
      message: 'Cifra de control a IBAN-ului este invalidă conform algoritmului bancar MOD-97. Verificați corectitudinea contului.',
      normalized: clean,
    };
  }

  return { isValid: true, normalized: clean };
}

/**
 * Validează numărul de la Registrul Comerțului (format de tip J40/1234/2020, F12/34/2019, C08/99/2021 etc.)
 */
export function validateRegCom(input: string): ValidationResult {
  if (!input || typeof input !== 'string') {
    return { isValid: true }; // Opțional la unele forme juridice (ONG, CMI)
  }
  const clean = input.trim().toUpperCase();
  if (!clean) return { isValid: true };

  // Format uzual: [J|F|C][0-9]{1,2}/[0-9]+/[0-9]{4} sau similar
  const pattern = /^[JFCjfc]\d{1,2}\/\d+\/\d{4}$/;
  if (!pattern.test(clean)) {
    return {
      isValid: false,
      message: 'Formatul numărului de Registru al Comerțului este invalid. Model recomandat: J40/1234/2020 sau F12/45/2018.',
      normalized: clean,
    };
  }
  return { isValid: true, normalized: clean };
}
