import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks (hoisted) ---
const verifyPaid = vi.fn();
const createCheckout = vi.fn();
const refund = vi.fn();
const runAnalysis = vi.fn();

class UnreadableError extends Error {}
class TransientError extends Error {}

vi.mock('../../server/stripe.js', () => ({
  verifyPaid,
  createCheckout,
  refund,
  PRICE_CENTS: 99,
  stripeConfigured: () => true,
  sha256Hex: () => 'deadbeef',
}));

vi.mock('../../server/analyze.js', () => ({ runAnalysis, UnreadableError, TransientError }));

const { default: app } = await import('../../server/app.js');

const PDF_B64 = Buffer.from('%PDF-1.4\nfake').toString('base64');

function analyze(body: unknown) {
  return app.request('/api/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  verifyPaid.mockReset();
  createCheckout.mockReset();
  refund.mockReset();
  runAnalysis.mockReset();
});

describe('POST /api/checkout', () => {
  it('crée une session et renvoie l’URL', async () => {
    createCheckout.mockResolvedValue('https://checkout.stripe.test/s/abc');
    const res = await app.request('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pdfHash: 'a'.repeat(64) }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/s/abc' });
  });

  it('rejette un hash mal formé', async () => {
    const res = await app.request('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pdfHash: 'nope' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/analyze', () => {
  it('paiement non confirmé → 402', async () => {
    verifyPaid.mockResolvedValue({ ok: false, reason: 'not_paid' });
    const res = await analyze({ session_id: 's1', pdf: PDF_B64 });
    expect(res.status).toBe(402);
    expect(runAnalysis).not.toHaveBeenCalled();
  });

  it('hash du PDF ≠ celui payé → 403', async () => {
    verifyPaid.mockResolvedValue({ ok: false, reason: 'hash_mismatch' });
    const res = await analyze({ session_id: 's1', pdf: PDF_B64 });
    expect(res.status).toBe(403);
  });

  it('payé + lecture OK → 200 + analyse', async () => {
    verifyPaid.mockResolvedValue({ ok: true, paymentIntentId: 'pi_1' });
    runAnalysis.mockResolvedValue({ id: 'a_x', result: { summary: { canAnalyze: true } } });
    const res = await analyze({ session_id: 's1', pdf: PDF_B64 });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('a_x');
    expect(refund).not.toHaveBeenCalled();
  });

  it('bulletin illisible → 422 + remboursement', async () => {
    verifyPaid.mockResolvedValue({ ok: true, paymentIntentId: 'pi_9' });
    runAnalysis.mockRejectedValue(new UnreadableError('scan'));
    const res = await analyze({ session_id: 's1', pdf: PDF_B64 });
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: 'unreadable', refunded: true });
    expect(refund).toHaveBeenCalledWith('pi_9');
  });

  it('panne transitoire → 502 retry, pas de remboursement', async () => {
    verifyPaid.mockResolvedValue({ ok: true, paymentIntentId: 'pi_2' });
    runAnalysis.mockRejectedValue(new TransientError('claude 529'));
    const res = await analyze({ session_id: 's1', pdf: PDF_B64 });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'retry' });
    expect(refund).not.toHaveBeenCalled();
  });

  it('PDF non fourni → 400', async () => {
    const res = await analyze({ session_id: 's1' });
    expect(res.status).toBe(400);
  });

  it('octets non-PDF → 415', async () => {
    verifyPaid.mockResolvedValue({ ok: true });
    const res = await analyze({ session_id: 's1', pdf: Buffer.from('hello').toString('base64') });
    expect(res.status).toBe(415);
  });
});
