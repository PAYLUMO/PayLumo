import { describe, it, expect } from 'vitest';
import { extractFixture, loadManifest } from '../helpers/pdf';
import { extractPayslip } from '@shared/parsing/extract';
import { analyzePayslip } from '@shared/analysis/engine';
import type { Finding } from '@shared/analysis/findings';

const manifest = loadManifest();

async function run(file: string) {
  const doc = await extractFixture(file.replace('pdf/', ''));
  const payslip = extractPayslip(doc);
  return { payslip, result: analyzePayslip(payslip) };
}

function has(findings: Finding[], code: string, canonical?: string) {
  return findings.some((f) => f.code === code && (!canonical || f.canonical === canonical));
}

describe('analyzePayslip — scénarios de fixtures', () => {
  it('bulletin sain : aucune erreur', async () => {
    const { result } = await run('pdf/clarified-sain.pdf');
    const erreurs = result.findings.filter((f) => f.severity === 'erreur');
    if (erreurs.length) console.log(erreurs);
    expect(erreurs).toHaveLength(0);
    expect(result.summary.canAnalyze).toBe(true);
  });

  it('non-cadre sain : aucune erreur', async () => {
    const { result } = await run('pdf/clarified-non-cadre.pdf');
    expect(result.findings.filter((f) => f.severity === 'erreur')).toHaveLength(0);
  });

  it('taux vieillesse erroné : TAUX_INCORRECT sur VIEILLESSE_PLAFONNEE', async () => {
    const { result } = await run('pdf/clarified-taux-vieillesse.pdf');
    expect(has(result.findings, 'TAUX_INCORRECT', 'VIEILLESSE_PLAFONNEE')).toBe(true);
    const f = result.findings.find((x) => x.canonical === 'VIEILLESSE_PLAFONNEE')!;
    expect(f.impactEuro).toBeGreaterThan(5); // ~0,4 % de 3488 ≈ 14 €
  });

  it('chômage 4,05 % : TAUX_INCORRECT patronal', async () => {
    const { result } = await run('pdf/clarified-chomage-405.pdf');
    expect(has(result.findings, 'TAUX_INCORRECT', 'ASSURANCE_CHOMAGE')).toBe(true);
  });

  it('brut incohérent : BRUT_INCOHERENT', async () => {
    const { result } = await run('pdf/clarified-brut-incoherent.pdf');
    expect(has(result.findings, 'BRUT_INCOHERENT')).toBe(true);
  });

  it('calcul de ligne : CALCUL_INCOHERENT sur CEG_T1', async () => {
    const { result } = await run('pdf/clarified-calcul-ligne.pdf');
    expect(has(result.findings, 'CALCUL_INCOHERENT', 'CEG_T1')).toBe(true);
  });

  it('APEC manquante : COTISATION_MANQUANTE', async () => {
    const { result } = await run('pdf/clarified-cotisation-manquante.pdf');
    expect(has(result.findings, 'COTISATION_MANQUANTE', 'APEC')).toBe(true);
  });

  it('manifeste couvert', () => {
    expect(manifest.length).toBeGreaterThanOrEqual(6);
  });
});
