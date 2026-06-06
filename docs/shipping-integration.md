# Swell → Shippo Bridge (Dendê Arts)

A Netlify Functions service that turns Swell.is order webhooks into Shippo
shipping labels. Small orders (≤2 abadás) get a label auto-purchased and
emailed to you as a PDF; larger orders get pushed to your Shippo dashboard
for manual review.

## Architecture

```
                      ┌───────────────────────────┐
Swell order placed ─→ │ /.netlify/functions/      │
                      │   swell-webhook           │
                      └────────────┬──────────────┘
                                   │
                       count ≤ 2 ──┼── count ≥ 3
                                   │
                ┌──────────────────┴───────────────────┐
                ▼                                      ▼
       Shippo /transactions                Shippo /orders
       (Instalabel buy)                    (dashboard queue)
                │                                      │
                ▼                                      ▼
      Email PDF to dende.arts                You click Buy Label
      + push fulfillment to Swell                      │
                                                       ▼
                                             Shippo fires
                                             transaction_created webhook
                                                       │
                                                       ▼
                                       /.netlify/functions/
                                         shippo-webhook
                                                       │
                                                       ▼
                                          Push fulfillment to Swell
```

## Shipping rules

| Items | Parcel                                    | Service               | Auto-buy? |
| ----- | ----------------------------------------- | --------------------- | --------- |
| 1–2   | Polybag 11×9.5×3                          | USPS Ground Advantage | ✅        |
| 3     | Polybag 11×9.5×3                          | USPS Ground Advantage | ❌ queue  |
| 4–6   | USPS Priority Mail Medium Flat Rate Box 2 | USPS Priority Mail    | ❌ queue  |
| 7+    | USPS Priority Mail Large Flat Rate Box    | USPS Priority Mail    | ❌ queue  |

International orders are rejected with an error email.

## SKU catalog

Edit `src/config.ts` → `SKU_CATALOG` to add new SKUs.

| SKU   | Size | Weight |
| ----- | ---- | ------ |
| 1102  | XS   | 12 oz  |
| 11105 | S    | 12 oz  |
| 1104  | M    | 12 oz  |
| 1103  | L    | 12 oz  |
| 1101  | XL   | 14 oz  |

## Setup

### 1. Accounts you need

1. **Netlify** account (the project deploys here)
2. **Shippo** account → connect USPS under Settings > Carriers
3. **Resend** account → verify a sending domain (or use `onboarding@resend.dev`
   in test mode)

### 2. Local development

```bash
git clone <this repo>
cd swell-shippo-bridge
npm install
cp .env.example .env
# fill in .env with real values
netlify dev
```

`netlify dev` runs functions locally at `http://localhost:8888/webhooks/swell`.
Use `ngrok http 8888` to expose them publicly so Swell can hit them.

### 3. Deploy

```bash
netlify init   # link to a Netlify site
netlify deploy --prod
```

Then in the Netlify dashboard → Site configuration → Environment variables,
set all the values from your `.env`.

### 4. Wire up Swell

1. Swell admin → Developer → Webhooks → New webhook
2. URL: `https://<your-site>.netlify.app/webhooks/swell`
3. Event: `order.paid` (fires after payment captures)
4. Secret: same value as `SWELL_WEBHOOK_SECRET` in Netlify env

### 5. Wire up Shippo (for the manual review path)

1. Shippo dashboard → API → Webhooks → Add Webhook
2. URL: `https://<your-site>.netlify.app/webhooks/shippo?secret=<SHIPPO_WEBHOOK_SECRET>`
3. Event: `transaction_created`

### 6. First-run testing

1. Use Shippo's **test API key** first (starts with `shippo_test_`)
2. Place a 1-item test order in Swell with a real US shipping address
3. Check your email — the label PDF should arrive within ~30s
4. The label will say "TEST" because of the test key; that's expected
5. Verify the order in Swell now shows the tracking number on the customer side
6. When happy, swap to the live Shippo key

## Environment variables

See `.env.example`. All of these need to be set in Netlify before going live:

| Variable                          | Purpose                                                                |
| --------------------------------- | ---------------------------------------------------------------------- |
| `SHIPPO_API_KEY`                  | Test or live API key from Shippo                                       |
| `SHIPPO_USPS_CARRIER_ACCOUNT_ID`  | The `object_id` of your USPS carrier connection inside Shippo          |
| `SHIPPO_WEBHOOK_SECRET`           | Random string you append to the Shippo webhook URL as `?secret=...`    |
| `SWELL_WEBHOOK_SECRET`            | Set when creating the Swell webhook, used for HMAC verification        |
| `SWELL_STORE_ID`                  | Your Swell store ID (used as the Basic auth username)                  |
| `SWELL_SECRET_KEY`                | Swell admin API secret key (used as the Basic auth password)           |
| `RESEND_API_KEY`                  | Resend API key                                                         |
| `EMAIL_FROM`                      | Verified sender (e.g. `labels@dendearts.com`)                          |
| `EMAIL_TO`                        | Where labels and alerts go (`dende.arts@gmail.com`)                    |

## What happens when something fails

Anything unexpected (unknown SKU, bad address, Shippo API error, etc.)
triggers a `sendErrorEmail` to `EMAIL_TO`. The handler still returns 200 to
Swell so it doesn't keep retrying — the failure is logged and you can deal
with it manually.

## Known things to verify before going live

1. **Swell signature header name.** The verifier expects `X-Signature`. If
   your Swell webhook config sends a different header, update
   `SWELL_SIGNATURE_HEADER` in `src/lib/swell-verify.ts`.
2. **Swell fulfillment endpoint.** The current code POSTs to
   `/orders/{id}/shipments`. Check your Swell admin API version — if your
   storefront uses a different fulfillment model, adjust `src/lib/swell.ts`.
3. **Medium flat rate box choice.** `USPS_MediumFlatRateBox2` is the
   14×12×3.5 slim version (better for folded pants). Switch to
   `USPS_MediumFlatRateBox1` (11.25×8.75×6 cube) in `src/config.ts` if you
   prefer.

## Future ideas

- Add a `$150` order-value auto-buy ceiling alongside the item count
- Daily digest email instead of per-order emails
- Compare Cubic pricing vs Medium Flat Rate for 4–6 abadá orders (Cubic
  may beat $19.98 for short zones)
- Add `track_updated` webhook to ping you when packages are delivered
