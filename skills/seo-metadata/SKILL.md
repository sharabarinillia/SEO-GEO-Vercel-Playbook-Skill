---
name: seo-metadata
description: >
  Writes and reviews each page's search-facing text and tags: title, meta description, H1,
  canonical, hreflang, Open Graph and share images. Sizes titles and descriptions to what search
  results actually show (scripts/serp-width.mjs measures the pixel width Google cuts at), and sets
  up second languages, X (Twitter) cards and robots meta. Use it when writing or rewriting titles
  and descriptions, choosing a page's main keyword, adding a second language, fixing duplicate or
  cut-off titles, making link previews look right, or when someone asks for SEO copy, meta tags or
  "better Google snippets" for a page or a whole site.
license: MIT
compatibility: serp-width.mjs needs Node.js 18 or later.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Page metadata: titles, descriptions, headings, languages, previews

Every indexable page gets its own title, description, `<h1>`, canonical, share image and, on
multilingual sites, hreflang. Write them from the page's real content; never promise what the
page doesn't deliver.

## The rules

| Element | Rule |
|---|---|
| `<title>` | Unique. Main keyword first, brand last (`Air freight from Frankfurt, dangerous goods certified \| Brand`). At most about **580 px** at 20 px Arial |
| `<meta name="description">` | Unique. A short pitch with the keyword and concrete facts (what, where, for whom, a number). At most about **920 px** at 14 px Arial |
| `<h1>` | One per page, naming the topic in the searcher's words. A tagline alone wastes it |
| Canonical | Absolute URL on the production host, in the page's canonical form (trailing slash or not, consistently) |
| hreflang | Every language version plus `x-default`, absolute URLs, confirmed from both sides, also in the sitemap |
| Robots meta | `max-image-preview:large` on indexable pages; `noindex` only on pages that must stay out |
| Open Graph | `og:title`, `og:description`, `og:url`, `og:image` (1200 × 630, per page), `og:locale`; `twitter:card=summary_large_image` |

Google uses the `<title>`, the visible `<h1>`, other prominent text and anchor text for the
title link, and rewrites titles that don't match the page. Neither titles nor descriptions have
a length limit; results are cut to fit the device. Sources and details:
[references/titles-and-descriptions.md](references/titles-and-descriptions.md).

## Steps

1. **List the pages and their one topic each.** One primary topic per URL, so pages don't compete.
2. **Find the words people search.** Google, Bing and DuckDuckGo autocomplete; the titles of pages
   ranking today; Search Console queries if the site is live. Check the local language's own
   phrasing (Dutch searchers type "volumegewicht berekenen", not a translation of the English).
3. **Write the title:** keyword phrase first, the differentiator next, brand last. Measure:

   ```bash
   node <skill>/scripts/serp-width.mjs "Air freight from Frankfurt, dangerous goods certified | Brand" "The description …"
   ```

4. **Write the description:** one or two sentences that answer "why click this result": the
   service or answer, the place, the proof (years, certifications, numbers), a light call to
   action. Unique per page.
5. **Align the `<h1>` with the title** (same topic words, can be shorter or warmer).
6. **Other languages:** write each language's title and description natively, then wire hreflang
   (see [references/multilingual.md](references/multilingual.md)).
7. **Share image:** a 1200 × 630 image per page with the page's topic on it. Generate them at build
   time when there are many pages.
8. **Check the whole site** with `seo-technical-audit` (`seo-audit.mjs` finds missing, duplicate
   and too-wide titles and descriptions, broken hreflang pairs and relative share images).

## Quality bar

- Facts only: no "best", "#1" or guarantees the client can't prove.
- No keyword stuffing; one main phrase and natural variants.
- Brand at the end, except on the home page, where the brand can lead.
- Titles on templated pages (products, locations) must still differ in substance, or the pages
  are near-duplicates. Don't create pages per city or per product code with swapped names.
- After launch, compare Search Console queries with the intended keywords after 4–8 weeks and
  adjust titles where the page ranks for a different phrase than planned.
