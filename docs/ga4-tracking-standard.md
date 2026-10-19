# GA4 Tracking Standard

The one way every Solstice site sends events to Google Analytics 4. Following it
means every site's GA4 data has the same shape, so the n8n owner report works
unchanged across clients.

**Agents: this document is binding.** Where it conflicts with an agent file
(`02a`, `03`, `05`), this document wins. See [Superseded patterns](#12-superseded-patterns).

| Pipeline step | Read |
|---|---|
| 00 Intake | §1 Plans, §5 Presets, §9 Tracking plan (gather its inputs) |
| 02a Project setup | §6.1–6.2 (base snippet + shared tracking script), §6.6 env vars |
| 03 Page builder | §2 Rules, §3 Lexicon, §6.3–6.8 (wire every conversion point) |
| 05 QA | §8 QA checklist, then output §9 Tracking plan in the handoff |
| Launch (manual, in GA4) | §7 GA4 admin checklist |
| n8n report | §10 Report contract |

---

## 1. Plans

| | **Standard** (every site) | **Pipeline** (premium) |
|---|---|---|
| Answers | *How many, how much, from which channel, for which offer?* | *How did they get there, and where did everyone else drop off?* |
| Tracks | Every lexicon conversion event (§3.1), the e-commerce funnel events (§3.2), server-side events for off-site checkouts/webhooks, booking/form embeds, ad-platform conversions when the client runs ads | Everything in Standard **plus** journey step events (§3.3), CRM outcomes (lead → paying client), `user_id` on sites with logins |
| Reports | Key events by name, by channel, by offer/form; revenue; funnel step **totals** | Landing-page performance, connected funnels (landing → steps → key event) with drop-off, first-touch vs. converting channel, lead-to-client rate by offer and source |

**Deciding a new request:** if it *counts* something, it's Standard. If it
*connects* steps into a person's path (landing page → … → key event, or key
event → paying client), it's Pipeline.

Pipeline costs more because each client gets its own step instrumentation on
CTAs and widgets, custom funnel definitions, and reports that need reading, not
just numbers.

**Standard sites do not get Pipeline step events.** Built-in data (landing
pages, automatic `form_start`) is collected on every site anyway, so a client who
upgrades still has some journey history from launch.

---

## 2. Naming rules

1. **Event name = what happened. Parameters = which one.** A business with three
   programs sends one `book_appointment` with `offer: "prenatal_program"`. It
   never sends `book_prenatal_call`. Never invent a per-site synonym for a
   lexicon event.
2. **Use only names from §3.** Use a Google recommended name when one fits,
   because it unlocks GA4's built-in reports. Site-specific events (e.g. a quiz
   completion) are allowed but are not part of the lexicon and are not reported
   by n8n unless added to that client's tracking plan.
3. **Lowercase snake_case** for event names, parameter names, and the values of
   `offer`, `form_name`, `cta_name`. GA4 names are case-sensitive: `Purchase`
   and `purchase` are two different events. Limits: names ≤ 40 chars, values
   ≤ 100 chars, ≤ 25 params per event. Never start a name with `ga_`, `google_`,
   or `firebase_`.
4. **Fire on confirmed success, never on the attempt.** Success means the
   booking vendor's "confirmed" message, the `/thank-you` page after a form
   redirect, a `200` from an AJAX submit, or a paid-order webhook. A button click
   is not a conversion.
5. **No personal data in any parameter.** No names, emails, phone numbers, or
   free-text form contents. Booking vendors often include patient or customer
   details in their messages, and those must never be forwarded.
6. **Browser first.** Send events with `gtag` from the browser whenever the
   success moment happens on the client's domain. Use server-side (Measurement
   Protocol, §6.6) only when it doesn't: hosted checkout, or payment webhooks.
7. **One `offer` vocabulary per site.** Define the offer ids once in the
   tracking plan (§9) and reuse them in every event.

---

## 3. Event lexicon

### 3.1 Conversion events (Standard; mark as key events)

