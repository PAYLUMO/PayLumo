/**
 * Récupère l'analyse auprès du serveur après paiement vérifié.
 */

import type { StoredAnalysis } from '@shared/analysis/types';
import type { PendingAnalysis } from './checkout';

const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';

export type AnalyzeOutcome =
  | { kind: 'ok'; analysis: StoredAnalysis }
  | { kind: 'retry'; message: string }
  | { kind: 'refunded'; message: string }
  | { kind: 'unpaid'; message: string }
  | { kind: 'error'; message: string };

export async function fetchPaidAnalysis(
  sessionId: string,
  pending: PendingAnalysis,
): Promise<AnalyzeOutcome> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        pdf: pending.pdfBase64,
        fileName: pending.fileName,
      }),
    });
  } catch {
    return { kind: 'retry', message: 'Serveur injoignable. Réessayez dans un instant.' };
  }

  if (res.ok) {
    const analysis = (await res.json()) as StoredAnalysis;
    return { kind: 'ok', analysis };
  }

  let body: { error?: string; refunded?: boolean } = {};
  try {
    body = await res.json();
  } catch {
    /* pas de corps JSON */
  }

  switch (body.error) {
    case 'retry':
      return { kind: 'retry', message: 'La lecture a échoué temporairement. Réessayez.' };
    case 'unreadable':
      return {
        kind: 'refunded',
        message: body.refunded
          ? 'Ce bulletin n’a pas pu être lu. Vous avez été remboursé.'
          : 'Ce bulletin n’a pas pu être lu.',
      };
    case 'hash_mismatch':
      return {
        kind: 'error',
        message: 'Le paiement ne correspond pas à ce fichier. Reprenez depuis l’import.',
      };
    case 'refunded':
      return { kind: 'error', message: 'Ce paiement a déjà été remboursé.' };
    case 'not_paid':
    case 'not_found':
    case 'wrong_amount':
      return { kind: 'unpaid', message: 'Paiement non confirmé.' };
    case 'payments_unavailable':
      return { kind: 'error', message: 'Service de paiement indisponible. Reprenez l’import.' };
    case 'rate_limited':
      return { kind: 'retry', message: 'Trop de demandes. Réessayez dans quelques minutes.' };
    default:
      return { kind: 'error', message: `Erreur serveur (${res.status}).` };
  }
}
