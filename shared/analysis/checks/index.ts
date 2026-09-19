import type { Finding, PassedCheck } from '../findings.js';
import type { AnalysisContext } from '../context.js';
import { checkMissing, checkRateLines, checkUnknownLines, passedMissingCheck, passedRateChecks } from './rates.js';
import { checkGrossComposition, checkGrossToNet, checkPas, passedCoherenceChecks } from './coherence.js';
import { checkPlafond, checkSmic, passedSmicChecks } from './smic.js';

export type Check = (ctx: AnalysisContext) => Finding[];

export const CHECKS: Check[] = [
  checkRateLines,
  checkMissing,
  checkUnknownLines,
  checkGrossComposition,
  checkGrossToNet,
  checkPas,
  checkSmic,
  checkPlafond,
];

/** Contrôles réellement exécutés sans écart constaté, compte tenu des constats produits. */
export function collectPassed(ctx: AnalysisContext, findings: Finding[]): PassedCheck[] {
  return [
    ...passedRateChecks(ctx, findings),
    ...passedMissingCheck(ctx, findings),
    ...passedSmicChecks(ctx, findings),
    ...passedCoherenceChecks(ctx, findings),
  ];
}
