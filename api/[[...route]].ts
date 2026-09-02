/**
 * Fonction serverless Vercel (runtime Node) — catch-all `/api/*`.
 * Délègue à l'app Hono partagée (`server/app.ts`).
 */

import { handle } from '@hono/node-server/vercel';
import app from '../server/app.js';

export const config = {
  // Hono lit le corps lui-même ; Vercel ne doit pas le pré-parser.
  api: { bodyParser: false },
};

export default handle(app);
