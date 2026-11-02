/**
 * Utilitare pentru aritmetică monetară exactă.
 *
 * Toate sumele sunt manipulate ca numere întregi în bani (1 leu = 100 bani),
 * astfel încât adunările, scăderile și comparațiile de egalitate să nu fie
 * afectate de erorile de reprezentare ale numerelor în virgulă mobilă.
 */

export type AmountFormat = 'RO' | 'EN';

export type ParsedAmount = { ok: true; bani: number } | { ok: false; error: string };

/** Limita maximă acceptată pentru o sumă, exprimată în bani. */
const MAX_BANI = 9e15;

function countOccurrences(str: string, token: string): number {
  let count = 0;
  for (const ch of str) {
    if (ch === token) count++;
  }
  return count;
}

/**
 * Parsează o sumă scrisă ca text și o convertește în bani întregi.
 *
 * Reguli:
 * - se elimină spațiile (inclusiv NBSP) și se ignoră un minus opțional de la început;
 * - textul vid înseamnă 0;
 * - RO: '.' este separator de mii, ',' este separator zecimal; EN: invers;
 * - separatorul de mii este acceptat doar cu primul grup de 1-3 cifre și
 *   următoarele grupuri de exact 3 cifre;
 * - maximum 2 zecimale;
 * - conversia se face exclusiv prin operații pe string, fără parseFloat.
 */
export function parseAmount(s: string, fmt: AmountFormat): ParsedAmount {
  const original = String(s ?? '');
  // Curățare spații normale, non-breaking și alte caractere de spațiu
  let str = original.trim().replace(/[\s\u00A0]/g, '');

  if (str === '') return { ok: true, bani: 0 };

  let negative = false;
  if (str.startsWith('-')) {
    negative = true;
    str = str.slice(1);
  }
  if (str === '') return { ok: false, error: 'Valoare numerică invalidă' };

  const thousandSep = fmt === 'RO' ? '.' : ',';
  const decimalSep = fmt === 'RO' ? ',' : '.';

  // Doar cifre și separatoarele cunoscute sunt acceptate
  if (!/^[0-9.,]+$/.test(str)) return { ok: false, error: 'Valoare numerică invalidă' };

  const decimalCount = countOccurrences(str, decimalSep);
  if (decimalCount > 1) return { ok: false, error: 'Valoare numerică invalidă' };

  let integerRaw = str;
  let decimals = '';
  if (decimalCount === 1) {
    const idx = str.lastIndexOf(decimalSep);
    integerRaw = str.slice(0, idx);
    decimals = str.slice(idx + 1);
    if (!/^[0-9]+$/.test(decimals)) return { ok: false, error: 'Valoare numerică invalidă' };
    if (decimals.length > 2) return { ok: false, error: 'Maxim 2 zecimale' };
  }

  let integerDigits: string;
  if (countOccurrences(integerRaw, thousandSep) > 0) {
    const groups = integerRaw.split(thousandSep);
    const firstGroupOk = /^[0-9]{1,3}$/.test(groups[0]);
    const restGroupsOk = groups.slice(1).every(g => /^[0-9]{3}$/.test(g));
    if (!firstGroupOk || !restGroupsOk) {
      return { ok: false, error: `Format numeric ambiguu: ${original.trim()}` };
    }
    integerDigits = groups.join('');
  } else {
    if (!/^[0-9]+$/.test(integerRaw)) return { ok: false, error: 'Valoare numerică invalidă' };
    integerDigits = integerRaw;
  }

  // Zecimalele sunt completate la exact 2 poziții; suma în bani se obține prin
  // concatenare de string-uri, fără operații în virgulă mobilă pe fracții.
  const decimalDigits = (decimals + '00').slice(0, 2);
  const baniDigits = (integerDigits + decimalDigits).replace(/^0+(?=\d)/, '');
  const value = Number(baniDigits);

  if (!Number.isFinite(value)) return { ok: false, error: 'Valoare numerică invalidă' };
  if (value > MAX_BANI) {
    return { ok: false, error: `Valoare în afara limitelor acceptate: ${original.trim()}` };
  }

  return { ok: true, bani: negative ? -value : value };
}

/**
 * Convertește o valoare (text sau număr, în lei) în bani întregi.
 * Valorile null / undefined / text vid sunt tratate ca 0.
 * Aruncă eroare pentru numere nefinite sau pentru texte care nu pot fi parsate.
 */
export function toBani(v: string | number | null | undefined, fmt: AmountFormat = 'RO'): number {
  if (v === null || v === undefined) return 0;

  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('Valoare numerică invalidă');
    return Math.round(v * 100);
  }

  if (v === '') return 0;

  const parsed = parseAmount(v, fmt);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.bani;
}

/** Convertește o sumă din bani întregi în lei. */
export function fromBani(b: number): number {
  return b / 100;
}

/**
 * Formatează o sumă din bani pentru afișare.
 * RO: "1.234,56" (punct mii, virgulă zecimală); EN: "1,234.56".
 * Rezultatul are mereu exact 2 zecimale, iar sumele negative primesc semnul '-'.
 */
export function formatBani(b: number, fmt: AmountFormat = 'RO'): string {
  const baniInt = Number.isFinite(b) ? Math.round(b) : 0;
  const negative = baniInt < 0;

  // Despărțirea întreg/zecimale se face pe string, pentru a evita împărțiri în virgulă mobilă.
  const digits = Math.abs(baniInt).toString().padStart(3, '0');
  const intPart = digits.slice(0, -2);
  const decPart = digits.slice(-2);

  const thousandSep = fmt === 'RO' ? '.' : ',';
  const decimalSep = fmt === 'RO' ? ',' : '.';

  let grouped = '';
  for (let i = 0; i < intPart.length; i++) {
    if (i > 0 && (intPart.length - i) % 3 === 0) grouped += thousandSep;
    grouped += intPart[i];
  }

  return `${negative ? '-' : ''}${grouped}${decimalSep}${decPart}`;
}
