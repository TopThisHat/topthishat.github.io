import { getCollection } from 'astro:content';

export async function getPosts() {
  const posts = await getCollection('writing', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts
    .map((post) => ({ ...post, data: { ...post.data, title: smarten(post.data.title), description: smarten(post.data.description) } }))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

// A view-transition-name for a post's title, shared by post lists and the post header.
export const titleTransition = (id: string) => `view-transition-name: post-${id.replace(/[^a-z0-9-]/gi, '-')}`;

// Curly quotes and apostrophes for frontmatter text, which skips the Markdown typographer.
export function smarten(text: string) {
  return text
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s([])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[\s([])"/g, '$1“')
    .replace(/"/g, '”');
}

export function formatDate(date: Date, style: 'short' | 'long' = 'short') {
  if (style === 'short') return date.toISOString().slice(0, 10);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function readingTime(body = '') {
  return Math.max(1, Math.round(body.split(/\s+/).length / 230));
}
