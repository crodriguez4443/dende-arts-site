let regularIndex;
let regularData;
let songsIndex;
let songsData;
let blogGrid;
let songsGrid;
let originalBlogContent;
let originalSongsContent;

// Fetch the search indices
async function initSearch() {
    try {
        const response = await fetch('/search.json');
        const data = await response.json();
        
        // Initialize regular posts search
        regularIndex = lunr.Index.load(data.regular.index);
        regularData = data.regular.posts;
        
        // Initialize songs search
        songsIndex = lunr.Index.load(data.songs.index);
        songsData = data.songs.posts;
        
        // Store original content
        blogGrid = document.getElementById('blog-grid');
        songsGrid = document.getElementById('songs-grid');
        if (blogGrid) originalBlogContent = blogGrid.innerHTML;
        if (songsGrid) originalSongsContent = songsGrid.innerHTML;
    } catch (error) {
        console.error('Error initializing search:', error);
    }
}

function performSearch(query, type) {
    if (!query) {
        if (type === 'regular' && blogGrid) {
            blogGrid.innerHTML = originalBlogContent;
        } else if (type === 'songs' && songsGrid) {
            songsGrid.innerHTML = originalSongsContent;
        }
        return;
    }

    // Use fuzzy matching for search
    const searchIndex = type === 'regular' ? regularIndex : songsIndex;
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
    const grid = type === 'regular' ? blogGrid : songsGrid;
    const data = type === 'regular' ? regularData : songsData;
    
    if (!grid) return;

    if (results.length === 0) {
        grid.innerHTML = '<p class="no-results">No posts found matching your search.</p>';
        return;
    }

    let html = '';
    results.forEach(result => {
        const post = data[parseInt(result.ref)];
        
        if (type === 'songs') {
            // Songs have different structure - match the songbook layout
            html += `
                <a href="${post.url}" class="song-card">
                    <h3 class="song-title">${post.title}</h3>
                    <p class="song-excerpt">${post.excerpt}</p>
                </a>
            `;
        } else {
            // Regular posts
            html += `
                <article class="blog-card">
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
        }
    });
    grid.innerHTML = html;
}

// Initialize search when page loads
document.addEventListener('DOMContentLoaded', () => {
    initSearch();
    
    const regularSearchInput = document.getElementById('regularSearchInput');
    const songsSearchInput = document.getElementById('songsSearchInput');
    let regularDebounceTimeout;
    let songsDebounceTimeout;
    
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
    
    if (songsSearchInput) {
        songsSearchInput.addEventListener('input', (e) => {
            clearTimeout(songsDebounceTimeout);
            songsDebounceTimeout = setTimeout(() => {
                const query = e.target.value;
                if (query.length >= 2) {
                    performSearch(query, 'songs');
                } else {
                    songsGrid.innerHTML = originalSongsContent;
                }
            }, 300);
        });
    }
});
