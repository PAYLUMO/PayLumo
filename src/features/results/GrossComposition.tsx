import { formatEuro, formatSignedEuro } from '@shared/lib/money';
import { isNonSoumisLabel } from '@shared/parsing/summaryLabels';
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
  // Les lignes « non soumis » (indemnité prévoyance, panier non soumis…) sont
  // de vraies lignes de rémunération, affichées ci-dessous, mais ne font pas
  // partie de l'assiette du brut : on les exclut du total comparé au brut
  // affiché, sinon l'écart signalé est faux (même logique que l'analyse).
  const countable = items.filter((i) => !isNonSoumisLabel(i.label));
  const sum = countable.reduce((s, i) => s + i.amount.value, 0);
  const hasNonSoumis = countable.length < items.length;

  return (
    <Card>
      <SectionTitle hint={`brut ${formatEuro(payslip.gross.value)}`}>
        Composition du salaire brut
      </SectionTitle>

      <div className="divide-y divide-[rgb(var(--border))]">
        {positives.map((i, idx) => {
          const base = i.base ? `base ${formatEuro(i.base.value)}${i.rate ? ` · ${i.rate.value}` : ''}` : '';
          const nonSoumis = isNonSoumisLabel(i.label);
          const sub = [base, nonSoumis ? 'non soumis, hors total' : ''].filter(Boolean).join(' · ') || undefined;
          return (
            <Row
              key={`p${idx}`}
              label={i.label || KIND_LABEL[i.kind]}
              sub={sub}
              value={formatEuro(i.amount.value)}
              tone="add"
            />
          );
        })}
        {negatives.map((i, idx) => (
          <Row
            key={`n${idx}`}
            label={i.label || KIND_LABEL[i.kind]}
            sub={isNonSoumisLabel(i.label) ? 'non soumis, hors total' : undefined}
            value={formatSignedEuro(i.amount.value)}
            tone="sub"
          />
        ))}
        <Row label="Total retenu pour le brut" value={formatEuro(sum)} tone="total" />
      </div>

      {hasNonSoumis && (
        <p className="mt-2 text-xs text-muted">
          Les lignes « non soumis » sont de vraies lignes de rémunération, mais ne font pas partie
          du salaire brut soumis à cotisations : elles ne sont pas comptées dans le total.
        </p>
      )}

      {Math.abs(sum - payslip.gross.value) > 0.02 && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Différence de {formatEuro(Math.abs(sum - payslip.gross.value))} avec le brut affiché
          ({formatEuro(payslip.gross.value)}) — détaillée plus haut.
        </p>
      )}
    </Card>
  );
}
