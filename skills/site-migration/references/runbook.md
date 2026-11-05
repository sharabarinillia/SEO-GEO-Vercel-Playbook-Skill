# Migration runbook

## Building the inventory

| Source | How | Catches |
|---|---|---|
| Search Console | Performance → Pages (16 months), Pages → indexed list, Links → top linked pages | URLs that earn traffic and links |
| Old sitemaps | `/sitemap.xml`, `/sitemap_index.xml`, CMS-specific ones (`/pages-sitemap.xml`, `/blog-posts-sitemap.xml`) | Every published page |
| Crawl | Any crawler, or Firecrawl `map` on the live site | Pages missing from sitemaps, old language folders |
| Analytics | Landing pages, last 12 months | Pages people actually arrive on |
| Backlinks | Search Console Links, or an SEO tool | URLs other sites link to (keep these forever) |

Merge into one list, deduplicate, and drop junk (parameters for tracking, session IDs).

## The map

```csv
old,new
/air-cargo,/services/air-freight/
/de/luftfracht,/de/leistungen/luftfracht/
/about-us.html,/about/
/blog,/news/
/blog/dangerous-goods-update,/services/air-freight/
```

- Closest equivalent first: same topic, same language.
- Old language versions map to the new page in that same language.
- Deleted content with no equivalent: the parent topic page. Use 410 only for pages that should
  disappear from search entirely (spam, legal removal).
- Patterns for families of URLs (`/post/.+` → `/blog/`), but list valuable URLs individually first,
  since the first matching rule wins.
- Fragments (`#team`) are kept by browsers but ignored by search engines: fine as destinations.

## Wix, WordPress and similar sources

- **Wix:** language folders (`/en/…`), `/post/<slug>` for blogs, `/blank-<n>` and `/copy-of-…`
  leftovers; the Wix sitemap index lists pages, posts and images separately.
- **WordPress:** `/?p=123` and `/?page_id=45` short links, `/category/…`, `/tag/…`, `/author/…`,
  `/feed/`, date archives, `/wp-content/uploads/…` files (redirect important PDFs and images).
- **Webflow / Squarespace:** collection URLs (`/blog/…`, `/s/…` for files).

## Launch day order

1. Final content freeze on the old site; last export of URLs.
2. Deploy the new site to production on Vercel with the redirects; test on the production
   deployment URL with `check-redirects.mjs --base`.
3. Lower the DNS TTL a day before; switch DNS; confirm TLS on apex and `www`.
4. Run `check-redirects.mjs` on the real host and `--hosts`.
5. Check `robots.txt` (not blocking), canonicals (real host), `sitemap.xml` (real host), and that
   only `*.vercel.app` hosts send `noindex`.
6. Submit sitemaps; inspect top URLs; IndexNow.

## After launch

| When | Check |
|---|---|
| Day 1–3 | Server logs or Vercel Observability for 404s; fix with redirects |
| Weekly, 4 weeks | Search Console Page indexing: "Not found (404)", "Page with redirect", "Duplicate without user-selected canonical" |
| Week 2 | Bing Webmaster Tools: crawl errors |
| Week 4–8 | Queries and clicks per page against the old site's numbers; adjust titles |

A dip of a few weeks is normal after a large migration; a lasting drop on specific pages usually
means a missing redirect or a weaker replacement page.
