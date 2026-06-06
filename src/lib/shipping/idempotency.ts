/**
 * Idempotency tracking for Swell webhook deliveries.
 *
 * Swell retries webhooks on non-2xx responses. We key on the Swell order ID
 * and stash a small record of what we did so retries become no-ops.
 *
 * Uses Netlify Blobs (the built-in KV that comes free with Netlify
 * Functions; no extra setup beyond enabling Blobs on the site).
 */
import { getStore } from "@netlify/blobs";
import type { ProcessResult } from "./types.js";

const STORE_NAME = "swell-orders";

type Record = {
  orderId: string;
  processedAt: string;
  result: ProcessResult;
};

function store() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function lookup(orderId: string): Promise<Record | null> {
  const raw = await store().get(orderId, { type: "json" });
  return (raw as Record) ?? null;
}

export async function save(
  orderId: string,
  result: ProcessResult
): Promise<void> {
  const record: Record = {
    orderId,
    processedAt: new Date().toISOString(),
    result,
  };
  await store().setJSON(orderId, record);
}
