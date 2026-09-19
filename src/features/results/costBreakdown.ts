import { roundCents } from '@shared/lib/money';
import type { Payslip } from '@shared/parsing/model';

export interface CostBreakdown {
  gross: number;
  /** coût total employeur (brut + cotisations patronales). */
  cost: number;
  totalPat: number;
  /** cotisations salariales (hors impôt). */
  totalSal: number;
  /** prélèvement à la source. */
  pas: number;
  netPaye: number;
}

/**
 * Où va le coût total d'un poste : employeur (cotisations patronales), retenues
 * sur le brut (cotisations salariales + impôt) et net versé.
 *
 * On privilégie les totaux que le bulletin affiche lui-même (« Total des
 * cotisations », « Coût total employeur ») ; la somme ligne à ligne ne sert que
 * de secours. `null` si les cotisations patronales n'ont pas pu être lues.
 */
export function costBreakdown(payslip: Payslip): CostBreakdown | null {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const perLinePat = roundCents(
    payslip.contributions.reduce((s, c) => s + Math.abs(c.employer?.amount?.value ?? 0), 0),
  );
  const totalFromBulletin =
    payslip.contributionsTotal?.employer?.value ??
    (payslip.employerCost?.value ? roundCents(payslip.employerCost.value - gross) : undefined);
  const totalPat = totalFromBulletin ?? perLinePat;
  if (totalPat <= 0) return null;

  const cost = payslip.employerCost?.value ?? roundCents(gross + totalPat);
  const totalSal =
    payslip.contributionsTotal?.employee?.value ??
    roundCents(
      payslip.contributions.reduce((s, c) => s + Math.abs(c.employee?.amount?.value ?? 0), 0),
    );
  const pas = payslip.pas?.amount?.value ?? 0;
  const netPaye = payslip.netAPayer.value || roundCents(gross - totalSal - pas);

  return { gross, cost, totalPat, totalSal, pas, netPaye };
}
