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