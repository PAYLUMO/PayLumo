/**
 * Modèle de données d'un bulletin de paie, tel que produit par les extracteurs
 * (`features/parsing/extractors/*`) et consommé par le moteur d'analyse
 * (`features/analysis/*`).
 *
 * Chaque valeur extraite est enveloppée dans `Valued<T>` avec un indice de
 * confiance 0..1 : le pipeline est 100 % automatique (pas d'écran de
 * correction), donc le moteur d'analyse ignore les champs peu fiables plutôt
 * que de produire de faux positifs.
 */

export type Confidence = number; // 0..1

export interface Valued<T> {
  value: T;
  confidence: Confidence;
  /** Extrait brut du PDF d'où provient la valeur (utile pour le débogage / la transparence). */
  raw?: string;
}

export function valued<T>(value: T, confidence: Confidence, raw?: string): Valued<T> {
  return { value, confidence, raw };
}

/** Grande famille de cotisation (axe du bulletin clarifié). */
export type ContribCategory =
  | 'SANTE'
  | 'ATMP'
  | 'RETRAITE'
  | 'FAMILLE'
  | 'CHOMAGE'
  | 'AUTRES'
  | 'CSG_CRDS';

export type EmployeeStatus = 'cadre' | 'non-cadre' | 'inconnu';
export type SocialRegime = 'general' | 'alsace-moselle';

export type GrossItemKind =
  | 'base' // salaire de base
  | 'prime'
  | 'heures_supp'
  | 'heures_comp'
  | 'avantage' // avantage en nature
  | 'indemnite'
  | 'absence' // valeur négative attendue
  | 'autre';

export interface GrossItem {
  label: string;
  canonical?: string;
  kind: GrossItemKind;
  base?: Valued<number>;
  rate?: Valued<number>; // ex. taux horaire, ou % de majoration
  amount: Valued<number>; // signé : négatif pour une absence / retenue
}

export interface ContributionLine {
  label: string;
  /** Code canonique (`data/taxonomy.ts`) si la ligne a pu être identifiée. */
  canonical?: string;
  category: ContribCategory;
  base?: Valued<number>;
  employee?: {
    rate?: Valued<number>; // en % (6.9 = 6,90 %)
    amount?: Valued<number>; // montant retenu au salarié (>= 0)
  };
  employer?: {
    rate?: Valued<number>;
    amount?: Valued<number>;
  };
}

export interface AbsenceItem {
  label: string;
  jours?: number;
  heures?: number;
  montant?: number;
}

export interface PayslipTime {
  heuresContrat?: Valued<number>; // ex. 151.67
  heuresTravaillees?: Valued<number>;
  heuresSupp25?: Valued<number>;
  heuresSupp50?: Valued<number>;
  absences?: AbsenceItem[];
  congesPayes?: {
    acquisN1?: number;
    prisN1?: number;
    soldeN1?: number;
    acquisN?: number;
    prisN?: number;
    soldeN?: number;
  };
}

export interface PrelevementSource {
  rate?: Valued<number>; // %
  base?: Valued<number>;
  amount?: Valued<number>;
  type?: 'personnalise' | 'neutre' | 'individualise' | 'inconnu';
}

export interface PayslipCumuls {
  brut?: number;
  netImposable?: number;
  netSocial?: number;
  pas?: number;
  heures?: number;
  congesSolde?: number;
}

export interface Payslip {
  meta: {
    /** Éditeur / mise en page détecté, ou `'ai'` si lu par le modèle. */
    editor: 'sap' | 'clarified' | 'unknown' | 'ai';
    parseConfidence: Confidence;
    /** Messages de diagnostic de l'extraction (non bloquants). */
    notes: string[];
    pageCount: number;
    /** true si le PDF ne contient pas de couche texte (scan / photo). */
    scanned: boolean;
  };

  employer: {
    name?: string;
    convention?: string;
    effectifTranche?: 'lt50' | 'gte50' | 'inconnu';
  };

  // Aucune donnée identifiant le salarié n'est conservée (ni nom, ni adresse, ni
  // n° de sécurité sociale, ni matricule).
  employee: {
    emploi?: string;
    statut: EmployeeStatus;
    regime: SocialRegime;
    coefficient?: string;
    dateEntree?: string; // ISO ou tel quel
    tempsPartiel?: boolean;
  };

  period: Valued<{ month: number; year: number }>;
  payDate?: Valued<string>;

  time: PayslipTime;

  grossItems: GrossItem[];
  gross: Valued<number>; // salaire brut total

  contributions: ContributionLine[];

  /** Ligne récap « Total des cotisations et contributions » du bulletin, si lue. */
  contributionsTotal?: { employee?: Valued<number>; employer?: Valued<number> };
  /** Ligne « Coût total employeur » telle qu'affichée sur le bulletin, si lue. */
  employerCost?: Valued<number>;

  csgCrds?: {
    base?: Valued<number>;
    csgDeductible?: Valued<number>;
    csgNonDeductible?: Valued<number>;
    crds?: Valued<number>;
  };

  /** Réintégrations / réductions (réduction générale, exo heures supp…). */
  adjustments: { label: string; amount: Valued<number> }[];

  netImposable?: Valued<number>;
  netSocial?: Valued<number>;
  pas?: PrelevementSource;
  netAvantImpot?: Valued<number>; // net à payer avant PAS
  netAPayer: Valued<number>; // net versé (après PAS)

  cumuls?: PayslipCumuls;
}
