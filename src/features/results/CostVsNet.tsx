import { formatEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { costBreakdown } from './costBreakdown';
import { COTIS_COLOR, NET_COLOR, PAT_COLOR } from './categoryViz';
import { Tile } from './Tile';

/** Ce que coûte le poste à l'employeur, ce qui est retenu, ce qui arrive sur le compte. */
export function CostVsNet({ payslip }: { payslip: Payslip }) {
  const b = costBreakdown(payslip);
  if (!b) return null;

  const retenues = b.totalSal + b.pas;
  const pct = b.cost > 0 ? Math.round((b.netPaye / b.cost) * 100) : 0;
  // La part « nette » de la barre est le solde : la barre vaut toujours le coût total,
  // même quand des indemnités non soumises brouillent brut − cotisations = net.
  const bar = [
    { label: 'Net versé', value: Math.max(0, b.cost - b.totalPat - retenues), color: NET_COLOR },
    { label: 'Charges & impôts', value: retenues, color: COTIS_COLOR },
    { label: 'Charges patronales', value: b.totalPat, color: PAT_COLOR },
  ];

  return (
    <Card>
      <SectionTitle>Ce que vous coûtez vs ce que vous touchez</SectionTitle>

      <div className="grid grid-cols-2 gap-2.5">
        <Tile label="Coût total employeur" value={formatEuro(b.cost)} caption="Super-brut : ce que paie l’entreprise" />
        <Tile
          label="Charges patronales"
          value={`− ${formatEuro(b.totalPat)}`}
          caption="Payées par l’employeur"
          color={PAT_COLOR}
        />
        <Tile
          label="Charges & impôts"
          value={`− ${formatEuro(retenues)}`}
          caption={b.pas > 0 ? 'Cotisations salariales + prélèvement à la source' : 'Cotisations salariales'}
          color={COTIS_COLOR}
        />
        <Tile
          label="Net à payer"
          value={formatEuro(b.netPaye)}
          caption="Viré sur votre compte"
          color={NET_COLOR}
          highlight
        />
      </div>

      <div className="mt-4 flex h-3 w-full overflow-hidden rounded-md" role="img" aria-label="Répartition du coût total">
        {bar.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / b.cost) * 100}%`, background: s.color }}
            title={`${s.label} — ${formatEuro(s.value)}`}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {bar.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm">
        Vous touchez <strong>{pct} %</strong> de ce que vous coûtez à votre entreprise.
      </p>
      <p className="mt-1 text-xs text-muted">
        Les charges patronales ne sortent pas de votre poche : elles financent la même protection
        collective (assurance maladie, retraite, chômage, famille).
      </p>
    </Card>
  );
}
