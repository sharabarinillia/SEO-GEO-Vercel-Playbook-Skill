# Instructions for AI agents working on this repository

This repository is a pack of Agent Skills for technical SEO, GEO (AI-search visibility) and
low-cost Vercel hosting of static websites. If you are here to **use** the skills on a website,
install them into that website's project instead (`node scripts/install.mjs --project <site>`;
see `INSTALL.md`).

## Skills

<!-- skills:start -->
- **seo-geo-vercel-playbook** (`skills/seo-geo-vercel-playbook/SKILL.md`): End-to-end playbook for building, launching and running fast, findable, low-cost websites on Vercel.
- **seo-technical-audit** (`skills/seo-technical-audit/SKILL.md`): Technical SEO audit of a static or mostly static website, either from its build folder before deploying or from the live site through its sitemap.
- **seo-metadata** (`skills/seo-metadata/SKILL.md`): Writes and reviews each page's search-facing text and tags: title, meta description, H1, canonical, hreflang, Open Graph and share images.
- **structured-data** (`skills/structured-data/SKILL.md`): Designs, writes and validates JSON-LD structured data (schema.org) for websites.
- **site-migration** (`skills/site-migration/SKILL.md`): Plans and checks a website migration or relaunch without losing search traffic.
- **geo-ai-search** (`skills/geo-ai-search/SKILL.md`): GEO (generative engine optimisation): makes a website easy for AI assistants to find, read, quote and cite.
- **web-performance** (`skills/web-performance/SKILL.md`): Makes media-rich static and mostly static sites fast and cheap to serve without changing how they look.
- **vercel-cost-optimization** (`skills/vercel-cost-optimization/SKILL.md`): Keeps Vercel hosting at the plan price for static and mostly static sites, alone or several client sites on one Pro team.
- **vercel-static-config** (`skills/vercel-static-config/SKILL.md`): Writes and checks vercel.json for static and mostly static sites.
- **vercel-firewall** (`skills/vercel-firewall/SKILL.md`): Sets up and reviews the Vercel Firewall so scanners and junk traffic cost nothing while visitors, search engines and AI assistants still get in.
<!-- skills:end -->

## Layout

- `skills/<name>/`: one skill per folder: `SKILL.md` (frontmatter + instructions), `references/`
  (loaded on demand), `scripts/` (tested tools), `assets/` (templates).
- `shared/`: source of scripts used by several skills (`site-files.mjs`, `serp-width.mjs`,
  `measure-requests.cjs`). `scripts/sync.mjs` copies them into the skills listed in
  `shared/manifest.json`. Edit the shared file, never a copy.
- `scripts/`: `install.mjs`, `validate.mjs`, `sync.mjs`, `package.mjs`, `lib/skills.mjs`.
- `tests/`: `node:test` suites; `tests/fixtures/site/` is a small built site full of planted mistakes.
- Plugin manifests: `plugin.json`, `.claude-plugin/`, `.github/plugin/`, `.agents/plugins/`,
  `gemini-extension.json`. Versions come from `package.json` via `sync.mjs`.

## Rules

1. **Skills are self-contained.** A skill may name other skills, but never links or imports a file
   outside its own folder. Shared code is copied in by `sync.mjs`.
2. **Follow the Agent Skills spec.** `name` equals the folder name (lowercase, digits, single
   hyphens, at most 64 characters); `description` at most 1024 characters, no `<` or `>`, saying
   what the skill does in a short first sentence and when to use it ("Use it when …"). `SKILL.md`
   stays well under 500 lines; detail goes into `references/`.
3. **Scripts use Node's standard library only** (Node 18+), print usage with `--help`, and exit 0
   (fine), 1 (problems found) or 2 (could not run). Anything outward-facing (IndexNow, firewall,
   billing) is printed for a person to run, or needs an explicit flag.
4. **Every check has a test.** New checks get a planted mistake in `tests/fixtures/site/` or a unit
   test with a known answer; new audit check ids are documented in
   `skills/seo-technical-audit/references/checks.md` (a test enforces it).
5. **Facts carry a date and a source.** Prices, limits, crawler names and platform behaviour are
   written with the date they were checked and a link. Don't state anything you haven't verified;
   when unsure, say how to check.
6. **Generated parts stay generated.** The skill lists between the `skills:start` and `skills:end`
   comments, the shared script copies and the manifest versions are written by `npm run sync`.
7. **Before committing:** `npm run check` (sync check, validation and tests) must pass.

## Releasing

1. Update `CHANGELOG.md` and the version in `package.json`.
2. `npm run sync && npm run check && npm run package`.
3. Tag the commit `v<version>`; attach `dist/*.zip` and `dist/skills/*.zip` to the release.
