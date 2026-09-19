import { formatEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { comparePas } from '@shared/analysis/pasComparison';
import { PAS_GRID_EFFECTIVE_FROM } from '@shared/data/pasGrid';
import { Tile } from './Tile';

const pct = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

const MEANING = {
  same:
    'Le taux appliqué correspond au taux par défaut de la grille : il s’agit probablement du taux non personnalisé, qui ne tient pas compte de votre foyer (couple, enfants, autres revenus). Vous pouvez consulter et, si besoin, mettre à jour votre taux sur impots.gouv.fr, rubrique « Gérer mon prélèvement à la source ».',
  lower:
    'Le taux appliqué est inférieur au taux par défaut : c’est cohérent avec un taux personnalisé, calculé par l’administration fiscale à partir de votre dernière déclaration (situation familiale, revenus du foyer).',
  higher:
    'Le taux appliqué est supérieur au taux par défaut : cela peut arriver avec un taux personnalisé (autres revenus dans le foyer) ou un taux individualisé au sein d’un couple. Vérifiez-le sur impots.gouv.fr, rubrique « Gérer mon prélèvement à la source ».',
} as const;

/** Taux de prélèvement du bulletin vs taux par défaut de la grille officielle. */
export function PasCheck({ payslip }: { payslip: Payslip }) {
  const c = comparePas(payslip);
  if (!c) return null;

  const gap =
    c.relation === 'same' ? '0 pt' : `${c.gap > 0 ? '+' : '−'} ${Math.abs(c.gap).toLocaleString('fr-FR')} pt`;

  return (
    <Card>
      <SectionTitle hint={`base ${formatEuro(c.base, 0)} / mois`}>
        Vérification du prélèvement à la source
      </SectionTitle>

      <div className="grid gap-2.5 sm:grid-cols-3">
        <Tile label="Taux appliqué" value={pct(c.detectedRate)} caption={`soit ${formatEuro(c.detectedAmount, 0)} / mois`} />
        <Tile
          label="Taux par défaut"
          value={pct(c.defaultRate)}
          caption={`grille officielle · ${formatEuro(c.defaultAmount, 0)} / mois`}
        />
        <Tile label="Écart" value={gap} caption="taux appliqué − taux par défaut" highlight={c.relation === 'same'} />
      </div>

      <p className="mt-3 text-sm">{MEANING[c.relation]}</p>
      <p className="mt-2 text-xs text-muted">
        Le taux par défaut est celui de la grille officielle (métropole) pour le net imposable du mois,
        en vigueur depuis le {new Date(PAS_GRID_EFFECTIVE_FROM).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}. Ce n’est
        pas une estimation de votre taux personnalisé, qui dépend de votre foyer.
      </p>
    </Card>
  );
}
