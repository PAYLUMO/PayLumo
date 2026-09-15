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
