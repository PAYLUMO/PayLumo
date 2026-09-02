import { formatEuro, formatSignedEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { GrossItem, Payslip } from '@shared/parsing/model';
import { Row } from './shared';

const KIND_LABEL: Record<GrossItem['kind'], string> = {
  base: 'Salaire de base',
  prime: 'Prime',
  heures_supp: 'Heures supplémentaires',
  heures_comp: 'Heures complémentaires',
  avantage: 'Avantage en nature',
  indemnite: 'Indemnité',
  absence: 'Absence / retenue',
  autre: 'Autre élément',
};

export function GrossComposition({ payslip }: { payslip: Payslip }) {
  const items = payslip.grossItems;
  if (items.length === 0) {
    return null;
  }

  const positives = items.filter((i) => i.amount.value >= 0);
  const negatives = items.filter((i) => i.amount.value < 0);
  const sum = items.reduce((s, i) => s + i.amount.value, 0);

  return (
    <Card>
      <SectionTitle hint={`brut ${formatEuro(payslip.gross.value)}`}>
        Composition du salaire brut
      </SectionTitle>

      <div className="divide-y divide-[rgb(var(--border))]">
        {positives.map((i, idx) => (
          <Row
            key={`p${idx}`}
            label={i.label || KIND_LABEL[i.kind]}
            sub={i.base ? `base ${formatEuro(i.base.value)}${i.rate ? ` · ${i.rate.value}` : ''}` : undefined}
            value={formatEuro(i.amount.value)}
            tone="add"
          />
        ))}
        {negatives.map((i, idx) => (
          <Row
            key={`n${idx}`}
            label={i.label || KIND_LABEL[i.kind]}
            value={formatSignedEuro(i.amount.value)}
            tone="sub"
          />
        ))}
        <Row label="Total des éléments lus" value={formatEuro(sum)} tone="total" />
      </div>

      {Math.abs(sum - payslip.gross.value) > 0.02 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Écart de {formatEuro(Math.abs(sum - payslip.gross.value))} avec le brut affiché
          ({formatEuro(payslip.gross.value)}) — voir les anomalies.
        </p>
      )}
    </Card>
  );
}
