import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { formatEuro, formatPercent } from '@shared/lib/money';
import { Badge, Card, SectionTitle, cx } from '@/components/ui';
import type { ContribCategory, ContributionLine, Payslip } from '@shared/parsing/model';
import { CATEGORY_EXPLAIN, explainOf } from '@shared/data/explanations.fr';
import { rateByCode } from '@shared/data/rates2026';
import { buildContext, resolveRate } from '@shared/analysis/context';
import type { AnalysisResult, Finding } from '@shared/analysis/findings';
import { OkIcon, SeverityIcon } from './shared';

const ORDER: ContribCategory[] = ['SANTE', 'ATMP', 'RETRAITE', 'FAMILLE', 'CHOMAGE', 'CSG_CRDS', 'AUTRES'];

export function Contributions({
  payslip,
  result,
}: {
  payslip: Payslip;
  result: AnalysisResult;
}) {
  const ctx = buildContext(payslip);
  const findingByCanonical = new Map<string, Finding[]>();
  for (const f of result.findings) {
    if (!f.canonical) continue;
    const arr = findingByCanonical.get(f.canonical) ?? [];
    arr.push(f);
    findingByCanonical.set(f.canonical, arr);
  }

  const grouped = new Map<ContribCategory, ContributionLine[]>();
  for (const line of payslip.contributions) {
    const arr = grouped.get(line.category) ?? [];
    arr.push(line);
    grouped.set(line.category, arr);
  }

  return (
    <Card>
      <SectionTitle hint="taux comparés au barème 2026">Cotisations, ligne par ligne</SectionTitle>
      <div className="space-y-5">
        {ORDER.filter((c) => grouped.has(c)).map((cat) => (
          <section key={cat}>
            <div className="mb-1 flex items-baseline justify-between">
              <h3 className="text-sm font-bold">{CATEGORY_EXPLAIN[cat].title}</h3>
            </div>
            <p className="mb-2 text-xs text-muted">{CATEGORY_EXPLAIN[cat].summary}</p>
            <div className="overflow-hidden rounded-xl border border-[rgb(var(--border))]">
              {grouped.get(cat)!.map((line, i) => (
                <LineRow
                  key={i}
                  line={line}
                  ctx={ctx}
                  findings={line.canonical ? (findingByCanonical.get(line.canonical) ?? []) : []}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  );
}

function LineRow({
  line,
  ctx,
  findings,
}: {
  line: ContributionLine;
  ctx: ReturnType<typeof buildContext>;
  findings: Finding[];
}) {
  const ref = line.canonical ? rateByCode(line.canonical) : undefined;
  const explain = explainOf(line.canonical);
  const worst = findings.find((f) => f.severity === 'erreur') ?? findings.find((f) => f.severity === 'avertissement');

  const expEmp = ref ? resolveRate(ref.employee, ctx) : null;
  const expPat = ref ? resolveRate(ref.employer, ctx) : null;
  const empFlagged = findings.some((f) => f.code === 'TAUX_INCORRECT' && f.id.endsWith(':employee'));
  const patFlagged = findings.some((f) => f.code === 'TAUX_INCORRECT' && f.id.endsWith(':employer'));

  return (
    <details className="group border-b border-[rgb(var(--border))] last:border-b-0 open:surface-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm hover:surface-2">
        <span className="shrink-0">
          {worst ? <SeverityIcon severity={worst.severity} /> : line.canonical ? <OkIcon /> : <span className="inline-block h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{ref?.label ?? line.label}</span>
          <span className="block text-xs text-muted">
            base {line.base ? formatEuro(line.base.value) : '—'}
          </span>
        </span>
        <span className="shrink-0 text-right text-xs tabular-nums">
          <RatePair
            label="sal."
            found={line.employee?.rate?.value}
            expected={expEmp}
            mismatch={empFlagged}
            amount={line.employee?.amount?.value}
          />
          <RatePair
            label="pat."
            found={line.employer?.rate?.value}
            expected={expPat}
            mismatch={patFlagged}
            amount={line.employer?.amount?.value}
          />
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-2 px-3 pb-3 text-sm">
        {explain ? (
          <p className="text-muted">
            <span className="font-medium text-[rgb(var(--text))]">À quoi ça sert ? </span>
            {explain.short}
          </p>
        ) : (
          <p className="text-muted">Ligne non rattachée au référentiel PayLumo.</p>
        )}
        {findings.map((f) => (
          <div
            key={f.id}
            className={cx(
              'rounded-lg p-2 text-xs',
              f.severity === 'erreur' || f.severity === 'avertissement'
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                : 'surface-2',
            )}
          >
            <span className="font-semibold">{f.title}</span>
            {f.expected != null && (
              <span className="ml-1">
                — attendu {f.expected}, lu {f.found}
              </span>
            )}
          </div>
        ))}
        {line.canonical && (
          <Link
            to={`/cotisation/${line.canonical}`}
            className="inline-block text-xs font-semibold text-brand-700 underline dark:text-brand-300"
          >
            En savoir plus
          </Link>
        )}
      </div>
    </details>
  );
}

function RatePair({
  label,
  found,
  expected,
  mismatch = false,
  amount,
}: {
  label: string;
  found?: number;
  expected?: number | null;
  mismatch?: boolean;
  amount?: number;
}) {
  if (found == null && amount == null) return null;
  return (
    <span className="block">
      <span className="text-muted">{label} </span>
      {found != null ? (
        <span className={cx(mismatch && 'font-bold text-amber-700 dark:text-amber-400')}>
          {formatPercent(found)}
        </span>
      ) : null}
      {mismatch && expected != null ? (
        <Badge tone="warn" className="ml-1 !px-1 !py-0">
          barème {formatPercent(expected)}
        </Badge>
      ) : null}
      {amount != null ? <span className="ml-1 text-muted">· {formatEuro(amount)}</span> : null}
    </span>
  );
}
