/**
 * Calcul brut ↔ net à partir du barème légal 2026 de PayLumo (`rates2026`).
 *
 * Ce qui est calculé : les cotisations salariales LÉGALES (retraite de base,
 * Agirc-Arrco, CEG/CET, APEC pour un cadre, CSG/CRDS) sur les bases et plafonds
 * 2026, puis le prélèvement à la source (taux par défaut de la grille officielle,
 * ou taux saisi par l'utilisateur).
 *
 * Ce qui ne l'est PAS : mutuelle et prévoyance (saisies à part), convention
 * collective, heures supplémentaires exonérées, régime Alsace-Moselle, avantages en
 * nature, ainsi que la réintégration de la part patronale de mutuelle dans le net
 * imposable. C'est donc une estimation, pas le net exact d'un bulletin.
 */

import { CSG_ABATTEMENT, CSG_ABATTEMENT_PLAFOND, PMSS, tranches } from '../data/params.js';
import { RATES_2026, rateByCode, type AssietteKind } from '../data/rates2026.js';
import { neutralPasRate } from '../data/pasGrid.js';
import { roundCents } from '../lib/money.js';

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export type Statut = 'cadre' | 'non-cadre';

export interface CalcInput {
  /** salaire brut mensuel (€). */
  grossMonthly: number;
  statut: Statut;
  /** retenues salariales mensuelles de mutuelle / prévoyance (€), à lire sur le bulletin. */
  otherDeductions?: number;
  /** taux de prélèvement à la source personnalisé (%) ; sinon taux par défaut de la grille. */
  pasRate?: number | null;
}

export interface CalcLine {
  code: string;
  label: string;
  base: number;
  rate: number;
  amount: number;
}

export interface CalcResult {
  gross: number;
  /** cotisations salariales légales, ligne par ligne. */
  lines: CalcLine[];
  /** total des cotisations salariales légales. */
  contributions: number;
  otherDeductions: number;
  netBeforeTax: number;
  /** net imposable = base du prélèvement à la source. */
  netTaxable: number;
  pasRate: number;
  /** true si le taux vient de la grille par défaut (taux « neutre »). */
  pasIsDefault: boolean;
  pas: number;
  netPaid: number;
}

interface Rule {
  code: string;
  label: string;
  assiette: AssietteKind;
  rate: number;
  abovePmssOnly: boolean;
  /** CSG non déductible / CRDS : réintégrées dans le net imposable. */
  reintegrated: boolean;
}

const RULES: Record<Statut, Rule[]> = {
  cadre: buildRules('cadre'),
  'non-cadre': buildRules('non-cadre'),
};

function buildRules(statut: Statut): Rule[] {
  return RATES_2026.filter((r) => {
    if (r.employee?.kind !== 'fixed' || r.employee.rate <= 0) return false;
    if (r.code === 'CSG_CRDS_NON_DEDUCTIBLE') return false; // doublon fusionné de CSG non déd. + CRDS
    if (r.expected?.statut && r.expected.statut !== statut) return false;
    if (r.expected?.regime && r.expected.regime !== 'general') return false; // Alsace-Moselle non modélisé
    return true;
  }).map((r) => ({
    code: r.code,
    label: r.label,
    assiette: r.assiette,
    rate: (r.employee as { rate: number }).rate,
    abovePmssOnly: !!r.expected?.abovePmssOnly,
    reintegrated: r.code === 'CSG_NON_DEDUCTIBLE' || r.code === 'CRDS',
  }));
}

/** Assiette CSG/CRDS : 98,25 % du brut dans la limite de 4 PASS, 100 % au-delà. */
function csgBase(gross: number): number {
  const cap = CSG_ABATTEMENT_PLAFOND / 12;
  return Math.min(gross, cap) * (1 - CSG_ABATTEMENT) + Math.max(0, gross - cap);
}

