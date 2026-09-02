import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, Card } from '@/components/ui';
import { formatPercent } from '@shared/lib/money';
import { CATEGORY_EXPLAIN, explainOf } from '@shared/data/explanations.fr';
import { taxonomyByCode } from '@shared/data/taxonomy';
import { rateByCode, type RateSpec } from '@shared/data/rates2026';

function describeSpec(spec: RateSpec | undefined): string {
  if (!spec) return '—';
  switch (spec.kind) {
    case 'fixed':
      return formatPercent(spec.rate);
    case 'min':
      return `au moins ${formatPercent(spec.rate)}`;
    case 'range':
      return `${formatPercent(spec.min)} à ${formatPercent(spec.max)} (souvent ${formatPercent(spec.typical)})`;
    case 'smic_threshold':
      return `${formatPercent(spec.low)} jusqu’à ${spec.smicMultiple} SMIC, ${formatPercent(spec.high)} au-delà`;
    case 'effectif_threshold':
      return `${formatPercent(spec.lt50)} (< 50 salariés) / ${formatPercent(spec.gte50)} (≥ 50)`;
    case 'variable':
      return 'variable (montant contractuel)';
  }
}

export function CotisationDetailPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const explain = explainOf(code);
  const tax = taxonomyByCode(code);
  const ref = rateByCode(code);

  if (!explain || !tax) {
    return (
      <Card className="py-10 text-center text-sm text-muted">
        Fiche indisponible pour « {code} ».
        <div className="mt-4">
          <Link to="/" className="text-brand-700 underline dark:text-brand-300">
            Retour à l’accueil
          </Link>
        </div>
      </Card>
    );
  }

  const cat = CATEGORY_EXPLAIN[tax.category];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-[rgb(var(--text))]"
      >
        <ArrowLeft size={16} /> Retour
      </button>

      <Card>
        <Badge tone="neutral">{cat.title}</Badge>
        <h1 className="mt-2 text-xl font-extrabold">{explain.title}</h1>
        <p className="mt-1 text-sm text-muted">{explain.short}</p>
        <p className="mt-3 text-sm leading-relaxed">{explain.details}</p>
      </Card>

      {ref && (
        <Card>
          <h2 className="text-base font-bold">Barème 2026</h2>
          <dl className="mt-2 divide-y divide-[rgb(var(--border))] text-sm">
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted">Taux salarial</dt>
              <dd className="text-right font-medium">{describeSpec(ref.employee)}</dd>
            </div>
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted">Taux patronal</dt>
              <dd className="text-right font-medium">{describeSpec(ref.employer)}</dd>
            </div>
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-muted">Assiette</dt>
              <dd className="text-right font-medium">{assietteText(ref.assiette)}</dd>
            </div>
          </dl>
          {ref.note && <p className="mt-2 text-xs text-muted">{ref.note}</p>}
        </Card>
      )}

      <Card className="surface-2">
        <h2 className="text-base font-bold">{cat.title} — en résumé</h2>
        <p className="mt-1 text-sm text-muted">{cat.finance}</p>
      </Card>
    </div>
  );
}

function assietteText(k: string): string {
  const map: Record<string, string> = {
    brut_total: 'totalité du salaire brut',
    tranche_1: 'tranche 1 (jusqu’à 1 plafond)',
    tranche_2: 'tranche 2 (1 à 8 plafonds)',
    tranche_1_2: 'tranches 1 et 2',
    tranche_B: 'tranche B (1 à 4 plafonds)',
    tranche_AB: 'tranches A et B (jusqu’à 4 plafonds)',
    chomage: 'salaire dans la limite de 4 plafonds',
    csg: '98,25 % du brut',
    none: 'assiette spécifique',
  };
  return map[k] ?? k;
}
