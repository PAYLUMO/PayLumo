/**
 * Repères de salaire — secteur privé, **net mensuel avant impôt sur le revenu**
 * (net de cotisations, CSG et CRDS ; c'est la définition INSEE du « salaire net »),
 * en équivalent temps plein (EQTP), millésime 2023. À réactualiser chaque année.
 *
 * Sources INSEE :
 * - « Les salaires dans le secteur privé en 2023 » (Insee Première n° 2020) —
 *   insee.fr/fr/statistiques/8270416
 * - Salaires selon le sexe, l'âge et la CSP — insee.fr/fr/statistiques/2021266
 * - Disparités régionales — insee.fr/fr/statistiques/7767105
 *
 * DONNÉES INSEE (telles quelles) :
 *   NATIONAL (D1/médiane/moyenne/D9), moyennes par CSP (en commentaire),
 *   bornes par âge, écart femmes-hommes.
 *
 * DÉRIVÉ / ESTIMÉ par PayLumo à partir de ces données INSEE :
 *   CSP_MEDIAN (moyenne × ratio médiane/moyenne), METIERS[].medianNet (l'INSEE
 *   ne publie pas de médiane libre par métier — valeurs prudentes recoupées avec
 *   des observatoires de branche), REGIONS[].coef, AGE_BANDS[].coef, SEXE_COEF.
 *   Le comparateur les combine multiplicativement → ESTIMATION, à prendre comme
 *   un ordre de grandeur.
 */

export const INSEE_YEAR = 2023;

/** Distribution nationale du salaire net mensuel EQTP, avant impôt (privé, 2023). */
export const NATIONAL = {
  d1: 1512,
  median: 2183,
  mean: 2735,
  d9: 4302,
} as const;

export type Csp = 'cadre' | 'intermediaire' | 'employe' | 'ouvrier';

/** Interne — sert au repli « Autre » et à la borne basse ; non affiché tel quel. */
export const CSP_MEDIAN: Record<Csp, number> = {
  // moyennes INSEE 2023 : 4 573 / 2 656 / 1 959 / 2 031 — on prend la médiane,
  // nettement plus basse (distributions étirées vers le haut).
  cadre: 3400,
  intermediaire: 2100,
  employe: 1720,
  ouvrier: 1830,
};

export interface Metier {
  id: string;
  label: string;
  csp: Csp;
  /** médiane net mensuel EQTP avant impôt, national, tous âges (estimation prudente). */
  medianNet: number;
}

