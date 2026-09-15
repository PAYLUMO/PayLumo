import { describe, it, expect } from 'vitest';
import {
  CONVENTIONS,
  detectConvention,
  findConventionByIdcc,
  findConventionByLabel,
  isBatimentTP,
} from '@shared/data/conventions';

describe('référentiel des conventions collectives', () => {
  it('labels et IDCC uniques', () => {
    const labels = CONVENTIONS.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
    const idccs = CONVENTIONS.map((c) => c.idcc).filter((n): n is number => n != null);
    expect(new Set(idccs).size).toBe(idccs.length);
  });

  it('findConventionByIdcc / findConventionByLabel', () => {
    expect(findConventionByIdcc(1486)?.label).toMatch(/syntec/i);
    expect(findConventionByLabel('Métallurgie')?.idcc).toBe(3248);
    expect(findConventionByLabel('— inconnue —')).toBeUndefined();
  });
});

describe('detectConvention', () => {
  it('détecte un IDCC explicite connu du référentiel', () => {
    const m = detectConvention('Convention collective : Syntec (IDCC 1486)');
    expect(m).toMatchObject({ idcc: 1486, kind: 'idcc' });
  });

  it('détecte un IDCC explicite non répertorié (renvoie quand même le numéro)', () => {
    const m = detectConvention('Convention collective nationale — IDCC 9999');
    expect(m).toMatchObject({ idcc: 9999, kind: 'idcc-unknown' });
  });

  it('détecte par mot-clé sans numéro IDCC', () => {
    const m = detectConvention('Convention collective nationale du bâtiment — ouvriers');
    expect(m?.kind).toBe('name');
    expect(m?.label).toMatch(/b[aâ]timent/i);
  });

  it('retourne undefined si rien n’est reconnaissable', () => {
    expect(detectConvention('Accord d’entreprise local')).toBeUndefined();
    expect(detectConvention(null)).toBeUndefined();
    expect(detectConvention('')).toBeUndefined();
  });
});

describe('isBatimentTP', () => {
  it('reconnaît bâtiment / BTP / travaux publics', () => {
    expect(isBatimentTP('Bâtiment — ouvriers')).toBe(true);
    expect(isBatimentTP('Convention BTP région parisienne')).toBe(true);
    expect(isBatimentTP('Travaux publics')).toBe(true);
  });

  it('ne matche pas un secteur sans rapport', () => {
    expect(isBatimentTP('Syntec — bureaux d’études techniques')).toBe(false);
    expect(isBatimentTP(null)).toBe(false);
  });
});
