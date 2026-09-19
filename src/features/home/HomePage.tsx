import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Calculator, FileSearch, Loader2, Lock, Scale, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/Brand';
import { Button, Card } from '@/components/ui';
import { useAnalysisStore } from '@/app/store';
import { DEMO_ID, runDemo } from '@/features/demo/runDemo';

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Taux vérifiés (2026)',
    text: 'Chaque taux est comparé au barème légal en vigueur en 2026.',
  },
  {
    icon: ShieldCheck,
    title: 'Anomalies repérées',
    text: 'Assiettes, calculs, cotisations manquantes, cohérence brut → net, avec impact en euros.',
  },
  {
    icon: Sparkles,
    title: 'Chaque ligne expliquée',
    text: 'À quoi sert la retraite, la maladie, la CSG… en langage clair.',
  },
  {
    icon: Lock,
    title: 'PDF non conservé',
    text: 'Le bulletin est lu puis analysé sur nos serveurs, sans être stocké. Résultat gardé dans votre navigateur.',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const setCurrent = useAnalysisStore((s) => s.setCurrent);
  const [demoLoading, setDemoLoading] = useState(false);

  const openDemo = async () => {
    setDemoLoading(true);
    try {
      const analysis = await runDemo();
      setCurrent(analysis);
      navigate(`/resultats/${DEMO_ID}`);
    } catch {
      setDemoLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col items-center pt-6 text-center">
        <BrandMark className="h-20" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Comprenez et vérifiez votre bulletin de paie
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted sm:text-base">
          Importez votre fiche de paie au format PDF. PayLumo la décompose, explique chaque
          cotisation et signale les erreurs potentielles en comparant les taux au barème 2026.
        </p>
        <Link to="/analyser" className="mt-6">
          <Button size="lg">
            <FileSearch size={18} />
            Analyser mon bulletin
          </Button>
        </Link>
        <p className="mt-3 text-xs text-muted">
          PDF natif uniquement (pas de scan) · accès par code · sans compte
        </p>
        <button
          type="button"
          onClick={() => void openDemo()}
          disabled={demoLoading}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline disabled:opacity-60 dark:text-brand-300"
        >
          {demoLoading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          Voir un exemple d’analyse (gratuit)
        </button>
      </section>

      <Link
        to="/calculateur"
        className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-4 transition-colors hover:surface-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
          <Calculator size={20} />
        </span>
        <div className="flex-1">
          <h3 className="font-semibold">Calculer brut ↔ net — gratuit</h3>
          <p className="text-sm text-muted">
            Votre net à partir du brut (ou l’inverse), avec les cotisations légales 2026 et le
            prélèvement à la source.
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-muted" />
      </Link>

      <Link
        to="/comparateur"
        className="flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] p-4 transition-colors hover:surface-2"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
          <Scale size={20} />
        </span>
        <div className="flex-1">
          <h3 className="font-semibold">Comparer mon salaire — gratuit</h3>
          <p className="text-sm text-muted">
            Situez votre net par rapport à votre métier, votre région et votre âge (données INSEE).
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-muted" />
      </Link>

      <section className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <Icon size={20} />
            </span>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted">{text}</p>
            </div>
          </Card>
        ))}
      </section>

      <Card className="surface-2 text-sm text-muted">
        <p>
          <strong className="text-[rgb(var(--text))]">Information, pas conseil.</strong> PayLumo
          explique votre fiche et compare les taux au <strong className="text-[rgb(var(--text))]">barème
          légal 2026</strong>. Pour toute confirmation, votre gestionnaire de paie ou un
          expert-comptable est le bon interlocuteur.
        </p>
      </Card>
    </div>
  );
}
