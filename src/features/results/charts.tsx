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

const SUB_COLOR = 'rgb(239 138 98)'; // orange doux — « ce qui est prélevé »
const TOTAL_COLOR = 'rgb(62 158 78)'; // vert marque
const ADD_COLOR = 'rgb(120 190 130)';

const MIN_BAR = 0.05; // largeur minimale d'une barre de déduction (fraction)

export function Waterfall({ steps }: { steps: WaterfallStep[] }) {
  // Cumul : chaque déduction « mord » la barre du total au-dessus, par la droite.
  let running = 0;
  const rows = steps.map((s) => {
    let from: number;
    let to: number;
    if (s.kind === 'start' || s.kind === 'total') {
      from = 0;
      to = s.kind === 'start' ? s.amount : running;
      running = to;
    } else if (s.kind === 'sub') {
      to = running;
      from = running - s.amount;
      running = from;
    } else {
      from = running;
      to = running + s.amount;
      running = to;
    }
    return { s, from, to };
  });

  const max = Math.max(...rows.map((r) => Math.max(r.from, r.to)), 1);
  const f = (v: number) => v / max;

  // Lignes de repère verticales aux montants « totaux ».
  const guides = [
    ...new Set(rows.filter((r) => r.s.kind !== 'sub' && r.s.kind !== 'add').map((r) => f(r.to))),
  ].filter((x) => x > 0.001 && x < 0.999);

  return (
    <div className="relative">
      {guides.map((x, i) => (
        <div
          key={`g${i}`}
          className="pointer-events-none absolute inset-y-1 w-px bg-[rgb(var(--border))]"
          style={{ left: `${x * 100}%` }}
          aria-hidden="true"
        />
      ))}

      <div className="relative space-y-2">
        {rows.map(({ s, from, to }, i) => {
          const emphatic = s.kind === 'start' || s.kind === 'total';
          let left = f(Math.min(from, to));
          let width = f(Math.abs(to - from));
          if (s.kind === 'sub' && width < MIN_BAR) {
            // garde le bord droit ancré sur le total, élargit vers la gauche
            left = Math.max(0, f(to) - MIN_BAR);
            width = MIN_BAR;
          }
          const color = s.kind === 'sub' ? SUB_COLOR : s.kind === 'add' ? ADD_COLOR : TOTAL_COLOR;
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className={emphatic ? 'font-semibold' : 'text-muted'}>{s.label}</span>
                <span
                  className={
                    'shrink-0 tabular-nums ' +
                    (s.kind === 'sub' ? '' : emphatic ? 'font-semibold' : 'text-muted')
                  }
                  style={s.kind === 'sub' ? { color: SUB_COLOR } : undefined}
                >
                  {s.valueText}
                </span>
              </div>
              <div className="relative mt-0.5 h-3 overflow-hidden rounded-md surface-2">
                <div
                  className="absolute inset-y-0 rounded-md"
                  style={{
                    left: `${left * 100}%`,
                    width: `${Math.max(width * 100, 1)}%`,
                    background: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
