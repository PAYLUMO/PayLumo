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
