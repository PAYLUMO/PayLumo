import { formatEuro } from '@shared/lib/money';
import type { Estimate } from './estimate';

/**
 * Barre horizontale : distribution nationale (D1 · médiane · D9), médiane du
 * profil, et curseur du salaire saisi.
 */
export function DistributionBar({ estimate, salary }: { estimate: Estimate; salary?: number }) {
  const { d1, median: natMedian, d9 } = estimate.national;
  const points = [d1, natMedian, d9, estimate.median, ...(salary ? [salary] : [])];
  const min = Math.min(...points) * 0.88;
  const max = Math.max(...points) * 1.08;
  const x = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        Salaires du secteur privé · INSEE 2023
      </p>
      <div className="relative mt-7 h-3 rounded-full surface-2">
        {/* zone D1–D9 */}
        <div
          className="absolute inset-y-0 rounded-full bg-brand-200 dark:bg-brand-900/60"
          style={{ left: `${x(d1)}%`, width: `${x(d9) - x(d1)}%` }}
        />
        {/* médiane nationale */}
        <Tick pos={x(natMedian)} className="bg-[rgb(var(--text-muted))]" />
        {/* médiane du profil */}
        <Tick pos={x(estimate.median)} className="bg-brand-600 dark:bg-brand-400" tall />

        {salary != null && (
          <div
            className="absolute -top-6 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${Math.max(4, Math.min(96, x(salary)))}%` }}
          >
            <span className="whitespace-nowrap rounded-md bg-[rgb(var(--text))] px-1.5 py-0.5 text-[11px] font-semibold text-[rgb(var(--bg))]">
              {formatEuro(salary, 0)}
            </span>
            <span className="h-4 w-0.5 bg-[rgb(var(--text))]" />
          </div>
        )}
      </div>

      <div className="relative mt-1.5 h-4 text-[11px] text-muted">
        <span className="absolute left-0">10 % gagnent moins de {formatEuro(d1, 0)}</span>
        <span className="absolute right-0">10 % gagnent plus de {formatEuro(d9, 0)}</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-600 dark:bg-brand-400" />
          médiane de votre profil · {formatEuro(estimate.median, 0)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[rgb(var(--text-muted))]" />
          médiane nationale · {formatEuro(natMedian, 0)}
        </span>
      </div>
    </div>
  );
}

function Tick({ pos, className, tall }: { pos: number; className: string; tall?: boolean }) {
  return (
    <span
      className={`absolute w-0.5 -translate-x-1/2 rounded ${className} ${tall ? '-inset-y-1' : 'inset-y-0'}`}
      style={{ left: `${Math.max(0, Math.min(100, pos))}%` }}
    />
  );
}
