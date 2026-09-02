import type { Payslip } from '../parsing/model';
import { buildContext } from './context';
import { CHECKS } from './checks';
import {
  sortFindings,
  summarize,
  type AnalysisResult,
  type Finding,
} from './findings';

export interface AnalyzeOptions {
  year?: number;
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
  const ctx = buildContext(payslip, opts.year ?? 2026);

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
      summary: summarize([finding], payslip.meta.parseConfidence, false),
    };
  }

  const findings: Finding[] = [];
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

  return {
    findings: unique,
    summary: summarize(unique, payslip.meta.parseConfidence, true),
  };
}
