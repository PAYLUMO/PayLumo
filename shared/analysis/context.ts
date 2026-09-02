import {
  PASS,
  PMSS,
  smicAt,
  tranches,
  type SmicPeriod,
  type TrancheBornes,
} from '../data/params';
import type { AssietteKind, RateRef, RateSpec } from '../data/rates2026';
import type { Payslip } from '../parsing/model';

export interface AnalysisContext {
  payslip: Payslip;
  year: number;
  pmss: number;
  pass: number;
  smic: SmicPeriod;
  /** date représentative de la période (ISO), pour choisir le SMIC applicable. */
  periodISO: string;
  gross: number;
  grossConfident: boolean;
  tranches: TrancheBornes;
  /** brut annualisé (× 12) — proxy pour les seuils exprimés en multiples de SMIC. */
  annualGrossEstimate: number;
  effectif: 'lt50' | 'gte50' | 'inconnu';
}

export function buildContext(payslip: Payslip, year = 2026): AnalysisContext {
  const { month, year: py } = payslip.period.value;
  const periodISO = month && py ? `${py}-${String(month).padStart(2, '0')}-01` : `${year}-01-01`;
  const gross = payslip.gross.value;
  return {
    payslip,
    year,
    pmss: PMSS,
    pass: PASS,
    smic: smicAt(periodISO),
    periodISO,
    gross,
    grossConfident: payslip.gross.confidence >= 0.6 && gross > 0,
    tranches: tranches(gross),
    annualGrossEstimate: gross * 12,
    effectif: payslip.employer.effectifTranche ?? 'inconnu',
  };
}

/** Base d'assiette attendue (€/mois) pour un type d'assiette. `null` si non modélisable. */
export function expectedBase(kind: AssietteKind, ctx: AnalysisContext): number | null {
  const { tranches: tr, gross, pmss } = ctx;
  switch (kind) {
    case 'brut_total':
      return gross;
    case 'tranche_1':
      return tr.t1;
    case 'tranche_2':
      return tr.t2;
    case 'tranche_1_2':
      return tr.t1 + tr.t2;
    case 'tranche_B':
      return tr.tB;
    case 'tranche_AB':
      return Math.min(gross, 4 * pmss);
    case 'chomage':
      return Math.min(gross, 4 * pmss);
    case 'csg':
      return ctx.payslip.csgCrds?.base?.value ?? Math.round(gross * 0.9825 * 100) / 100;
    case 'none':
      return null;
  }
}

/** Taux attendu (en %) pour un côté donné, ou `null` si variable / non déterminable. */
export function resolveRate(spec: RateSpec | undefined, ctx: AnalysisContext): number | null {
  if (!spec) return null;
  switch (spec.kind) {
    case 'fixed':
      return spec.rate;
    case 'min':
      return spec.rate; // on compare « au moins »
    case 'variable':
      return null;
    case 'range':
      return spec.typical;
    case 'smic_threshold': {
      const annualSmic = ctx.smic.mensuel151_67 * 12;
      return ctx.annualGrossEstimate <= annualSmic * spec.smicMultiple ? spec.low : spec.high;
    }
    case 'effectif_threshold':
      if (ctx.effectif === 'lt50') return spec.lt50;
      if (ctx.effectif === 'gte50') return spec.gte50;
      return null; // effectif inconnu → on ne tranche pas
  }
}

/** true si la cotisation est attendue sur ce bulletin. */
export function isExpected(ref: RateRef, ctx: AnalysisContext): boolean {
  if (!ref.expected) return false;
  const { statut, regime } = ctx.payslip.employee;
  if (ref.expected.statut && ref.expected.statut !== statut) return false;
  if (ref.expected.regime && ref.expected.regime !== regime) return false;
  if (ref.expected.abovePmssOnly && ctx.gross <= ctx.pmss) return false;
  return true;
}