function baseFor(kind: AssietteKind, gross: number): number {
  const t = tranches(gross);
  switch (kind) {
    case 'brut_total':
      return gross;
    case 'tranche_1':
      return t.t1;
    case 'tranche_2':
      return t.t2;
    case 'tranche_1_2':
      return t.t1 + t.t2;
    case 'tranche_B':
      return t.tB;
    case 'tranche_AB':
    case 'chomage':
      return Math.min(gross, 4 * PMSS);
    case 'csg':
      return csgBase(gross);
    case 'none':
      return 0;
  }
}

/** Applique les règles ; `lines` est alimenté seulement si fourni (le solveur n'en a pas besoin). */
function apply(gross: number, rules: Rule[], lines?: CalcLine[]): { total: number; reintegrated: number } {
  let total = 0;
  let reintegrated = 0;
  for (const r of rules) {
    if (r.abovePmssOnly && gross <= PMSS) continue;
    const base = baseFor(r.assiette, gross);
    if (base <= 0) continue;
    const amount = (base * r.rate) / 100;
    total += amount;
    if (r.reintegrated) reintegrated += amount;
    lines?.push({ code: r.code, label: r.label, base: roundCents(base), rate: r.rate, amount: roundCents(amount) });
  }
  return { total, reintegrated };
}

const EMPTY: CalcResult = {
  gross: 0,
  lines: [],
  contributions: 0,
  otherDeductions: 0,
  netBeforeTax: 0,
  netTaxable: 0,
  pasRate: 0,
  pasIsDefault: true,
  pas: 0,
  netPaid: 0,
};

/** Brut mensuel → net avant impôt, net imposable, prélèvement à la source et net à payer. */
export function grossToNet(input: CalcInput): CalcResult {
  const gross = Math.max(0, input.grossMonthly);
  if (gross === 0) return { ...EMPTY, lines: [] };

  const other = Math.max(0, input.otherDeductions ?? 0);
  const lines: CalcLine[] = [];
  const { total, reintegrated } = apply(gross, RULES[input.statut], lines);

  const netBeforeTax = roundCents(gross - total - other);
  const netTaxable = roundCents(netBeforeTax + reintegrated);
  const custom = input.pasRate != null && Number.isFinite(input.pasRate) ? Math.max(0, input.pasRate) : null;
  const pasRate = custom ?? neutralPasRate(netTaxable);
  const pas = roundCents((Math.max(0, netTaxable) * pasRate) / 100);

  return {
    gross,
    lines,
    contributions: roundCents(total),
    otherDeductions: other,
    netBeforeTax,
    netTaxable,
    pasRate,
    pasIsDefault: custom == null,
    pas,
    netPaid: roundCents(netBeforeTax - pas),
  };
}

export type NetKind = 'beforeTax' | 'paid';

/** Plafond de recherche : 200 000 € de brut mensuel. */
const MAX_GROSS = 200_000;

/**
 * Plus petit brut dont `netAt(brut)` atteint `target` (recherche puis affinage au
 * centime). Le net après prélèvement à la source baisse ponctuellement quand le taux
 * passe à la tranche supérieure — plusieurs bruts peuvent alors donner un net proche,
 * on retient le plus bas. `null` si la cible est hors de portée.
 */
function searchGrossForNet(target: number, netAt: (gross: number) => number): number | null {
  if (!(target > 0)) return null;

  let hi = -1;
  for (let g = 1; g <= MAX_GROSS; g++) {
    if (netAt(g) >= target) {
      hi = g;
      break;
    }
  }
  if (hi < 0) return null;

  let lo = hi - 1;
  let up = hi;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + up) / 2;
    if (netAt(mid) >= target) up = mid;
    else lo = mid;
  }
  return roundCents(up);
}

