import {
  AGE_BY_ID,
  METIER_BY_ID,
  NATIONAL,
  REGION_BY_CODE,
  SEXE_COEF,
  type Sexe,
} from '@/data/insee';

export interface Profile {
  metierId: string;
  regionCode: string;
  ageBand?: string;
  sexe?: Sexe;
}

export interface Estimate {
  /** médiane net mensuel estimée pour le profil. */
  median: number;
  low: number;
  high: number;
  national: { d1: number; median: number; d9: number };
}

export function estimateMedian(p: Profile): Estimate | null {
  const metier = METIER_BY_ID.get(p.metierId);
  const region = REGION_BY_CODE.get(p.regionCode);
  if (!metier || !region) return null;

  const ageCoef = p.ageBand ? (AGE_BY_ID.get(p.ageBand)?.coef ?? 1) : 1;
  const sexeCoef = p.sexe ? SEXE_COEF[p.sexe] : 1;
  const median = Math.round(metier.medianNet * region.coef * ageCoef * sexeCoef);

  return {
    median,
    low: Math.round(median * 0.82),
    high: Math.round(median * 1.22),
    national: { d1: NATIONAL.d1, median: NATIONAL.median, d9: NATIONAL.d9 },
  };
}

export interface Position {
  /** écart signé, en %, du salaire par rapport à la médiane du profil. */
  vsMedianPct: number;
  /** position dans la distribution nationale (1 à 10). */
  decile: number;
  label: string;
}

export function positionOf(salary: number, est: Estimate): Position {
  const vsMedianPct = Math.round(((salary - est.median) / est.median) * 100);

  // Décile national par interpolation linéaire sur D1 (≈ décile 1), médiane
  // (décile 5) et D9 (décile 9).
  const { d1, median, d9 } = est.national;
  let decile: number;
  if (salary <= d1) decile = 1;
  else if (salary <= median) decile = 1 + (4 * (salary - d1)) / (median - d1);
  else if (salary <= d9) decile = 5 + (4 * (salary - median)) / (d9 - median);
  else decile = 10;
  decile = Math.max(1, Math.min(10, Math.round(decile)));

  const label =
    Math.abs(vsMedianPct) <= 3
      ? 'proche de la médiane de votre profil'
      : vsMedianPct > 0
        ? `au-dessus de la médiane de votre profil (+${vsMedianPct} %)`
        : `en dessous de la médiane de votre profil (${vsMedianPct} %)`;

  return { vsMedianPct, decile, label };
}
