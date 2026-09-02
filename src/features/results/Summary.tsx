import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { formatSignedEuro } from '@shared/lib/money';
import { Badge, Card } from '@/components/ui';
import type { StoredAnalysis } from '@shared/analysis/types';
import { ConfidencePill, OkIcon, SeverityIcon } from './shared';

export function Summary({ analysis }: { analysis: StoredAnalysis }) {
  const { result, payslip, label } = analysis;
  const { severityCounts, netImpactEuro, canAnalyze } = result.summary;
  const nAnom = severityCounts.erreur;
  const nCheck = severityCounts.avertissement;

  const headline = !canAnalyze
    ? 'Lecture incomplète'
    : nAnom > 0
      ? `${nAnom} anomalie${nAnom > 1 ? 's' : ''} repérée${nAnom > 1 ? 's' : ''}`
      : nCheck > 0
        ? `${nCheck} point${nCheck > 1 ? 's' : ''} à vérifier`
        : 'Aucune anomalie repérée';

  // Palette apaisée : ambre pour une anomalie (jamais rouge), vert quand tout va bien.
  const tone = !canAnalyze
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
            {canAnalyze && nAnom === 0 && nCheck === 0 ? (
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

      {canAnalyze && (
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

      <p className="mt-4 text-xs text-muted">
        {nAnom > 0
          ? 'Rien d’alarmant : le plus souvent, une question au service paie suffit à clarifier. '
          : ''}
        Bulletin : {payslip.employee.emploi ?? 'poste non lu'} ·{' '}
        {payslip.employee.statut === 'inconnu' ? 'statut non lu' : payslip.employee.statut}
        {payslip.employee.regime === 'alsace-moselle' ? ' · Alsace-Moselle' : ''} · barème{' '}
        <Link to="/parametres" className="underline">
          2026
        </Link>
        .
      </p>
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
