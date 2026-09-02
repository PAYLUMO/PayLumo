import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { Badge, cx } from '@/components/ui';
import type { Severity } from '@shared/analysis/findings';

export function SeverityIcon({ severity, size = 16 }: { severity: Severity; size?: number }) {
  if (severity === 'erreur') return <XCircle size={size} className="text-red-600 dark:text-red-400" />;
  if (severity === 'avertissement')
    return <AlertTriangle size={size} className="text-amber-600 dark:text-amber-400" />;
  return <Info size={size} className="text-sky-600 dark:text-sky-400" />;
}

export function OkIcon({ size = 16 }: { size?: number }) {
  return <CheckCircle2 size={size} className="text-brand-600 dark:text-brand-400" />;
}

export function severityLabel(s: Severity): string {
  return s === 'erreur' ? 'Erreur' : s === 'avertissement' ? 'À vérifier' : 'Info';
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = severity === 'erreur' ? 'error' : severity === 'avertissement' ? 'warn' : 'info';
  return (
    <Badge tone={tone}>
      <SeverityIcon severity={severity} size={12} />
      {severityLabel(severity)}
    </Badge>
  );
}

/** Barre de proportion horizontale (empilée). */
export function ProportionBar({
  segments,
}: {
  segments: { label: string; value: number; className: string }[];
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full surface-2">
      {segments.map((s, i) => (
        <div
          key={i}
          className={cx('h-full', s.className)}
          style={{ width: `${Math.max(0, (s.value / total) * 100)}%` }}
          title={`${s.label}`}
        />
      ))}
    </div>
  );
}

export function Row({
  label,
  value,
  sub,
  strong,
  tone,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  strong?: boolean;
  tone?: 'add' | 'sub' | 'total';
}) {
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-3 py-1.5',
        tone === 'total' && 'border-t pt-2 font-bold',
      )}
    >
      <span className={cx('text-sm', strong && 'font-semibold')}>
        {label}
        {sub ? <span className="ml-1 text-xs text-muted">{sub}</span> : null}
      </span>
      <span
        className={cx(
          'shrink-0 text-sm tabular-nums',
          strong && 'font-semibold',
          tone === 'add' && 'text-brand-700 dark:text-brand-300',
          tone === 'sub' && 'text-red-600 dark:text-red-400',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const tone = pct >= 80 ? 'ok' : pct >= 55 ? 'warn' : 'error';
  return <Badge tone={tone}>Lecture {pct} %</Badge>;
}
