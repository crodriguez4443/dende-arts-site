// affiliate-coupon.js — free shipping for Partnero affiliate traffic.
// The AFFILIATE coupon (configured in Swell) is applied automatically for any
// visitor Partnero currently attributes to a partner.

(function () {
  const CODE = 'AFFILIATE';

  // Source of truth is Partnero's own partnero_partner cookie (set by the
  // script in Layout.astro, expiry = the program's cookie duration). Reading
  // it instead of tracking our own window means the free-shipping window can
  // never drift from the window Partnero pays commission on — change the
  // duration in Partnero and this follows.
  //
  // The ?aff= fallback covers the first pageview, where the visitor could add
  // to cart before universal.js has loaded and set the cookie.
  function isAffiliateVisitor() {
    return /(?:^|;\s*)partnero_partner=/.test(document.cookie) ||
      new URLSearchParams(location.search).has('aff');
  }

  // Best-effort and safe to call repeatedly: no-ops on an empty cart (Swell
  // rejects coupons there) and when the code is already applied.
  async function applyAffiliateCoupon() {
    if (!isAffiliateVisitor() || !window.swell?.cart) return;
    try {
      const cart = await swell.cart.get();
      if (!cart?.items?.length) return;
      if (cart.couponCode === CODE || cart.coupon_code === CODE) return;
      await swell.cart.applyCoupon(CODE);
      // The cached-cart layer now holds a stale copy without the discount.
      if (swell.cachedCart) swell.cachedCart.lastFetched = 0;
      if (typeof window.updateCartDisplay === 'function') window.updateCartDisplay();
    } catch (err) {
      console.error('Could not apply affiliate coupon:', err);
    }
  }

  window.applyAffiliateCoupon = applyAffiliateCoupon;
})();
