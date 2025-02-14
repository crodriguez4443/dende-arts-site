// src/js/cart/cart-display.js

async function updateCartDisplay() {
    try {
        const cart = await swell.cart.get();
        const cartItemsContainer = document.getElementById('cart-items');
        const cartTotalAmount = document.getElementById('cart-total-amount');

        if (!cart || !cart.items || cart.items.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty</p>';
            cartTotalAmount.textContent = '$0.00';
            return;
        }

        let itemsHTML = '';
        cart.items.forEach(item => {
            itemsHTML += `
            <div class="cart-item">
                <img src="${item.product.images[0]?.file?.url || ''}" alt="${item.product.name}">
                <div class="cart-item-details">
                    <h3>${item.product.name}</h3>
                    <p>Size: ${item.options?.size || 'N/A'}</p>
                    
                    <div class="quantity-control">
                        <label for="quantity">Quantity:</label>
                        <div class="quantity-wrapper">
                            <button class="quantity-btn minus" type="button" data-item-id="${item.id}">-</button>
                            <input type="number" id="quantity-${item.id}" name="quantity" value="${item.quantity}" min="1" readonly>
                            <button class="quantity-btn plus" type="button" data-item-id="${item.id}">+</button>
                        </div>
                    </div>
                </div>
                <p>Total: $${(item.price * item.quantity / 100).toFixed(2)}</p>
            </div>
            `;
        });
        cartItemsContainer.innerHTML = itemsHTML;
        cartTotalAmount.textContent = `$${(cart.sub_total / 100).toFixed(2)}`;
    } catch (error) {
        console.error('Error displaying cart items:', error);
        document.getElementById('cart-items').innerHTML = '<p>Error loading cart</p>';
    }
}

function toggleCart(e) {
    e.preventDefault();
    if (cartSidebar && cartOverlay) {
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }
}

// Initialize everything
async function initialize() {
    // Wait for Swell to be ready
    const isInitialized = await ensureSwellInitialized();
    if (!isInitialized) {
        console.error('Failed to initialize cart functionality');
        return;
    }

    // Set up event listeners
    cartToggleButtons.forEach(button => {
        button.addEventListener('click', toggleCart);
    });

    if (closeCartButton) {
        closeCartButton.addEventListener('click', toggleCart);
    }

    if (cartOverlay) {
        cartOverlay.addEventListener('click', toggleCart);
    }

    if (checkoutButton) {
        checkoutButton.addEventListener('click', () => {
            window.location.href = '/checkout';
        });
    }

    // // Now that we're sure Swell is initialized, set up the cart update listener
    swell.cart.events.on('updated', () => {
        // updateCartCount();
        updateCartDisplay();
    });

    //Initial cart update
    // await updateCartCount();
    await updateCartDisplay();
}

// Start initialization
initialize().catch(error => {
    console.error('Cart initialization error:', error);
});
