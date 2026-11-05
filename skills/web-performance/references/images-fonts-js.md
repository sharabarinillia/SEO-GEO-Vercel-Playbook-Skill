# Images, fonts, requests and JavaScript

## Images

- Pre-generate AVIF and WebP at 2–4 widths with `sharp` at build or asset time and serve them as
  static files; no paid image optimisation service is needed for a static site.
- `<picture>` with AVIF and WebP `<source>`s, `srcset`, a correct `sizes`, and `width` and `height`
  on the `<img>` (no layout shift).
- `loading="lazy"` and `decoding="async"` below the fold. The hero (LCP) image: not lazy,
  `fetchpriority="high"`.
- Decorative images `alt=""`; content images get alt text that says what is in them.
- Before shrinking an image, check how big it is really shown. A 16:9 poster in a tall phone hero
  is already stretched about 2.7×, so a smaller file would blur it. Lab tools flag this as a
  saving: a false positive.
- Delete image sets no page uses: everything in the static folder ships with every deployment.

## Fonts

- Self-host 2–3 variable WOFF2 files (Latin subset). Preload the ones used above the fold.
- `font-display: swap` and a matching fallback stack (or `size-adjust` on the fallback to reduce
  the layout shift when the font arrives).
- Copy the files into the static folder once, then remove font packages you no longer import.

## Fewer requests

Requests are what a Vercel Pro team runs out of first, so each one saved on every first visit counts.

- **Inline logo:** one SVG `<symbol>` per page, drawn with `<use>` in header and footer, coloured
  with `currentColor` (replaces separate light and dark logo files). Put the symbol in a zero-size,
  absolutely positioned `<svg>`: a `display: none` holder breaks clip paths. Rounding path points
  to 0.1 (absolute commands only) makes the markup a fifth smaller with no visible change.
- **Icons:** `favicon.ico` (16, 32, 48 px) and `apple-touch-icon.png` (180 px, opaque) with
  `<link rel="apple-touch-icon">`. Browsers ask for both anyway; missing ones are repeating 404s.
- **Internal links** go to the canonical URL with the right trailing slash: a link through a
  redirect costs two requests.
- **Small images** (badges, flags, partner logos) add a request each. Combine them into a sprite
  only when the count is high.
- **Crawlers:** disallow decorative media (`/video/`, 3D textures) in `robots.txt`.
- **404 page:** keep it small; scanners hit it constantly. Block them in the firewall instead.

## JavaScript and animation

- Split heavy code (three.js, maps, large data) into lazy chunks loaded when their section is near,
  for example 2.5 screens before it.
- Render loops (WebGL, canvas) run only while their section is visible: an IntersectionObserver
  flag checked inside the ticker.
- Set up below-the-fold animations (text splits, scroll reveals) in idle time or on the first
  scroll, touch or key, not at load. On the source project that cut mobile lab TBT from 1,260 ms
  to 100 ms with identical visuals.
- Respect `prefers-reduced-motion`: show the end state and skip video.
- A ticker that measures layout every frame costs CPU even when nothing moves: cache measurements
  and update them on resize.
- Watch the script count per page after adding a shared module. Bundlers put a module shared by a
  few pages into its own file: one more request per first visit. Group it with a chunk those pages
  already load. With Rolldown (Vite 8):
  `output.codeSplitting: { includeDependenciesRecursively: false, groups: [{ name, test }] }`;
  without that flag the group also swallows its dependencies and every page loads them.

## Rules behind tools

Calculators and checkers (weights, prices, legal limits, check digits) keep their rules in one
module without DOM code, with a known-answer test (`node --test`) that runs before every build.
A wrong factor then stops the deploy instead of reaching customers. Round domain values (for
example to a millionth) before comparing at exact boundaries: floating-point noise turned exactly
one full trailer into "2 trailers" once.
