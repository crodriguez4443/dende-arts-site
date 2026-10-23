/**
 * Server-side Meta `Purchase` via the Conversions API.
 *
 * Same reason as ga4.ts: checkout is Swell-hosted, so the browser Pixel never
 * sees the purchase. Fired from the order webhook, once per order (the
 * idempotency guard in order-processor.ts is the only protection against
 * double-counting; there is no browser Purchase to dedupe against).
 *
 * Setup: Events Manager → Pixel → Settings → Conversions API → Generate access
 * token, then set META_CAPI_TOKEN in the Netlify env. To verify without
 * touching real data, also set META_CAPI_TEST_CODE (Events Manager → Test
 * events) and remove it afterwards.
 */
import { createHash } from "node:crypto";
import type { SwellOrder } from "./types.js";

const PIXEL_ID = "346623565952074";
const ENDPOINT = `https://graph.facebook.com/v26.0/${PIXEL_ID}/events`;

// Meta wants emails trimmed, lowercased, then SHA-256 hex.
const sha256 = (s: string) =>
  createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

export async function sendPurchaseToMeta(order: SwellOrder): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    console.warn("META_CAPI_TOKEN not set — skipping Meta purchase event");
    return;
  }

  const meta = order.metadata;
  const email = order.account?.email;

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.number ?? order.id,
        action_source: "website",
        // Required for website events; the real page is gone by webhook time.
        event_source_url: "https://dendearts.com/",
        user_data: {
          ...(email && { em: [sha256(email)] }),
          ...(meta?.fbp && { fbp: meta.fbp }),
          ...(meta?.fbc && { fbc: meta.fbc }),
          // Required for website events; captured at checkout (cart-utils.js).
          client_user_agent: meta?.user_agent,
        },
        custom_data: {
          currency: order.currency ?? "USD",
          value: order.grand_total ?? order.sub_total,
          content_type: "product",
          contents: order.items.map((item) => ({
            id: item.product_id,
            quantity: item.quantity,
            item_price: item.price,
          })),
        },
      },
    ],
    ...(process.env.META_CAPI_TEST_CODE && {
      test_event_code: process.env.META_CAPI_TEST_CODE,
    }),
  };

  const res = await fetch(`${ENDPOINT}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // Awaited before the label purchase; don't let a stalled Meta call hold it.
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`Meta CAPI returned ${res.status}: ${await res.text()}`);
  }
}
