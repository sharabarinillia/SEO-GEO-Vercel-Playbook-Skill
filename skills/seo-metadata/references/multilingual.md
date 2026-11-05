# Multilingual sites: hreflang, language switch, sitemap

## URL structure

- One folder per language on one domain (`/` for the main language, `/nl/` for Dutch) is the
  simplest to host, link and measure. Subdomains and separate domains also work.
- Translate the slugs too (`/nl/producten/fietsen/`, not `/nl/products/bikes/`): searchers
  see them and they carry keywords.
- Keep one shared list of page pairs (for example `routes.json`: English path → Dutch path) and
  generate everything below from it, so the pairs can't drift.

## hreflang in each page

```html
<link rel="alternate" hreflang="en" href="https://www.example.com/products/bikes/">
<link rel="alternate" hreflang="nl" href="https://www.example.com/nl/producten/fietsen/">
<link rel="alternate" hreflang="x-default" href="https://www.example.com/products/bikes/">
```

- Every version lists **all** versions, including itself, with absolute URLs.
- Every link must be confirmed from the other side (return links); one-way pairs are ignored.
- `x-default` is the page for everyone else, usually the main language.
- Codes: ISO 639-1 language, optionally a region (`en-GB`, `nl-BE`). Use a region only when the
  content really differs by country.
- Each version's canonical points to itself, never to the other language.

## hreflang in the sitemap

```xml
<url>
  <loc>https://www.example.com/products/bikes/</loc>
  <lastmod>2026-11-05</lastmod>
  <xhtml:link rel="alternate" hreflang="en" href="https://www.example.com/products/bikes/"/>
  <xhtml:link rel="alternate" hreflang="nl" href="https://www.example.com/nl/producten/fietsen/"/>
  <xhtml:link rel="alternate" hreflang="x-default" href="https://www.example.com/products/bikes/"/>
</url>
```

Declare `xmlns:xhtml="http://www.w3.org/1999/xhtml"` on `<urlset>`. Page tags and sitemap must agree.

## Language switch and internal links

- A visible switch on every page that links to the **same page** in the other language, not the
  other home page.
- Apart from the switch, pages link only to pages in their own language. A build check catches
  stray links (the source project's build fails on them).
- Don't redirect visitors by browser language or IP: crawlers come from one location and would
  only ever see one version. Suggest the other language instead.

## Writing per language

- Write titles and descriptions natively in each language, from that market's search phrases.
- Numbers and formats follow the language: `1.000 kg` in Dutch, `1,000 kg` in English.
- `og:locale` per version (`en_GB`, `nl_NL`), and `<html lang>` per page.
