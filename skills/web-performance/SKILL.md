---
name: web-performance
description: >
  Makes media-rich static and mostly static sites fast and cheap to serve without changing how
  they look. Covers Core Web Vitals (LCP, INP, CLS), fewer requests per visit, background video
  (short loops, lazy loading, phone copies cut with scripts/phone-videos.mjs), AVIF/WebP images,
  self-hosted fonts, an inline SVG logo plus favicon.ico and apple-touch-icon (scripts/icons.mjs),
  JavaScript chunking and idle-time animation setup, measured before and after with
  scripts/measure-requests.cjs (Playwright). Use it when pages feel heavy or slow, Lighthouse or
  Search Console flags Core Web Vitals, before adding video, 3D, large images or fonts, or when
  hosting requests or bandwidth run high.
license: MIT
compatibility: Node.js 18 or later. measure-requests.cjs needs Playwright with Chromium; phone-videos.mjs needs ffmpeg and ffprobe; icons.mjs needs the sharp package.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Web performance without visible change

Every page view costs requests and bytes, and on Vercel Pro requests are what a team runs out of
first. The aim: the same design, fewer requests, fewer bytes, faster first paint.

**Trade-off rule:** changes nobody can see (caching, formats, lazy loading, chunking) can just be
done. Changes people could notice (softer video, fewer animations, a missing feature) need the
person's decision: name the saving and the visible cost.

## Steps

1. **Measure first** on a deployment (local preview servers don't compress):

   ```bash
   BASE=https://<deployment> PAGES=/,/services/x/ node <skill>/scripts/measure-requests.cjs
   ```

   It reports requests and KB for a first visit and the next page, desktop and phone, by type,
   plus redirects, 404s and other hosts. How to read it:
   [references/measuring.md](references/measuring.md).
2. **Fix the biggest cost first**, usually in this order:
   - **Caching headers** so shared files load once per visitor (`vercel-static-config`).
   - **Video**: short loops, `preload="none"`, loaded near the viewport, phone copies:
     [references/video.md](references/video.md).
   - **Images**: AVIF/WebP at 2–4 widths, correct `sizes`, lazy below the fold.
   - **Fonts**: 2–3 self-hosted variable WOFF2 files.
   - **Requests that repeat**: inline logo, `favicon.ico`, `apple-touch-icon.png`, no links through
     redirects, no 404s.
   - **JavaScript**: heavy code in lazy chunks; below-the-fold animation set up in idle time.

   Details: [references/images-fonts-js.md](references/images-fonts-js.md).
3. **Measure again** and compare requests and bytes per page.
4. **Look at it:** every page you touched at 320, 390, 768, 1024 and 1440 px; video `currentSrc`
   at phone sizes; cards at 3× pixel density.
5. **Check real users after launch:** Core Web Vitals at the 75th percentile on mobile in Search
   Console (CrUX): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Lighthouse can't measure INP (it reports
   TBT instead).

## Scripts

| Script | What it does |
|---|---|
| `measure-requests.cjs` | Requests and bytes per view as the CDN sees them (Playwright, Chromium) |
| `phone-videos.mjs` | Phone copies of background videos: whole frame for small cards, an upright crop for tall sections (ffmpeg). Edit the settings block at the top |
| `icons.mjs` | Inline SVG logo `<symbol>`, `favicon.ico` (16/32/48) and `apple-touch-icon.png` (180) from the SVG logo (sharp). Edit the settings block at the top |

## Common wins

| Change | Typical effect |
|---|---|
| Phone copies of background videos | Phone home page 12.2 → 7.0 MB on the source project |
| Inline logo symbol instead of light and dark logo files | 2 requests fewer per first visit |
| `favicon.ico` + `apple-touch-icon.png` present | Repeating, uncached 404s gone |
| Animation setup moved to idle time | Mobile lab TBT 1,260 → 100 ms, same visuals |
| Long cache on hashed files and fonts | Next page: 1 request instead of 10+ |
