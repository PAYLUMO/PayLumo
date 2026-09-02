/**
 * Démo : analyse le bulletin d'exemple embarqué, en local, sans paiement.
 * Réutilise le vrai pipeline (extraction + moteur d'analyse), donc reste
 * toujours cohérent avec le référentiel 2026.
 */

import type { StoredAnalysis } from '@shared/analysis/types';

export const DEMO_ID = 'demo-exemple';

export async function runDemo(): Promise<StoredAnalysis> {
  const res = await fetch(`${import.meta.env.BASE_URL}exemple-bulletin-anomalie.pdf`);
  const buf = await res.arrayBuffer();

  const [{ readPdfText }, { extractPayslip }, { analyzePayslip }] = await Promise.all([
    import('@/features/parsing/pdf'),
    import('@shared/parsing/extract'),
    import('@shared/analysis/engine'),
  ]);

  const doc = await readPdfText(buf);
  const payslip = extractPayslip(doc);
  const result = analyzePayslip(payslip);

  const { month, year } = payslip.period.value;
  const periode = month && year ? `${['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][month - 1]} ${year}` : 'exemple';

  return {
    id: DEMO_ID,
    createdAt: Date.now(),
    fileName: 'exemple-bulletin.pdf',
    label: `Exemple · ${periode}${payslip.employer.name ? ` · ${payslip.employer.name}` : ''}`,
    reader: 'local',
    payslip,
    result,
  };
}
