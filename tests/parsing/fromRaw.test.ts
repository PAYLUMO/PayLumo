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

  it('isPayslip=false n’est pas mappé (géré en amont par aiReader)', () => {
    // fromRaw suppose isPayslip=true ; la garde est dans aiReader.readPayslipWithAI.
    expect(RawExtraction.parse({ ...loadRaw('clarified-sain.raw.json'), isPayslip: false }).isPayslip).toBe(false);
  });
});
