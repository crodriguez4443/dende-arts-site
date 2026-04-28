import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://dendearts.com',
  integrations: [
    sitemap(),
  ],
  output: 'static',
  image: {
    // No remotePatterns: external markdown images render as plain <img> tags
    // (not processed by Astro optimizer — avoids downloading expired/inaccessible URLs)
    service: { entrypoint: './src/imageService.mjs' },
  },
  vite: {
    plugins: [
      tailwindcss(),
      (() => {
        // Astro 6 Content Layer incorrectly tries to resolve external image URLs
        // as virtual module imports. This plugin handles them gracefully.
        // We use a Map to store URLs keyed by IDs that contain no image extension,
        // so Astro's assetRegex filter doesn't intercept our virtual modules.
        const urlMap = new Map();
        let counter = 0;
        return {
          name: 'astro-external-content-images',
          enforce: 'pre',
          resolveId(id) {
            if (id.startsWith('images/image?url=http')) {
              const params = new URLSearchParams(id.replace(/^images\/image\?/, ''));
              const url = decodeURIComponent(params.get('url') || '');
              const key = `\0ext-img-${counter++}`;
              urlMap.set(key, url);
              return key;
            }
          },
          load(id) {
            if (id.startsWith('\0ext-img-')) {
              const url = urlMap.get(id) || '';
              return `export default { src: ${JSON.stringify(url)}, width: 0, height: 0, format: 'webp' }`;
            }
          },
        };
      })(),
    ],
  },
});
