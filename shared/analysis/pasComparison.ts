import { REFERENCE_YEAR } from '../data/params.js';
import { PAS_GRID_EFFECTIVE_FROM, neutralPasRate } from '../data/pasGrid.js';
import { roundCents } from '../lib/money.js';
import type { Payslip } from '../parsing/model.js';

export interface PasComparison {
  /** base mensuelle de prélèvement (= net imposable du mois), en €. */
  base: number;
  /** taux appliqué par l'employeur, en %. */
  detectedRate: number;
  detectedAmount: number;
  /** taux par défaut de la grille officielle pour cette base, en %. */
  defaultRate: number;
  defaultAmount: number;
  /** taux appliqué − taux par défaut, en points (arrondi au dixième). */
  gap: number;
  relation: 'same' | 'lower' | 'higher';
}

/**
 * Compare le taux de prélèvement à la source du bulletin au taux par défaut
 * (« non personnalisé ») de la grille officielle pour le même niveau de revenu.
 *
 * Ce n'est PAS une estimation du taux personnalisé du salarié (qui dépend du foyer) :
 * c'est un repère exact — le taux qu'appliquerait l'employeur sans taux transmis.
 *
 * `null` si le bulletin n'est pas couvert par la grille modélisée (autre année, ou
 * avant son entrée en vigueur) ou si le taux / la base ne sont pas lisibles.
 */
export function comparePas(payslip: Payslip): PasComparison | null {
  const { month, year } = payslip.period.value;
  if (payslip.period.confidence < 0.6 || year !== REFERENCE_YEAR || !month) return null;
  const periodISO = `${year}-${String(month).padStart(2, '0')}-01`;
  if (periodISO < PAS_GRID_EFFECTIVE_FROM) return null;

  const pas = payslip.pas;
  const base = pas?.base?.value ?? payslip.netImposable?.value;
  if (!pas || base == null || !(base > 0)) return null;

  const amountRead = pas.amount?.value;
  const rateRead = pas.rate && pas.rate.confidence >= 0.5 ? pas.rate.value : undefined;
  const detectedRate = rateRead ?? (amountRead != null ? (amountRead / base) * 100 : undefined);
  if (detectedRate == null || !Number.isFinite(detectedRate) || detectedRate < 0) return null;

  const defaultRate = neutralPasRate(base);
  const gap = Math.round((detectedRate - defaultRate) * 10) / 10;

  return {
    base,
    detectedRate: Math.round(detectedRate * 100) / 100,
    detectedAmount: amountRead ?? roundCents((base * detectedRate) / 100),
    defaultRate,
    defaultAmount: roundCents((base * defaultRate) / 100),
    gap,
    relation: Math.abs(gap) < 0.05 ? 'same' : gap < 0 ? 'lower' : 'higher',
  };
}
