/**
 * Câblage navigateur de pdf.js : branche le worker (packagé par Vite) puis
 * délègue au cœur d'extraction (`pdf-core.ts`).
 */

import * as pdfjsLib from 'pdfjs-dist';
import PdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
import { extractPdfText, type PdfDocumentText } from '@shared/parsing/pdf-core';

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfjsWorker();

/** URL des polices standard (copiées par vite-plugin-static-copy), pour le rendu. */
export const STANDARD_FONT_DATA_URL = `${import.meta.env.BASE_URL}standard_fonts/`;

/** Instance pdf.js déjà configurée (worker branché). */
export { pdfjsLib as pdfjs };

export type { PdfDocumentText, TextLine, TextToken } from '@shared/parsing/pdf-core';

export function readPdfText(data: ArrayBuffer | Uint8Array): Promise<PdfDocumentText> {
  return extractPdfText(pdfjsLib as unknown as Parameters<typeof extractPdfText>[0], data);
}
