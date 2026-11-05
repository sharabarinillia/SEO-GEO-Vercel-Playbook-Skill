# Measuring requests, bytes and Core Web Vitals

## measure-requests.cjs

```bash
npm i -D playwright && npx playwright install chromium     # once, or set PLAYWRIGHT to an existing install
BASE=https://www.example.com PAGES=/,/services/air-freight/,/contact/ OUT=requests.json node measure-requests.cjs
```

| Variable | Meaning |
|---|---|
| `BASE` | The site. Measure a deployment: `vite preview` doesn't compress and sends no-cache, so text bytes are too high and the next page re-checks files |
| `PAGES` | Comma-separated paths measured as first visits (default `/`) |
| `NEXT` | The page opened after each first visit (default: `/` after any other page, the second page after `/`) |
| `OUT` | Optional JSON file with every request |
| `PLAYWRIGHT` | Path to an existing Playwright install if it isn't in the project |

Each page is loaded in a fresh browser (empty cache), scrolled to the bottom so lazy media load
(worst case), then the next page is opened in the same session. Desktop (1440 × 900) and phone
(390 × 844, 3×).

## Reading the output

- **First-visit requests:** the main budget figure. By type: images, videos, posters, fonts, scripts.
- **Next-page requests:** shared files should come from the browser cache. Fonts or scripts showing
  up again mean the caching headers are wrong.
- **A revisit of a seen page** should be 1 request (the HTML).
- **Redirects** on a first visit mean a link or asset path goes through a redirect.
- **404s** are uncached requests on every view: add the file or remove the reference.
- **Other hosts** are third parties (analytics, fonts, maps): each adds a connection and a dependency.

## Lab and field

- **Lighthouse** (mobile, 5–6 key pages) after each big change: SEO and Accessibility stay at 100,
  Performance doesn't drop. TBT stands in for INP in the lab.
- **Field data** (what ranking uses): Search Console Core Web Vitals (CrUX) at p75 on mobile:
  LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Vercel Speed Insights also measures field data, at a cost.
- Low-traffic sites may have no CrUX data; then rely on lab tests and keep pages light.
