import { CSP_MEDIAN, NATIONAL } from '@/data/insee';
import { DUREE_LEGALE_MENSUELLE } from '@shared/data/params';
import { roundCents } from '@shared/lib/money';
import type { Payslip } from '@shared/parsing/model';

export type Zone = 'below-d1' | 'd1-median' | 'median-d9' | 'above-d9';

export interface SalaryPosition {
  /** net avant impôt du mois, tel que lu sur le bulletin. */
  monthNet: number;
  /** net ramené à un mois complet à temps plein — c'est lui qu'on compare à l'INSEE. */
  eqtpNet: number;
  adjustment: null | { partTime: boolean; absences: number };
  zone: Zone;
  /** eqtpNet − médiane nationale (€/mois). */
  vsMedian: number;
  /** montant qui manquerait pour atteindre le seuil du top 10 %, sinon null. */
  toTop10: number | null;
  /** comparaison aux cadres (estimation PayLumo dérivée de l'INSEE), sinon null. */
  cadre: null | { median: number; diff: number };
}

/** Au-delà, le bulletin est trop atypique (mois très partiel) pour une comparaison honnête. */
const MAX_ADJUSTMENT = 2.5;
/** Retenues / absences en dessous de ce seuil (part du brut) : négligées. */
const ABSENCE_THRESHOLD = 0.02;

function monthNetBeforeTax(p: Payslip): number | null {
  if (p.netAvantImpot?.value != null && p.netAvantImpot.value > 0) return p.netAvantImpot.value;
  if (p.netAPayer.value > 0) return roundCents(p.netAPayer.value + (p.pas?.amount?.value ?? 0));
  return null;
}

/**
 * Situe le net d'un bulletin dans la distribution INSEE des salaires du privé
 * (net mensuel avant impôt, équivalent temps plein). Un mois avec absences ou à
 * temps partiel est d'abord ramené à un mois complet à temps plein ; si l'écart est
 * trop grand pour que ce soit fiable, on ne compare pas (`null`).
 */
export function salaryPosition(p: Payslip): SalaryPosition | null {
  const monthNet = monthNetBeforeTax(p);
  const gross = p.gross.value;
  if (monthNet == null || !(gross > 0)) return null;

  // Temps partiel : ramené à la durée légale.
  const hours = p.time.heuresContrat?.value;
  const partTime = !!hours && hours > 0 && hours < DUREE_LEGALE_MENSUELLE - 1;
  const partTimeFactor = partTime ? DUREE_LEGALE_MENSUELLE / (hours as number) : 1;

  // Absences / retenues : réintégrées, le net étant à peu près proportionnel au brut.
  const deductions = p.grossItems
    .filter((g) => g.amount.confidence >= 0.5 && (g.kind === 'absence' || g.amount.value < 0))
    .reduce((s, g) => s + Math.abs(g.amount.value), 0);
  const absences = deductions / gross >= ABSENCE_THRESHOLD ? deductions : 0;
  const absenceFactor = absences > 0 ? (gross + absences) / gross : 1;

  const factor = partTimeFactor * absenceFactor;
  if (factor > MAX_ADJUSTMENT) return null;

  const eqtpNet = Math.round(monthNet * factor);
  const { d1, median, d9 } = NATIONAL;
  const zone: Zone =
    eqtpNet < d1 ? 'below-d1' : eqtpNet < median ? 'd1-median' : eqtpNet < d9 ? 'median-d9' : 'above-d9';

  return {
    monthNet: Math.round(monthNet),
    eqtpNet,
    adjustment: factor > 1.001 ? { partTime, absences: Math.round(absences) } : null,
    zone,
    vsMedian: eqtpNet - median,
    toTop10: eqtpNet < d9 ? d9 - eqtpNet : null,
    cadre:
      p.employee.statut === 'cadre'
        ? { median: CSP_MEDIAN.cadre, diff: eqtpNet - CSP_MEDIAN.cadre }
        : null,
  };
}
