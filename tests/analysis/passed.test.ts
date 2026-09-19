import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { RawExtraction } from '@shared/extraction';
import { payslipFromRaw } from '@shared/parsing/fromRaw';
import { analyzePayslip } from '@shared/analysis/engine';

function loadRaw() {
  const raw = JSON.parse(
    readFileSync(resolve(process.cwd(), 'tests/fixtures/ai/clarified-sain.raw.json'), 'utf8'),
  );
  return RawExtraction.parse(raw);
}

const ids = (r: ReturnType<typeof analyzePayslip>) => (r.passed ?? []).map((p) => p.id);

describe('points vérifiés conformes (result.passed)', () => {
  it('bulletin sain : liste ce qui a été réellement vérifié', () => {
    const r = analyzePayslip(payslipFromRaw(loadRaw()));
    expect(ids(r)).toEqual(expect.arrayContaining(['ok:taux', 'ok:calcul', 'ok:presentes']));
    // un point conforme ne coexiste jamais avec un constat du même contrôle
    expect(r.findings.some((f) => f.code === 'TAUX_INCORRECT')).toBe(false);
    expect(r.passed!.find((p) => p.id === 'ok:taux')!.title).toMatch(/conformes au barème 2026/);
  });

  it('un taux erroné n’est pas déclaré conforme ; les autres le restent', () => {
    const raw = loadRaw();
    raw.contributions.find((c) => c.label === 'Sécurité sociale plafonnée')!.employeeRate = 7.3;
    const r = analyzePayslip(payslipFromRaw(raw));

    expect(r.findings.some((f) => f.code === 'TAUX_INCORRECT' && f.canonical === 'VIEILLESSE_PLAFONNEE')).toBe(true);
    const taux = r.passed!.find((p) => p.id === 'ok:taux')!;
    expect(taux.title).toMatch(/autres? taux conformes?/);
    expect(taux.title).not.toMatch(/^Taux de cotisations conformes/);
  });

  it('bulletin hors référentiel : ne prétend pas avoir comparé les taux', () => {
    const raw = loadRaw();
    raw.period = { month: 6, year: 2025 };
    const r = analyzePayslip(payslipFromRaw(raw));

    expect(r.summary.periodCovered).toBe(false);
    for (const skipped of ['ok:taux', 'ok:presentes', 'ok:smic', 'ok:plafond']) {
      expect(ids(r)).not.toContain(skipped);
    }
  });

  it('lecture incomplète : aucun point conforme', () => {
    const raw = loadRaw();
    raw.contributions = [];
    const r = analyzePayslip(payslipFromRaw(raw));
    expect(r.summary.canAnalyze).toBe(false);
    expect(r.passed).toEqual([]);
  });
});
