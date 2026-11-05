# Audit checks: why each matters and how to fix it

Every check id `seo-audit.mjs` reports, grouped as in the report. E = error, W = warning.

## Contents

1. Head of the page
2. Content
3. Links and files
4. Languages (hreflang)
5. Structured data
6. Site files
7. Live mode

## 1. Head of the page

| Id | | Why | Fix |
|---|---|---|---|
| `html-lang` | E | Search engines and screen readers use it to know the language | `<html lang="en">` (or `nl`, `de-CH` …) in the template |
| `viewport` | E | Without it phones render a zoomed-out desktop page; mobile-first indexing judges that page | `<meta name="viewport" content="width=device-width, initial-scale=1">` |
| `noindex` | W | The page will drop out of search. Fine for thank-you pages and drafts; fatal on a real page | Remove `noindex` from the robots meta (and from any `X-Robots-Tag` header) |
| `title-missing` | E | The title is the main input for the result's title link | A unique `<title>`: main keyword first, brand last |
| `title-width` | W | Over about 580 px (20 px Arial) the title is cut on desktop results | Shorten; keep the keyword in the first 40 characters. Measure with `serp-width.mjs` |
| `title-duplicate` | E | Two pages with one title compete for the same query and look like duplicates | Name each page's own topic in its title |
| `description-missing` | E | Search engines invent a snippet from page text, often badly | A unique `<meta name="description">` that reads like a short pitch |
| `description-width` | W | Over about 920 px (14 px Arial) the snippet is cut on desktop | Shorten to the point; keep the facts that sell the click |
| `description-short` | W | Under 100 characters rarely says enough to earn the click (a heuristic, not a rule) | Add the concrete facts: what, where, for whom, a number |
| `description-duplicate` | E | Same as duplicate titles | Write one per page |
| `canonical-missing` | E | Without it, URL variants (parameters, slashes) may be indexed separately | `<link rel="canonical" href="https://www.example.com/path/">` on every page |
| `canonical-relative` | E | Relative canonicals are allowed but easily resolve to the wrong host or path | Use the absolute URL on the production host |
| `canonical-host` | E | Pointing at another host (staging, `*.vercel.app`, the apex) hands the page to that host | Use the production origin everywhere (one constant in the build) |
| `canonical-other-page` | W | The page asks to be dropped in favour of another URL | Intentional for duplicates only; otherwise point it at itself |
| `canonical-duplicate` | W | Several pages declare one canonical: all but one will be dropped | Check the template builds the canonical from each page's own path |
| `og-missing` | W | Link previews in LinkedIn, Slack, WhatsApp, X fall back to guesses | `og:title`, `og:description`, `og:image` (1200 × 630) per page |
| `og-image-relative` | E | The Open Graph protocol needs an absolute URL; relative ones show no image | `https://www.example.com/og/page.jpg` |

## 2. Content

| Id | | Why | Fix |
|---|---|---|---|
| `h1-missing` | E | The `<h1>` names the topic; Google may use it for the title link | One `<h1>` per page with the topic words (a tagline alone wastes it) |
| `h1-multiple` | W | Allowed by HTML, but splits the main topic signal | Keep one; turn the others into `<h2>` |
| `h1-empty` | E | An empty or image-only `<h1>` names nothing | Text in the `<h1>`; visually hidden text is acceptable if the design needs an image |
| `heading-skip` | W | Skipped levels (h2 → h4) break the outline for screen readers and parsers | Use the next level; style it to look smaller if needed |
| `img-alt` | E | Images without `alt` are an accessibility failure and lose image search | Describe content images; `alt=""` for decoration |
| `img-size` | W | Without `width` and `height` the layout jumps while images load (CLS) | Add the intrinsic size; CSS can still scale the image |
| `html-size` | W | Very large HTML is slow; this project's research recorded that Googlebot reads only the first 2 MB of an HTML file (March 2026) | Move inline data and SVG sprites to cacheable files |

## 3. Links and files (build folder only)

