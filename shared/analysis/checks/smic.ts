import { formatEuro, roundCents } from '../../lib/money.js';
import { DUREE_LEGALE_MENSUELLE } from '../../data/params.js';
import type { Finding, PassedCheck } from '../findings.js';
import type { AnalysisContext } from '../context.js';

/** Entrées du contrôle SMIC, ou null si non applicable (hors référentiel, brut non fiable). */
function smicInputs(ctx: AnalysisContext) {
  const p = ctx.payslip;
  if (!ctx.periodCovered || !ctx.grossConfident) return null;
  const heures = p.time.heuresContrat?.value;
  const baseItem = p.grossItems.find((g) => g.kind === 'base' || /salaire de base|salaire mensuel|appointements/i.test(g.label));
  return { heures, salaireBase: baseItem?.amount.value };
}

/** Le salaire respecte-t-il le SMIC applicable à la période ? */
export function checkSmic(ctx: AnalysisContext): Finding[] {
  const inp = smicInputs(ctx);
  if (!inp) return [];
  const { heures, salaireBase } = inp;

  const smic = ctx.smic;
  const findings: Finding[] = [];

  // Taux horaire (si heures connues et salaire de base connu)
  if (heures && heures > 0 && salaireBase && salaireBase > 0) {
    const tauxHoraire = salaireBase / heures;
    if (tauxHoraire < smic.horaire - 0.01) {
      const manque = roundCents((smic.horaire - tauxHoraire) * heures);
      findings.push({
        id: 'smic:horaire',
        code: 'SMIC_NON_RESPECTE',
        severity: 'erreur',
        scope: 'BRUT',
        title: 'Salaire horaire sous le SMIC',
        detail:
          `Le salaire de base (${formatEuro(salaireBase)} pour ${heures.toLocaleString('fr-FR')} h) ` +
          `revient à ${formatEuro(tauxHoraire)} de l’heure, en dessous du SMIC applicable ` +
          `(${formatEuro(smic.horaire)} de l’heure au ${new Date(smic.from).toLocaleDateString('fr-FR')}). ` +
          'Sauf abattement légal spécifique (apprenti, contrat de professionnalisation…), le SMIC est un minimum garanti par la loi. ' +
          'Signalez-le à votre service paie : la différence doit vous être versée.',
        expected: `≥ ${formatEuro(smic.horaire)} / h`,
        found: `${formatEuro(tauxHoraire)} / h`,
        impactEuro: manque,
      });
    }
  }

  // Salaire mensuel temps plein
  const tempsPlein = !heures || Math.abs(heures - DUREE_LEGALE_MENSUELLE) < 1;
  if (tempsPlein && salaireBase && salaireBase > 0 && salaireBase < smic.mensuel151_67 - 1) {
    findings.push({
      id: 'smic:mensuel',
      code: 'SMIC_NON_RESPECTE',
      severity: 'erreur',
      scope: 'BRUT',
      title: 'Salaire mensuel sous le SMIC (temps plein)',
      detail:
        `Pour un temps plein, le salaire de base (${formatEuro(salaireBase)}) est inférieur au SMIC ` +
        `mensuel applicable (${formatEuro(smic.mensuel151_67)}). ` +
        'Le SMIC est un minimum garanti par la loi : signalez-le à votre service paie, la différence doit vous être versée.',
      expected: `≥ ${formatEuro(smic.mensuel151_67)}`,
      found: formatEuro(salaireBase),
      impactEuro: roundCents(smic.mensuel151_67 - salaireBase),
    });
  }

  return findings;
}

const CAPPED_CANONICALS = new Set(['VIEILLESSE_PLAFONNEE', 'RETRAITE_COMPLEMENTAIRE_T1', 'CEG_T1']);

/** Lignes plafonnées dont la base est lisible, ou [] si le contrôle n'est pas applicable. */
function cappedLines(ctx: AnalysisContext) {
  if (!ctx.periodCovered) return [];
  return ctx.payslip.contributions.filter(
    (l) => l.canonical && CAPPED_CANONICALS.has(l.canonical) && l.base && l.base.confidence >= 0.6,
  );
}

/** SMIC et plafond de la Sécurité sociale : vérifiés sans écart. */
export function passedSmicChecks(ctx: AnalysisContext, findings: Finding[]): PassedCheck[] {
  const out: PassedCheck[] = [];

  const smic = smicInputs(ctx);
  if (smic && smic.salaireBase && smic.salaireBase > 0 && !findings.some((f) => f.code === 'SMIC_NON_RESPECTE')) {
    const horaire = smic.heures && smic.heures > 0 ? smic.salaireBase / smic.heures : null;
    out.push({
      id: 'ok:smic',
      title: 'SMIC respecté',
      detail:
        horaire != null
          ? `Salaire de base ≈ ${formatEuro(horaire)} de l’heure, au-dessus du SMIC applicable (${formatEuro(ctx.smic.horaire)}).`
          : `Salaire de base ${formatEuro(smic.salaireBase)}, au-dessus du SMIC mensuel applicable (${formatEuro(ctx.smic.mensuel151_67)}).`,
    });
  }

  if (cappedLines(ctx).length > 0 && !findings.some((f) => f.code === 'PLAFOND_DEPASSE')) {
    out.push({
      id: 'ok:plafond',
      title: 'Plafond de la Sécurité sociale bien appliqué',
      detail: `Les cotisations plafonnées ne dépassent pas le plafond mensuel ${ctx.referenceYear} (${formatEuro(ctx.pmss)}).`,
    });
  }
  return out;
}

/** Base des cotisations plafonnées ≤ 1 PMSS. */
export function checkPlafond(ctx: AnalysisContext): Finding[] {
  const findings: Finding[] = [];
  for (const line of cappedLines(ctx)) {
    if (!line.base) continue;
    if (line.base.value > ctx.pmss + 1) {
      findings.push({
        id: `plafond:${line.canonical}`,
        code: 'PLAFOND_DEPASSE',
        severity: 'avertissement',
        scope: line.category,
        canonical: line.canonical,
        lineLabel: line.label,
        title: `Base plafonnée au-dessus du plafond — ${line.label}`,
        detail:
          `La base de « ${line.label} » (${formatEuro(line.base.value)}) dépasse le plafond mensuel ` +
          `de la Sécurité sociale (${formatEuro(ctx.pmss)}). Cette cotisation ne devrait porter que sur la tranche 1. ` +
          'Que faire : demandez la correction à votre service paie.',
        expected: `≤ ${formatEuro(ctx.pmss)}`,
        found: formatEuro(line.base.value),
      });
    }
  }
  return findings;
}
