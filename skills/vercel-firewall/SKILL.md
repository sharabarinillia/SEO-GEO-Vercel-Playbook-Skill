---
name: vercel-firewall
description: >
  Sets up and reviews the Vercel Firewall so scanners and junk traffic cost nothing while
  visitors, search engines and AI assistants still get in. Covers a deny rule for the paths
  vulnerability scanners probe (generated and checked against the site's real files by
  scripts/firewall-rules.mjs), Bot Protection (log first, then challenge), the AI Bots ruleset and
  its trade-off for AI citations, rate limits for forms and APIs, firewall rules in vercel.json,
  and reading the firewall log. Use it when setting up or reviewing security on Vercel, blocking
  bots, scanners or WordPress probes, deciding whether to block AI crawlers, or when usage shows
  lots of bot or 404 traffic. Changes are prepared for a person to approve.
license: MIT
compatibility: firewall-rules.mjs needs Node.js 18 or later. Applying rules needs the Vercel CLI (vercel firewall), the REST API with a token, or dashboard access.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# Vercel Firewall for static sites

A static site has no WordPress, no PHP and no `.env` file, yet scanners ask for them all day.
Each ask is a billed request and an uncached 404. A deny rule turns them into free, blocked
requests: traffic that WAF rules deny or challenge incurs no CDN requests or data transfer
(Vercel, WAF usage and pricing, checked 4 November 2026).

**The other half of the job is not blocking the wrong things:** search engines, AI search bots,
link-preview fetchers and uptime monitors.

## Steps

1. **Generate the rules and prove they match no real file:**

   ```bash
   node <skill>/scripts/firewall-rules.mjs --check-dist dist        # every file in the build
   node <skill>/scripts/firewall-rules.mjs --check-sitemap https://www.example.com/sitemap.xml
   node <skill>/scripts/firewall-rules.mjs                          # the CLI commands to apply them
   ```

   If a real path collides (a site that really serves `.log` files, say), exclude it with
   `--keep log` and check again. `--test /wp-login.php,/about/` shows single paths.
2. **Show the plan to the person and get approval.** Firewall changes are live for every visitor
   once published.
3. **Apply** with one of:
   - Vercel CLI in the linked project: the `vercel firewall rules add …` commands the script prints,
     then `vercel firewall publish --yes` (changes stay drafts until published).
   - REST API: `--format rest` prints `PATCH /v1/security/firewall/config?projectId=…&teamId=…`
     bodies (`rules.insert`).
   - `vercel.json` (routes format only, deny or challenge only): `--format vercel-json`.
   - Dashboard: Project → Firewall → Configure, using the same pattern.
4. **Bot Protection:** set to **Log** first, check the log for a few days for legitimate traffic
   that would be challenged (link previews, monitors, partners' integrations), then **Challenge**.
   Verified bots (Googlebot, Bingbot, OAI-SearchBot, Claude-SearchBot, PerplexityBot and many
   more in Vercel's directory) are not evaluated.
5. **AI Bots ruleset:** leave it on **Allow** (or Log) when the site wants to appear in AI answers.
   Its Deny blocks AI search and user-requested fetches too, not only training. To refuse training
   only, use `robots.txt` (see `geo-ai-search`) or a custom rule naming specific training bots.
6. **Verify:** `vercel firewall overview` and the Firewall tab show what was denied; test a few real
   pages and a link preview; run `robots-check.mjs --fetch` from `geo-ai-search`.
7. **Review monthly:** top blocked paths and new scanner patterns; add them to the rule.

Details and commands: [references/rules.md](references/rules.md) and
[references/bot-management.md](references/bot-management.md).

## Rules of thumb

- Deny by path only what the site can't have. Never deny `/.well-known/` (security.txt, app links,
  domain verification).
- Prefer Challenge over Deny for anything people might hit; Deny is for paths no person needs.
- Rate-limit only endpoints that take input (form handlers, APIs, search), never static pages.
- Attack Challenge Mode is for an active attack, not a permanent setting.
- Keep a way back: `vercel firewall rules disable "<name>"` and publish.
