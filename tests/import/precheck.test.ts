import { describe, it, expect, vi, beforeEach } from 'vitest';

const readPdfText = vi.fn();
vi.mock('@/features/parsing/pdf', () => ({ readPdfText }));

const { precheckPdf } = await import('@/features/import/precheck');

function file(name = 'b.pdf', type = 'application/pdf', size = 1000): File {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
  } as unknown as File;
}

beforeEach(() => readPdfText.mockReset());

describe('precheckPdf', () => {
  it('refuse un non-PDF', async () => {
    expect((await precheckPdf(file('x.txt', 'text/plain'))).ok).toBe(false);
  });

  it('refuse un PDF sans couche texte (scan)', async () => {
    readPdfText.mockResolvedValue({ charCount: 3, lines: [] });
    const r = await precheckPdf(file());
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/scan|photo/i);
  });

  it('refuse un PDF texte sans mots-clés de bulletin', async () => {
    readPdfText.mockResolvedValue({
      charCount: 500,
      lines: [{ text: 'facture acompte total ttc client' }],
    });
    expect((await precheckPdf(file())).ok).toBe(false);
  });

  it('accepte un PDF qui ressemble à un bulletin', async () => {
    readPdfText.mockResolvedValue({
      charCount: 900,
      lines: [{ text: 'BULLETIN DE PAIE cotisations salaire brut net à payer' }],
    });
    expect((await precheckPdf(file())).ok).toBe(true);
  });

  it('lecture PDF cassée → refus (pas de crash)', async () => {
    readPdfText.mockResolvedValue(undefined);
    expect((await precheckPdf(file())).ok).toBe(false);
  });
});
