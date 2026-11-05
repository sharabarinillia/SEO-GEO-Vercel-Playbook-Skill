# SEO, GEO & Vercel skills

Ten agent skills that help an AI coding assistant build, launch and run websites that are **fast,
findable in search, cited by AI assistants, and cheap to host on Vercel**. Made for static and
mostly static marketing sites (Vite, Astro, Next.js static export, plain HTML, Eleventy, Hugo),
including agencies running several client sites on one Vercel Pro team.

The skills follow the open [Agent Skills](https://agentskills.io/specification) format, so the same
folders work in **Claude Code, OpenAI Codex, GitHub Copilot, Cursor, Gemini CLI, Windsurf, Cline,
Kiro** and any other tool that reads `SKILL.md` files. Each skill comes with tested, dependency-free
scripts (Node.js only) that do the checking, so the assistant measures instead of guessing.

Everything here was applied and measured on a real launch: a 31-page, multi-language static site
with background video and a 3D globe (November 2026). Prices and platform facts
carry the date they were checked.

## What's inside

<!-- skills:start -->
| Skill | What it does | Scripts |
|---|---|---|
| [`seo-geo-vercel-playbook`](skills/seo-geo-vercel-playbook/SKILL.md) | End-to-end playbook for building, launching and running fast, findable, low-cost websites on Vercel. | – |
| [`seo-technical-audit`](skills/seo-technical-audit/SKILL.md) | Technical SEO audit of a static or mostly static website, either from its build folder before deploying or from the live site through its sitemap. | `seo-audit.mjs`, `serp-width.mjs` |
| [`seo-metadata`](skills/seo-metadata/SKILL.md) | Writes and reviews each page's search-facing text and tags: title, meta description, H1, canonical, hreflang, Open Graph and share images. | `serp-width.mjs` |
| [`structured-data`](skills/structured-data/SKILL.md) | Designs, writes and validates JSON-LD structured data (schema.org) for websites. | `jsonld-check.mjs` |
| [`site-migration`](skills/site-migration/SKILL.md) | Plans and checks a website migration or relaunch without losing search traffic. | `check-redirects.mjs`, `indexnow.mjs` |
| [`geo-ai-search`](skills/geo-ai-search/SKILL.md) | GEO (generative engine optimisation): makes a website easy for AI assistants to find, read, quote and cite. | `llms-txt.mjs`, `robots-check.mjs` |
| [`web-performance`](skills/web-performance/SKILL.md) | Makes media-rich static and mostly static sites fast and cheap to serve without changing how they look. | `icons.mjs`, `measure-requests.cjs`, `phone-videos.mjs` |
| [`vercel-cost-optimization`](skills/vercel-cost-optimization/SKILL.md) | Keeps Vercel hosting at the plan price for static and mostly static sites, alone or several client sites on one Pro team. | `budget.mjs`, `measure-requests.cjs` |
| [`vercel-static-config`](skills/vercel-static-config/SKILL.md) | Writes and checks vercel.json for static and mostly static sites. | `check-headers.mjs` |
| [`vercel-firewall`](skills/vercel-firewall/SKILL.md) | Sets up and reviews the Vercel Firewall so scanners and junk traffic cost nothing while visitors, search engines and AI assistants still get in. | `firewall-rules.mjs` |
<!-- skills:end -->

The playbook skill is the entry point: it holds the launch checklist and sends each task to the
focused skill.

## What the scripts check

| Script | Skill | Checks or produces | Needs |
|---|---|---|---|
| `seo-audit.mjs` | seo-technical-audit | 49 checks on a build folder or live sitemap: titles, descriptions, canonicals, hreflang pairs, headings, broken links, missing files, images, Open Graph, JSON-LD parsing, sitemap.xml, robots.txt | Node 18+ |
| `serp-width.mjs` | seo-metadata, seo-technical-audit | Pixel width of titles (580 px) and descriptions (920 px) as Google shows them | Node 18+ |
| `jsonld-check.mjs` | structured-data | JSON-LD parse errors, unresolved `@id`s, required and recommended properties for 18 types, relative URLs, ISO dates, one organisation `@id` site-wide | Node 18+ |
| `check-redirects.mjs` | site-migration | An old→new redirect map against a live site: 301/308, one hop, right target, target answers 200; apex/www/http variants | Node 18+ |
| `indexnow.mjs` | site-migration | Tells Bing (and Copilot) which pages changed, from the sitemap's `lastmod` | Node 18+ |
| `robots-check.mjs` | geo-ai-search | Which of 16 search, AI-search, AI-user and AI-training bots may fetch which page (RFC 9309 matching) | Node 18+ |
| `llms-txt.mjs` | geo-ai-search | A draft `/llms.txt` from the built pages | Node 18+ |
| `measure-requests.cjs` | web-performance, vercel-cost-optimization | Requests and bytes per first visit and next page, desktop and phone, as the CDN sees them | Playwright |
| `phone-videos.mjs` | web-performance | Phone copies of background videos: whole frame for cards, upright crop for tall sections | ffmpeg |
| `icons.mjs` | web-performance | Inline SVG logo symbol, `favicon.ico`, `apple-touch-icon.png` | sharp |
| `budget.mjs` | vercel-cost-optimization | Monthly requests and data for every site on a team against Vercel's Flat Rate CDN tiers | Node 18+ |
| `check-headers.mjs` | vercel-static-config | Cache lifetime and compression per file type, duplicate URLs, `noindex` on previews | Node 18+ |
| `firewall-rules.mjs` | vercel-firewall | A scanner-path deny rule (CLI, REST or vercel.json), proven not to match any real file of the site | Node 18+ |

Every script prints `--help`, exits 0 when fine, 1 when it found problems and 2 when it couldn't run,
and most can write `--json` for other tools.

## Quick start

**Claude Code (plugin):**

```text
/plugin marketplace add sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
/plugin install seo-geo-vercel@seo-geo-vercel-skills
```

**Any tool, into one project (copies the skills where the tools look):**

```bash
git clone https://github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
node SEO-GEO-Vercel-Playbook-Skill/scripts/install.mjs --project path/to/your-site
```

That writes `.claude/skills/` and `.agents/skills/`, which Claude Code, Codex, GitHub Copilot,
Cursor, Gemini CLI, Windsurf and Cline read. Add `--tools kiro` for Kiro, `--user` for every
project on your machine, `--link` to symlink instead of copy, `--agents-md` for tools that only
read `AGENTS.md`. Then ask the assistant, for example:

> Audit dist/ for SEO problems before we launch.
> Will five client sites like this one fit in Vercel Pro?
> Make sure ChatGPT and Perplexity can cite us, and draft llms.txt.
> We're moving from Wix: plan the redirects and check them on the preview.

Per-tool instructions, including plugin installs for Codex, Copilot CLI and Gemini CLI:
[INSTALL.md](INSTALL.md).

## Works with

| Tool | How | Reads skills from |
|---|---|---|
| Claude Code | Plugin marketplace, or `install.mjs` | `.claude/skills/`, `~/.claude/skills/` |
| Claude (web, desktop) | Upload a skill ZIP from `dist/skills/` | – |
| OpenAI Codex | `install.mjs`, or the repo marketplace in `.agents/plugins/` | `.agents/skills/`, `~/.agents/skills/` |
| GitHub Copilot | `install.mjs`, or Copilot CLI plugin marketplace | `.github/skills/`, `.claude/skills/`, `.agents/skills/` |
| Cursor | `install.mjs` | `.cursor/skills/`, `.agents/skills/` |
| Gemini CLI | `gemini extensions install`, or `install.mjs` | `.gemini/skills/`, `.agents/skills/`, extensions |
| Windsurf | `install.mjs` | `.windsurf/skills/`, `.agents/skills/` |
| Cline | `install.mjs` | `.cline/skills/`, `.clinerules/skills/`, `.claude/skills/` |
| Kiro | `install.mjs --tools kiro`, or import a skill folder by URL | `.kiro/skills/`, `~/.kiro/skills/` |
| Others (Aider, Zed, Jules, Amp, OpenCode …) | `install.mjs --agents-md`, or paste a SKILL.md | `AGENTS.md` |

Folder locations checked against each tool's documentation in November 2026.

## How the skills behave

- **Measure first, then change, then measure again.** Each skill starts with its script.
- **Same design.** Optimisations with a visible cost (softer video, fewer animations) are proposed
  with the trade-off, never applied silently.
- **Confirmed facts only.** Titles, structured data and `llms.txt` say what the client confirmed;
  AI assistants repeat them word for word.
- **Dated numbers.** Every price and platform rule carries its check date and source, and the
  skills tell the assistant to re-check before quoting.
- **Ask before outward-facing changes:** DNS, firewall rules, billing settings and IndexNow
  submissions are prepared and shown, then applied by a person.
- **Generated files stay generated:** when a script writes `vercel.json` or a sitemap, the
  assistant changes the script.

## Repository layout

```text
skills/<name>/            one folder per skill: SKILL.md, references/, scripts/, assets/
shared/                   scripts used by several skills; copied into them by scripts/sync.mjs
scripts/                  install.mjs, validate.mjs, sync.mjs, package.mjs
tests/                    node:test suites and a fixture site full of planted mistakes
plugin.json               portable Agent Plugins manifest (Codex and other hosts)
.claude-plugin/           Claude Code plugin + marketplace
.github/plugin/           GitHub Copilot CLI plugin + marketplace
.agents/plugins/          Codex repo marketplace
gemini-extension.json     Gemini CLI extension (context: GEMINI.md)
AGENTS.md                 instructions for agents working on this repository
```

## Development

```bash
npm run check      # sync --check, validate, and the test suite (no install needed)
npm run sync       # after editing shared/ or the version in package.json
npm run package    # dist/SEO-GEO-Vercel-Playbook-Skill-<version>.zip and dist/skills/*.zip
```

No dependencies: the scripts and tests use Node's standard library only (`node --test`). Tested on
Node.js 22; CI runs Node 20, 22 and 24. See [CONTRIBUTING.md](CONTRIBUTING.md) for adding a skill
or updating a fact.

## Licence

MIT License

Copyright (c) 2026 Illia Sharabarin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Author

Illia Sharabarin. 
