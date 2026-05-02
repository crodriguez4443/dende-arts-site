const navContainer = document.querySelector('.nav-container');
const hamburger = document.querySelector('.hamburger');

hamburger.addEventListener('click', () => {
  navContainer.classList.toggle('active');
  document.body.style.overflow = navContainer.classList.contains('active') ? 'hidden' : 'auto';
});

//original JS for cart sidebar

document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const overlay = document.querySelector('.overlay');

  // Cart Elements
  const cartToggle = document.querySelector('.cart-toggle');
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartOverlay = document.getElementById('cart-overlay');
  const closeCartButton = document.getElementById('close-cart');

  // Hamburger Menu Toggle
  if (hamburger && navMenu && overlay) {
      hamburger.addEventListener('click', mobileMenu);

      function mobileMenu() {
          hamburger.classList.toggle("active");
          navMenu.classList.toggle("active");
          overlay.classList.toggle("active");
      }

      overlay.addEventListener('click', closeMenu);

      function closeMenu() {
          hamburger.classList.remove("active");
          navMenu.classList.remove("active");
          overlay.classList.remove("active");
      }
  }

  // Cart Sidebar Toggle
  if (cartToggle && cartSidebar && cartOverlay) {
      cartToggle.addEventListener('click', toggleCart);
      closeCartButton.addEventListener('click', toggleCart);
      cartOverlay.addEventListener('click', toggleCart);
  }

  function toggleCart(e) {
      e.preventDefault();
      cartSidebar.classList.toggle('active');
      cartOverlay.classList.toggle('active');
  }
});


// event listener for cart sidebare "checkout" button

  const checkoutButton = document.getElementById('checkout-button');
  if (checkoutButton) {
      checkoutButton.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
              const cart = await swell.cart.get(); // Make sure swell.cart exists
              if (cart?.checkoutUrl) {
                  window.location.href = cart.checkoutUrl;
              } else {
                  console.warn("Checkout URL not found. Cart may be empty or improperly configured.");
                  // You might want to display a message to the user here
              }
          } catch (error) {
              console.error("Error getting cart or redirecting to checkout:", error);
              // Handle errors, like displaying an error message to the user
          }
      });
  };
