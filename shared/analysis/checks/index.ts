import type { Finding } from '../findings';
import type { AnalysisContext } from '../context';
import { checkMissing, checkRateLines, checkUnknownLines } from './rates';
import { checkGrossComposition, checkGrossToNet, checkPas } from './coherence';
import { checkPlafond, checkSmic } from './smic';

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
