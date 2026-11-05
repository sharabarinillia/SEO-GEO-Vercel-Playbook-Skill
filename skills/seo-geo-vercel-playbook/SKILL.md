---
name: seo-geo-vercel-playbook
description: >
  End-to-end playbook for building, launching and running fast, findable, low-cost websites on
  Vercel. Made for static or mostly static marketing sites (Vite, Astro, Next.js static export,
  plain HTML), including several client sites on one Pro team. Gives the order of work, the launch
  checklist and the principles, and routes each task to the focused skill in this pack
  (seo-technical-audit, seo-metadata, structured-data, site-migration, geo-ai-search,
  web-performance, vercel-cost-optimization, vercel-static-config, vercel-firewall). Use it when
  starting, migrating, auditing or launching a website, planning hosting or budgets, or when
  someone asks "is the site ready to launch", "will this fit in Vercel Pro", "why is the site slow
  or expensive" or "how do we rank or get cited by AI", even if they don't say SEO, GEO or Vercel.
license: MIT
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# SEO, GEO and Vercel playbook

The working method behind this pack, learned on a real launch: a 31-page, multi-language static
site with background videos and a 3D globe, hosted on Vercel, with 5–10 similar client sites
planned on one Pro team. Every rule here was applied and measured there.

## Goals, in this order

1. The site works and looks the way it was designed, on every device.
2. Search engines and AI assistants can find it, understand it and quote it.
3. Hosting stays at the plan price.

Savings must not change the design or the features in a way people would notice. When an
optimisation has a visible cost (softer video, fewer animations, a missing feature), name the
trade-off and let the person decide. Optimisations without a visible cost can just be done.

## Which skill for which task

| Task | Skill |
|---|---|
| Find technical SEO problems in a build or a live site | `seo-technical-audit` |
| Write titles, descriptions, H1s, hreflang, share images | `seo-metadata` |
| Add or fix JSON-LD structured data | `structured-data` |
| Replace an old site, change URLs or domains, redirects | `site-migration` |
| Be found and cited by ChatGPT, Claude, Perplexity, Google AI, Copilot | `geo-ai-search` |
| Pages feel heavy, Core Web Vitals, video, images, fonts | `web-performance` |
| Hosting budget, plan, usage, several sites on one team | `vercel-cost-optimization` |
| vercel.json: caching, redirects, one URL per page, preview noindex | `vercel-static-config` |
| Block scanners and bad bots without blocking search or AI bots | `vercel-firewall` |

If a sibling skill is not installed, its folder name still tells you what to look up; the
principles and checklist below stand on their own.

## Principles

1. **Measure before you optimise, and after.** A page view costs requests and bytes. Measure a
   first visit and the next page on desktop and phone, then again after each change. Guesses
   about what is heavy are usually wrong.
2. **On a Vercel Pro team, requests usually run out before bandwidth.** The included Flat Rate
   CDN tier is 1M requests and 1 TB a month, shared by every site in the team (checked
   4–5 November 2026). Count requests first.
3. **Fewer, cacheable files beat smaller files.** A file the browser keeps for a month costs one
   request per visitor; a file re-checked on every view costs one request per view.
4. **One URL per page and one topic per URL.** Duplicate URLs split signals, and near-duplicate
   pages count as scaled content.
5. **State only confirmed facts.** Page copy, structured data, `llms.txt` and `robots.txt` comments
   say only what the client confirmed: certifications, opening hours, turnaround times, prices.
   AI assistants quote these word for word.
6. **Keep generated files generated.** When a script writes a file (`vercel.json`, translated
   pages, sitemaps, icons), change the script and run it again. An edit to the output is lost
   the next time someone runs the script.
7. **Date every number about prices or rules, and check it against the source on the day** you
   quote it. Platforms and search engines change faster than training data.
8. **Ask before outward-facing changes:** DNS, firewall rules, billing settings, IndexNow
   submissions and anything that publishes. Prepare them, show them, then apply.

## Launch checklist

Work top to bottom. Each line names the skill with the details.

### Build and assets (`web-performance`, `vercel-static-config`)

- [ ] Key content is static HTML; nothing important appears only after JavaScript runs.
- [ ] Caching: hashed build files a year + `immutable`; fonts a year; other static files 30 days
      with `stale-while-revalidate`; HTML revalidated on every view.
