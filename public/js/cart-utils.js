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

// Attach the GA client id to the Swell cart so it carries into the order the
// webhook receives. No-op if there's no client id or Swell isn't ready.
async function attachGaClientIdToCart() {
  try {
    const clientId = getGaClientId();
    if (clientId && window.swell?.cart) {
      await window.swell.cart.update({ metadata: { ga_client_id: clientId } });
    }
  } catch (err) {
    console.error('Could not attach GA client id to cart:', err);
  }
}
window.attachGaClientIdToCart = attachGaClientIdToCart;