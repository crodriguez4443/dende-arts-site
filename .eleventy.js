const fs = require('fs');
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
    eleventyConfig.addPassthroughCopy("src/ads.txt"); // move text adds to root domain/ads.txt

    
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

    // Truncate filter (limit text to 150 characters)
    eleventyConfig.addFilter('truncate', function(str, length = 150) {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length) + '...';
    });

    // == Create Songbook Collection from Markdown files

    eleventyConfig.addCollection("songs", function(collectionApi) {
    const songsDir = "./src/song-content";
    const songs = [];
    
    if (fs.existsSync(songsDir)) {
      const songDirs = fs.readdirSync(songsDir);
      
      songDirs.forEach(songDir => {
        const songPath = path.join(songsDir, songDir);
        const indexPath = path.join(songPath, "index.md");
        
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          const matter = require('gray-matter');
          const parsed = matter(content);
          
          songs.push({
            slug: songDir,
            data: parsed.data,
            content: parsed.content,
            inputPath: indexPath
          });
        }
      });
    }
    
    return songs;
    });
    
    // Helper to get song data by slug
    eleventyConfig.addFilter("getSongBySlug", function(songs, slug) {
        return songs.find(song => song.slug === slug);
    });

    // Set up permalink for song content files
    eleventyConfig.addGlobalData("permalink", function() {
        return function(data) {
        if (data.page.inputPath.includes('/song-content/')) {
            const slug = path.basename(path.dirname(data.page.inputPath));
            return `/songbook/${slug}/`;
        }
        // Return undefined instead of false to allow default permalink behavior for other files
        return undefined;
        };
    });


    // == Create a collection for the abada reviews

    eleventyConfig.addCollection("abadaReviews", function(collectionApi) {
        const jsonFilePath = path.join(__dirname, 'src/_data/abada-reviews.json');
        const reviewData = require(jsonFilePath);

        // Make sure the 'abada-reviews' property contains an array
        if (!reviewData['abada-reviews'] || !Array.isArray(reviewData['abada-reviews'])) {
          console.error(`Error: ${jsonFilePath} does not contain an array in property 'abada-reviews'.`);
          return []; // Return an empty array to prevent errors
        }
        
        // Add the data as a collection
        return reviewData['abada-reviews'].map((item, index) => {
          const id = item.id || index; // Gives each item a unique ID
          return {
            ...item,
            date: item.date ? new Date(item.date) : new Date(), // Example
            inputPath: jsonFilePath, // Add a path, useful for debugging
            filePathStem: `/abada-review-${id}`, // Create a unique file path stem
          };
        });
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


    // Process songs collection - manually build from files like the original collection
    const songs = [];
    const songsDir = "./src/song-content";
    
    if (fs.existsSync(songsDir)) {
        const songDirs = fs.readdirSync(songsDir);
        const matter = require('gray-matter');
        
        songDirs.forEach(songDir => {
            const songPath = path.join(songsDir, songDir);
            const indexPath = path.join(songPath, "index.md");
            
            if (fs.existsSync(indexPath)) {
                const content = fs.readFileSync(indexPath, 'utf8');
                const parsed = matter(content);
                
                songs.push({
                    slug: songDir,
                    data: parsed.data,
                    content: parsed.content,
                    inputPath: indexPath
                });
            }
        });
    }

    // Create songs index
    const songsIndex = lunr(function() {
        this.ref('id');
        this.field('title', {boost: 10});
        this.field('excerpt');
        this.field('content');
        this.field('tag', {boost: 5});

        songs.forEach((song, idx) => {
            const doc = {
                id: idx,
                title: song.data.title || '',
                excerpt: song.data.excerpt || '',
                content: song.content || '',
                tags: (song.data.tags || []).join(' '), // tags in an array
                url: `/songbook/${song.slug}/`
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
        songs: {
            index: songsIndex.toJSON(),
            posts: songs.map((song, idx) => ({
                id: idx,
                title: song.data.title || '',
                excerpt: song.data.excerpt || '',
                content: song.content || '',
                tags: song.data.tag || [],
                url: `/songbook/${song.slug}/`
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
