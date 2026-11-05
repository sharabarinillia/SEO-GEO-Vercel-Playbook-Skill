# Caching for static sites on Vercel

## Why it matters for cost

A Vercel Pro team runs out of CDN requests before bandwidth. A file the browser keeps for a month
costs one request per visitor; a file re-checked on every page view costs one request per view
(even a 304 "not modified" answer is a billed request). Long caching of shared files is the
cheapest saving there is, and visitors see faster next pages.

## The policy

| Files | Cache-Control | Why |
|---|---|---|
| Hashed build files (`/assets/*-3f2a9b1c.js`) | `public, max-age=31536000, immutable` | The name changes when the content does |
| Fonts | `public, max-age=31536000` | They practically never change |
| Other static files with stable names | `public, max-age=2592000, stale-while-revalidate=86400` | 30 days; a replaced file appears within a month, or rename it |
| Data files loaded by tools (JSON tables) | `public, max-age=86400, stale-while-revalidate=604800` | They may change with a rule update |
| HTML | Vercel's default: `public, max-age=0, must-revalidate` | New deployments show at once |

Vercel's CDN caches static files at the edge regardless; these headers decide how long the
**browser** keeps them.

## Changing a long-cached file

- Hashed files: nothing to do; the build gives changed files new names.
- Stable names (`/img/hero.webp`): give a changed file a new name (`hero-v2.webp`) and update the
  references, or accept that some visitors see the old one for up to the max-age.

## Compression

Vercel compresses text responses (HTML, CSS, JS, JSON, SVG, XML) with Brotli or gzip when the
browser accepts it. `check-headers.mjs` warns when a text file over 1 KB arrives without
`content-encoding`. Images, video and WOFF2 fonts are already compressed.

## Checking

```bash
node check-headers.mjs https://www.example.com
curl -sI https://www.example.com/assets/app-3f2a9b1c.js | grep -i -E 'cache-control|content-encoding|x-vercel-cache'
```

`x-vercel-cache: HIT` means the CDN served it from cache; the browser cache is what `Cache-Control`
controls. In `measure-requests.cjs`, shared files must not appear again on the next page.
