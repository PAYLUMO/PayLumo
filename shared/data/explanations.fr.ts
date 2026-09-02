/**
 * Contenus pédagogiques — « à quoi sert chaque cotisation ? ».
 * Rédigés en langage clair, millésime 2026.
 */

import type { ContribCategory } from '../parsing/model';
import type { CanonicalCode } from './taxonomy';

export interface CategoryExplain {
  title: string;
  /** Résumé d'une phrase. */
  summary: string;
  /** Ce que la catégorie finance concrètement. */
  finance: string;
}

export const CATEGORY_EXPLAIN: Record<ContribCategory, CategoryExplain> = {
  SANTE: {
    title: 'Santé',
    summary:
      'Vous protège en cas de maladie, maternité, accident de la vie privée, invalidité ou décès.',
    finance:
      'Remboursement des soins et des médicaments, indemnités journalières quand vous ne pouvez pas travailler, pensions d’invalidité, capital décès. Comprend aussi votre mutuelle et votre prévoyance d’entreprise.',
  },
  ATMP: {
    title: 'Accidents du travail — maladies professionnelles',
    summary: 'Couvre les accidents survenus au travail ou sur le trajet, et les maladies professionnelles.',
    finance:
      'Soins à 100 %, indemnités journalières majorées, rentes en cas de séquelles. Entièrement à la charge de l’employeur ; le taux dépend du risque du métier et de la sinistralité de l’entreprise.',
  },
  RETRAITE: {
    title: 'Retraite',
    summary: 'Constitue vos droits à pension pour vos vieux jours : régime de base + régime complémentaire.',
    finance:
      'Les cotisations d’aujourd’hui paient les pensions des retraités actuels (système par répartition) et vous ouvrent des droits (trimestres pour le régime de base, points pour l’Agirc-Arrco) que vous toucherez à votre départ.',
  },
  FAMILLE: {
    title: 'Famille',
    summary: 'Finance les aides aux familles versées par la CAF.',
    finance:
      'Allocations familiales, prime à la naissance, complément de libre choix du mode de garde, aides au logement… Cotisation exclusivement patronale.',
  },
  CHOMAGE: {
    title: 'Assurance chômage',
    summary: 'Vous verse un revenu de remplacement si vous perdez votre emploi involontairement.',
    finance:
      'Allocation d’aide au retour à l’emploi (ARE), accompagnement France Travail, garantie de vos salaires si l’entreprise fait faillite (AGS). Depuis 2018, la part salariale est supprimée.',
  },
  AUTRES: {
    title: 'Autres contributions de l’employeur',
    summary: 'Contributions dues par l’employeur, sans contrepartie individuelle directe pour vous.',
    finance:
      'Aide au logement (FNAL), transports en commun (versement mobilité), autonomie des personnes âgées et handicapées (CSA), formation, apprentissage, dialogue social.',
  },
  CSG_CRDS: {
    title: 'CSG / CRDS',
    summary: 'Impôts affectés au financement de la protection sociale, prélevés sur presque tous les revenus.',
    finance:
      'La CSG finance l’assurance maladie, la famille, la dépendance et une partie des retraites. La CRDS rembourse la dette accumulée par la Sécurité sociale. Une partie de la CSG est déductible de votre impôt sur le revenu, le reste ne l’est pas.',
  },
};

export interface CotisationExplain {
  title: string;
  short: string;
  details: string;
}

export function explainOf(code: string | undefined): CotisationExplain | undefined {
  return code ? EXPLAIN[code as CanonicalCode] : undefined;
}

