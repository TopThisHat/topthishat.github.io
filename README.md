# semi-sentient code

Personal site and blog of Ralph Lozano. Astro + MDX, deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

## Commands

| Command           | Action                              |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Dev server at `localhost:4321`      |
| `npm run build`   | Build to `dist/`                    |
| `npm run preview` | Serve the build locally             |
| `npm run check`   | Type-check `.astro`/`.ts` files     |

## Where things live

- `src/site.config.ts` holds name, links, tagline, disclaimer, analytics code, and the site URL. Personal details are only edited here.
- `src/content/writing/*.mdx` is where posts go. The filename becomes the URL: `/writing/<filename>`.
- `src/data/work.ts` holds the projects list.
- `src/pages/about.astro` holds the bio text.

## Writing a post

```mdx
---
title: Post title
description: One sentence. Used for previews, RSS, and the OG image.
pubDate: 2026-10-07
tags: [llm, evals]
draft: true        # visible in dev, hidden in production
---
```

Components available in every post without importing them:

- `<Exchange model="..." caption="...">` wrapping `<Turn role="system|user|assistant|tool">` shows a model conversation.
- `<Figure src="/img.png" alt="..." caption="..." />` adds an image with a caption. Put the image in `public/`, or import it from the post's folder.
- In fenced code blocks, ```` ```ts title="file.ts" {2-4} ```` adds a filename label and highlights lines 2–4.
- Footnotes use `[^1]`.

OG images are generated for every post at build time (`/og/<slug>.png`).

## Switching to semisentientcode.com

1. Set `url` in `src/site.config.ts` to `https://semisentientcode.com`.
2. Add `public/CNAME` containing `semisentientcode.com`.
3. Configure DNS (apex `A` records to GitHub Pages IPs, or `CNAME www` to `topthishat.github.io`) and set the custom domain under repo Settings → Pages.
