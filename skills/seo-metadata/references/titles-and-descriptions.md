# Titles, descriptions and previews: research and examples

Researched October 2026; check the sources again before quoting them.

## What search engines say

- **Title links** come from the `<title>`, the main visible heading, other prominent text and
  anchor text. There is no length limit; titles are cut to fit the device. Google rewrites titles
  that are boilerplate, keyword-stuffed, or don't match the page.
  ([Google: title links](https://developers.google.com/search/docs/appearance/title-link))
- **Snippets** come from the meta description or from page text. No length limit; cut to fit.
  Write a unique description per page that summarises it like a short pitch.
  ([Google: snippets](https://developers.google.com/search/docs/appearance/snippet))
- **AI features** use the same index and snippets: a page that isn't indexed or snippet-eligible
  can't be used in AI Overviews or AI Mode.
  ([Google: AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), May 2026)

## Pixel widths

Desktop results show about 580 px of a title (20 px Arial) and about 920 px of a description
(14 px Arial). `serp-width.mjs` uses Arial's character widths, so "WWW" counts wider than "iii".
Mobile results wrap to more lines, so desktop is the binding limit.

```bash
node serp-width.mjs "Chargeable & volumetric weight calculator | Brand"
# title: 443 px of about 580
```

In a build script, import it: `import { serpWidth, TITLE_PX, DESCRIPTION_PX } from './serp-width.mjs'`.

## Patterns

| Page type | Title | Description |
|---|---|---|
| Home | `Brand: what you do, where` | Who you serve, what makes you different, since when, one proof point |
| Service | `Service phrase + differentiator \| Brand` | What's included, for whom, where, certification or number, call to action |
| Free tool | `What it calculates + "calculator" \| Brand` | Inputs and output in plain words, the rule it follows, that it's free |
| Reference page | `Topic: the answer in brief \| Brand` | The question it answers and the scope (years, regions, edition) |
| Contact | `Contact & request a quote \| Brand` | Address, phone, what to send for a quick quote |

## Examples

| | Before | After |
|---|---|---|
| Title | `Home` | `Air and sea freight from Frankfurt since 1998 \| Brand` |
| Title | `Weight, made simple.` (a tagline, no topic) | `Chargeable & volumetric weight calculator \| Brand` |
| Title | `Air freight services, air cargo, airfreight Frankfurt, air shipping` (stuffed) | `Air freight from Frankfurt, dangerous goods certified \| Brand` |
| Description | `Welcome to our website.` | `Import and export air freight from Frankfurt: dangerous goods, temperature-controlled pharma, customs clearance and bonded storage.` |

## Open Graph and X cards

```html
<meta property="og:type" content="website">
<meta property="og:site_name" content="Brand">
<meta property="og:title" content="Air freight | Brand">
<meta property="og:description" content="One or two sentences for people, not search engines.">
<meta property="og:url" content="https://www.example.com/services/air-freight/">
<meta property="og:image" content="https://www.example.com/og/air-freight.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
```

- The share image must be an absolute URL, 1200 × 630, under about 1 MB; JPEG or PNG are safest.
- Previews are cached by each platform; after a change use the platform's inspector (for
  example LinkedIn's Post Inspector) to refresh.
- Firewall bot rules can block preview fetchers: check a share after turning on Bot Protection.

## Other tags worth having

- `<meta name="robots" content="max-image-preview:large">` lets large image previews show in
  Search and Discover.
- Keep the old site's `google-site-verification` and `msvalidate.01` tags through a migration.
- Icons: SVG icon, `favicon.ico` and `apple-touch-icon.png` (browsers ask for the last two anyway).
