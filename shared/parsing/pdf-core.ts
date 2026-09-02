/**
 * Cœur d'extraction PDF, indépendant de l'environnement : reçoit un module
 * pdf.js déjà configuré (worker branché côté navigateur, « fake worker » côté
 * tests Node) et rend le texte du document reconstruit en lignes / cellules.
 */

export interface TextToken {
  str: string;
  x: number; // abscisse du coin gauche (points PDF)
  xEnd: number;
  y: number; // ordonnée de la ligne de base
  page: number;
  fontSize: number;
}

export interface Cell {
  text: string;
  /** abscisse de début et de fin de la cellule (points PDF). */
  x: number;
  xEnd: number;
}

export interface TextLine {
  page: number;
  y: number;
  tokens: TextToken[];
  /** texte lisible, espaces simples. */
  text: string;
  /** cellules séparées par les colonnes (trous horizontaux). */
  cells: Cell[];
}

export interface PdfDocumentText {
  pageCount: number;
  lines: TextLine[];
  charCount: number; // 0 ⇒ PDF scanné
  producer?: string;
  creator?: string;
}

/** Sous-ensemble de l'API pdf.js dont on a besoin. */
export interface PdfjsLike {
  getDocument: (src: { data: Uint8Array; isEvalSupported?: boolean }) => {
    promise: Promise<PdfjsDoc>;
  };
}
interface PdfjsDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfjsPage>;
  getMetadata: () => Promise<{ info?: Record<string, unknown> }>;
  destroy: () => void;
}
interface PdfjsPage {
  getTextContent: () => Promise<{ items: Array<Record<string, unknown>> }>;
  cleanup: () => void;
}

const Y_TOLERANCE = 2.4;
const COLUMN_GAP_FACTOR = 1.6;

function assemble(tokens: TextToken[]): { text: string; cells: Cell[] } {
  const cells: Cell[] = [];
  let current = '';
  let currentX = tokens[0]?.x ?? 0;
  let currentEnd = tokens[0]?.xEnd ?? 0;
  let prevEnd: number | null = null;
  let prevFont = tokens[0]?.fontSize ?? 10;

  const flush = () => {
    if (current.trim()) cells.push({ text: current.trim(), x: currentX, xEnd: currentEnd });
  };

  for (const t of tokens) {
    if (prevEnd !== null) {
      const gap = t.x - prevEnd;
      const spaceWidth = Math.max(1.1, prevFont * 0.25);
      if (gap > spaceWidth * COLUMN_GAP_FACTOR + 3) {
        flush();
        current = '';
        currentX = t.x;
      } else if (gap > spaceWidth * 0.6) {
        current += ' ';
      }
    }
    current += t.str;
    currentEnd = t.xEnd;
    prevEnd = t.xEnd;
    prevFont = t.fontSize;
  }
  flush();
  return { text: cells.map((c) => c.text).join('  ').replace(/\s+/g, ' ').trim(), cells };
}

function buildLines(tokens: TextToken[]): TextLine[] {
  const byPage = new Map<number, TextToken[]>();
  for (const t of tokens) {
    if (!t.str.trim()) continue;
    const arr = byPage.get(t.page) ?? [];
    arr.push(t);
    byPage.set(t.page, arr);
  }

  const lines: TextLine[] = [];
  for (const [page, arr] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    const buckets: TextToken[][] = [];
    for (const t of [...arr].sort((a, b) => b.y - a.y)) {
      const bucket = buckets.find((b) => Math.abs(b[0].y - t.y) <= Y_TOLERANCE);
      if (bucket) bucket.push(t);
      else buckets.push([t]);
    }
    for (const b of buckets) {
      b.sort((a, c) => a.x - c.x);
      const { text, cells } = assemble(b);
      if (!text) continue;
      lines.push({ page, y: b[0].y, tokens: b, text, cells });
    }
  }
  return lines;
}

export async function extractPdfText(
  pdfjs: PdfjsLike,
  data: ArrayBuffer | Uint8Array,
): Promise<PdfDocumentText> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false }).promise;

  const tokens: TextToken[] = [];
  let charCount = 0;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items) {
      const str = typeof item.str === 'string' ? item.str : '';
      if (!str) continue;
      charCount += str.trim().length;
      const tr = item.transform as number[];
      const fontSize = Math.abs(tr?.[3] ?? 10) || 10;
      const width = typeof item.width === 'number' ? item.width : str.length * fontSize * 0.5;
      tokens.push({
        str,
        x: tr?.[4] ?? 0,
        xEnd: (tr?.[4] ?? 0) + width,
        y: tr?.[5] ?? 0,
        page: p,
        fontSize,
      });
    }
    page.cleanup();
  }

  let producer: string | undefined;
  let creator: string | undefined;
  try {
    const meta = await doc.getMetadata();
    const info = meta.info ?? {};
    producer = typeof info.Producer === 'string' ? info.Producer : undefined;
    creator = typeof info.Creator === 'string' ? info.Creator : undefined;
  } catch {
    /* pas de métadonnées */
  }

  const result: PdfDocumentText = {
    pageCount: doc.numPages,
    lines: buildLines(tokens),
    charCount,
    producer,
    creator,
  };
  doc.destroy();
  return result;
}
