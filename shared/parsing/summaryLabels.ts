/**
 * Reconnaît les libellés qui ne sont PAS des cotisations individuelles :
 * totaux, sous-totaux, cumuls, intitulés de rubrique, lignes de récapitulatif
 * (net imposable, coût employeur…), lignes globales d'exonération / allègement.
 *
 * Sans ce filtre, une ligne « Total des cotisations et contributions » ou un
 * sous-total de rubrique lu comme une cotisation fausserait le coût employeur
 * (double comptage) et la cohérence brut → net.
 */

/** minuscules, sans accents, ponctuation → espace. */
export function normLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Rubriques / sous-totaux qui portent souvent un montant en paie SAP → à écarter même avec un montant. */
const RUBRIC_SUBTOTALS = new Set([
  'autres contributions dues par l employeur',
  'autres contributions patronales',
  'autres contributions',
  'cotisations statutaires ou conventionnelles',
  'cotisations et contributions sociales',
  'exonerations et allegements',
  'exonerations et allegements de cotisations',
]);

/** Intitulés de rubrique « purs » : à écarter seulement s'ils n'ont ni taux ni montant. */
const SECTION_HEADERS = new Set([
  'sante',
  'accidents du travail',
  'accidents du travail maladies professionnelles',
  'at mp',
  'atmp',
  'retraite',
  'famille',
  'assurance chomage',
  'chomage',
  'csg crds',
  'csg',
  'cotisations',
]);

/**
 * @param label  libellé de la ligne
 * @param hasRate  la ligne porte-t-elle un taux (salarial ou patronal) ?
 * @param hasAmount  la ligne porte-t-elle un montant (salarial ou patronal) ?
 */
export function isSummaryOrHeaderLabel(label: string, hasRate = false, hasAmount = false): boolean {
  const n = normLabel(label);
  if (!n) return true;

  // Totaux / sous-totaux / cumuls / récapitulatifs
  if (/^(sous )?tota(l|ux)\b/.test(n)) return true;
  if (/^cumul/.test(n)) return true;
  if (/^recapitulatif/.test(n)) return true;
  if (/\btotal des cotisations\b/.test(n)) return true;

  // Lignes de synthèse du pied de bulletin
  if (/^net (a payer|imposable|fiscal|social|a verser|impos)/.test(n)) return true;
  if (/^(salaire |remuneration )?brut\b/.test(n)) return true;
  if (/^cout (total |global )?(employeur|du poste|global|patronal)/.test(n)) return true;
  if (/^montant net social/.test(n)) return true;
  if (/^prelevement a la source$|^impot sur le revenu/.test(n)) return true;

  // Sous-total de rubrique (porte souvent un montant, mais double-compte les lignes détaillées)
  if (!hasRate && RUBRIC_SUBTOTALS.has(n)) return true;

  // Intitulé de rubrique employé seul comme une ligne
  if (!hasRate && !hasAmount && SECTION_HEADERS.has(n)) return true;

  // Lignes globales d'exonération / allègement / écrêtement : minorations
  // agrégées, pas des cotisations qui s'ajoutent au coût.
  if (
    !hasRate &&
    /\b(exonerations?|allegements?|allegm|ecretements?|ecret|reduction generale|reduction des cotisations)\b/.test(
      n,
    )
  )
    return true;

  return false;
}
