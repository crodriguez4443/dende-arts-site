const Image = require('@11ty/eleventy-img');
const markdownIt = require('markdown-it');
const md = new markdownIt({
    html: true,
    breaks: true,
    linkify: true,
});
const path = require('path');
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
    });

    // === blog Table of contents 

    eleventyConfig.addFilter('getHeadings', function(content) {
        try {
            // Check if content exists
            if (!content) {
                console.log('No content provided to getHeadings filter');
                return [];
            }
    
            console.log('Content type:', typeof content); // Debug log
    
            // If content is already HTML, use it directly
            // If it's markdown, render it first
            const htmlContent = typeof content === 'string' 
                ? (content.startsWith('<') ? content : md.render(content))
                : '';
    
            const headings = [];
            // Updated regex to be more flexible
            const regex = /<h([2-3])[^>]*?>(?:.*?)<\/h\1>/gs;
            let match;
    
            while ((match = regex.exec(htmlContent))) {
                // Extract the heading text, removing any HTML tags
                const level = match[1];
                const text = match[0].replace(/<[^>]*>/g, '').trim();
                const slug = text.toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
    
                headings.push({
                    level,
                    text,
                    slug
                });
            }
    
            console.log('Found headings:', headings); // Debug log
            return headings;
        } catch (error) {
            console.error('Error in getHeadings filter:', error);
            console.error('Content:', content); // Log the content that caused the error
            return [];
        }
    });
    
    // === Blog Filters filters
    
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

    // === ADD LUNR SEARCH ===

    eleventyConfig.addCollection('searchIndices', async function(collection) {
    const allPosts = collection.getFilteredByGlob('src/blog/*/index.md');
    
    // Helper function to process image
    async function processImage(coverImage, fileSlug) {
        if (!coverImage) return null;
        
        try {
            const imagePath = `src/blog/${fileSlug}/images/${coverImage}`;
            const metadata = await Image(imagePath, {
                widths: [400],
                formats: ['webp'],
                outputDir: './_site/img/optimized',
                urlPath: '/img/optimized',
            });
            
            // Return the URL of the processed image
            return metadata.webp[0].url;
        } catch (error) {
            console.error(`Error processing image for ${fileSlug}:`, error);
            return null;
        }
    }

    // Process regular posts
    const regularPosts = allPosts.filter(post => {
        const categories = post.data.categories || [];
        return !categories.includes('capoeira-songbook');
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
            };
            this.add(doc);
        });
    });

    // Process images for regular posts
    const processedRegularPosts = await Promise.all(
        regularPosts.map(async (post, idx) => {
            const optimizedImageUrl = await processImage(post.data.coverImage, post.fileSlug);
            
            return {
                id: idx,
                title: post.data.title || '',
                excerpt: post.data.excerpt || '',
                categories: post.data.categories || [],
                url: post.url,
                coverImage: optimizedImageUrl
            };
        })
    );

    // Process songbook posts similarly...
    const songbookPosts = allPosts.filter(post => {
        const categories = post.data.categories || [];
        return categories.includes('capoeira-songbook');
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
            posts: processedRegularPosts
        },
        songbook: {
            index: songbookIndex.toJSON(),
            posts: songbookPosts.map((post, idx) => ({
                id: idx,
                title: post.data.title || '',
                excerpt: post.data.excerpt || '',
                categories: post.data.categories || [],
                url: post.url
            }))
        }
    };
});

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
