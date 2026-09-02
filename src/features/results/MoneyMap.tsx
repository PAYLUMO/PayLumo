import { formatEuro, roundCents } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { CATEGORY_EXPLAIN } from '@shared/data/explanations.fr';
import { CAT_COLOR, IMPOT_COLOR, NET_COLOR, employeeCostByCategory } from './categoryViz';
import { Donut, type DonutSegment } from './charts';

export function MoneyMap({ payslip }: { payslip: Payslip }) {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const byCat = employeeCostByCategory(payslip);
  const totalSal = roundCents(byCat.reduce((s, c) => s + c.euro, 0));
  const pas = payslip.pas?.amount?.value ?? 0;
  const netPaye = payslip.netAPayer.value || roundCents(gross - totalSal - pas);

  const segments: DonutSegment[] = [
    { label: 'Net payé', value: netPaye, color: NET_COLOR },
    ...byCat.map((c) => ({
      label: CATEGORY_EXPLAIN[c.category].title,
      value: c.euro,
      color: CAT_COLOR[c.category],
    })),
  ];
  if (pas > 0) segments.push({ label: 'Impôt sur le revenu', value: pas, color: IMPOT_COLOR });

  const rows: { color: string; title: string; note: string; euro: number }[] = [
    {
      color: NET_COLOR,
      title: 'Net payé',
      note: 'ce qui arrive sur votre compte',
      euro: netPaye,
    },
    ...byCat.map((c) => ({
      color: CAT_COLOR[c.category],
      title: CATEGORY_EXPLAIN[c.category].title,
      note: CATEGORY_EXPLAIN[c.category].summary,
      euro: c.euro,
    })),
  ];
  if (pas > 0) {
    rows.push({
      color: IMPOT_COLOR,
      title: 'Impôt sur le revenu',
      note: 'prélevé à la source, reversé aux impôts',
      euro: pas,
    });
  }

  return (
    <Card>
      <SectionTitle hint={`brut ${formatEuro(gross)}`}>Où va votre salaire brut</SectionTitle>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div className="shrink-0">
          <Donut segments={segments} centerLabel="Net payé" centerValue={formatEuro(netPaye, 0)} />
        </div>

        <ul className="w-full space-y-2.5">
          {rows.map((r) => (
            <li key={r.title} className="flex items-start gap-2.5">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
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
        Vos cotisations financent une protection collective : soins remboursés, retraite, revenu
        en cas de chômage… Chaque famille est détaillée plus bas.
      </p>
    </Card>
  );
}
