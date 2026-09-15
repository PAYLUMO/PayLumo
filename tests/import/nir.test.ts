import { describe, it, expect } from 'vitest';
import { findNir } from '@/features/import/nir';

describe('findNir', () => {
  it('repère un NIR complet avec clé valide (espaces)', () => {
    // 1 84 12 75 116 001 42 — clé calculée
    const nir = '1 84 12 75 116 001 42';
    const got = findNir(`Employé n° ${nir} — bulletin`);
    expect(got).toHaveLength(1);
    expect(got[0].text).toBe(nir);
  });

  it('repère un NIR collé (13 chiffres) près d’un libellé', () => {
    const got = findNir('N° de sécurité sociale : 2850375116001');
    expect(got).toHaveLength(1);
    expect(got[0].text).toBe('2850375116001');
  });

  it('repère un NIR avec département corse (2A)', () => {
    const got = findNir('NIR 1 90 03 2A 123 456'); // 13 chiffres significatifs, sans clé
    expect(got).toHaveLength(1);
    expect(got[0].text).toBe('1 90 03 2A 123 456');
  });

  it('ignore un SIRET (mois implausible)', () => {
    // 123 456 789 00012 → s=1 aa=23 mm=45 → mois 45 rejeté
    expect(findNir('SIRET : 123 456 789 00012')).toHaveLength(0);
  });

  it('ignore un simple numéro de matricule court', () => {
    expect(findNir('Matricule : 00427')).toHaveLength(0);
  });

  it('ignore un montant / cumul long sans structure NIR', () => {
    expect(findNir('Cumul net imposable 28 671 800 heures 1 200')).toHaveLength(0);
  });

  it('index et longueur corrects pour découpe', () => {
    const s = 'xx 2 84 07 35 238 012 51 yy';
    const [m] = findNir(s);
    expect(s.slice(m.index, m.end)).toBe(m.text);
  });
});
