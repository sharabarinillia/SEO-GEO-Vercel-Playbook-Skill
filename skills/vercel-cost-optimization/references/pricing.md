# Vercel plan facts and prices

Checked on 4–5 November 2026 on the pages linked. Check them again before quoting, and write the
date next to every number. When a price changes, also update `TIERS` and `CHECKED` in
`scripts/budget.mjs`.

| Item | Pro | Source |
|---|---|---|
| Platform fee | $20 a month, includes $20 of usage credit and 1 deploying seat | [Pro plan](https://vercel.com/docs/plans/pro-plan) |
| Extra developer seats | $20 a month each. Viewer seats are free and unlimited | [Pro plan](https://vercel.com/docs/plans/pro-plan) |
| Usage credit | $20 a month, expires at month end. Email at 75%; above it, usage is billed on demand | [Pro plan](https://vercel.com/docs/plans/pro-plan) |
| Flat Rate CDN, included tier | 1M CDN requests and 1 TB data transfer a month, for the whole team | [Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn) |
| Higher tiers | $20/mo: 10M requests, 50 TB. $100/mo: 50M, 50 TB. $300/mo: 150M, 50 TB | [Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn) |
| Tier changes | A month over capacity moves the team up at the start of the next cycle; a one-day spike doesn't. Above the highest tier: on demand | [Flat Rate CDN](https://vercel.com/docs/pricing/flat-rate-cdn) |
| On-demand CDN (without the flat rate) | Data transfer from $0.15 per GB, CDN requests from $2 per million, by region | [Pricing](https://vercel.com/pricing) |
| Builds | New teams use Elastic machines ($0.0035 per CPU-minute). Basic $0.007/min, Standard $0.014, Enhanced $0.028, Turbo $0.105 | [Pricing](https://vercel.com/pricing) |
| Deployment storage | $0.10 per GB-month for new Pro teams. Measured as each project's daily maximum, summed over the month | [Deployment Storage](https://vercel.com/docs/deployment-storage) |
| Firewall | Traffic that WAF rules deny, challenge or rate-limit incurs no CDN requests and no data transfer. Requests that pass a challenge count as normal | [WAF usage and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing) |
| Spend management | New teams get a $200 on-demand budget with email, web and SMS alerts. An optional hard limit pauses all projects | [Pricing](https://vercel.com/pricing) |
| Web Analytics | $3 per 100,000 events | [Pricing](https://vercel.com/pricing) |
| Custom preview domain suffix | $100 a month | [Pricing](https://vercel.com/pricing) |
| Hobby | Personal, non-commercial use only. Client sites need Pro | [Pricing](https://vercel.com/pricing) |

The Flat Rate CDN covers CDN requests, Fast Data Transfer, Blob and Sandbox data transfer, and the
observability events from CDN requests. It "is not eligible for … large-scale delivery of media or
files where such delivery constitutes a majority of bandwidth usage".

## What a static site is billed for

- **CDN requests:** every file a browser, crawler, monitor or scanner fetches, including 304
  "not modified" answers and redirects. Usually the first limit a static site reaches.
- **Data transfer:** the bytes sent. Rarely the limit for static sites under the flat rate.
- **Builds:** each deployment's build minutes, paid from the credit. A 10-second Vite build plus
  install costs about a cent.
- **Deployment storage:** every retained deployment's output. Example: 37 MB × 50 deployments a
  month kept 30 days ≈ 1.9 GB ≈ $0.19 a month per site.
- **Not billed:** traffic the firewall blocks, and files the browser kept in its cache.

Static sites have no functions, so function CPU, invocations and origin transfer stay at zero.
Keep it that way unless a feature needs a server: a form backend can be an external service.

## Worked example

The source project (a 31-page static site with background video), 4 November 2026: about 55
requests per two-page visit, so the included tier holds
about 17,000–18,000 such visits a month for the whole team, using about 240 GB. Builds and storage
for 5–10 such sites: roughly $1–8 a month, inside the credit. Total: $20 a month while traffic
stays under the tier. Without the flat rate the same traffic would cost roughly $35–40 a month on
demand.
