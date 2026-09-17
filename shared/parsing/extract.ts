/**
 * Extraction d'un `Payslip` à partir du texte positionné d'un PDF
 * (`PdfDocumentText`). Couvre le format « bulletin clarifié » (arrêté du
 * 25/02/2016), qui est aussi la base des bulletins SAP HCM France.
 *
 * Principe : on repère la ligne d'en-tête des colonnes pour connaître les
 * abscisses de « Base / Taux sal. / Part sal. / Taux pat. / Part pat. », puis
 * on affecte chaque nombre d'une ligne à sa colonne par proximité de bord
 * droit (les montants sont alignés à droite).
 */

import { parseFrNumber, looksNumeric, roundCents } from '../lib/money';
import { matchCanonical, normalizeLabel } from '../data/taxonomy';
import { isSummaryOrHeaderLabel } from './summaryLabels';
import type { Cell, PdfDocumentText, TextLine } from './pdf-core';
import {
  valued,
  type Confidence,
  type ContribCategory,
  type ContributionLine,
  type EmployeeStatus,
  type GrossItem,
  type GrossItemKind,
  type Payslip,
  type SocialRegime,
} from './model';

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

const SECTION_MAP: [RegExp, ContribCategory][] = [
  [/accident|at.?mp/i, 'ATMP'],
  [/sante/i, 'SANTE'],
  [/retraite/i, 'RETRAITE'],
  [/famille/i, 'FAMILLE'],
  [/chomage/i, 'CHOMAGE'],
  [/autres? contrib/i, 'AUTRES'],
  [/csg|crds/i, 'CSG_CRDS'],
];

interface Columns {
  base?: number;
  rateEmp?: number;
  amtEmp?: number;
  ratePat?: number;
  amtPat?: number;
}

const NEAR = 16; // points : tolérance d'appariement colonne ↔ cellule

function detectColumns(lines: TextLine[]): { columns: Columns; headerY: number } | null {
  for (const line of lines) {
    const t = normalizeLabel(line.text);
    if (!/base/.test(t)) continue;
    if (!/(taux|part|montant)/.test(t)) continue;
    const cols: Columns = {};
    for (const c of line.cells) {
      const ct = normalizeLabel(c.text);
      const right = c.xEnd;
      if (/base/.test(ct)) cols.base = right;
      else if (/taux (sal|salariale)/.test(ct) || /taux.*part sal/.test(ct)) cols.rateEmp = right;
      else if (/(part|montant) (sal|salariale)/.test(ct) || ct === 'salarie') cols.amtEmp = right;
      else if (/taux (pat|patronale|employeur)/.test(ct)) cols.ratePat = right;
      else if (/(part|montant) (pat|patronale)/.test(ct) || ct === 'employeur') cols.amtPat = right;
    }
    if (cols.base != null && (cols.amtEmp != null || cols.amtPat != null)) {
      return { columns: cols, headerY: line.y };
    }
  }
  return null;
}

interface LineNumbers {
  base?: number;
  rateEmp?: number;
  amtEmp?: number;
  ratePat?: number;
  amtPat?: number;
  /** nombres non rattachés à une colonne connue. */
  loose: number[];
}

function assignNumbers(cells: Cell[], cols: Columns): LineNumbers {
  const out: LineNumbers = { loose: [] };
  const targets: [keyof Columns, number][] = (
    ['base', 'rateEmp', 'amtEmp', 'ratePat', 'amtPat'] as (keyof Columns)[]
  )
    .filter((k) => cols[k] != null)
    .map((k) => [k, cols[k] as number]);

  for (const c of cells) {
    if (!looksNumeric(c.text)) continue;
    const v = parseFrNumber(c.text);
    if (v == null) continue;
    let best: keyof Columns | null = null;
    let bestD = NEAR;
    for (const [k, x] of targets) {
      const d = Math.abs(c.xEnd - x);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    }
    if (best && out[best] === undefined) {
      out[best] = v;
    } else {
      out.loose.push(v);
    }
  }
  return out;
}

