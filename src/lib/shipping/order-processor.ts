/**
 * Main order processing logic.
 *
 * Flow:
 *   1. Validate (US-only, known SKUs)
 *   2. Compute item count and total weight
 *   3. Pick parcel tier from count
 *   4. If count <= autoBuyMaxItems → buy label, email PDF, push fulfillment
 *      Else → push to Shippo /orders, email review notice
 */
import { POLICY, SKU_CATALOG, pickParcelTier } from "./config.js";
import type { SwellOrder, ProcessResult } from "./types.js";
import { buyInstalabel, pushOrderForReview } from "./shippo.js";
import { pushFulfillment } from "./swell.js";
import { sendErrorEmail, sendLabelEmail, sendReviewEmail } from "./email.js";
import { lookup, save } from "./idempotency.js";

export async function processOrder(
  order: SwellOrder
): Promise<ProcessResult> {
  // ─── Idempotency ──────────────────────────────────────────────────────
  const existing = await lookup(order.id);
  if (existing) {
    console.log(
      `Order ${order.id} already processed at ${existing.processedAt}`
    );
    return { ...existing.result, status: "duplicate" };
  }

  // ─── Country gate ─────────────────────────────────────────────────────
  const country = order.shipping?.country?.toUpperCase();
  if (!country || !POLICY.allowedCountries.includes(country as "US")) {
    const result: ProcessResult = {
      status: "rejected",
      reason: `Shipping country ${country} not allowed`,
    };
    await save(order.id, result);
    await sendErrorEmail({
      order,
      context: "Country not allowed",
      error: result.reason,
    });
    return result;
  }

  // ─── SKU resolution ───────────────────────────────────────────────────
  let totalCount = 0;
  let totalWeightOz = 0;
  const unknownSkus: string[] = [];

  for (const item of order.items) {
    const sku = item.variant?.sku ?? item.product?.sku ?? item.sku;
    if (!sku) {
      unknownSkus.push(`(no SKU on item ${item.id})`);
      continue;
    }
    const entry = SKU_CATALOG[sku];
    if (!entry) {
      unknownSkus.push(sku);
      continue;
    }
    totalCount += item.quantity;
    totalWeightOz += entry.weightOz * item.quantity;
  }

  if (unknownSkus.length > 0) {
    const result: ProcessResult = {
      status: "error",
      reason: `Unknown SKUs: ${unknownSkus.join(", ")}`,
    };
    await save(order.id, result);
    await sendErrorEmail({
      order,
      context: "Unknown SKU in order — extend SKU_CATALOG in src/config.ts",
      error: result.reason,
    });
    return result;
  }

  if (totalCount === 0) {
    const result: ProcessResult = {
      status: "error",
      reason: "Order has no shippable items",
    };
    await save(order.id, result);
    return result;
  }

  // ─── Parcel + branch ──────────────────────────────────────────────────
  const tier = pickParcelTier(totalCount);

  try {
    if (totalCount <= POLICY.autoBuyMaxItems) {
      return await autoBuy(order, tier, totalWeightOz);
    } else {
      return await queueForReview(order, tier, totalWeightOz, totalCount);
    }
  } catch (err) {
    const result: ProcessResult = {
      status: "error",
      reason: err instanceof Error ? err.message : String(err),
    };
    await save(order.id, result);
    await sendErrorEmail({
      order,
      context: `Processing failed (count=${totalCount}, weight=${totalWeightOz}oz, tier=${tier.id})`,
      error: err,
    });
    return result;
  }
}

async function autoBuy(
  order: SwellOrder,
  tier: ReturnType<typeof pickParcelTier>,
  totalWeightOz: number
): Promise<ProcessResult> {
  const txn = await buyInstalabel({ order, tier, totalWeightOz });

  if (txn.status !== "SUCCESS" || !txn.label_url || !txn.tracking_number) {
    const messages = (txn.messages ?? [])
      .map((m) => `${m.source}/${m.code}: ${m.text}`)
      .join("; ");
    throw new Error(`Shippo transaction failed: ${messages || txn.status}`);
  }

  // Email the PDF (we do this BEFORE pushing fulfillment so if email
  // fails, Chris still finds the label in his Shippo dashboard)
  await sendLabelEmail({
    order,
    labelUrl: txn.label_url,
    trackingNumber: txn.tracking_number,
    tierLabel: tier.label,
    rate: txn.rate ? `${txn.rate.amount} ${txn.rate.currency}` : undefined,
  });

  // Push tracking back to Swell so the customer gets the shipped email
  await pushFulfillment({
    swellOrderId: order.id,
    trackingNumber: txn.tracking_number,
    carrier: "USPS",
    service: tier.label,
  });

  const result: ProcessResult = {
    status: "auto_bought",
    shippoTransactionId: txn.object_id,
    trackingNumber: txn.tracking_number,
    labelUrl: txn.label_url,
  };
  await save(order.id, result);
  return result;
}

async function queueForReview(
  order: SwellOrder,
  tier: ReturnType<typeof pickParcelTier>,
  totalWeightOz: number,
  itemCount: number
): Promise<ProcessResult> {
  const shippoOrder = await pushOrderForReview({
    order,
    tier,
    totalWeightOz,
  });

  await sendReviewEmail({
    order,
    shippoOrderId: shippoOrder.object_id,
    tierLabel: tier.label,
    itemCount,
  });

  const result: ProcessResult = {
    status: "queued_for_review",
    shippoOrderId: shippoOrder.object_id,
  };
  await save(order.id, result);
  return result;
}
