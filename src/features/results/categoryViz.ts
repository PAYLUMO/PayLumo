/**
 * Couleurs et agrégats par grande famille de cotisation, pour l'anneau
 * « où va votre salaire » et la légende associée.
 *
 * Palette catégorielle (tons moyens saturés, lisibles sur fond clair comme
 * sombre) — distincte de l'accent marque et de l'ambre « anomalie ».
 */

import type { ContribCategory, Payslip } from '@shared/parsing/model';
import { roundCents } from '@shared/lib/money';

export const CAT_COLOR: Record<ContribCategory, string> = {
  SANTE: '#14b8a6', // teal
  ATMP: '#fb7185', // rose
  RETRAITE: '#6366f1', // indigo
  FAMILLE: '#f59e0b', // ambre
  CHOMAGE: '#0ea5e9', // ciel
  CSG_CRDS: '#8b5cf6', // violet
  AUTRES: '#a8a29e', // pierre
};

export const NET_COLOR = '#3e9e4e'; // vert marque
export const COTIS_COLOR = '#ef8a62'; // orange doux (identique à la cascade)
export const IMPOT_COLOR = '#64748b'; // ardoise

export interface CategoryCost {
  category: ContribCategory;
  euro: number;
}

function byCategory(
  payslip: Payslip,
  pick: (c: Payslip['contributions'][number]) => number | undefined,
): CategoryCost[] {
  const map = new Map<ContribCategory, number>();
  for (const c of payslip.contributions) {
    const amt = Math.abs(pick(c) ?? 0);
    if (amt <= 0) continue;
    map.set(c.category, roundCents((map.get(c.category) ?? 0) + amt));
  }
  return [...map.entries()]
    .map(([category, euro]) => ({ category, euro }))
    .sort((a, b) => b.euro - a.euro);
}

/** Total des cotisations salariales par famille, ce mois, trié décroissant. */
export function employeeCostByCategory(payslip: Payslip): CategoryCost[] {
  return byCategory(payslip, (c) => c.employee?.amount?.value);
}

/** Total des cotisations patronales par famille, ce mois, trié décroissant. */
export function employerCostByCategory(payslip: Payslip): CategoryCost[] {
  return byCategory(payslip, (c) => c.employer?.amount?.value);
}
