import { approxEqual, formatEuro, roundCents } from '../../lib/money';
import type { Finding } from '../findings';
import type { AnalysisContext } from '../context';

const whatToDo =
  'Demandez à votre service paie le détail du calcul. En cas d’écart confirmé, une régularisation apparaîtra simplement sur une paie suivante.';

/** Somme des éléments de rémunération = salaire brut affiché ? */
export function checkGrossComposition(ctx: AnalysisContext): Finding[] {
  const { grossItems, gross } = ctx.payslip;
  if (!ctx.grossConfident || grossItems.length === 0) return [];
  const confident = grossItems.filter((g) => g.amount.confidence >= 0.5);
  if (confident.length === 0) return [];

  const sum = roundCents(confident.reduce((s, g) => s + g.amount.value, 0));
  const tol = Math.max(0.05, gross.value * 0.005);
  if (approxEqual(sum, gross.value, tol)) return [];

  return [
    {
      id: 'brut:composition',
      code: 'BRUT_INCOHERENT',
      severity: 'erreur',
      scope: 'BRUT',
      title: 'Le salaire brut ne correspond pas au détail',
      detail:
        `La somme des éléments de rémunération lus (${formatEuro(sum)}) ne correspond pas ` +
        `au salaire brut affiché (${formatEuro(gross.value)}), soit un écart de ` +
        `${formatEuro(Math.abs(sum - gross.value))}. ` +
        'Cet écart peut venir d’une prime, d’une absence ou d’un rappel mal pris en compte — ou d’une ligne que PayLumo n’a pas su lire. ' +
        whatToDo,
      expected: formatEuro(sum),
      found: formatEuro(gross.value),
      impactEuro: roundCents(sum - gross.value),
    },
  ];
}

/** brut − cotisations salariales ≈ net à payer avant impôt. */
export function checkGrossToNet(ctx: AnalysisContext): Finding[] {
  const p = ctx.payslip;
  if (!ctx.grossConfident) return [];
  const salAmounts = p.contributions
    .map((c) => c.employee?.amount)
    .filter((v): v is NonNullable<typeof v> => !!v && v.confidence >= 0.5);
  if (salAmounts.length < 4) return [];

  const totalSal = roundCents(salAmounts.reduce((s, v) => s + Math.abs(v.value), 0));
  const expectedNet = roundCents(p.gross.value - totalSal);

  const findings: Finding[] = [];
  const netAvant = p.netAvantImpot?.value;
  const target = netAvant ?? (p.netAPayer.value && p.pas?.amount ? roundCents(p.netAPayer.value + p.pas.amount.value) : undefined);

  if (target != null) {
    const tol = Math.max(1, p.gross.value * 0.01);
    if (!approxEqual(expectedNet, target, tol)) {
      findings.push({
        id: 'net:brut-to-net',
        code: 'NET_INCOHERENT',
        severity: 'avertissement',
        scope: 'NET',
        title: 'Passage du brut au net à vérifier',
        detail:
          `Brut (${formatEuro(p.gross.value)}) moins le total des cotisations salariales lues ` +
          `(${formatEuro(totalSal)}) donne ${formatEuro(expectedNet)}, alors que le net avant impôt ` +
          `du bulletin est ${formatEuro(target)}. ` +
          'Un écart modéré vient souvent d’une ligne de cotisation non lue par PayLumo. ' +
          whatToDo,
        expected: formatEuro(expectedNet),
        found: formatEuro(target),
      });
    }
  }

  // net à payer − PAS
  if (p.netAvantImpot?.value != null && p.pas?.amount?.value != null && p.netAPayer.value > 0) {
    const expectedPaye = roundCents(p.netAvantImpot.value - p.pas.amount.value);
    if (!approxEqual(expectedPaye, p.netAPayer.value, 0.05)) {
      findings.push({
        id: 'net:apres-pas',
        code: 'NET_INCOHERENT',
        severity: 'avertissement',
        scope: 'NET',
        title: 'Net payé ≠ net avant impôt − prélèvement à la source',
        detail:
          `Net avant impôt (${formatEuro(p.netAvantImpot.value)}) − prélèvement à la source ` +
          `(${formatEuro(p.pas.amount.value)}) = ${formatEuro(expectedPaye)}, ` +
          `mais le net payé affiché est ${formatEuro(p.netAPayer.value)}. ` +
          whatToDo,
        expected: formatEuro(expectedPaye),
        found: formatEuro(p.netAPayer.value),
        impactEuro: roundCents(p.netAPayer.value - expectedPaye),
      });
    }
  }

  return findings;
}

/** Prélèvement à la source = taux × net imposable ? */
export function checkPas(ctx: AnalysisContext): Finding[] {
  const p = ctx.payslip;
  const rate = p.pas?.rate?.value;
  const amount = p.pas?.amount?.value;
  const baseImposable = p.pas?.base?.value ?? p.netImposable?.value;
  if (rate == null || amount == null || baseImposable == null) return [];
  if ((p.pas?.rate?.confidence ?? 0) < 0.5) return [];

  const theoretical = roundCents((baseImposable * rate) / 100);
  const tol = Math.max(0.5, theoretical * 0.02);
  if (approxEqual(amount, theoretical, tol)) return [];

  return [
    {
      id: 'pas:calcul',
      code: 'PAS_INCOHERENT',
      severity: 'avertissement',
      scope: 'NET',
      title: 'Prélèvement à la source à vérifier',
      detail:
        `Base imposable (${formatEuro(baseImposable)}) × taux (${rate.toLocaleString('fr-FR')} %) = ` +
        `${formatEuro(theoretical)}, mais le bulletin prélève ${formatEuro(amount)}. ` +
        'Le taux vient de l’administration fiscale ; s’il vous semble erroné, vérifiez-le sur impots.gouv.fr (rubrique « Prélèvement à la source »).',
      expected: formatEuro(theoretical),
      found: formatEuro(amount),
      impactEuro: roundCents(amount - theoretical),
    },
  ];
}
