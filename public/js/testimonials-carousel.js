class TestimonialGrid {
    constructor() {
        this.grid = document.querySelector('.testimonial-grid');
        this.cards = [...document.querySelectorAll('.home-testimonial-card')];
        this.currentGroup = 0;
        this.cardsPerGroup = 4;
        this.totalGroups = Math.ceil(this.cards.length / this.cardsPerGroup);
        
        this.init();
    }

    init() {
        // Set initial positions
        this.cards.forEach((card, index) => {
            if (index >= this.cardsPerGroup) {
                card.style.display = 'none';
                card.style.transform = 'translateX(-100%)';
                card.style.opacity = '0';
            } else {
                card.style.transform = 'translateX(0)';
                card.style.opacity = '1';
            }
        });

        // Start auto-rotation
        this.startAutoRotation();

        // Pause on hover
        this.grid.addEventListener('mouseenter', () => this.stopAutoRotation());
        this.grid.addEventListener('mouseleave', () => this.startAutoRotation());
    }

    showGroup(groupIndex) {
        const startIndex = groupIndex * this.cardsPerGroup;
        const endIndex = startIndex + this.cardsPerGroup;

        // Move current cards to the right and fade out
        this.cards.forEach((card, index) => {
            if (card.style.display !== 'none') {
                card.style.transform = 'translateX(100%)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 200);
            }
        });

        // Bring in new cards from the left
        setTimeout(() => {
            this.cards.forEach((card, index) => {
                if (index >= startIndex && index < endIndex) {
                    card.style.display = 'block';
                    card.style.transform = 'translateX(-100%)';
                    card.style.opacity = '0';
                    
                    // Trigger reflow
                    card.offsetHeight;

                    // Animate to final position
                    requestAnimationFrame(() => {
                        card.style.transform = 'translateX(0)';
                        card.style.opacity = '1';
                    });
                }
            });
        }, 200);

        this.currentGroup = groupIndex;
    }

    nextGroup() {
        const nextGroup = (this.currentGroup + 1) % this.totalGroups;
        this.showGroup(nextGroup);
    }

    startAutoRotation() {
        this.interval = setInterval(() => {
            this.nextGroup();
        }, 1000); // Rotate every 2 seconds
    }

    stopAutoRotation() {
        clearInterval(this.interval);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TestimonialGrid();
});
