# Bot management on Vercel

From Vercel's Bot Management documentation and CLI reference, checked 5 November 2026.

## The three managed bot rules

| Rule | CLI id | Actions | Default | Recommended for a marketing site |
|---|---|---|---|---|
| Bot Protection | `bot-protection` | off, log, challenge | Off | Log for a few days, then Challenge |
| AI Bots | `ai-bots` | allow, log, challenge, deny | Allow | Allow (or Log) if the site wants AI citations |
| BotID | `bot-id` | basic, deep-analysis | see `bot-management` | Leave as is; it protects specific routes in apps (forms, checkout). Deep analysis isn't on Hobby |

```bash
vercel firewall bot-management                               # current actions
vercel firewall rules edit bot-protection --action log --yes && vercel firewall publish --yes
vercel firewall rules edit bot-protection --action challenge --yes && vercel firewall publish --yes
```

## What Bot Protection does

- Serves a JavaScript challenge to clients that don't behave like a browser, and to requests that
  falsely claim to be a browser (a `curl` request claiming to be Chrome).
- **Excludes verified bots** from evaluation. Vercel's verified-bots directory includes Googlebot,
  Bingbot, Applebot, DuckDuckBot, OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot,
  Claude-User, ClaudeBot, PerplexityBot, Perplexity-User and many monitors and services. Bots are
  verified by IP ranges, reverse DNS or cryptographic signatures (Web Bot Auth).
- Is available on all plans. It doesn't work well behind another reverse proxy or CDN in front of
  Vercel.
- Trusted automated traffic that isn't in the directory (a partner's integration, your own
  monitor) can skip it with a custom rule using the `bypass` action.

## What the AI Bots ruleset does

It covers "AI bots that crawl your site for training data, search purposes, or user-generated
fetches", from a list Vercel maintains. So **Deny removes the site from AI search citations as well
as training**. Choices:

- Want citations, don't mind training: **Allow**.
- Want citations, refuse training: **Allow**, and disallow the training bots in `robots.txt` (or a
  custom rule on `user_agent` for GPTBot, ClaudeBot, CCBot … if they must be enforced).
- Want neither: **Deny**, and accept that AI assistants can't cite the site.

## Before switching to Challenge

Check the log (Firewall tab, or `vercel firewall traffic inspect`) for:

- Link-preview fetchers (LinkedIn, Slack, WhatsApp, Teams, X): share a page and look at the preview.
- Uptime monitors and status pages.
- Partner integrations, feeds, webhooks into the site.
- Your own scripts (`check-headers.mjs`, IndexNow key fetch by Bing).

Anything legitimate that would be challenged gets a `bypass` rule first.

## Attack Challenge Mode

Challenges every visitor except verified bots during an active attack. Turn it on during an
attack (`vercel firewall attack-mode enable`), and off afterwards; it is not a permanent setting.
