# Worked example: the source project

A 31-page multi-language static site (15 pages per language, plus a 404) built with Vite, Tailwind, GSAP and
three.js, hosted on Vercel Pro. Measured on 4 November 2026 with `measure-requests.cjs` (full
scroll, so every lazy image and video loaded: the worst case).

## Requests and data per view

| View | Requests | Data |
|---|---|---|
| Home page, first visit, desktop | 42 | 14.9 MB |
| Home page, first visit, phone (after phone videos) | 38 | 7.0 MB |
| Next page after the home page | 12–14 | 0.25–0.33 MB |
| A page whose files are already cached | 1 | 18 KB |

Video was 84% of the home page's bytes on desktop.

## The budget

- A visit to the home page plus one more page is about 55 requests.
- 1,000,000 ÷ 55 ≈ 18,000 such visits a month for the whole team, using about 240 GB of the 1 TB.
- Lighter sites go further. Above that, the next Flat Rate CDN tier costs $20 a month for 10M
  requests (prices checked 4–5 November 2026).
- Builds (about 10 s each) and deployment storage for 5–10 such sites cost roughly $1–8 a month,
  inside Pro's $20 usage credit. Total: $20 a month while traffic stays under the tier.

## What moved the numbers

| Change | Effect |
|---|---|
| Phone copies of the background videos (whole frame for cards, upright crop for tall sections) | Phone home page 12.2 → 7.0 MB; service-page videos 41–55% smaller; SSIM 0.95–0.99 against the originals |
| Inline SVG logo symbol instead of two logo files | 2 requests fewer per first visit |
| `favicon.ico` and `apple-touch-icon.png` added | Repeating 404s gone (browsers ask for them anyway) |
| Shared module grouped with an existing chunk | 1 request fewer on every first visit to tool pages |
| Below-the-fold animation set up in idle time | Lab TBT on mobile 1,260 ms → 100 ms, same visuals |
| Unused image sets and font packages removed | Smaller deployments, faster installs; nothing visible |

## Settings applied

Flat Rate CDN on (included tier); spend budget lowered with alerts; one developer seat; commits
authored by the human team member; scanner-path firewall rules and Bot Protection prepared for
launch day; `noindex` on the `*.vercel.app` host.
