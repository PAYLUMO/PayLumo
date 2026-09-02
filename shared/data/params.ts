/**
 * Paramètres légaux de paie — millésime 2026.
 *
 * Sources :
 * - Plafond de la Sécurité sociale : arrêté du 22 décembre 2025
 *   (PMSS 4 005 € / PASS 48 060 €).
 * - SMIC : revalorisation annuelle au 1er janvier 2026 (+1,18 %) → 12,02 €/h ;
 *   revalorisation automatique au 1er juin 2026 (+2,41 %) → 12,31 €/h.
 * - urssaf.fr / boss.gouv.fr pour les seuils et abattements.
 *
 * ⚠️ À revérifier chaque année sur les sources officielles.
 */

export const REFERENCE_YEAR = 2026 as const;

/** Plafond mensuel de la Sécurité sociale 2026. */
export const PMSS = 4005;
/** Plafond annuel de la Sécurité sociale 2026. */
export const PASS = 48060;

/** Valeur du SMIC horaire brut selon la période (dernier seuil <= date). */
export interface SmicPeriod {
  from: string; // ISO
  horaire: number;
  mensuel151_67: number;
}

export const SMIC_2026: SmicPeriod[] = [
  { from: '2026-01-01', horaire: 12.02, mensuel151_67: 1823.03 },
  { from: '2026-06-01', horaire: 12.31, mensuel151_67: 1867.02 },
];

export function smicAt(dateISO: string): SmicPeriod {
  const applicable = [...SMIC_2026].reverse().find((p) => dateISO >= p.from);
  return applicable ?? SMIC_2026[0];
}

/** Durée légale mensuelle (35 h/semaine). */
export const DUREE_LEGALE_MENSUELLE = 151.67;

/**
 * Seuils exprimés en multiples de SMIC pour les taux réduits patronaux.
 * - Maladie : 7 % au lieu de 13 % si rémunération annuelle <= 2,5 SMIC.
 * - Allocations familiales : 3,45 % au lieu de 5,25 % si <= 3,5 SMIC.
 */
export const SEUIL_MALADIE_REDUIT_SMIC = 2.5;
export const SEUIL_FAMILLE_REDUIT_SMIC = 3.5;

/** CSG/CRDS : abattement d'assiette de 1,75 % (assiette = 98,25 % du brut)
 *  dans la limite de 4 PASS ; au-delà, assiette = 100 %. */
export const CSG_ABATTEMENT = 0.0175;
export const CSG_ABATTEMENT_PLAFOND = 4 * PASS;

/** Heures supplémentaires. */
export const HS_REDUCTION_SALARIALE_TAUX = 11.31; // % (loi du 1er janv. 2019)
export const HS_EXO_FISCALE_PLAFOND_ANNUEL = 7500; // € de net imposable / an
export const HS_MAJORATION_DEFAUT_25 = 25; // %
export const HS_MAJORATION_DEFAUT_50 = 50; // %

/** Acquisition de congés payés : 2,5 jours ouvrables par mois travaillé. */
export const CP_ACQUISITION_MENSUELLE_JOURS = 2.5;

/** Tranches (bornes en euros mensuels). */
export const TRANCHE_1_MAX = PMSS; // 0 → 1 PMSS
export const TRANCHE_2_MAX = 8 * PMSS; // 1 → 8 PMSS (retraite complémentaire)
export const TRANCHE_A_MAX = PMSS;
export const TRANCHE_B_MAX = 4 * PMSS;
export const CHOMAGE_PLAFOND = 4 * PMSS; // assiette chômage plafonnée à 4 PMSS

export interface TrancheBornes {
  t1: number; // part <= 1 PMSS
  t2: number; // part entre 1 et 8 PMSS
  tA: number;
  tB: number; // part entre 1 et 4 PMSS
}

/** Répartit une assiette mensuelle en tranches. */
export function tranches(assiette: number): TrancheBornes {
  const t1 = Math.max(0, Math.min(assiette, TRANCHE_1_MAX));
  const t2 = Math.max(0, Math.min(assiette, TRANCHE_2_MAX) - TRANCHE_1_MAX);
  const tA = t1;
  const tB = Math.max(0, Math.min(assiette, TRANCHE_B_MAX) - TRANCHE_A_MAX);
  return { t1, t2, tA, tB };
}
