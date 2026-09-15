/**
 * Détection du numéro de sécurité sociale français (NIR) dans un texte.
 *
 *   S AA MM DEP CCC OOO (KK)   — 13 chiffres significatifs + 2 de clé
 *   S    sexe : 1 ou 2 (3/4 provisoire, 7/8 rares)
 *   AA   année de naissance          MM  mois : 01-12 ou cas particuliers (20, 30-42, 50, 99…)
 *   DEP  département : 2 car. (2A/2B Corse, 99 né à l'étranger)
 *   CCC  code commune (3)            OOO numéro d'ordre (3)          KK clé (2)
 *
 * Utilisé pour caviarder le NIR localement avant l'envoi du bulletin.
 */

const SEP = '[ . -]?';
const NIR_RE = new RegExp(
  `(?<!\\d)([1-478])${SEP}(\\d{2})${SEP}(\\d{2})${SEP}(\\d{2}|2[ab])${SEP}(\\d{3})${SEP}(\\d{3})(?:${SEP}(\\d{2}))?(?!\\d)`,
  'gi',
);

const LABEL_RE =
  /s[ée]curit[ée]\s*sociale|\bn[°o]?\s*s\.?\s*s\.?\b|\bnir\b|immatriculation|num[ée]ro\s*d['e ]?assur|assur[ée]?\s*social/i;

export interface NirMatch {
  text: string;
  index: number;
  end: number;
}

function plausibleMonth(mm: string): boolean {
  const m = Number(mm);
  return (m >= 1 && m <= 12) || m === 20 || (m >= 30 && m <= 42) || m === 50 || m === 99 || m === 62 || m === 63;
}

/** Clé de contrôle : 97 − (13 chiffres mod 97), avec 2A → 19 et 2B → 18. */
function keyOk(d13: string, key: string): boolean {
  const norm = d13.toLowerCase().replace('2a', '19').replace('2b', '18');
  if (!/^\d{13}$/.test(norm)) return false;
  return 97 - Number(BigInt(norm) % 97n) === Number(key);
}

export function findNir(text: string): NirMatch[] {
  const out: NirMatch[] = [];
  NIR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NIR_RE.exec(text))) {
    const [full, s, , mm, dep, ccc, ooo, key] = m;
    if (!plausibleMonth(mm)) continue;
    const d13 = `${s}${m[2]}${mm}${dep}${ccc}${ooo}`;
    const before = text.slice(Math.max(0, m.index - 45), m.index);
    const strongKey = key ? keyOk(d13, key) : false;
    const nearLabel = LABEL_RE.test(before);
    // Conserver si : clé de contrôle valide, OU libellé « sécurité sociale / NIR »
    // à proximité, OU structure plausible d'un NIR de personne née en France
    // (sexe 1 ou 2). Privilégier le caviardage : un faux positif ne masque qu'un
    // numéro de référence, jamais un montant utile à l'analyse.
    if (strongKey || nearLabel || /^[12]$/.test(s)) {
      out.push({ text: full, index: m.index, end: m.index + full.length });
    }
  }
  return out;
}