- [ ] Images: AVIF and WebP in `<picture>` with `srcset`, `sizes`, `width` and `height`; lazy below
      the fold; the main hero image eager with `fetchpriority="high"`.
- [ ] Background video: short muted H.264 loops with `faststart`, `preload="none"`, loaded near the
      viewport and paused off screen; phone copies; poster only for data saver, 2G and reduced motion.
- [ ] Fonts: 2–3 self-hosted variable WOFF2 files, Latin subset, preloaded, `font-display: swap`.
- [ ] Heavy code (3D, maps) in its own chunk, loaded near its section; render loops stop off screen.
- [ ] Inline SVG logo symbol; `favicon.ico` and `apple-touch-icon.png` exist.
- [ ] No internal link goes through a redirect; no page references a missing file.
- [ ] Rules behind calculators (weights, prices, legal limits, check digits) live in one module
      without DOM code, with known-answer tests that run before every build.

### Search (`seo-technical-audit`, `seo-metadata`, `structured-data`, `site-migration`)

- [ ] `seo-audit.mjs --dir dist` reports no errors.
- [ ] One URL per page: `/path` → `/path/` (or the reverse) with 308, apex → `www` with 301 or 308,
      the project's own `*.vercel.app` domain redirected or `noindex`.
- [ ] Every old URL answers 301/308 straight to its new page (`check-redirects.mjs`).
- [ ] Unique title (main keyword first, about 580 px), unique description (about 920 px),
      absolute canonical, one `<h1>` naming the topic, 1200 × 630 share image per page.
- [ ] Multilingual: hreflang for every language plus `x-default`, confirmed from both sides, in the
      page and the sitemap; a visible language switch.
- [ ] One connected JSON-LD `@graph` per page; `jsonld-check.mjs` reports no errors.
- [ ] Sitemap generated at build with an accurate `lastmod`; `robots.txt` links it.
- [ ] A real 404 page served with status 404. Old verification meta tags kept.

### AI assistants (`geo-ai-search`, `vercel-firewall`)

- [ ] `robots.txt` lets in the AI search and user-fetch bots; the training-bot decision is the
      client's and is written as a comment. `robots-check.mjs` confirms it.
- [ ] The firewall doesn't block the bots `robots.txt` allows (AI Bots ruleset on Allow or Log).
- [ ] Pages answer real questions first, show their numbers and name their sources.
- [ ] Pages built on yearly rules show a visible "Updated" date matching `dateModified`.
- [ ] Name, address and phone identical on the site, Google Business Profile, LinkedIn, directories.
- [ ] `/llms.txt` with a short factual summary and links to the canonical pages.

### Vercel account (`vercel-cost-optimization`, `vercel-firewall`)

- [ ] Client sites on Pro (Hobby is personal, non-commercial use only).
- [ ] Flat Rate CDN switched on with the included tier.
- [ ] Commits authored by a team member, not an AI agent's identity.
- [ ] Firewall: scanner-path deny rule; Bot Protection on Log, then Challenge.
- [ ] Spend budget lowered from the $200 default with alerts on; automatic pausing off.
- [ ] Uptime checks every 5–10 minutes, not every minute. Paid extras off unless paid for.

### After launch (first 4–8 weeks)

- [ ] Search Console and Bing Webmaster Tools: sitemap submitted, top pages inspected, Page
      indexing checked weekly for 4 weeks.
- [ ] IndexNow sent after each production deploy (`indexnow.mjs`).
- [ ] No new 404s for old URLs in either console.
- [ ] Vercel Usage checked monthly against 1M requests / 1 TB for the whole team.
- [ ] Real-user Core Web Vitals at p75 on mobile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- [ ] A baseline AI-citation check recorded, then repeated monthly.

## Budget rule of thumb

Requests per visit × visits per month, summed over every site in the team, must stay at or
below 1,000,000 to stay on the included tier. `budget.mjs` (in `vercel-cost-optimization`) does the
sum and picks the tier. The measured worked example is in
[references/worked-example.md](references/worked-example.md).

## Lessons learned

See [references/lessons.md](references/lessons.md): agent commit authors blocking deployments,
generated config edited by hand, sitemap dates that moved for no reason, headless browsers that
can't play H.264, inline SVG symbols and clip paths, floating-point noise at exact boundaries,
and a shared module that added a request to every page.
