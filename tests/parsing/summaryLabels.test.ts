import { describe, it, expect } from 'vitest';
import { isSummaryOrHeaderLabel } from '@shared/parsing/summaryLabels';

describe('isSummaryOrHeaderLabel', () => {
  it('écarte les totaux et sous-totaux', () => {
    for (const l of [
      'Total des cotisations et contributions',
      'TOTAL DES COTISATIONS',
      'Total des retenues',
      'Sous-total cotisations patronales',
      'Total employeur',
    ]) {
      expect(isSummaryOrHeaderLabel(l, false)).toBe(true);
    }
  });

  it('écarte les lignes de récapitulatif de pied de bulletin', () => {
    for (const l of [
      'Net à payer avant impôt sur le revenu',
      'Net imposable',
      'Montant net social',
      'Coût total employeur',
      'Coût global employeur',
      'SALAIRE BRUT',
    ]) {
      expect(isSummaryOrHeaderLabel(l)).toBe(true);
    }
  });

  it('écarte les intitulés de rubrique employés seuls (sans taux)', () => {
    expect(isSummaryOrHeaderLabel('SANTÉ', false)).toBe(true);
    expect(isSummaryOrHeaderLabel("Autres contributions dues par l'employeur", false)).toBe(true);
    expect(isSummaryOrHeaderLabel('CSG/CRDS', false)).toBe(true);
  });

  it('écarte les lignes globales d’exonération / allègement (sans taux)', () => {
    expect(isSummaryOrHeaderLabel('Exonérations, écrêt. et allègm. de cotisations', false)).toBe(
      true,
    );
    expect(isSummaryOrHeaderLabel('Réduction générale des cotisations patronales', false)).toBe(true);
  });

  it('garde les vraies lignes de cotisation', () => {
    for (const l of [
      'Sécurité sociale plafonnée',
      'Complémentaire tranche 1',
      'Assurance chômage',
      'CSG déductible de l’impôt sur le revenu',
      'APEC',
      'Complémentaire santé',
      'Accident du travail',
    ]) {
      expect(isSummaryOrHeaderLabel(l, true)).toBe(false);
    }
    // "Assurance chômage" reste une vraie ligne dès qu'un montant est lu, même sans taux
    expect(isSummaryOrHeaderLabel('Assurance chômage', false, true)).toBe(false);
  });
});