/** Libellé = cellule(s) de gauche, avant la première cellule numérique. */
function labelOf(line: TextLine): string {
  const parts: string[] = [];
  for (const c of line.cells) {
    if (looksNumeric(c.text) && parseFrNumber(c.text) != null && c.x > 200) break;
    parts.push(c.text);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function isSectionHeader(line: TextLine): ContribCategory | null {
  if (line.cells.length > 2) return null;
  if (line.cells.some((c) => looksNumeric(c.text))) return null;
  const t = line.text.trim();
  if (t.length > 48) return null;
  const upperish = t === t.toUpperCase() || /^[A-ZÀ-Ý][A-ZÀ-Ý '/-]+$/.test(t);
  if (!upperish && !/cotisation|contribution/i.test(t)) return null;
  for (const [re, cat] of SECTION_MAP) if (re.test(t)) return cat;
  return null;
}

function grossKind(label: string): GrossItemKind {
  const l = normalizeLabel(label);
  if (/absence|conge sans solde|sans solde|greve|maladie non rem|retenue/.test(l)) return 'absence';
  if (/heures? suppl|\bh\.?s\.?\b|majoration|complementaire.*heure|\bhc\b/.test(l)) return 'heures_supp';
  if (/prime|bonus|gratification|13(e|eme) mois|prime annuelle|interess/.test(l)) return 'prime';
  if (/avantage|nature|vehicule|logement de fonction/.test(l)) return 'avantage';
  if (/indemnit|remboursement|panier|transport|teletravail/.test(l)) return 'indemnite';
  return 'autre';
}

function firstMatch(lines: TextLine[], re: RegExp): RegExpMatchArray | null {
  for (const l of lines) {
    const m = l.text.match(re);
    if (m) return m;
  }
  return null;
}

function parsePeriod(lines: TextLine[]): { month: number; year: number; raw: string } | null {
  const range = firstMatch(lines, /(\d{2})\/(\d{2})\/(\d{4})\s*(?:au|-|→)\s*(\d{2})\/(\d{2})\/(\d{4})/);
  if (range) {
    return { month: Number(range[5]), year: Number(range[6]), raw: range[0] };
  }
  const explicit = firstMatch(lines, /p[ée]riode[^0-9]*(\d{2})\/(\d{4})/i);
  if (explicit) return { month: Number(explicit[1]), year: Number(explicit[2]), raw: explicit[0] };
  const named = firstMatch(
    lines,
    /\b(janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)\s+(\d{4})/i,
  );
  if (named) {
    const key = normalizeLabel(named[1]);
    return { month: MONTHS[key] ?? 1, year: Number(named[2]), raw: named[0] };
  }
  return null;
}

function inferStatut(lines: TextLine[]): { statut: EmployeeStatus; confidence: Confidence } {
  const all = lines.map((l) => normalizeLabel(l.text)).join(' \n ');
  const explicit = all.match(/statut\s*:?\s*(cadre|non.?cadre|employe|ouvrier|agent de maitrise|etam|technicien)/);
  if (explicit) {
    if (/non.?cadre|employe|ouvrier|etam|technicien|agent de maitrise/.test(explicit[1])) {
      return { statut: 'non-cadre', confidence: 0.9 };
    }
    return { statut: 'cadre', confidence: 0.95 };
  }
  if (/\bapec\b/.test(all) || /prevoyance.*cadre/.test(all) || /\bcet\b/.test(all)) {
    return { statut: 'cadre', confidence: 0.6 };
  }
  return { statut: 'inconnu', confidence: 0.2 };
}

function inferRegime(lines: TextLine[]): SocialRegime {
  const all = lines.map((l) => l.text).join(' \n ');
  if (/alsace|moselle|r[ée]gime local/i.test(all)) return 'alsace-moselle';
  if (/\b(57|67|68)\d{3}\b/.test(all) && /maladie.*(1[.,]30|regime local)/i.test(normalizeLabel(all)))
    return 'alsace-moselle';
  return 'general';
}

export function extractPayslip(doc: PdfDocumentText): Payslip {
  const notes: string[] = [];
  const lines = doc.lines;

  if (doc.charCount < 40) {
    return emptyPayslip(doc, ['Le PDF ne contient pas de texte : il s’agit probablement d’un scan ou d’une photo.'], true);
  }

  const colInfo = detectColumns(lines);
  if (!colInfo) notes.push('En-tête de colonnes non repérée : lecture des taux/montants moins fiable.');
  const columns: Columns = colInfo?.columns ?? { base: 320, rateEmp: 381, amtEmp: 452, ratePat: 513, amtPat: 578 };

  const period = parsePeriod(lines);
  const { statut, confidence: statutConf } = inferStatut(lines);
  const regime = inferRegime(lines);

  // ── En-tête ────────────────────────────────────────────────────────────────
  // Aucune donnée identifiant le salarié n'est extraite (nom, adresse, n° SS, matricule).
  const convention = firstMatch(lines, /convention collective\s*:?\s*(.+)/i)?.[1]?.trim();
  const effectifRaw = firstMatch(lines, /effectif\s*:?\s*(\d{1,6})/i)?.[1];
  const effectif = effectifRaw ? Number(effectifRaw) : undefined;
  const emploi = firstMatch(lines, /emploi\s*:?\s*([^:¦]+?)(?:\s{2,}|statut|coefficient|niveau|$)/i)?.[1]?.trim();
  const coefficient = firstMatch(lines, /coefficient\s*:?\s*([A-Za-z0-9. -]{1,20})/i)?.[1]?.trim();
  const dateEntree = firstMatch(lines, /(?:date d['e ]entr[ée]e|anciennet[ée]|entr[ée]e le)\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1];
  const payDate = firstMatch(lines, /pai(?:ement|e le|é le|é)\s*:?\s*(?:le\s*)?(\d{2}\/\d{2}\/\d{4})/i)?.[1];
  const horaire = firstMatch(lines, /horaire (?:mensuel|contractuel)\s*:?\s*([\d   ]+[.,]\d+|\d+)\s*h/i)?.[1];
  const heuresContrat = horaire ? parseFrNumber(horaire) ?? undefined : undefined;

  let employerName = '';
  const bulletinIdx = lines.findIndex((l) => /bulletin de (paie|salaire)|bulletin de paye/i.test(l.text));
  for (let i = Math.max(0, bulletinIdx); i < Math.min(lines.length, bulletinIdx + 5); i++) {
    const c0 = lines[i]?.cells[0]?.text ?? '';
    if (/\b(SARL|SAS|SASU|SA|EURL|SNC|SCOP|E\.?U\.?R\.?L)\b/.test(c0) || /\b(SARL|SAS|SA|EURL)\b/i.test(c0)) {
      employerName = c0.trim();
      break;
    }
  }

  // ── Corps ──────────────────────────────────────────────────────────────────
  const grossItems: GrossItem[] = [];
  const contributions: ContributionLine[] = [];
  let gross: number | undefined;
  let currentSection: ContribCategory | null = null;
  let phase: 'pre' | 'remuneration' | 'cotisations' | 'summary' | 'done' = 'pre';

  const summary: Record<string, { amount?: number; rate?: number }> = {};

  for (const line of lines) {
    const raw = line.text.trim();
    const norm = normalizeLabel(raw);
    if (!raw) continue;

    // Bloc « Cumuls » (cumul depuis janvier) : jamais lu localement — les
    // libellés y recoupent ceux du récapitulatif mensuel (net imposable, net
    // social…) et écraseraient les bons montants avec les cumuls. On arrête
    // toute lecture dès qu'on l'atteint (il vient toujours en tout dernier).
    if (phase === 'done') continue;
    if (/^cumuls?\b/.test(norm)) {
      phase = 'done';
      continue;
    }

    if (colInfo && line.y === colInfo.headerY) {
      phase = phase === 'pre' ? 'remuneration' : phase;
      continue;
    }
    if (/^r[ée]mun[ée]ration/i.test(raw) || /^[ée]l[ée]ments? (de|du) (paie|salaire|r[ée]mun)/i.test(raw)) {
      phase = 'remuneration';
      continue;
    }

    // total / passage au récapitulatif
    if (/^total des cotisations|^total cotisations|^total retenues/i.test(norm)) {
      phase = 'summary';
      const nums = assignNumbers(line.cells, columns);
      if (nums.amtEmp != null || nums.loose[0] != null) summary.totalSal = { amount: nums.amtEmp ?? nums.loose[0] };
      if (nums.amtPat != null) summary.totalPat = { amount: nums.amtPat };
      continue;
    }

    // coût total employeur (souvent la toute dernière ligne)
    if (/^co[uû]t (total|global)\s+(employeur|du poste|patronal)|^co[uû]t global\b/i.test(norm)) {
      const nums = assignNumbers(line.cells, columns);
      const amt = nums.amtEmp ?? nums.amtPat ?? nums.base ?? nums.loose.at(-1) ?? nums.loose[0];
      if (amt != null) summary.coutEmployeur = { amount: amt };
      phase = 'summary';
      continue;
    }

    // salaire brut
    if (phase !== 'summary' && /^(salaire\s+)?brut\b|^brut (fiscal|social|total|mensuel)|^total brut/i.test(norm)) {
      const nums = assignNumbers(line.cells, columns);
      gross = nums.amtEmp ?? nums.base ?? nums.loose[0];
      phase = 'cotisations';
      continue;
    }

    const section = isSectionHeader(line);
    if (section) {
      currentSection = section;
      if (phase === 'remuneration' || phase === 'pre') phase = 'cotisations';
      continue;
    }

    const nums = assignNumbers(line.cells, columns);
    const hasAnyNumber = line.cells.some((c) => looksNumeric(c.text));
    const label = labelOf(line);

    if (phase === 'summary') {
      const slabel = normalizeLabel(label);
      const amount = nums.amtEmp ?? nums.base ?? nums.loose.at(-1) ?? nums.loose[0];
      const inlineRate = parseFrNumber(label.match(/taux\s*:?\s*([\d.,\s]+)\s*%/)?.[1] ?? '');
      const rate = nums.rateEmp ?? inlineRate ?? (nums.loose.length > 1 ? nums.loose[0] : undefined) ?? undefined;
      if (/net imposable|net fiscal|base imposable|imposable/.test(slabel) && !/imp[oô]t sur le revenu/.test(slabel))
        summary.netImposable = { amount };
      else if (/net social/.test(slabel)) summary.netSocial = { amount };
      else if (/avant imp[oô]t|avant pr[eé]l[eè]vement|net a payer avant/.test(slabel)) summary.netAvantImpot = { amount };
      else if (/imp[oô]t sur le revenu|pr[eé]l[eè]vement (a la source|source)|retenue a la source|montant de l imp/.test(slabel))
        summary.pas = { amount: amount != null ? Math.abs(amount) : undefined, rate };
      else if (/^net (a )?pay[ée]|net vers[ée]|net a payer$|virement|montant net a payer/.test(slabel))
        summary.netAPayer = { amount };
      continue;
    }

    if (!hasAnyNumber || !label) continue;

    if (phase === 'remuneration') {
      const amount = nums.amtEmp ?? nums.loose.at(-1) ?? nums.base;
      if (amount == null) continue;
      const kind = grossKind(label);
      grossItems.push({
        label,
        kind,
        amount: valued(kind === 'absence' && amount > 0 ? -amount : amount, 0.8, line.text),
        base: nums.base != null ? valued(nums.base, 0.7) : undefined,
        rate: nums.rateEmp != null ? valued(nums.rateEmp, 0.7) : undefined,
      });
      continue;
    }

    if (phase === 'cotisations') {
      // total / sous-total / intitulé de rubrique / exonération globale glissé
      // dans le corps : on ne le compte pas comme une cotisation.
      if (
        isSummaryOrHeaderLabel(
          label,
          nums.rateEmp != null || nums.ratePat != null,
          nums.amtEmp != null || nums.amtPat != null,
        )
      )
        continue;
      const cat = currentSection ?? guessCategory(label);
      const entry = matchCanonical(label, { section: cat ?? undefined, statut, regime });
      const c: ContributionLine = {
        label,
        canonical: entry?.code,
        category: entry?.category ?? cat ?? 'AUTRES',
        base: nums.base != null ? valued(nums.base, 0.85) : undefined,
      };
      if (nums.rateEmp != null || nums.amtEmp != null) {
        c.employee = {
          rate: nums.rateEmp != null ? valued(nums.rateEmp, 0.85) : undefined,
          amount: nums.amtEmp != null ? valued(Math.abs(nums.amtEmp), 0.85) : undefined,
        };
      }
      if (nums.ratePat != null || nums.amtPat != null) {
        c.employer = {
          rate: nums.ratePat != null ? valued(nums.ratePat, 0.85) : undefined,
          amount: nums.amtPat != null ? valued(Math.abs(nums.amtPat), 0.85) : undefined,
        };
      }
      // ligne sans part explicitement salariale/patronale : nombres lâches
      if (!c.employee && !c.employer && nums.loose.length) {
        const [maybeRate, maybeAmt] = nums.loose;
        c.employee = {
          rate: maybeRate != null && maybeRate < 60 ? valued(maybeRate, 0.4) : undefined,
          amount: maybeAmt != null ? valued(Math.abs(maybeAmt), 0.4) : valued(Math.abs(maybeRate), 0.3),
        };
      }
      contributions.push(c);
    }
  }

  // ── CSG / CRDS agrégé ──────────────────────────────────────────────────────
  const csgLines = contributions.filter((c) => c.category === 'CSG_CRDS');
  const csgCrds = csgLines.length
    ? {
        base: csgLines[0].base,
        csgDeductible: csgLines.find((c) => c.canonical === 'CSG_DEDUCTIBLE')?.employee?.amount,
        csgNonDeductible: csgLines.find((c) => c.canonical === 'CSG_NON_DEDUCTIBLE')?.employee?.amount,
        crds: csgLines.find((c) => c.canonical === 'CRDS')?.employee?.amount,
      }
    : undefined;

  // ── Confiance globale ──────────────────────────────────────────────────────
  const totalSal = summary.totalSal?.amount;
  const netAPayer = summary.netAPayer?.amount ?? summary.netAvantImpot?.amount;

  let score = 0;
  let max = 0;
  const gate = (ok: boolean, weight: number) => {
    max += weight;
    if (ok) score += weight;
  };
  gate(!!period, 2);
  gate(gross != null, 2);
  gate(netAPayer != null, 2);
  gate(contributions.length >= 5, 2);
  gate(!!colInfo, 1);
  gate(statutConf > 0.5, 1);
  gate(!!csgCrds, 1);
  const parseConfidence = max ? roundCents(score / max) : 0;

  if (gross == null) notes.push('Salaire brut non identifié.');
  if (!period) notes.push('Période de paie non identifiée.');
  if (contributions.length < 5) notes.push(`Seulement ${contributions.length} ligne(s) de cotisation détectée(s).`);

  const payslip: Payslip = {
    meta: {
      editor: detectEditor(doc),
      parseConfidence,
      notes,
      pageCount: doc.pageCount,
      scanned: false,
    },
    employer: {
      name: employerName || undefined,
      convention,
      effectifTranche: effectif == null ? 'inconnu' : effectif < 50 ? 'lt50' : 'gte50',
    },
    employee: {
      emploi,
      statut,
      regime,
      coefficient,
      dateEntree,
      tempsPartiel: heuresContrat != null ? heuresContrat < 151 : undefined,
    },
    period: period
      ? valued({ month: period.month, year: period.year }, 0.9, period.raw)
      : valued({ month: 0, year: 0 }, 0),
    payDate: payDate ? valued(payDate, 0.9) : undefined,
    time: {
      heuresContrat: heuresContrat != null ? valued(heuresContrat, 0.7) : undefined,
    },
    grossItems,
    gross: gross != null ? valued(gross, 0.9) : valued(0, 0),
    contributions,
    contributionsTotal:
      summary.totalSal?.amount != null || summary.totalPat?.amount != null
        ? {
            employee:
              summary.totalSal?.amount != null
                ? valued(Math.abs(summary.totalSal.amount), 0.75)
                : undefined,
            employer:
              summary.totalPat?.amount != null
                ? valued(Math.abs(summary.totalPat.amount), 0.75)
                : undefined,
          }
        : undefined,
    employerCost:
      summary.coutEmployeur?.amount != null ? valued(summary.coutEmployeur.amount, 0.8) : undefined,
    csgCrds,
    adjustments: [],
    netImposable: summary.netImposable?.amount != null ? valued(summary.netImposable.amount, 0.85) : undefined,
    netSocial: summary.netSocial?.amount != null ? valued(summary.netSocial.amount, 0.85) : undefined,
    pas:
      summary.pas?.amount != null || summary.pas?.rate != null
        ? {
            amount: summary.pas?.amount != null ? valued(summary.pas.amount, 0.8) : undefined,
            rate: summary.pas?.rate != null ? valued(summary.pas.rate, 0.7) : undefined,
            type: 'inconnu',
          }
        : undefined,
    netAvantImpot: summary.netAvantImpot?.amount != null ? valued(summary.netAvantImpot.amount, 0.85) : undefined,
    netAPayer: netAPayer != null ? valued(netAPayer, 0.85) : valued(0, 0),
    cumuls: undefined,
  };

  if (totalSal != null) payslip.adjustments.push({ label: 'Total cotisations salariales (bulletin)', amount: valued(totalSal, 0.7) });

  return payslip;
}

function guessCategory(label: string): ContribCategory | null {
  const entry = matchCanonical(label);
  return entry?.category ?? null;
}

function detectEditor(doc: PdfDocumentText): 'sap' | 'clarified' | 'unknown' {
  const meta = `${doc.producer ?? ''} ${doc.creator ?? ''}`.toLowerCase();
  if (/sap|\bhr\b|successfactors/.test(meta)) return 'sap';
  const body = doc.lines
    .slice(0, 40)
    .map((l) => l.text)
    .join(' ')
    .toLowerCase();
  if (/bulletin de (paie|salaire)/.test(body)) return 'clarified';
  return 'unknown';
}

function emptyPayslip(doc: PdfDocumentText, notes: string[], scanned: boolean): Payslip {
  return {
    meta: { editor: 'unknown', parseConfidence: 0, notes, pageCount: doc.pageCount, scanned },
    employer: {},
    employee: { statut: 'inconnu', regime: 'general' },
    period: valued({ month: 0, year: 0 }, 0),
    time: {},
    grossItems: [],
    gross: valued(0, 0),
    contributions: [],
    adjustments: [],
    netAPayer: valued(0, 0),
  };
}
