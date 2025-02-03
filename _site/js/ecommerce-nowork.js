// Store all product images data
const productImages = JSON.parse('{{ product.images | dump | safe }}');

function swapImages(thumbnailElement) {
    const mainImage = document.getElementById('mainImage');
    const thumbnails = document.querySelectorAll('.thumbnail-image');
    
    // Remove active class from all thumbnails
    thumbnails.forEach(thumb => thumb.classList.remove('active'));
    
    // Add active class to clicked thumbnail
    thumbnailElement.classList.add('active');

    // Get the index of clicked thumbnail
    const thumbnailIndex = parseInt(thumbnailElement.dataset.index);
    
    // Add fade out effect
    mainImage.style.opacity = '0';
    
    // Update main image after a brief delay (for transition effect)
    setTimeout(() => {
        mainImage.src = productImages[thumbnailIndex].file.url;
        mainImage.alt = productImages[thumbnailIndex].alt;
        mainImage.dataset.index = thumbnailIndex;
        mainImage.style.opacity = '1';
    }, 300);
}

// Initialize the first thumbnail as active
document.addEventListener('DOMContentLoaded', () => {
    const firstThumbnail = document.querySelector('.thumbnail-image');
    if (firstThumbnail) {
        firstThumbnail.classList.add('active');
    }
});