// =====================
// Cart Display and Editing
// =====================


async function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    
    try {
      // Show loading state
      if (cartItemsContainer) {
        cartItemsContainer.classList.add('loading');
      }
      
      // Use the cached cart system to reduce API calls
      const cart = await swell.cachedCart.get();
  
      // If there is no cart or no items, display an "empty" message.
      if (!cart || !cart.items || cart.items.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        if (cartTotalAmount) {
          cartTotalAmount.textContent = '$0.00';
        }
        cartItemsContainer.classList.remove('loading');
        return;
      }
  
      // Build the HTML for each cart item.
      let itemsHTML = '';
      cart.items.forEach(item => {
        const imageUrl = item.product.images[0]?.file?.url || ''; //get product image
        const variation = (item.options && item.options.length > 0) ? item.options[0].value : 'Standard'; // get size / variation
  
        itemsHTML += `
          <div class="cart-item" data-item-id="${item.id}">
            <div class="flex-box">
              <img class="cart-item-image" src="${imageUrl}" alt="${item.product.name}">
              <div class="cart-item-details">
                <p>Total: $${(item.price * item.quantity).toFixed(2)}</p>
                <h3>${item.product.name}</h3>
                <p>Size: ${variation}</p>
                <label for="quantity-${item.id}">Quantity: ${item.quantity}</label>
              </div>
            </div>
            <div class="flex-box">
              <div class="quantity-control">
                <div class="quantity-wrapper">
                  <button class="quantity-btn minus" type="button" data-item-id="${item.id}">-</button>
                  <input type="number" id="quantity-${item.id}" name="quantity" value="${item.quantity}" min="1" readonly>
                  <button class="quantity-btn plus" type="button" data-item-id="${item.id}">+</button>
                </div>
              </div>
              <button class="delete-item" data-item-id="${item.id}">
                <img src="/img/trash-icon.svg" alt="Delete item from cart">
                <span class="deleting-text">Deleting...</span>
              </button>
            </div>
          </div>
        `;
      });

      cartItemsContainer.innerHTML = itemsHTML;
      if (cartTotalAmount) {
        cartTotalAmount.textContent = `$${(cart.subTotal).toFixed(2)}`;
      }
      
      // Attach event listeners to the quantity and delete buttons.
      addCartListeners();
      
    } catch (error) {
      console.error('Error updating cart display:', error);
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '<p>Error loading cart</p>';
      }
    } finally {
      // Always remove loading state when done
      if (cartItemsContainer) {
        cartItemsContainer.classList.remove('loading');
      }
    }
}
  function addCartListeners() {
    // Attach listeners for the minus and plus buttons.
    const minusButtons = document.querySelectorAll('.quantity-btn.minus');
    const plusButtons  = document.querySelectorAll('.quantity-btn.plus');
    const deleteButtons = document.querySelectorAll('.delete-item');
  
    minusButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const itemId = e.target.getAttribute('data-item-id');
        const input = document.getElementById(`quantity-${itemId}`);
        let currentQty = parseInt(input.value);
        if (currentQty > 1) {
          currentQty--;
          
          // Optimistic UI update - update UI before API call completes
          input.value = currentQty;
          
          // Update the price display optimistically
          const cartItem = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
          if (cartItem) {
            const priceElement = cartItem.querySelector('.cart-item-details p:first-child');
            const cart = await swell.cachedCart.get();
            const item = cart.items.find(item => item.id === itemId);
            if (item && priceElement) {
              priceElement.textContent = `Total: $${(item.price * currentQty).toFixed(2)}`;
            }
          }
          
          try {
            // Use the cached cart update method
            await swell.cachedCart.updateItem(itemId, { quantity: currentQty });
            
            // Update cart count using cached data
            const updatedCart = await swell.cachedCart.get();
            window.swellCartCount = updatedCart?.itemQuantity || 0;
            updateCartCount();
          } catch (error) {
            console.error('Error updating quantity:', error);
            // Revert the optimistic update on error
            input.value = currentQty + 1;
            updateCartDisplay();
          }
        }
      });
    });
  
    plusButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const itemId = e.target.getAttribute('data-item-id');
        const input = document.getElementById(`quantity-${itemId}`);
        let currentQty = parseInt(input.value);
        currentQty++;
        
        // Optimistic UI update
        input.value = currentQty;
        
        // Update the price display optimistically
        const cartItem = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
        if (cartItem) {
          const priceElement = cartItem.querySelector('.cart-item-details p:first-child');
          const cart = await swell.cachedCart.get();
          const item = cart.items.find(item => item.id === itemId);
          if (item && priceElement) {
            priceElement.textContent = `Total: $${(item.price * currentQty).toFixed(2)}`;
          }
        }
        
        try {
          // Use the cached cart update method
          await swell.cachedCart.updateItem(itemId, { quantity: currentQty });
          
          // Update cart count using cached data
          const updatedCart = await swell.cachedCart.get();
          window.swellCartCount = updatedCart?.itemQuantity || 0;
          updateCartCount();
        } catch (error) {
          console.error('Error updating quantity:', error);
          // Revert the optimistic update on error
          input.value = currentQty - 1;
          updateCartDisplay();
        }
      });
    });
  
    deleteButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const itemId = button.getAttribute('data-item-id');
        
        // Optimistic UI update - hide the item immediately
        const cartItem = button.closest('.cart-item');
        if (cartItem) {
          cartItem.style.opacity = '0.5';
          cartItem.style.pointerEvents = 'none';
        }
        
        button.classList.add('deleting');
        
        try {
          // Use the cached cart remove method that we'll add to the cart cache layer
          await swell.cachedCart.removeItem(itemId);
          
          // Update cart count using cached data
          const updatedCart = await swell.cachedCart.get();
          window.swellCartCount = updatedCart?.itemQuantity || 0;
          updateCartCount();
          
          // Remove the item from DOM completely
          if (cartItem) {
            cartItem.remove();
          }
          
          // If cart is empty after this removal, update the display
          if (updatedCart.items.length === 0) {
            updateCartDisplay();
          }
          
        } catch (error) {
          console.error("Error deleting item:", error);
          // Restore the item on error
          if (cartItem) {
            cartItem.style.opacity = '1';
            cartItem.style.pointerEvents = 'auto';
          }
          button.classList.remove('deleting');
          alert("There was an error deleting the item. Please try again.");
        }
      });
    });    
  }

  // Add the checkout button handler
  document.addEventListener('DOMContentLoaded', () => {
    updateCartDisplay();

    const cartToggle = document.querySelector('.cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', () => {
        setTimeout(updateCartDisplay, 100);
      });
    }

    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
      checkoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        checkoutButton.textContent = 'Processing...';
        checkoutButton.disabled = true;

        try {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate checkout process
          console.log('Redirecting to checkout...');
          // window.location.href = '/checkout'; // Uncomment to redirect
        } catch (error) {
          console.error('Error during checkout:', error);
          alert('There was an error during checkout. Please try again.');
        } finally {
          checkoutButton.textContent = 'Proceed to Checkout';
          checkoutButton.disabled = false;
        }
      });
    }
  });
  
  window.updateCartDisplay = updateCartDisplay;