/**
 * Swell admin API client — used to push the tracking number back to the
 * order so Swell sends the customer its native "shipped" email.
 *
 * Swell auth uses Basic with the store ID as user and the secret key as
 * password.
 */

import type { SwellOrder } from "./types.js";

const SWELL_BASE = "https://api.swell.store";

function authHeader(): string {
  const id = process.env.SWELL_STORE_ID;
  const key = process.env.SWELL_SECRET_KEY;
  if (!id || !key) throw new Error("SWELL_STORE_ID / SWELL_SECRET_KEY not set");
  const token = Buffer.from(`${id}:${key}`).toString("base64");
  return `Basic ${token}`;
}

/**
 * Fetch the full order from Swell. The webhook body is only a thin stub
 * ({ id, payment_id }), so we re-read the order here to get the shipping
 * address, line items, and SKUs the processor needs. Variant/product are
 * expanded so item.variant.sku / item.product.sku resolve.
 *
 * Endpoint: GET /orders/{id}
 */
export async function getOrder(id: string): Promise<SwellOrder> {
  const res = await fetch(
    `${SWELL_BASE}/orders/${id}?expand=items.variant,items.product`,
    { headers: { Authorization: authHeader() } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Swell getOrder ${res.status}: ${text}`);
  }
  return (await res.json()) as SwellOrder;
}

/**
 * Create a shipment record on the order with the carrier + tracking number.
 * This is what triggers Swell's default "Your order has shipped" email.
 *
 * Endpoint: POST /orders/{id}/shipments
 */
export async function pushFulfillment(opts: {
  swellOrderId: string;
  trackingNumber: string;
  carrier?: string; // e.g. "USPS"
  service?: string; // e.g. "USPS Ground Advantage"
}): Promise<void> {
  const body = {
    carrier: opts.carrier ?? "USPS",
    service: opts.service,
    tracking_code: opts.trackingNumber,
  };

  const res = await fetch(
    `${SWELL_BASE}/orders/${opts.swellOrderId}/shipments`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Swell pushFulfillment ${res.status}: ${text}`);
  }
}
