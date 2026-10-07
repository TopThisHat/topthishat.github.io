import type { APIRoute, GetStaticPaths } from 'astro';
import { SITE } from '../../site.config';
import { getPosts } from '../../lib/posts';
import { renderOg } from '../../lib/og';

export const getStaticPaths = (async () => {
  const posts = await getPosts();
  return [
    { params: { slug: 'index' }, props: { title: SITE.name, subtitle: SITE.tagline } },
    ...posts.map((post) => ({
      params: { slug: post.id },
      props: { title: post.data.title, subtitle: post.data.description },
    })),
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg(props as { title: string; subtitle?: string });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
