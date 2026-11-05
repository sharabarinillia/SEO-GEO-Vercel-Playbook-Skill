---
name: structured-data
description: >
  Designs, writes and validates JSON-LD structured data (schema.org) for websites. Builds one
  connected @graph per page (Organization or LocalBusiness, WebSite, WebPage, BreadcrumbList,
  Service, Product, Article, FAQPage, SoftwareApplication, Event) linked by stable @id values and
  generated at build time; scripts/jsonld-check.mjs checks every page of a build or live site for
  parse errors, unresolved @id references, required and recommended properties, absolute URLs and
  ISO dates. Use it when adding schema markup, chasing rich results, fixing Search Console
  structured-data errors, or making a business's facts (address, services, opening hours,
  certifications) machine-readable for search engines and AI assistants.
license: MIT
compatibility: jsonld-check.mjs needs Node.js 18 or later.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Structured data (JSON-LD)

Structured data tells machines what a page is about: which business, which service, which
answer. It drives rich results where Google still shows them, and it helps search engines and AI
assistants read facts without guessing. Google says it is not required for its AI features, but
it costs little when it is generated from the same data as the page.

## Principles

1. **One `@graph` per page**, in one `<script type="application/ld+json">` block, generated at
   build time with `JSON.stringify` (never by string concatenation).
2. **Stable `@id`s** link the nodes: `https://www.example.com/#org` for the business on every page,
   `#website`, and `<page URL>#webpage` per page. Reference with `{ "@id": "…" }`.
3. **Every page's graph is self-contained**: if a node is referenced, it is defined on that page
   (repeat the Organization node; it's small).
4. **Facts only, and the same facts as the page.** Markup that claims what the page doesn't show
   (reviews, prices, hours) breaks Google's guidelines and gets repeated by AI assistants.
5. **`dateModified` comes from the same source as the sitemap's `lastmod`**, the date the visible
   content last changed.
6. **Absolute URLs, ISO 8601 dates** (`2026-11-05` or `2026-11-05T09:30:00+01:00`).

## Steps

1. **Pick the types.** Organization or a LocalBusiness subtype (one business, everywhere); WebSite;
   WebPage (or AboutPage, ContactPage, CollectionPage) per page; BreadcrumbList on inner pages;
   then the page's own node: Service, Product, Article, SoftwareApplication (free tools), Event,
   FAQPage (questions answered on the page), DefinedTermSet (glossaries, reference charts).
   Patterns: [references/graph-patterns.md](references/graph-patterns.md).
2. **Start from the template** [assets/graph-template.json](assets/graph-template.json) and fill
   it from the site's content data, not by hand per page.
3. **Generate it in the build** (a template partial, a Vite/Astro plugin, or `generateMetadata` in
   Next.js) and inject it into the `<head>`.
4. **Validate every page:**

   ```bash
   node <skill>/scripts/jsonld-check.mjs --dir dist          # build folder
   node <skill>/scripts/jsonld-check.mjs --sitemap https://www.example.com/sitemap.xml
   ```

   Errors (parse failures, unresolved `@id`s, missing required properties, relative URLs, bad
   dates) must be fixed; make the build fail on them. Warnings list recommended properties: add
   one only when the fact is confirmed (no opening hours you don't have).
5. **Spot-check rich results** for 3–5 key pages in Google's
   [Rich Results Test](https://search.google.com/test/rich-results) and the
   [Schema Markup Validator](https://validator.schema.org/).
6. **After launch,** watch Search Console's enhancement reports for errors.

## What to expect from rich results

Google's supported rich results change often; check the
[Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
before promising one. Notes as of November 2026 are in
[references/rich-results.md](references/rich-results.md). Markup Google no longer shows does no harm
and still describes the page to other consumers.

## Don'ts

- No markup for content that isn't visible on the page.
- No fake or self-written reviews and ratings.
- No `LocalBusiness` without a real address the business confirms.
- No separate, conflicting graphs from plugins and hand-written blocks on one page: merge them.
