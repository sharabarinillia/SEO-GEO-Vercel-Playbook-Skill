# Install

Every tool below reads the same skill folders (the open [Agent Skills](https://agentskills.io)
format); they only look in different places. The universal route works everywhere:

```bash
git clone https://github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
node SEO-GEO-Vercel-Playbook-Skill/scripts/install.mjs --project path/to/your-site
```

That copies the skills into `.claude/skills/` and `.agents/skills/` of the project, which covers
Claude Code, Codex, GitHub Copilot, Cursor, Gemini CLI, Windsurf and Cline. Commit those folders
so everyone working on the site gets them. Needs Node.js 18 or later.

| Option | Effect |
|---|---|
| `--tools claude,agents,copilot,cursor,gemini,windsurf,cline,kiro` | Choose the tool folders (`--all` for every one; `--list` shows them) |
| `--user` | Install into your home folder for every project instead of one project |
| `--skills geo-ai-search,vercel-firewall` | Only some skills |
| `--link` | Symlink to this checkout instead of copying, so `git pull` updates every project |
| `--agents-md` | Also write a skills section into the project's `AGENTS.md`, for tools that read only that |
| `--force` | Replace skills already installed (after an update) |
| `--dry` | Show what would happen |
| `--uninstall` | Remove this pack's skills from the chosen folders |

Restart the tool or start a new session afterwards so it finds the skills. The repository is public
at [github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill](https://github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill);
if you install from a fork, put your own `owner/name` in the commands below.

Folder locations were checked against each tool's documentation in November 2026.

## Claude Code

Plugin (all ten skills, updated with `/plugin update`), in Claude Code:

```text
/plugin marketplace add sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
/plugin install seo-geo-vercel@seo-geo-vercel-skills
```

Send them as two separate prompts. Or copy the skills: `install.mjs --tools claude` (project:
`.claude/skills/`) or `--user --tools claude` (`~/.claude/skills/`). Skills load automatically
when a task matches their description; you can also ask for one by name.

## Claude (web and desktop apps)

Run `npm run package`, then upload the skills you want from `dist/skills/` (one ZIP per skill) where
Claude's settings let you add custom skills. Code execution must be enabled for the scripts to run.

## OpenAI Codex

Copy: `install.mjs --tools agents` (`.agents/skills/` in the project; `--user` for
`~/.agents/skills/`). Codex reads `.agents/skills/` from the working directory up to the repository
root.

Plugin: this repository is also a Codex marketplace (`.agents/plugins/marketplace.json` and a
portable `plugin.json`):

```bash
codex plugin marketplace add sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
```

then install **seo-geo-vercel** from the plugin list (see `codex plugin --help` for your version).

## GitHub Copilot (VS Code, Copilot CLI, coding agent)

Copy: the default install already works (Copilot reads `.claude/skills/` and `.agents/skills/`);
`--tools copilot` adds `.github/skills/`, and `--user --tools copilot` uses `~/.copilot/skills/`.

Copilot CLI plugin:

```bash
copilot plugin marketplace add sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
copilot plugin install seo-geo-vercel@seo-geo-vercel-skills
```

## Cursor

The default install works (`.agents/skills/`); `--tools cursor` adds `.cursor/skills/`,
`--user --tools cursor` uses `~/.cursor/skills/`.

## Gemini CLI

Extension (skills plus a short always-on context, `GEMINI.md`):

```bash
gemini extensions install https://github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill
```

Or copy: the default install works (`.agents/skills/` is an alias of `.gemini/skills/`);
`--tools gemini` writes `.gemini/skills/`. List skills with `/skills` in a session.

## Windsurf

The default install works (`.agents/skills/`); `--tools windsurf` writes `.windsurf/skills/`, and
`--user --tools windsurf` uses `~/.codeium/windsurf/skills/`. Mention a skill with `@name` to load
it by hand.

## Cline

The default install works (`.claude/skills/`); `--tools cline` writes `.cline/skills/`, and
`--user --tools cline` uses `~/.cline/skills/`.

## Kiro

```bash
node scripts/install.mjs --project path/to/your-site --tools kiro     # .kiro/skills/
node scripts/install.mjs --user --tools kiro                          # ~/.kiro/skills/
```

Or in the Kiro IDE: Agent Steering & Skills → + → Import a skill → GitHub, and paste the URL of one
skill folder, for example
`https://github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill/tree/main/skills/geo-ai-search`.

## Other tools

- **Tools that read `AGENTS.md`** (Codex, Jules, Amp, Zed, OpenCode, Aider with configuration and
  others): `install.mjs --agents-md` writes a section listing each skill and when to read it.
- **Anything else:** give the assistant the relevant `skills/<name>/SKILL.md` as context; it tells
  the assistant which reference file or script to use next.

## Updating

`git pull` in the checkout, then `install.mjs --force` (or nothing, if you installed with `--link`),
or `/plugin update` in Claude Code. `CHANGELOG.md` lists what changed.

## Requirements

| For | Needs |
|---|---|
| All scripts | Node.js 18 or later (tested on 22); no npm packages |
| `measure-requests.cjs` | Playwright with Chromium (`npm i -D playwright && npx playwright install chromium`) |
| `phone-videos.mjs` | ffmpeg and ffprobe on the PATH |
| `icons.mjs` | the `sharp` package in the project |
| Live checks | Network access to the site being checked |
