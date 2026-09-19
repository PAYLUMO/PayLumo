import type { ContribCategory } from '../parsing/model.js';
import { REFERENCE_YEAR } from '../data/params.js';

export type Severity = 'erreur' | 'avertissement' | 'info';

export type FindingCode =
  | 'TAUX_INCORRECT'
  | 'ASSIETTE_SUSPECTE'
  | 'CALCUL_INCOHERENT'
  | 'COTISATION_MANQUANTE'
  | 'LIGNE_INCONNUE'
  | 'BRUT_INCOHERENT'
  | 'NET_INCOHERENT'
  | 'NET_IMPOSABLE_INCOHERENT'
  | 'NET_SOCIAL_INCOHERENT'
  | 'PAS_INCOHERENT'
  | 'SMIC_NON_RESPECTE'
  | 'PLAFOND_DEPASSE'
  | 'PERIODE_NON_COUVERTE'
  | 'LECTURE_INCOMPLETE';

export type FindingScope = ContribCategory | 'BRUT' | 'NET' | 'GENERAL';

export interface Finding {
  /** clé stable pour le rendu / la déduplication. */
  id: string;
  code: FindingCode;
  severity: Severity;
  scope: FindingScope;
  canonical?: string;
  lineLabel?: string;
  title: string;
  /** explication en langage clair, se termine par « que faire ». */
  detail: string;
  expected?: string;
  found?: string;
  /**
   * Impact estimé pour le salarié, en euros sur le mois.
   * > 0 : en votre faveur (vous avez été trop prélevé / sous-payé).
   * < 0 : en votre défaveur.
   */
  impactEuro?: number;
}

export interface AnalysisSummary {
  severityCounts: Record<Severity, number>;
  /** somme des impacts € (positif = en votre faveur). */
  netImpactEuro: number;
  readConfidence: number;
  /** false ⇒ extraction trop incomplète pour analyser. */
  canAnalyze: boolean;
  /** année du référentiel de taux utilisé. */
  referenceYear: number;
  /** false ⇒ le bulletin n'est pas de l'année du référentiel : taux non comparés. */
  periodCovered: boolean;
  /** année lue sur le bulletin quand elle diffère du référentiel, sinon null. */
  periodYear: number | null;
  /** code IDCC retenu (choisi par l'utilisateur ou détecté sur le bulletin), sinon null. */
  conventionIdcc: number | null;
  /** libellé de la convention retenue, sinon null. */
  conventionLabel: string | null;
  /** d'où vient la convention retenue. */
  conventionSource: 'user' | 'detected' | 'none';
}

export interface AnalysisResult {
  findings: Finding[];
  summary: AnalysisSummary;
}

const SEVERITY_ORDER: Record<Severity, number> = { erreur: 0, avertissement: 1, info: 2 };

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return Math.abs(b.impactEuro ?? 0) - Math.abs(a.impactEuro ?? 0);
  });
}

export function summarize(
  findings: Finding[],
  readConfidence: number,
  canAnalyze: boolean,
  opts: {
    periodCovered?: boolean;
    referenceYear?: number;
    periodYear?: number | null;
    conventionIdcc?: number | null;
    conventionLabel?: string | null;
    conventionSource?: 'user' | 'detected' | 'none';
  } = {},
): AnalysisSummary {
  const severityCounts: Record<Severity, number> = { erreur: 0, avertissement: 0, info: 0 };
  let netImpactEuro = 0;
  for (const f of findings) {
    severityCounts[f.severity]++;
    netImpactEuro += f.impactEuro ?? 0;
  }
  return {
    severityCounts,
    netImpactEuro: Math.round(netImpactEuro * 100) / 100,
    readConfidence,
    canAnalyze,
    referenceYear: opts.referenceYear ?? REFERENCE_YEAR,
    periodCovered: opts.periodCovered ?? true,
    periodYear: opts.periodYear ?? null,
    conventionIdcc: opts.conventionIdcc ?? null,
    conventionLabel: opts.conventionLabel ?? null,
    conventionSource: opts.conventionSource ?? 'none',
  };
}
