import { describe, it, expect } from 'vitest';
import { matchCanonical, normalizeLabel } from '@shared/data/taxonomy';

describe('normalizeLabel', () => {
  it('retire accents et normalise', () => {
    expect(normalizeLabel('Sécurité Sociale  Plafonnée')).toBe('securite sociale plafonnee');
  });
});

describe('matchCanonical', () => {
  const cases: [string, string][] = [
    ['Sécurité sociale plafonnée', 'VIEILLESSE_PLAFONNEE'],
    ['Assurance vieillesse plafonnée', 'VIEILLESSE_PLAFONNEE'],
    ['Sécurité sociale déplafonnée', 'VIEILLESSE_DEPLAFONNEE'],
    ['Vieillesse déplafonnée', 'VIEILLESSE_DEPLAFONNEE'],
    ['Complémentaire Tranche 1', 'RETRAITE_COMPLEMENTAIRE_T1'],
    ['Retraite complémentaire tranche 2', 'RETRAITE_COMPLEMENTAIRE_T2'],
    ['CEG tranche 1', 'CEG_T1'],
    ['CEG tranche 2', 'CEG_T2'],
    ['CEG Tranche 2', 'CEG_T2'],
    ['CET', 'CET'],
    ['CSG déductible', 'CSG_DEDUCTIBLE'],
    ['CSG/CRDS non déductible', 'CSG_CRDS_NON_DEDUCTIBLE'],
    ['CRDS', 'CRDS'],
    ['Allocations familiales', 'ALLOCATIONS_FAMILIALES'],
    ['Assurance chômage', 'ASSURANCE_CHOMAGE'],
    ['APEC', 'APEC'],
    ['Accident du travail', 'ACCIDENT_TRAVAIL'],
    ['Sécurité sociale - Maladie Maternité Invalidité Décès', 'MALADIE'],
    ['ARRCO tranche 1', 'RETRAITE_COMPLEMENTAIRE_T1'],
    ['ARRCO tranche 2', 'RETRAITE_COMPLEMENTAIRE_T2'],
    ['ARRCO TB', 'RETRAITE_COMPLEMENTAIRE_T2'],
    ['Cotisation maladie', 'MALADIE'],
  ];

  it.each(cases)('« %s » → %s', (label, code) => {
    expect(matchCanonical(label, { section: 'RETRAITE', statut: 'cadre' })?.code ?? matchCanonical(label)?.code).toBe(
      code,
    );
  });

  it('APEC non reconnu pour un non-cadre', () => {
    expect(matchCanonical('APEC', { statut: 'non-cadre' })).toBeUndefined();
  });

  it('« Prévoyance non cadre » n’est jamais classée PREVOYANCE_CADRE', () => {
    // Bug réel : le mot « cadre » apparaît dans « non cadre », ce qui faisait
    // matcher PREVOYANCE_CADRE (et donc comparer au taux 1,50 % réservé aux
    // cadres) même pour un salarié non-cadre, ou quand le statut n'est pas lu.
    for (const statut of [undefined, 'cadre', 'non-cadre', 'inconnu'] as const) {
      expect(matchCanonical('Prévoyance non cadre', { section: 'SANTE', statut })?.code).toBe('PREVOYANCE');
    }
  });

  it('« ARRCO » seul reste rattaché à la tranche 1 par défaut', () => {
    // Comportement existant et volontaire (pas de tranche indiquée) — non-régression.
    expect(matchCanonical('ARRCO')?.code).toBe('RETRAITE_COMPLEMENTAIRE_T1');
  });
});
