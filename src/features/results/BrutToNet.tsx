import { formatEuro, formatSignedEuro, roundCents } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { Row } from './shared';
import { Waterfall, type WaterfallStep } from './charts';

export function BrutToNet({ payslip }: { payslip: Payslip }) {
  const gross = payslip.gross.value;
  if (gross <= 0) return null;

  const totalSal = roundCents(
    payslip.contributions.reduce((s, c) => s + Math.abs(c.employee?.amount?.value ?? 0), 0),
  );
  const netAvantImpot = payslip.netAvantImpot?.value ?? roundCents(gross - totalSal);
  const pas = payslip.pas?.amount?.value ?? 0;
  const netPaye = payslip.netAPayer.value || roundCents(netAvantImpot - pas);

  const steps: WaterfallStep[] = [
    { label: 'Salaire brut', kind: 'start', amount: gross, valueText: formatEuro(gross) },
    {
      label: 'Cotisations salariales',
      kind: 'sub',
      amount: totalSal,
      valueText: formatSignedEuro(-totalSal),
    },
    {
      label: 'Net à payer avant impôt',
      kind: 'total',
      amount: netAvantImpot,
      valueText: formatEuro(netAvantImpot),
    },
  ];
  if (pas > 0) {
    steps.push({
      label: 'Prélèvement à la source',
      kind: 'sub',
      amount: pas,
      valueText: formatSignedEuro(-pas),
    });
    steps.push({ label: 'Net payé', kind: 'total', amount: netPaye, valueText: formatEuro(netPaye) });
  }

  return (
    <Card>
      <SectionTitle hint={`net payé ${formatEuro(netPaye)}`}>Du brut au net</SectionTitle>

      <Waterfall steps={steps} />

      <div className="mt-4 divide-y divide-[rgb(var(--border))]">
        {payslip.netSocial && (
          <Row
            label="Montant net social"
            value={formatEuro(payslip.netSocial.value)}
            sub="ce que la CAF / France Travail prend en compte"
          />
        )}
        {payslip.netImposable && (
          <Row
            label="Net imposable"
            value={formatEuro(payslip.netImposable.value)}
            sub="montant déclaré aux impôts"
          />
        )}
        {payslip.pas?.rate && (
          <Row label="Taux de prélèvement à la source" value={`${payslip.pas.rate.value} %`} sub="fixé par les impôts" />
        )}
      </div>
    </Card>
  );
}
