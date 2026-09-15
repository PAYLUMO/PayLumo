import { formatEuro, formatSignedEuro, roundCents } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import { CATEGORY_EXPLAIN } from '@shared/data/explanations.fr';
import type { Payslip } from '@shared/parsing/model';
import { CAT_COLOR, COTIS_COLOR, IMPOT_COLOR, NET_COLOR, employerCostByCategory } from './categoryViz';

const PAT_COLOR = '#b45309'; // brun — cotisations patronales

export function EmployerCost({ payslip }: { payslip: Payslip }) {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const byCat = employerCostByCategory(payslip);
  const perLinePat = roundCents(byCat.reduce((s, c) => s + c.euro, 0));

  // Total patronal : on privilégie ce que le bulletin affiche lui-même
  // (ligne « Total des cotisations » ou « Coût total employeur »), la somme
  // ligne à ligne ne servant que de secours.
  const totalFromBulletin =
    payslip.contributionsTotal?.employer?.value ??
    (payslip.employerCost?.value ? roundCents(payslip.employerCost.value - gross) : undefined);
  const totalPat = totalFromBulletin ?? perLinePat;

  if (totalPat <= 0) {
    return (
      <Card>
        <SectionTitle>Le coût pour l’employeur</SectionTitle>
        <p className="text-sm text-muted">
          Les cotisations patronales n’ont pas pu être lues sur ce bulletin — impossible d’estimer
          le coût total du poste.
        </p>
      </Card>
    );
  }

  const cost = payslip.employerCost?.value ?? roundCents(gross + totalPat);
  const totalSal =
    payslip.contributionsTotal?.employee?.value ??
    roundCents(
      payslip.contributions.reduce((s, c) => s + Math.abs(c.employee?.amount?.value ?? 0), 0),
    );
  const pas = payslip.pas?.amount?.value ?? 0;
  const netPaye = payslip.netAPayer.value || roundCents(gross - totalSal - pas);
  const ratio = netPaye > 0 ? cost / netPaye : 0;

  // Reliquat éventuel entre le total du bulletin et le détail par famille lu.
  const patRemainder = roundCents(totalPat - perLinePat);

  // La part « nette » de la barre est le solde (garantit que la barre = coût
  // total, même quand des indemnités non soumises brouillent brut − cotis = net).
  const netShare = roundCents(cost - totalPat - totalSal - pas);
  const bar = [
    { label: 'Net pour le salarié', value: netShare > 0 ? netShare : 0, color: NET_COLOR },
    ...(pas > 0 ? [{ label: 'Impôt sur le revenu', value: pas, color: IMPOT_COLOR }] : []),
    { label: 'Cotisations salariales', value: totalSal, color: COTIS_COLOR },
    { label: 'Cotisations patronales', value: totalPat, color: PAT_COLOR },
  ];

  return (
    <Card>
      <SectionTitle hint={`coût total ${formatEuro(cost)}`}>Le coût pour l’employeur</SectionTitle>

      <p className="text-sm">
        Pour vous verser <strong>{formatEuro(netPaye)}</strong> net, votre poste coûte{' '}
        <strong>{formatEuro(cost)}</strong> à l’employeur
        {ratio > 0 && <> — soit {ratio.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}×</>}.
      </p>

      {/* Barre : où va chaque euro du coût total */}
      <div className="mt-4 flex h-4 w-full overflow-hidden rounded-md">
        {bar.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / cost) * 100}%`, background: s.color }}
            title={`${s.label} — ${formatEuro(s.value)}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {bar.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label} · {formatEuro(s.value)}
          </li>
        ))}
      </ul>

      {/* Détail du calcul */}
      <div className="mt-4 divide-y divide-[rgb(var(--border))] text-sm">
        <Line label="Salaire brut" value={formatEuro(gross)} />
        <Line label="+ Cotisations patronales" value={formatSignedEuro(totalPat)} tone="add" />
        <Line label="Coût total employeur" value={formatEuro(cost)} strong />
      </div>

      {/* Cotisations patronales par famille */}
      <p className="mt-4 mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        Cotisations patronales, par famille
      </p>
      <ul className="space-y-1.5">
        {byCat.map((c) => (
          <li key={c.category} className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CAT_COLOR[c.category] }}
                aria-hidden="true"
              />
              {CATEGORY_EXPLAIN[c.category].title}
            </span>
            <span className="tabular-nums text-muted">{formatEuro(c.euro)}</span>
          </li>
        ))}
        {patRemainder > 1 && (
          <li className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: CAT_COLOR.AUTRES }}
                aria-hidden="true"
              />
              Autres (conventionnelles, non détaillées)
            </span>
            <span className="tabular-nums text-muted">{formatEuro(patRemainder)}</span>
          </li>
        )}
      </ul>

      <p className="mt-4 text-xs text-muted">
        Ces cotisations ne sortent pas de votre poche, mais financent la même protection collective
        (assurance maladie, retraite, chômage, famille). Elles expliquent l’écart entre ce que vous
        touchez et ce que coûte votre emploi.
      </p>
    </Card>
  );
}

function Line({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'add';
}) {
  return (
    <div className={'flex items-baseline justify-between gap-3 py-1.5' + (strong ? ' font-semibold' : '')}>
      <span className={strong ? '' : 'text-muted'}>{label}</span>
      <span
        className={
          'shrink-0 tabular-nums' + (tone === 'add' ? ' text-[#b45309] dark:text-amber-500' : '')
        }
      >
        {value}
      </span>
    </div>
  );
}
