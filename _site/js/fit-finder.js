// ========================================
// FIT FINDER - Interactive Size Recommendation
// ========================================

(function () {
  // Sizing data
  const SIZES = [
    { name: 'XS', waistMin: 26, waistMax: 28.5 },
    { name: 'S',  waistMin: 26.5, waistMax: 30 },
    { name: 'M',  waistMin: 30, waistMax: 33 },
    { name: 'L',  waistMin: 33, waistMax: 36 },
    { name: 'XL', waistMin: 36, waistMax: 39.5 }
  ];

  const STORAGE_KEY = 'dendeFitResult';

  // DOM elements (populated on DOMContentLoaded)
  let sidebar, overlay, triggerBtn, triggerText;
  let screenWaist, screenPreference, screenResult;
  let waistSlider, waistValueDisplay, resultSizeEl;

  // ========================================
  // OPEN / CLOSE SIDEBAR
  // ========================================
  function openFitFinder() {
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeFitFinder() {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Make globally accessible
  window.openFitFinder = openFitFinder;
  window.closeFitFinder = closeFitFinder;

  // ========================================
  // SCREEN NAVIGATION
  // ========================================
  function showScreen(screen) {
    screenWaist.classList.remove('active');
    screenPreference.classList.remove('active');
    screenResult.classList.remove('active');
    screen.classList.add('active');
  }

  // ========================================
  // SIZE RECOMMENDATION ALGORITHM
  // ========================================
  function calculateSize(waist, preference) {
    // Find all sizes whose range contains this waist measurement
    var matches = SIZES.filter(function (s) {
      return waist >= s.waistMin && waist <= s.waistMax;
    });

    // If no exact match, find the closest size
    if (matches.length === 0) {
      if (waist < SIZES[0].waistMin) return SIZES[0].name;
      if (waist > SIZES[SIZES.length - 1].waistMax) return SIZES[SIZES.length - 1].name;

      // Find the closest boundary
      var closest = SIZES[0];
      var closestDist = Infinity;
      SIZES.forEach(function (s) {
        var dist = Math.min(Math.abs(waist - s.waistMin), Math.abs(waist - s.waistMax));
        if (dist < closestDist) {
          closestDist = dist;
          closest = s;
        }
      });
      return closest.name;
    }

    // Single match — return it
    if (matches.length === 1) return matches[0].name;

    // Multiple matches (overlap zone) — preference breaks the tie
    if (preference === 'snug') {
      return matches[0].name; // smaller size
    }
    // "just-right" or "relaxed" → larger size
    return matches[matches.length - 1].name;
  }

  // ========================================
  // LOCAL STORAGE
  // ========================================
  function saveResult(size, waist, preference) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ size: size, waist: waist, preference: preference }));
    } catch (e) { /* silent */ }
  }

  function loadResult() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  }

  function updateTriggerFromStorage() {
    var result = loadResult();
    if (result && triggerText) {
      triggerText.textContent = 'Your Size: ' + result.size;
    }
  }

  // ========================================
  // PRODUCT PAGE INTEGRATION
  // ========================================
  function applyResultToProductPage() {
    var result = loadResult();
    if (!result) return;

    // Check if we're on a product page with size boxes
    var sizeBoxes = document.querySelectorAll('.size-box');
    if (sizeBoxes.length === 0) return;

    // Add recommendation text
    var container = document.querySelector('.size-boxes-container');
    if (container && !document.getElementById('ff-recommendation-text')) {
      var rec = document.createElement('div');
      rec.id = 'ff-recommendation-text';
      rec.className = 'ff-product-recommendation';
      rec.textContent = 'Recommended for you: ' + result.size;
      container.parentNode.insertBefore(rec, container);
    }

    // Pre-highlight the recommended size
    sizeBoxes.forEach(function (box) {
      if (box.dataset.size === result.size && !box.classList.contains('out-of-stock')) {
        box.classList.add('ff-recommended');
      }
    });
  }

  // ========================================
  // ADD TO CART FROM FIT FINDER
  // ========================================
  async function addToCartFromFitFinder(size) {
    var addBtn = document.getElementById('ff-add-to-cart');
    addBtn.disabled = true;
    addBtn.textContent = 'Adding...';

    try {
      if (typeof swell !== 'undefined' && swell.cachedCart) {
        // Find the Abada Joggers product — search by name
        var products = await swell.products.list({ search: 'Abada Joggers', limit: 1 });
        var product = products && products.results && products.results[0];

        if (product) {
          await swell.cachedCart.addItem({
            product_id: product.id,
            quantity: 1,
            options: { Size: size }
          });

          // Update cart count
          if (window.swellCartCount !== undefined) {
            window.swellCartCount += 1;
          }
          if (typeof updateCartCount === 'function') {
            updateCartCount();
          }
          if (typeof updateCartDisplay === 'function') {
            updateCartDisplay();
          }

          addBtn.textContent = 'Added!';

          // Close fit finder sidebar and open cart sidebar
          setTimeout(function () {
            closeFitFinder();
            var cartSidebar = document.getElementById('cart-sidebar');
            var cartOverlay = document.getElementById('cart-overlay');
            if (cartSidebar && cartOverlay) {
              cartSidebar.classList.add('active');
              cartOverlay.classList.add('active');
            }
          }, 600);
        } else {
          addBtn.textContent = 'Product not found';
        }
      } else {
        addBtn.textContent = 'Store loading...';
      }
    } catch (error) {
      console.error('Fit Finder add to cart error:', error);
      addBtn.textContent = 'Error - Try Again';
    }

    setTimeout(function () {
      addBtn.disabled = false;
      addBtn.textContent = 'Add to Cart';
    }, 2000);
  }

  // ========================================
  // GA4 TRACKING
  // ========================================
  function trackFitFinderComplete(size, waist, preference) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'fit_finder_complete', {
        recommended_size: size,
        waist_measurement: waist,
        fit_preference: preference
      });
    }
  }

  // ========================================
  // INITIALIZE
  // ========================================
  document.addEventListener('DOMContentLoaded', function () {
    sidebar = document.getElementById('fit-finder-sidebar');
    overlay = document.getElementById('fit-finder-overlay');
    triggerBtn = document.getElementById('fit-finder-trigger');
    triggerText = document.getElementById('ff-trigger-text');
    screenWaist = document.getElementById('ff-screen-waist');
    screenPreference = document.getElementById('ff-screen-preference');
    screenResult = document.getElementById('ff-screen-result');
    waistSlider = document.getElementById('ff-waist-slider');
    waistValueDisplay = document.getElementById('ff-waist-value');
    resultSizeEl = document.getElementById('ff-result-size');

    if (!sidebar) return;

    // Trigger button
    if (triggerBtn) {
      triggerBtn.addEventListener('click', openFitFinder);
      updateTriggerFromStorage();
    }

    // Close button & overlay
    document.getElementById('close-fit-finder').addEventListener('click', closeFitFinder);
    overlay.addEventListener('click', closeFitFinder);

    // Slider
    waistSlider.addEventListener('input', function () {
      waistValueDisplay.textContent = this.value;
    });

    // Next button
    document.getElementById('ff-next-btn').addEventListener('click', function () {
      showScreen(screenPreference);
    });

    // Back button
    document.getElementById('ff-back-btn').addEventListener('click', function () {
      showScreen(screenWaist);
    });

    // Preference cards
    document.querySelectorAll('.ff-pref-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var waist = parseFloat(waistSlider.value);
        var preference = this.dataset.preference;
        var size = calculateSize(waist, preference);

        // Show result
        resultSizeEl.textContent = size;
        showScreen(screenResult);

        // Save & track
        saveResult(size, waist, preference);
        updateTriggerFromStorage();
        trackFitFinderComplete(size, waist, preference);

        // Update product page if we're on one
        applyResultToProductPage();
      });
    });

    // Start over
    document.getElementById('ff-start-over').addEventListener('click', function () {
      showScreen(screenWaist);
    });

    // Add to cart from result screen
    document.getElementById('ff-add-to-cart').addEventListener('click', function () {
      var size = resultSizeEl.textContent;
      addToCartFromFitFinder(size);
    });

    // Apply saved result to product page
    applyResultToProductPage();

    // Hide floating trigger on product pages (they have inline trigger)
    if (document.querySelector('.product-sale-page') && triggerBtn) {
      triggerBtn.style.display = 'none';
    }
  });
})();
