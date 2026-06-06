# Shipping Bridge — Integration Notes

> Practical record of how the Swell → Shippo bridge was wired into this
> project, what was changed vs the upstream scaffold, what's been
> verified, and what to do when something breaks.
>
> Upstream README (architecture, shipping rules, SKU catalog):
> [`docs/shipping-integration.md`](./shipping-integration.md).

## What this is

Two Netlify Functions that turn paid Swell orders into USPS shipping
labels via Shippo:

- **`/webhooks/swell`** — Swell calls this when an order is paid. ≤2 items
  → label auto-bought via Shippo + PDF emailed via Resend + tracking
  pushed back to Swell. ≥3 items → pushed to Shippo's Orders dashboard
  for manual review.
- **`/webhooks/shippo`** — Shippo calls this on `transaction_created`
  (i.e. when a manually-bought label is purchased in the dashboard) so
  tracking still syncs back to the matching Swell order via the
  `swell_order_<id>` metadata stamped on the Shippo order.

## File layout

| Path | Purpose |
|---|---|
| `netlify/functions/swell-webhook.ts` | Swell receiver, URL-secret auth |
| `netlify/functions/shippo-webhook.ts` | Shippo receiver, URL-secret auth |
| `netlify/functions/add-review.js` | Pre-existing review submitter (untouched, CJS) |
| `src/lib/shipping/config.ts` | Return address, SKU catalog, parcel tiers, policy |
| `src/lib/shipping/types.ts` | `SwellOrder`, `ProcessResult` types |
| `src/lib/shipping/swell.ts` | Swell **admin API** client (`pushFulfillment`) |
| `src/lib/shipping/shippo.ts` | Shippo REST wrappers (instalabel, order push, get transaction) |
| `src/lib/shipping/order-processor.ts` | Main routing: validate → tier → auto-buy vs queue |
| `src/lib/shipping/email.ts` | Resend label / review / error emails |
| `src/lib/shipping/idempotency.ts` | Netlify Blobs dedupe by Swell order ID |
| `docs/shipping-integration.md` | Upstream README (architecture, SKU table, policy) |
| `.env.example` | Template of the 9 env vars |

## Webhook URLs (registered live)

| Provider | URL |
|---|---|
| Swell admin → Developer → Webhooks | `https://dendearts.com/webhooks/swell?secret=<SWELL_WEBHOOK_SECRET>` |
| Shippo dashboard → API → Webhooks (Test env) | `https://dendearts.com/webhooks/shippo?secret=<SHIPPO_WEBHOOK_SECRET>` |

Both paths resolve via `[[redirects]]` in `netlify.toml` to
`/.netlify/functions/{swell,shippo}-webhook`.

## Environment variables

Nine vars. Local values live in `.env` (gitignored). Production values
must be set in **Netlify dashboard → Site configuration → Environment
variables** — the local `.env` does not propagate.

