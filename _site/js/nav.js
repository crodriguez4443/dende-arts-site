// const nav = document.querySelector('.nav-content');
// const navMenu = document.querySelector('.nav');
// const closeButton = document.querySelector('.close-nav');
// const openButton = document.querySelector('.open-nav');

// openButton.addEventListener("click", () => {
//     nav.classList.add('navigation-open');
//     openButton.classList.add('move-left'); // Add move-left class
// }); 

// closeButton.addEventListener("click", () => {
//     nav.classList.remove('navigation-open');
//     openButton.classList.remove('move-left'); // Remove move-left class
// }); 


const navContainer = document.querySelector('.nav-container');
const hamburger = document.querySelector('.hamburger');

hamburger.addEventListener('click', () => {
  navContainer.classList.toggle('active');
  document.body.style.overflow = navContainer.classList.contains('active') ? 'hidden' : 'auto';
});


// document.addEventListener('DOMContentLoaded', function() {
//   // Existing hamburger menu logic (if any)

//   // Get DOM elements related to the cart sidebar
//   const cartSidebar = document.getElementById('cart-sidebar');
//   const cartOverlay = document.getElementById('cart-overlay');
//   const cartToggleButtons = document.querySelectorAll('.cart-toggle');

//   // Toggle cart sidebar function
//   function toggleCart(e) {
//       e.preventDefault();
//       if (cartSidebar && cartOverlay) {
//           cartSidebar.classList.toggle('active');
//           cartOverlay.classList.toggle('active');
//       }
//   }

//   // Add event listeners to cart toggle buttons
//   cartToggleButtons.forEach(button => {
//       button.addEventListener('click', toggleCart);
//   });

//   // Optional: Close the cart sidebar when the overlay is clicked
//   if (cartOverlay) {
//       cartOverlay.addEventListener('click', toggleCart);
//   }
// });


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
