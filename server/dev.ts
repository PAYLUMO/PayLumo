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

for (const [key, note] of [
  ['ANTHROPIC_API_KEY', 'lecture du bulletin → 502'],
  ['STRIPE_SECRET_KEY', 'paiement → 503'],
] as const) {
  if (!process.env[key]) console.warn(`⚠  ${key} non défini (${note}). Voir .env.example.`);
}

const port = Number(process.env.PORT) || 8787;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`PayLumo — proxy IA sur http://localhost:${info.port}`);
});