/** Net → brut mensuel (calcul détaillé). */
export function grossFromNet(
  target: number,
  kind: NetKind,
  opts: Omit<CalcInput, 'grossMonthly'>,
): number | null {
  const rules = RULES[opts.statut];
  const other = Math.max(0, opts.otherDeductions ?? 0);
  const custom = opts.pasRate != null && Number.isFinite(opts.pasRate) ? Math.max(0, opts.pasRate) : null;

  return searchGrossForNet(target, (g) => {
    const { total, reintegrated } = apply(g, rules);
    const nb = g - total - other;
    if (kind === 'beforeTax') return nb;
    const nt = nb + reintegrated;
    const rate = custom ?? neutralPasRate(nt);
    return nb - (Math.max(0, nt) * rate) / 100;
  });
}

// ── Taux de charges libre ────────────────────────────────────────────────────
// Remplace le détail du barème par un taux global choisi par l'utilisateur
// (par exemple le repère courant « ~22 % » plutôt que le calcul ligne à ligne).
// Seule la réintégration CSG non déductible (2,4 %) + CRDS (0,5 %) — des taux fixés
// par la loi, indépendants du débat cadre/non-cadre — reste calculée précisément,
// pour que le net imposable (et donc le prélèvement à la source) reste réaliste
// même à un taux de charges choisi librement, y compris extrême.

export interface FlatCalcInput {
  /** salaire brut mensuel (€). */
  grossMonthly: number;
  /** taux de charges salariales total, en % du brut. */
  chargeRatePct: number;
  /** retenues salariales mensuelles de mutuelle / prévoyance (€), à lire sur le bulletin. */
  otherDeductions?: number;
  /** taux de prélèvement à la source personnalisé (%) ; sinon taux par défaut de la grille. */
  pasRate?: number | null;
}

function fixedReintegrationRate(): number {
  const nonDed = rateByCode('CSG_NON_DEDUCTIBLE')?.employee;
  const crds = rateByCode('CRDS')?.employee;
  return (
    (nonDed?.kind === 'fixed' ? nonDed.rate : 2.4) + (crds?.kind === 'fixed' ? crds.rate : 0.5)
  );
}

/** Brut mensuel → net, à partir d'un taux de charges choisi librement plutôt que du
 *  détail du barème légal (voir `grossToNet`). */
export function grossToNetFlat(input: FlatCalcInput): CalcResult {
  const gross = Math.max(0, input.grossMonthly);
  if (gross === 0) return { ...EMPTY, lines: [] };

  const rate = clamp(input.chargeRatePct, 0, 100);
  const other = Math.max(0, input.otherDeductions ?? 0);
  const contributions = roundCents((gross * rate) / 100);
  const netBeforeTax = roundCents(gross - contributions - other);
  const reintegration = roundCents((csgBase(gross) * fixedReintegrationRate()) / 100);
  const netTaxable = roundCents(netBeforeTax + reintegration);
  const custom = input.pasRate != null && Number.isFinite(input.pasRate) ? Math.max(0, input.pasRate) : null;
  const pasRate = custom ?? neutralPasRate(netTaxable);
  const pas = roundCents((Math.max(0, netTaxable) * pasRate) / 100);

  return {
    gross,
    lines: [],
    contributions,
    otherDeductions: other,
    netBeforeTax,
    netTaxable,
    pasRate,
    pasIsDefault: custom == null,
    pas,
    netPaid: roundCents(netBeforeTax - pas),
  };
}

/** Net → brut mensuel, à taux de charges choisi librement. */
export function grossFromNetFlat(
  target: number,
  kind: NetKind,
  opts: Omit<FlatCalcInput, 'grossMonthly'>,
): number | null {
  const rate = clamp(opts.chargeRatePct, 0, 100);
  const other = Math.max(0, opts.otherDeductions ?? 0);
  const custom = opts.pasRate != null && Number.isFinite(opts.pasRate) ? Math.max(0, opts.pasRate) : null;

  return searchGrossForNet(target, (g) => {
    const contributions = (g * rate) / 100;
    const nb = g - contributions - other;
    if (kind === 'beforeTax') return nb;
    const nt = nb + (csgBase(g) * fixedReintegrationRate()) / 100;
    const r = custom ?? neutralPasRate(nt);
    return nb - (Math.max(0, nt) * r) / 100;
  });
}
