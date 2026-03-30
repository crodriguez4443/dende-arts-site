import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import lunr from 'lunr';

function getSlug(id: string) { return id.split('/')[0]; }

export const GET: APIRoute = async () => {
  // Fetch blog posts (non-songbook)
  const blogPosts = await getCollection('blog', ({ data }) =>
    !data.categories.includes('capoeira-songbook')
  );

  // Fetch songs
  const songs = await getCollection('songs');

  // Build regular posts index
  const regularPostDocs = blogPosts.map((post, idx) => ({
    id: idx,
    title: post.data.title || '',
    excerpt: post.data.excerpt || '',
    categories: Array.isArray(post.data.categories)
      ? post.data.categories.join(' ')
      : '',
    url: `/blog/${getSlug(post.id)}/`,
    coverImage: null as string | null,
  }));

  const regularIndex = lunr(function () {
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('excerpt');
    this.field('categories');
    regularPostDocs.forEach(doc => this.add(doc));
  });

  // Build songs index
  const songDocs = songs.map((song, idx) => ({
    id: idx,
    title: song.data.title || '',
    excerpt: song.data.excerpt || '',
    tags: Array.isArray(song.data.tags) ? song.data.tags.join(' ') : '',
    url: `/songbook/${getSlug(song.id)}/`,
  }));

  const songsIndex = lunr(function () {
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('excerpt');
    this.field('tags', { boost: 5 });
    songDocs.forEach(doc => this.add(doc));
  });

  const payload = {
    regular: {
      index: regularIndex.toJSON(),
      posts: regularPostDocs,
    },
    songs: {
      index: songsIndex.toJSON(),
      posts: songDocs,
    },
  };

  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
};
