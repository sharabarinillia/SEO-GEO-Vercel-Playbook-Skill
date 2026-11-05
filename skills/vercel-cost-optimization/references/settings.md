# Settings checklist (Pro team)

1. **Flat Rate CDN: on, included tier** (Billing → Flat Rate CDN). The most important setting for
   media-rich sites; without it, the source project's traffic would have cost roughly $35–40 a
   month on demand, more than the credit.
2. **Firewall** (see `vercel-firewall`): scanner-path deny rule, Bot Protection on Log then
   Challenge, AI Bots on Allow for sites that want AI citations. Blocked traffic is free.
3. **Spend management:** lower the $200 default budget (for example to $10–20 above the plan),
   with alerts on. Leave automatic pausing off: it takes every site in the team offline at once.
4. **Seats:** one developer seat. Clients who want to see their dashboard get free viewer seats.
5. **Commit identity:** a team member as commit author in every repository
   (`agents-and-commits.md`).
6. **Deployment retention:** the default keeps deployments for 30 days. Shorter retention for
   preview deployments saves a few cents; keep production long enough to roll back.
7. **Build machine:** the default Elastic machine is fine for small static builds. Check build
   minutes in Usage once a month.
8. **Deployment Protection** on previews (or `noindex` on preview hosts), so crawlers don't spend
   requests on them and they don't compete in search.
9. **Leave off unless someone pays:** Web Analytics, Speed Insights beyond the free amount, image
   optimisation (pre-generate images instead), custom preview domains, Observability Plus.
10. **Uptime monitoring** every 5–10 minutes against a small file, not every minute.

## Monthly check (10 minutes)

1. Usage → CDN requests and data transfer per project, against 1M and 1 TB for the team.
2. Usage → build minutes and deployment storage, against the $20 credit.
3. Firewall → top blocked paths and bots; add a rule for any new scanner pattern.
4. Search Console and Bing: indexing errors and new 404s.

`vercel usage` (CLI) prints usage and costs; `--from`, `--to` and `--breakdown daily` narrow it.
