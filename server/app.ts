/**
 * API PayLumo — analyse payante.
 *
 * App Hono partagée par le dev local (`server/dev.ts`) et Vercel (`api/*.ts`).
 *   POST /api/checkout  { pdfHash }              → { url }  (Stripe Checkout)
 *   POST /api/analyze   { session_id, pdf, ... } → StoredAnalysis  (après paiement vérifié)
 *
 * Ne journalise ni ne stocke le contenu du PDF.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { modelName } from './claude.js';
import { runAnalysis, TransientError, UnreadableError } from './analyze.js';
import { createCheckout, PRICE_CENTS, refund, stripeConfigured, verifyPaid } from './stripe.js';

const MAX_PDF_BYTES = (Number(process.env.MAX_PDF_MB) || 8) * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR) || 30;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

function pickOrigin(header: string | undefined): string {
  return header && ALLOWED_ORIGINS.includes(header) ? header : ALLOWED_ORIGINS[0];
}

// Rate-limit + sessions consommées : en mémoire (best-effort ; le pdfHash reste
// la vraie garde anti-rejeu). Prod : Vercel KV / Upstash.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const since = now - 3_600_000;
  const arr = (hits.get(ip) ?? []).filter((t) => t > since);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT_PER_HOUR;
}

function decodePdf(raw: unknown): { bytes: Buffer } | { error: string; status: 400 | 413 | 415 } {
  const b64 = typeof raw === 'string' ? raw.replace(/^data:[^;]*;base64,/, '') : '';
  if (!b64) return { error: 'missing_pdf', status: 400 };
  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, 'base64');
  } catch {
    return { error: 'bad_base64', status: 400 };
  }
  if (bytes.length === 0) return { error: 'empty', status: 400 };
  if (bytes.length > MAX_PDF_BYTES) return { error: 'too_large', status: 413 };
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') return { error: 'not_pdf', status: 415 };
  return { bytes };
}

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]),
    allowMethods: ['POST', 'OPTIONS'],
    allowHeaders: ['content-type'],
  }),
);

app.get('/api/health', (c) =>
  c.json({ ok: true, model: modelName, priceCents: PRICE_CENTS, stripe: stripeConfigured() }),
);

app.post('/api/checkout', async (c) => {
  if (!stripeConfigured()) return c.json({ error: 'payments_unavailable' }, 503);

  let body: { pdfHash?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'bad_json' }, 400);
  }
  const pdfHash = typeof body.pdfHash === 'string' ? body.pdfHash : '';
  if (!/^[0-9a-f]{64}$/.test(pdfHash)) return c.json({ error: 'bad_hash' }, 400);

  try {
    const url = await createCheckout(pdfHash, pickOrigin(c.req.header('origin')));
    return c.json({ url });
  } catch (err) {
    console.error('[checkout] échec:', err instanceof Error ? err.message : err);
    return c.json({ error: 'checkout_failed' }, 502);
  }
});

app.post('/api/analyze', async (c) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
  if (rateLimited(ip)) return c.json({ error: 'rate_limited' }, 429);

  let body: { session_id?: unknown; pdf?: unknown; fileName?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'bad_json' }, 400);
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
  if (!sessionId) return c.json({ error: 'missing_session' }, 400);

  const decoded = decodePdf(body.pdf);
  if ('error' in decoded) return c.json({ error: decoded.error }, decoded.status);
  const { bytes } = decoded;
  const fileName = typeof body.fileName === 'string' ? body.fileName.slice(0, 120) : 'bulletin.pdf';

  // 1. Vérification du paiement
  if (!stripeConfigured()) return c.json({ error: 'payments_unavailable' }, 503);
  const paid = await verifyPaid(sessionId, bytes);
  if (!paid.ok) {
    const status =
      paid.reason === 'hash_mismatch' ? 403 : paid.reason === 'refunded' ? 409 : 402;
    return c.json({ error: paid.reason ?? 'not_paid' }, status);
  }

  // 2. Analyse
  try {
    const analysis = await runAnalysis(bytes.toString('base64'), fileName);
    return c.json(analysis);
  } catch (err) {
    if (err instanceof TransientError) {
      // panne passagère : session conservée, l'utilisateur peut réessayer sans repayer
      console.error('[analyze] transitoire:', err.message);
      return c.json({ error: 'retry' }, 502);
    }
    if (err instanceof UnreadableError) {
      // échec définitif → remboursement automatique
      if (paid.paymentIntentId) await refund(paid.paymentIntentId);
      return c.json({ error: 'unreadable', refunded: Boolean(paid.paymentIntentId) }, 422);
    }
    console.error('[analyze] inattendu:', err instanceof Error ? err.message : err);
    return c.json({ error: 'server_error' }, 500);
  }
});

export default app;
