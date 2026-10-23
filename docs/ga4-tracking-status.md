# GA4 Tracking — Dende Arts status

Where this site stands against the Solstice GA4 tracking standard
(`~/.claude/agents/ga4-tracking-standard.md`). Section numbers refer to it.

Plan: **Standard**. Preset: **e-commerce**.

| Item | Status |
|---|---|
| Server-side `purchase` with `client_id`, `transaction_id`, `page_location` | ✅ `src/lib/shipping/ga4.ts` |
| `session_id` on `purchase` | ✅ `ga_session_id` in checkout metadata (`cart-utils.js`) → `ga4.ts` |
| `add_to_cart` | ✅ `src/pages/[product].astro` |
| `view_item`, `begin_checkout` | ✅ `view_item` in `[product].astro`; `begin_checkout` via `trackBeginCheckout` in `cart-utils.js`, called from `goToSwellCheckout` and the Meta path in `checkout.astro` |
| Meta Pixel + CAPI | ✅ `ViewContent`, `AddToCart`, `InitiateCheckout` in browser; `Purchase` server-side in `src/lib/shipping/meta-capi.ts` (needs `META_CAPI_TOKEN`) |
| `generate_lead` | ❌ `contact` form (`ContactForm.astro`) and `bulk-order` form (`bulk-orders.astro`, value = `calculated-total`). The review form is not a lead. Thank-you path is `/Thank-you/` |
| `contact_click` | ❌ shared script not installed (mailto links on return-policy) |
| `fit_finder_complete` | Site-specific, fine as is |
| GA4 admin | Check for a *Create event* rule producing `Purchase`; register `form_name`, `offer`, `cart_origin`; add the Swell checkout domain to unwanted referrals |