| Event | Fires when | Params | Counting |
|---|---|---|---|
| `purchase` | An order is paid | `transaction_id`, `value`, `currency`, `items` | Once per event |
| `book_appointment` | A calendar slot is confirmed | `offer` | Once per event |
| `generate_lead` | A contact / quote / inquiry / application form succeeds: the person asked to be contacted, quoted, or considered | `form_name`, `offer`, optional `value` + `currency` (when the form computes an estimate) | Once per session |
| `contact_click` | A tap on a phone, email, text, WhatsApp, or directions link | `method`: `phone` \| `email` \| `sms` \| `whatsapp` \| `directions` | Once per session |
| `email_signup` | Someone joins the newsletter or downloads a lead magnet | `form_name` | Once per session. Mark as a key event **only** when the email list is the main sales funnel (e.g. coaching lead magnets) |
| `sign_up` | Someone creates an account or membership | `method` | Once per event |

**Is it a lead?** A lead is someone who wants something from the business.
Contact forms, quote forms, applications, and bulk/wholesale inquiries →
`generate_lead`. Newsletter → `email_signup`. Reviews, comments, and surveys →
not a conversion (site-specific event or nothing). A confirmed booking is a
stronger signal than a form, so it is `book_appointment`, not `generate_lead`.

### 3.2 E-commerce funnel events (Standard; NOT key events)

Use these exact names. GA4's built-in purchase-journey and monetization reports
depend on them.

| Event | Fires when | Params |
|---|---|---|
| `view_item` | A product page loads | `currency`, `value`, `items` |
| `add_to_cart` | An item is added | `currency`, `value`, `items` |
| `begin_checkout` | The shopper leaves for checkout | `currency`, `value`, `items` (whole cart) |
| `purchase` | See §3.1 | |

`items[].item_id` **must be the same id in every event**, including the
server-side `purchase`. Use the variant SKU when products have variants;
otherwise use the product SKU.

### 3.3 Journey step events (Pipeline only; NOT key events)

| Event | Fires when | Params |
|---|---|---|
| `cta_click` | A primary call-to-action is clicked (Book, Apply, Get a quote, Shop now) | `cta_name`, `offer` |
| `begin_booking` | The visitor starts using a booking widget (e.g. picks a time) | `offer` |
| `form_start` | First interaction with a lead form. GA4 sends this automatically for native forms; fire it manually only for embedded (iframe) forms that expose a start message | `form_name` |
| `qualify_lead` | The CRM marks a lead as a real prospect (server-side) | `offer` |
| `close_convert_lead` | The lead becomes a paying client (server-side). **Key event on Pipeline sites** | `offer`, `value`, `currency` |

---

## 4. Parameters and custom dimensions

| Param | Meaning | Register as custom dimension? |
|---|---|---|
| `form_name` | The form's HTML `name` attribute, verbatim (GA4's automatic form events use the same value) | Yes, event scope (skip if the property already lists a predefined "Form name") |
| `offer` | The program / service / call type / product line the conversion is about, from the site's offer list | Yes, event scope |
| `method` | How (contact channel, sign-up method) | No, predefined |
| `cta_name` | Which CTA (Pipeline) | Yes, event scope (Pipeline sites) |
| `value`, `currency`, `transaction_id`, `items` | Standard GA4 e-commerce fields | No |

**New forms get snake_case `name` attributes** (`name="bulk_order"`). Don't
rename an existing hyphenated Netlify form just for this: the rename creates a
new form in Netlify and breaks its notifications.

