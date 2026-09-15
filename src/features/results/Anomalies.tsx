import { formatSignedEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { AnalysisResult } from '@shared/analysis/findings';
import { isBatimentTP } from '@shared/data/conventions';
import { OkIcon, SeverityBadge } from './shared';

export function Anomalies({ result }: { result: AnalysisResult }) {
  const actionable = result.findings.filter((f) => f.severity !== 'info');
  const infos = result.findings.filter(
    (f) => f.severity === 'info' && f.code !== 'PERIODE_NON_COUVERTE',
  );
  const { periodCovered, referenceYear, conventionLabel, conventionSource } = result.summary;
  const isBTP = isBatimentTP(conventionLabel);

  return (
    <Card>
      <SectionTitle hint={`${actionable.length} point${actionable.length > 1 ? 's' : ''}`}>
        Ce que nous avons remarqué
      </SectionTitle>

      {actionable.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/40">
          <OkIcon size={18} />
          {periodCovered
            ? `Rien d’anormal sur les points vérifiés (taux ${referenceYear}, calculs, cohérence brut → net).`
            : 'Rien d’anormal sur ce qui a pu être vérifié (calculs internes, cohérence brut → net). Les taux n’ont pas été comparés.'}
        </div>
      ) : (
        <>
          <div className="mb-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 text-sm text-muted">
            <strong className="text-[rgb(var(--text))]">Un écart n’est pas forcément une erreur.</strong>{' '}
            PayLumo compare uniquement au <strong className="text-[rgb(var(--text))]">barème légal
            {' '}{referenceYear}</strong> ;{' '}
            {conventionLabel ? (
              <>
                {conventionSource === 'detected'
                  ? 'la convention collective détectée sur ce bulletin'
                  : 'la convention collective que vous avez indiquée'}
                {' — '}
                <strong className="text-[rgb(var(--text))]">{conventionLabel}</strong> —{' '}
              </>
            ) : (
              'votre convention collective ou un accord d’entreprise '
            )}
            peut prévoir d’autres règles, parfaitement valables
            {isBTP ? (
              <>
                {' '}(dans le BTP, un abattement pour frais professionnels — jusqu’à 10 % — est
                parfois appliqué sur autorisation de l’employeur, ce qui peut aussi expliquer un
                écart d’assiette)
              </>
            ) : (
              ' (par exemple l’abattement pour frais professionnels dans le BTP)'
            )}
            . Ces points sont là pour être <em>expliqués</em> — pour les confirmer, voyez avec votre{' '}
            <strong>gestionnaire de paie</strong> ou un <strong>expert-comptable</strong>.
          </div>
          <ul className="space-y-3">
            {actionable.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/60 dark:bg-amber-950/20"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  <span className="font-semibold">{f.title}</span>
                  {f.impactEuro != null && Math.abs(f.impactEuro) >= 0.5 && (
                    <span className="ml-auto text-sm font-bold tabular-nums">
                      {formatSignedEuro(f.impactEuro)}
                    </span>
                  )}
                </div>
              {(f.expected != null || f.found != null) && (
                <div className="mt-1 text-xs text-muted">
                  Attendu : <span className="font-medium text-[rgb(var(--text))]">{f.expected ?? '—'}</span> ·
                  Lu : <span className="font-medium text-[rgb(var(--text))]">{f.found ?? '—'}</span>
                </div>
              )}
                <p className="mt-1.5 text-sm text-muted">{f.detail}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {infos.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            {infos.length} information{infos.length > 1 ? 's' : ''} complémentaire{infos.length > 1 ? 's' : ''}
          </summary>
          <ul className="mt-2 space-y-2">
            {infos.map((f) => (
              <li key={f.id} className="rounded-lg surface-2 p-2 text-xs">
                <span className="font-semibold">{f.title}</span> — {f.detail}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
