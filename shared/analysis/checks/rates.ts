import { approxEqual, formatEuro, formatPercent, roundCents } from '../../lib/money';
import { DEFAULT_RATE_TOLERANCE_POINTS, RATES_2026, rateByCode, type RateRef } from '../../data/rates2026';
import { explainOf } from '../../data/explanations.fr';
import { taxonomyByCode } from '../../data/taxonomy';
import type { ContributionLine } from '../../parsing/model';
import type { Finding } from '../findings';
import { expectedBase, isExpected, resolveRate, type AnalysisContext } from '../context';

const MIN_CONF = 0.55;

function whatToDo(): string {
  return 'Le plus simple : demandez à votre service paie de vous expliquer cette ligne. Une différence de paramétrage se corrige le plus souvent sans formalité.';
}

function lineBase(line: ContributionLine, ref: RateRef, ctx: AnalysisContext): number | null {
  if (line.base && line.base.confidence >= 0.5 && line.base.value > 0) return line.base.value;
  return expectedBase(ref.assiette, ctx);
}

/** Écarts de taux et de calcul, ligne par ligne. */
export function checkRateLines(ctx: AnalysisContext): Finding[] {
  const findings: Finding[] = [];
  const { contributions } = ctx.payslip;

  for (const line of contributions) {
    if (!line.canonical) continue;
    const ref = rateByCode(line.canonical);
    if (!ref) continue;
    const tol = ref.tolerancePoints ?? DEFAULT_RATE_TOLERANCE_POINTS;
    const label = taxonomyByCode(line.canonical)?.label ?? line.label;

    for (const side of ['employee', 'employer'] as const) {
      const part = line[side];
      if (!part) continue;
      const spec = ref[side];
      const expected = resolveRate(spec, ctx);
      const foundRate = part.rate?.value;
      const base = lineBase(line, ref, ctx);

      // 1) Écart de taux
      if (
        expected != null &&
        foundRate != null &&
        (part.rate?.confidence ?? 0) >= MIN_CONF &&
        spec?.kind !== 'variable'
      ) {
        const isMin = spec?.kind === 'min';
        const off = isMin ? foundRate < expected - tol : !approxEqual(foundRate, expected, tol);
        if (off) {
          const impact =
            side === 'employee' && base != null
              ? roundCents(((foundRate - expected) / 100) * base)
              : undefined;
          findings.push({
            id: `taux:${line.canonical}:${side}`,
            code: 'TAUX_INCORRECT',
            severity: side === 'employee' ? 'erreur' : 'avertissement',
            scope: ref.category,
            canonical: line.canonical,
            lineLabel: label,
            title: `Taux ${side === 'employee' ? 'salarial' : 'patronal'} inhabituel — ${label}`,
            detail:
              `${explainOf(line.canonical)?.short ?? ''} Le taux ${
                side === 'employee' ? 'salarial' : 'patronal'
              } lu sur le bulletin diffère du taux ${isMin ? 'minimum ' : ''}légal 2026. ` +
              (side === 'employer'
                ? 'Cela ne change pas votre net ; c’est plutôt un point de paramétrage à revoir côté employeur. '
                : '') +
              whatToDo(),
            expected: `${isMin ? '≥ ' : ''}${formatPercent(expected)}`,
            found: formatPercent(foundRate),
            impactEuro: impact,
          });
        }
      }

      // 2) Cohérence base × taux = montant
      const amount = part.amount?.value;
      if (
        amount != null &&
        foundRate != null &&
        base != null &&
        (part.amount?.confidence ?? 0) >= MIN_CONF &&
        (part.rate?.confidence ?? 0) >= MIN_CONF
      ) {
        const theoretical = roundCents((base * foundRate) / 100);
        const tolEur = Math.max(0.05, theoretical * 0.01);
        if (!approxEqual(amount, theoretical, tolEur)) {
          findings.push({
            id: `calc:${line.canonical}:${side}`,
            code: 'CALCUL_INCOHERENT',
            severity: 'avertissement',
            scope: ref.category,
            canonical: line.canonical,
            lineLabel: label,
            title: `Montant incohérent avec base × taux — ${label}`,
            detail:
              `Sur cette ligne, base (${formatEuro(base)}) × taux (${formatPercent(
                foundRate,
              )}) donne ${formatEuro(theoretical)}, mais le bulletin affiche ${formatEuro(amount)}. ` +
              whatToDo(),
            expected: formatEuro(theoretical),
            found: formatEuro(amount),
            impactEuro:
              side === 'employee' ? roundCents(amount - theoretical) : undefined,
          });
        }
      }
    }

    // 3) Assiette suspecte
    if (line.base && line.base.confidence >= 0.6 && ctx.grossConfident) {
      const exp = expectedBase(ref.assiette, ctx);
      if (exp != null && exp > 0 && ref.assiette !== 'csg') {
        const tolEur = Math.max(1, exp * 0.02);
        if (!approxEqual(line.base.value, exp, tolEur)) {
          findings.push({
            id: `assiette:${line.canonical}`,
            code: 'ASSIETTE_SUSPECTE',
            severity: 'avertissement',
            scope: ref.category,
            canonical: line.canonical,
            lineLabel: label,
            title: `Base de cotisation inattendue — ${label}`,
            detail:
              `La base attendue pour « ${label} » est ${formatEuro(exp)} ` +
              `(${assietteLabel(ref.assiette)}), or le bulletin indique ${formatEuro(line.base.value)}. ` +
              'Une base différente peut être normale (proratisation, régularisation) mais mérite vérification. ' +
              whatToDo(),
            expected: formatEuro(exp),
            found: formatEuro(line.base.value),
          });
        }
      }
    }
  }

  return findings;
}

