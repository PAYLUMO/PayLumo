/**
 * Côté client du paiement : hash du PDF, stockage temporaire, création de la
 * session Stripe Checkout et redirection.
 */

const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? '';
const PENDING_KEY = 'paylumo.pendingAnalysis';

export interface PendingAnalysis {
  pdfBase64: string;
  fileName: string;
  pdfHash: string;
  createdAt: number;
}

export function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function readPending(): PendingAnalysis | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingAnalysis;
    // expire après 1 h
    if (Date.now() - p.createdAt > 3_600_000) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export class CheckoutError extends Error {}

/**
 * Prépare l'analyse : calcule le hash, stocke le PDF en session, crée la
 * session Stripe et renvoie l'URL de redirection.
 */
export async function startCheckout(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdfHash = await sha256Hex(buf);
  const pending: PendingAnalysis = {
    pdfBase64: toBase64(buf),
    fileName: file.name,
    pdfHash,
    createdAt: Date.now(),
  };
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    throw new CheckoutError('Stockage de session indisponible — activez-le pour continuer.');
  }

  let res: Response;
  try {
    res = await fetch(`${API}/api/checkout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pdfHash }),
    });
  } catch {
    clearPending();
    throw new CheckoutError('Serveur de paiement injoignable.');
  }
  if (res.status === 503) {
    clearPending();
    throw new CheckoutError('Le paiement est momentanément indisponible.');
  }
  if (!res.ok) {
    clearPending();
    throw new CheckoutError(`Impossible de démarrer le paiement (${res.status}).`);
  }

  const { url } = (await res.json()) as { url?: string };
  if (!url) {
    clearPending();
    throw new CheckoutError('Réponse de paiement invalide.');
  }
  return url;
}
