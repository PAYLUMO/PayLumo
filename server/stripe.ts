/**
 * Intégration Stripe — paiement à l'unité (0,99 €) sans compte.
 *
 * Le paiement est lié au bulletin par le SHA-256 du PDF (`session.metadata.pdfHash`)
 * : une session payée ne débloque QUE ce PDF, et peut resservir pour le même
 * fichier (réessai idempotent).
 */

import Stripe from 'stripe';
import { createHash } from 'node:crypto';

export const PRICE_CENTS = Number(process.env.PAYLUMO_PRICE_CENTS) || 99;

let client: Stripe | null = null;
function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY manquant');
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export interface PaidCheck {
  ok: boolean;
  /** motif si `ok` est faux */
  reason?: 'not_paid' | 'wrong_amount' | 'hash_mismatch' | 'refunded' | 'not_found';
  paymentIntentId?: string;
  alreadyRefunded?: boolean;
}

export async function createCheckout(pdfHash: string, origin: string): Promise<string> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: PRICE_CENTS,
          product_data: {
            name: 'Analyse de bulletin de paie — PayLumo',
            description: 'Vérification des taux 2026, anomalies, décomposition brut → net.',
          },
        },
      },
    ],
    metadata: { pdfHash },
    payment_intent_data: { metadata: { pdfHash } },
    success_url: `${origin}/analyser?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/analyser?canceled=1`,
  });
  if (!session.url) throw new Error('Stripe : URL de session absente');
  return session.url;
}

export async function verifyPaid(sessionId: string, pdfBytes: Uint8Array): Promise<PaidCheck> {
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'payment_intent.latest_charge'],
    });
  } catch {
    return { ok: false, reason: 'not_found' };
  }

  if (session.payment_status !== 'paid') return { ok: false, reason: 'not_paid' };
  if (session.amount_total !== PRICE_CENTS || session.currency !== 'eur') {
    return { ok: false, reason: 'wrong_amount' };
  }
  if (session.metadata?.pdfHash !== sha256Hex(pdfBytes)) {
    return { ok: false, reason: 'hash_mismatch' };
  }

  const pi = session.payment_intent as Stripe.PaymentIntent | null;
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : pi?.id;
  const charge = pi?.latest_charge as Stripe.Charge | null | undefined;
  const refunded = Boolean(charge?.refunded) || (charge?.amount_refunded ?? 0) > 0;
  if (refunded) return { ok: false, reason: 'refunded', paymentIntentId, alreadyRefunded: true };

  return { ok: true, paymentIntentId };
}

export async function refund(paymentIntentId: string): Promise<void> {
  try {
    await stripe().refunds.create({ payment_intent: paymentIntentId });
  } catch (err) {
    // déjà remboursé / non remboursable → on ignore (idempotence)
    const msg = err instanceof Error ? err.message : String(err);
    if (!/already.*refunded|charge_already_refunded/i.test(msg)) {
      console.error('[stripe] échec du remboursement:', msg);
    }
  }
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
