import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, Trash2 } from 'lucide-react';
import { Button, Card, SectionTitle } from '@/components/ui';
import { formatDateTimeFr } from '@shared/lib/dates';
import { deleteAnalysis, listAnalyses } from '@/lib/storage';
import type { StoredAnalysis } from '@shared/analysis/types';
import { SeverityIcon, OkIcon } from '@/features/results/shared';

export function HistoryPage() {
  const [items, setItems] = useState<StoredAnalysis[] | null>(null);

  useEffect(() => {
    listAnalyses().then(setItems);
  }, []);

  const remove = async (id: string) => {
    await deleteAnalysis(id);
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
  };

  return (
    <div className="space-y-4">
      <SectionTitle hint={items ? `${items.length}` : ''}>Historique</SectionTitle>

      {items && items.length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-sm text-muted">Aucune analyse enregistrée sur cet appareil.</p>
          <Link to="/analyser" className="mt-4 inline-block">
            <Button>
              <FileSearch size={18} />
              Analyser un bulletin
            </Button>
          </Link>
        </Card>
      )}

      <ul className="space-y-2">
        {(items ?? []).map((a) => {
          const { erreur, avertissement } = a.result.summary.severityCounts;
          return (
            <li key={a.id}>
              <Card className="flex items-center gap-3">
                <span className="shrink-0">
                  {erreur > 0 ? (
                    <SeverityIcon severity="erreur" size={20} />
                  ) : avertissement > 0 ? (
                    <SeverityIcon severity="avertissement" size={20} />
                  ) : (
                    <OkIcon size={20} />
                  )}
                </span>
                <Link to={`/resultats/${a.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{a.label}</span>
                  <span className="block text-xs text-muted">
                    {formatDateTimeFr(a.createdAt)} ·{' '}
                    {erreur > 0
                      ? `${erreur} erreur${erreur > 1 ? 's' : ''}`
                      : avertissement > 0
                        ? `${avertissement} à vérifier`
                        : 'aucune anomalie'}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="shrink-0 rounded-lg p-2 text-muted hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-950/50"
                  aria-label="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
