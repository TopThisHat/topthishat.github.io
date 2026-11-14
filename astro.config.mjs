// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { transformerMetaHighlight } from '@shikijs/transformers';
import { SITE } from './src/site.config.ts';
import { transformerTitle } from './src/lib/shiki.ts';
import { satteri } from '@astrojs/markdown-satteri';
import { satteriMathML } from './src/lib/satteri-math.mjs';

const shikiConfig = {
  themes: { light: 'github-light', dark: 'github-dark-dimmed' },
  defaultColor: false,
  transformers: [transformerMetaHighlight(), transformerTitle()],
};

export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  markdown: {
    processor: satteri({
      features: { math: true },
      // $…$ and $$…$$ to MathML; see src/lib/satteri-math.mjs for why not satteri-katex.
      mdastPlugins: [satteriMathML()],
      // The Markdown processor reads this copy; the MDX integration reads markdown.shikiConfig below.
      shikiConfig,
    }),
    shikiConfig,
  },
});
