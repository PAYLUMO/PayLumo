/**
 * Graphiques SVG maison (aucune dépendance) : anneau + cascade.
 * Couleurs passées en props ; le texte suit les tokens de thème.
 */

const INK = 'rgb(var(--text))';
const INK_MUTED = 'rgb(var(--text-muted))';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 176,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  const c = size / 2;
  const stroke = size * 0.15;
  const radius = c - stroke / 2 - 1;
  const circ = 2 * Math.PI * radius;
  let acc = 0;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Répartition du salaire brut : ${segments
        .map((s) => `${s.label} ${Math.round((s.value / total) * 100)} %`)
        .join(', ')}`}
    >
      <circle cx={c} cy={c} r={radius} fill="none" stroke="rgb(var(--surface-2))" strokeWidth={stroke} />
      <g transform={`rotate(-90 ${c} ${c})`}>
        {segments.map((s, i) => {
          const frac = Math.max(0, s.value) / total;
          const len = frac * circ;
          const gap = 1.5;
          const seg = (
            <circle
              key={i}
              cx={c}
              cy={c}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, len - gap)} ${circ - Math.max(0, len - gap)}`}
              strokeDashoffset={-acc}
            >
              <title>{`${s.label} — ${Math.round(frac * 100)} %`}</title>
            </circle>
          );
          acc += len;
          return seg;
        })}
      </g>
      <text x={c} y={c - size * 0.02} textAnchor="middle" fontSize={size * 0.082} fill={INK_MUTED}>
        {centerLabel}
      </text>
      <text
        x={c}
        y={c + size * 0.13}
        textAnchor="middle"
        fontSize={size * 0.135}
        fontWeight="700"
        fill={INK}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {centerValue}
      </text>
    </svg>
  );
}

export interface WaterfallStep {
  label: string;
  /** montant € affiché (toujours positif) */
  amount: number;
  kind: 'start' | 'sub' | 'add' | 'total';
  valueText: string;
}

export function Waterfall({ steps }: { steps: WaterfallStep[] }) {
  // Calcule le cumul et l'échelle.
  let running = 0;
  const rows = steps.map((s) => {
    let from: number;
    let to: number;
    if (s.kind === 'start' || s.kind === 'total') {
      from = 0;
      to = s.kind === 'start' ? s.amount : running;
      running = to;
    } else if (s.kind === 'sub') {
      from = running - s.amount;
      to = running;
      running = from;
    } else {
      from = running;
      to = running + s.amount;
      running = to;
    }
    return { s, from, to };
  });
  const max = Math.max(...rows.map((r) => Math.max(r.from, r.to)), 1);

  const color = (k: WaterfallStep['kind']) =>
    k === 'sub'
      ? 'rgb(248 113 113)'
      : k === 'add'
        ? 'rgb(94 184 102)'
        : 'rgb(62 158 78)';

  return (
    <div className="space-y-1.5">
      {rows.map(({ s, from, to }, i) => {
        const left = (Math.min(from, to) / max) * 100;
        const width = (Math.abs(to - from) / max) * 100;
        const emphatic = s.kind === 'start' || s.kind === 'total';
        return (
          <div key={i} className="grid grid-cols-[1fr] gap-0.5">
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className={emphatic ? 'font-semibold' : 'text-muted'}>{s.label}</span>
              <span
                className={
                  'shrink-0 tabular-nums ' +
                  (s.kind === 'sub'
                    ? 'text-red-600 dark:text-red-400'
                    : emphatic
                      ? 'font-semibold'
                      : 'text-muted')
                }
              >
                {s.valueText}
              </span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full surface-2">
              <div
                className="absolute inset-y-0 rounded-full"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0.8)}%`,
                  background: color(s.kind),
                  opacity: emphatic ? 1 : 0.85,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
