---
name: vercel-static-config
description: >
  Writes and checks vercel.json for static and mostly static sites. Covers one URL per page
  (trailingSlash, cleanUrls, redirects for /index.html, the apex domain and the project's own
  vercel.app domain), cache headers per file type, noindex on preview hosts, basic security headers
  and the 404 page, in the modern format or the legacy routes format, and keeping a generated
  config generated; scripts/check-headers.mjs checks a live deployment's caching, compression,
  duplicate URLs and preview noindex. Use it when creating or editing vercel.json, choosing cache
  headers, fixing duplicate URLs or slow repeat visits, keeping *.vercel.app out of search, or when
  a deployment fails on a route pattern.
license: MIT
compatibility: check-headers.mjs needs Node.js 18 or later and network access to the deployment.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# vercel.json for static sites

Three jobs: **one URL per page**, **the right cache lifetime per file type**, and **only the real
domain in search**. Everything else is optional.

## Steps

1. **Pick the format** (details: [references/config-formats.md](references/config-formats.md)):
   - **Modern** (`trailingSlash`, `cleanUrls`, `redirects`, `headers`): the default for new projects.
     Template: [assets/vercel.static.json](assets/vercel.static.json).
   - **Legacy `routes`**: when you need route-level features such as host-conditioned headers with
     `continue`, or firewall `mitigate` rules in the file. It can't be mixed with the modern keys.
     Template: [assets/vercel.routes.json](assets/vercel.routes.json).
2. **One URL per page.** Choose trailing slash or not, and make the other form redirect with 308
   (`trailingSlash: true` does it; paths with a file extension are left alone). Redirect
   `/index.html` URLs. Redirect the apex domain to `www` (or the reverse) in Project → Settings →
   Domains. Link internally only to the canonical form.
3. **Keep the `*.vercel.app` hosts out of search.** Redirect the project's own production
   `my-project.vercel.app` domain to the real domain (a host-scoped redirect naming that exact
   host), and send `X-Robots-Tag: noindex` on every `*.vercel.app` host, or keep previews behind
   Deployment Protection.
4. **Cache by file type** ([references/caching.md](references/caching.md)):

   | Files | Cache-Control |
   |---|---|
   | Hashed build files (`/assets/*`, `/_next/static/*`, `/_astro/*`) | `public, max-age=31536000, immutable` |
   | Fonts | `public, max-age=31536000` |
   | Other static files (images, video, posters, icons, share images) | `public, max-age=2592000, stale-while-revalidate=86400` |
   | Data files tools load | `public, max-age=86400, stale-while-revalidate=604800` |
   | HTML | Vercel's default (revalidated on every view) |

5. **Deploy a preview and check it:**

   ```bash
   node <skill>/scripts/check-headers.mjs https://www.example.com --paths /about/,/fonts/inter.woff2
   node <skill>/scripts/check-headers.mjs https://www.example.com --preview https://my-project-git-main-team.vercel.app
   ```

   It collects the home page's scripts, styles, fonts, images and videos, checks each response's
   cache lifetime and compression, tests `/page` and `/page/index.html` for duplicates, and checks
   that previews send `noindex` while the production domain doesn't.

## Rules

- **Generated config stays generated.** If a script writes `vercel.json` (redirect maps, routes),
  change the script and run it again; never hand-edit the output.
- **Route patterns are JavaScript regular expressions.** Inline flags such as `(?i)` fail the
  deployment. Validate every pattern with `new RegExp()` in the generator.
- **Never cache HTML for long:** a new deployment would show late, and a bad one would linger.
- **A long cache needs changing names.** Only content-hashed files get `immutable`; files whose
  names stay the same get days to weeks with `stale-while-revalidate`.
- **Security headers** (`X-Content-Type-Options`, `Referrer-Policy`, a CSP) are worth adding but
  test them: a strict CSP breaks inline scripts, analytics and embeds.
- **The 404 page:** a `404.html` at the build root is served with status 404 for unknown URLs.
