import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/index.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    date: z.coerce.date(),
    categories: z.array(z.string()).optional().default([]),
    tags: z.array(z.string()).optional().default([]),
    description: z.string().nullish(),
    excerpt: z.string().nullish(),
    author: z.string().nullish(),
    coverImage: image().optional(),
    socialImage: z.string().nullish(),
    headline: z.string().nullish(),
    keywords: z.union([z.string(), z.array(z.string())]).nullish(),
    layout: z.string().nullish(),
    type: z.string().nullish(),
    featured: z.string().nullish(),
  }),
});

const songs = defineCollection({
  loader: glob({ pattern: '**/index.md', base: './src/content/songs' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    tags: z.array(z.string()).optional().default([]),
    categories: z.array(z.string()).optional().default([]),
    description: z.string().nullish(),
    excerpt: z.string().nullish(),
    author: z.string().nullish(),
    type: z.string().nullish(),
    layout: z.string().nullish(),
    headline: z.string().nullish(),
  }),
});

export const collections = { blog, songs };
