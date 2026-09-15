/**
 * Copie les polices standard de pdf.js dans public/standard_fonts/ pour que le
 * rendu des PDF (caviardage local du n° de sécu) fonctionne même quand la police
 * n'est pas embarquée. Lancé par `predev` / `prebuild`.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve('node_modules/pdfjs-dist/standard_fonts');
const dest = resolve('public/standard_fonts');

if (!existsSync(src)) {
  console.warn(`⚠  ${src} introuvable — pdfjs-dist installé ?`);
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`polices pdf.js → public/standard_fonts/`);
