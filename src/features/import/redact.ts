/**
 * Caviardage local des données identifiantes (numéro de sécurité sociale et
 * adresse postale) avant l'envoi du bulletin.
 *
 * Le PDF est rendu en images (la couche texte disparaît), un rectangle opaque est
 * peint sur chaque zone repérée, puis un nouveau PDF est reconstruit. Ces données
 * ne quittent donc jamais l'appareil. En cas d'échec du rendu, on renvoie
 * l'original — l'analyse n'est jamais bloquée.
 */

import { PDFDocument } from 'pdf-lib';
import { pdfjs, STANDARD_FONT_DATA_URL } from '@/features/parsing/pdf';
import { findAddress } from './address';
import { findNir } from './nir';

export interface RedactionResult {
  /** PDF prêt à envoyer (aplati si quelque chose a été masqué, sinon l'original). */
  file: File;
  /** nombre de zones NIR masquées. */
  nirCount: number;
  /** nombre de zones d'adresse masquées. */
  addressCount: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height?: number;
}

const RENDER_SCALE = 2.5;
const JPEG_QUALITY = 0.82;

/** Boîtes (espace utilisateur PDF) couvrant NIR + adresses sur une page. */
function sensitiveBoxes(items: TextItem[]): { boxes: Box[]; nir: number; address: number } {
  const glyphs = items
    .filter((it) => it.str && it.str.trim() !== '' && Array.isArray(it.transform))
    .map((it) => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: it.width || 0,
      h: it.height || Math.abs(it.transform[3]) || 8,
    }));

  glyphs.sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: (typeof glyphs)[] = [];
  for (const g of glyphs) {
    const last = lines.at(-1);
    if (last && Math.abs(last[0].y - g.y) <= 2.5) last.push(g);
    else lines.push([g]);
  }

  const boxes: Box[] = [];
  let nir = 0;
  let address = 0;

  for (const line of lines) {
    line.sort((a, b) => a.x - b.x);
    let s = '';
    const map: { start: number; end: number; g: (typeof glyphs)[number] }[] = [];
    let prevEnd: number | null = null;
    for (const g of line) {
      if (prevEnd != null && g.x - prevEnd > 1) s += ' ';
      const start = s.length;
      s += g.str;
      map.push({ start, end: s.length, g });
      prevEnd = g.x + g.w;
    }

    const push = (from: number, to: number) => {
      // sous-partie de chaque item couvrant [from, to] (interpolation linéaire)
      const parts: { x1: number; x2: number; y1: number; y2: number }[] = [];
      for (const e of map) {
        const a = Math.max(e.start, from);
        const b = Math.min(e.end, to);
        if (b <= a || e.end === e.start) continue;
        const span = e.end - e.start;
        // si le match couvre le bord de l'item, prendre le bord réel (pas d'interp.)
        const x1 = a <= e.start + 1 ? e.g.x : e.g.x + (e.g.w * (a - e.start)) / span;
        const x2 = b >= e.end - 1 ? e.g.x + e.g.w : e.g.x + (e.g.w * (b - e.start)) / span;
        parts.push({ x1, x2, y1: e.g.y, y2: e.g.y + e.g.h });
      }
      if (!parts.length) return false;
      const x1 = Math.min(...parts.map((p) => p.x1));
      const x2 = Math.max(...parts.map((p) => p.x2));
      const y1 = Math.min(...parts.map((p) => p.y1));
      const y2 = Math.max(...parts.map((p) => p.y2));
      // marge horizontale généreuse (interpolation approx. sur police
      // proportionnelle), marge verticale minime pour ne pas mordre la ligne voisine
      const hpad = Math.max(4, (x2 - x1) * 0.1);
      boxes.push({ x: x1 - hpad, y: y1 - 0.5, w: x2 - x1 + 2 * hpad, h: y2 - y1 + 1 });
      return true;
    };

    for (const hit of findNir(s)) if (push(hit.index, hit.end)) nir++;
    for (const hit of findAddress(s)) if (push(hit.index, hit.end)) address++;
  }

  return { boxes, nir, address };
}

export async function redactSensitive(file: File): Promise<RedactionResult> {
  const src = new Uint8Array(await file.arrayBuffer());
  const asIs: RedactionResult = { file, nirCount: 0, addressCount: 0 };

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
  try {
    doc = await pdfjs.getDocument({
      data: src.slice(),
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      isEvalSupported: false,
    }).promise;
  } catch {
    return asIs;
  }

  try {
    const boxesByPage = new Map<number, Box[]>();
    let nirCount = 0;
    let addressCount = 0;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const { boxes, nir, address } = sensitiveBoxes(tc.items as TextItem[]);
      if (boxes.length) boxesByPage.set(p, boxes);
      nirCount += nir;
      addressCount += address;
    }
    if (nirCount + addressCount === 0) {
      doc.destroy();
      return asIs;
    }

    const out = await PDFDocument.create();
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('canvas 2d indisponible');

      await page.render({ canvasContext: ctx, viewport }).promise;

      ctx.fillStyle = '#111111';
      for (const b of boxesByPage.get(p) ?? []) {
        const [ax, ay] = viewport.convertToViewportPoint(b.x, b.y);
        const [bx, by] = viewport.convertToViewportPoint(b.x + b.w, b.y + b.h);
        ctx.fillRect(
          Math.min(ax, bx) - 2,
          Math.min(ay, by) - 1,
          Math.abs(bx - ax) + 4,
          Math.abs(by - ay) + 2,
        );
      }

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob null'))), 'image/jpeg', JPEG_QUALITY),
      );
      const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
      const size = page.getViewport({ scale: 1 });
      const pageOut = out.addPage([size.width, size.height]);
      pageOut.drawImage(img, { x: 0, y: 0, width: size.width, height: size.height });
    }
    doc.destroy();

    const bytes = await out.save();
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    const name = file.name.replace(/\.pdf$/i, '') + '-anonymise.pdf';
    return {
      file: new File([ab], name, { type: 'application/pdf' }),
      nirCount,
      addressCount,
    };
  } catch {
    doc.destroy();
    return asIs;
  }
}
