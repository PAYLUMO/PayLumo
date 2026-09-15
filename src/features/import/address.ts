/**
 * Détection d'une adresse postale française dans un texte, pour caviardage local.
 *
 * On repère indépendamment :
 *  - la ligne « code postal (5 chiffres) + commune » ;
 *  - une ligne de voie « numéro + type de voie » (rue, avenue, impasse…).
 *
 * Ni l'adresse du salarié ni celle de l'employeur ne servent à l'analyse : les
 * deux peuvent être masquées sans perte.
 */

const VOIE =
  'rue|avenue|av|bd|boulevard|impasse|imp|all[ée]es?|chemin|route|rte|place|quai|cours|passage|square|villa|voie|lotissement|lot|r[ée]sidence|res|hameau|faubourg|fbg|mont[ée]e|sentier|traverse|clos|domaine|zone|z\\.?\\s?[ia]|zac';

const STREET_RE = new RegExp(
  `(?:^|[\\s(])(\\d{1,4}\\s?(?:bis|ter|quater|[a-dA-D])?\\s*,?\\s*(?:${VOIE})\\b[^\\n,;|]{0,50})`,
  'gi',
);

// 5 chiffres (dept 01-98) + commune capitalisée, éventuellement « CEDEX … »
const POSTAL_RE = new RegExp(
  "(?<!\\d)((?:0[1-9]|[1-8]\\d|9[0-8])\\d{3})\\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’.\\- ]{1,40}?(?:\\s+cedex(?:\\s+\\d{1,2})?)?)(?=$|[\\n,;|]|\\s{2,})",
  'gim',
);

export interface AddressMatch {
  text: string;
  index: number;
  end: number;
}

export function findAddress(text: string): AddressMatch[] {
  const out: AddressMatch[] = [];

  STREET_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STREET_RE.exec(text))) {
    const g = m[1];
    const start = m.index + m[0].indexOf(g);
    out.push({ text: g, index: start, end: start + g.length });
  }

  POSTAL_RE.lastIndex = 0;
  while ((m = POSTAL_RE.exec(text))) {
    const city = m[2].trim();
    // écarter les faux positifs évidents (unités, mots-clés paie)
    if (/^(eur|euros?|net|brut|smic|pass|pmss|urssaf|cedex)$/i.test(city)) continue;
    out.push({ text: m[0], index: m.index, end: m.index + m[0].length });
  }

  return out.sort((a, b) => a.index - b.index);
}
