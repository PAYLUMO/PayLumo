import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RawExtraction } from '@shared/extraction';
import { payslipFromRaw } from '@shared/parsing/fromRaw';
import { declarationFigures } from '@/features/results/declarationFigures';

function load() {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/ai/clarified-sain.raw.json'), 'utf8'),
  );
  return RawExtraction.parse(raw);
}
const by = (raw: ReturnType<typeof load>) =>
  Object.fromEntries(declarationFigures(payslipFromRaw(raw)).map((f) => [f.key, f]));

describe('declarationFigures — montants du bulletin + équivalent annuel', () => {
  it('sans cumul sur le bulletin : estimation « ce mois × 12 », clairement distinguée', () => {
    const f = by(load());
    expect(Object.keys(f)).toEqual(['gross', 'netTaxable', 'netSocial', 'pas', 'netPaid']);
    expect(f.gross.monthly).toBeCloseTo(3488.46, 2);
    expect(f.gross.annual).toEqual({ kind: 'estimate', value: Math.round(3488.46 * 12), projection: null, yearTotal: false });
    expect(f.netTaxable.monthly).toBeCloseTo(2867.18, 2);
    expect(f.pas.monthly).toBeCloseTo(108.95, 2); // valeur absolue
    expect(f.netPaid.annual.kind).toBe('estimate'); // pas de cumul de net à payer sur les bulletins
  });

  it('cumul lu : repris tel quel + projection à rythme constant (juin → ×12/6)', () => {
    const raw = load(); // période : juin 2026
    raw.cumuls = { gross: 20930.76, netTaxable: 17203.08, netSocial: 16440, incomeTax: 650, hours: null };
    const f = by(raw);
    expect(f.gross.annual).toEqual({ kind: 'cumul', value: 20930.76, projection: 41862, yearTotal: false });
    expect(f.netTaxable.annual.value).toBe(17203.08);
    expect(f.netSocial.annual.projection).toBe(32880);
    expect(f.pas.annual).toMatchObject({ kind: 'cumul', value: 650 });
    expect(f.netPaid.annual.kind).toBe('estimate');
  });

  it('bulletin de décembre : le cumul est le total de l’année, sans projection', () => {
    const raw = load();
    raw.period = { month: 12, year: 2026 };
    raw.cumuls = { gross: 41000, netTaxable: 34000, netSocial: null, incomeTax: null, hours: null };
    const f = by(raw);
    expect(f.gross.annual).toEqual({ kind: 'cumul', value: 41000, projection: null, yearTotal: true });
    expect(f.netSocial.annual.kind).toBe('estimate'); // pas de cumul net social lu
  });

  it('cumul inférieur au mois lui-même (erreur de lecture) : ignoré, retombe sur l’estimation', () => {
    const raw = load();
    raw.cumuls = { gross: 100, netTaxable: null, netSocial: null, incomeTax: null, hours: null };
    expect(by(raw).gross.annual.kind).toBe('estimate');
  });

  it('montant illisible : ligne absente (jamais un zéro inventé)', () => {
    const raw = load();
    raw.netSocial = null;
    raw.incomeTaxAmount = null;
    raw.incomeTaxRate = null;
    const keys = declarationFigures(payslipFromRaw(raw)).map((f) => f.key);
    expect(keys).not.toContain('netSocial');
    expect(keys).not.toContain('pas');
  });
});
