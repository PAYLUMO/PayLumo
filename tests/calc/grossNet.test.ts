import { describe, it, expect } from 'vitest';
import { grossFromNet, grossToNet } from '@shared/calc/grossNet';
import { neutralPasRate } from '@shared/data/pasGrid';

const base = { statut: 'non-cadre' as const };

describe('grossToNet — cotisations légales 2026', () => {
  it('2 500 € brut non-cadre : valeurs recalculées à la main', () => {
    // retraite base 6,9 % + 0,4 % ; Agirc-Arrco T1 3,15 % ; CEG T1 0,86 % ; CSG/CRDS 9,7 % de 98,25 %
    const r = grossToNet({ ...base, grossMonthly: 2500 });
    expect(r.contributions).toBeCloseTo(521.01, 1);
    expect(r.netBeforeTax).toBeCloseTo(1978.99, 1);
    // net imposable = net avant impôt + CSG non déductible (58,95) + CRDS (12,28)
    expect(r.netTaxable).toBeCloseTo(2050.22, 1);
    // base 2 050 € → tranche « 1 928 – 2 060 € » de la grille = 2,9 %
    expect(r.pasRate).toBe(2.9);
    expect(r.pasIsDefault).toBe(true);
    expect(r.pas).toBeCloseTo(59.46, 1);
    expect(r.netPaid).toBeCloseTo(1919.53, 1);
  });

  it('CET et tranche 2 seulement au-dessus du plafond de la Sécurité sociale', () => {
    const codes = (g: number) => grossToNet({ ...base, grossMonthly: g }).lines.map((l) => l.code);
    expect(codes(3000)).not.toContain('CET');
    expect(codes(3000)).not.toContain('RETRAITE_COMPLEMENTAIRE_T2');
    expect(codes(6000)).toEqual(expect.arrayContaining(['CET', 'RETRAITE_COMPLEMENTAIRE_T2', 'CEG_T2']));
  });

  it('cadre : ajoute l’APEC (0,024 %) et rien d’autre en légal', () => {
    const nc = grossToNet({ ...base, grossMonthly: 2500 });
    const c = grossToNet({ statut: 'cadre', grossMonthly: 2500 });
    expect(c.lines.some((l) => l.code === 'APEC')).toBe(true);
    expect(nc.lines.some((l) => l.code === 'APEC')).toBe(false);
    expect(nc.netBeforeTax - c.netBeforeTax).toBeCloseTo(0.6, 1);
  });

  it('assiette CSG/CRDS : 100 % au-delà de 4 PASS (16 020 €/mois)', () => {
    const csg = grossToNet({ ...base, grossMonthly: 20000 }).lines.find((l) => l.code === 'CSG_DEDUCTIBLE')!;
    expect(csg.base).toBeCloseTo(16020 * 0.9825 + 3980, 1);
  });

  it('mutuelle / prévoyance : réduit net avant impôt ET net imposable du même montant', () => {
    const a = grossToNet({ ...base, grossMonthly: 3000 });
    const b = grossToNet({ ...base, grossMonthly: 3000, otherDeductions: 40 });
    expect(a.netBeforeTax - b.netBeforeTax).toBeCloseTo(40, 2);
    expect(a.netTaxable - b.netTaxable).toBeCloseTo(40, 2);
  });

  it('taux de prélèvement personnalisé : appliqué tel quel au net imposable', () => {
    const r = grossToNet({ ...base, grossMonthly: 3000, pasRate: 7 });
    expect(r.pasIsDefault).toBe(false);
    expect(r.pasRate).toBe(7);
    expect(r.pas).toBeCloseTo((r.netTaxable * 7) / 100, 1);
    expect(grossToNet({ ...base, grossMonthly: 3000, pasRate: 0 }).pas).toBe(0);
  });

  it('brut nul ou négatif : tout à zéro', () => {
    for (const g of [0, -50]) {
      const r = grossToNet({ ...base, grossMonthly: g });
      expect([r.netBeforeTax, r.netPaid, r.pas, r.contributions]).toEqual([0, 0, 0, 0]);
    }
  });

  it('le net avant impôt croît avec le brut (pas de 250 €)', () => {
    let prev = grossToNet({ ...base, grossMonthly: 1000 }).netBeforeTax;
    for (let g = 1250; g <= 12000; g += 250) {
      const n = grossToNet({ ...base, grossMonthly: g }).netBeforeTax;
      expect(n).toBeGreaterThan(prev);
      prev = n;
    }
  });
});

describe('grille du taux par défaut (BOFiP, à compter du 1er mai 2026)', () => {
  it('bornes exactes : borne basse incluse, borne haute exclue', () => {
    expect(neutralPasRate(0)).toBe(0);
    expect(neutralPasRate(1634.99)).toBe(0);
    expect(neutralPasRate(1635)).toBe(0.5);
    expect(neutralPasRate(4018.99)).toBe(11.9);
    expect(neutralPasRate(4019)).toBe(13.8);
    expect(neutralPasRate(55557.99)).toBe(38);
    expect(neutralPasRate(55558)).toBe(43);
  });
});

describe('grossFromNet — aller-retour', () => {
  it('net avant impôt : retrouve le brut d’origine', () => {
    for (const statut of ['non-cadre', 'cadre'] as const) {
      for (const g of [1823.03, 2500, 3123.45, 4500, 7200.8]) {
        const { netBeforeTax } = grossToNet({ statut, grossMonthly: g, otherDeductions: 25 });
        const back = grossFromNet(netBeforeTax, 'beforeTax', { statut, otherDeductions: 25 })!;
        expect(back).toBeCloseTo(g, 1);
      }
    }
  });

  it('net à payer : le brut trouvé atteint la cible, sans la dépasser de plus de quelques centimes', () => {
    for (const g of [1900, 2500, 3300, 5000, 9000]) {
      const { netPaid } = grossToNet({ ...base, grossMonthly: g });
      const back = grossFromNet(netPaid, 'paid', base)!;
      expect(back).toBeLessThanOrEqual(g + 0.01);
      const again = grossToNet({ ...base, grossMonthly: back }).netPaid;
      expect(again).toBeGreaterThanOrEqual(netPaid - 0.02);
      expect(again).toBeLessThan(netPaid + 1);
    }
  });

  it('cibles impossibles : null', () => {
    expect(grossFromNet(0, 'beforeTax', base)).toBeNull();
    expect(grossFromNet(-10, 'paid', base)).toBeNull();
    expect(grossFromNet(1e9, 'beforeTax', base)).toBeNull();
  });
});
