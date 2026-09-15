import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, FileText, KeyRound, Loader2, RefreshCw, Scale, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button, Card, cx } from '@/components/ui';
import { useAnalysisStore } from '@/app/store';
import { CONVENTIONS } from '@shared/data/conventions';
import { precheckPdf } from './precheck';
import { redactSensitive } from './redact';
import { requestAnalysis } from './requestAnalysis';

const CODE_KEY = 'paylumo.accessCode';
const CONVENTION_KEY = 'paylumo.convention';
const CONVENTIONS_SORTED = [...CONVENTIONS].sort((a, b) => a.label.localeCompare(b.label, 'fr'));

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
  | { s: 'redacting'; file: File }
  | { s: 'analyzing'; file: File; masked: string | null }
  | { s: 'error'; message: string; file?: File };

function readStoredCode(): string {
  try {
    return sessionStorage.getItem(CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

function readStoredConvention(): string {
  try {
    const v = localStorage.getItem(CONVENTION_KEY) ?? '';
    // ignore une valeur devenue obsolète si le référentiel a changé
    return v && CONVENTIONS_SORTED.some((c) => c.label === v) ? v : '';
  } catch {
    return '';
  }
}

export function ImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>({ s: 'idle' });
  const [code, setCode] = useState(readStoredCode);
  const [convention, setConvention] = useState(readStoredConvention);
  const { setCurrent } = useAnalysisStore();

  const check = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setPhase({ s: 'checking' });
    const res = await precheckPdf(file);
    setPhase(
      res.ok ? { s: 'ready', file } : { s: 'error', message: res.reason ?? 'PDF non valide.' },
    );
  }, []);

  const analyze = useCallback(
    async (file: File) => {
      // Caviardage local (n° de sécurité sociale, adresse) avant l'envoi.
      setPhase({ s: 'redacting', file });
      let toSend = file;
      let masked: string | null = null;
      try {
        const r = await redactSensitive(file);
        toSend = r.file;
        const bits = [
          r.nirCount > 0 && 'n° de sécurité sociale',
          r.addressCount > 0 && 'adresse',
        ].filter(Boolean) as string[];
        if (bits.length) masked = bits.join(' et ');
      } catch {
        /* échec du caviardage : on envoie l'original, l'analyse n'est pas bloquée */
      }

      setPhase({ s: 'analyzing', file, masked });
      const outcome = await requestAnalysis(code.trim(), toSend, convention || null);
      if (outcome.kind === 'ok') {
        try {
          sessionStorage.setItem(CODE_KEY, code.trim());
          if (convention) localStorage.setItem(CONVENTION_KEY, convention);
          else localStorage.removeItem(CONVENTION_KEY);
        } catch {
          /* ignore */
        }
        setCurrent(outcome.analysis);
        navigate(`/resultats/${outcome.analysis.id}`);
        return;
      }
      setPhase({ s: 'error', message: outcome.message, file });
    },
    [code, convention, navigate, setCurrent],
  );

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

  const busy = phase.s === 'redacting' || phase.s === 'analyzing';
  const file =
    phase.s === 'ready' || phase.s === 'analyzing' || phase.s === 'redacting' || phase.s === 'error'
      ? phase.file
      : undefined;
  const showForm = Boolean(file) && !busy;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Analyser un bulletin</h1>
        <p className="mt-1 text-sm text-muted">
          Importez votre fiche de paie au format PDF. Un code d’accès est demandé avant l’analyse.
        </p>
      </div>

      {(phase.s === 'idle' || (phase.s === 'error' && !phase.file)) && (
        <Card
          className={cx(
            'flex flex-col items-center gap-3 border-2 border-dashed py-12 text-center transition-colors',
            dragging
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
              : 'border-[rgb(var(--border))]',
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
          <p className="max-w-xs text-xs text-muted">
            PDF exporté depuis votre espace RH — <strong>pas une photo ni un scan</strong>. Un
            doute ? Ouvrez le fichier et faites <strong>Ctrl+F</strong> (⌘F sur Mac) : si vous ne
            pouvez pas y rechercher de texte, c’est un scan, il ne sera pas accepté.
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

      {phase.s === 'checking' && (
        <Card className="flex items-center justify-center gap-2 py-10 text-brand-600 dark:text-brand-400">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Vérification du fichier…</span>
        </Card>
      )}

      {phase.s === 'error' && (
        <Card className="space-y-3 border-amber-300 bg-amber-50 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p>{phase.message}</p>
          {phase.file && (
            <Button variant="secondary" size="sm" onClick={() => phase.file && void analyze(phase.file)}>
              <RefreshCw size={16} />
              Réessayer
            </Button>
          )}
        </Card>
      )}

      {showForm && file && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText size={16} className="text-muted" />
            <span className="truncate font-medium">{file.name}</span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-brand-700 dark:text-brand-300">
              <Check size={14} /> prêt
            </span>
          </div>

          <div className="rounded-xl surface-2 p-4">
            <span className="font-semibold">Ce que l’analyse contient</span>
            <ul className="mt-3 space-y-1.5 text-sm">
              {INCLUDED.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <label className="block text-sm font-medium">
            Code d’accès
            <div className="relative mt-1">
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3 top-2.5 text-muted"
              />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.trim()) void analyze(file);
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="votre code"
                className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-2 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-500"
              />
            </div>
          </label>

          <label className="block text-sm font-medium">
            Convention collective{' '}
            <span className="font-normal text-muted">(optionnel)</span>
            <div className="relative mt-1">
              <Scale size={16} className="pointer-events-none absolute left-3 top-2.5 text-muted" />
              <select
                value={convention}
                onChange={(e) => setConvention(e.target.value)}
                className="w-full appearance-none rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-2 pl-9 pr-3 text-sm focus:outline focus:outline-2 focus:outline-brand-500"
              >
                <option value="">Je ne sais pas — la détecter automatiquement</option>
                {CONVENTIONS_SORTED.map((c) => (
                  <option key={c.label} value={c.label}>
                    {c.label}
                    {c.idcc ? ` (IDCC ${c.idcc})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="mt-1 block text-xs font-normal text-muted">
              Si vous ne savez pas, laissez tel quel : PayLumo essaiera de la reconnaître sur le
              bulletin lui-même.
            </span>
          </label>

          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <strong>PDF natif uniquement</strong> — pas une photo ni un scan (Ctrl+F / ⌘F doit
            trouver du texte dans le fichier). Une fois lancée, l’analyse est{' '}
            <strong>due et non remboursable</strong> : elle déclenche un traitement par IA facturé
            à PayLumo, que le bulletin soit exploitable ou non.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void analyze(file)} disabled={!code.trim()}>
              Analyser le bulletin
            </Button>
            <Button variant="ghost" onClick={() => setPhase({ s: 'idle' })}>
              Changer de fichier
            </Button>
          </div>

          <p className="text-xs text-muted">
            En lançant l’analyse, vous acceptez les{' '}
            <Link to="/conditions" className="underline">
              conditions d’utilisation
            </Link>{' '}
            et la{' '}
            <Link to="/confidentialite" className="underline">
              politique de confidentialité
            </Link>
            . Votre <strong>numéro de sécurité sociale et votre adresse sont masqués dans ce
            navigateur</strong> avant l’envoi. Le PDF est ensuite lu puis supprimé — il n’est pas
            conservé.
          </p>
        </Card>
      )}

      {busy && (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <Loader2 className="animate-spin text-brand-600 dark:text-brand-400" size={22} />
          <span className="font-semibold">
            {phase.s === 'redacting'
              ? 'Préparation du fichier (masquage des données personnelles)…'
              : 'Lecture et analyse du bulletin…'}
          </span>
          {phase.s === 'analyzing' && (
            <span className="text-xs text-muted">
              {phase.masked ? `Masqué avant l’envoi : ${phase.masked}. ` : ''}
              Cela prend généralement une vingtaine de secondes.
            </span>
          )}
        </Card>
      )}

      <Card className="flex gap-3 surface-2 text-sm text-muted">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-400" />
        <p>
          Le pré-contrôle et le <strong>masquage du n° de sécurité sociale et de l’adresse</strong>{' '}
          se font dans votre navigateur. Le PDF est ensuite envoyé pour être lu (IA) puis analysé,{' '}
          <strong>sans être conservé</strong>. Le résultat est gardé uniquement dans ce navigateur,
          sous <em>Historique</em>. Ni votre nom, ni votre adresse, ni votre n° de sécurité sociale
          ne sont enregistrés.
        </p>
      </Card>

      {busy && <p className="text-center text-xs text-muted">Ne fermez pas cette page.</p>}
    </div>
  );
}