Site-specific parameters (e.g. Dende's `cart_origin`) are allowed. Register
them and list them in the tracking plan.

---

## 5. Presets by site type

★ = key event.

| Site type | Events |
|---|---|
| **E-commerce** | `purchase`★, `view_item`, `add_to_cart`, `begin_checkout`, `generate_lead`★ (wholesale/bulk/custom quote forms), `email_signup`, `contact_click` (if contact links shown) |
| **Local service** (chiro, clinic, trades) | `book_appointment`★ (`offer` = service/program), `generate_lead`★ (contact / new-patient form), `contact_click`★ |
| **Coaching / forms-driven** | `generate_lead`★ (application/inquiry with `offer`), `email_signup`★ when a lead magnet drives the business, `book_appointment`★ if they book calls |
| **Sales-call business** | `book_appointment`★ (`offer` = call type), `generate_lead`★ (pre-call application) |

Multiple programs, services, or call types are **always** one event with
different `offer` values. They are never separate events.

---

## 6. Implementation

### 6.1 Base snippet

Use the corrected base snippet from `02a.project-setup-agent.md` §6a
(Fragment-wrapped, `PROD && PUBLIC_GA_ID` guarded). Everything below assumes
`window.gtag` exists in production and is undefined in dev, and every call is
guarded for that.

### 6.2 Shared tracking script (every site)

Place it in BaseLayout right after the base snippet. It handles
`contact_click`, `cta_click` (Pipeline), and form leads. Set `THANK_YOU` to the
site's form redirect path.

```astro
<script is:inline>
  (function () {
    var THANK_YOU = '/thank-you';

    function track(name, params) {
      if (typeof gtag === 'function') gtag('event', name, params);
    }

    // GA's ids from its cookies: _ga → client (the visitor), _ga_<ID> → session
    // (the visit; GS1.1.<id>.… or the newer GS2.1.s<id>$…). Null until gtag.js
    // has loaded once. Used to stitch server-side events (§6.6) and CRM
    // outcomes (§6.8) back to the visitor.
    function gaIds() {
      var c = document.cookie;
      var cid = c.match(/_ga=GA\d\.\d\.(\d+\.\d+)/);
      var sid = c.match(/_ga_[A-Z0-9]+=GS\d\.\d\.s?(\d+)/);
      return { client_id: cid && cid[1], session_id: sid && sid[1] };
    }
    window.gaIds = gaIds;

    // contact_click wins over cta_click: a "Call now" CTA is a contact.
    var CONTACT = [
      [/^tel:/i, 'phone'],
      [/^mailto:/i, 'email'],
      [/^sms:/i, 'sms'],
      [/wa\.me|whatsapp\.com/i, 'whatsapp'],
      [/maps\.app\.goo\.gl|google\.[a-z.]+\/maps|maps\.apple\.com/i, 'directions'],
    ];
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('a[href], [data-cta]');
      if (!el) return;
      var href = el.getAttribute('href') || '';
      for (var i = 0; i < CONTACT.length; i++) {
        if (CONTACT[i][0].test(href)) return track('contact_click', { method: CONTACT[i][1] });
      }
      // Pipeline sites only: primary CTAs carry data-cta="<cta_name>".
      if (el.dataset.cta) track('cta_click', { cta_name: el.dataset.cta, offer: el.dataset.offer });
    });

    // Lead forms opt in with data-ga-event="generate_lead" | "email_signup".
    // Submit only remembers which form it was; the event fires on THANK_YOU,
    // which Netlify only reaches on a successful submission.
    document.addEventListener('submit', function (e) {
      var form = e.target;
      var event = form.dataset && form.dataset.gaEvent;
      if (!event) return;
      // Pipeline: hidden ga_client_id / ga_session_id inputs carry the ids into
      // the submission so CRM outcomes can be reported later (§6.8).
      var ids = gaIds();
      if (form.elements.ga_client_id) form.elements.ga_client_id.value = ids.client_id || '';
      if (form.elements.ga_session_id) form.elements.ga_session_id.value = ids.session_id || '';
      try {
        sessionStorage.setItem('pending_lead', JSON.stringify({
          event: event,
          // getAttribute: form.name returns an <input name="name"> if the form has one.
          form_name: form.getAttribute('name'),
          offer: form.dataset.offer,
        }));
      } catch (err) {}
    });

    // Cleared after firing, so a reload or a direct visit to /thank-you never counts.
    if (location.pathname.toLowerCase().indexOf(THANK_YOU) === 0) {
      try {
        var lead = JSON.parse(sessionStorage.getItem('pending_lead'));
        sessionStorage.removeItem('pending_lead');
        if (lead) track(lead.event, { form_name: lead.form_name, offer: lead.offer });
      } catch (err) {}
    }
  })();
</script>
```

### 6.3 Forms

**Netlify forms that redirect** get `name`, `data-ga-event`, and optionally
`data-offer`. The shared script does the rest:

```html
<form name="new_patient" data-ga-event="generate_lead" data-offer="prenatal_program"
      method="POST" data-netlify="true" action="/thank-you">
```

- Forms that aren't conversions (reviews, comments) get **no** `data-ga-event`.
- `/thank-you` must be a real page on the site (noindex), and every lead form's
  `action` must point to it.

**AJAX forms** (no redirect) must **not** use `data-ga-event`. Fire the event
after the response succeeds:

```js
const res = await fetch(form.action, { method: 'POST', body: new FormData(form) });
if (res.ok && typeof gtag === 'function') {
  gtag('event', 'generate_lead', { form_name: form.getAttribute('name'), offer: form.dataset.offer });
}
```

**Never** mark GA4's automatic `form_submit` as a key event. It fires even when
validation fails and misses forms inside iframes.

### 6.4 Booking and form embeds (iframes)

Listen for the vendor's `postMessage`. Always check `event.origin`, map only
the vendor's *confirmed* message to `book_appointment` / `generate_lead`, and
never forward the message's personal data. If the vendor redirects after
booking, use the redirect-after-hit pattern so the hit isn't lost to the
navigation.

**Sked** (reference: My Flourishing Family):

```astro
<script define:vars={{ offer: calendar.slug }}>
  window.addEventListener('message', function (event) {
    if (event.origin !== 'https://portal.sked.life') return;
    try {
      const message = JSON.parse(event.data);
      if (!message || message.actionType !== 'confirm') return;
      // Redirect-after-hit: go once GA confirms, or after 1s if GA is blocked.
      let done = false;
      const go = function () {
        if (done || !message.url) return;
        done = true;
        window.location.href = message.url;
      };
      setTimeout(go, 1000);
      gtag('event', 'book_appointment', { offer: offer, event_callback: go });
    } catch (err) {}
  });
</script>
```

**Calendly:**

```js
window.addEventListener('message', function (e) {
  if (e.origin !== 'https://calendly.com' || !e.data || typeof gtag !== 'function') return;
  if (e.data.event === 'calendly.event_scheduled') gtag('event', 'book_appointment', { offer: OFFER });
  // Pipeline only:
  if (e.data.event === 'calendly.date_and_time_selected') gtag('event', 'begin_booking', { offer: OFFER });
});
```

**New vendor:** find out exactly which messages it posts before writing the
listener (check its docs, or log `event.origin` / `event.data` in dev). Add the
verified listener to this section so the next site reuses it.

### 6.5 E-commerce funnel

```js
gtag('event', 'view_item', {
  currency: 'USD',
  value: price,
  items: [{ item_id: sku, item_name: name, item_variant: variantName, price: price, quantity: 1 }],
});
```

- `add_to_cart` uses the same shape, with the quantity added.
- `begin_checkout` sends the whole cart, from the **single** function every
  checkout button goes through.
- If checkout is a redirect to another domain, use the redirect-after-hit
  pattern (§6.4). A queued event dies if the page navigates before `gtag.js`
  has loaded.

### 6.6 Server-side events (Measurement Protocol)

Use only when the success moment isn't in the browser: hosted checkout (Swell,
Stripe Checkout, Shopify), or payment webhooks. Events from the server arrive
with none of the browser's context, so every field below is **required**:

