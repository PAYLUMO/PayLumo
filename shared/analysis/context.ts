import {
  PASS,
  PMSS,
  REFERENCE_YEAR,
  smicAt,
  tranches,
  type SmicPeriod,
  type TrancheBornes,
} from '../data/params';
import type { AssietteKind, RateRef, RateSpec } from '../data/rates2026';
import { detectConvention, findConventionByLabel, isBatimentTP } from '../data/conventions';
import type { Payslip } from '../parsing/model';

export type ConventionSource = 'user' | 'detected' | 'none';

export interface BuildContextOptions {
  /**
   * Libellé de convention choisi explicitement par l'utilisateur dans la liste
   * déroulante (prioritaire sur la détection). Beaucoup de conventions n'ont pas
   * de code IDCC confirmé — le libellé exact sert donc d'identifiant.
   */
  userConvention?: string | null;
}

export interface AnalysisContext {
  payslip: Payslip;
  /** année du référentiel de taux (= `referenceYear`, conservé pour compat). */
  year: number;
  referenceYear: number;
  /** année lue sur le bulletin si elle est fiable, sinon null. */
  periodYear: number | null;
  /** true si le référentiel s'applique à la période du bulletin (⇒ on compare les taux). */
  periodCovered: boolean;
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
  /** convention collective retenue : choisie par l'utilisateur, sinon détectée sur le bulletin. */
  conventionIdcc: number | null;
  conventionLabel: string | null;
  conventionSource: ConventionSource;
  /** convention relevant du bâtiment / BTP (abattement pour frais professionnels possible). */
  conventionIsBTP: boolean;
}

export function buildContext(
  payslip: Payslip,
  referenceYear: number = REFERENCE_YEAR,
  opts: BuildContextOptions = {},
): AnalysisContext {
  const { month, year: py } = payslip.period.value;
  const periodConfident = payslip.period.confidence >= 0.6 && py > 2000 && py < 2100;
  const periodYear = periodConfident ? py : null;
  const periodCovered = periodYear == null || periodYear === referenceYear;
  const periodISO =
    month && py ? `${py}-${String(month).padStart(2, '0')}-01` : `${referenceYear}-01-01`;
  const gross = payslip.gross.value;

  let conventionIdcc: number | null = null;
  let conventionLabel: string | null = null;
  let conventionSource: ConventionSource = 'none';
  const chosen = opts.userConvention ? findConventionByLabel(opts.userConvention) : undefined;
  if (chosen) {
    conventionIdcc = chosen.idcc;
    conventionLabel = chosen.label;
    conventionSource = 'user';
  } else {
    const detected = detectConvention(payslip.employer.convention);
    if (detected) {
      conventionIdcc = detected.idcc;
      conventionLabel = detected.label;
      conventionSource = 'detected';
    }
  }

  return {
    payslip,
    year: referenceYear,
    referenceYear,
    periodYear: periodCovered ? null : periodYear,
    periodCovered,
    pmss: PMSS,
    pass: PASS,
    smic: smicAt(periodISO),
    periodISO,
    gross,
    grossConfident: payslip.gross.confidence >= 0.6 && gross > 0,
    tranches: tranches(gross),
    annualGrossEstimate: gross * 12,
    effectif: payslip.employer.effectifTranche ?? 'inconnu',
    conventionIdcc,
    conventionLabel,
    conventionSource,
    conventionIsBTP: isBatimentTP(conventionLabel) || isBatimentTP(payslip.employer.convention),
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
