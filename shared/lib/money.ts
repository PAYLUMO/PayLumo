/**
 * Utilitaires numériques et monétaires.
 *
 * Les bulletins français écrivent les nombres « 1 234,56 » (espace, espace
 * insécable ou fine comme séparateur de milliers, virgule décimale). Certains
 * éditeurs utilisent le point. On normalise tout vers un `number` JS.
 */

// \s couvre l'espace ordinaire, l'insécable (U+00A0) et la fine (U+202F).
const SPACES = /\s/g;

/**
 * Convertit un montant / taux lu sur un bulletin en nombre.
 * Gère « 1 234,56 », « 1234,56 », « 1,234.56 », « 2 000 », « -12,30 »,
 * « 12,30- » (signe suffixe), « (12,30) » (parenthèses = négatif),
 * « 151,67 h », « 6,90 % », « 3 488,46 € ».
 * Renvoie `null` si la chaîne ne contient aucun nombre exploitable.
 */
export function parseFrNumber(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const original = String(raw).trim();
  if (!original) return null;

  let sign = 1;
  if (/^\(.*\)$/.test(original)) sign = -1;
  const noParens = original.replace(/[()]/g, '');
  if (/^-/.test(noParens) || /-\s*$/.test(noParens)) sign = -1;

  // isole la première séquence numérique (chiffres, espaces, points et virgules)
  const m = original.replace(SPACES, ' ').match(/\d[\d ]*(?:[.,]\d+(?:[.,]\d+)?)?/);
  if (!m) return null;
  let s = m[0].replace(/ /g, '').replace(/[.,]$/, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // le dernier séparateur est le décimal, l'autre = séparateur de milliers
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    // sur un bulletin français, la virgule est toujours le séparateur décimal
    s = s.replace(',', '.');
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // « 1.234 » ou « 1.234.567 » = séparateur de milliers
    s = s.replace(/\./g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? sign * n : null;
}

/** true si la chaîne contient un nombre exploitable (repérage des cellules de données). */
export function looksNumeric(raw: string): boolean {
  return /\d/.test(raw) && parseFrNumber(raw) !== null;
}

/** Arrondi comptable au centime. */
export function roundCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Arrondi à `d` décimales. */
export function round(n: number, d = 2): number {
  const f = 10 ** d;
  return Math.round((n + Number.EPSILON) * f) / f;
}

/** true si |a - b| <= tol. */
export function approxEqual(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol + 1e-9;
}

const eur = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const eur0 = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const pct = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

/** « 1 823,03 € » */
export function formatEuro(n: number, decimals = 2): string {
  return decimals === 0 ? eur0.format(n) : eur.format(n);
}

/** « + 1 823,03 € » / « − 12,30 € » */
export function formatSignedEuro(n: number): string {
  const s = n > 0 ? '+ ' : n < 0 ? '− ' : '';
  return s + eur.format(Math.abs(n));
}

/** 6.9 → « 6,90 % » */
export function formatPercent(rate: number): string {
  return `${pct.format(rate)} %`;
}
