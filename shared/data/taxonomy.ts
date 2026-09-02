/**
 * Taxonomie des lignes de cotisation : fait correspondre les libellés très
 * variables des bulletins à un ensemble de codes canoniques stables, sur
 * lesquels s'appuient le référentiel de taux (`rates2026.ts`) et les
 * explications pédagogiques (`explanations.fr.ts`).
 */

import type { ContribCategory, EmployeeStatus, SocialRegime } from '../parsing/model';

export type CanonicalCode =
  // Santé
  | 'MALADIE'
  | 'MALADIE_ALSACE_MOSELLE'
  | 'COMPLEMENTAIRE_SANTE'
  | 'PREVOYANCE'
  | 'PREVOYANCE_CADRE'
  // Accident du travail
  | 'ACCIDENT_TRAVAIL'
  // Retraite
  | 'VIEILLESSE_PLAFONNEE'
  | 'VIEILLESSE_DEPLAFONNEE'
  | 'RETRAITE_COMPLEMENTAIRE_T1'
  | 'RETRAITE_COMPLEMENTAIRE_T2'
  | 'CEG_T1'
  | 'CEG_T2'
  | 'CET'
  | 'RETRAITE_SUPPLEMENTAIRE'
  // Famille
  | 'ALLOCATIONS_FAMILIALES'
  // Chômage
  | 'ASSURANCE_CHOMAGE'
  | 'AGS'
  | 'APEC'
  // Autres contributions employeur
  | 'CSA'
  | 'FNAL'
  | 'VERSEMENT_MOBILITE'
  | 'CONTRIBUTION_DIALOGUE_SOCIAL'
  | 'FORFAIT_SOCIAL'
  | 'REDUCTION_GENERALE'
  // CSG / CRDS
  | 'CSG_DEDUCTIBLE'
  | 'CSG_NON_DEDUCTIBLE'
  | 'CRDS'
  | 'CSG_CRDS_NON_DEDUCTIBLE';

export interface TaxonomyEntry {
  code: CanonicalCode;
  category: ContribCategory;
  /** Libellé court lisible pour l'UI. */
  label: string;
  /** Motifs de reconnaissance appliqués au libellé normalisé (sans accents, minuscules). */
  patterns: RegExp[];
  /** Si présent, la ligne n'a de sens que pour ce statut. */
  onlyStatut?: EmployeeStatus;
  /** Si présent, la ligne n'a de sens que pour ce régime. */
  onlyRegime?: SocialRegime;
  /** Section du bulletin clarifié où on s'attend à trouver la ligne (aide à lever l'ambiguïté). */
  section?: ContribCategory;
}

