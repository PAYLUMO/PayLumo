/**
 * Référentiel des taux de cotisation — millésime 2026.
 *
 * Sources principales :
 * - boss.gouv.fr (Bulletin officiel de la Sécurité sociale)
 * - urssaf.fr — taux de cotisations
 * - agirc-arrco.fr — « Chiffr'Agirc-Arrco 2026 »
 * - legisocial.fr — synthèses 2026 (recoupement)
 *
 * Taux salariaux : stables depuis plusieurs années.
 * Nouveautés 2026 retenues : vieillesse déplafonnée patronale 2,02 % → 2,11 % ;
 * assurance chômage patronale 4,05 % → 4,00 % (effet mai 2025, pérennisé) ;
 * PMSS 3 925 € → 4 005 €.
 */

import type { ContribCategory, EmployeeStatus, SocialRegime } from '../parsing/model.js';
import type { CanonicalCode } from './taxonomy.js';

export type AssietteKind =
  | 'brut_total'
  | 'tranche_1' // 0 → 1 PMSS
  | 'tranche_2' // 1 → 8 PMSS
  | 'tranche_1_2' // 0 → 8 PMSS
  | 'tranche_B' // 1 → 4 PMSS
  | 'tranche_AB' // 0 → 4 PMSS
  | 'chomage' // 0 → 4 PMSS
  | 'csg' // 98,25 % du brut (dans la limite de 4 PASS) + part patronale prévoyance
  | 'none'; // forfaitaire / variable / non modélisé

export type RateSpec =
  | { kind: 'fixed'; rate: number }
  | { kind: 'min'; rate: number }
  | { kind: 'range'; min: number; max: number; typical: number }
  | {
      kind: 'smic_threshold';
      /** taux si rémunération <= seuil */
      low: number;
      /** taux au-delà */
      high: number;
      smicMultiple: number;
    }
  | {
      kind: 'effectif_threshold';
      /** < 50 salariés */
      lt50: number;
      /** >= 50 salariés */
      gte50: number;
    }
  | { kind: 'variable' };

export interface RateRef {
  code: CanonicalCode;
  category: ContribCategory;
  label: string;
  assiette: AssietteKind;
  employee?: RateSpec;
  employer?: RateSpec;
  /** Tolérance en points de % pour la comparaison de taux (défaut 0,05). */
  tolerancePoints?: number;
  /** La ligne est-elle attendue sur le bulletin ? */
  expected?: {
    statut?: EmployeeStatus;
    regime?: SocialRegime;
    /** seulement si la rémunération dépasse 1 PMSS */
    abovePmssOnly?: boolean;
    note?: string;
  };
  note?: string;
}

