/**
 * Email notifications via Resend.
 *
 * Three flavors:
 *   1. sendLabelEmail — auto-bought label, attaches the PDF
 *   2. sendReviewEmail — order pushed to Shippo dashboard for manual review
 *   3. sendErrorEmail — anything that failed and needs human eyes
 */
import { Resend } from "resend";
import { POLICY } from "./config.js";
import type { SwellOrder } from "./types.js";

function client(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

function from(): string {
  return process.env.EMAIL_FROM ?? "onboarding@resend.dev";
}

function to(): string {
  return process.env.EMAIL_TO ?? POLICY.notificationEmail;
}

async function fetchLabelPdf(labelUrl: string): Promise<Buffer> {
  const res = await fetch(labelUrl);
  if (!res.ok) throw new Error(`Label PDF fetch ${res.status}`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

export async function sendLabelEmail(opts: {
  order: SwellOrder;
  labelUrl: string;
  trackingNumber: string;
  tierLabel: string;
  rate?: string;
}): Promise<void> {
  const pdf = await fetchLabelPdf(opts.labelUrl);
  const subject = `📦 Label ready — Dendê Arts order #${opts.order.number}`;
  const text = [
    `Order #${opts.order.number}`,
    `Ship to: ${opts.order.shipping.name}, ${opts.order.shipping.city}, ${opts.order.shipping.state}`,
    `Service: ${opts.tierLabel}`,
    `Tracking: ${opts.trackingNumber}`,
    opts.rate ? `Cost: ${opts.rate}` : "",
    "",
    "Label attached as PDF. Print on 4x6 thermal or letter paper.",
    "",
    `Tracking link: https://tools.usps.com/go/TrackConfirmAction?tLabels=${opts.trackingNumber}`,
  ]
    .filter(Boolean)
    .join("\n");

  await client().emails.send({
    from: from(),
    to: [to()],
    subject,
    text,
    attachments: [
      {
        filename: `dende-${opts.order.number}-${opts.trackingNumber}.pdf`,
        content: pdf.toString("base64"),
      },
    ],
  });
}

export async function sendReviewEmail(opts: {
  order: SwellOrder;
  shippoOrderId: string;
  tierLabel: string;
  itemCount: number;
}): Promise<void> {
  const subject = `👀 Review needed — Dendê Arts order #${opts.order.number} (${opts.itemCount} items)`;
  const text = [
    `Order #${opts.order.number} has ${opts.itemCount} items, above the auto-buy threshold.`,
    "",
    `Ship to: ${opts.order.shipping.name}, ${opts.order.shipping.city}, ${opts.order.shipping.state}`,
    `Suggested packaging: ${opts.tierLabel}`,
    "",
    `It's been pushed to your Shippo dashboard for review.`,
    `Open it: https://apps.goshippo.com/orders/${opts.shippoOrderId}`,
    "",
    `Once you buy the label there, tracking will auto-sync back to Swell.`,
  ].join("\n");

  await client().emails.send({
    from: from(),
    to: [to()],
    subject,
    text,
  });
}

export async function sendErrorEmail(opts: {
  order?: SwellOrder;
  context: string;
  error: unknown;
}): Promise<void> {
  const orderRef = opts.order
    ? `order #${opts.order.number} (${opts.order.id})`
    : "(no order context)";
  const subject = `⚠️ Shipping bridge error — ${orderRef}`;
  const text = [
    `Context: ${opts.context}`,
    "",
    `Error: ${opts.error instanceof Error ? opts.error.message : String(opts.error)}`,
    "",
    opts.order ? `Order JSON:\n${JSON.stringify(opts.order, null, 2)}` : "",
  ].join("\n");

  await client().emails.send({
    from: from(),
    to: [to()],
    subject,
    text,
  });
}
