// cart-utils.js - Shared cart functionality for non-blocking UI updates

// Function to update the cart count in the header
function updateCartCount() {
  const cartCountElement = document.querySelector('.cart-count');
  if (cartCountElement) {
    // Update the UI with the current cart count
    cartCountElement.textContent = window.swellCartCount || 0;
    
    // Show or hide the count indicator
    if (window.swellCartCount > 0) {
      cartCountElement.classList.add('has-items');
    } else {
      cartCountElement.classList.remove('has-items');
    }
  }
}

// Make the function globally available
window.updateCartCount = updateCartCount;

// Add loading/busy indicators for cart operations
function showCartItemLoading(itemId) {
  const cartItem = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
  if (cartItem) {
    cartItem.classList.add('loading');
  }
}

function hideCartItemLoading(itemId) {
  const cartItem = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
  if (cartItem) {
    cartItem.classList.remove('loading');
  }
}

// Show loading state for the whole cart
function showCartLoading() {
  const cartItems = document.getElementById('cart-items');
  if (cartItems) {
    cartItems.classList.add('loading');
  }
}

function hideCartLoading() {
  const cartItems = document.getElementById('cart-items');
  if (cartItems) {
    cartItems.classList.remove('loading');
  }
}

// Make loading functions globally available
window.showCartItemLoading = showCartItemLoading;
window.hideCartItemLoading = hideCartItemLoading;
window.showCartLoading = showCartLoading;
window.hideCartLoading = hideCartLoading;

// Read GA4's client id from the _ga cookie (format: GA1.1.<id1>.<id2>).
// Used to stitch the server-side `purchase` event to the visitor's session so
// GA4 can attribute the revenue to the real traffic source. Returns null if GA
// hasn't set the cookie yet (purchase still counts, just unattributed).
function getGaClientId() {
  const m = document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/);
  return m ? m[1] : null;
}
window.getGaClientId = getGaClientId;

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

// GA4 session id, from _ga_<container> ("GS1.1.<id>.…" or "GS2.1.s<id>$o…").
function getGaSessionId() {
  const m = (getCookie('_ga_V7Q1NGPMNT') || '').match(/^GS1\.\d\.(\d+)|^GS2\.\d\.s(\d+)/);
  return m ? m[1] || m[2] : null;
}

// Meta click id: the _fbc cookie, or built from ?fbclid= when the lazy Pixel
// hasn't set the cookie yet (format fb.1.<ms>.<fbclid>).
function getFbc() {
  const cookie = getCookie('_fbc');
  if (cookie) return cookie;
  const fbclid = new URLSearchParams(location.search).get('fbclid');
  return fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : null;
}

// Fire begin_checkout / InitiateCheckout for a Swell cart. Resolves once GA4
// confirms the hit (800ms cap) so the caller can redirect without dropping it.
function trackBeginCheckout(cart) {
  try {
    const value = cart?.grandTotal ?? cart?.subTotal;
    const items = (cart?.items || []).map((i) => ({
      item_id: i.productId,
      item_name: i.product?.name,
      price: i.price,
      quantity: i.quantity,
    }));
    window.fbq?.('track', 'InitiateCheckout', {
      currency: 'USD',
      value,
      content_type: 'product',
      contents: items.map((i) => ({ id: i.item_id, quantity: i.quantity })),
    });
    return new Promise((resolve) => {
      setTimeout(resolve, 800);
      window.gtag?.('event', 'begin_checkout', {
        currency: 'USD',
        value,
        items,
        event_callback: resolve,
      });
    });
  } catch (err) {
    console.error('begin_checkout tracking failed:', err);
    return Promise.resolve();
  }
}
window.trackBeginCheckout = trackBeginCheckout;

// Attach the ids the order webhook needs onto the Swell cart, so they survive
// the redirect to Swell's hosted checkout and land on the order:
//   ga_client_id     — stitches the server-side GA4 purchase to this session
//   ga_session_id    — ties the purchase to this session's traffic source
//   fbp / fbc / user_agent — Meta Conversions API matching for the purchase
//   partnero_partner — the affiliate whose link brought this visitor, set as a
//                      first-party cookie by Partnero's script (Layout.astro)
// Best-effort: a missing id just means that order goes unattributed.
//
// Reading them touches no network, so a caller that is already writing to the
// cart can fold these into that same request instead of paying for a second
// round trip (Swell cart writes run 2s+).
function getCheckoutMetadata() {
  const metadata = {};
  const clientId = getGaClientId();
  if (clientId) metadata.ga_client_id = clientId;
  const sessionId = getGaSessionId();
  if (sessionId) metadata.ga_session_id = sessionId;
  const fbp = getCookie('_fbp');
  if (fbp) metadata.fbp = fbp;
  const fbc = getFbc();
  if (fbc) metadata.fbc = fbc;
  metadata.user_agent = navigator.userAgent;
  // Cookie first (set by Partnero's universal.js); fall back to the ?aff=
  // URL param for same-pageview checkouts where the async script hasn't set
  // the cookie yet — land on /product/?aff=X, add to cart, toast checkout.
  const partner = document.cookie.match(/(?:^|;\s*)partnero_partner=([^;]+)/);
  const partnerKey = partner
    ? decodeURIComponent(partner[1])
    : new URLSearchParams(location.search).get('aff');
  if (partnerKey) metadata.partnero_partner = partnerKey;
  // Set by Meta Shops on the checkout handoff (?cart_origin=meta_shops), so
  // the GA4 purchase event can tell shop orders from storefront orders.
  const cartOrigin = new URLSearchParams(location.search).get('cart_origin');
  if (cartOrigin) metadata.cart_origin = cartOrigin;
  return metadata;
}
window.getCheckoutMetadata = getCheckoutMetadata;

async function attachCheckoutMetadata() {
  try {
    if (!window.swell?.cart) return;
    const metadata = getCheckoutMetadata();
    if (Object.keys(metadata).length) await window.swell.cart.update({ metadata });
  } catch (err) {
    console.error('Could not attach checkout metadata to cart:', err);
  }
}
window.attachCheckoutMetadata = attachCheckoutMetadata;

// The one way to leave the site for Swell's hosted checkout. Every checkout
// button must go through here: the metadata attach above has to happen before
// the redirect, and a button that rolls its own `location.href = checkoutUrl`
// silently drops the affiliate attribution (which is exactly what the toast's
// checkout button did). Returns false if there was nothing to check out.
async function goToSwellCheckout() {
  if (typeof window.initializeSwell === 'function') await window.initializeSwell();
  if (!window.swell?.cart) return false;
  await attachCheckoutMetadata();
  const cart = await window.swell.cart.get();
  if (!cart?.checkoutUrl) {
    console.warn('Checkout URL not found. Cart may be empty.');
    return false;
  }
  await trackBeginCheckout(cart);
  window.location.href = cart.checkoutUrl;
  return true;
}
window.goToSwellCheckout = goToSwellCheckout;