| Id | | Why | Fix |
|---|---|---|---|
| `link-broken` | E | Visitors and crawlers hit a 404 | Fix the link or restore the page (and redirect the old URL) |
| `link-redirect` | W | The link lacks the trailing slash the page lives at: each click costs a redirect, or the site serves a duplicate URL | Link the canonical form (`/about/`) |
| `link-index-html` | W | `/about/index.html` is a second URL for `/about/` | Link `/about/`; redirect `/index.html` URLs with 308 |
| `file-missing` | E | A script, style, image, video or share image the page needs is not deployed: broken page, and each request is an uncached 404 | Add the file, fix the path, or remove the reference |

## 4. Languages (hreflang)

| Id | | Why | Fix |
|---|---|---|---|
| `hreflang-code` | E | Invalid codes are ignored | ISO 639-1 language, optional ISO 3166-1 region: `en`, `nl`, `en-GB`, `x-default` |
| `hreflang-relative` | E | hreflang URLs must be absolute | Full URLs on the production host |
| `hreflang-self` | E | Each page must list itself among its alternates | Add the page's own language and URL |
| `hreflang-x-default` | W | Without it, searchers in other languages get no designated fallback | Add `x-default`, usually the main language's page |
| `hreflang-return` | E | Alternates must link back; one-way links are ignored | Generate hreflang from one shared page-pair list (e.g. `routes.json`) |

## 5. Structured data

| Id | | Why | Fix |
|---|---|---|---|
| `jsonld-parse` | E | One syntax error (a trailing comma) discards the whole block | Generate JSON-LD with `JSON.stringify`, never by string concatenation |
| `jsonld-context` | W | Without a schema.org `@context` the vocabulary is unknown | `"@context": "https://schema.org"` |

Deeper checks (references, required properties, dates) are in the `structured-data` skill.

## 6. Site files

| Id | | Why | Fix |
|---|---|---|---|
| `robots-missing` | W | Crawlers assume everything is allowed, but the sitemap goes unannounced | Add `robots.txt` with a `Sitemap:` line |
| `robots-blocks-all` | E | `Disallow: /` for `*` keeps the whole site out of search (a staging leftover) | Allow the site; block only what must stay out |
| `robots-sitemap` | W | The sitemap is easier to find when `robots.txt` names it | `Sitemap: https://www.example.com/sitemap.xml` |
| `404-missing` | W | The host shows a generic error page with no way back into the site | A `404.html` with the normal header, footer and links |
| `sitemap-missing` | W | Search engines find pages slower; `lastmod` can't signal changes | Generate `sitemap.xml` at build time from the page list |
| `sitemap-empty` | E | An empty sitemap is a broken build step | Check the generator's page list |
| `sitemap-bad-url` | E | Unparseable entries are ignored | Absolute, escaped URLs (`&amp;` for `&`) |
| `sitemap-host` | E | URLs on another host (staging, apex) are ignored or index the wrong host | One production origin constant for the whole build |
| `sitemap-url-missing` | E | The sitemap lists a page that doesn't exist: crawl budget spent on 404s | Generate the sitemap from the built pages, not a hand-kept list |
| `sitemap-url-redirects` | W | Listed URLs should be final: no redirect | List the canonical form |
| `sitemap-lastmod` | E | `lastmod` must be a W3C date (`2026-11-05` or with time and zone) | Write ISO dates; Google uses `lastmod` only when it is consistently accurate |
| `sitemap-page-missing` | W | An indexable page the sitemap doesn't list is found later, if at all | Include every indexable page; leave out `noindex` pages and redirects |

## 7. Live mode

| Id | | Why | Fix |
|---|---|---|---|
| `sitemap-url-not-200` | E | A listed URL answers an error or redirects to one | Remove it from the sitemap, restore the page, or redirect it |
| `site-unknown` | W | Without a production origin, host checks are skipped | Pass `--site https://www.example.com` or add an absolute canonical to the home page |
| `link-broken` / `link-redirect` (with `--check-links`) | E/W | As above, measured on the live site | As above |