```ts
const body = {
  // From the visitor's _ga cookie, captured in the browser (window.gaIds()) and
  // carried through the checkout as cart/order metadata. Fall back to a stable
  // id derived from the order id; revenue still counts, just unattributed.
  client_id: meta.ga_client_id ?? derivedId,
  events: [{
    name: 'purchase',
    params: {
      // Joins the event to the visit → channel and funnel reports credit it.
      session_id: meta.ga_session_id,
      // GA4 derives hostName from this; without it hostName is "(not set)".
      page_location: 'https://<client-domain>/',
      // GA4 can drop MP events without an engagement signal.
      engagement_time_msec: 1,
      transaction_id, value, currency, items, // GA4 de-dupes purchase by transaction_id
    },
  }],
};
await fetch(
  `https://www.google-analytics.com/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
);
```

- **Capture** `window.gaIds()` into the checkout's metadata at the last moment
  before leaving the site (the same single checkout function as
  `begin_checkout`).
- **Fire once per order.** Put the call behind the webhook's idempotency guard.
- **Env vars:** `GA4_API_SECRET` (GA4 → Admin → Data streams → web stream →
  Measurement Protocol API secrets), stored in Netlify, never committed. Add it
  to `.env.example`.
- **Reference implementation:** Dende Arts, `src/lib/shipping/ga4.ts` (server)
  and `public/js/cart-utils.js` `getCheckoutMetadata()` (browser capture).

### 6.7 Ad platforms (Standard, only when the client runs ads)

- **Google Ads:** import the GA4 key events (Google Ads → Goals → Import →
  GA4). No extra code.
- **Meta:** mirror each conversion with the Meta standard event below. Meta
  uses PascalCase names. That's Meta's lexicon, so it goes to `fbq` only and
  never to GA4. Server-side purchases go to Meta's Conversions API with an
  `event_id` equal to the `transaction_id`, so Meta can de-dupe.

| GA4 | Meta |
|---|---|
| `purchase` | `Purchase` |
| `generate_lead` | `Lead` |
| `book_appointment` | `Schedule` |
| `contact_click` | `Contact` |
| `email_signup`, `sign_up` | `CompleteRegistration` |
| `view_item` / `add_to_cart` / `begin_checkout` | `ViewContent` / `AddToCart` / `InitiateCheckout` |

### 6.8 Pipeline extras (Pipeline plan only)

- **CTAs:** add `data-cta="<cta_name>"` (and `data-offer` when the CTA is for
  one offer) to every primary CTA. The shared script fires `cta_click`.
- **Booking widgets:** fire `begin_booking` from the vendor's "started" message
  (Calendly: `date_and_time_selected`).
- **CRM outcomes:** add hidden `ga_client_id` and `ga_session_id` inputs to
  every lead form. The shared script fills them on submit, so each lead arrives
  in the CRM / Netlify with its GA ids. When the CRM status changes, n8n (or a
  webhook) sends `qualify_lead` / `close_convert_lead` over Measurement
  Protocol, using that `client_id` and the same `page_location` rule as §6.6.
  Leave out `session_id`: the outcome happens outside a visit, so report it by
  first-touch channel. Send it promptly, because Measurement Protocol can't
  backdate more than 72 hours.
- **Logged-in sites:** set `user_id` (an internal account id, never an email)
  in `gtag('config', …)` so journeys join across devices.

---

## 7. GA4 admin checklist (manual, at launch)

These can't be done from code. The QA agent lists any that are still open in
its handoff.

- [ ] One GA4 property per client site. n8n identifies sites by property ID.
- [ ] Enhanced measurement on, including **form interactions**.
- [ ] Data retention → **14 months** (Admin → Data collection and modification
  → Data retention). Pipeline funnel reports are limited by this; the default
  is 2 months.
- [ ] Custom dimensions registered (§4): `form_name`, `offer`, plus `cta_name`
  on Pipeline sites and any site-specific params. Do it **before launch**,
  because dimensions only collect data from the day they're registered.
- [ ] Key events marked (§3.1 / preset), with the counting method from §3.1.
  `close_convert_lead` on Pipeline sites.
- [ ] **Delete stray rules:** check Admin → Events → *Create event* / *Modify
  event* for anything that produces non-lexicon names (e.g. a capitalized
  `Purchase`). These double-count conversions.
- [ ] Hosted checkout / payment / booking domains added to **List unwanted
  referrals** (Data streams → Configure tag settings). Otherwise a buyer
  returning from the checkout starts a new "referral" session.
- [ ] Measurement Protocol API secret created, if §6.6 applies.
- [ ] Google Ads linked and key events imported, if the client runs ads.

---

## 8. QA checklist

Run from the project root. Every item must pass before the handoff.

```bash
# 1. Every event name in code is in the lexicon (§3) or listed as site-specific in the tracking plan.
grep -rhoE "gtag(\?\.)?\(\s*['\"]event['\"],\s*['\"][A-Za-z_]+['\"]|data-ga-event=\"[a-z_]+\"|name: ['\"][a-z_]+['\"]" src public netlify 2>/dev/null | sort -u

