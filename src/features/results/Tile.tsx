/** Tuile chiffrée : petit libellé, grande valeur, légende. */
export function Tile({
  label,
  value,
  caption,
  color,
  highlight,
}: {
  label: string;
  value: string;
  caption: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div className={'rounded-xl p-3 ' + (highlight ? 'bg-brand-50 dark:bg-brand-950/40' : 'surface-2')}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {color && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        )}
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold tabular-nums sm:text-xl">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted">{caption}</p>
    </div>
  );
}
