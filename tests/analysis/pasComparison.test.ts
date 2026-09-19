import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RawExtraction } from '@shared/extraction';
import { payslipFromRaw } from '@shared/parsing/fromRaw';
import { comparePas } from '@shared/analysis/pasComparison';

function load() {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/ai/clarified-sain.raw.json'), 'utf8'),
  );
  return RawExtraction.parse(raw);
}

describe('comparePas — taux appliqué vs taux par défaut de la grille officielle', () => {
  it('taux personnalisé plus bas que le taux par défaut', () => {
    // net imposable 2 867,18 € → tranche « 2 738 – 3 135 € » = 7,5 %
    const c = comparePas(payslipFromRaw(load()))!;
    expect(c.base).toBeCloseTo(2867.18, 2);
    expect(c.defaultRate).toBe(7.5);
    expect(c.detectedRate).toBe(3.8);
    expect(c.gap).toBe(-3.7);
    expect(c.relation).toBe('lower');
    expect(c.defaultAmount).toBeCloseTo(215.04, 1);
    expect(c.detectedAmount).toBeCloseTo(108.95, 2);
  });

  it('taux égal au taux par défaut → « same » ; supérieur → « higher »', () => {
    const same = load();
    same.incomeTaxRate = 7.5;
    expect(comparePas(payslipFromRaw(same))!.relation).toBe('same');

    const higher = load();
    higher.incomeTaxRate = 9.9;
    const c = comparePas(payslipFromRaw(higher))!;
    expect(c.relation).toBe('higher');
    expect(c.gap).toBe(2.4);
  });

  it('taux non lu : déduit du montant prélevé', () => {
    const raw = load();
    raw.incomeTaxRate = null;
    raw.incomeTaxAmount = 215.04; // = 7,5 % de 2 867,18 €
    const c = comparePas(payslipFromRaw(raw))!;
    expect(c.detectedRate).toBeCloseTo(7.5, 1);
    expect(c.relation).toBe('same');
  });

  it('bulletins non couverts par la grille modélisée → null', () => {
    for (const period of [
      { month: 4, year: 2026 }, // avant le 1er mai 2026 : autre grille
      { month: 6, year: 2025 },
      { month: 6, year: 2027 },
    ]) {
      const raw = load();
      raw.period = period;
      expect(comparePas(payslipFromRaw(raw))).toBeNull();
    }
    const may = load();
    may.period = { month: 5, year: 2026 };
    expect(comparePas(payslipFromRaw(may))).not.toBeNull();
  });

  it('base ou taux illisibles → null', () => {
    const noBase = load();
    noBase.netTaxable = null;
    expect(comparePas(payslipFromRaw(noBase))).toBeNull();

    const noRate = load();
    noRate.incomeTaxRate = null;
    noRate.incomeTaxAmount = null;
    expect(comparePas(payslipFromRaw(noRate))).toBeNull();
  });
});
