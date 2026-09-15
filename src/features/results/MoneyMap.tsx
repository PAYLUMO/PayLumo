import { ChevronDown } from 'lucide-react';
import { formatEuro, roundCents } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { NET_EXPLAIN, type CategoryExplain } from '@shared/data/explanations.fr';
import { COTIS_COLOR, IMPOT_COLOR, NET_COLOR } from './categoryViz';
import { Donut, type DonutSegment } from './charts';

export function MoneyMap({ payslip }: { payslip: Payslip }) {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const totalSal =
    payslip.contributionsTotal?.employee?.value ??
    roundCents(
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

      {(payslip.netImposable ||
        payslip.netSocial ||
        payslip.pas?.amount ||
        payslip.pas?.rate ||
        payslip.cumuls) && (
        <details className="group mt-4 border-t border-[rgb(var(--border))] pt-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-muted hover:text-[rgb(var(--text))]">
            Net imposable, net social, prélèvement à la source — à quoi ça sert ?
            <ChevronDown size={14} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-3">
            {(payslip.cumuls?.brut != null ||
              payslip.cumuls?.netImposable != null ||
              payslip.cumuls?.netSocial != null) && (
              <div className="rounded-lg surface-2 p-2.5 text-xs">
                <p className="font-semibold text-[rgb(var(--text))]">
                  Cumuls depuis le 1ᵉʳ janvier
                </p>
                <p className="mt-1 text-muted">
                  Tels qu’affichés sur votre bulletin — utiles pour vos démarches. Le cumul de net
                  imposable est celui qui pré-remplit votre déclaration de revenus l’an prochain.
                </p>
                <ul className="mt-1.5 space-y-0.5 text-muted">
                  {payslip.cumuls?.brut != null && (
                    <li>
                      Brut cumulé :{' '}
                      <strong className="text-[rgb(var(--text))]">
                        {formatEuro(payslip.cumuls.brut)}
                      </strong>
                    </li>
                  )}
                  {payslip.cumuls?.netImposable != null && (
                    <li>
                      Net imposable cumulé :{' '}
                      <strong className="text-[rgb(var(--text))]">
                        {formatEuro(payslip.cumuls.netImposable)}
                      </strong>
                    </li>
                  )}
                  {payslip.cumuls?.netSocial != null && (
                    <li>
                      Net social cumulé :{' '}
                      <strong className="text-[rgb(var(--text))]">
                        {formatEuro(payslip.cumuls.netSocial)}
                      </strong>
                    </li>
                  )}
                </ul>
              </div>
            )}
            {payslip.netImposable && (
              <NetRow value={formatEuro(payslip.netImposable.value)} explain={NET_EXPLAIN.netImposable} />
            )}
            {payslip.netSocial && (
              <NetRow value={formatEuro(payslip.netSocial.value)} explain={NET_EXPLAIN.netSocial} />
            )}
            {(payslip.pas?.amount || payslip.pas?.rate) && (
              <NetRow value={pasValue(payslip.pas)} explain={NET_EXPLAIN.pas} />
            )}
          </div>
        </details>
      )}

      <p className="mt-3 text-xs text-muted">
        Vos cotisations financent une protection collective : soins remboursés, retraite, revenu en
        cas de chômage… Le détail par famille est plus bas.
      </p>
    </Card>
  );
}

function pasValue(pas: Payslip['pas']): string {
  const bits: string[] = [];
  if (pas?.amount) bits.push(formatEuro(pas.amount.value));
  if (pas?.rate) bits.push(`taux ${pas.rate.value.toLocaleString('fr-FR')} %`);
  const typeLabel =
    pas?.type === 'personnalise'
      ? 'personnalisé'
      : pas?.type === 'individualise'
        ? 'individualisé'
        : pas?.type === 'neutre'
          ? 'neutre'
          : undefined;
  if (typeLabel) bits.push(typeLabel);
  return bits.join(' · ');
}

function NetRow({ value, explain }: { value: string; explain: CategoryExplain }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{explain.title}</span>
        <span className="shrink-0 text-sm font-bold tabular-nums">{value}</span>
      </div>
      <p className="text-xs text-muted">{explain.summary}</p>
      <p className="mt-1 text-xs text-muted">{explain.finance}</p>
    </div>
  );
}
