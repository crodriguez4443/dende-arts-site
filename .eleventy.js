const Image = require('@11ty/eleventy-img');
const { outdent } = require('outdent'); // Make sure to install this if not already present
const BLOG_CATEGORIES = { // categories for blog posts
    history: ["History, Culture, Travel"],
    capoeira: ["Capoeira Music"],
    movement: ["Movement Guides"],
    equipment: ["Equipment Reviews"],
    beginners: ["Beginners Capoeira"]
};
const lunr = require('lunr');

// Utility function to stringify attributes
function stringifyAttributes(attributesObj) {
  return Object.entries(attributesObj)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
}

module.exports = function(eleventyConfig) {

    // Existing passthrough copy configurations
    eleventyConfig.addPassthroughCopy("src/css");
    eleventyConfig.addPassthroughCopy("src/img");
    eleventyConfig.addPassthroughCopy("src/js");
    eleventyConfig.addPassthroughCopy("src/fonts");
    
    // Add the image shortcode
    eleventyConfig.addAsyncShortcode('image', async (
        src,
        alt,
        className = undefined,
        widths = [400, 800, 1280],
        formats = ['webp', 'jpeg'],
        sizes = '100vw',
        loading = 'lazy'
    ) => {
        const imageMetadata = await Image(src, {
            widths: [...widths, null],
            formats: [...formats, null],
            outputDir: './_site/img/optimized',
            urlPath: '/img/optimized',
        });

        const sourceHtmlString = Object.values(imageMetadata)
            .map((images) => {
                const { sourceType } = images[0];

                const sourceAttributes = stringifyAttributes({
                    type: sourceType,
                    srcset: images.map((image) => image.srcset).join(', '),
                    sizes,
                });

                return `<source ${sourceAttributes}>`;
            })
            .join('\n');

        const getLargestImage = (format) => {
            const images = imageMetadata[format];
            return images[images.length - 1];
        }

        const largestUnoptimizedImg = getLargestImage(formats[0]);
        const imgAttributes = stringifyAttributes({
            src: largestUnoptimizedImg.url,
            width: largestUnoptimizedImg.width,
            height: largestUnoptimizedImg.height,
            alt,
            loading,
            decoding: 'async',
        });
        const imgHtmlString = `<img ${imgAttributes}>`;

        const pictureAttributes = stringifyAttributes({
            class: className,
        });
        const picture = `<picture ${pictureAttributes}>
            ${sourceHtmlString}
            ${imgHtmlString}
        </picture>`;

        return outdent`${picture}`;
    })
     // Date formatting filters
     eleventyConfig.addFilter('readableDate', (dateObj) => {
        return new Date(dateObj).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    });

    eleventyConfig.addFilter('htmlDateString', (dateObj) => {
        return new Date(dateObj).toISOString().split('T')[0];
    });

    eleventyConfig.addCollection('filteredPosts', function(collection) {
        const posts = collection.getFilteredByGlob('src/blog/*/index.md')
            .filter(post => {
                const categories = post.data.categories || [];
                return !categories.includes('capoeira-songbook');
            })
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
        
        console.log(`Found ${posts.length} filtered posts`);
        return posts;
    });

    // Collection specifically for songbook posts
    eleventyConfig.addCollection('songbookPosts', function(collection) {
        const posts = collection.getFilteredByGlob('src/blog/*/index.md')
            .filter(post => {
                const categories = post.data.categories || [];
                return categories.includes('capoeira-songbook');
            })
            .sort((a, b) => new Date(b.data.date) - new Date(a.data.date));
        
        console.log(`Found ${posts.length} songbook posts`);
        return posts;
    });

    // ADD LUNR SEARCH 
    eleventyConfig.addCollection('searchIndices', function(collection) {
    const allPosts = collection.getFilteredByGlob('src/blog/*/index.md');
    
    // Split posts into regular and songbook
    const regularPosts = allPosts.filter(post => {
        const categories = post.data.categories || [];
        return !categories.includes('capoeira-songbook');
    });

    const songbookPosts = allPosts.filter(post => {
        const categories = post.data.categories || [];
        return categories.includes('capoeira-songbook');
    });

    // Create regular posts index
    const regularIndex = lunr(function() {
        this.ref('id');
        this.field(('title'), {boost: 10}); 
        this.field('excerpt');
        this.field('categories');

        regularPosts.forEach((post, idx) => {
            const doc = {
                id: idx,
                title: post.data.title || '',
                excerpt: post.data.excerpt || '',
                categories: post.data.categories || [],
                url: post.url,
                coverImage: post.data.coverImage || ''
            };
            this.add(doc);
        });
    });

    // Create songbook index
    const songbookIndex = lunr(function() {
        this.ref('id');
        this.field(('title'), {boost: 10});
        this.field('excerpt');
        this.field('categories');

        songbookPosts.forEach((post, idx) => {
            const doc = {
                id: idx,
                title: post.data.title || '',
                excerpt: post.data.excerpt || '',
                categories: post.data.categories || [],
                url: post.url
            };
            this.add(doc);
        });
    });

    // Return both indices and their respective posts
    return {
        regular: {
            index: regularIndex.toJSON(),
            posts: regularPosts.map((post, idx) => {
                // Debug log the image path
                console.log('starting post');
                const imagePath = post.data.coverImage 
                    ? `/blog/${post.fileSlug}/images/${post.data.coverImage}`
                    : null;
    
                console.log('Post:', post.data.title);
                console.log('Original coverImage:', post.data.coverImage);
                console.log('Computed path:', imagePath);
    
                return {
                    id: idx,
                    title: post.data.title || '',
                    excerpt: post.data.excerpt || '',
                    categories: post.data.categories || [],
                    url: post.url,
                    coverImage: imagePath
                };
            })
        },
        songbook: {
            index: songbookIndex.toJSON(),
            posts: songbookPosts.map((post, idx) => ({
                id: idx,
                title: post.data.title || '',
                excerpt: post.data.excerpt || '',
                categories: post.data.categories || [],
                url: post.url,
            }))
        }
    }});

    return {
        dir: {
            input: "src",
            includes: "_includes",
            data: "_data",
            output: "_site"
        },
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk",
        dataTemplateEngine: "njk"
    };
};
