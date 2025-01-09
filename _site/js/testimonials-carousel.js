// src/assets/js/carousel.js
class TestimonialCarousel {
    constructor() {
        this.carousel = document.querySelector('.testimonial-carousel');
        if (!this.carousel) return;
        
        this.track = this.carousel.querySelector('.testimonial-track');
        this.slides = [...this.carousel.querySelectorAll('.home-testimonial-card')];
        this.dots = [...this.carousel.querySelectorAll('.carousel-dot')];
        this.currentIndex = 0;
        this.interval = null;
        
        this.init();
    }


    init() {
        // Show first slide
        this.showSlide(0);
        
        // Add click handlers to dots
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.showSlide(index));
        });

        // Start auto-rotation
        this.startAutoRotation();

        // Pause on hover
        this.carousel.addEventListener('mouseenter', () => this.stopAutoRotation());
        this.carousel.addEventListener('mouseleave', () => this.startAutoRotation());
    }

    showSlide(index) {
        // Update slides
        this.slides.forEach(slide => slide.classList.remove('active'));
        this.slides[index].classList.add('active');

        // Update dots
        this.dots.forEach(dot => dot.classList.remove('active'));
        this.dots[index].classList.add('active');

        // Move track
        this.track.style.transform = `translateX(-${index * 100}%)`;
        
        this.currentIndex = index;
    }

    startAutoRotation() {
        this.interval = setInterval(() => {
            const nextIndex = (this.currentIndex + 1) % this.slides.length;
            this.showSlide(nextIndex);
        }, 5000); // Change slide every 5 seconds
    }

    stopAutoRotation() {
        clearInterval(this.interval);
    }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestimonialCarousel();
});
