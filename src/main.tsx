import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { ThemeProvider } from '@/app/theme';
import './index.css';

// Un onglet resté ouvert pendant un déploiement garde en mémoire un index.html
// qui référence des fichiers versionnés (assets à hash) supprimés du serveur au
// déploiement suivant : tout import dynamique (parsing PDF, moteur d'analyse,
// pages découpées par route…) échoue alors silencieusement. Vite déclenche cet
// événement dans ce cas précis ; un rechargement récupère la dernière version.
// Garde anti-boucle : un seul rechargement automatique par onglet.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'paylumo:reloaded-after-preload-error';
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* stockage indisponible : on tente quand même le rechargement */
  }
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
);
