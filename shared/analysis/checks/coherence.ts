import { approxEqual, formatEuro, roundCents } from '../../lib/money.js';
import type { Finding, PassedCheck } from '../findings.js';
import type { AnalysisContext } from '../context.js';

const whatToDo =
  'Un écart modéré est souvent normal (ligne non lue, régularisation…). À faire préciser par votre gestionnaire de paie.';

/** Éléments de rémunération exploitables, ou null si le contrôle n'est pas applicable. */
function compositionInputs(ctx: AnalysisContext) {
  const { grossItems } = ctx.payslip;
  if (!ctx.grossConfident || grossItems.length === 0) return null;
  const confident = grossItems.filter((g) => g.amount.confidence >= 0.5);
  if (confident.length === 0) return null;
  return { confident, sum: roundCents(confident.reduce((s, g) => s + g.amount.value, 0)) };
}

/** Somme des éléments de rémunération = salaire brut affiché ? */
export function checkGrossComposition(ctx: AnalysisContext): Finding[] {
  const { gross } = ctx.payslip;
  const inp = compositionInputs(ctx);
  if (!inp) return [];
  const { sum } = inp;
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

/** Entrées du passage brut → net, ou null si le contrôle n'est pas applicable. */
function grossToNetInputs(ctx: AnalysisContext) {
  const p = ctx.payslip;
  if (!ctx.grossConfident) return null;
  const salAmounts = p.contributions
    .map((c) => c.employee?.amount)
    .filter((v): v is NonNullable<typeof v> => !!v && v.confidence >= 0.5);
  if (salAmounts.length < 4) return null;

  // Le total salarial affiché sur le bulletin (ligne « Total des cotisations »)
  // est plus fiable que la somme ligne à ligne, qui peut manquer une ligne.
  const bulletinTotalSal = p.contributionsTotal?.employee?.value;
  const totalSal =
    bulletinTotalSal != null && bulletinTotalSal > 0
      ? roundCents(bulletinTotalSal)
      : roundCents(salAmounts.reduce((s, v) => s + Math.abs(v.value), 0));
  const expectedNet = roundCents(p.gross.value - totalSal);
  const netAvant = p.netAvantImpot?.value;
  const target =
    netAvant ??
    (p.netAPayer.value && p.pas?.amount ? roundCents(p.netAPayer.value + p.pas.amount.value) : undefined);
  return { totalSal, expectedNet, target };
}

/** brut − cotisations salariales ≈ net à payer avant impôt. */
export function checkGrossToNet(ctx: AnalysisContext): Finding[] {
  const p = ctx.payslip;
  const inp = grossToNetInputs(ctx);
  if (!inp) return [];
  const { totalSal, expectedNet, target } = inp;

  const findings: Finding[] = [];

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

/** Entrées du contrôle du prélèvement à la source, ou null si non applicable. */
function pasInputs(ctx: AnalysisContext) {
  const p = ctx.payslip;
  const rate = p.pas?.rate?.value;
  const amount = p.pas?.amount?.value;
  const baseImposable = p.pas?.base?.value ?? p.netImposable?.value;
  if (rate == null || amount == null || baseImposable == null) return null;
  if ((p.pas?.rate?.confidence ?? 0) < 0.5) return null;
  return { rate, amount, baseImposable };
}

/** Prélèvement à la source = taux × net imposable ? */
export function checkPas(ctx: AnalysisContext): Finding[] {
  const inp = pasInputs(ctx);
  if (!inp) return [];
  const { rate, amount, baseImposable } = inp;

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

/** Cohérences brut / net / prélèvement à la source vérifiées sans écart. */
export function passedCoherenceChecks(ctx: AnalysisContext, findings: Finding[]): PassedCheck[] {
  const p = ctx.payslip;
  const has = (id: string) => findings.some((f) => f.id === id);
  const out: PassedCheck[] = [];

  const comp = compositionInputs(ctx);
  if (comp && !has('brut:composition')) {
    out.push({
      id: 'ok:brut',
      title: 'Le salaire brut correspond au détail',
      detail: `Les ${comp.confident.length} éléments de rémunération lus totalisent bien ${formatEuro(p.gross.value)}.`,
    });
  }

  const net = grossToNetInputs(ctx);
  if (net && net.target != null && !has('net:brut-to-net')) {
    out.push({
      id: 'ok:brut-net',
      title: 'Passage du brut au net cohérent',
      detail: `Brut − cotisations salariales = ${formatEuro(net.expectedNet)}, en accord avec le net avant impôt du bulletin.`,
    });
  }
  if (
    net &&
    p.netAvantImpot?.value != null &&
    p.pas?.amount?.value != null &&
    p.netAPayer.value > 0 &&
    !has('net:apres-pas')
  ) {
    out.push({
      id: 'ok:net-pas',
      title: 'Net payé = net avant impôt − prélèvement à la source',
      detail: `${formatEuro(p.netAvantImpot.value)} − ${formatEuro(p.pas.amount.value)} = ${formatEuro(p.netAPayer.value)}.`,
    });
  }

  const pas = pasInputs(ctx);
  if (pas && !has('pas:calcul')) {
    out.push({
      id: 'ok:pas',
      title: 'Prélèvement à la source cohérent avec le taux affiché',
      detail: `${formatEuro(pas.baseImposable)} × ${pas.rate.toLocaleString('fr-FR')} % ≈ ${formatEuro(pas.amount)}.`,
    });
  }
  return out;
}
