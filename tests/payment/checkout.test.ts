import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CheckoutError,
  clearPending,
  readPending,
  sha256Hex,
  startCheckout,
  toBase64,
} from '@/features/payment/checkout';

function fakePdf(): File {
  const bytes = new TextEncoder().encode('%PDF-1.4 hello');
  return {
    name: 'b.pdf',
    type: 'application/pdf',
    arrayBuffer: async () => bytes.buffer,
  } as unknown as File;
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('helpers', () => {
  it('toBase64 round-trip', () => {
    const b = new TextEncoder().encode('abc').buffer;
    expect(atob(toBase64(b))).toBe('abc');
  });

  it('sha256Hex renvoie 64 hex', async () => {
    const h = await sha256Hex(new TextEncoder().encode('x').buffer);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('readPending expire après 1 h', () => {
    sessionStorage.setItem(
      'paylumo.pendingAnalysis',
      JSON.stringify({ pdfBase64: 'x', fileName: 'a', pdfHash: 'h', createdAt: Date.now() - 3_700_000 }),
    );
    expect(readPending()).toBeNull();
  });
});

describe('startCheckout', () => {
  it('stocke le pending et renvoie l’URL Stripe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ url: 'https://stripe.test/s/1' }), { status: 200 })),
    );
    const url = await startCheckout(fakePdf());
    expect(url).toBe('https://stripe.test/s/1');
    const pending = readPending();
    expect(pending?.fileName).toBe('b.pdf');
    expect(pending?.pdfHash).toMatch(/^[0-9a-f]{64}$/);
    clearPending();
    expect(readPending()).toBeNull();
  });

  it('503 → CheckoutError « indisponible »', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    await expect(startCheckout(fakePdf())).rejects.toBeInstanceOf(CheckoutError);
  });

  it('réseau KO → CheckoutError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('net');
    }));
    await expect(startCheckout(fakePdf())).rejects.toBeInstanceOf(CheckoutError);
  });
});
