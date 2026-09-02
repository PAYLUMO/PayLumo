import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { useAnalysisStore } from '@/app/store';
import type { StoredAnalysis } from '@shared/analysis/types';
import { Summary } from './Summary';
import { MoneyMap } from './MoneyMap';
import { GrossComposition } from './GrossComposition';
import { Contributions } from './Contributions';
import { BrutToNet } from './BrutToNet';
import { Anomalies } from './Anomalies';
import { ExtractedData } from './ExtractedData';

export function ResultsPage() {
  const { id } = useParams();
  const { current, loadById } = useAnalysisStore();
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(
    current && current.id === id ? current : null,
  );
  const [loading, setLoading] = useState(!analysis);

  useEffect(() => {
    if (!id) return;
    if (analysis?.id === id) return;
    setLoading(true);
    loadById(id).then((a) => {
      setAnalysis(a);
      setLoading(false);
    });
  }, [id, analysis, loadById]);

  if (loading) {
    return <p className="py-16 text-center text-sm text-muted">Chargement…</p>;
  }

  if (!analysis) {
    return (
      <Card className="py-12 text-center">
        <p className="text-sm text-muted">Analyse introuvable. Elle a peut-être été effacée.</p>
        <Link to="/analyser" className="mt-4 inline-block">
          <Button>
            <FileSearch size={18} />
            Analyser un bulletin
          </Button>
        </Link>
      </Card>
    );
  }

  const { payslip, result } = analysis;

  return (
    <div className="space-y-4">
      <Summary analysis={analysis} />
      <Anomalies result={result} />
      {result.summary.canAnalyze && (
        <>
          <MoneyMap payslip={payslip} />
          <BrutToNet payslip={payslip} />
          <GrossComposition payslip={payslip} />
          <Contributions payslip={payslip} result={result} />
        </>
      )}
      <ExtractedData payslip={payslip} />

      <Card className="surface-2 text-xs text-muted">
        Analyse indicative fondée sur les barèmes publics 2026 (URSSAF, BOSS, Agirc-Arrco). Le but
        est de vous aider à comprendre votre fiche — pour toute précision, votre service paie ou un
        expert-comptable reste le bon interlocuteur. PayLumo peut se tromper si une ligne du
        bulletin a été mal lue.
      </Card>

      <div className="flex justify-center pb-4">
        <Link to="/analyser">
          <Button variant="secondary">
            <FileSearch size={18} />
            Analyser un autre bulletin
          </Button>
        </Link>
      </div>
    </div>
  );
}
