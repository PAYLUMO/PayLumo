/**
 * Repères de salaire — secteur privé, net mensuel en équivalent temps plein
 * (EQTP), millésime 2023 (Insee Première n° 2020, édition 2024).
 *
 * ⚠️ Estimations agrégées, à réactualiser chaque année. Sources :
 * - insee.fr/fr/statistiques/8270416 (Les salaires dans le secteur privé en 2023)
 * - insee.fr/fr/statistiques/2021266 (par sexe, âge et CSP)
 * - Disparités régionales : insee.fr/fr/statistiques/7767105
 *
 * Le comparateur combine ces marges (métier × région × âge × sexe) de façon
 * multiplicative : c'est une ESTIMATION, pas une valeur de marché individuelle.
 */

export const INSEE_YEAR = 2023;

/** Distribution nationale du salaire net mensuel EQTP (privé, 2023). */
export const NATIONAL = {
  d1: 1512,
  median: 2183,
  mean: 2735,
  d9: 4302,
} as const;

export type Csp = 'cadre' | 'intermediaire' | 'employe' | 'ouvrier';

export const CSP_LABEL: Record<Csp, string> = {
  cadre: 'Cadre',
  intermediaire: 'Profession intermédiaire',
  employe: 'Employé',
  ouvrier: 'Ouvrier',
};

/** Médiane net mensuel EQTP par CSP (≈ moyenne INSEE × ratio médiane/moyenne). */
export const CSP_MEDIAN: Record<Csp, number> = {
  cadre: 3850,
  intermediaire: 2450,
  employe: 1800,
  ouvrier: 1950,
};

export interface Metier {
  id: string;
  label: string;
  csp: Csp;
  /** médiane net mensuel EQTP, national, tous âges (estimation). */
  medianNet: number;
}

