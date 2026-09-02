import { formatEuro, roundCents } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { COTIS_COLOR, IMPOT_COLOR, NET_COLOR } from './categoryViz';
import { Donut, type DonutSegment } from './charts';

export function MoneyMap({ payslip }: { payslip: Payslip }) {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const totalSal = roundCents(
    payslip.contributions.reduce((s, c) => s + Math.abs(c.employee?.amount?.value ?? 0), 0),
  );
  const pas = payslip.pas?.amount?.value ?? 0;
  const netPaye = payslip.netAPayer.value || roundCents(gross - totalSal - pas);

  const rows: { color: string; title: string; note: string; euro: number }[] = [
    { color: NET_COLOR, title: 'Net à payer', note: 'ce qui arrive sur votre compte', euro: netPaye },
    {
      color: COTIS_COLOR,
      title: 'Cotisations sociales',
      note: 'santé, retraite, chômage, famille…',
      euro: totalSal,
    },
  ];
  if (pas > 0) {
    rows.push({
      color: IMPOT_COLOR,
      title: 'Prélèvement à la source',
      note: 'impôt sur le revenu, reversé aux impôts',
      euro: pas,
    });
  }

  const segments: DonutSegment[] = rows.map((r) => ({ label: r.title, value: r.euro, color: r.color }));

  return (
    <Card>
      <SectionTitle hint={`brut ${formatEuro(gross)}`}>Où va votre salaire brut</SectionTitle>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
        <div className="shrink-0">
          <Donut
            segments={segments}
            centerLabel="Net à payer"
            centerValue={formatEuro(netPaye, 0)}
            size={168}
          />
        </div>

        <ul className="w-full space-y-3">
          {rows.map((r) => (
            <li key={r.title} className="flex items-start gap-2.5">
              <span
                className="mt-1 h-3 w-3 shrink-0 rounded-full"
                style={{ background: r.color }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="shrink-0 text-sm tabular-nums">{formatEuro(r.euro)}</span>
                </div>
                <p className="text-xs leading-snug text-muted">{r.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 text-xs text-muted">
        Vos cotisations financent une protection collective : soins remboursés, retraite, revenu en
        cas de chômage… Le détail par famille est plus bas.
      </p>
    </Card>
  );
}
