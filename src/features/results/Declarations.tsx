import type { LucideIcon } from 'lucide-react';
import { Banknote, Landmark, Receipt, Users, Wallet } from 'lucide-react';
import { formatEuro } from '@shared/lib/money';
import { Card, SectionTitle } from '@/components/ui';
import type { Payslip } from '@shared/parsing/model';
import { DECLARATION_HELP } from '@shared/data/explanations.fr';
import { Tile } from './Tile';
import { declarationFigures, type AnnualFigure, type FigureKey } from './declarationFigures';

const ICON: Record<FigureKey, LucideIcon> = {
  gross: Banknote,
  netTaxable: Landmark,
  netSocial: Users,
  pas: Receipt,
  netPaid: Wallet,
};

const eur = (n: number) => formatEuro(n, 0);

function annualTile(a: AnnualFigure) {
  if (a.kind === 'estimate') {
    return {
      label: 'Année (estimation)',
      value: `≈ ${eur(a.value)}`,
      caption: 'ce mois × 12 — pas de cumul sur ce bulletin',
    };
  }
  return {
    label: a.yearTotal ? 'Total de l’année' : 'Cumul depuis janvier',
    value: formatEuro(a.value),
    caption: a.projection != null ? `lu sur le bulletin · ≈ ${eur(a.projection)} sur 12 mois` : 'lu sur le bulletin',
  };
}

/** Les montants du bulletin à garder sous la main pour les impôts, la CAF/MSA et les dossiers. */
export function Declarations({ payslip }: { payslip: Payslip }) {
  const figures = declarationFigures(payslip);
  if (figures.length === 0) return null;

  return (
    <Card>
      <SectionTitle hint="à garder sous la main">Pour vous aider dans vos déclarations</SectionTitle>

      <p className="text-sm text-muted">
        Les montants de ce bulletin utiles pour vos démarches : impôts, CAF ou MSA, dossier de prêt ou de
        location. L’année est le cumul lu sur votre bulletin quand il y figure ; sinon c’est une estimation
        (ce mois × 12) — le vrai total se lit sur le bulletin de décembre.
      </p>

      <div className="mt-4 space-y-4">
        {figures.map((f) => {
          const help = DECLARATION_HELP[f.key];
          const Icon = ICON[f.key];
          const alias = 'alias' in help ? help.alias : undefined;
          const year = annualTile(f.annual);
          return (
            <section key={f.key} className="rounded-2xl border border-[rgb(var(--border))] p-3.5">
              <h3 className="flex items-center gap-2 font-bold">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  <Icon size={17} />
                </span>
                {help.title}
                {alias && <span className="text-xs font-normal text-muted">({alias})</span>}
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <Tile label="Ce mois" value={formatEuro(f.monthly)} caption="montant de ce bulletin" />
                <Tile label={year.label} value={year.value} caption={year.caption} highlight={f.annual.kind === 'cumul'} />
              </div>

              <dl className="mt-3 space-y-2.5 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">C’est quoi ?</dt>
                  <dd className="mt-0.5">{help.definition}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">À quoi ça sert ?</dt>
                  <dd className="mt-0.5">
                    <ul className="list-disc space-y-1 pl-4">
                      {help.uses.map((u) => (
                        <li key={u}>{u}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </section>
          );
        })}
      </div>
    </Card>
  );
}
