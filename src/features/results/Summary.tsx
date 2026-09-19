import { Link } from 'react-router-dom';
import { RotateCcw, Sparkles } from 'lucide-react';
import { formatSignedEuro } from '@shared/lib/money';
import { Badge, Button, Card } from '@/components/ui';
import type { StoredAnalysis } from '@shared/analysis/types';
import { OkIcon, SeverityIcon } from './shared';

/** Anneau de fiabilité de la lecture du bulletin (0–1). */
function ReadRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const r = 26;
  const c = 2 * Math.PI * r;
  const color = pct >= 80 ? '#288d3f' : pct >= 55 ? '#d97706' : '#dc2626';
  return (
    <div
      className="relative h-16 w-16 shrink-0"
      role="img"
      aria-label={`Fiabilité de la lecture du bulletin : ${pct} %`}
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-[rgb(var(--border))]" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-sm font-extrabold tabular-nums">{pct} %</span>
        <span className="mt-0.5 text-[9px] text-muted">lecture</span>
      </div>
    </div>
  );
}

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
      <div className="flex items-center gap-4">
        <ReadRing value={result.summary.readConfidence} />
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold sm:text-xl">Analyse de votre bulletin</h1>
          <p className="mt-0.5 truncate text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <div className="mt-1.5">
            {analysis.reader === 'ai' ? (
              <Badge tone="info">
                <Sparkles size={12} /> Lu par l’IA
              </Badge>
            ) : (
              <Badge tone="neutral">Lu en local</Badge>
            )}
          </div>
        </div>
        <Link to="/analyser" className="shrink-0" aria-label="Nouvelle analyse">
          <Button variant="secondary" size="sm">
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Nouvelle analyse</span>
            <span className="sm:hidden">Nouveau</span>
          </Button>
        </Link>
      </div>

      <p className="mt-4 flex items-center gap-2 text-base font-bold">
        {!canAnalyze ? (
          <SeverityIcon severity="avertissement" size={20} />
        ) : !periodCovered ? (
          <SeverityIcon severity="info" size={20} />
        ) : nAnom === 0 && nCheck === 0 ? (
          <OkIcon size={20} />
        ) : (
          <SeverityIcon severity={nAnom > 0 ? 'erreur' : 'avertissement'} size={20} />
        )}
        {headline}
      </p>

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
