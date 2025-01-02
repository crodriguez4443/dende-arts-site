const Image = require('@11ty/eleventy-img');
const { outdent } = require('outdent'); // Make sure to install this if not already present

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

    // Existing configuration
    return {
        dir: {
            input: "src",
            includes: "_includes",
            output: "_site"
        },
        htmlTemplateEngine: "njk",
        markdownTemplateEngine: "njk",
        dataTemplateEngine: "njk"
    };
};
