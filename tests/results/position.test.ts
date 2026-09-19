import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RawExtraction } from '@shared/extraction';
import { payslipFromRaw } from '@shared/parsing/fromRaw';
import { salaryPosition } from '@/features/results/position';
import { NATIONAL } from '@/data/insee';

function load() {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/ai/clarified-sain.raw.json'), 'utf8'),
  );
  return RawExtraction.parse(raw);
}

describe('salaryPosition — net du bulletin vs distribution INSEE (temps plein)', () => {
  it('mois avec absence : ramené à un mois complet avant de comparer', () => {
    // net avant impôt 2 740 €, absence de 161,54 € sur 3 488,46 € de brut (4,6 %)
    const p = salaryPosition(payslipFromRaw(load()))!;
    expect(p.monthNet).toBe(2740);
    expect(p.adjustment).toEqual({ partTime: false, absences: 162 });
    expect(p.eqtpNet).toBeGreaterThan(2740);
    expect(p.eqtpNet).toBeCloseTo(2740 * (3488.46 + 161.54) / 3488.46, -1);
    expect(p.zone).toBe('median-d9');
    expect(p.vsMedian).toBe(p.eqtpNet - NATIONAL.median);
    expect(p.toTop10).toBe(NATIONAL.d9 - p.eqtpNet);
  });

  it('mois complet sans absence : comparé tel quel', () => {
    const raw = load();
    raw.grossItems = raw.grossItems.filter((g) => g.kind !== 'absence');
    const p = salaryPosition(payslipFromRaw(raw))!;
    expect(p.adjustment).toBeNull();
    expect(p.eqtpNet).toBe(2740);
  });

  it('temps partiel : ramené à la durée légale', () => {
    const raw = load();
    raw.grossItems = raw.grossItems.filter((g) => g.kind !== 'absence');
    raw.employee.contractHours = 75.83; // mi-temps
    const p = salaryPosition(payslipFromRaw(raw))!;
    expect(p.adjustment?.partTime).toBe(true);
    expect(p.eqtpNet).toBeCloseTo(2740 * 2, -2);
    expect(p.zone).toBe('above-d9'); // ≈ 5 480 € > D9
    expect(p.toTop10).toBeNull();
  });

  it('bulletin trop atypique (ajustement > 2,5×) : pas de comparaison', () => {
    const raw = load();
    raw.grossItems = raw.grossItems.filter((g) => g.kind !== 'absence');
    raw.employee.contractHours = 40;
    expect(salaryPosition(payslipFromRaw(raw))).toBeNull();
  });

  it('comparaison aux cadres seulement pour un cadre', () => {
    expect(salaryPosition(payslipFromRaw(load()))!.cadre).not.toBeNull();
    const raw = load();
    raw.employee.status = 'non-cadre';
    expect(salaryPosition(payslipFromRaw(raw))!.cadre).toBeNull();
  });

  it('net illisible : null', () => {
    const raw = load();
    raw.netBeforeTax = null;
    raw.netPaid = null;
    expect(salaryPosition(payslipFromRaw(raw))).toBeNull();
  });
});
