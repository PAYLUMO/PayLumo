import type { Payslip } from '../parsing/model.js';
import { REFERENCE_YEAR } from '../data/params.js';
import { buildContext } from './context.js';
import { CHECKS, collectPassed } from './checks/index.js';
import {
  sortFindings,
  summarize,
  type AnalysisResult,
  type Finding,
  type PassedCheck,
} from './findings.js';

export interface AnalyzeOptions {
  /** année du référentiel de taux (défaut : la seule disponible). */
  year?: number;
  /** libellé de convention choisi explicitement par l'utilisateur ; sinon détecté sur le bulletin. */
  conventionLabel?: string | null;
}

/**
 * Analyse un bulletin déjà extrait : applique tous les contrôles, agrège et
 * trie les constats, et produit une synthèse.
 *
 * Défensif : si l'extraction est trop incomplète (pas de brut, pas de net,
 * moins de 3 cotisations), on ne produit pas d'analyse chiffrée — seulement
 * un constat `LECTURE_INCOMPLETE`.
 */
export function analyzePayslip(payslip: Payslip, opts: AnalyzeOptions = {}): AnalysisResult {
  const ctx = buildContext(payslip, opts.year ?? REFERENCE_YEAR, {
    userConvention: opts.conventionLabel,
  });
  const summaryOpts = {
    periodCovered: ctx.periodCovered,
    referenceYear: ctx.referenceYear,
    periodYear: ctx.periodYear,
    conventionIdcc: ctx.conventionIdcc,
    conventionLabel: ctx.conventionLabel,
    conventionSource: ctx.conventionSource,
  };

  const canAnalyze =
    payslip.gross.value > 0 &&
    payslip.gross.confidence >= 0.5 &&
    payslip.contributions.length >= 3 &&
    payslip.meta.parseConfidence >= 0.4 &&
    !payslip.meta.scanned;

  if (!canAnalyze) {
    const reason = payslip.meta.scanned
      ? 'Ce PDF ne contient pas de texte exploitable (scan ou photo). Exportez votre bulletin en PDF depuis votre espace RH.'
      : 'PayLumo n’a pas pu lire assez d’informations sur ce bulletin pour l’analyser de façon fiable.';
    const finding: Finding = {
      id: 'lecture:incomplete',
      code: 'LECTURE_INCOMPLETE',
      severity: 'avertissement',
      scope: 'GENERAL',
      title: 'Lecture du bulletin incomplète',
      detail: `${reason} ${payslip.meta.notes.join(' ')}`.trim(),
    };
    return {
      findings: [finding],
      passed: [],
      summary: summarize([finding], payslip.meta.parseConfidence, false, summaryOpts),
    };
  }

  const findings: Finding[] = [];

  // Bulletin d'une autre année que le référentiel : lecture seule, pas de
  // comparaison de taux (les contrôles concernés se coupent via ctx.periodCovered).
  if (!ctx.periodCovered && ctx.periodYear != null) {
    findings.push({
      id: 'periode:hors-referentiel',
      code: 'PERIODE_NON_COUVERTE',
      severity: 'info',
      scope: 'GENERAL',
      title: `Bulletin ${ctx.periodYear} — taux non comparés`,
      detail:
        `PayLumo ne connaît que le barème légal ${ctx.referenceYear}. Pour un bulletin de ${ctx.periodYear}, ` +
        'seules la lecture du bulletin, la décomposition du salaire et les explications sont affichées ; ' +
        'les taux, les assiettes et le SMIC ne sont pas vérifiés.',
    });
  }

  for (const check of CHECKS) {
    try {
      findings.push(...check(ctx));
    } catch (err) {
      findings.push({
        id: `erreur-interne:${check.name}`,
        code: 'LECTURE_INCOMPLETE',
        severity: 'info',
        scope: 'GENERAL',
        title: 'Un contrôle n’a pas pu être exécuté',
        detail: `Le contrôle « ${check.name} » a échoué : ${(err as Error).message}.`,
      });
    }
  }

  // déduplication par id
  const byId = new Map<string, Finding>();
  for (const f of findings) if (!byId.has(f.id)) byId.set(f.id, f);
  const unique = sortFindings([...byId.values()]);

  let passed: PassedCheck[] = [];
  try {
    passed = collectPassed(ctx, unique);
  } catch {
    /* un point « conforme » manquant vaut mieux qu'une analyse en échec */
  }

  return {
    findings: unique,
    passed,
    summary: summarize(unique, payslip.meta.parseConfidence, true, summaryOpts),
  };
}
