// src/js/cart-display.js

async function updateCartDisplay() {
    try {
      // Get the cart data from Swell
      const cart = await swell.cart.get();
      const cartItemsContainer = document.getElementById('cart-items');
      const cartTotalAmount = document.getElementById('cart-total-amount');
  
      // If the cart is empty, show a message
      if (!cart || !cart.items || cart.items.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        cartTotalAmount.textContent = '$0.00';
        return;
      }
  
      // Loop over each item and build the HTML
      let itemsHTML = '';
      cart.items.forEach(item => {
        // Use the first image if available; you might need to adjust the property path per your Swell settings.
        const imageUrl = item.product.images[0]?.file?.url || '';
        // Use 'item.options.size' if you store a variation option, otherwise show a default text
        const variation = item.options && item.options.size ? item.options.size : 'Standard';
  
        itemsHTML += `
          <div class="cart-item">
            <img src="${imageUrl}" alt="${item.product.name}">
            <div class="cart-item-details">
              <h3>${item.product.name}</h3>
              <p>Variation: ${variation}</p>
              <p>Quantity: ${item.quantity}</p>
              <p>Total: $${(item.price * item.quantity / 100).toFixed(2)}</p>
            </div>
          </div>
        `;
      });
  
      // Update the DOM elements
      cartItemsContainer.innerHTML = itemsHTML;
      cartTotalAmount.textContent = `$${(cart.sub_total / 100).toFixed(2)}`;
  
    } catch (error) {
      console.error('Error updating cart display:', error);
      document.getElementById('cart-items').innerHTML = '<p>Error loading cart</p>';
    }
  }
  
  // For testing: you can call updateCartDisplay() immediately after Swell is initialized
  // or whenever you open the cart sidebar.
  updateCartDisplay();
  