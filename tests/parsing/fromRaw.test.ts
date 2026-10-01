import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RawExtraction } from '@shared/extraction';
import { payslipFromRaw } from '@shared/parsing/fromRaw';
import { analyzePayslip } from '@shared/analysis/engine';

function loadRaw(name: string) {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/ai', name), 'utf8'));
  return RawExtraction.parse(raw);
}

describe('payslipFromRaw + analyse', () => {
  it('extraction IA « saine » → Payslip cohérent, aucune erreur', () => {
    const p = payslipFromRaw(loadRaw('clarified-sain.raw.json'));

    expect(p.meta.editor).toBe('ai');
    expect(p.meta.parseConfidence).toBeGreaterThan(0.9);
    expect(p.employee.statut).toBe('cadre');
    expect(p.gross.value).toBeCloseTo(3488.46, 2);
    expect(p.netAPayer.value).toBeCloseTo(2631.05, 2);

    const codes = p.contributions.map((c) => c.canonical);
    expect(codes).toContain('VIEILLESSE_PLAFONNEE');
    expect(codes).toContain('APEC');
    expect(codes).toContain('CSG_DEDUCTIBLE');

    const result = analyzePayslip(p);
    const erreurs = result.findings.filter((f) => f.severity === 'erreur');
    if (erreurs.length) console.log(erreurs);
    expect(erreurs).toHaveLength(0);
    expect(result.summary.canAnalyze).toBe(true);
  });

  it('taux vieillesse faussé dans l’extraction IA → TAUX_INCORRECT', () => {
    const raw = loadRaw('clarified-sain.raw.json');
    const line = raw.contributions.find((c) => c.label === 'Sécurité sociale plafonnée')!;
    line.employeeRate = 7.3;
    line.employeeAmount = Math.round(3488.46 * 7.3) / 100;

    const result = analyzePayslip(payslipFromRaw(raw));
    const f = result.findings.find(
      (x) => x.code === 'TAUX_INCORRECT' && x.canonical === 'VIEILLESSE_PLAFONNEE',
    );
    expect(f).toBeDefined();
    expect(f!.impactEuro).toBeGreaterThan(5);
  });

  it('CEG tranche 1 et tranche 2 sur le même bulletin : pas de faux TAUX_INCORRECT', () => {
    // Bug réel remonté par un utilisateur : la ligne « CEG Tranche 2 » (1,08 %, correct)
    // était rattachée au code CEG_T1 (attendu 0,86 %) à cause d'une regex de taxonomie
    // mal ancrée qui matchait le simple mot « tranche », quel que soit son numéro.
    const raw = loadRaw('clarified-sain.raw.json');
    raw.contributions.push({
      label: 'CEG tranche 2',
      section: 'RETRAITE',
      base: 432.3,
      employeeRate: 1.08,
      employeeAmount: 4.67,
      employerRate: 1.62,
      employerAmount: 7.0,
    });

    const p = payslipFromRaw(raw);
    const t1 = p.contributions.find((c) => c.label === 'CEG tranche 1');
    const t2 = p.contributions.find((c) => c.label === 'CEG tranche 2');
    expect(t1?.canonical).toBe('CEG_T1');
    expect(t2?.canonical).toBe('CEG_T2');

    const result = analyzePayslip(p);
    expect(result.findings.filter((f) => f.code === 'TAUX_INCORRECT' && f.canonical?.startsWith('CEG'))).toEqual([]);
  });

  it('écarte les lignes de total / sous-total glissées dans contributions[]', () => {
    const raw = loadRaw('clarified-sain.raw.json');
    const nContribs = raw.contributions.length;

    raw.contributions.push(
      {
        label: 'Total des cotisations et contributions',
        section: null,
        base: null,
        employeeRate: null,
        employeeAmount: 748.46,
        employerRate: null,
        employerAmount: 1230.74,
      },
      {
        label: "Autres contributions dues par l'employeur",
        section: 'AUTRES',
        base: null,
        employeeRate: null,
        employeeAmount: null,
        employerRate: null,
        employerAmount: 13.96,
      },
      {
        label: 'Exonérations, écrêt. et allègm. de cotisations',
        section: 'AUTRES',
        base: null,
        employeeRate: null,
        employeeAmount: null,
        employerRate: null,
        employerAmount: 400,
      },
    );

    const p = payslipFromRaw(raw);
    expect(p.contributions).toHaveLength(nContribs);
    expect(p.contributions.some((c) => /^total/i.test(c.label))).toBe(false);

    // le coût employeur reste piloté par la ligne récap du bulletin, pas gonflé
    const perLinePat = p.contributions.reduce(
      (s, c) => s + Math.abs(c.employer?.amount?.value ?? 0),
      0,
    );
    expect(perLinePat).toBeLessThan(1500);
    expect(p.contributionsTotal?.employer?.value).toBeCloseTo(1230.74, 2);
    expect(p.employerCost?.value).toBeCloseTo(4719.2, 2);
  });

  it('écarte une ligne récap (« Total salaire brut ») glissée dans grossItems[]', () => {
    // Bug réel remonté par un utilisateur : sur son bulletin, l'IA avait relu à
    // la fois « Appointement » (ligne détaillée) et « Total salaire brut »
    // (ligne récap de pied de bulletin) comme deux grossItems distincts. La
    // somme additionnait donc le récap à la ligne qu'il récapitulait déjà,
    // ce qui faussait la cohérence du brut (double comptage) → faux BRUT_INCOHERENT.
    const raw = loadRaw('clarified-sain.raw.json');
    const nItems = raw.grossItems.length;
    raw.grossItems.push({
      label: 'Total salaire brut',
      kind: 'autre',
      base: null,
      rate: null,
      amount: raw.gross as number,
    });

    const p = payslipFromRaw(raw);
    expect(p.grossItems).toHaveLength(nItems);
    expect(p.grossItems.some((g) => /^total/i.test(g.label))).toBe(false);

    const result = analyzePayslip(p);
    expect(result.findings.some((f) => f.code === 'BRUT_INCOHERENT')).toBe(false);
  });

  it('les lignes « non soumis » de grossItems[] ne comptent pas dans le brut', () => {
    // Bug réel remonté par un utilisateur : une indemnité de prévoyance et un
    // panier, tous deux explicitement marqués « non soumis » sur le bulletin,
    // étaient additionnés comme de vraies composantes du brut, faussant la
    // cohérence (écart de 539,26 € signalé à tort comme une anomalie).
    const raw = loadRaw('clarified-sain.raw.json');
    raw.grossItems.push(
      { label: 'IND.PREVOYANCE N. SOUMIS', kind: 'indemnite', base: 26, rate: null, amount: 439.45 },
      { label: 'PANIER NON SOUMIS', kind: 'autre', base: 8, rate: null, amount: 83.2 },
    );

    const p = payslipFromRaw(raw);
    // toujours affichées (ce sont de vraies lignes du bulletin)
    expect(p.grossItems.some((g) => g.label === 'IND.PREVOYANCE N. SOUMIS')).toBe(true);
    expect(p.grossItems.some((g) => g.label === 'PANIER NON SOUMIS')).toBe(true);

    const result = analyzePayslip(p);
    expect(result.findings.some((f) => f.code === 'BRUT_INCOHERENT')).toBe(false);
  });

  it('écarte « Forfait jours » de grossItems[] : ce n’est pas un montant', () => {
    // Bug réel remonté par un utilisateur (cadre au forfait jours) : le repère
    // contractuel « FORFAIT JOURS 217,00 » (217 jours/an, pas 217 €) figurait
    // dans un encart à côté du salaire de base, formaté comme un montant — et
    // a été lu comme une composante du brut, faussant à la fois l'affichage
    // (« 217,00 € » n'existe pas) et la cohérence du brut.
    const raw = loadRaw('clarified-sain.raw.json');
    const nItems = raw.grossItems.length;
    raw.grossItems.push({ label: 'FORFAIT JOURS', kind: 'autre', base: null, rate: null, amount: 217 });

    const p = payslipFromRaw(raw);
    // contrairement à « non soumis », ce n'est pas une vraie ligne de
    // rémunération : elle ne doit même pas être affichée.
    expect(p.grossItems).toHaveLength(nItems);
    expect(p.grossItems.some((g) => /forfait jours?/i.test(g.label))).toBe(false);

    const result = analyzePayslip(p);
    expect(result.findings.some((f) => f.code === 'BRUT_INCOHERENT')).toBe(false);
  });

  it('ligne de régularisation à base négative : pas de faux CALCUL_INCOHERENT', () => {
    // Sur un vrai bulletin, une ligne de régularisation (tranches Agirc-Arrco
    // recalculées progressivement, correction d'une période antérieure…)
    // affiche couramment une base négative, avec un montant toujours positif
    // (comme tous les montants — voir fromRaw.ts). La cohérence base × taux
    // doit être vérifiée en valeur absolue, pas en substituant une base « du
    // mois en cours » qui n'a rien à voir avec la ligne lue.
    const raw = loadRaw('clarified-sain.raw.json');
    raw.contributions.push({
      label: 'CEG tranche 1',
      section: null,
      base: -100,
      employeeRate: 0.86,
      employeeAmount: 0.86, // |-100 × 0,86 %| = 0,86 € — cohérent
      employerRate: null,
      employerAmount: null,
    });
    const result = analyzePayslip(payslipFromRaw(raw));
    expect(
      result.findings.some((f) => f.code === 'CALCUL_INCOHERENT' && f.canonical === 'CEG_T1'),
    ).toBe(false);
  });

  it('ligne de régularisation à base négative : un vrai écart reste détecté', () => {
    const raw = loadRaw('clarified-sain.raw.json');
    raw.contributions.push({
      label: 'CEG tranche 1',
      section: null,
      base: -100,
      employeeRate: 0.86,
      employeeAmount: 5, // ne correspond pas à |-100 × 0,86 %| = 0,86 €
      employerRate: null,
      employerAmount: null,
    });
    const result = analyzePayslip(payslipFromRaw(raw));
    const f = result.findings.find((x) => x.code === 'CALCUL_INCOHERENT' && x.canonical === 'CEG_T1');
    expect(f).toBeDefined();
  });

  it('bulletin d’une autre année → lecture seule, taux non comparés', () => {
    const raw = loadRaw('clarified-sain.raw.json');
    raw.period = { month: 6, year: 2025 };
    // taux vieillesse volontairement faux : ne doit PAS lever TAUX_INCORRECT (année hors référentiel)
    const line = raw.contributions.find((c) => c.label === 'Sécurité sociale plafonnée')!;
    line.employeeRate = 7.3;

    const result = analyzePayslip(payslipFromRaw(raw));

    expect(result.summary.periodCovered).toBe(false);
    expect(result.summary.periodYear).toBe(2025);
    expect(result.summary.canAnalyze).toBe(true);
    expect(result.findings.some((f) => f.code === 'TAUX_INCORRECT')).toBe(false);
    expect(result.findings.some((f) => f.code === 'COTISATION_MANQUANTE')).toBe(false);
    expect(result.findings.some((f) => f.code === 'SMIC_NON_RESPECTE')).toBe(false);
    expect(result.findings.some((f) => f.code === 'PERIODE_NON_COUVERTE')).toBe(true);
  });

  it('année du référentiel (2026) → comparaison des taux active', () => {
    const raw = loadRaw('clarified-sain.raw.json');
    raw.period = { month: 6, year: 2026 };
    const line = raw.contributions.find((c) => c.label === 'Sécurité sociale plafonnée')!;
    line.employeeRate = 7.3;
    const result = analyzePayslip(payslipFromRaw(raw));
    expect(result.summary.periodCovered).toBe(true);
    expect(result.findings.some((f) => f.code === 'TAUX_INCORRECT')).toBe(true);
  });

  it('convention collective détectée automatiquement sur le bulletin (Syntec)', () => {
    const p = payslipFromRaw(loadRaw('clarified-sain.raw.json'));
    const { summary } = analyzePayslip(p);
    expect(summary.conventionSource).toBe('detected');
    expect(summary.conventionIdcc).toBe(1486);
    expect(summary.conventionLabel).toMatch(/syntec/i);
  });

  it('sélection utilisateur prioritaire sur la détection, et ne change aucun constat de taux', () => {
    const p = payslipFromRaw(loadRaw('clarified-sain.raw.json'));
    const withoutChoice = analyzePayslip(p);
    const withChoice = analyzePayslip(p, { conventionLabel: 'Métallurgie' });

    expect(withChoice.summary.conventionSource).toBe('user');
    expect(withChoice.summary.conventionLabel).toBe('Métallurgie');
    expect(withChoice.summary.conventionIdcc).toBe(3248);
    // le choix de convention ne modifie aucun calcul ni aucun constat
    expect(withChoice.findings.map((f) => f.id)).toEqual(withoutChoice.findings.map((f) => f.id));
  });

  it('libellé utilisateur non reconnu → ignoré, retombe sur la détection', () => {
    const p = payslipFromRaw(loadRaw('clarified-sain.raw.json'));
    const { summary } = analyzePayslip(p, { conventionLabel: 'Ceci n’existe pas' });
    expect(summary.conventionSource).toBe('detected');
    expect(summary.conventionIdcc).toBe(1486);
  });

  it('isPayslip=false n’est pas mappé (géré en amont par aiReader)', () => {
    // fromRaw suppose isPayslip=true ; la garde est dans aiReader.readPayslipWithAI.
    expect(RawExtraction.parse({ ...loadRaw('clarified-sain.raw.json'), isPayslip: false }).isPayslip).toBe(false);
  });
});
