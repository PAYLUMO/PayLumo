import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { formatSignedEuro } from '@shared/lib/money';
import { Badge, Card } from '@/components/ui';
import type { StoredAnalysis } from '@shared/analysis/types';
import { ConfidencePill, OkIcon, SeverityIcon } from './shared';

export function Summary({ analysis }: { analysis: StoredAnalysis }) {
  const { result, payslip, label } = analysis;
  const { severityCounts, netImpactEuro, canAnalyze } = result.summary;
  const nErr = severityCounts.erreur;
  const nWarn = severityCounts.avertissement;

  const headline = !canAnalyze
    ? 'Lecture incomplète'
    : nErr > 0
      ? `${nErr} anomalie${nErr > 1 ? 's' : ''} à corriger`
      : nWarn > 0
        ? `${nWarn} point${nWarn > 1 ? 's' : ''} à vérifier`
        : 'Aucune anomalie détectée';

  const tone = !canAnalyze
    ? 'surface-2'
    : nErr > 0
      ? 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40'
      : nWarn > 0
        ? 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
        : 'border-brand-300 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/40';

  return (
    <Card className={tone}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-extrabold sm:text-xl">
            {canAnalyze && nErr === 0 && nWarn === 0 ? (
              <OkIcon size={22} />
            ) : (
              <SeverityIcon severity={nErr > 0 ? 'erreur' : 'avertissement'} size={22} />
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
          <Stat n={nErr} label="Erreurs" tone="text-red-600 dark:text-red-400" />
          <Stat n={nWarn} label="À vérifier" tone="text-amber-600 dark:text-amber-400" />
          <div className="rounded-xl surface-2 p-2">
            <div className="text-lg font-extrabold tabular-nums">
              {netImpactEuro === 0 ? '—' : formatSignedEuro(netImpactEuro)}
            </div>
            <div className="text-[11px] text-muted">
              Impact estimé{netImpactEuro > 0 ? ' (en votre faveur)' : netImpactEuro < 0 ? ' (défaveur)' : ''}
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Bulletin : {payslip.employee.emploi ?? 'poste non lu'} ·{' '}
        {payslip.employee.statut === 'inconnu' ? 'statut non lu' : payslip.employee.statut}
        {payslip.employee.regime === 'alsace-moselle' ? ' · Alsace-Moselle' : ''} · analyse{' '}
        <Link to="/parametres" className="underline">
          référentiel 2026
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
