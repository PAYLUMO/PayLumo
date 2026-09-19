/**
 * API PayLumo — analyse d'un bulletin de paie.
 *
 * App Hono partagée par le dev local (`server/dev.ts`) et Vercel (`api/*.ts`).
 *   POST /api/analyze   { code, pdf, fileName, convention? } → StoredAnalysis
 *
 * L'analyse est débloquée par un code d'accès (`PAYLUMO_ACCESS_CODE`) —
 * garde-fou temporaire le temps de la V1 (voir 2026-09-18 en mémoire projet).
 * Ne journalise ni ne stocke le contenu du PDF.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { keyStatus, modelName } from './claude.js';
import { runAnalysis, TransientError, UnreadableError } from './analyze.js';
import { findConventionByLabel } from '../shared/data/conventions.js';

const MAX_PDF_BYTES = (Number(process.env.MAX_PDF_MB) || 8) * 1024 * 1024;
const RATE_LIMIT_PER_HOUR = Number(process.env.RATE_LIMIT_PER_HOUR) || 30;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/** Code d'accès attendu — comparé sans casse ni espaces. */
const ACCESS_CODE = (process.env.PAYLUMO_ACCESS_CODE || 'ASSIATA').trim().toLowerCase();

function codeOk(input: unknown): boolean {
  return typeof input === 'string' && input.trim().toLowerCase() === ACCESS_CODE;
}

// Rate-limit : en mémoire (best-effort, se réinitialise au cold start).
// Prod : Vercel KV / Upstash.
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

app.get('/api/health', (c) => c.json({ ok: true, model: modelName, anthropicKey: keyStatus() }));

app.post('/api/analyze', async (c) => {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
  if (rateLimited(ip)) return c.json({ error: 'rate_limited' }, 429);

  let body: { code?: unknown; pdf?: unknown; fileName?: unknown; convention?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'bad_json' }, 400);
  }

  if (!codeOk(body.code)) return c.json({ error: 'bad_code' }, 401);

  const decoded = decodePdf(body.pdf);
  if ('error' in decoded) return c.json({ error: decoded.error }, decoded.status);
  const { bytes } = decoded;
  const fileName = typeof body.fileName === 'string' ? body.fileName.slice(0, 120) : 'bulletin.pdf';
  // On ne retient que les libellés connus du référentiel (pas de texte arbitraire).
  const conventionLabel =
    typeof body.convention === 'string' && findConventionByLabel(body.convention)
      ? body.convention
      : null;

  try {
    const analysis = await runAnalysis(bytes.toString('base64'), fileName, conventionLabel);
    return c.json(analysis);
  } catch (err) {
    if (err instanceof TransientError) {
      console.error('[analyze] transitoire:', err.message);
      return c.json({ error: 'retry' }, 502);
    }
    if (err instanceof UnreadableError) {
      return c.json({ error: 'unreadable' }, 422);
    }
    console.error('[analyze] inattendu:', err instanceof Error ? err.message : err);
    return c.json({ error: 'server_error' }, 500);
  }
});

export default app;
