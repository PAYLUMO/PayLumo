import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, FileText, Loader2, Lock, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button, Card, cx } from '@/components/ui';
import { useAnalysisStore } from '@/app/store';
import { formatEuro } from '@shared/lib/money';
import { precheckPdf } from './precheck';
import {
  CheckoutError,
  clearPending,
  readPending,
  startCheckout,
  type PendingAnalysis,
} from '@/features/payment/checkout';
import { fetchPaidAnalysis } from '@/features/payment/analyze';

const PRICE = 0.99;

const INCLUDED = [
  'Chaque taux comparé au barème légal 2026',
  'Anomalies détectées + impact estimé en euros',
  'Décomposition du salaire brut et passage au net',
  'Explication de chaque cotisation',
];

type Phase =
  | { s: 'idle' }
  | { s: 'checking' }
  | { s: 'ready'; file: File }
  | { s: 'redirecting' }
  | { s: 'analyzing' }
  | { s: 'error'; message: string; retry?: PendingAnalysis };

export function ImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ s: 'idle' });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { setCurrent } = useAnalysisStore();

  const runAnalysis = useCallback(
    async (sessionId: string, pending: PendingAnalysis) => {
      setPhase({ s: 'analyzing' });
      const outcome = await fetchPaidAnalysis(sessionId, pending);
      if (outcome.kind === 'ok') {
        clearPending();
        setCurrent(outcome.analysis);
        navigate(`/resultats/${outcome.analysis.id}`);
        return;
      }
      if (outcome.kind === 'refunded' || outcome.kind === 'error') clearPending();
      setPhase({
        s: 'error',
        message: outcome.message,
        retry: outcome.kind === 'retry' || outcome.kind === 'unpaid' ? pending : undefined,
      });
    },
    [navigate, setCurrent],
  );

  // Retour de Stripe Checkout
  useEffect(() => {
    const sid = params.get('session_id');
    const canceled = params.get('canceled');
    if (!sid && !canceled) return;
    setParams({}, { replace: true });
    if (canceled) {
      setPhase({ s: 'error', message: 'Paiement annulé. Aucun montant n’a été prélevé.' });
      return;
    }
    const pending = readPending();
    if (!sid || !pending) {
      setPhase({
        s: 'error',
        message: 'Session de paiement introuvable. Recommencez l’import du bulletin.',
      });
      return;
    }
    setSessionId(sid);
    void runAnalysis(sid, pending);
  }, [params, setParams, runAnalysis]);

  const check = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setPhase({ s: 'checking' });
    const res = await precheckPdf(file);
    setPhase(res.ok ? { s: 'ready', file } : { s: 'error', message: res.reason ?? 'PDF non valide.' });
  }, []);

  const pay = useCallback(async (file: File) => {
    setPhase({ s: 'redirecting' });
    try {
      const url = await startCheckout(file);
      window.location.assign(url);
    } catch (e) {
      setPhase({
        s: 'error',
        message: e instanceof CheckoutError ? e.message : 'Impossible de démarrer le paiement.',
      });
    }
  }, []);

  const loadExample = useCallback(
    async (name: string) => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}${name}`);
        const blob = await res.blob();
        await check(new File([blob], name, { type: 'application/pdf' }));
      } catch {
        setPhase({ s: 'error', message: 'Impossible de charger l’exemple.' });
      }
    },
    [check],
  );

  const busy = phase.s === 'checking' || phase.s === 'redirecting' || phase.s === 'analyzing';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Analyser un bulletin</h1>
        <p className="mt-1 text-sm text-muted">
          Importez votre fiche de paie au format PDF. {formatEuro(PRICE)} par analyse.
        </p>
      </div>

      {(phase.s === 'idle' || phase.s === 'error') && (
        <Card
          className={cx(
            'flex flex-col items-center gap-3 border-2 border-dashed py-12 text-center transition-colors',
            dragging ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40' : 'border-[rgb(var(--border))]',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void check(e.dataTransfer.files?.[0]);
          }}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            <UploadCloud size={26} />
          </span>
          <div>
            <p className="font-semibold">Glissez votre bulletin ici</p>
            <p className="text-sm text-muted">ou</p>
          </div>
          <Button onClick={() => inputRef.current?.click()}>
            <FileText size={18} />
            Choisir un fichier PDF
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void check(e.target.files?.[0])}
          />
          <p className="text-xs text-muted">
            PDF exporté depuis votre espace RH · les scans/photos ne sont pas pris en charge
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => void loadExample('exemple-bulletin.pdf')}
              className="text-brand-700 underline dark:text-brand-300"
            >
              Tester avec un exemple
            </button>
            <span className="text-muted">·</span>
            <button
              type="button"
              onClick={() => void loadExample('exemple-bulletin-anomalie.pdf')}
              className="text-brand-700 underline dark:text-brand-300"
            >
              exemple avec une anomalie
            </button>
          </div>
        </Card>
      )}

      {phase.s === 'error' && (
        <Card className="space-y-3 border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p>{phase.message}</p>
          {phase.retry && sessionId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => phase.retry && void runAnalysis(sessionId, phase.retry)}
            >
              <RefreshCw size={16} />
              Réessayer
            </Button>
          )}
        </Card>
      )}

      {phase.s === 'checking' && (
        <Card className="flex items-center justify-center gap-2 py-10 text-brand-600 dark:text-brand-400">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Vérification du fichier…</span>
        </Card>
      )}

      {phase.s === 'ready' && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText size={16} className="text-muted" />
            <span className="truncate font-medium">{phase.file.name}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-brand-700 dark:text-brand-300">
              <Check size={14} /> prêt
            </span>
          </div>

          <div className="rounded-xl surface-2 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Analyse complète</span>
              <span className="text-lg font-extrabold">{formatEuro(PRICE)}</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {INCLUDED.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              Paiement unique, sans abonnement ni compte. Bulletin illisible = remboursé.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void pay(phase.file)}>
              <Lock size={16} />
              Payer {formatEuro(PRICE)} et analyser
            </Button>
            <Button variant="ghost" onClick={() => setPhase({ s: 'idle' })}>
              Changer de fichier
            </Button>
          </div>
        </Card>
      )}

      {(phase.s === 'redirecting' || phase.s === 'analyzing') && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Loader2 className="animate-spin text-brand-600 dark:text-brand-400" size={22} />
          <span className="font-semibold">
            {phase.s === 'redirecting' ? 'Redirection vers le paiement…' : 'Lecture et analyse du bulletin…'}
          </span>
          {phase.s === 'analyzing' && (
            <span className="text-xs text-muted">Cela prend généralement quelques secondes.</span>
          )}
        </Card>
      )}

      <Card className="flex gap-3 surface-2 text-sm text-muted">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
        <p>
          Le pré-contrôle du fichier se fait dans votre navigateur. Après paiement, le PDF est
          envoyé à nos serveurs pour être lu (IA) puis analysé, <strong>sans être conservé</strong>.
          Le résultat est gardé uniquement dans ce navigateur, sous <em>Historique</em>.
        </p>
      </Card>

      {busy && phase.s !== 'checking' && (
        <p className="text-center text-xs text-muted">Ne fermez pas cette page.</p>
      )}
    </div>
  );
}
