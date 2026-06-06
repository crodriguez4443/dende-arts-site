/**
 * Thin wrappers around the Shippo REST API.
 *
 * We don't use the official SDK here because the API is simple enough and
 * raw fetch keeps Netlify Function cold starts smaller.
 */
import type { ParcelTier } from "./config.js";
import { RETURN_ADDRESS, POLICY } from "./config.js";
import type { SwellOrder } from "./types.js";

const SHIPPO_BASE = "https://api.goshippo.com";

function authHeaders(): HeadersInit {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) throw new Error("SHIPPO_API_KEY not set");
  return {
    Authorization: `ShippoToken ${key}`,
    "Content-Type": "application/json",
  };
}

function buildAddressTo(order: SwellOrder) {
  const s = order.shipping;
  return {
    name: s.name,
    street1: s.address1,
    street2: s.address2 ?? "",
    city: s.city,
    state: s.state,
    zip: s.zip,
    country: s.country,
    phone: s.phone ?? "",
    email: order.account?.email ?? "",
  };
}

function buildParcel(tier: ParcelTier, totalWeightOz: number) {
  // Shippo accepts weight in lb or oz. We use oz for precision.
  const base = {
    weight: totalWeightOz.toFixed(2),
    mass_unit: "oz" as const,
  };
  if (tier.template) {
    return { ...base, template: tier.template };
  }
  const d = tier.dimensions!;
  return {
    ...base,
    length: String(d.length),
    width: String(d.width),
    height: String(d.height),
    distance_unit: d.distanceUnit,
  };
}

// ─── Instalabel (single-call label purchase) ─────────────────────────────
export interface InstalabelInput {
  order: SwellOrder;
  tier: ParcelTier;
  totalWeightOz: number;
}

export interface InstalabelResult {
  status: "SUCCESS" | "ERROR" | "QUEUED";
  object_id: string;
  tracking_number?: string;
  label_url?: string;
  messages?: Array<{ source: string; code: string; text: string }>;
  rate?: { amount: string; currency: string };
}

export async function buyInstalabel(
  input: InstalabelInput
): Promise<InstalabelResult> {
  const carrierAccount = process.env.SHIPPO_USPS_CARRIER_ACCOUNT_ID;
  if (!carrierAccount) {
    throw new Error("SHIPPO_USPS_CARRIER_ACCOUNT_ID not set");
  }

  const body = {
    shipment: {
      address_from: { ...RETURN_ADDRESS },
      address_to: buildAddressTo(input.order),
      parcels: [buildParcel(input.tier, input.totalWeightOz)],
    },
    carrier_account: carrierAccount,
    servicelevel_token: input.tier.servicelevelToken,
    label_file_type: POLICY.labelFileType,
    async: false,
    metadata: `swell_order_${input.order.id}`,
  };

  const res = await fetch(`${SHIPPO_BASE}/transactions/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shippo /transactions ${res.status}: ${text}`);
  }
  return (await res.json()) as InstalabelResult;
}

// ─── Order push (for manual review queue) ────────────────────────────────
// Larger orders get pushed to Shippo's Orders dashboard. You then click
// "Buy Label" in the Shippo UI. The transaction_created webhook fires and
// our shippo-webhook function pushes tracking back to Swell.

export interface PushOrderInput {
  order: SwellOrder;
  tier: ParcelTier;
  totalWeightOz: number;
}

export async function pushOrderForReview(input: PushOrderInput): Promise<{
  object_id: string;
}> {
  const body = {
    to_address: buildAddressTo(input.order),
    from_address: { ...RETURN_ADDRESS },
    line_items: input.order.items.map((item) => ({
      title:
        item.variant?.name ??
        item.product?.name ??
        `SKU ${item.variant?.sku ?? item.product?.sku ?? item.sku}`,
      quantity: item.quantity,
      sku:
        item.variant?.sku ?? item.product?.sku ?? item.sku ?? undefined,
    })),
    placed_at: new Date().toISOString(),
    order_number: order_number(input.order),
    order_status: "PAID",
    weight: input.totalWeightOz.toFixed(2),
    weight_unit: "oz",
    notes: `${input.tier.label} — auto-routed by Swell bridge`,
    // Stash the Swell order ID so the Shippo webhook can map it back.
    metadata: `swell_order_${input.order.id}`,
  };

  const res = await fetch(`${SHIPPO_BASE}/orders/`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shippo /orders ${res.status}: ${text}`);
  }
  return (await res.json()) as { object_id: string };
}

function order_number(order: SwellOrder): string {
  return order.number ?? order.id;
}

// ─── Fetch a transaction (used by the Shippo webhook handler) ────────────
export async function getTransaction(
  transactionId: string
): Promise<InstalabelResult & { metadata?: string }> {
  const res = await fetch(`${SHIPPO_BASE}/transactions/${transactionId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Shippo GET transaction ${res.status}`);
  }
  return (await res.json()) as InstalabelResult & { metadata?: string };
}
