---
name: geo-ai-search
description: >
  GEO (generative engine optimisation): makes a website easy for AI assistants to find, read,
  quote and cite. Covers ChatGPT search, Claude, Perplexity, Google AI Overviews and AI Mode, and
  Microsoft Copilot; robots.txt for AI search, user-triggered and training crawlers
  (scripts/robots-check.mjs shows which bot may fetch which page); llms.txt (scripts/llms-txt.mjs
  drafts it from the build); answer-first content with numbers and sources; entity consistency;
  firewall settings that silently block AI bots; and measuring citations. Use it when someone asks
  how to appear in or be cited by AI answers, whether to block GPTBot or other AI crawlers, what to
  put in llms.txt or robots.txt, or why AI assistants don't mention the business.
license: MIT
compatibility: Scripts need Node.js 18 or later; robots-check.mjs needs network access for live sites.
metadata:
  author: Illia Sharabarin
  version: "1.0.0"
  updated: "2026-11-05"
---

# GEO: being found and cited by AI assistants

Most of GEO is good SEO plus content that answers questions plainly with facts. The rest is
making sure the AI search bots are let in, and that the business looks the same everywhere.

## How assistants find pages

- **Google AI Overviews and AI Mode** use the normal Google index and snippets, often by splitting
  one question into several searches. A page that isn't indexed or snippet-eligible can't be used.
- **Copilot** uses Bing's index (IndexNow speeds up Bing; see `site-migration`).
- **ChatGPT, Claude and Perplexity** run their own search crawlers, separate from their training
  crawlers, plus fetchers that load a page when a user asks about it. Allowing the search
  crawlers is what makes citations possible.
- **Content must be in the HTML.** Text that appears only after client-side JavaScript may not be
  seen by these crawlers.

## Steps

1. **Decide the crawler policy with the client** (write it as a comment in `robots.txt`):
   search engines and AI search bots in (recommended for any business that wants to be found);
   AI training bots in or out (the client's choice; blocking them doesn't affect citations).
   Bot list with documentation links: [references/ai-crawlers.md](references/ai-crawlers.md).
2. **Write `robots.txt`** from [assets/robots.txt](assets/robots.txt) and check it:

   ```bash
   node <skill>/scripts/robots-check.mjs https://www.example.com --paths /,/services/,/video/a.mp4
   node <skill>/scripts/robots-check.mjs --file public/robots.txt --paths /,/blog/
   ```

   A bot with its own `User-agent` group ignores the `*` group, so repeat shared `Disallow` lines
   in every named group.
3. **Check the firewall doesn't override it.** A firewall or bot-protection rule wins over
   `robots.txt`. On Vercel, keep the AI Bots managed ruleset on Allow (or Log): its Deny also
   blocks AI search and user fetches. See `vercel-firewall`. `--fetch` shows what the site answers
   to each bot's user agent (with the caveat in the script header).
4. **Make pages quotable:** answer first, show numbers and their sources, FAQs from real enquiries,
   visible "Updated" dates on pages built on yearly rules. Patterns:
   [references/content-patterns.md](references/content-patterns.md).
5. **Keep the entity consistent:** identical name, address and phone on the site, Google Business
   Profile, LinkedIn and directories; one Organization `@id` with `sameAs` links (`structured-data`).
6. **Publish `/llms.txt`:** draft it from the build, then edit it down to confirmed facts:

   ```bash
   node <skill>/scripts/llms-txt.mjs --dir dist --out llms-draft.txt
   ```

   Template: [assets/llms.txt](assets/llms.txt). Google Search doesn't use it; it costs nothing and
   other assistants may read it.
7. **Measure monthly:** a fixed set of questions asked to each assistant, plus Search Console and
   Bing reports: [references/measuring.md](references/measuring.md).

## What not to do

- Pages per city, per product code or per query variation with swapped names: that is scaled
  content abuse, for search and for AI.
- Rewriting pages into fragments "for AI": Google says it isn't needed.
- Bought or fake mentions, reviews or citations.
- Unconfirmed claims anywhere (certifications, response times, coverage): assistants repeat them
  as facts.
- Blocking the AI search bots by accident, through `robots.txt`, the firewall or bot protection.
