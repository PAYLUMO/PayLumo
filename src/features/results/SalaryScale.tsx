import { cx } from '@/components/ui';
import { formatEuro } from '@shared/lib/money';

const eur = (n: number) => formatEuro(n, 0);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface Props {
  /** net mensuel à temps plein de la personne. */
  value: number;
  /** seuils INSEE : 10 % gagnent moins que d1, 50 % moins que la médiane, 10 % gagnent plus que d9. */
  d1: number;
  median: number;
  d9: number;
}

/**
 * Échelle de salaires : quatre zones (10 % les plus bas, sous la médiane, au-dessus,
 * top 10 %) délimitées par les seuils INSEE, un repère « Vous » et une légende qui
 * met en avant la zone de la personne.
 * Ne représente que ce que l'INSEE publie (D1, médiane, D9) : aucune courbe inventée.
 */
export function SalaryScale({ value, d1, median, d9 }: Props) {
  const min = Math.min(value, d1) * 0.82;
  const max = Math.max(value, d9) * 1.06;
  const x = (v: number) => clamp(((v - min) / (max - min)) * 100, 0, 100);
  const you = x(value);
  const current = value < d1 ? 0 : value < median ? 1 : value < d9 ? 2 : 3;

  const zones = [
    { from: 0, to: x(d1), cls: 'bg-[rgb(var(--border))] dark:bg-white/25', range: `< ${eur(d1)}`, caption: '10 % les plus bas' },
    { from: x(d1), to: x(median), cls: 'bg-brand-100 dark:bg-brand-800', range: `${eur(d1)} – ${eur(median)}`, caption: 'sous la médiane' },
    { from: x(median), to: x(d9), cls: 'bg-brand-300 dark:bg-brand-600', range: `${eur(median)} – ${eur(d9)}`, caption: 'au-dessus de la médiane' },
    { from: x(d9), to: 100, cls: 'bg-brand-600 dark:bg-brand-300', range: `> ${eur(d9)}`, caption: 'top 10 %' },
  ];

  // étiquette du repère : décalée près des bords pour ne pas déborder (la pointe reste sur la valeur)
  const labelShift = you < 14 ? '30%' : you > 86 ? '-30%' : '0%';

  return (
    <div
      role="img"
      aria-label={`Votre net à temps plein, ${eur(value)}, sur l’échelle des salaires du privé : ${zones[current].caption} (médiane ${eur(median)}, seuil du top 10 % ${eur(d9)}).`}
    >
      {/* repère « Vous » */}
      <div className="relative h-11">
        <div className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${you}%` }}>
          <span
            className="relative z-10 whitespace-nowrap rounded-lg bg-brand-600 px-2.5 py-1 text-sm font-extrabold tabular-nums text-white shadow-sm dark:bg-brand-500"
            style={{ transform: `translateX(${labelShift})` }}
          >
            {eur(value)}
          </span>
          <span className="-mt-1.5 h-3 w-3 rotate-45 rounded-[2px] bg-brand-600 dark:bg-brand-500" />
        </div>
      </div>

      {/* piste : zones, séparateurs aux seuils, repère */}
      <div className="relative mt-1 h-3.5">
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {zones.map((z) => (
            <span key={z.from} className={`absolute inset-y-0 ${z.cls}`} style={{ left: `${z.from}%`, width: `${z.to - z.from}%` }} />
          ))}
        </div>
        {[d1, median, d9].map((v) => (
          <span
            key={v}
            className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded bg-[rgb(var(--surface))]"
            style={{ left: `${x(v)}%` }}
          />
        ))}
        <span
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[rgb(var(--surface))] bg-brand-600 shadow dark:bg-white"
          style={{ left: `${you}%` }}
        />
      </div>

      {/* légende par zone : jamais de chevauchement, la zone courante est mise en avant */}
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {zones.map((z, i) => (
          <li
            key={z.from}
            className={cx(
              'rounded-lg p-2 text-[11px] leading-tight',
              i === current ? 'bg-[rgb(var(--surface))] ring-2 ring-brand-600 dark:ring-brand-400' : 'surface-2',
            )}
          >
            <span className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${z.cls}`} aria-hidden="true" />
              <span className="font-bold tabular-nums">{z.range}</span>
            </span>
            <span className={cx('mt-0.5 block', i === current ? 'font-semibold' : 'text-muted')}>{z.caption}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
