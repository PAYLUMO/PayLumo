/**
 * Serveur de développement local pour le proxy IA.
 *   npm run server   (ou `npm run dev:all` pour front + proxy)
 */

import { serve } from '@hono/node-server';
import app from './app.js';

// Charge .env (Node >= 20.6). Silencieux si absent.
try {
  process.loadEnvFile('.env');
} catch {
  /* pas de fichier .env */
}

if (!process.env.ANTHROPIC_API_KEY)
  console.warn('⚠  ANTHROPIC_API_KEY non défini (lecture du bulletin → 502). Voir .env.example.');
if (!process.env.PAYLUMO_ACCESS_CODE)
  console.warn('⚠  PAYLUMO_ACCESS_CODE non défini — code par défaut « ASSIATA ».');

const port = Number(process.env.PORT) || 8787;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`PayLumo — proxy IA sur http://localhost:${info.port}`);
});
