import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { formatSignedEuro } from '@shared/lib/money';
import { Badge, Card } from '@/components/ui';
import type { StoredAnalysis } from '@shared/analysis/types';
import { ConfidencePill, OkIcon, SeverityIcon } from './shared';

export function Summary({ analysis }: { analysis: StoredAnalysis }) {
  const { result, payslip, label } = analysis;
  const {
    severityCounts,
    netImpactEuro,
    canAnalyze,
    periodCovered,
    referenceYear,
    periodYear,
    conventionLabel,
    conventionSource,
  } = result.summary;
  const nAnom = severityCounts.erreur;
  const nCheck = severityCounts.avertissement;

  const headline = !canAnalyze
    ? 'Lecture incomplète'
    : !periodCovered
      ? `Bulletin ${periodYear ?? ''} — lecture seule`
      : nAnom > 0
        ? `${nAnom} anomalie${nAnom > 1 ? 's' : ''} repérée${nAnom > 1 ? 's' : ''}`
        : nCheck > 0
          ? `${nCheck} point${nCheck > 1 ? 's' : ''} à vérifier`
          : 'Aucune anomalie repérée';

  // Palette apaisée : ambre pour une anomalie (jamais rouge), vert quand tout va bien.
  const tone = !canAnalyze || !periodCovered
    ? 'surface-2'
    : nAnom > 0 || nCheck > 0
      ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/25'
      : 'border-brand-300 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40';

  const impactLabel =
    netImpactEuro > 0
      ? 'en votre faveur — à faire valoir'
      : netImpactEuro < 0
        ? 'à votre charge'
        : 'impact estimé';

  return (
    <Card className={tone}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-extrabold sm:text-xl">
            {!canAnalyze ? (
              <SeverityIcon severity="avertissement" size={22} />
            ) : !periodCovered ? (
              <SeverityIcon severity="info" size={22} />
            ) : nAnom === 0 && nCheck === 0 ? (
              <OkIcon size={22} />
            ) : (
              <SeverityIcon severity={nAnom > 0 ? 'erreur' : 'avertissement'} size={22} />
            )}
            {headline}
          </h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ConfidencePill value={result.summary.readConfidence} />
          {analysis.reader === 'ai' ? (
            <Badge tone="info">
              <Sparkles size={12} /> Lu par l’IA
            </Badge>
          ) : (
            <Badge tone="neutral">Lu en local</Badge>
          )}
        </div>
      </div>

      {canAnalyze && periodCovered && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat n={nAnom} label="Anomalies" tone="text-amber-600 dark:text-amber-400" />
          <Stat n={nCheck} label="À vérifier" tone="text-sky-600 dark:text-sky-400" />
          <div className="rounded-xl surface-2 p-2">
            <div className="text-lg font-extrabold tabular-nums">
              {netImpactEuro === 0 ? '—' : formatSignedEuro(netImpactEuro)}
            </div>
            <div className="text-[11px] leading-tight text-muted">{impactLabel}</div>
          </div>
        </div>
      )}

      {canAnalyze && !periodCovered && (
        <p className="mt-4 rounded-xl surface-2 p-3 text-sm text-muted">
          PayLumo ne compare les taux qu’au <strong>barème légal {referenceYear}</strong>. Ce
          bulletin est de <strong>{periodYear}</strong> : vous avez la lecture complète, la
          décomposition du salaire et l’explication de chaque cotisation, mais{' '}
          <strong>les taux ne sont pas vérifiés</strong>.
        </p>
      )}

      <p className="mt-4 text-xs text-muted">
        Bulletin : {payslip.employee.emploi ?? 'poste non lu'} ·{' '}
        {payslip.employee.statut === 'inconnu' ? 'statut non lu' : payslip.employee.statut}
        {payslip.employee.regime === 'alsace-moselle' ? ' · Alsace-Moselle' : ''} · barème{' '}
        <Link to="/parametres" className="underline">
          {referenceYear}
        </Link>
        .
      </p>
      {conventionLabel && (
        <p className="mt-1 text-xs text-muted">
          Convention collective : <strong className="text-[rgb(var(--text))]">{conventionLabel}</strong>
          {conventionSource === 'detected' ? ' (détectée sur le bulletin)' : ' (renseignée par vous)'}
        </p>
      )}
    </Card>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div className="rounded-xl surface-2 p-2">
      <div className={`text-lg font-extrabold tabular-nums ${n > 0 ? tone : ''}`}>{n}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
