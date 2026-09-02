import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl font-extrabold text-brand-600 dark:text-brand-400">404</p>
      <h1 className="mt-3 text-lg font-bold">Page introuvable</h1>
      <p className="mt-1 text-sm text-muted">
        Le lien que vous avez suivi n'existe pas ou a été déplacé.
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
