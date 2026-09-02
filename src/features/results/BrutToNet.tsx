import { formatEuro, formatSignedEuro, roundCents } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { ProportionBar, Row } from './shared';

export function BrutToNet({ payslip }: { payslip: Payslip }) {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const totalSal = roundCents(
    payslip.contributions.reduce((s, c) => s + Math.abs(c.employee?.amount?.value ?? 0), 0),
  );
  const netAvantImpot = payslip.netAvantImpot?.value ?? roundCents(gross - totalSal);
  const pas = payslip.pas?.amount?.value ?? 0;
  const netPaye = payslip.netAPayer.value || roundCents(netAvantImpot - pas);

  return (
    <Card>
      <SectionTitle hint={`net payé ${formatEuro(netPaye)}`}>Du brut au net</SectionTitle>

      <ProportionBar
        segments={[
          { label: 'Net payé', value: netPaye, className: 'bg-brand-500' },
          { label: 'Impôt (PAS)', value: pas, className: 'bg-sky-400' },
          { label: 'Cotisations salariales', value: totalSal, className: 'bg-red-400' },
        ]}
      />
      <div className="mb-3 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <Legend className="bg-brand-500" label={`Net payé ${pct(netPaye, gross)}`} />
        <Legend className="bg-sky-400" label={`Impôt ${pct(pas, gross)}`} />
        <Legend className="bg-red-400" label={`Cotisations ${pct(totalSal, gross)}`} />
      </div>

      <div className="divide-y divide-[rgb(var(--border))]">
        <Row label="Salaire brut" value={formatEuro(gross)} strong />
        <Row label="Cotisations salariales" value={formatSignedEuro(-totalSal)} tone="sub" />
        <Row
          label="Net à payer avant impôt"
          value={formatEuro(netAvantImpot)}
          sub={payslip.netAvantImpot ? undefined : 'estimé'}
          strong
        />
        {payslip.netSocial && (
          <Row label="Montant net social" value={formatEuro(payslip.netSocial.value)} sub="pour la CAF / France Travail" />
        )}
        {payslip.netImposable && (
          <Row label="Net imposable" value={formatEuro(payslip.netImposable.value)} sub="déclaré aux impôts" />
        )}
        {pas > 0 && (
          <Row
            label="Prélèvement à la source"
            sub={payslip.pas?.rate ? `taux ${payslip.pas.rate.value} %` : undefined}
            value={formatSignedEuro(-pas)}
            tone="sub"
          />
        )}
        <Row label="Net payé" value={formatEuro(netPaye)} tone="total" />
      </div>
    </Card>
  );
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '';
  return `${Math.round((part / whole) * 100)} %`;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
