/**
 * Server-side Partnero sale attribution.
 *
 * Why server-side: checkout is Swell-hosted on another domain, so Partnero's
 * browser script never sees the purchase, and Partnero's Stripe integration
 * can't see it either — it attributes from `checkout.session.completed`, but
 * Swell charges through PaymentIntents and never sets client_reference_id.
 * The order.paid webhook is the only place that knows both the buyer and the
 * affiliate, so the transaction is posted from here.
 *
 * The partner key rides along as cart metadata (public/js/cart-utils.js reads
 * the partnero_partner cookie Partnero's script sets on the referral click).
 *
 * Setup: Partnero → Settings → API, create a key, set PARTNERO_API_KEY in the
 * Netlify env.
 */
import type { SwellOrder } from "./types.js";

const ENDPOINT = "https://api.partnero.com/v1/transactions";

export async function sendSaleToPartnero(order: SwellOrder): Promise<void> {
  const apiKey = process.env.PARTNERO_API_KEY;
  if (!apiKey) {
    console.warn("PARTNERO_API_KEY not set — skipping Partnero transaction");
    return;
  }

  const partnerKey = order.metadata?.partnero_partner;
  if (!partnerKey) return; // Not an affiliate order — nothing to attribute.

  const email = order.account?.email;
  if (!email) {
    console.warn(`Order ${order.id} has no email — skipping Partnero`);
    return;
  }

  // create_customer lets one call cover both the customer and the sale.
  // Partnero ignores an unknown partner key rather than erroring, so a stale
  // cookie degrades to an unattributed sale instead of a failed webhook.
  const body = {
    key: order.number ?? order.id,
    amount: order.grand_total ?? order.sub_total,
    amount_units: order.currency ?? "USD",
    action: "sale",
    options: { create_customer: true },
    customer: {
      key: email,
      email,
      name: order.account?.name ?? order.shipping?.name,
      partner: { key: partnerKey },
    },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Partnero returned ${res.status}: ${await res.text()}`);
  }
}
