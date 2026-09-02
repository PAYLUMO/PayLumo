import { formatSignedEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { AnalysisResult } from '@shared/analysis/findings';
import { OkIcon, SeverityBadge } from './shared';

export function Anomalies({ result }: { result: AnalysisResult }) {
  const actionable = result.findings.filter((f) => f.severity !== 'info');
  const infos = result.findings.filter((f) => f.severity === 'info');

  return (
    <Card>
      <SectionTitle hint={`${actionable.length} point${actionable.length > 1 ? 's' : ''}`}>
        Ce que nous avons remarqué
      </SectionTitle>

      {actionable.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/40">
          <OkIcon size={18} />
          Rien d’anormal sur les points vérifiés (taux 2026, calculs, cohérence brut → net).
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Rien d’alarmant ici. Ces points méritent juste une question à votre service paie, qui
            pourra vous les expliquer.
          </p>
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
