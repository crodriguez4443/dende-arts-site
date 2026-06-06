/**
 * POST /webhooks/shippo
 *
 * Fired by Shippo when a transaction is created. This catches the case
 * where Chris manually buys a label from the Shippo dashboard for an order
 * that was queued for review — we use the metadata field to map it back to
 * the Swell order and push the tracking number to Swell.
 *
 * Configure in Shippo dashboard > API > Webhooks:
 *   URL:    https://<your-site>.netlify.app/webhooks/shippo
 *   Events: transaction_created
 *
 * Shippo doesn't sign webhook bodies, so we use an obscure URL token to
 * partially mitigate spoofing (and the worst case is we just attempt a
 * Swell fulfillment for a bogus order ID, which will fail safely).
 */
import type { Handler } from "@netlify/functions";
import { getTransaction } from "../../src/lib/shipping/shippo.js";
import { pushFulfillment } from "../../src/lib/shipping/swell.js";
import { sendErrorEmail } from "../../src/lib/shipping/email.js";

interface ShippoTransactionWebhook {
  event: string;
  data: {
    object_id: string;
    status: string;
    tracking_number?: string;
    metadata?: string;
    order?: string; // Shippo order ID
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Optional shared-secret check via header (set up in Shippo webhook config
  // by appending ?secret=... to the URL, then parsing here)
  const expectedSecret = process.env.SHIPPO_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = event.queryStringParameters?.secret;
    if (provided !== expectedSecret) {
      return { statusCode: 401, body: "Invalid secret" };
    }
  }

  let payload: ShippoTransactionWebhook;
  try {
    payload = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  if (payload.event !== "transaction_created") {
    return { statusCode: 200, body: "Ignored event" };
  }

  const data = payload.data;
  if (data.status !== "SUCCESS" || !data.tracking_number) {
    return { statusCode: 200, body: "Transaction not in SUCCESS state" };
  }

  // Pull the full transaction to be sure of the metadata
  let txn;
  try {
    txn = await getTransaction(data.object_id);
  } catch (err) {
    await sendErrorEmail({
      context: `Fetching Shippo transaction ${data.object_id}`,
      error: err,
    });
    return { statusCode: 200, body: "Error fetching transaction" };
  }

  // Metadata format: "swell_order_<id>"
  const metadata = txn.metadata ?? data.metadata ?? "";
  const match = metadata.match(/^swell_order_(.+)$/);
  if (!match) {
    // Probably a label bought directly in Shippo without a swell link
    console.log(`Skipping txn ${data.object_id} — no swell_order_ metadata`);
    return { statusCode: 200, body: "No Swell linkage" };
  }
  const swellOrderId = match[1];

  try {
    await pushFulfillment({
      swellOrderId,
      trackingNumber: data.tracking_number!,
      carrier: "USPS",
    });
    console.log(
      `Pushed tracking ${data.tracking_number} → Swell order ${swellOrderId}`
    );
    return { statusCode: 200, body: "OK" };
  } catch (err) {
    await sendErrorEmail({
      context: `Pushing fulfillment to Swell order ${swellOrderId}`,
      error: err,
    });
    return { statusCode: 200, body: "Error pushing fulfillment" };
  }
};
