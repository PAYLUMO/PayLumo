import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { Card, SectionTitle } from '@/components/ui';
import {
  AGE_BANDS,
  CSP_LABEL,
  INSEE_YEAR,
  METIERS,
  METIER_BY_ID,
  REGIONS,
  REGION_BY_CODE,
  SEXE_GAP_COMPARABLE,
  SEXE_GAP_EQTP,
  type Csp,
  type Sexe,
} from '@/data/insee';
import { formatEuro } from '@shared/lib/money';
import { estimateMedian, positionOf } from './estimate';
import { DistributionBar } from './DistributionBar';

const CSP_ORDER: Csp[] = ['cadre', 'intermediaire', 'employe', 'ouvrier'];
const fieldCx =
  'mt-1 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm focus:outline focus:outline-2 focus:outline-brand-500';

export function ComparatorPage() {
  const [salary, setSalary] = useState('');
  const [metierId, setMetierId] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [ageBand, setAgeBand] = useState('');
  const [sexe, setSexe] = useState<Sexe>('nd');

  const salaryNum = Number(salary.replace(',', '.')) || 0;

  const estimate = useMemo(() => {
    if (!metierId || !regionCode) return null;
    return estimateMedian({ metierId, regionCode, ageBand: ageBand || undefined, sexe });
  }, [metierId, regionCode, ageBand, sexe]);

  const position = estimate && salaryNum > 0 ? positionOf(salaryNum, estimate) : null;
  const metier = METIER_BY_ID.get(metierId);
  const region = REGION_BY_CODE.get(regionCode);
  const age = AGE_BANDS.find((a) => a.id === ageBand);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Scale size={22} className="text-brand-600 dark:text-brand-400" />
          Comparateur de salaire
        </h1>
        <p className="mt-1 text-sm text-muted">
          Situez votre salaire net par rapport aux statistiques du secteur privé. Gratuit, calculé
          sur votre appareil — rien n’est envoyé.
        </p>
      </div>

      <Card className="space-y-3">
        <label className="block text-sm font-medium">
          Votre salaire net mensuel
          <div className="relative mt-1">
            <input
              inputMode="decimal"
              value={salary}
              onChange={(e) => setSalary(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="2 400"
              className={fieldCx + ' pr-8'}
            />
            <span className="pointer-events-none absolute right-3 top-2 text-sm text-muted">€</span>
          </div>
        </label>

        <label className="block text-sm font-medium">
          Métier
          <select value={metierId} onChange={(e) => setMetierId(e.target.value)} className={fieldCx}>
            <option value="">— choisir —</option>
            {CSP_ORDER.map((csp) => (
              <optgroup key={csp} label={CSP_LABEL[csp]}>
                {METIERS.filter((m) => m.csp === csp).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Région
            <select
              value={regionCode}
              onChange={(e) => setRegionCode(e.target.value)}
              className={fieldCx}
            >
              <option value="">— choisir —</option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium">
            Âge
            <select value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className={fieldCx}>
              <option value="">Tous âges</option>
              {AGE_BANDS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="text-sm font-medium">
          <legend>Sexe</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(
              [
                ['nd', 'Ne pas préciser'],
                ['femme', 'Femme'],
                ['homme', 'Homme'],
              ] as [Sexe, string][]
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setSexe(v)}
                className={
                  'rounded-lg border px-3 py-1.5 text-sm font-normal ' +
                  (sexe === v
                    ? 'border-brand-500 bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'
                    : 'border-[rgb(var(--border))] hover:surface-2')
                }
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      {estimate && metier && region ? (
        <Card className="space-y-3">
          <SectionTitle>Résultat</SectionTitle>
          <p className="text-sm">
            Pour un poste de <strong>{metier.label.toLowerCase()}</strong>
            {age ? (
              <>
                {' '}
                (<strong>{age.label.toLowerCase()}</strong>)
              </>
            ) : null}{' '}
            en <strong>{region.label}</strong>, le salaire net mensuel médian estimé est d’environ{' '}
            <strong>{formatEuro(estimate.median, 0)}</strong>
            {' '}
            <span className="text-muted">
              (fourchette {formatEuro(estimate.low, 0)} – {formatEuro(estimate.high, 0)})
            </span>
            .
          </p>

          <DistributionBar estimate={estimate} salary={salaryNum > 0 ? salaryNum : undefined} />

          {position && (
            <div className="rounded-xl surface-2 p-3 text-sm">
              Avec <strong>{formatEuro(salaryNum)}</strong>, vous êtes {position.label}. Sur
              l’ensemble du privé, cela vous situe autour du{' '}
              <strong>{position.decile}ᵉ décile</strong> (10 = les 10 % les mieux payés).
            </div>
          )}

          {sexe !== 'nd' && (
            <p className="text-xs text-muted">
              L’INSEE mesure un écart de rémunération femmes-hommes d’environ{' '}
              {Math.round(SEXE_GAP_EQTP * 100)} % en équivalent temps plein sur l’ensemble du privé ;
              à poste, diplôme et expérience comparables, il reste d’environ{' '}
              {Math.round(SEXE_GAP_COMPARABLE * 100)} %. C’est une inégalité constatée, pas une
              norme.
            </p>
          )}
        </Card>
      ) : (
        <Card className="text-sm text-muted">
          Renseignez au moins le <strong>métier</strong> et la <strong>région</strong> pour voir
          l’estimation.
        </Card>
      )}

      <Card className="surface-2 text-xs text-muted">
        Estimation à partir de moyennes <strong>INSEE agrégées</strong> (secteur privé, {INSEE_YEAR},
        net mensuel en équivalent temps plein). Elle ne constitue ni une valeur de marché
        individuelle, ni un droit à rémunération : les écarts réels dépendent de l’entreprise, de la
        branche, du diplôme, de l’ancienneté, des primes… À réactualiser chaque année.
      </Card>
    </div>
  );
}
