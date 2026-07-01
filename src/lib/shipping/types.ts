/**
 * Subset of the Swell order webhook payload that we actually use.
 * Full schema: https://developers.swell.is/backend-api/orders/the-order-model
 *
 * Swell sends the full Order object as the webhook body.
 */
export interface SwellOrder {
  id: string;
  number: string;
  status: string;
  shipping: {
    name: string;
    address1: string;
    address2?: string | null;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string | null;
  };
  account?: {
    email?: string;
    name?: string;
  };
  items: Array<{
    id: string;
    product_id: string;
    quantity: number;
    // Per-unit price Swell resolved; used for the GA4 items array.
    price?: number;
    // Swell exposes the SKU on the variant if present, else on the product.
    variant?: { sku?: string; name?: string } | null;
    product?: { sku?: string; name?: string } | null;
    // Convenience: sometimes copied to top-level by Swell
    sku?: string | null;
  }>;
  // Pre-tax total of items. Useful if you later want a $-based auto-buy rule.
  sub_total?: number;
  grand_total?: number;
  // Used by the GA4 purchase event (Measurement Protocol).
  currency?: string;
  tax_total?: number;
  shipping_total?: number;
}

export interface ProcessResult {
  status:
    | "auto_bought"
    | "queued_for_review"
    | "rejected"
    | "error"
    | "duplicate";
  reason?: string;
  shippoTransactionId?: string;
  shippoOrderId?: string;
  trackingNumber?: string;
  labelUrl?: string;
}
