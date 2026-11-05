---
name: seo-technical-audit
description: >
  Technical SEO audit of a static or mostly static website, either from its build folder before
  deploying or from the live site through its sitemap. Checks titles, descriptions, canonicals,
  hreflang pairs, headings, broken internal links and missing files, links through redirects,
  images without alt or size, Open Graph tags, JSON-LD that doesn't parse, sitemap.xml and
  robots.txt, with scripts/seo-audit.mjs (Node.js, no packages), and explains every finding with
  its fix. Use it before a launch or migration, after big content or template changes, as a build
  step that fails on errors, or when someone asks to audit, check or crawl a site for SEO
  problems, broken links, duplicate titles or hreflang errors.
license: MIT
compatibility: Needs Node.js 18 or later. Live mode needs network access to the site.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Technical SEO audit

Finds the mechanical problems that keep pages out of search or split their signals. It does not
judge content quality or keywords (see `seo-metadata`), structured-data details (see
`structured-data`) or speed (see `web-performance`).

## Steps

1. **Build the site** (`npm run build` or the project's command). The audit reads the output
   folder: `dist/`, `out/`, `build/` or `public/`.
2. **Run the audit** from the project root:

   ```bash
   node <skill>/scripts/seo-audit.mjs --dir dist --site https://www.example.com
   ```

   - `--site` is the production origin. Without it, the home page's canonical is used.
   - On a live site: `--sitemap https://www.example.com/sitemap.xml` fetches every listed page;
     add `--check-links` to also request internal links that aren't in the sitemap.
   - `--json report.json` writes every finding; `--strict` also fails on warnings.
3. **Read the report.** Findings are grouped by check id. Errors keep pages out of search or break
   something; warnings cost ranking, clicks or requests. Look up each id in
   [references/checks.md](references/checks.md) for why it matters and how to fix it.
4. **Fix at the source,** never in the build output: the page template, the content file, the
   generator script or the CMS. Then rebuild and run the audit again until no errors remain.
5. **Keep it in the build** so mistakes can't ship. In `package.json`:

   ```json
   "scripts": { "postbuild": "node scripts/seo-audit.mjs --dir dist" }
   ```

   Copy `seo-audit.mjs`, `site-files.mjs` and `serp-width.mjs` into the project's `scripts/` for
   that. The exit code is 1 when there are errors, so the build stops.

## Reading the results

- **Zero findings on a mature site is normal.** On a new site, expect dozens: start with errors
  that repeat on every page (a template problem fixes many at once).
- **Warnings are judgement calls.** A title over 580 px is cut on desktop results but may still be
  right if the keyword comes first. A second `<h1>` is allowed by HTML but weakens the topic
  signal. Explain the trade-off rather than "fixing" blindly.
- **`canonical-other-page` is often intentional** (a print version, a filtered list). Confirm with
  the person before changing it.
- **Live mode can't see missing files** the way the build check can; run the build check too.

## What it checks

| Area | Checks |
|---|---|
| Head | `<html lang>`, viewport, title (present, unique, width), description (present, unique, width, length), canonical (present, absolute, same host, self or other page), robots `noindex`, Open Graph |
| Content | one non-empty `<h1>`, no skipped heading levels, images with `alt` and size, HTML under 2 MB |
| Links and files | internal links to pages that don't exist, links without the trailing slash, links to `/index.html`, scripts, styles, images, video and share images missing from the build |
| Languages | hreflang codes, absolute URLs, self link, `x-default`, the return link from every alternate |
| Structured data | every JSON-LD block parses and names schema.org (graph checks: `structured-data`) |
| Site files | `robots.txt` present, not blocking everything, naming the sitemap; `sitemap.xml` URLs exist, are on the site's host, end in the right slash, have valid `lastmod`; every indexable page listed; a `404.html` |

## Notes

- The parser reads HTML as written, so it sees what search engines see before JavaScript runs.
  Content that only appears after JavaScript is invisible to it (and partly to crawlers).
- Pixel widths come from `serp-width.mjs` (Arial metrics, 20 px titles, 14 px descriptions). Google
  has no length limit; results are cut to fit the device.
- `noindex` pages are left out of duplicate and sitemap checks; the 404 page is checked for
  existence only.