export const RATES_2026: RateRef[] = [
  // ─────────────────────────────  SANTÉ  ─────────────────────────────
  {
    code: 'MALADIE',
    category: 'SANTE',
    label: 'Assurance maladie, maternité, invalidité, décès',
    assiette: 'brut_total',
    employee: { kind: 'fixed', rate: 0 },
    employer: { kind: 'smic_threshold', low: 7.0, high: 13.0, smicMultiple: 2.5 },
    expected: { regime: 'general', note: 'Part salariale nulle hors Alsace-Moselle.' },
  },
  {
    code: 'MALADIE_ALSACE_MOSELLE',
    category: 'SANTE',
    label: 'Cotisation salariale maladie — régime local Alsace-Moselle',
    assiette: 'brut_total',
    employee: { kind: 'fixed', rate: 1.3 },
    expected: { regime: 'alsace-moselle' },
    note: 'Cotisation supplémentaire propre aux départements 57, 67 et 68.',
  },
  {
    code: 'COMPLEMENTAIRE_SANTE',
    category: 'SANTE',
    label: 'Complémentaire santé (mutuelle) d’entreprise',
    assiette: 'none',
    employee: { kind: 'variable' },
    employer: { kind: 'variable' },
    note: "Montant contractuel. L'employeur prend en charge au moins 50 % de la cotisation.",
  },
  {
    code: 'PREVOYANCE',
    category: 'SANTE',
    label: 'Prévoyance (incapacité, invalidité, décès)',
    assiette: 'none',
    employee: { kind: 'variable' },
    employer: { kind: 'variable' },
  },
  {
    code: 'PREVOYANCE_CADRE',
    category: 'SANTE',
    label: 'Prévoyance cadres — 1,50 % tranche A',
    assiette: 'tranche_1',
    employer: { kind: 'min', rate: 1.5 },
    expected: { statut: 'cadre' },
    note: "Obligation issue de l'ANI : au moins 1,50 % de la tranche A à la charge de l'employeur.",
  },

  // ──────────────────────  ACCIDENT DU TRAVAIL  ─────────────────────
  {
    code: 'ACCIDENT_TRAVAIL',
    category: 'ATMP',
    label: 'Accident du travail / maladies professionnelles',
    assiette: 'brut_total',
    employer: { kind: 'range', min: 0.4, max: 8, typical: 2.0 },
    tolerancePoints: 10,
    expected: {},
    note: "Taux notifié individuellement à l'entreprise par la Carsat, selon son secteur et sa sinistralité.",
  },

  // ─────────────────────────────  RETRAITE  ─────────────────────────
  {
    code: 'VIEILLESSE_PLAFONNEE',
    category: 'RETRAITE',
    label: 'Assurance vieillesse plafonnée',
    assiette: 'tranche_1',
    employee: { kind: 'fixed', rate: 6.9 },
    employer: { kind: 'fixed', rate: 8.55 },
    expected: {},
  },
  {
    code: 'VIEILLESSE_DEPLAFONNEE',
    category: 'RETRAITE',
    label: 'Assurance vieillesse déplafonnée',
    assiette: 'brut_total',
    employee: { kind: 'fixed', rate: 0.4 },
    employer: { kind: 'fixed', rate: 2.11 },
    expected: {},
  },
  {
    code: 'RETRAITE_COMPLEMENTAIRE_T1',
    category: 'RETRAITE',
    label: 'Retraite complémentaire Agirc-Arrco — tranche 1',
    assiette: 'tranche_1',
    employee: { kind: 'fixed', rate: 3.15 },
    employer: { kind: 'fixed', rate: 4.72 },
    expected: {},
  },
  {
    code: 'RETRAITE_COMPLEMENTAIRE_T2',
    category: 'RETRAITE',
    label: 'Retraite complémentaire Agirc-Arrco — tranche 2',
    assiette: 'tranche_2',
    employee: { kind: 'fixed', rate: 8.64 },
    employer: { kind: 'fixed', rate: 12.95 },
    expected: { abovePmssOnly: true },
  },
  {
    code: 'CEG_T1',
    category: 'RETRAITE',
    label: "Contribution d'équilibre général — tranche 1",
    assiette: 'tranche_1',
    employee: { kind: 'fixed', rate: 0.86 },
    employer: { kind: 'fixed', rate: 1.29 },
    expected: {},
  },
  {
    code: 'CEG_T2',
    category: 'RETRAITE',
    label: "Contribution d'équilibre général — tranche 2",
    assiette: 'tranche_2',
    employee: { kind: 'fixed', rate: 1.08 },
    employer: { kind: 'fixed', rate: 1.62 },
    expected: { abovePmssOnly: true },
  },
  {
    code: 'CET',
    category: 'RETRAITE',
    label: "Contribution d'équilibre technique",
    assiette: 'tranche_1_2',
    employee: { kind: 'fixed', rate: 0.14 },
    employer: { kind: 'fixed', rate: 0.21 },
    expected: { abovePmssOnly: true },
    note: 'Due uniquement lorsque la rémunération dépasse le plafond de la Sécurité sociale.',
  },
  {
    code: 'RETRAITE_SUPPLEMENTAIRE',
    category: 'RETRAITE',
    label: 'Retraite supplémentaire (article 83 / PER obligatoire)',
    assiette: 'none',
    employee: { kind: 'variable' },
    employer: { kind: 'variable' },
  },

  // ─────────────────────────────  FAMILLE  ─────────────────────────
  {
    code: 'ALLOCATIONS_FAMILIALES',
    category: 'FAMILLE',
    label: 'Allocations familiales',
    assiette: 'brut_total',
    employer: { kind: 'smic_threshold', low: 3.45, high: 5.25, smicMultiple: 3.5 },
    expected: {},
  },

  // ─────────────────────────────  CHÔMAGE  ─────────────────────────
  {
    code: 'ASSURANCE_CHOMAGE',
    category: 'CHOMAGE',
    label: 'Assurance chômage',
    assiette: 'chomage',
    employee: { kind: 'fixed', rate: 0 },
    employer: { kind: 'fixed', rate: 4.0 },
    expected: {},
    note: 'Part salariale supprimée depuis 2018. Assiette plafonnée à 4 PMSS.',
  },
  {
    code: 'AGS',
    category: 'CHOMAGE',
    label: 'AGS — garantie des salaires',
    assiette: 'chomage',
    employer: { kind: 'fixed', rate: 0.25 },
    tolerancePoints: 0.1,
    expected: {},
  },
  {
    code: 'APEC',
    category: 'CHOMAGE',
    label: 'APEC — cotisation des cadres',
    assiette: 'tranche_AB',
    employee: { kind: 'fixed', rate: 0.024 },
    employer: { kind: 'fixed', rate: 0.036 },
    tolerancePoints: 0.005,
    expected: { statut: 'cadre' },
  },

  // ────────────────────  AUTRES CONTRIBUTIONS EMPLOYEUR  ────────────
  {
    code: 'CSA',
    category: 'AUTRES',
    label: 'Contribution solidarité autonomie',
    assiette: 'brut_total',
    employer: { kind: 'fixed', rate: 0.3 },
    expected: {},
  },
  {
    code: 'FNAL',
    category: 'AUTRES',
    label: 'FNAL — Fonds national d’aide au logement',
    assiette: 'brut_total',
    employer: { kind: 'effectif_threshold', lt50: 0.1, gte50: 0.5 },
    tolerancePoints: 0.02,
    note: 'Employeurs < 50 salariés : 0,10 % sur la tranche 1. À partir de 50 : 0,50 % sur la totalité.',
  },
  {
    code: 'VERSEMENT_MOBILITE',
    category: 'AUTRES',
    label: 'Versement mobilité',
    assiette: 'brut_total',
    employer: { kind: 'range', min: 0, max: 3.2, typical: 1.8 },
    tolerancePoints: 3.2,
    note: 'Taux fixé par la commune / l’intercommunalité. Dû si l’employeur compte au moins 11 salariés dans le ressort.',
  },
  {
    code: 'CONTRIBUTION_DIALOGUE_SOCIAL',
    category: 'AUTRES',
    label: 'Contribution au dialogue social',
    assiette: 'brut_total',
    employer: { kind: 'fixed', rate: 0.016 },
    tolerancePoints: 0.005,
  },
  {
    code: 'FORFAIT_SOCIAL',
    category: 'AUTRES',
    label: 'Forfait social',
    assiette: 'none',
    employer: { kind: 'variable' },
    note: 'Taux de 8 % ou 20 % selon l’assiette (prévoyance, intéressement, abondement…).',
  },
  {
    code: 'REDUCTION_GENERALE',
    category: 'AUTRES',
    label: 'Réduction générale des cotisations patronales',
    assiette: 'none',
    employer: { kind: 'variable' },
    note: 'Allègement dégressif s’annulant à 1,6 SMIC (barème réformé en 2026).',
  },

  // ─────────────────────────────  CSG / CRDS  ──────────────────────
  {
    code: 'CSG_DEDUCTIBLE',
    category: 'CSG_CRDS',
    label: 'CSG déductible de l’impôt sur le revenu',
    assiette: 'csg',
    employee: { kind: 'fixed', rate: 6.8 },
    expected: {},
  },
  {
    code: 'CSG_NON_DEDUCTIBLE',
    category: 'CSG_CRDS',
    label: 'CSG non déductible de l’impôt sur le revenu',
    assiette: 'csg',
    employee: { kind: 'fixed', rate: 2.4 },
  },
  {
    code: 'CRDS',
    category: 'CSG_CRDS',
    label: 'CRDS — contribution au remboursement de la dette sociale',
    assiette: 'csg',
    employee: { kind: 'fixed', rate: 0.5 },
  },
  {
    code: 'CSG_CRDS_NON_DEDUCTIBLE',
    category: 'CSG_CRDS',
    label: 'CSG/CRDS non déductible de l’impôt sur le revenu',
    assiette: 'csg',
    employee: { kind: 'fixed', rate: 2.9 },
    note: 'Regroupe la CSG non déductible (2,40 %) et la CRDS (0,50 %).',
  },
];

const BY_CODE = new Map<string, RateRef>(RATES_2026.map((r) => [r.code, r]));

export function rateByCode(code: string | undefined): RateRef | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/** Tolérance par défaut, en points de %. Les taux salariaux sont exacts ;
 *  on laisse une marge minime pour les arrondis d'affichage. */
export const DEFAULT_RATE_TOLERANCE_POINTS = 0.03;
