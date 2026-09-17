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

// La lecture par Claude prend ~15-25 s (parfois plus sur un gros bulletin) ;
// sans ça, la limite par défaut de Vercel peut couper la fonction avant la
// fin d'un appel qui aurait pourtant réussi. Plafonné par le plan Vercel
// utilisé (à vérifier sur vercel.com/docs/functions/limitations) — la valeur
// demandée est simplement ramenée à ce plafond si elle le dépasse.
export const maxDuration = 60;

export default handle(app);
