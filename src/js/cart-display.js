// =====================
// Cart Display and Editing
// =====================


async function updateCartDisplay() {
    try {
      // Fetch cart data using Swell SDK.
      const cart = await swell.cart.get();
      const cartItemsContainer = document.getElementById('cart-items');
      const cartTotalAmount = document.getElementById('cart-total-amount');
  
      // If there is no cart or no items, display an "empty" message.
      if (!cart || !cart.items || cart.items.length === 0) {
        cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
        cartTotalAmount.textContent = '$0.00';
        return;
      }
  
      // Build the HTML for each cart item.
      let itemsHTML = '';
      cart.items.forEach(item => {
        const imageUrl = item.product.images[0]?.file?.url || ''; //get product image
        const variation = (item.options && item.options.length > 0) ? item.options[0].value : 'Standard'; // get size / variation
  
        itemsHTML += `
          <div class="cart-item">
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
      document.getElementById('cart-items').innerHTML = '<p>Error loading cart</p>';
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
          input.value = currentQty;
          await swell.cart.updateItem(itemId, { quantity: currentQty });
          // Update cart count
          const cart = await swell.cart.get();
          window.swellCartCount = cart?.itemQuantity || 0;
          updateCartCount();
          
          updateCartDisplay();
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
        input.value = currentQty;
        await swell.cart.updateItem(itemId, { quantity: currentQty });

        // Update cart count
        const cart = await swell.cart.get();
        window.swellCartCount = cart?.itemQuantity || 0;
        updateCartCount();

        updateCartDisplay();
      });
    });
  
    deleteButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const itemId = e.target.getAttribute('data-item-id');
        button.classList.add('deleting');
        try {
          await swell.cart.removeItem(itemId);
          const cart = await swell.cart.get();
          window.swellCartCount = cart?.itemQuantity || 0;
          updateCartCount(); //update cart count in header (globally)

        } catch (error) {
          console.error("Error deleting item:", error);
          alert("There was an error deleting the item. Please try again.");
        } finally {
          button.classList.remove('deleting');
          updateCartDisplay();
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
  
  // For example, if you want to update the cart display when the cart sidebar is opened, you could use:
  document.addEventListener('DOMContentLoaded', () => {
    // Optionally, update the cart display right away.
    updateCartDisplay();
  
    // If you have a cart toggle in your navigation,
    // call updateCartDisplay() whenever the sidebar is shown.
    const cartToggle = document.querySelector('.cart-toggle');
    if (cartToggle) {
      cartToggle.addEventListener('click', () => {
        // Delay a bit to ensure the sidebar is visible, then update:
        setTimeout(updateCartDisplay, 100);
      });
    }
  });
  