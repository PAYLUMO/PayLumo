import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractPdfText, type PdfDocumentText } from '@shared/parsing/pdf-core';

const require = createRequire(import.meta.url);
const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures');
// Exécution Node sans worker dédié : on pointe vers le worker « legacy »
// (chemin converti en URL file:// pour le loader ESM de Node sous Windows).
(pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
  pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;

export function fixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURE_DIR, 'pdf', name)));
}

export function extractFixture(name: string): Promise<PdfDocumentText> {
  return extractPdfText(pdfjs as unknown as Parameters<typeof extractPdfText>[0], fixtureBytes(name));
}

export interface FixtureManifestEntry {
  id: string;
  file: string;
  title: string;
  expect: Record<string, unknown>;
  computed: Record<string, number>;
}

export function loadManifest(): FixtureManifestEntry[] {
  return JSON.parse(readFileSync(resolve(FIXTURE_DIR, 'manifest.json'), 'utf8'));
}
