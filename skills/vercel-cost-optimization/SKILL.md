---
name: vercel-cost-optimization
description: >
  Keeps Vercel hosting at the plan price for static and mostly static sites, alone or several
  client sites on one Pro team. Covers what Pro includes, how the Flat Rate CDN tiers work, the
  settings to change (Flat Rate CDN, spend budget, seats, retention, paid extras), the request
  budget per visit across all sites (scripts/budget.mjs), measuring requests per visit
  (scripts/measure-requests.cjs), traps such as per-minute uptime monitors, auto-pause and AI agent
  commit authors, and a monthly usage check. Use it when planning hosting or a budget, choosing a
  plan, asking "will this fit in Vercel Pro", explaining a bill or a usage spike, adding sites to a
  team, or setting up coding-agent commits so deployments aren't blocked.
license: MIT
compatibility: budget.mjs needs Node.js 18 or later; measure-requests.cjs also needs Playwright with Chromium.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Vercel costs for static sites

A static site on Vercel Pro is billed mainly for CDN requests and data transfer, and on a team
of marketing sites **requests run out before bandwidth**. Prices below were checked on
4–5 November 2026; check [Vercel's pricing pages](references/pricing.md) again before quoting a
number to anyone, and say when you checked.

## Key facts (checked 4–5 November 2026)

- Pro: $20 a month per deploying seat, including $20 of usage credit; viewer seats are free.
- Flat Rate CDN, included tier: **1M CDN requests and 1 TB a month for the whole team**. Next tiers:
  $20 (10M, 50 TB), $100 (50M), $300 (150M). Switched on in Billing → Flat Rate CDN.
- Traffic the firewall denies or challenges is not billed (see `vercel-firewall`).
- New teams get a $200 on-demand spend budget; a hard limit pauses **every** project in the team.
- On Pro, Vercel deploys only commits whose author is a member of the team.
- Hobby is for personal, non-commercial use only: client sites need Pro.

Full table with sources: [references/pricing.md](references/pricing.md).

## Steps

1. **Measure requests per visit** for each site: a first visit to the home page plus one more page,
   desktop and phone, full scroll (`measure-requests.cjs`; see `web-performance`).
2. **Add up the team:**

   ```bash
   node <skill>/scripts/budget.mjs --sites "client-a:8000:55:14,client-b:4000:40:5" --monitor-minutes 5
   #   name:visits per month:requests per visit[:MB per visit]
   node <skill>/scripts/budget.mjs --requests-per-visit 55     # visits that fit in each tier
   ```

   It adds a 10% margin for crawlers and previews, picks the Flat Rate CDN tier, and compares with
   on-demand prices.
3. **If the total is near 1M:** make each visit cheaper first (`web-performance`), block junk traffic
   (`vercel-firewall`), then accept the $20 tier if real traffic needs it.
4. **Apply the settings** in [references/settings.md](references/settings.md): Flat Rate CDN on,
   budget lowered with alerts, auto-pause off, one developer seat, preview protection, paid extras off.
5. **Set the commit author** in every repository a coding agent works in:
   [references/agents-and-commits.md](references/agents-and-commits.md).
6. **Check monthly** (10 minutes): Usage → requests and data per project against 1M / 1 TB; build
   minutes and storage against the credit; firewall's top blocked paths. `vercel usage` in the CLI
   shows the same.

## Traps

- **Uptime monitors:** a check every minute is 43,200 requests a month per site; on 10 sites that is
  43% of the included tier. Check every 5–10 minutes, against a small file.
- **Auto-pause:** a hard spend limit takes every client site offline at once.
- **Deploy volume:** every push to a connected branch builds and stores a deployment. Batch commits;
  push when a piece of work is ready.
- **404s that repeat:** browsers ask for `/favicon.ico` and `/apple-touch-icon.png` regardless;
  without the files every ask is an uncached, billed 404.
- **Media-heavy sites:** the Flat Rate CDN excludes large-scale media delivery that is most of the
  bandwidth. A few background loops are far from it; keep video bytes down anyway.
- **Paid extras** switched on by default or by a teammate: Web Analytics events, Speed Insights,
  image optimisation, custom preview domains, Observability Plus. Keep them off unless the client
  pays for them.

## Ask first

Plan changes, budgets, seats and paid add-ons are billing decisions: prepare the recommendation
with numbers, then let the account owner apply it.
