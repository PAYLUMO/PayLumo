/**
 * Lecture PDF locale côté serveur (repli quand l'IA échoue).
 * Utilise le build « legacy » de pdf.js, exécutable en Node sans worker.
 */

import type { PdfjsLike } from '../shared/parsing/pdf-core.js';

let cached: PdfjsLike | null = null;

export async function getNodePdfjs(): Promise<PdfjsLike> {
  if (cached) return cached;
  const mod = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfjsLike;
  cached = mod;
  return mod;
}