/** Liste à plat : la classification cadre/ETAM/ouvrier varie selon l'entreprise. */
export const METIERS: Metier[] = [
  { id: 'ingenieur', label: 'Ingénieur / cadre technique', csp: 'cadre', medianNet: 3450 },
  { id: 'dev', label: 'Développeur / ingénieur informatique', csp: 'cadre', medianNet: 3050 },
  { id: 'chef-projet', label: 'Chef de projet', csp: 'cadre', medianNet: 3100 },
  { id: 'data', label: 'Data analyst / data scientist', csp: 'cadre', medianNet: 3200 },
  { id: 'cadre-commercial', label: 'Responsable commercial / business developer', csp: 'cadre', medianNet: 3100 },
  { id: 'consultant', label: 'Consultant', csp: 'cadre', medianNet: 3150 },
  { id: 'cadre-finance', label: 'Responsable finance / contrôle de gestion', csp: 'cadre', medianNet: 3500 },
  { id: 'expert-comptable', label: 'Expert-comptable / auditeur', csp: 'cadre', medianNet: 3350 },
  { id: 'cadre-marketing', label: 'Responsable marketing / communication', csp: 'cadre', medianNet: 3000 },
  { id: 'cadre-rh', label: 'Responsable ressources humaines', csp: 'cadre', medianNet: 3050 },
  { id: 'cadre-juridique', label: 'Juriste d’entreprise / avocat salarié', csp: 'cadre', medianNet: 3250 },
  { id: 'architecte', label: 'Architecte', csp: 'cadre', medianNet: 2800 },
  { id: 'medecin', label: 'Médecin salarié (privé)', csp: 'cadre', medianNet: 4800 },
  { id: 'pharmacien', label: 'Pharmacien salarié', csp: 'cadre', medianNet: 2900 },
  { id: 'directeur', label: 'Directeur / dirigeant salarié', csp: 'cadre', medianNet: 5000 },
  { id: 'chercheur', label: 'Chercheur / ingénieur R&D', csp: 'cadre', medianNet: 2950 },

  { id: 'technicien', label: 'Technicien (industrie / maintenance)', csp: 'intermediaire', medianNet: 2000 },
  { id: 'tech-info', label: 'Technicien informatique / support', csp: 'intermediaire', medianNet: 1950 },
  { id: 'comptable', label: 'Comptable', csp: 'intermediaire', medianNet: 2100 },
  { id: 'gestionnaire-paie', label: 'Gestionnaire de paie', csp: 'intermediaire', medianNet: 2000 },
  { id: 'assistant-rh', label: 'Assistant / chargé RH', csp: 'intermediaire', medianNet: 1950 },
  { id: 'commercial', label: 'Commercial / technico-commercial', csp: 'intermediaire', medianNet: 2050 },
  { id: 'chef-equipe', label: 'Chef d’équipe / contremaître', csp: 'intermediaire', medianNet: 2200 },
  { id: 'infirmier', label: 'Infirmier (privé)', csp: 'intermediaire', medianNet: 2100 },
  { id: 'kine', label: 'Masseur-kinésithérapeute salarié', csp: 'intermediaire', medianNet: 2050 },
  { id: 'educateur', label: 'Éducateur spécialisé / travailleur social', csp: 'intermediaire', medianNet: 1950 },
  { id: 'agent-maitrise', label: 'Agent de maîtrise', csp: 'intermediaire', medianNet: 2200 },
  { id: 'dessinateur', label: 'Dessinateur / projeteur', csp: 'intermediaire', medianNet: 2000 },
  { id: 'journaliste', label: 'Journaliste', csp: 'intermediaire', medianNet: 2250 },
  { id: 'enseignant-prive', label: 'Enseignant / formateur (privé)', csp: 'intermediaire', medianNet: 2150 },
  { id: 'chef-de-rayon', label: 'Chef de rayon / manager de proximité', csp: 'intermediaire', medianNet: 2000 },
  { id: 'assistant-social', label: 'Assistant de service social', csp: 'intermediaire', medianNet: 1950 },

  { id: 'assistant-admin', label: 'Assistant administratif / secrétaire', csp: 'employe', medianNet: 1750 },
  { id: 'employe-compta', label: 'Employé de comptabilité', csp: 'employe', medianNet: 1780 },
  { id: 'accueil', label: 'Agent d’accueil / standardiste', csp: 'employe', medianNet: 1650 },
  { id: 'vendeur', label: 'Vendeur / conseiller de vente', csp: 'employe', medianNet: 1650 },
  { id: 'caissier', label: 'Hôte / hôtesse de caisse', csp: 'employe', medianNet: 1600 },
  { id: 'employe-banque', label: 'Chargé de clientèle banque / assurance', csp: 'employe', medianNet: 1950 },
  { id: 'aide-soignant', label: 'Aide-soignant', csp: 'employe', medianNet: 1700 },
  { id: 'auxiliaire-puericulture', label: 'Auxiliaire de puériculture', csp: 'employe', medianNet: 1650 },
  { id: 'agent-entretien', label: 'Agent d’entretien / de propreté', csp: 'employe', medianNet: 1550 },
  { id: 'serveur', label: 'Serveur / employé de restauration', csp: 'employe', medianNet: 1600 },
  { id: 'agent-securite', label: 'Agent de sécurité', csp: 'employe', medianNet: 1700 },
  { id: 'teleconseiller', label: 'Téléconseiller / conseiller relation client', csp: 'employe', medianNet: 1650 },
  { id: 'preparateur-commandes', label: 'Préparateur de commandes / agent logistique', csp: 'employe', medianNet: 1650 },
  { id: 'coiffeur', label: 'Coiffeur / esthéticien', csp: 'employe', medianNet: 1550 },
  { id: 'assistant-maternel', label: 'Assistant maternel / garde d’enfants', csp: 'employe', medianNet: 1500 },

  { id: 'ouvrier-qualifie', label: 'Ouvrier qualifié de l’industrie', csp: 'ouvrier', medianNet: 1900 },
  { id: 'operateur', label: 'Opérateur / conducteur de ligne', csp: 'ouvrier', medianNet: 1800 },
  { id: 'mecanicien', label: 'Mécanicien (auto / industrie)', csp: 'ouvrier', medianNet: 1850 },
  { id: 'electricien', label: 'Électricien', csp: 'ouvrier', medianNet: 1950 },
  { id: 'plombier', label: 'Plombier / chauffagiste', csp: 'ouvrier', medianNet: 1900 },
  { id: 'menuisier', label: 'Menuisier / charpentier', csp: 'ouvrier', medianNet: 1850 },
  { id: 'macon', label: 'Maçon', csp: 'ouvrier', medianNet: 1850 },
  { id: 'peintre', label: 'Peintre en bâtiment', csp: 'ouvrier', medianNet: 1750 },
  { id: 'chauffeur-pl', label: 'Conducteur routier / chauffeur poids lourd', csp: 'ouvrier', medianNet: 1950 },
  { id: 'chauffeur-livreur', label: 'Chauffeur-livreur (véhicule léger)', csp: 'ouvrier', medianNet: 1650 },
  { id: 'soudeur', label: 'Soudeur / chaudronnier', csp: 'ouvrier', medianNet: 1950 },
  { id: 'cariste', label: 'Cariste / manutentionnaire', csp: 'ouvrier', medianNet: 1700 },
  { id: 'ouvrier-agricole', label: 'Ouvrier agricole', csp: 'ouvrier', medianNet: 1600 },
  { id: 'boulanger', label: 'Boulanger / pâtissier', csp: 'ouvrier', medianNet: 1700 },
  { id: 'boucher', label: 'Boucher / charcutier', csp: 'ouvrier', medianNet: 1800 },
  { id: 'cuisinier', label: 'Cuisinier', csp: 'ouvrier', medianNet: 1800 },

  // Repli « je ne trouve pas mon métier » — décrit par la nature du poste.
  { id: 'autre-cadre', label: 'Autre — encadrement, ingénierie, expertise', csp: 'cadre', medianNet: CSP_MEDIAN.cadre },
  { id: 'autre-intermediaire', label: 'Autre — technique, gestion, coordination', csp: 'intermediaire', medianNet: CSP_MEDIAN.intermediaire },
  { id: 'autre-employe', label: 'Autre — administratif, commerce, services', csp: 'employe', medianNet: CSP_MEDIAN.employe },
  { id: 'autre-ouvrier', label: 'Autre — production, artisanat, logistique', csp: 'ouvrier', medianNet: CSP_MEDIAN.ouvrier },
];

