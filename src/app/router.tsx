import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/app/Layout';
import { HomePage } from '@/features/home/HomePage';
import { ImportPage } from '@/features/import/ImportPage';
import { ResultsPage } from '@/features/results/ResultsPage';
import { CotisationDetailPage } from '@/features/explain/CotisationDetailPage';
import { HistoryPage } from '@/features/history/HistoryPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ComparatorPage } from '@/features/comparator/ComparatorPage';
import { CalculatorPage } from '@/features/calculator/CalculatorPage';
import { MentionsLegales, Confidentialite, Conditions } from '@/features/legal/LegalPage';
import { NotFoundPage } from '@/app/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'analyser', element: <ImportPage /> },
      { path: 'calculateur', element: <CalculatorPage /> },
      { path: 'comparateur', element: <ComparatorPage /> },
      { path: 'resultats/:id', element: <ResultsPage /> },
      { path: 'cotisation/:code', element: <CotisationDetailPage /> },
      { path: 'historique', element: <HistoryPage /> },
      { path: 'parametres', element: <SettingsPage /> },
      { path: 'mentions-legales', element: <MentionsLegales /> },
      { path: 'confidentialite', element: <Confidentialite /> },
      { path: 'conditions', element: <Conditions /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
