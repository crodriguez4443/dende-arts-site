// cart-toast.js - slide-up "added to cart" confirmation bar with a direct checkout CTA

(function () {
  const AUTO_HIDE_MS = 5000;
  let hideTimer = null;

  function getToast() {
    return document.getElementById('cart-toast');
  }

  function hideCartToast() {
    const toast = getToast();
    if (!toast) return;
    toast.classList.remove('active');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  // Show the bar; auto-dismisses unless the user is hovering it.
  function showCartToast() {
    const toast = getToast();
    if (!toast) return;
    toast.classList.add('active');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideCartToast, AUTO_HIDE_MS);
  }

  // Reuse the existing sidebar instead of duplicating cart markup.
  function openCartSidebar() {
    hideCartToast();
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) sidebar.classList.add('active');
    if (overlay) overlay.classList.add('active');
    if (typeof window.updateCartDisplay === 'function') {
      window.updateCartDisplay();
    }
  }

  // Same path the sidebar's checkout button uses: Swell-hosted checkout URL.
  async function goToCheckout(button) {
    const orig = button ? button.textContent : '';
    if (button) {
      button.textContent = 'Loading…';
      button.disabled = true;
    }
    try {
      if (typeof window.initializeSwell === 'function') {
        await window.initializeSwell();
      }
      const cart = await window.swell.cart.get();
      if (cart && cart.checkoutUrl) {
        window.location.href = cart.checkoutUrl;
        return;
      }
      console.warn('Checkout URL not found. Cart may be empty.');
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
    } finally {
      if (button) {
        button.textContent = orig || 'Checkout';
        button.disabled = false;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const toast = getToast();
    if (!toast) return;

    const viewBtn = document.getElementById('cart-toast-view');
    const checkoutBtn = document.getElementById('cart-toast-checkout');
    const closeBtn = document.getElementById('cart-toast-close');

    if (viewBtn) viewBtn.addEventListener('click', openCartSidebar);
    if (checkoutBtn) checkoutBtn.addEventListener('click', () => goToCheckout(checkoutBtn));
    if (closeBtn) closeBtn.addEventListener('click', hideCartToast);

    // Pause auto-dismiss while the user is interacting with the bar.
    toast.addEventListener('mouseenter', () => { if (hideTimer) clearTimeout(hideTimer); });
    toast.addEventListener('mouseleave', () => {
      if (toast.classList.contains('active')) {
        hideTimer = setTimeout(hideCartToast, AUTO_HIDE_MS);
      }
    });
  });

  // Expose for add-to-cart handlers across the site.
  window.showCartToast = showCartToast;
  window.hideCartToast = hideCartToast;
})();
