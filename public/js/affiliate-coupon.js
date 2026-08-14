// affiliate-coupon.js — free shipping for Partnero affiliate traffic.
// Landing on any URL carrying a Partnero referral param flags the visitor in
// localStorage; from then on the AFFILIATE coupon (configured in Swell) is
// applied to their cart automatically.

(function () {
  const CODE = 'AFFILIATE';
  const KEY = 'affiliate_referral_until';
  const PARAM = 'aff'; // Partnero referral links: /abada-joggers/?aff=<partner id>
  const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, same window Partnero attributes

  try {
    const q = new URLSearchParams(location.search);
    if (q.get(PARAM)) {
      localStorage.setItem(KEY, String(Date.now() + TTL_MS));
    }
  } catch (e) {
    // Private mode / storage disabled — no affiliate tracking, carry on.
  }

  function isAffiliateVisitor() {
    try {
      const until = Number(localStorage.getItem(KEY));
      if (!until) return false;
      if (Date.now() > until) {
        localStorage.removeItem(KEY);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
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
