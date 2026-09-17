import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mocks (hoisted) ---
const runAnalysis = vi.fn();

class UnreadableError extends Error {}
class TransientError extends Error {}

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
  runAnalysis.mockReset();
});

describe('POST /api/analyze', () => {
  it('lecture OK → 200 + analyse', async () => {
    runAnalysis.mockResolvedValue({ id: 'a_x', result: { summary: { canAnalyze: true } } });
    const res = await analyze({ pdf: PDF_B64 });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('a_x');
  });

  it('bulletin illisible → 422 unreadable', async () => {
    runAnalysis.mockRejectedValue(new UnreadableError('scan'));
    const res = await analyze({ pdf: PDF_B64 });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'unreadable' });
  });

  it('panne transitoire → 502 retry', async () => {
    runAnalysis.mockRejectedValue(new TransientError('claude 529'));
    const res = await analyze({ pdf: PDF_B64 });
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'retry' });
  });

  it('PDF non fourni → 400', async () => {
    const res = await analyze({});
    expect(res.status).toBe(400);
  });

  it('octets non-PDF → 415', async () => {
    const res = await analyze({ pdf: Buffer.from('hello').toString('base64') });
    expect(res.status).toBe(415);
  });
});