export const METIERS: Metier[] = [
  // ── Cadres ────────────────────────────────────────────────────────────
  { id: 'ingenieur', label: 'Ingénieur / cadre technique', csp: 'cadre', medianNet: 3900 },
  { id: 'dev', label: 'Développeur / ingénieur informatique', csp: 'cadre', medianNet: 3400 },
  { id: 'chef-projet', label: 'Chef de projet', csp: 'cadre', medianNet: 3500 },
  { id: 'data', label: 'Data analyst / scientist', csp: 'cadre', medianNet: 3600 },
  { id: 'cadre-commercial', label: 'Cadre commercial / business developer', csp: 'cadre', medianNet: 3700 },
  { id: 'consultant', label: 'Consultant', csp: 'cadre', medianNet: 3600 },
  { id: 'cadre-finance', label: 'Cadre finance / contrôle de gestion', csp: 'cadre', medianNet: 4000 },
  { id: 'expert-comptable', label: 'Expert-comptable / auditeur', csp: 'cadre', medianNet: 3800 },
  { id: 'cadre-marketing', label: 'Cadre marketing / communication', csp: 'cadre', medianNet: 3400 },
  { id: 'cadre-rh', label: 'Cadre / responsable ressources humaines', csp: 'cadre', medianNet: 3500 },
  { id: 'cadre-juridique', label: 'Juriste d’entreprise / avocat salarié', csp: 'cadre', medianNet: 3700 },
  { id: 'architecte', label: 'Architecte', csp: 'cadre', medianNet: 3200 },
  { id: 'medecin', label: 'Médecin salarié (privé)', csp: 'cadre', medianNet: 5200 },
  { id: 'pharmacien', label: 'Pharmacien salarié', csp: 'cadre', medianNet: 3200 },
  { id: 'cadre-sante', label: 'Cadre de santé', csp: 'cadre', medianNet: 3200 },
  { id: 'directeur', label: 'Directeur / dirigeant salarié', csp: 'cadre', medianNet: 5500 },
  { id: 'enseignant-prive', label: 'Enseignant / formateur (privé)', csp: 'cadre', medianNet: 2500 },
  { id: 'chercheur', label: 'Chercheur / R&D', csp: 'cadre', medianNet: 3300 },

  // ── Professions intermédiaires ───────────────────────────────────────
  { id: 'technicien', label: 'Technicien (industrie / maintenance)', csp: 'intermediaire', medianNet: 2300 },
  { id: 'tech-info', label: 'Technicien informatique / support', csp: 'intermediaire', medianNet: 2200 },
  { id: 'comptable', label: 'Comptable', csp: 'intermediaire', medianNet: 2400 },
  { id: 'gestionnaire-paie', label: 'Gestionnaire de paie', csp: 'intermediaire', medianNet: 2350 },
  { id: 'assistant-rh', label: 'Assistant / chargé RH', csp: 'intermediaire', medianNet: 2200 },
  { id: 'commercial', label: 'Commercial / attaché commercial', csp: 'intermediaire', medianNet: 2500 },
  { id: 'chef-equipe', label: 'Chef d’équipe / contremaître', csp: 'intermediaire', medianNet: 2600 },
  { id: 'infirmier', label: 'Infirmier (privé)', csp: 'intermediaire', medianNet: 2350 },
  { id: 'kine', label: 'Masseur-kinésithérapeute salarié', csp: 'intermediaire', medianNet: 2250 },
  { id: 'educateur', label: 'Éducateur spécialisé / travailleur social', csp: 'intermediaire', medianNet: 2050 },
  { id: 'agent-maitrise', label: 'Agent de maîtrise', csp: 'intermediaire', medianNet: 2550 },
  { id: 'dessinateur', label: 'Dessinateur / projeteur', csp: 'intermediaire', medianNet: 2300 },
  { id: 'journaliste', label: 'Journaliste', csp: 'intermediaire', medianNet: 2600 },
  { id: 'chef-de-rayon', label: 'Chef de rayon / manager de proximité', csp: 'intermediaire', medianNet: 2300 },
  { id: 'assistant-social', label: 'Assistant de service social', csp: 'intermediaire', medianNet: 2100 },

  // ── Employés ─────────────────────────────────────────────────────────
  { id: 'assistant-admin', label: 'Assistant administratif / secrétaire', csp: 'employe', medianNet: 1850 },
  { id: 'employe-compta', label: 'Employé de comptabilité', csp: 'employe', medianNet: 1900 },
  { id: 'accueil', label: 'Agent d’accueil / standardiste', csp: 'employe', medianNet: 1750 },
  { id: 'vendeur', label: 'Vendeur / conseiller de vente', csp: 'employe', medianNet: 1700 },
  { id: 'caissier', label: 'Hôte / hôtesse de caisse', csp: 'employe', medianNet: 1650 },
  { id: 'employe-banque', label: 'Chargé de clientèle banque / assurance', csp: 'employe', medianNet: 2150 },
  { id: 'aide-soignant', label: 'Aide-soignant', csp: 'employe', medianNet: 1750 },
  { id: 'auxiliaire-puericulture', label: 'Auxiliaire de puériculture', csp: 'employe', medianNet: 1700 },
  { id: 'agent-entretien', label: 'Agent d’entretien / de propreté', csp: 'employe', medianNet: 1600 },
  { id: 'serveur', label: 'Serveur / employé de restauration', csp: 'employe', medianNet: 1650 },
  { id: 'agent-securite', label: 'Agent de sécurité', csp: 'employe', medianNet: 1800 },
  { id: 'teleconseiller', label: 'Téléconseiller / conseiller relation client', csp: 'employe', medianNet: 1750 },
  { id: 'preparateur-commandes', label: 'Préparateur de commandes / agent logistique', csp: 'employe', medianNet: 1750 },
  { id: 'coiffeur', label: 'Coiffeur / esthéticien', csp: 'employe', medianNet: 1600 },
  { id: 'assistant-maternel', label: 'Assistant maternel / garde d’enfants', csp: 'employe', medianNet: 1550 },
  { id: 'agent-administratif', label: 'Agent administratif (services)', csp: 'employe', medianNet: 1850 },

  // ── Ouvriers ─────────────────────────────────────────────────────────
  { id: 'ouvrier-qualifie', label: 'Ouvrier qualifié de l’industrie', csp: 'ouvrier', medianNet: 2000 },
  { id: 'operateur', label: 'Opérateur / conducteur de ligne', csp: 'ouvrier', medianNet: 1900 },
  { id: 'mecanicien', label: 'Mécanicien (auto / industrie)', csp: 'ouvrier', medianNet: 1950 },
  { id: 'electricien', label: 'Électricien', csp: 'ouvrier', medianNet: 2050 },
  { id: 'plombier', label: 'Plombier / chauffagiste', csp: 'ouvrier', medianNet: 2000 },
  { id: 'menuisier', label: 'Menuisier / charpentier', csp: 'ouvrier', medianNet: 1950 },
  { id: 'macon', label: 'Maçon', csp: 'ouvrier', medianNet: 1950 },
  { id: 'peintre', label: 'Peintre en bâtiment', csp: 'ouvrier', medianNet: 1850 },
  { id: 'chauffeur-pl', label: 'Conducteur routier / chauffeur poids lourd', csp: 'ouvrier', medianNet: 2050 },
  { id: 'chauffeur-livreur', label: 'Chauffeur-livreur (véhicule léger)', csp: 'ouvrier', medianNet: 1750 },
  { id: 'soudeur', label: 'Soudeur / chaudronnier', csp: 'ouvrier', medianNet: 2100 },
  { id: 'cariste', label: 'Cariste / manutentionnaire', csp: 'ouvrier', medianNet: 1800 },
  { id: 'ouvrier-agricole', label: 'Ouvrier agricole', csp: 'ouvrier', medianNet: 1650 },
  { id: 'boulanger', label: 'Boulanger / pâtissier', csp: 'ouvrier', medianNet: 1750 },
  { id: 'boucher', label: 'Boucher / charcutier', csp: 'ouvrier', medianNet: 1900 },
  { id: 'cuisinier', label: 'Cuisinier', csp: 'ouvrier', medianNet: 1850 },

  // ── Repli « Autre » par CSP ──────────────────────────────────────────
  { id: 'autre-cadre', label: 'Autre — cadre', csp: 'cadre', medianNet: CSP_MEDIAN.cadre },
  { id: 'autre-intermediaire', label: 'Autre — profession intermédiaire', csp: 'intermediaire', medianNet: CSP_MEDIAN.intermediaire },
  { id: 'autre-employe', label: 'Autre — employé', csp: 'employe', medianNet: CSP_MEDIAN.employe },
  { id: 'autre-ouvrier', label: 'Autre — ouvrier', csp: 'ouvrier', medianNet: CSP_MEDIAN.ouvrier },
];

