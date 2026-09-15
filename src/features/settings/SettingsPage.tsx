import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { Card, SectionTitle, Button } from '@/components/ui';
import { useTheme } from '@/app/theme';
import { PASS, PMSS, REFERENCE_YEAR, SMIC_2026 } from '@shared/data/params';
import { formatEuro } from '@shared/lib/money';
import { clearAllAnalyses, listAnalyses } from '@/lib/storage';

export function SettingsPage() {
  const { mode, setMode } = useTheme();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    listAnalyses().then((a) => setCount(a.length));
  }, []);

  const wipe = async () => {
    if (!confirm('Effacer toutes les analyses enregistrées sur cet appareil ? Action irréversible.')) return;
    await clearAllAnalyses();
    setCount(0);
  };

  return (
    <div className="space-y-4">
      <SectionTitle>Réglages</SectionTitle>

      <Card>
        <h3 className="font-semibold">Apparence</h3>
        <div className="mt-3 flex gap-2">
          {(['light', 'dark', 'system'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={
                'rounded-lg border px-3 py-1.5 text-sm ' +
                (mode === m
                  ? 'border-brand-500 bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200'
                  : 'hover:surface-2')
              }
            >
              {m === 'light' ? 'Clair' : m === 'dark' ? 'Sombre' : 'Système'}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="flex items-center gap-1.5 font-semibold">
          <KeyRound size={16} className="text-brand-600 dark:text-brand-400" />
          Accès
        </h3>
        <p className="mt-1 text-sm text-muted">
          L’analyse est réservée aux personnes disposant d’un <strong className="text-[rgb(var(--text))]">code d’accès</strong>,
          demandé au moment de lancer l’analyse — sans compte ni paiement. Le comparateur de
          salaire et l’exemple d’analyse restent librement accessibles.
        </p>
      </Card>

      <Card>
        <h3 className="font-semibold">Référentiel {REFERENCE_YEAR}</h3>
        <dl className="mt-2 divide-y divide-[rgb(var(--border))] text-sm">
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">Plafond mensuel Sécurité sociale</dt>
            <dd className="font-medium">{formatEuro(PMSS)}</dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">Plafond annuel (PASS)</dt>
            <dd className="font-medium">{formatEuro(PASS)}</dd>
          </div>
          <div className="flex justify-between py-1.5">
            <dt className="text-muted">SMIC horaire</dt>
            <dd className="font-medium">
              {formatEuro(SMIC_2026[0].horaire)} puis {formatEuro(SMIC_2026[1].horaire)} (1er juin)
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted">
          Sources : arrêté du 22 décembre 2025, barèmes URSSAF / BOSS / Agirc-Arrco 2026. Seule
          l’année 2026 est disponible pour l’instant.
        </p>
      </Card>

      <Card>
        <h3 className="font-semibold">Données</h3>
        <p className="mt-1 text-sm text-muted">
          {count == null
            ? 'Chargement…'
            : `${count} analyse${count > 1 ? 's' : ''} stockée${count > 1 ? 's' : ''} dans ce navigateur (IndexedDB). Le PDF envoyé pour analyse n’est pas conservé par le serveur.`}
        </p>
        <Button variant="danger" size="sm" className="mt-3" onClick={wipe} disabled={!count}>
          Effacer toutes mes analyses
        </Button>
      </Card>

      <Card className="surface-2 text-xs text-muted">
        <p className="font-semibold text-[rgb(var(--text))]">Avertissement</p>
        <p className="mt-1">
          PayLumo fournit une analyse <strong>indicative</strong> : elle explique chaque cotisation
          et compare les taux au <strong>barème légal 2026</strong>. Un écart signalé n’est pas
          forcément une anomalie — une <strong>convention collective</strong> ou un{' '}
          <strong>accord d’entreprise</strong> peut fixer des règles différentes, parfaitement
          conformes (abattement BTP, taux de branche, prévoyance spécifique…), que PayLumo ne
          connaît pas. L’analyse peut aussi comporter des imprécisions si une ligne a été mal lue.
          Elle ne constitue pas un conseil juridique, comptable ou fiscal : pour toute confirmation,
          adressez-vous à votre <strong>gestionnaire de paie</strong> ou à un{' '}
          <strong>expert-comptable</strong>.
        </p>
      </Card>
    </div>
  );
}
