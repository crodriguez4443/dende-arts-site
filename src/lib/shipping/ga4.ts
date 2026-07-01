/**
 * Server-side GA4 `purchase` tracking via the Measurement Protocol.
 *
 * Why server-side: checkout is Swell-hosted, so the browser never runs a
 * submitOrder() we could hook — there's no reliable client-side moment to fire
 * `purchase`. Firing it from the order.paid webhook instead is more reliable
 * (survives ad blockers, closed tabs, the hosted-checkout redirect) and the
 * caller's idempotency guard means it fires once per order. GA4 also de-dupes
 * `purchase` by transaction_id, so a rare double-send won't double-count.
 *
 * Setup: create a Measurement Protocol API secret in GA4
 *   Admin → Data Streams → (web stream) → Measurement Protocol API secrets
 * then set GA4_API_SECRET in the Netlify env. The Measurement ID below is the
 * storefront's (same one in Layout.astro).
 */
import type { SwellOrder } from "./types.js";

const MEASUREMENT_ID = "G-V7Q1NGPMNT";
const ENDPOINT = "https://www.google-analytics.com/mp/collect";

/**
 * GA4 requires a client_id. We have no _ga cookie server-side (hosted
 * checkout), so we derive a stable GA-style id from the order id. Revenue and
 * item data populate the reports correctly; the only tradeoff is the purchase
 * isn't stitched to the visitor's earlier browsing session.
 */
function clientIdFor(order: SwellOrder): string {
  let hash = 0;
  for (const ch of order.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `${hash}.${1_000_000_000 + (hash % 1_000_000_000)}`;
}

export async function sendPurchaseToGa4(order: SwellOrder): Promise<void> {
  const apiSecret = process.env.GA4_API_SECRET;
  if (!apiSecret) {
    console.warn("GA4_API_SECRET not set — skipping GA4 purchase event");
    return;
  }

  const items = order.items.map((item, index) => ({
    item_id:
      item.variant?.sku ?? item.product?.sku ?? item.sku ?? item.product_id,
    item_name: item.product?.name ?? undefined,
    item_variant: item.variant?.name ?? undefined,
    price: item.price,
    quantity: item.quantity,
    index,
  }));

  const body = {
    client_id: clientIdFor(order),
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: order.number ?? order.id,
          currency: order.currency ?? "USD",
          value: order.grand_total ?? order.sub_total,
          tax: order.tax_total,
          shipping: order.shipping_total,
          items,
          // GA4 sometimes drops MP events without an engagement signal.
          engagement_time_msec: 1,
        },
      },
    ],
  };

  const url = `${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${encodeURIComponent(apiSecret)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GA4 MP returned ${res.status}: ${await res.text()}`);
  }
}
