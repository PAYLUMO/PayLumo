import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, ChevronDown, FileSearch } from 'lucide-react';
import { Button, Card, SectionTitle, cx } from '@/components/ui';
import { formatEuro, formatPercent } from '@shared/lib/money';
import { grossFromNet, grossToNet, type NetKind } from '@shared/calc/grossNet';
import { PAS_GRID_EFFECTIVE_FROM } from '@shared/data/pasGrid';
import { PMSS, smicAt } from '@shared/data/params';

type Mode = 'gross' | 'net';
type Period = 'month' | 'year';

const fieldCx =
  'w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm focus:outline focus:outline-2 focus:outline-brand-500';

/** Exemples de la table de correspondance (le SMIC est ajouté en tête). */
const TABLE_GROSS = [2000, 2200, 2500, 2800, 3000, 3500, 4000, 4500, 5000, 6000, 8000];

// Cadre ou non-cadre : depuis la fusion Agirc-Arrco de 2019, la retraite
// complémentaire se cotise au même taux pour tous — l'écart légal restant
// (l'APEC, 0,024 % côté salarié) est trop faible pour justifier un réglage.
// Voir « Comment lire ce calcul » plus bas.
const STATUT = 'non-cadre' as const;

function parseAmount(s: string): number {
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-xl border border-[rgb(var(--border))] p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex-1 whitespace-nowrap rounded-[10px] px-3 py-2 font-semibold transition-colors',
            value === o.value ? 'bg-brand-600 text-white' : 'text-muted hover:surface-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CalculatorPage() {
  const [mode, setMode] = useState<Mode>('gross');
  const [netKind, setNetKind] = useState<NetKind>('beforeTax');
  const [amountStr, setAmountStr] = useState('2500');
  const [period, setPeriod] = useState<Period>('month');
  const [otherStr, setOtherStr] = useState('');
  const [pasCustom, setPasCustom] = useState(false);
  const [pasStr, setPasStr] = useState('');

  const amount = parseAmount(amountStr);
  const monthlyInput = period === 'year' ? amount / 12 : amount;
  const other = parseAmount(otherStr);
  const pasRate = pasCustom && pasStr.trim() !== '' ? Number(pasStr.replace(',', '.')) : null;
  const opts = {
    statut: STATUT,
    otherDeductions: other,
    pasRate: pasRate != null && Number.isFinite(pasRate) ? pasRate : null,
  };

  const grossMonthly = useMemo(
    () => (mode === 'gross' ? monthlyInput : grossFromNet(monthlyInput, netKind, opts)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, monthlyInput, netKind, other, pasRate],
  );
  const r = useMemo(
    () => (grossMonthly != null && grossMonthly > 0 ? grossToNet({ ...opts, grossMonthly }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grossMonthly, other, pasRate],
  );

  const smicGross = smicAt(new Date().toISOString().slice(0, 10)).mensuel151_67;
  const table = useMemo(
    () =>
      [smicGross, ...TABLE_GROSS].map((g) => {
        const t = grossToNet({ statut: STATUT, grossMonthly: g });
        return { gross: g, before: t.netBeforeTax, paid: t.netPaid };
      }),
    [smicGross],
  );

  const sliderMin = period === 'year' ? 12000 : 1000;
  const sliderMax = period === 'year' ? 120000 : 10000;
  const sliderStep = period === 'year' ? 600 : 50;
  const entered =
    mode === 'gross' ? 'Salaire brut' : netKind === 'beforeTax' ? 'Net avant impôt' : 'Net à payer (après impôt)';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Calculator size={22} className="text-brand-600 dark:text-brand-400" />
          Calculateur brut ↔ net
        </h1>
        <p className="mt-1 text-sm text-muted">
          Passez du brut au net, ou du net au brut, avec les cotisations légales 2026 et le
          prélèvement à la source. Gratuit, calculé sur votre appareil — rien n’est envoyé.
        </p>
      </div>

      <Card className="space-y-4">
        <Segmented
          label="Sens du calcul"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'gross', label: 'Brut → Net' },
            { value: 'net', label: 'Net → Brut' },
          ]}
        />

        {mode === 'net' && (
          <Segmented
            label="Type de net saisi"
            value={netKind}
            onChange={setNetKind}
            options={[
              { value: 'beforeTax', label: 'Net avant impôt' },
              { value: 'paid', label: 'Net à payer' },
            ]}
          />
        )}

        <div>
          <label htmlFor="calc-amount" className="text-sm font-medium">
            {entered}
          </label>
          <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
            <div className="relative">
              <input
                id="calc-amount"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className={cx(fieldCx, 'pr-8 text-base font-semibold')}
              />
              <span className="pointer-events-none absolute right-3 top-2 text-muted">€</span>
            </div>
            <Segmented
              label="Période"
              value={period}
              onChange={(p) => {
                // conserve le même montant mensuel en passant mois ⇄ année
                if (amount > 0) setAmountStr(String(Math.round(p === 'year' ? amount * 12 : amount / 12)));
                setPeriod(p);
              }}
              options={[
                { value: 'month', label: '/ mois' },
                { value: 'year', label: '/ an' },
              ]}
            />
          </div>
          <input
            type="range"
            aria-label="Ajuster le montant"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={Math.min(sliderMax, Math.max(sliderMin, amount || sliderMin))}
            onChange={(e) => setAmountStr(e.target.value)}
            className="mt-3 w-full accent-brand-600"
          />
        </div>

        <details className="group rounded-xl surface-2 p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
            Affiner : mutuelle, prévoyance, taux d’impôt
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block text-sm font-medium">
              Mutuelle + prévoyance, part salariale (€ / mois)
              <input
                inputMode="decimal"
                value={otherStr}
                onChange={(e) => setOtherStr(e.target.value)}
                placeholder="0"
                className={cx(fieldCx, 'mt-1')}
              />
              <span className="mt-1 block text-xs font-normal text-muted">
                Sur votre bulletin, lignes « complémentaire santé » et « prévoyance », colonne
                salarié. Laissez vide si vous ne savez pas.
              </span>
            </label>

            <div>
              <p className="mb-1 text-sm font-medium">Prélèvement à la source</p>
              <Segmented
                label="Taux de prélèvement"
                value={pasCustom ? 'custom' : 'default'}
                onChange={(v) => setPasCustom(v === 'custom')}
                options={[
                  { value: 'default', label: 'Taux par défaut' },
                  { value: 'custom', label: 'Mon taux' },
                ]}
              />
              {pasCustom && (
                <div className="relative mt-2">
                  <input
                    inputMode="decimal"
                    value={pasStr}
                    onChange={(e) => setPasStr(e.target.value)}
                    placeholder="Ex. 7,5"
                    aria-label="Votre taux de prélèvement à la source, en pourcentage"
                    className={cx(fieldCx, 'pr-8')}
                  />
                  <span className="pointer-events-none absolute right-3 top-2 text-muted">%</span>
                </div>
              )}
            </div>
          </div>
        </details>
      </Card>

      <Card>
        <SectionTitle hint="estimation">Résultat</SectionTitle>
        {r == null ? (
          <p className="text-sm text-muted">
            {mode === 'net' && monthlyInput > 0
              ? 'Ce montant est hors de portée du calculateur.'
              : 'Saisissez un montant pour voir le calcul.'}
          </p>
        ) : (
          <div className="space-y-1">
            {mode === 'net' && (
              <p className="mb-2 rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/40">
                Pour ce net, il faut environ <strong>{formatEuro(r.gross, 0)} brut par mois</strong>{' '}
                ({formatEuro(r.gross * 12, 0)} par an).
              </p>
            )}
            <Line label="Salaire brut" month={r.gross} />
            <Line
              label={`− Cotisations salariales légales (${formatPercent((r.contributions / r.gross) * 100)})`}
              month={-r.contributions}
              muted
            />
            {r.otherDeductions > 0 && <Line label="− Mutuelle + prévoyance" month={-r.otherDeductions} muted />}
            <Line label="Net avant impôt" month={r.netBeforeTax} strong />
            <Line
              label={`− Prélèvement à la source (${formatPercent(r.pasRate)}${r.pasIsDefault ? ', taux par défaut' : ''})`}
              month={-r.pas}
              muted
            />
            <Line label="Net à payer" month={r.netPaid} strong highlight />

            <details className="group mt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted hover:text-[rgb(var(--text))]">
                Détail des cotisations légales
                <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[20rem] text-xs">
                  <tbody className="divide-y divide-[rgb(var(--border))]">
                    {r.lines.map((l) => (
                      <tr key={l.code}>
                        <td className="py-1.5 pr-2">{l.label}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted">{formatPercent(l.rate)}</td>
                        <td className="py-1.5 text-right tabular-nums">{formatEuro(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">
                Net imposable (base du prélèvement à la source) : {formatEuro(r.netTaxable, 0)} par mois.
              </p>
            </details>
          </div>
        )}
      </Card>

      <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Votre net exact, pas une estimation ?</p>
          <p className="text-sm text-muted">
            Déposez votre bulletin : PayLumo lit chaque ligne et vérifie chaque taux.
          </p>
        </div>
        <Link to="/analyser" className="shrink-0">
          <Button>
            <FileSearch size={18} />
            Analyser mon bulletin
          </Button>
        </Link>
      </Card>

      <Card>
        <SectionTitle>Brut → net, repères 2026</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[19rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-medium">Brut mensuel</th>
                <th className="pb-2 text-right font-medium">Net avant impôt</th>
                <th className="pb-2 text-right font-medium">Net à payer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))] tabular-nums">
              {table.map((t, i) => (
                <tr key={t.gross}>
                  <td className="py-1.5">
                    {formatEuro(t.gross, 0)}
                    {i === 0 && <span className="ml-1 text-xs text-muted">(SMIC)</span>}
                  </td>
                  <td className="py-1.5 text-right">{formatEuro(t.before, 0)}</td>
                  <td className="py-1.5 text-right font-semibold">{formatEuro(t.paid, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">
          Cotisations légales, hors mutuelle et prévoyance, taux de prélèvement par défaut.
        </p>
      </Card>

      <Card className="space-y-4 text-sm">
        <SectionTitle>Comment lire ce calcul</SectionTitle>
        <p className="text-muted">
          Le calcul reprend le barème légal 2026 de PayLumo : retraite de base (6,90 % jusqu’au
          plafond mensuel de la Sécurité sociale, {formatEuro(PMSS, 0)}, puis 0,40 % sur tout le
          salaire), retraite complémentaire Agirc-Arrco et contributions d’équilibre, et CSG/CRDS
          (9,7 % calculés sur 98,25 % du brut). Cadre ou non-cadre, ce calcul légal est identique :
          depuis la fusion de l’Agirc (l’ancienne caisse de retraite complémentaire réservée aux
          cadres, à taux plus élevé) avec l’Arrco au 1ᵉʳ janvier 2019, un seul régime s’applique à
          tous, au même taux. Le repère « ~22 % non-cadre / ~25 % cadre » que vous avez peut-être en
          tête date d’avant cette fusion ; ce qui différencie un vrai bulletin aujourd’hui, c’est la
          prévoyance et la mutuelle — des cotisations contractuelles, propres à chaque entreprise.
        </p>
        <p className="text-muted">
          Le <strong className="text-[rgb(var(--text))]">prélèvement à la source</strong> s’applique
          au net imposable (net avant impôt + CSG non déductible + CRDS). Sans taux personnalisé, on
          utilise la grille officielle des taux par défaut, en vigueur depuis le{' '}
          {new Date(PAS_GRID_EFFECTIVE_FROM).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} ({' '}
          <a
            href="https://bofip.impots.gouv.fr/bofip/11255-PGP.html/identifiant=BOI-BAREME-000037-20260407"
            target="_blank"
            rel="noreferrer noopener"
            className="underline"
          >
            source BOFiP
          </a>
          ). Votre taux réel figure sur votre bulletin et sur impots.gouv.fr.
        </p>
        <p className="rounded-xl surface-2 p-3 text-xs text-muted">
          <strong className="text-[rgb(var(--text))]">Estimation, pas votre net exact.</strong> Ne sont
          pas pris en compte : la convention collective, les heures supplémentaires, le régime
          Alsace-Moselle, les avantages en nature et la réintégration de la part patronale de
          mutuelle.
        </p>

        <div className="divide-y divide-[rgb(var(--border))] border-t border-[rgb(var(--border))]">
          <Faq q="Quelle différence entre net avant impôt, net imposable et net à payer ?">
            Le net avant impôt, c’est le brut moins les cotisations salariales. Le net imposable y
            ajoute la CSG non déductible et la CRDS : c’est la base du prélèvement à la source. Le
            net à payer, c’est ce que vous recevez : net avant impôt moins le prélèvement.
          </Faq>
          <Faq q="Pourquoi le net de mon bulletin est-il différent ?">
            Parce que votre bulletin intègre votre mutuelle, votre prévoyance, votre convention
            collective et votre taux d’impôt personnalisé. Déposez-le pour comparer ligne à ligne.
          </Faq>
          <Faq q="Comment passer du net au brut ?">
            Choisissez « Net → Brut » : PayLumo cherche le plus petit brut dont le net atteint votre
            montant. Le prélèvement à la source progresse par paliers, donc plusieurs bruts proches
            peuvent donner un net à payer voisin.
          </Faq>
        </div>
      </Card>
    </div>
  );
}

function Line({
  label,
  month,
  strong,
  muted,
  highlight,
}: {
  label: string;
  month: number;
  strong?: boolean;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex items-baseline justify-between gap-3 py-1.5 text-sm',
        highlight && 'rounded-xl bg-brand-50 px-3 py-2.5 dark:bg-brand-950/40',
        strong && !highlight && 'border-t border-[rgb(var(--border))] pt-2',
      )}
    >
      <span className={cx(strong && 'font-semibold', muted && 'text-muted')}>{label}</span>
      <span className="shrink-0 text-right">
        <span className={cx('tabular-nums', strong ? 'text-base font-extrabold' : 'font-medium')}>
          {month < 0 ? `− ${formatEuro(-month, 0)}` : formatEuro(month, 0)}
        </span>
        <span className="block text-[11px] tabular-nums text-muted">
          {formatEuro(Math.abs(month) * 12, 0)} / an
        </span>
      </span>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium">
        {q}
        <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <p className="mt-1 text-muted">{children}</p>
    </details>
  );
}
