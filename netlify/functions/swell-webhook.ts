/**
 * POST /webhooks/swell
 *
 * Receives Swell order webhooks and kicks off label creation.
 *
 * Swell does not sign webhook bodies — per Swell's docs the recommended
 * authentication is a shared secret embedded in the webhook URL, which
 * we validate here (same pattern as the Shippo handler).
 *
 * Configure in Swell admin > Developer > Webhooks:
 *   URL:    https://<your-site>/webhooks/swell?secret=<SWELL_WEBHOOK_SECRET>
 *   Events: order.paid  (or whichever post-payment event fires after the
 *           charge captures)
 */
import type { Handler } from "@netlify/functions";
import { processOrder } from "../../src/lib/shipping/order-processor.js";
import { sendErrorEmail } from "../../src/lib/shipping/email.js";
import type { SwellOrder } from "../../src/lib/shipping/types.js";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const expectedSecret = process.env.SWELL_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("SWELL_WEBHOOK_SECRET not set");
    return { statusCode: 500, body: "Server misconfigured" };
  }
  const providedSecret = event.queryStringParameters?.secret;
  if (providedSecret !== expectedSecret) {
    console.warn("Invalid Swell secret");
    return { statusCode: 401, body: "Invalid secret" };
  }

  let payload: { data?: SwellOrder; type?: string; model?: string };
  try {
    payload = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // Swell wraps the resource in { type, model, data } on webhooks
  const order = payload.data;
  if (!order?.id) {
    return { statusCode: 400, body: "No order in payload" };
  }

  try {
    const result = await processOrder(order);
    console.log(
      `Order ${order.id} → ${result.status}${result.reason ? `: ${result.reason}` : ""}`
    );
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, result }),
    };
  } catch (err) {
    console.error("Unhandled error processing order", err);
    // Try to alert; never throw out of the handler since Swell will retry
    try {
      await sendErrorEmail({
        order,
        context: "Unhandled error in swell-webhook handler",
        error: err,
      });
    } catch {
      // swallow
    }
    // Return 200 so Swell doesn't pound us with retries on a deterministic
    // failure. We've already emailed Chris.
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, error: String(err) }),
    };
  }
};