| Var | Used for |
|---|---|
| `SHIPPO_API_KEY` | Shippo REST auth. `shippo_test_…` for canary, swap to live when ready. |
| `SHIPPO_USPS_CARRIER_ACCOUNT_ID` | `object_id` of the USPS carrier connection in Shippo |
| `SHIPPO_WEBHOOK_SECRET` | Random string; baked into the Shippo webhook URL as `?secret=…` and validated by `shippo-webhook.ts` |
| `SWELL_WEBHOOK_SECRET` | Random string; baked into the Swell webhook URL as `?secret=…` and validated by `swell-webhook.ts` |
| `SWELL_STORE_ID` | `dendearts`; Basic-auth username for Swell admin API |
| `SWELL_SECRET_KEY` | `sk_…`; Basic-auth password for Swell admin API |
| `RESEND_API_KEY` | Resend auth for operator-facing emails |
| `EMAIL_FROM` | `onboarding@resend.dev` (Resend's shared sender — no domain verification needed; only delivers to the address you signed up with) |
| `EMAIL_TO` | Where label/review/error emails arrive (e.g. `dende.arts@gmail.com`) |

## Key deviation from the upstream scaffold

The scaffold assumed Swell signs webhooks with HMAC-SHA256 in an
`X-Signature` header. Swell's actual docs
([Receiving webhooks](https://developers.swell.is/backend-api/webhooks/receiving-webhooks),
[Apps: Webhooks](https://developers.swell.is/apps/webhooks)) say webhook
bodies are **not signed** — the recommended auth is a shared secret in
the URL, validated on receipt. So the integration:

- **Deleted** `src/lib/shipping/swell-verify.ts` (HMAC verifier — dead).
- **Rewrote** `netlify/functions/swell-webhook.ts` to validate
  `event.queryStringParameters.secret` against `SWELL_WEBHOOK_SECRET`
  (same pattern as `shippo-webhook.ts`).

If this is ever revisited, the upstream scaffold's HMAC code is in this
repo's git history before the integration commit.

## What's been verified

- ✅ Strict TypeScript typecheck passes (`tsc --noEmit --strict
  --moduleResolution bundler`) over all 9 shipping files.
- ✅ `netlify dev` boots; functions detected (`swell-webhook`,
  `shippo-webhook`, `add-review`).
- ✅ `GET /webhooks/swell` → 405.
- ✅ `POST {}` without `?secret=` → 401 "Invalid secret".
- ✅ `POST {}` with correct `?secret=` → 400 "No order in payload"
  (proves the auth gate opens and body parsing proceeds).
- ✅ `POST {}` with wrong `?secret=` → 401.
- ✅ `GET /webhooks/shippo` → 405.

## Things to confirm on the first real Swell delivery

1. **Payload shape.** Swell docs say the webhook `data` field contains
   "the resource ID and event-specific fields." The handler currently
   reads `payload.data.shipping`, `payload.data.items`, etc. directly —
   it assumes `data` is the full expanded order. If `data` arrives as
   `{ id }` only, `processOrder` will fail validation. **Fix**: at the
   top of the handler, call `GET https://api.swell.store/orders/{data.id}`
   with `SWELL_STORE_ID:SWELL_SECRET_KEY` Basic auth (the same auth
   pattern in `src/lib/shipping/swell.ts`) and use that as `order`.
2. **`order.paid` event name.** Confirmed selected in Swell admin. If
   Swell only emits `order.created` or `order.submitted`, the handler
   doesn't care about the type string — it processes whatever `data` is
   — but item counts and addresses need to be present, so the chosen
   event must fire *after* payment.
3. **Resend test-mode restriction.** Resend's unverified-account mode
   only delivers to the email you signed up with. Confirm
   `EMAIL_TO` matches that address.

## Troubleshooting playbook

| Symptom | Likely cause | Where to look |
|---|---|---|
| Swell webhook delivery returns 401 | `?secret=` query param missing or wrong, or `SWELL_WEBHOOK_SECRET` not set in Netlify env | Swell admin → Webhooks → Recent deliveries; Netlify env vars |
| Function returns 200 but no label appears | Look at function logs — likely an error caught by `processOrder` (unknown SKU, bad address) → see the error email in `EMAIL_TO` | Netlify functions log; inbox |
| "Unknown SKUs" error email | Order has a SKU not in `src/lib/shipping/config.ts` → `SKU_CATALOG` | Add the SKU + weight to the catalog |
| Label bought but tracking never reaches Swell | `pushFulfillment` failed — check fulfillment endpoint matches your Swell admin API version (`POST /orders/{id}/shipments`) | Function logs |
| Same Swell order processed twice | Should not happen — `idempotency.ts` keys on order ID via Netlify Blobs (`swell-orders` store) | Netlify Blobs UI |
| Shippo manual-purchase tracking doesn't sync back | `metadata` on the Shippo order must be `swell_order_<id>` — check the order in Shippo dashboard | Shippo order detail |
| Resend "from address not verified" | `EMAIL_FROM` must be `onboarding@resend.dev` until a custom domain is verified in Resend | `.env` / Netlify env |

## Pre-prod safety checklist

- [ ] All 9 env vars set in Netlify dashboard.
- [ ] `SHIPPO_API_KEY` is the **test** key for the first real order.
- [ ] First test order is a 1-item order shipping to a real US address.
- [ ] Verified label email arrives within ~30s; PDF says "TEST".
- [ ] Verified tracking shows on the order in Swell admin.
- [ ] Only after all the above: swap `SHIPPO_API_KEY` to the live key in
      Netlify env.

## Disabling (if needed)

To temporarily stop the bridge without removing code: disable the
webhook in Swell admin (Developer → Webhooks → toggle off). The site
keeps running normally; orders just won't auto-route to Shippo. Switch
back on when ready.