# 2. Forms WITHOUT data-ga-event — each one printed must be a non-conversion form (review, search…).
perl -0ne 'while (/<form\b[^>]*>/g) { print "$ARGV: $&\n\n" unless $& =~ /data-ga-event/ }' $(grep -rl "<form" src)

# 3. No personal data in event params (inspect every hit by hand).
grep -rnE "gtag(\?\.)?\(\s*['\"]event" -A6 src public | grep -iE "email|phone|name:|first|last|address"
```

4. **Shared script present** (§6.2) in BaseLayout, after the base snippet, with
   `THANK_YOU` matching the real redirect path (case included).
5. **Thank-you flow:** `npm run build`, open `dist/` output, and confirm the
   `/thank-you` page includes the shared script.
6. **Server-side events** (§6.6): validate one sample payload against the debug
   endpoint. It must return `"validationMessages": []`.

   ```bash
   curl -s "https://www.google-analytics.com/debug/mp/collect?measurement_id=G-XXXXXXX&api_secret=$GA4_API_SECRET" \
     -H 'Content-Type: application/json' \
     -d '{"client_id":"123.456","events":[{"name":"purchase","params":{"transaction_id":"QA-1","value":1,"currency":"USD","session_id":"1700000000","page_location":"https://example.com/","engagement_time_msec":1,"items":[{"item_id":"SKU-1","price":1,"quantity":1}]}}]}'
   ```
7. **Embeds** (§6.4): each listener checks `event.origin`, fires only on the
   confirmed message, and forwards no personal data.
8. **Live check (manual):** after deploy, Chris submits each form, books a test
   slot, and taps each contact link, then confirms the events in GA4 → Admin →
   DebugView. Test conversions count as real ones, so note the date of the test
   in the tracking plan for the first report.

---

## 9. Tracking plan (handoff output)

Intake gathers the inputs. QA outputs the finished plan **in its chat handoff**
(not a file). Chris copies it into the n8n client config.

```markdown
## Tracking plan — <site name>
- GA4 property ID: <123456789>      Measurement ID: <G-XXXXXXX>
- Domain (page_location): https://<domain>/
- Plan: Standard | Pipeline         Preset: e-commerce | local service | coaching | sales-call
- Test conversions sent on: <date>