export const METIER_BY_ID = new Map(METIERS.map((m) => [m.id, m]));

export interface Region {
  code: string;
  label: string;
  /** coefficient multiplicatif vs national (au lieu de travail). */
  coef: number;
}

export const REGIONS: Region[] = [
  { code: 'IDF', label: 'Île-de-France', coef: 1.25 },
  { code: 'ARA', label: 'Auvergne-Rhône-Alpes', coef: 0.99 },
  { code: 'PAC', label: "Provence-Alpes-Côte d'Azur", coef: 0.97 },
  { code: 'GES', label: 'Grand Est', coef: 0.93 },
  { code: 'HDF', label: 'Hauts-de-France', coef: 0.92 },
  { code: 'OCC', label: 'Occitanie', coef: 0.92 },
  { code: 'NAQ', label: 'Nouvelle-Aquitaine', coef: 0.91 },
  { code: 'PDL', label: 'Pays de la Loire', coef: 0.93 },
  { code: 'BRE', label: 'Bretagne', coef: 0.91 },
  { code: 'NOR', label: 'Normandie', coef: 0.92 },
  { code: 'CVL', label: 'Centre-Val de Loire', coef: 0.93 },
  { code: 'BFC', label: 'Bourgogne-Franche-Comté', coef: 0.9 },
  { code: 'COR', label: 'Corse', coef: 0.88 },
  { code: 'GUA', label: 'Guadeloupe', coef: 0.9 },
  { code: 'MTQ', label: 'Martinique', coef: 0.9 },
  { code: 'GUF', label: 'Guyane', coef: 0.92 },
  { code: 'REU', label: 'La Réunion', coef: 0.88 },
  { code: 'MAY', label: 'Mayotte', coef: 0.85 },
];

export const REGION_BY_CODE = new Map(REGIONS.map((r) => [r.code, r]));

export interface AgeBand {
  id: string;
  label: string;
  coef: number;
}

export const AGE_BANDS: AgeBand[] = [
  { id: 'lt25', label: 'Moins de 25 ans', coef: 0.78 },
  { id: '25-29', label: '25 à 29 ans', coef: 0.9 },
  { id: '30-39', label: '30 à 39 ans', coef: 1.0 },
  { id: '40-49', label: '40 à 49 ans', coef: 1.1 },
  { id: '50plus', label: '50 ans et plus', coef: 1.13 },
];

export const AGE_BY_ID = new Map(AGE_BANDS.map((a) => [a.id, a]));

export type Sexe = 'femme' | 'homme' | 'nd';

/** Coefficient EQTP (l'écart réel « à poste comparable » est plus faible, ~4 %). */
export const SEXE_COEF: Record<Sexe, number> = {
  femme: 0.93,
  homme: 1.04,
  nd: 1.0,
};

/** Écart salarial femmes-hommes constaté par l'INSEE (secteur privé, EQTP, 2023). */
export const SEXE_GAP_EQTP = 0.142;
/** Écart résiduel « à profil et poste comparables ». */
export const SEXE_GAP_COMPARABLE = 0.04;
