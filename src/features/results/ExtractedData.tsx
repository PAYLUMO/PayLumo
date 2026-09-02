import { formatEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import { MONTH_NAMES } from '@shared/lib/dates';
import type { Payslip } from '@shared/parsing/model';

export function ExtractedData({ payslip }: { payslip: Payslip }) {
  const { month, year } = payslip.period.value;
  const rows: [string, string | undefined][] = [
    ['Période', month && year ? `${MONTH_NAMES[month - 1]} ${year}` : undefined],
    ['Date de paiement', payslip.payDate?.value],
    ['Employeur', payslip.employer.name],
    ['SIRET', payslip.employer.siret],
    ['Code APE/NAF', payslip.employer.naf],
    ['Convention collective', payslip.employer.convention],
    [
      'Effectif',
      payslip.employer.effectifTranche === 'lt50'
        ? 'moins de 50 salariés'
        : payslip.employer.effectifTranche === 'gte50'
          ? '50 salariés ou plus'
          : undefined,
    ],
    ['Emploi', payslip.employee.emploi],
    ['Statut', payslip.employee.statut === 'inconnu' ? undefined : payslip.employee.statut],
    ['Régime', payslip.employee.regime === 'alsace-moselle' ? 'Alsace-Moselle' : 'général'],
    ['Matricule', payslip.employee.matricule],
    ['Coefficient', payslip.employee.coefficient],
    ['Heures contractuelles', payslip.time.heuresContrat ? `${payslip.time.heuresContrat.value} h` : undefined],
    ['Salaire brut', payslip.gross.value ? formatEuro(payslip.gross.value) : undefined],
    ['Net imposable', payslip.netImposable ? formatEuro(payslip.netImposable.value) : undefined],
    ['Montant net social', payslip.netSocial ? formatEuro(payslip.netSocial.value) : undefined],
    ['Net avant impôt', payslip.netAvantImpot ? formatEuro(payslip.netAvantImpot.value) : undefined],
    ['Prélèvement à la source', payslip.pas?.amount ? formatEuro(payslip.pas.amount.value) : undefined],
    ['Net payé', payslip.netAPayer.value ? formatEuro(payslip.netAPayer.value) : undefined],
  ];

  return (
    <Card>
      <SectionTitle
        hint={
          payslip.meta.editor === 'ai'
            ? 'lu par l’IA'
            : `format ${payslip.meta.editor} · ${payslip.meta.pageCount} p.`
        }
      >
        Ce que PayLumo a lu
      </SectionTitle>
      <p className="mb-3 text-xs text-muted">
        Valeurs extraites automatiquement du PDF (lecture seule). Si une valeur est fausse ou
        manquante, l’analyse correspondante est à prendre avec prudence.
      </p>

      <dl className="divide-y divide-[rgb(var(--border))] text-sm">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right font-medium tabular-nums">{v}</dd>
            </div>
          ))}
      </dl>

      {payslip.meta.notes.length > 0 && (
        <div className="mt-3 rounded-lg surface-2 p-2 text-xs text-muted">
          <p className="font-semibold text-[rgb(var(--text))]">Notes de lecture</p>
          <ul className="mt-1 list-inside list-disc">
            {payslip.meta.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
