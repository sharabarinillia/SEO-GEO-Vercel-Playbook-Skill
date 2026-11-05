---
name: site-migration
description: >
  Plans and checks a website migration or relaunch without losing search traffic. Covers an
  inventory of every old URL (Search Console, old sitemaps, a crawl), the old-to-new redirect map,
  permanent redirects on Vercel (vercel.json, bulk redirects), one host and one URL per page, tests
  before and after the DNS switch with scripts/check-redirects.mjs, IndexNow submissions to Bing
  with scripts/indexnow.mjs, and 4–8 weeks of monitoring. Use it when replacing a site (Wix,
  WordPress, Webflow, Squarespace, a custom CMS) with a new build, changing domains or URL
  structures, merging or deleting pages, moving to Vercel, or when old URLs return 404 after a
  launch.
license: MIT
compatibility: Scripts need Node.js 18 or later and network access to the site.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Site migration without losing rankings

Search engines rank URLs. When URLs change, rankings move to the new URLs only if every old URL
answers a **permanent redirect straight to its closest new page**. Most traffic lost in a
relaunch comes from missing or wrong redirects, not from the new design.

## Steps

1. **Inventory every old URL** (before anything is switched off):
   - Search Console → Pages and Performance exports (the URLs that have impressions or links).
   - The old site's sitemaps, and a crawl of the live site (any crawler, or a Firecrawl `map`).
   - Old URL patterns that may still be linked: `/en/…`, `/post/…`, `/index.php?id=…`, PDFs.
2. **Map each old URL to its closest new page** in a CSV (`old,new`). Old posts without a new
   equivalent go to their topic page or the home page; never redirect everything to the home page
   by default. See [references/runbook.md](references/runbook.md).
3. **Implement the redirects as permanent** (301 or 308; Google treats both as permanent) in the
   host config: [references/vercel-redirects.md](references/vercel-redirects.md). Anchor every
   pattern (`^/contact$`) so an old URL can never catch a new one (`/contact/`).
4. **Decide the canonical host and URL form** and redirect the rest: apex → `www` (or the
   reverse), `http` → `https`, `/path` → `/path/` (or the reverse), `/index.html` → `/`.
5. **Test on the preview deployment** before the DNS switch:

   ```bash
   node <skill>/scripts/check-redirects.mjs --map redirects.csv --base https://<preview>.vercel.app
   ```

   Every row must be one hop, 301/308, ending on a 200 at the expected path.
6. **Switch DNS,** then test again on the real host, plus the host variants:

   ```bash
   node <skill>/scripts/check-redirects.mjs --map redirects.csv --base https://www.example.com
   node <skill>/scripts/check-redirects.mjs --hosts https://www.example.com
   ```

7. **Tell the search engines:** submit the new sitemap in Search Console and Bing Webmaster Tools,
   inspect the 10 most important URLs, keep the old verification tags, and send IndexNow
   (Bing and Copilot; Google does not use it):

   ```bash
   node <skill>/scripts/indexnow.mjs --host www.example.com --since all --dry   # check the list
   node <skill>/scripts/indexnow.mjs --host www.example.com --since all         # send (ask first)
   ```

8. **Monitor for 4–8 weeks:** Page indexing weekly, new 404s in both consoles, queries that brought
   traffic before against after. Fix any old URL that 404s with a redirect, the same day.

## Rules

- Keep redirects for at least a year; for URLs with external links, keep them for good.
- No chains: point every old URL straight at the final page (the checker warns on 2+ hops).
- No redirects in JavaScript or meta refresh for moved pages: use server redirects.
- Don't change URLs and content and domain at once if it can be avoided; each change adds risk.
- Ask before the DNS switch and before IndexNow submissions: both are outward-facing.