/** Retire accents, met en minuscules, réduit les espaces. */
export function normalizeLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/['’‘]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ordre = priorité. Les motifs les plus spécifiques d'abord.
 */
export const TAXONOMY: TaxonomyEntry[] = [
  // --- Retraite (base) : « sécurité sociale plafonnée / déplafonnée » = vieillesse
  {
    code: 'VIEILLESSE_DEPLAFONNEE',
    category: 'RETRAITE',
    label: 'Retraite Sécurité sociale (déplafonnée)',
    section: 'RETRAITE',
    patterns: [
      /\bd[ée]plafonn/,
      /vieillesse.*(totalite|deplaf)/,
      /(secu(rite)?|s\.?s\.?|vieillesse|retraite).*non plafonn/,
    ],
  },
  {
    code: 'VIEILLESSE_PLAFONNEE',
    category: 'RETRAITE',
    label: 'Retraite Sécurité sociale (plafonnée)',
    section: 'RETRAITE',
    patterns: [
      /vieillesse.*\bplafonn/,
      /(secu(rite)?|s\.?s\.?).*\bplafonn/,
      /assurance vieillesse (ta|tranche a|plaf)/,
      /retraite.*\bplafonn/,
      /\bplafonn[ée]e?\b/,
    ],
  },
  {
    code: 'RETRAITE_COMPLEMENTAIRE_T1',
    category: 'RETRAITE',
    label: 'Retraite complémentaire (tranche 1)',
    section: 'RETRAITE',
    patterns: [
      /(retraite )?compl(ementaire)?.*(t1|tranche 1|tr\.? *1|tr *a)\b/,
      /agirc.?arrco.*(t1|tranche 1)/,
      /\barrco\b(?!.*(t2|tranche 2))/,
    ],
  },
  {
    code: 'RETRAITE_COMPLEMENTAIRE_T2',
    category: 'RETRAITE',
    label: 'Retraite complémentaire (tranche 2)',
    section: 'RETRAITE',
    patterns: [
      /(retraite )?compl(ementaire)?.*(t2|tranche 2|tr\.? *2|tr *b|tr *c)\b/,
      /agirc.?arrco.*(t2|tranche 2)/,
    ],
  },
  {
    code: 'CEG_T1',
    category: 'RETRAITE',
    label: "Contribution d'équilibre général (T1)",
    section: 'RETRAITE',
    patterns: [/c\.?e\.?g\.?.*(t1|tranche 1|tr *1|tr *a)/, /equilibre general.*(t1|tranche 1|1)/, /\bceg\b.*1/],
  },
  {
    code: 'CEG_T2',
    category: 'RETRAITE',
    label: "Contribution d'équilibre général (T2)",
    section: 'RETRAITE',
    patterns: [/c\.?e\.?g\.?.*(t2|tranche 2|tr *2|tr *b)/, /equilibre general.*(t2|tranche 2|2)/, /\bceg\b.*2/],
  },
  {
    code: 'CET',
    category: 'RETRAITE',
    label: "Contribution d'équilibre technique",
    section: 'RETRAITE',
    patterns: [/c\.?e\.?t\.?\b/, /equilibre technique/, /\bcet\b/],
  },
  {
    code: 'RETRAITE_SUPPLEMENTAIRE',
    category: 'RETRAITE',
    label: 'Retraite supplémentaire',
    section: 'RETRAITE',
    patterns: [/retraite suppl/, /art(icle)? ?83/, /per ?(ob|entreprise|collectif)/, /sur.?complementaire/],
  },

  // --- Santé
  {
    code: 'MALADIE_ALSACE_MOSELLE',
    category: 'SANTE',
    label: 'Cotisation maladie Alsace-Moselle',
    section: 'SANTE',
    onlyRegime: 'alsace-moselle',
    patterns: [/alsace.?moselle/, /maladie.*(supplementaire|regime local)/, /regime local/],
  },
  {
    code: 'COMPLEMENTAIRE_SANTE',
    category: 'SANTE',
    label: 'Complémentaire santé (mutuelle)',
    section: 'SANTE',
    patterns: [/complementaire sante/, /mutuelle/, /frais de sante/, /\bcompl\.? sante/],
  },
  {
    code: 'PREVOYANCE_CADRE',
    category: 'SANTE',
    label: 'Prévoyance cadres (1,50 % TA)',
    section: 'SANTE',
    onlyStatut: 'cadre',
    patterns: [/prevoyance.*(cadre|1[.,]50|tranche a|ta\b)/, /1[.,]50 *% *(ta|tranche a)/],
  },
  {
    code: 'PREVOYANCE',
    category: 'SANTE',
    label: 'Prévoyance',
    section: 'SANTE',
    patterns: [/prevoyance/, /incapacite.*invalidite/, /deces.*invalidite/, /garantie deces/],
  },
  {
    code: 'MALADIE',
    category: 'SANTE',
    label: 'Sécurité sociale - Maladie Maternité Invalidité Décès',
    section: 'SANTE',
    patterns: [
      /maladie.?maternite/,
      /maladie maternite invalidite deces/,
      /(secu(rite)?|s\.?s\.?).*maladie/,
      /^maladie\b/,
      /assurance maladie/,
    ],
  },

  // --- Accident du travail
  {
    code: 'ACCIDENT_TRAVAIL',
    category: 'ATMP',
    label: 'Accident du travail / maladies professionnelles',
    section: 'ATMP',
    patterns: [/accident.*travail/, /\bat.?mp\b/, /at\/mp/, /maladies professionnelles/, /risque at/],
  },

  // --- Famille
  {
    code: 'ALLOCATIONS_FAMILIALES',
    category: 'FAMILLE',
    label: 'Allocations familiales',
    section: 'FAMILLE',
    patterns: [/alloc.*famil/, /\baf\b/, /prestations familiales/],
  },

  // --- Chômage
  {
    code: 'APEC',
    category: 'CHOMAGE',
    label: 'APEC (cadres)',
    section: 'CHOMAGE',
    onlyStatut: 'cadre',
    patterns: [/\bapec\b/, /association pour l emploi des cadres/],
  },
  {
    code: 'AGS',
    category: 'CHOMAGE',
    label: 'AGS (garantie des salaires)',
    section: 'CHOMAGE',
    patterns: [/\bags\b/, /garantie des salaires/, /fngs/, /assurance garantie/],
  },
  {
    code: 'ASSURANCE_CHOMAGE',
    category: 'CHOMAGE',
    label: 'Assurance chômage',
    section: 'CHOMAGE',
    patterns: [/chomage/, /assurance chomage/, /pole emploi/, /france travail/, /unedic/],
  },

  // --- Autres contributions employeur
  {
    code: 'REDUCTION_GENERALE',
    category: 'AUTRES',
    label: 'Réduction générale des cotisations patronales',
    section: 'AUTRES',
    patterns: [/reduction generale/, /reduction fillon/, /allegement general/, /reduction cotisations/],
  },
  {
    code: 'CSA',
    category: 'AUTRES',
    label: 'Contribution solidarité autonomie',
    section: 'AUTRES',
    patterns: [/solidarite autonomie/, /\bcsa\b/, /contribution autonomie/],
  },
  {
    code: 'FNAL',
    category: 'AUTRES',
    label: 'FNAL (aide au logement)',
    section: 'AUTRES',
    patterns: [/\bfnal\b/, /fonds national d aide au logement/, /aide au logement/],
  },
  {
    code: 'VERSEMENT_MOBILITE',
    category: 'AUTRES',
    label: 'Versement mobilité (transport)',
    section: 'AUTRES',
    patterns: [/versement (mobilite|transport)/, /\bvm\b transport/, /transport/],
  },
  {
    code: 'CONTRIBUTION_DIALOGUE_SOCIAL',
    category: 'AUTRES',
    label: 'Contribution au dialogue social',
    section: 'AUTRES',
    patterns: [/dialogue social/],
  },
  {
    code: 'FORFAIT_SOCIAL',
    category: 'AUTRES',
    label: 'Forfait social',
    section: 'AUTRES',
    patterns: [/forfait social/],
  },

  // --- CSG / CRDS
  {
    code: 'CSG_DEDUCTIBLE',
    category: 'CSG_CRDS',
    label: 'CSG déductible de l’impôt',
    section: 'CSG_CRDS',
    patterns: [/csg deductible/, /csg ded\b/, /c\.s\.g\. deductible/],
  },
  {
    code: 'CSG_CRDS_NON_DEDUCTIBLE',
    category: 'CSG_CRDS',
    label: 'CSG/CRDS non déductible de l’impôt',
    section: 'CSG_CRDS',
    patterns: [/csg.?crds non deductible/, /csg \/ crds non ded/, /csg et crds non ded/],
  },
  {
    code: 'CSG_NON_DEDUCTIBLE',
    category: 'CSG_CRDS',
    label: 'CSG non déductible de l’impôt',
    section: 'CSG_CRDS',
    patterns: [/csg non deductible/, /csg non ded\b/],
  },
  {
    code: 'CRDS',
    category: 'CSG_CRDS',
    label: 'CRDS',
    section: 'CSG_CRDS',
    patterns: [/\bcrds\b/, /remboursement de la dette sociale/],
  },
];

const BY_CODE = new Map<string, TaxonomyEntry>(TAXONOMY.map((e) => [e.code, e]));

export function taxonomyByCode(code: string | undefined): TaxonomyEntry | undefined {
  return code ? BY_CODE.get(code) : undefined;
}

/**
 * Identifie une ligne à partir de son libellé et, si connue, de la section
 * du bulletin où elle apparaît (les libellés « sécurité sociale » sont sinon
 * ambigus entre SANTÉ et RETRAITE).
 */
export function matchCanonical(
  rawLabel: string,
  ctx?: { section?: ContribCategory; statut?: EmployeeStatus; regime?: SocialRegime },
): TaxonomyEntry | undefined {
  const label = normalizeLabel(rawLabel);
  if (!label) return undefined;

  const candidates = TAXONOMY.filter((e) => e.patterns.some((re) => re.test(label)));
  if (candidates.length === 0) return undefined;

  const scored = candidates.map((e) => {
    let score = 0;
    if (ctx?.section && e.section === ctx.section) score += 3;
    if (ctx?.section && e.section && e.section !== ctx.section) score -= 2;
    if (e.onlyStatut && ctx?.statut && e.onlyStatut !== ctx.statut) score -= 5;
    if (e.onlyRegime && ctx?.regime && e.onlyRegime !== ctx.regime) score -= 5;
    // priorité de déclaration (plus haut dans la liste = plus spécifique)
    score += (TAXONOMY.length - TAXONOMY.indexOf(e)) * 0.01;
    return { e, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > -3 ? scored[0].e : undefined;
}
