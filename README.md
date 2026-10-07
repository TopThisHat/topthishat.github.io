# semi-sentient code

Personal site and blog of Ralph Lozano. Astro + MDX, served as static assets on Cloudflare Workers. Cloudflare builds (`npm run build`) and deploys (`npx wrangler deploy`, configured in `wrangler.jsonc`) on every push to `main`.

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

## Domain

Served at https://semisentientcode.com. DNS and hosting are both on Cloudflare; the apex and `www` are attached to the Worker as custom domains (Worker → Settings → Domains & Routes).
