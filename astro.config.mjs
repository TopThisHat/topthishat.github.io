// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { SITE } from './src/site.config.ts';
import { transformerTitle } from './src/lib/shiki.ts';

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
      defaultColor: false,
      transformers: [transformerMetaHighlight(), transformerTitle()],
    },
  },
});