/** Métiers triés pour l'affichage : ordre alphabétique, « Autre » à la fin. */
export const METIERS_SORTED = [...METIERS].sort((a, b) => {
  const aAutre = a.id.startsWith('autre-');
  const bAutre = b.id.startsWith('autre-');
  if (aAutre !== bAutre) return aAutre ? 1 : -1;
  return a.label.localeCompare(b.label, 'fr');
});

export const METIER_BY_ID = new Map(METIERS.map((m) => [m.id, m]));

export interface Region {
  code: string;
  label: string;
  coef: number;
}

export const REGIONS: Region[] = [
  { code: 'IDF', label: 'Île-de-France', coef: 1.22 },
  { code: 'ARA', label: 'Auvergne-Rhône-Alpes', coef: 0.98 },
  { code: 'PAC', label: "Provence-Alpes-Côte d'Azur", coef: 0.96 },
  { code: 'GES', label: 'Grand Est', coef: 0.92 },
  { code: 'HDF', label: 'Hauts-de-France', coef: 0.91 },
  { code: 'OCC', label: 'Occitanie', coef: 0.91 },
  { code: 'NAQ', label: 'Nouvelle-Aquitaine', coef: 0.9 },
  { code: 'PDL', label: 'Pays de la Loire', coef: 0.92 },
  { code: 'BRE', label: 'Bretagne', coef: 0.9 },
  { code: 'NOR', label: 'Normandie', coef: 0.91 },
  { code: 'CVL', label: 'Centre-Val de Loire', coef: 0.92 },
  { code: 'BFC', label: 'Bourgogne-Franche-Comté', coef: 0.89 },
  { code: 'COR', label: 'Corse', coef: 0.87 },
  { code: 'GUA', label: 'Guadeloupe', coef: 0.89 },
  { code: 'MTQ', label: 'Martinique', coef: 0.89 },
  { code: 'GUF', label: 'Guyane', coef: 0.9 },
  { code: 'REU', label: 'La Réunion', coef: 0.87 },
  { code: 'MAY', label: 'Mayotte', coef: 0.84 },
];

export const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));

export interface AgeBand {
  id: string;
  label: string;
  coef: number;
}

export const AGE_BANDS: AgeBand[] = [
  { id: 'lt25', label: 'Moins de 25 ans', coef: 0.75 },
  { id: '25-29', label: '25 à 29 ans', coef: 0.87 },
  { id: '30-39', label: '30 à 39 ans', coef: 1.0 },
  { id: '40-49', label: '40 à 49 ans', coef: 1.12 },
  { id: '50plus', label: '50 ans et plus', coef: 1.16 },
];

export const AGE_BY_ID = new Map(AGE_BANDS.map((a) => [a.id, a]));

export type Sexe = 'femme' | 'homme' | 'nd';

/** Coefficient EQTP (l'écart « à poste comparable » est plus faible, ~4 %). */
export const SEXE_COEF: Record<Sexe, number> = {
  femme: 0.93,
  homme: 1.04,
  nd: 1.0,
};

/** Écart salarial femmes-hommes constaté par l'INSEE (secteur privé, EQTP, 2023). */
export const SEXE_GAP_EQTP = 0.142;
/** Écart résiduel « à profil et poste comparables ». */
export const SEXE_GAP_COMPARABLE = 0.04;
