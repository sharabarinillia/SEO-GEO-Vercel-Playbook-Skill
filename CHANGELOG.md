# Changelog

## 1.0.0 (5 November 2026)

First release, grown from the single `seo-geo-vercel-playbook` skill used on a client site.

- Ten skills: `seo-geo-vercel-playbook` (entry point and launch checklist), `seo-technical-audit`,
  `seo-metadata`, `structured-data`, `site-migration`, `geo-ai-search`, `web-performance`,
  `vercel-cost-optimization`, `vercel-static-config`, `vercel-firewall`.
- New scripts: `seo-audit.mjs` (49 checks, build folder or live sitemap), `jsonld-check.mjs`,
  `check-redirects.mjs`, `robots-check.mjs`, `llms-txt.mjs`, `check-headers.mjs`, `budget.mjs`,
  `firewall-rules.mjs`. Carried over: `serp-width.mjs`, `indexnow.mjs` (now with `--key` and
  `--urls`), `measure-requests.cjs`, `phone-videos.mjs` (clear error for missing files), `icons.mjs`.
- Works with Claude Code (plugin and marketplace), Codex (portable `plugin.json` and repo
  marketplace), GitHub Copilot CLI (plugin and marketplace), Gemini CLI (extension), and any tool
  that reads `.claude/skills`, `.agents/skills`, `.github/skills`, `.cursor/skills`,
  `.gemini/skills`, `.windsurf/skills`, `.cline/skills` or `.kiro/skills` (`scripts/install.mjs`).
- Facts checked 4–5 November 2026: Vercel Pro and Flat Rate CDN prices, firewall billing and bot
  rules, `vercel.json` redirect behaviour, AI crawler user agents, skill folder locations per tool.
- MIT licence (`LICENSE`), declared in `package.json`, the plugin manifests and every `SKILL.md`.
- 34 tests with `node:test`, a fixture site with planted mistakes, `validate.mjs` for the Agent
  Skills spec, `sync.mjs --check` and CI on Node 20, 22 and 24.
