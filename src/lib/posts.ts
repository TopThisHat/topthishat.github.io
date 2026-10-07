import { getCollection } from 'astro:content';

export async function getPosts() {
  const posts = await getCollection('writing', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function formatDate(date: Date, style: 'short' | 'long' = 'short') {
  if (style === 'short') return date.toISOString().slice(0, 10);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function readingTime(body = '') {
  return Math.max(1, Math.round(body.split(/\s+/).length / 230));
}
