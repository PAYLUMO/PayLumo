/**
 * Grille des taux par défaut (« taux neutre ») du prélèvement à la source —
 * contribuables domiciliés en métropole ou hors de France.
 *
 * Source : BOFiP-Impôts, BOI-BAREME-000037 (version du 07/04/2026), § I —
 * « Grille des taux par défaut … à compter du 1er mai 2026 » (limites relevées de
 * 0,9 % par l'article 4 de la loi de finances pour 2026, n° 2026-103).
 * https://bofip.impots.gouv.fr/bofip/11255-PGP.html/identifiant=BOI-BAREME-000037-20260407
 *
 * ⚠️ Grille à revérifier à chaque évolution (elle est indexée). Les grilles
 * Guadeloupe / Martinique / La Réunion et Guyane / Mayotte ne sont pas modélisées.
 */

export const PAS_GRID_EFFECTIVE_FROM = '2026-05-01';

/** [borne haute exclue de la base mensuelle de prélèvement (€), taux (%)] — la dernière tranche est ouverte. */
export const PAS_GRID: ReadonlyArray<readonly [number, number]> = [
  [1635, 0],
  [1698, 0.5],
  [1807, 1.3],
  [1928, 2.1],
  [2060, 2.9],
  [2170, 3.5],
  [2315, 4.1],
  [2738, 5.3],
  [3135, 7.5],
  [3571, 9.9],
  [4019, 11.9],
  [4690, 13.8],
  [5624, 15.8],
  [7037, 17.9],
  [8789, 20],
  [12200, 24],
  [16523, 28],
  [25937, 33],
  [55558, 38],
];

/** Taux au-delà de la dernière borne (base ≥ 55 558 €). */
export const PAS_GRID_TOP_RATE = 43;

/** Taux par défaut applicable à une base mensuelle de prélèvement (= net imposable du mois), en %. */
export function neutralPasRate(baseMensuelle: number): number {
  for (const [limit, rate] of PAS_GRID) if (baseMensuelle < limit) return rate;
  return PAS_GRID_TOP_RATE;
}
