import type { Finding } from '../findings.js';
import type { AnalysisContext } from '../context.js';
import { checkMissing, checkRateLines, checkUnknownLines } from './rates.js';
import { checkGrossComposition, checkGrossToNet, checkPas } from './coherence.js';
import { checkPlafond, checkSmic } from './smic.js';

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
