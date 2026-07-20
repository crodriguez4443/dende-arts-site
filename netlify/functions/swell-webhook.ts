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
 *
 * Uses the Functions 2.0 signature (default export taking a Request):
 * the runtime auto-injects the full Netlify Blobs context, including the
 * uncachedEdgeURL that idempotency.ts's strong-consistency reads need.
 * Legacy Lambda handlers only get url+token via event.blobs, so
 * connectLambda() can never support strong consistency there.
 */
import { processOrder } from "../../src/lib/shipping/order-processor.js";
import { sendErrorEmail } from "../../src/lib/shipping/email.js";
import type { SwellOrder } from "../../src/lib/shipping/types.js";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const expectedSecret = process.env.SWELL_WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error("SWELL_WEBHOOK_SECRET not set");
    return new Response("Server misconfigured", { status: 500 });
  }
  const providedSecret = new URL(req.url).searchParams.get("secret");
  if (providedSecret !== expectedSecret) {
    console.warn("Invalid Swell secret");
    return new Response("Invalid secret", { status: 401 });
  }

  let payload: { data?: SwellOrder; type?: string; model?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Swell wraps the resource in { type, model, data } on webhooks
  const order = payload.data;
  if (!order?.id) {
    return new Response("No order in payload", { status: 400 });
  }

  try {
    const result = await processOrder(order);
    console.log(
      `Order ${order.id} → ${result.status}${result.reason ? `: ${result.reason}` : ""}`
    );
    return Response.json({ ok: true, result });
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
    return Response.json({ ok: false, error: String(err) });
  }
};
