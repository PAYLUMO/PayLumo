import type { ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, Search } from 'lucide-react';
import { Badge, cx } from '@/components/ui';
import type { Severity } from '@shared/analysis/findings';

export function SeverityIcon({ severity, size = 16 }: { severity: Severity; size?: number }) {
  if (severity === 'erreur')
    return <CircleAlert size={size} className="text-amber-600 dark:text-amber-400" />;
  if (severity === 'avertissement')
    return <Search size={size} className="text-sky-600 dark:text-sky-400" />;
  return <Info size={size} className="text-muted" />;
}

export function OkIcon({ size = 16 }: { size?: number }) {
  return <CheckCircle2 size={size} className="text-brand-600 dark:text-brand-400" />;
}

export function severityLabel(s: Severity): string {
  return s === 'erreur' ? 'Anomalie' : s === 'avertissement' ? 'À vérifier' : 'Remarque';
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone = severity === 'erreur' ? 'warn' : severity === 'avertissement' ? 'info' : 'neutral';
  return (
    <Badge tone={tone}>
      <SeverityIcon severity={severity} size={12} />
      {severityLabel(severity)}
    </Badge>
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