export const EXPLAIN: Partial<Record<CanonicalCode, CotisationExplain>> = {
  MALADIE: {
    title: 'Assurance maladie, maternité, invalidité, décès',
    short: 'Rembourse vos soins et vous verse un revenu quand la santé vous empêche de travailler.',
    details:
      'Prise en charge des consultations, hospitalisations et médicaments, indemnités journalières en cas d’arrêt maladie ou de congé maternité/paternité, pension d’invalidité si votre capacité de travail est durablement réduite, capital versé à vos proches en cas de décès. Dans le régime général, il n’y a pas de part salariale : seul l’employeur cotise (13 %, ramené à 7 % pour les salaires jusqu’à 2,5 SMIC).',
  },
  MALADIE_ALSACE_MOSELLE: {
    title: 'Cotisation maladie du régime local Alsace-Moselle',
    short: 'Cotisation salariale supplémentaire dans les départements 57, 67 et 68.',
    details:
      'Héritage historique, le régime local d’Alsace-Moselle complète les remboursements de la Sécurité sociale (ticket modérateur réduit, meilleure prise en charge à l’hôpital). En contrepartie, les salariés concernés paient une cotisation salariale supplémentaire de 1,30 % sur la totalité du salaire brut.',
  },
  COMPLEMENTAIRE_SANTE: {
    title: 'Complémentaire santé (mutuelle) d’entreprise',
    short: 'Complète les remboursements de la Sécurité sociale.',
    details:
      'Depuis 2016, toute entreprise doit proposer une complémentaire santé collective et en financer au moins la moitié. Elle rembourse tout ou partie du reste à charge (ticket modérateur, dépassements d’honoraires, optique, dentaire). La part payée par l’employeur est ajoutée à votre revenu imposable.',
  },
  PREVOYANCE: {
    title: 'Prévoyance',
    short: 'Maintient votre revenu en cas d’arrêt long, d’invalidité ou de décès.',
    details:
      'La prévoyance complète les indemnités de la Sécurité sociale lors des arrêts de travail prolongés, verse une rente en cas d’invalidité et un capital à vos proches en cas de décès. Obligatoire pour les cadres (au moins 1,50 % de la tranche A à la charge de l’employeur), fréquente par accord de branche pour les autres salariés.',
  },
  PREVOYANCE_CADRE: {
    title: 'Prévoyance cadres — 1,50 % tranche A',
    short: 'Garantie décès minimale obligatoire pour les cadres.',
    details:
      'L’accord national interprofessionnel impose à l’employeur de consacrer au moins 1,50 % de la tranche A (salaire jusqu’à 1 plafond de la Sécurité sociale) à la prévoyance des cadres, dont une part majoritaire doit couvrir le risque décès. C’est une cotisation exclusivement patronale.',
  },
  ACCIDENT_TRAVAIL: {
    title: 'Accident du travail / maladies professionnelles',
    short: 'Couvre les accidents liés au travail et les maladies professionnelles.',
    details:
      'En cas d’accident du travail ou de trajet, ou de maladie reconnue comme professionnelle : soins pris en charge à 100 %, indemnités journalières plus élevées qu’en maladie ordinaire, et rente si des séquelles subsistent. La cotisation est entièrement patronale ; son taux est propre à chaque établissement (notifié par la Carsat) et reflète son secteur d’activité et le nombre d’accidents passés.',
  },
  VIEILLESSE_PLAFONNEE: {
    title: 'Assurance vieillesse plafonnée',
    short: 'Ouvre vos droits à la retraite de base, sur la part du salaire jusqu’au plafond.',
    details:
      'C’est le cœur de la retraite de base du régime général. Elle est calculée sur la fraction du salaire inférieure au plafond de la Sécurité sociale (4 005 € par mois en 2026). Part salariale 6,90 %, part patronale 8,55 %. C’est cette cotisation qui valide vos trimestres et détermine votre salaire annuel moyen.',
  },
  VIEILLESSE_DEPLAFONNEE: {
    title: 'Assurance vieillesse déplafonnée',
    short: 'Cotisation de solidarité retraite sur la totalité du salaire.',
    details:
      'S’ajoute à la cotisation plafonnée mais porte sur l’intégralité du salaire brut, sans limite. Elle finance le régime de base sans ouvrir de droits supplémentaires proportionnels : c’est une cotisation de solidarité. Part salariale 0,40 %, part patronale 2,11 % en 2026 (contre 2,02 % en 2025).',
  },
  RETRAITE_COMPLEMENTAIRE_T1: {
    title: 'Retraite complémentaire Agirc-Arrco — tranche 1',
    short: 'Retraite complémentaire obligatoire, sur le salaire jusqu’à 1 plafond.',
    details:
      'Tous les salariés du privé cotisent à l’Agirc-Arrco en plus du régime de base. Vos cotisations sont converties en points, cumulés tout au long de la carrière puis transformés en pension. La tranche 1 couvre le salaire jusqu’à 1 plafond de la Sécurité sociale : taux global 7,87 % (3,15 % salarié, 4,72 % employeur).',
  },
  RETRAITE_COMPLEMENTAIRE_T2: {
    title: 'Retraite complémentaire Agirc-Arrco — tranche 2',
    short: 'Retraite complémentaire sur la part du salaire entre 1 et 8 plafonds.',
    details:
      'Même mécanisme de points que la tranche 1, mais sur la fraction du salaire comprise entre 1 et 8 plafonds de la Sécurité sociale. Taux global 21,59 % (8,64 % salarié, 12,95 % employeur). Ne concerne que les salaires dépassant 4 005 € brut par mois en 2026.',
  },
  CEG_T1: {
    title: "Contribution d'équilibre général (CEG) — tranche 1",
    short: 'Finance l’équilibre du régime Agirc-Arrco, notamment les départs avant 67 ans.',
    details:
      'Créée en 2019 lors de la fusion Agirc-Arrco, la CEG compense le coût des retraites liquidées avant l’âge du taux plein sans décote. Elle ne crée pas de points. Sur la tranche 1 : 0,86 % salarié, 1,29 % employeur.',
  },
  CEG_T2: {
    title: "Contribution d'équilibre général (CEG) — tranche 2",
    short: 'Même rôle que la CEG tranche 1, sur la part haute du salaire.',
    details:
      'Contribution d’équilibre sans acquisition de points, appliquée à la fraction du salaire entre 1 et 8 plafonds : 1,08 % salarié, 1,62 % employeur.',
  },
  CET: {
    title: "Contribution d'équilibre technique (CET)",
    short: 'Contribution de solidarité due seulement au-dessus du plafond de la Sécurité sociale.',
    details:
      'La CET n’est due que par les salariés dont la rémunération dépasse 1 plafond de la Sécurité sociale, mais elle porte alors sur la totalité du salaire (tranches 1 et 2). Elle ne génère pas de points. Taux global 0,35 % (0,14 % salarié, 0,21 % employeur).',
  },
  RETRAITE_SUPPLEMENTAIRE: {
    title: 'Retraite supplémentaire (article 83 / PER obligatoire)',
    short: 'Épargne retraite collective mise en place par l’entreprise.',
    details:
      'Certaines entreprises proposent un régime de retraite supplémentaire à cotisations définies (ex-« article 83 », aujourd’hui PER d’entreprise obligatoire). Les versements, souvent partagés employeur/salarié, constituent une épargne bloquée jusqu’à la retraite, avec un cadre fiscal et social avantageux dans certaines limites.',
  },
  ALLOCATIONS_FAMILIALES: {
    title: 'Allocations familiales',
    short: 'Finance les prestations versées aux familles par la CAF.',
    details:
      'Cotisation exclusivement patronale. Taux de 5,25 %, ramené à 3,45 % pour les salaires jusqu’à 3,5 SMIC. Elle finance l’ensemble de la politique familiale : allocations familiales, aides à la garde d’enfants, prime à la naissance, allocation de rentrée scolaire, aides au logement.',
  },
  ASSURANCE_CHOMAGE: {
    title: 'Assurance chômage',
    short: 'Vous verse une allocation si vous perdez votre emploi.',
    details:
      'Financée uniquement par l’employeur depuis 2018 (4,00 % en 2026, dans la limite de 4 plafonds). Elle ouvre droit, sous conditions d’affiliation, à l’allocation d’aide au retour à l’emploi (ARE) versée par France Travail, ainsi qu’à l’accompagnement dans la recherche d’emploi.',
  },
  AGS: {
    title: 'AGS — Association pour la gestion du régime de garantie des créances des salariés',
    short: 'Garantit le paiement de vos salaires si l’entreprise fait faillite.',
    details:
      'Si votre employeur est placé en redressement ou liquidation judiciaire et ne peut plus payer, l’AGS avance les salaires, indemnités de licenciement et de congés dus. Cotisation exclusivement patronale (0,25 %).',
  },
  APEC: {
    title: 'APEC — Association pour l’emploi des cadres',
    short: 'Finance l’accompagnement à l’emploi spécifique aux cadres.',
    details:
      'Cotisation réservée aux cadres, assise sur les tranches A et B (salaire jusqu’à 4 plafonds). Taux global 0,06 % (0,024 % salarié, 0,036 % employeur). Elle finance les services de l’APEC : conseil carrière, offres d’emploi cadres, études sur le marché de l’emploi.',
  },
  CSA: {
    title: 'Contribution solidarité autonomie',
    short: 'Finance le soutien aux personnes âgées et handicapées.',
    details:
      'Contrepartie de la journée de solidarité, cette contribution patronale de 0,30 % alimente la Caisse nationale de solidarité pour l’autonomie (CNSA) : aide à domicile, EHPAD, allocation personnalisée d’autonomie, prestation de compensation du handicap.',
  },
  FNAL: {
    title: 'FNAL — Fonds national d’aide au logement',
    short: 'Finance les aides personnelles au logement (APL, ALS, ALF).',
    details:
      'Contribution patronale : 0,10 % sur la tranche 1 pour les entreprises de moins de 50 salariés, 0,50 % sur la totalité du salaire au-delà. Elle finance les aides au logement versées par la CAF.',
  },
  VERSEMENT_MOBILITE: {
    title: 'Versement mobilité',
    short: 'Finance les transports en commun locaux.',
    details:
      'Dû par les employeurs d’au moins 11 salariés situés dans le ressort d’une autorité organisatrice de la mobilité. Le taux est fixé localement (jusqu’à environ 3,2 % en Île-de-France) et sert à financer bus, tramways et métros.',
  },
  CONTRIBUTION_DIALOGUE_SOCIAL: {
    title: 'Contribution au dialogue social',
    short: 'Finance les organisations syndicales et patronales.',
    details:
      'Contribution patronale de 0,016 % versée à un fonds paritaire qui répartit les moyens entre organisations syndicales de salariés et organisations d’employeurs représentatives.',
  },
  FORFAIT_SOCIAL: {
    title: 'Forfait social',
    short: 'Contribution patronale sur certains compléments de rémunération.',
    details:
      'S’applique à des sommes exonérées de cotisations mais pas de CSG : intéressement, participation, abondement à un plan d’épargne, contributions de prévoyance dans les entreprises d’au moins 11 salariés. Taux de 8 % ou 20 % selon les cas.',
  },
  REDUCTION_GENERALE: {
    title: 'Réduction générale des cotisations patronales',
    short: 'Allègement des charges de l’employeur sur les bas salaires.',
    details:
      'Réduit fortement les cotisations patronales pour les rémunérations proches du SMIC, l’allègement diminuant à mesure que le salaire augmente pour s’annuler autour de 1,6 SMIC. En 2026, le dispositif intègre les anciens « bandeaux » maladie et famille. Elle apparaît en négatif sur le bulletin (elle diminue le coût employeur, pas votre net).',
  },
  CSG_DEDUCTIBLE: {
    title: 'CSG déductible de l’impôt sur le revenu',
    short: 'Part de la CSG que vous pouvez retrancher de votre revenu imposable.',
    details:
      'La contribution sociale généralisée est calculée sur 98,25 % du salaire brut (plus certaines cotisations patronales). Sur ses 9,20 %, une fraction de 6,80 % est déductible : elle réduit le revenu que vous déclarez aux impôts. Elle finance principalement l’assurance maladie et la famille.',
  },
  CSG_NON_DEDUCTIBLE: {
    title: 'CSG non déductible de l’impôt sur le revenu',
    short: 'Part de la CSG qui n’allège pas votre impôt.',
    details:
      'Fraction de 2,40 % de la CSG qui ne peut pas être retranchée du revenu imposable : elle est donc réintégrée dans votre net imposable. Comme la CSG déductible, elle est assise sur 98,25 % du brut.',
  },
  CRDS: {
    title: 'CRDS — contribution au remboursement de la dette sociale',
    short: 'Rembourse la dette accumulée par la Sécurité sociale.',
    details:
      'Créée en 1996 pour être temporaire, la CRDS finance la Caisse d’amortissement de la dette sociale (CADES). Taux de 0,50 %, assise sur 98,25 % du brut, non déductible de l’impôt sur le revenu.',
  },
  CSG_CRDS_NON_DEDUCTIBLE: {
    title: 'CSG/CRDS non déductible de l’impôt sur le revenu',
    short: 'Regroupe la CSG non déductible (2,40 %) et la CRDS (0,50 %).',
    details:
      'Beaucoup de bulletins présentent ces deux prélèvements sur une seule ligne, au taux cumulé de 2,90 %. Cette part n’est pas déductible : elle est réintégrée dans le revenu imposable.',
  },
};
