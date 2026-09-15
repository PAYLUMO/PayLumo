import { describe, it, expect } from 'vitest';
import { findAddress } from '@/features/import/address';

describe('findAddress', () => {
  it('repère « code postal + commune »', () => {
    const got = findAddress('M. Jean Dupont\n75011 Paris\nEmploi : Développeur');
    expect(got.some((m) => m.text.trim() === '75011 Paris')).toBe(true);
  });

  it('repère « code postal + commune » en capitales avec CEDEX', () => {
    const got = findAddress('69003 LYON CEDEX 3');
    expect(got).toHaveLength(1);
    expect(got[0].text).toContain('69003');
  });

  it('repère une ligne de voie (numéro + type)', () => {
    for (const l of [
      '12 rue des Lilas',
      '3 avenue de la République',
      '1 bis boulevard Voltaire',
      '5, impasse du Puits',
    ]) {
      const got = findAddress(`${l}\n`);
      expect(got.length, l).toBeGreaterThanOrEqual(1);
    }
  });

  it('découpe : slice(index,end) === text', () => {
    const s = 'employeur ACME 12 rue des Lilas 75011 Paris fin';
    for (const m of findAddress(s)) expect(s.slice(m.index, m.end)).toBe(m.text);
  });

  it('ignore les montants et libellés de paie', () => {
    expect(findAddress('Base 3 488,46  Taux 6,90  Montant 240,70')).toHaveLength(0);
    expect(findAddress('PLAFOND ANNUEL 48060 EUR')).toHaveLength(0);
    expect(findAddress('Coefficient 100 Position 2')).toHaveLength(0);
  });

  it('ignore « 35 heures », « 39 h »', () => {
    expect(findAddress('Durée 35 heures hebdomadaires — 151,67 h')).toHaveLength(0);
  });
});
