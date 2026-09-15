/**
 * Référentiel des conventions collectives nationales (CCN) les plus courantes,
 * pour affiner le contexte de l'analyse (secteur) et nommer explicitement la
 * convention dans les explications.
 *
 * ⚠️ Liste NON EXHAUSTIVE (~40 CCN parmi les plus fréquentes en France sur
 * ~700 actives) et À VÉRIFIER avant diffusion publique — comme le barème 2026
 * (voir `rates2026.ts`). Le code IDCC n'est renseigné que pour les conventions
 * où il est connu avec certitude ; ailleurs il vaut `null` plutôt que d'afficher
 * un numéro non fiable. Sources à consulter pour compléter/vérifier :
 * legifrance.gouv.fr (recherche « IDCC ») et index.travail-emploi.gouv.fr.
 *
 * PayLumo ne modifie AUCUN taux en fonction de la convention choisie — voir
 * `shared/analysis/checks/*`. Elle sert uniquement à nommer explicitement la
 * convention dans les explications (et, pour le BTP, à rappeler l'existence de
 * l'abattement pour frais professionnels comme piste d'explication possible).
 */

export interface Convention {
  /** code IDCC (Identifiant de Convention Collective), ou `null` si non confirmé. */
  idcc: number | null;
  label: string;
  /** jetons de recherche additionnels (secteur, sigle) pour l'auto-détection. */
  keywords?: string[];
}

export const CONVENTIONS: Convention[] = [
  { idcc: 1486, label: 'Syntec — bureaux d’études techniques, ingénierie, conseil', keywords: ['syntec', 'esn', 'ssii'] },
  { idcc: 3248, label: 'Métallurgie', keywords: ['metallurgie'] },
  { idcc: 1979, label: 'Hôtels, cafés, restaurants (HCR)', keywords: ['hcr', 'hotellerie', 'restauration traditionnelle'] },
  { idcc: null, label: 'Bâtiment — ouvriers', keywords: ['batiment ouvriers', 'btp ouvriers'] },
  { idcc: null, label: 'Bâtiment — ETAM', keywords: ['batiment etam'] },
  { idcc: null, label: 'Bâtiment — ingénieurs, cadres', keywords: ['batiment cadres', 'batiment ingenieurs'] },
  { idcc: null, label: 'Travaux publics', keywords: ['travaux publics', 'tp ouvriers'] },
  { idcc: null, label: 'Commerce de détail et de gros à prédominance alimentaire', keywords: ['commerce alimentaire', 'grande distribution', 'supermarche'] },
  { idcc: null, label: 'Commerce de détail non alimentaire', keywords: ['commerce non alimentaire', 'habillement commerce'] },
  { idcc: null, label: 'Commerces de gros', keywords: ['commerce de gros', 'negoce'] },
  { idcc: null, label: 'Transport routier de marchandises et activités auxiliaires', keywords: ['transport routier', 'transport marchandises'] },
  { idcc: null, label: 'Services de l’automobile', keywords: ['automobile services', 'garage', 'concession auto'] },
  { idcc: null, label: 'Coiffure et professions connexes', keywords: ['coiffure', 'esthetique'] },
  { idcc: null, label: 'Pharmacies d’officine', keywords: ['pharmacie officine'] },
  { idcc: null, label: 'Industrie pharmaceutique', keywords: ['industrie pharmaceutique'] },
  { idcc: null, label: 'Banque', keywords: ['banque afb'] },
  { idcc: null, label: 'Sociétés d’assurances', keywords: ['assurance societes'] },
  { idcc: null, label: 'Mutualité', keywords: ['mutualite'] },
  { idcc: null, label: 'Immobilier (administration de biens, syndics, agences)', keywords: ['immobilier', 'syndic', 'agence immobiliere'] },
  { idcc: null, label: 'Notariat', keywords: ['notariat', 'office notarial'] },
  { idcc: null, label: 'Cabinets d’experts-comptables et de commissaires aux comptes', keywords: ['expert comptable', 'commissaire aux comptes'] },
  { idcc: null, label: 'Cabinets d’avocats (personnel salarié)', keywords: ['cabinet avocat', 'avocat salarie'] },
  { idcc: null, label: 'Publicité', keywords: ['publicite agence'] },
  { idcc: null, label: 'Presse — journalistes et employés', keywords: ['presse journaliste', 'edition presse'] },
  { idcc: null, label: 'Propreté et services associés', keywords: ['proprete', 'nettoyage industriel'] },
  { idcc: null, label: 'Prévention et sécurité privée', keywords: ['securite privee', 'gardiennage', 'surveillance'] },
  { idcc: null, label: 'Aide, accompagnement, soins et services à domicile (BAD)', keywords: ['aide a domicile', 'services a la personne'] },
  { idcc: null, label: 'Hospitalisation privée (FHP)', keywords: ['hospitalisation privee', 'clinique'] },
  { idcc: null, label: 'Sport', keywords: ['sport', 'salle de sport', 'club sportif'] },
  { idcc: null, label: 'Animation', keywords: ['animation socioculturelle'] },
  { idcc: null, label: 'Restauration rapide', keywords: ['restauration rapide', 'fast food'] },
  { idcc: null, label: 'Restauration collective', keywords: ['restauration collective', 'cantine'] },
  { idcc: null, label: 'Industries chimiques', keywords: ['industrie chimique'] },
  { idcc: null, label: 'Télécommunications', keywords: ['telecommunications', 'telecom'] },
  { idcc: null, label: 'Plasturgie', keywords: ['plasturgie'] },
  { idcc: null, label: 'Textile', keywords: ['textile industrie'] },
  { idcc: null, label: 'Ameublement (fabrication et commerce)', keywords: ['ameublement'] },
  { idcc: null, label: 'Boulangerie-pâtisserie (artisanale)', keywords: ['boulangerie patisserie artisanale'] },
  { idcc: null, label: 'Boulangerie-pâtisserie (industrielle)', keywords: ['boulangerie patisserie industrielle'] },
  { idcc: null, label: 'Prêt-à-porter féminin, couture', keywords: ['pret a porter', 'couture'] },
];

