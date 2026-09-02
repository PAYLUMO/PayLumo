import { describe, it, expect } from 'vitest';
import { estimateMedian, positionOf } from '@/features/comparator/estimate';

describe('estimateMedian', () => {
  it('renvoie null si métier ou région manquant', () => {
    expect(estimateMedian({ metierId: 'dev', regionCode: 'ZZZ' })).toBeNull();
    expect(estimateMedian({ metierId: 'inconnu', regionCode: 'IDF' })).toBeNull();
  });

  it('Île-de-France > moyenne des autres régions, à profil égal', () => {
    const idf = estimateMedian({ metierId: 'dev', regionCode: 'IDF' })!;
    const bre = estimateMedian({ metierId: 'dev', regionCode: 'BRE' })!;
    expect(idf.median).toBeGreaterThan(bre.median);
  });

  it('la médiane croît avec l’âge', () => {
    const jeune = estimateMedian({ metierId: 'comptable', regionCode: 'ARA', ageBand: 'lt25' })!;
    const senior = estimateMedian({ metierId: 'comptable', regionCode: 'ARA', ageBand: '50plus' })!;
    expect(senior.median).toBeGreaterThan(jeune.median);
  });

  it('fourchette encadre la médiane', () => {
    const e = estimateMedian({ metierId: 'infirmier', regionCode: 'OCC' })!;
    expect(e.low).toBeLessThan(e.median);
    expect(e.high).toBeGreaterThan(e.median);
  });
});

describe('positionOf', () => {
  const est = estimateMedian({ metierId: 'dev', regionCode: 'ARA', ageBand: '30-39' })!;

  it('salaire = médiane du profil → écart ~0 %', () => {
    expect(Math.abs(positionOf(est.median, est).vsMedianPct)).toBeLessThanOrEqual(1);
  });

  it('décile national croît avec le salaire', () => {
    const low = positionOf(1600, est).decile;
    const mid = positionOf(est.national.median, est).decile;
    const high = positionOf(5000, est).decile;
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThanOrEqual(high);
    expect(mid).toBe(5);
    expect(high).toBe(10);
    expect(low).toBeGreaterThanOrEqual(1);
  });

  it('libellé cohérent avec le signe de l’écart', () => {
    expect(positionOf(est.median * 1.3, est).label).toMatch(/au-dessus/);
    expect(positionOf(est.median * 0.7, est).label).toMatch(/en dessous/);
  });
});