| Event | Trigger (page / component / vendor message) | Params | Key event | Counting | Source |
|---|---|---|---|---|---|
| book_appointment | Sked `confirm` on /programs/* | offer | ★ | per event | browser |

Offers:      prenatal_program → "Prenatal Program", …
Forms:       new_patient → "New patient form" → generate_lead, …
Site-specific events (not in report unless listed): …
Custom dimensions registered: form_name, offer, …
GA4 admin steps still open: …
```

---

## 10. n8n report contract

All queries use the GA4 Data API (`runReport`) per property, for the report
period compared with the previous period. Confirm the exact API names once per
property with `getMetadata`. Custom dimensions are `customEvent:<param>`.

### Standard report

| Section | Dimensions | Metrics | Notes |
|---|---|---|---|
| Headline conversions | `eventName` (filter: the plan's key events) | `keyEvents` | Use the labels below |
| Where they came from | `eventName`, `sessionDefaultChannelGroup` | `keyEvents` | |
| By offer | `eventName`, `customEvent:offer` | `keyEvents` | Hide the section if every row is `(not set)` |
| By form | `eventName`, `customEvent:form_name` | `keyEvents` | Same |
| Contact channel | `method` (filter `eventName = contact_click`) | `keyEvents` | |
| Traffic context | none | `sessions`, `totalUsers`, `sessionKeyEventRate` | |
| Revenue (e-commerce) | `sessionDefaultChannelGroup` | `purchaseRevenue`, `transactions`, `averagePurchaseRevenue` | |
| Funnel totals (e-commerce) | `eventName` (filter: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`) | `eventCount` | Totals only; connected funnels are Pipeline |

### Pipeline report (adds)

| Section | Query |
|---|---|
| Landing pages | `runReport`: `landingPage` × `sessions`, `keyEvents`, `sessionKeyEventRate` |
| First touch vs. converting channel | `runReport`: `firstUserDefaultChannelGroup` × `eventName` → `keyEvents` |
| Connected funnel | `runFunnelReport` (Data API v1alpha), broken down by `sessionDefaultChannelGroup`. Steps per preset: **e-commerce** `session_start` → `view_item` → `add_to_cart` → `begin_checkout` → `purchase`; **booking** `session_start` → `cta_click` → `begin_booking` → `book_appointment`; **lead form** `session_start` → `cta_click` → `form_start` → `generate_lead` |
| Lead → client | `runReport`: `customEvent:offer`, `firstUserDefaultChannelGroup` × `eventCount` for `generate_lead` / `book_appointment` vs. `close_convert_lead`, plus `close_convert_lead` value |

### Owner-facing labels

| Event | Label |
|---|---|
| `purchase` | Orders |
| `book_appointment` | Booked calls / appointments |
| `generate_lead` | Leads |
| `contact_click` | Calls, emails & texts |
| `email_signup` | Email signups |
| `sign_up` | New accounts |
| `close_convert_lead` | New clients |

**Legacy aliases** (sites built before this standard, until they're migrated):
`phone_click` → `contact_click`; `program_call_booked` → `book_appointment`.

---

## 11. Common failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `hostName = (not set)` | Server-side event without `page_location` | §6.6 |
| Conversions with channel `(not set)` / Unassigned | Server-side event without `session_id` | §6.6 |
| Two rows for one event (`Purchase` + `purchase`) | Case mismatch, or a GA4 *Create event* rule | §2.3, §7 |
| Leads double-counted | Automatic `form_submit` marked as a key event, or counting set to per-event | §6.3, §3.1 |
| Booking embed never converts | Listener missing an origin match, or listening for the wrong message | §6.4 |
| Offer breakdown empty | Custom dimension not registered, or registered after launch | §7 |
| Lost `begin_checkout` | Page navigated before the hit was sent | Redirect-after-hit, §6.4 |

---

## 12. Superseded patterns

This standard replaces these patterns in the workflow agent files:

- **`phone_click`** (02a §6b, 05 Phase 6) → `contact_click` with
  `method: "phone"`. The listener in §6.2 covers phone, email, text, WhatsApp,
  and directions.
- **"/thank-you page view = form conversion"** (02a §6c, 05 Phase 6) → `/thank-you`
  stays as the redirect target, but the conversion is now an explicit
  `generate_lead` / `email_signup` event fired there with `form_name` (§6.2).
  Page views can't tell forms apart, and every form shares the same thank-you
  page.

---

## Appendix: Dende Arts status (this repo)

Plan: **Standard**. Preset: **e-commerce**.

| Item | Status |
|---|---|
| Server-side `purchase` with `client_id`, `transaction_id`, `page_location` | ✅ `src/lib/shipping/ga4.ts` |
| `session_id` on `purchase` | ❌ add `ga_session_id` to the checkout metadata (`cart-utils.js`, `types.ts`, `ga4.ts`) |
| `add_to_cart` | ✅ `src/pages/[product].astro` |
| `view_item`, `begin_checkout` | ❌ missing. `begin_checkout` goes in the single checkout function in `cart-utils.js` with redirect-after-hit |
| `generate_lead` | ❌ `contact` form (`ContactForm.astro`) and `bulk-order` form (`bulk-orders.astro`, value = `calculated-total`). The review form is not a lead. Thank-you path is `/Thank-you/` |
| `contact_click` | ❌ shared script not installed (mailto links on return-policy) |
| `fit_finder_complete` | Site-specific, fine as is |
| GA4 admin | Check for a *Create event* rule producing `Purchase`; register `form_name`, `offer`, `cart_origin`; add the Swell checkout domain to unwanted referrals |