/** normalise : minuscules, sans accents, ponctuation → espace. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findConventionByIdcc(idcc: number): Convention | undefined {
  return CONVENTIONS.find((c) => c.idcc === idcc);
}

/**
 * Beaucoup de conventions du référentiel n'ont pas de code IDCC confirmé
 * (`idcc: null`) : le libellé exact est donc l'identifiant utilisé pour la
 * sélection manuelle (liste déroulante), plutôt que le code IDCC.
 */
export function findConventionByLabel(label: string): Convention | undefined {
  return CONVENTIONS.find((c) => c.label === label);
}

export type ConventionMatchKind = 'idcc' | 'name' | 'idcc-unknown';

export interface ConventionMatch {
  idcc: number | null;
  label: string;
  kind: ConventionMatchKind;
}

/**
 * Détecte une convention à partir d'un texte libre (ex. le champ
 * `employer.convention` lu sur le bulletin) : d'abord par numéro IDCC explicite,
 * sinon par mots-clés. Ne renvoie rien si le texte est vide ou trop générique.
 */
export function detectConvention(text: string | null | undefined): ConventionMatch | undefined {
  if (!text || !text.trim()) return undefined;

  const idccNum = text.match(/\bidcc\b\D{0,10}(\d{3,4})\b/i)?.[1];
  if (idccNum) {
    const n = Number(idccNum);
    const known = findConventionByIdcc(n);
    if (known) return { idcc: n, label: known.label, kind: 'idcc' };
    return { idcc: n, label: text.trim(), kind: 'idcc-unknown' };
  }

  const n = norm(text);
  for (const c of CONVENTIONS) {
    const tokens = [norm(c.label), ...(c.keywords ?? []).map(norm)];
    if (tokens.some((t) => t.length > 3 && n.includes(t))) {
      return { idcc: c.idcc, label: c.label, kind: 'name' };
    }
  }
  return undefined;
}

/** true si la convention (choisie ou détectée) relève du bâtiment / BTP. */
export function isBatimentTP(label: string | null | undefined): boolean {
  if (!label) return false;
  return /b[aâ]timent|\bbtp\b|travaux publics/i.test(label);
}
