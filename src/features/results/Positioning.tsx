import { Link } from 'react-router-dom';
import { formatEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { INSEE_YEAR, NATIONAL } from '@/data/insee';
import { SalaryScale } from './SalaryScale';
import { salaryPosition, type Zone } from './position';

const HEADLINE: Record<Zone, string> = {
  'below-d1': 'est dans les 10 % les plus bas des salaires du privé.',
  'd1-median': 'est sous la médiane : la moitié des salariés du privé gagne davantage.',
  'median-d9': 'est au-dessus de la médiane : vous gagnez plus que la moitié des salariés du privé.',
  'above-d9': 'vous place parmi les 10 % les mieux rémunérés du privé.',
};

const eur = (n: number) => formatEuro(n, 0);

/** Situe le net du bulletin dans la distribution INSEE des salaires du privé (temps plein). */
export function Positioning({ payslip }: { payslip: Payslip }) {
  const pos = salaryPosition(payslip);
  if (!pos) return null;

  const { d1, median, d9 } = NATIONAL;

  return (
    <Card>
      <SectionTitle hint={`INSEE ${INSEE_YEAR} · temps plein`}>Positionnement salarial</SectionTitle>

      <p className="text-sm">
        Votre net mensuel à temps plein (≈ <strong>{eur(pos.eqtpNet)}</strong>) {HEADLINE[pos.zone]}
      </p>
      {pos.adjustment && (
        <p className="mt-2 rounded-xl surface-2 p-2.5 text-xs text-muted">
          Le net de ce mois ({eur(pos.monthNet)}) est ramené à un mois complet à temps plein
          {pos.adjustment.partTime ? ' (temps partiel)' : ''}
          {pos.adjustment.absences > 0
            ? ` — le bulletin comporte ${eur(pos.adjustment.absences)} d’absences ou de retenues`
            : ''}
          , pour pouvoir être comparé.
        </p>
      )}

      <div className="mt-5 px-1">
        <SalaryScale value={pos.eqtpNet} d1={d1} median={median} d9={d9} />
      </div>

      <ul className="mt-4 space-y-1.5 text-sm">
        <li>
          Vous gagnez environ <strong>{eur(Math.abs(pos.vsMedian))}</strong>{' '}
          {pos.vsMedian >= 0 ? 'de plus' : 'de moins'} que le net médian français ({eur(median)}).
        </li>
        {pos.toTop10 != null && (
          <li>
            Pour entrer dans les 10 % les mieux rémunérés (seuil {eur(d9)}), il faudrait environ{' '}
            <strong>{eur(pos.toTop10)}</strong> net de plus par mois.
          </li>
        )}
        {pos.cadre && (
          <li>
            Par rapport aux autres cadres (médiane estimée ≈ {eur(pos.cadre.median)}), vous êtes{' '}
            {pos.cadre.diff >= 0 ? 'au-dessus' : 'en dessous'} de{' '}
            <strong>{eur(Math.abs(pos.cadre.diff))}</strong>.
          </li>
        )}
      </ul>

      <p className="mt-3 text-xs text-muted">
        Données INSEE {INSEE_YEAR} (salariés du privé, net avant impôt, équivalent temps plein) : les
        salaires ont évolué depuis, et la médiane des cadres est une estimation PayLumo dérivée de
        l’INSEE. Comparaison indicative, qui ignore votre métier, votre région et votre âge —{' '}
        <Link to="/comparateur" className="underline">
          affinez-la dans le comparateur
        </Link>
        .
      </p>
    </Card>
  );
}
