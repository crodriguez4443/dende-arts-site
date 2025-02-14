let regularIndex;
let regularData;
let songbookIndex;
let songbookData;
let blogGrid;
let songbookGrid;
let originalBlogContent;
let originalSongbookContent;

// Fetch the search indices
async function initSearch() {
    try {
        const response = await fetch('/search.json');
        const data = await response.json();
        
        // Initialize regular posts search
        regularIndex = lunr.Index.load(data.regular.index);
        regularData = data.regular.posts;
        
        // Initialize songbook search
        songbookIndex = lunr.Index.load(data.songbook.index);
        songbookData = data.songbook.posts;
        
        // Store original content
        blogGrid = document.getElementById('blog-grid');
        songbookGrid = document.getElementById('songbook-grid');
        if (blogGrid) originalBlogContent = blogGrid.innerHTML;
        if (songbookGrid) originalSongbookContent = songbookGrid.innerHTML;
    } catch (error) {
        console.error('Error initializing search:', error);
    }
}

function performSearch(query, type) {
    if (!query) {
        if (type === 'regular' && blogGrid) {
            blogGrid.innerHTML = originalBlogContent;
        } else if (type === 'songbook' && songbookGrid) {
            songbookGrid.innerHTML = originalSongbookContent;
        }
        return;
    }

    // Use fuzzy matching for search
    const searchIndex = type === 'regular' ? regularIndex : songbookIndex;
    const results = searchIndex.query(function(q) {
        // Split the query into individual terms
        query.split(/\s+/).forEach(function(term) {
            // Search with different strategies for better matches
            // Exact match with boost
            q.term(term, { boost: 10 });
            // Fuzzy matching
            q.term(term, { editDistance: 2 });
            // Prefix matching
            q.term(term, { wildcard: lunr.Query.wildcard.TRAILING });
        });
    });
    
    displayResults(results, type);
}

function displayResults(results, type) {
    const grid = type === 'regular' ? blogGrid : songbookGrid;
    const data = type === 'regular' ? regularData : songbookData;
    
    if (!grid) return;

    if (results.length === 0) {
        grid.innerHTML = '<p class="no-results">No posts found matching your search.</p>';
        return;
    }

    let html = '';
    results.forEach(result => {
        const post = data[parseInt(result.ref)];
        html += `
            <article class="${type === 'regular' ? 'blog-card' : 'songbook-card'}">
                ${post.coverImage ? 
                    `<img src="${post.coverImage}" 
                         class="blog-featured-image" 
                         alt="${post.title}"
                         loading="eager">` 
                    : ''}
                <div class="blog-card-content">
                    <h3 class="blog-card-title">
                        <a href="${post.url}">${post.title}</a>
                    </h3>
                    <a href="${post.url}" class="read-more">Read More</a>
                </div>
            </article>
        `;
    });
    grid.innerHTML = html;
}

// Initialize search when page loads
document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    
    const regularSearchInput = document.getElementById('regularSearchInput');
    const songbookSearchInput = document.getElementById('songbookSearchInput');
    let regularDebounceTimeout;
    let songbookDebounceTimeout;
    
    if (regularSearchInput) {
        regularSearchInput.addEventListener('input', (e) => {
            clearTimeout(regularDebounceTimeout);
            regularDebounceTimeout = setTimeout(() => {
                const query = e.target.value;
                if (query.length >= 2) {
                    performSearch(query, 'regular');
                } else {
                    blogGrid.innerHTML = originalBlogContent;
                }
            }, 300);
        });
    }
    
    if (songbookSearchInput) {
        songbookSearchInput.addEventListener('input', (e) => {
            clearTimeout(songbookDebounceTimeout);
            songbookDebounceTimeout = setTimeout(() => {
                const query = e.target.value;
                if (query.length >= 2) {
                    performSearch(query, 'songbook');
                } else {
                    songbookGrid.innerHTML = originalSongbookContent;
                }
            }, 300);
        });
    }
});
