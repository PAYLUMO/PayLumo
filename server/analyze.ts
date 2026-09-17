/**
 * Analyse serveur d'un bulletin : lecture (Claude, puis repli local) →
 * `analyzePayslip` → `StoredAnalysis`.
 */

import { extractWithClaude, ClaudeRefusalError, ClaudeUnusableError } from './claude.js';
import { getNodePdfjs } from './localPdf.js';
import { extractPdfText } from '../shared/parsing/pdf-core.js';
import { extractPayslip } from '../shared/parsing/extract.js';
import { payslipFromRaw } from '../shared/parsing/fromRaw.js';
import { analyzePayslip } from '../shared/analysis/engine.js';
import type { StoredAnalysis } from '../shared/analysis/types.js';
import type { Payslip } from '../shared/parsing/model.js';
import { MONTH_NAMES } from '../shared/lib/dates.js';

/** Erreur « le bulletin n'est pas exploitable » (scan, mise en page inconnue). */
export class UnreadableError extends Error {}
/** Erreur transitoire (réessai possible). */
export class TransientError extends Error {}

function makeId(): string {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildStored(
  payslip: Payslip,
  reader: 'ai' | 'local',
  fileName: string,
  conventionLabel?: string | null,
): StoredAnalysis {
  const result = analyzePayslip(payslip, { conventionLabel });
  const { month, year } = payslip.period.value;
  const periode = month && year ? `${MONTH_NAMES[month - 1]} ${year}` : 'Période inconnue';
  const employeur = payslip.employer.name ? ` · ${payslip.employer.name}` : '';
  return {
    id: makeId(),
    createdAt: Date.now(),
    fileName,
    label: `${periode}${employeur}`,
    reader,
    payslip,
    result,
  };
}

async function readLocal(pdfBytes: Uint8Array): Promise<Payslip> {
  const pdfjs = await getNodePdfjs();
  const doc = await extractPdfText(pdfjs, pdfBytes);
  return extractPayslip(doc);
}

/**
 * @param pdfBase64 le PDF (base64 sans préfixe data:)
 * @param fileName  pour l'étiquette de l'analyse
 * @param conventionLabel libellé de convention choisi par l'utilisateur, le cas échéant
 */
export async function runAnalysis(
  pdfBase64: string,
  fileName: string,
  conventionLabel?: string | null,
): Promise<StoredAnalysis> {
  const pdfBytes = Buffer.from(pdfBase64, 'base64');

  // 1. Lecture par l'IA
  try {
    const raw = await extractWithClaude(pdfBase64);
    if (!raw.isPayslip) throw new UnreadableError('le document ne semble pas être un bulletin de paie');
    const stored = buildStored(payslipFromRaw(raw), 'ai', fileName, conventionLabel);
    if (!stored.result.summary.canAnalyze) {
      // l'IA a répondu mais l'extraction est trop pauvre pour analyser
      return await tryLocalOrFail(pdfBytes, fileName, conventionLabel);
    }
    return stored;
  } catch (err) {
    if (err instanceof UnreadableError) {
      // l'IA affirme que ce n'est pas un bulletin — tenter quand même le local
      return await tryLocalOrFail(pdfBytes, fileName, conventionLabel);
    }
    if (err instanceof ClaudeRefusalError) {
      return await tryLocalOrFail(pdfBytes, fileName, conventionLabel);
    }
    if (err instanceof ClaudeUnusableError) {
      // panne transitoire probable (5xx, timeout, quota) → essayer le local ;
      // si le local échoue aussi, on renvoie une erreur transitoire (réessai gratuit)
      try {
        return await requireAnalyzable(await readLocal(pdfBytes), fileName, conventionLabel);
      } catch {
        throw new TransientError(err.message);
      }
    }
    throw err;
  }
}

async function tryLocalOrFail(
  pdfBytes: Uint8Array,
  fileName: string,
  conventionLabel?: string | null,
): Promise<StoredAnalysis> {
  try {
    return await requireAnalyzable(await readLocal(pdfBytes), fileName, conventionLabel);
  } catch (e) {
    if (e instanceof UnreadableError) throw e;
    throw new UnreadableError('lecture impossible (PDF non textuel ou mise en page non reconnue)');
  }
}

async function requireAnalyzable(
  payslip: Payslip,
  fileName: string,
  conventionLabel?: string | null,
): Promise<StoredAnalysis> {
  const stored = buildStored(payslip, 'local', fileName, conventionLabel);
  if (!stored.result.summary.canAnalyze) {
    throw new UnreadableError('informations insuffisantes pour analyser ce bulletin');
  }
  return stored;
}
