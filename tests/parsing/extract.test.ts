import { describe, it, expect } from 'vitest';
import { extractFixture } from '../helpers/pdf';
import { extractPayslip } from '@shared/parsing/extract';

describe('extractPayslip — bulletin clarifié synthétique', () => {
  it('lit correctement le bulletin sain', async () => {
    const doc = await extractFixture('clarified-sain.pdf');
    const p = extractPayslip(doc);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(p, null, 2));

    expect(p.meta.scanned).toBe(false);
    expect(p.meta.parseConfidence).toBeGreaterThan(0.75);
    expect(p.period.value).toEqual({ month: 6, year: 2026 });
    expect(p.employee.statut).toBe('cadre');
    expect(p.gross.value).toBeCloseTo(3488.46, 2);
    expect(p.netAPayer.value).toBeGreaterThan(2500);

    const codes = p.contributions.map((c) => c.canonical);
    expect(codes).toContain('VIEILLESSE_PLAFONNEE');
    expect(codes).toContain('RETRAITE_COMPLEMENTAIRE_T1');
    expect(codes).toContain('CSG_DEDUCTIBLE');
    expect(codes).toContain('APEC');

    const vp = p.contributions.find((c) => c.canonical === 'VIEILLESSE_PLAFONNEE')!;
    expect(vp.employee?.rate?.value).toBeCloseTo(6.9, 2);
    expect(vp.employee?.amount?.value).toBeCloseTo(240.7, 1);
    expect(vp.employer?.rate?.value).toBeCloseTo(8.55, 2);

    const maladie = p.contributions.find((c) => c.canonical === 'MALADIE')!;
    expect(maladie.employer?.rate?.value).toBeCloseTo(7.0, 2);
    expect(maladie.employee).toBeUndefined();
  });

  it('non-cadre : pas d’APEC, statut détecté', async () => {
    const p = extractPayslip(await extractFixture('clarified-non-cadre.pdf'));
    expect(p.employee.statut).toBe('non-cadre');
    expect(p.gross.value).toBeCloseTo(2100, 2);
    expect(p.contributions.map((c) => c.canonical)).not.toContain('APEC');
  });
});