/** Cotisations obligatoires absentes du bulletin. */
export function checkMissing(ctx: AnalysisContext): Finding[] {
  if (ctx.payslip.contributions.length < 5 || ctx.payslip.meta.parseConfidence < 0.6) return [];
  const present = new Set(ctx.payslip.contributions.map((c) => c.canonical).filter(Boolean));
  const findings: Finding[] = [];

  const critical = new Set([
    'VIEILLESSE_PLAFONNEE',
    'RETRAITE_COMPLEMENTAIRE_T1',
    'CEG_T1',
    'CSG_DEDUCTIBLE',
  ]);

  for (const ref of RATES_2026) {
    if (!isExpected(ref, ctx)) continue;
    if (present.has(ref.code)) continue;
    // CSG non déd. / CRDS peuvent être fusionnées
    if (
      (ref.code === 'CSG_NON_DEDUCTIBLE' || ref.code === 'CRDS') &&
      present.has('CSG_CRDS_NON_DEDUCTIBLE')
    )
      continue;
    const label = taxonomyByCode(ref.code)?.label ?? ref.label;
    findings.push({
      id: `manquante:${ref.code}`,
      code: 'COTISATION_MANQUANTE',
      severity: critical.has(ref.code) ? 'erreur' : 'avertissement',
      scope: ref.category,
      canonical: ref.code,
      lineLabel: label,
      title: `Cotisation attendue absente — ${label}`,
      detail:
        `${explainOf(ref.code)?.short ?? ''} Cette cotisation est normalement obligatoire ` +
        `pour votre situation (${describeExpectation(ref)}) mais n’a pas été trouvée sur le bulletin. ` +
        'Il est possible qu’elle porte un libellé non reconnu. ' +
        whatToDo(),
    });
  }
  return findings;
}

/** Lignes non identifiées (informatif). */
export function checkUnknownLines(ctx: AnalysisContext): Finding[] {
  const findings: Finding[] = [];
  for (const line of ctx.payslip.contributions) {
    if (line.canonical) continue;
    const amt = line.employee?.amount?.value ?? line.employer?.amount?.value ?? 0;
    if (Math.abs(amt) < 0.5) continue;
    findings.push({
      id: `inconnue:${line.label}`,
      code: 'LIGNE_INCONNUE',
      severity: 'info',
      scope: line.category,
      lineLabel: line.label,
      title: `Ligne non reconnue — ${line.label}`,
      detail:
        'PayLumo n’a pas pu rattacher cette ligne à une cotisation connue de son référentiel 2026. ' +
        'C’est souvent normal (cotisation propre à votre branche, retenue spécifique). Au besoin, votre service paie pourra vous préciser à quoi elle correspond. ',
      found: line.employee?.amount ? formatEuro(line.employee.amount.value) : undefined,
    });
  }
  return findings;
}

function assietteLabel(kind: RateRef['assiette']): string {
  switch (kind) {
    case 'brut_total':
      return 'la totalité du salaire brut';
    case 'tranche_1':
      return 'la tranche 1, jusqu’à 1 plafond';
    case 'tranche_2':
      return 'la tranche 2, entre 1 et 8 plafonds';
    case 'tranche_1_2':
      return 'les tranches 1 et 2';
    case 'tranche_B':
      return 'la tranche B, entre 1 et 4 plafonds';
    case 'tranche_AB':
      return 'les tranches A et B, jusqu’à 4 plafonds';
    case 'chomage':
      return 'le salaire dans la limite de 4 plafonds';
    case 'csg':
      return '98,25 % du brut';
    case 'none':
      return 'assiette spécifique';
  }
}

function describeExpectation(ref: RateRef): string {
  const bits: string[] = [];
  if (ref.expected?.statut) bits.push(`statut ${ref.expected.statut}`);
  if (ref.expected?.regime === 'alsace-moselle') bits.push('régime local Alsace-Moselle');
  if (ref.expected?.abovePmssOnly) bits.push('rémunération supérieure au plafond');
  return bits.length ? bits.join(', ') : 'tous les salariés du privé';
}
