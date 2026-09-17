/**
 * Envoie le bulletin au serveur pour lecture + analyse. Le PDF n'est pas
 * conservé côté serveur ; le résultat est mis en cache dans ce navigateur
 * (voir l'appelant).
 */

import type { StoredAnalysis } from '@shared/analysis/types';

const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export type AnalyzeOutcome =
  | { kind: 'ok'; analysis: StoredAnalysis }
  | { kind: 'retry'; message: string }
  | { kind: 'unreadable'; message: string }
  | { kind: 'error'; message: string };

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function requestAnalysis(
  file: File,
  conventionLabel?: string | null,
): Promise<AnalyzeOutcome> {
  let pdfBase64: string;
  try {
    pdfBase64 = toBase64(await file.arrayBuffer());
  } catch {
    return { kind: 'error', message: 'Impossible de lire le fichier. Réessayez.' };
  }

  let res: Response;
  try {
    res = await fetch(`${API}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pdf: pdfBase64,
        fileName: file.name,
        convention: conventionLabel || null,
      }),
    });
  } catch {
    return { kind: 'retry', message: 'Serveur injoignable. Réessayez dans un instant.' };
  }

  if (res.ok) {
    return { kind: 'ok', analysis: (await res.json()) as StoredAnalysis };
  }

  let error: string | undefined;
  try {
    ({ error } = (await res.json()) as { error?: string });
  } catch {
    /* pas de corps JSON */
  }

  switch (error) {
    case 'retry':
      return { kind: 'retry', message: 'La lecture a échoué temporairement. Réessayez.' };
    case 'unreadable':
      return {
        kind: 'unreadable',
        message:
          'Ce bulletin n’a pas pu être lu (scan, photo ou mise en page non reconnue). Essayez le PDF exporté depuis votre espace RH.',
      };
    case 'rate_limited':
      return { kind: 'retry', message: 'Trop de demandes. Réessayez dans quelques minutes.' };
    case 'not_pdf':
    case 'too_large':
    case 'empty':
    case 'missing_pdf':
      return { kind: 'error', message: 'Fichier PDF non valide.' };
    default:
      return { kind: 'error', message: `Erreur serveur (${res.status}).` };
  }
}
