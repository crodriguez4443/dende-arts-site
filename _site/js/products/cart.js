document.addEventListener('DOMContentLoaded', async function() {
    // First, let's make sure Swell is fully initialized
    async function ensureSwellInitialized() {
        // Wait for Swell to be available
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!window.swell && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.swell) {
            console.error('Swell failed to initialize');
            return false;
        }

        // Try to get a cart to verify Swell is working
        try {
            await swell.cart.get();
            return true;
        } catch (error) {
            console.error('Error initializing Swell:', error);
            return false;
        }
    }

    // Get our DOM elements
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartButton = document.getElementById('close-cart');
    const cartToggleButtons = document.querySelectorAll('.cart-toggle');
    const checkoutButton = document.getElementById('checkout-button');

    async function updateCartDisplay() {
        try {
            const cart = await swell.cart.get();
            const cartItems = document.getElementById('cart-items');
            const cartTotalAmount = document.getElementById('cart-total-amount');

            if (!cart || !cart.items || cart.items.length === 0) {
                if (cartItems) cartItems.innerHTML = '<p>Your cart is empty</p>';
                if (cartTotalAmount) cartTotalAmount.textContent = '$0.00';
                return;
            }

            if (cartItems) {
                cartItems.innerHTML = cart.items.map(item => `
                    <div class="cart-item">
                        <img src="${item.product.images[0]?.file?.url || ''}" alt="${item.product.name}">
                        <div class="cart-item-details">
                            <h3>${item.product.name}</h3>
                            <p>Quantity: ${item.quantity}</p>
                            <p>$${(item.price * item.quantity / 100).toFixed(2)}</p>
                        </div>
                    </div>
                `).join('');
            }

            if (cartTotalAmount) {
                cartTotalAmount.textContent = `$${(cart.sub_total / 100).toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error updating cart display:', error);
        }
    }

    // Toggle cart sidebar function
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
});
