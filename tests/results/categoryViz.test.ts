import { describe, it, expect } from 'vitest';
import { employeeCostByCategory } from '@/features/results/categoryViz';
import { valued, type Payslip } from '@shared/parsing/model';

function payslip(contribs: Payslip['contributions']): Payslip {
  return {
    meta: { editor: 'ai', parseConfidence: 1, notes: [], pageCount: 1, scanned: false },
    employer: {},
    employee: { statut: 'cadre', regime: 'general' },
    period: valued({ month: 6, year: 2026 }, 1),
    time: {},
    grossItems: [],
    gross: valued(3000, 1),
    contributions: contribs,
    adjustments: [],
    netAPayer: valued(2300, 1),
  };
}

describe('employeeCostByCategory', () => {
  it('agrège la part salariale par famille, trié décroissant', () => {
    const p = payslip([
      { label: 'Vieillesse', category: 'RETRAITE', employee: { amount: valued(200, 1) } },
      { label: 'CEG', category: 'RETRAITE', employee: { amount: valued(30, 1) } },
      { label: 'CSG', category: 'CSG_CRDS', employee: { amount: valued(250, 1) } },
      { label: 'Mutuelle', category: 'SANTE', employee: { amount: valued(18, 1) } },
      { label: 'Maladie (patronale)', category: 'SANTE', employer: { amount: valued(390, 1) } },
    ]);
    const res = employeeCostByCategory(p);
    expect(res).toEqual([
      { category: 'CSG_CRDS', euro: 250 },
      { category: 'RETRAITE', euro: 230 },
      { category: 'SANTE', euro: 18 },
    ]);
  });

  it('ignore les lignes sans part salariale', () => {
    const p = payslip([
      { label: 'Alloc familiales', category: 'FAMILLE', employer: { amount: valued(100, 1) } },
    ]);
    expect(employeeCostByCategory(p)).toEqual([]);
  });
});
