#!/usr/bin/env node
/**
 * Installs the skills into a project (or your home folder) for one or more AI coding tools.
 * Every tool here reads the same Agent Skills format; they only look in different folders.
 *
 *   node scripts/install.mjs --project ../my-site                    Claude Code + .agents (Codex, Copilot, Cursor, Gemini CLI, Windsurf)
 *   node scripts/install.mjs --project ../my-site --tools claude,kiro
 *   node scripts/install.mjs --project ../my-site --all              every tool folder below
 *   node scripts/install.mjs --user --tools claude,agents            personal skills for every project
 *   node scripts/install.mjs --project . --skills seo-technical-audit,geo-ai-search
 *
 *   --link        symlink to this checkout instead of copying (git pull updates every project)
 *   --agents-md   also write a skills section into the project's AGENTS.md (for tools without skill support)
 *   --force       replace skill folders that already exist
 *   --dry         show what would happen
 *   --uninstall   remove this pack's skill folders from the chosen tool folders
 *   --list        show the tools and their folders
 */
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { readSkills, summary } from './lib/skills.mjs';

/** tool → [project folder, personal folder, who reads it] (checked November 2026) */
export const TOOLS = {
  claude: ['.claude/skills', '~/.claude/skills', 'Claude Code; also GitHub Copilot and Cline'],
  agents: ['.agents/skills', '~/.agents/skills', 'Codex, Gemini CLI, Cursor, GitHub Copilot, Windsurf'],
  copilot: ['.github/skills', '~/.copilot/skills', 'GitHub Copilot (VS Code, CLI, coding agent)'],
  cursor: ['.cursor/skills', '~/.cursor/skills', 'Cursor'],
  gemini: ['.gemini/skills', '~/.gemini/skills', 'Gemini CLI'],
  windsurf: ['.windsurf/skills', '~/.codeium/windsurf/skills', 'Windsurf'],
  cline: ['.cline/skills', '~/.cline/skills', 'Cline'],
  kiro: ['.kiro/skills', '~/.kiro/skills', 'Kiro'],
};
export const DEFAULT_TOOLS = ['claude', 'agents'];

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(`--${k}`);
const opt = (k) => {
  const i = argv.indexOf(`--${k}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};

if (flag('list') || flag('help') || (!opt('project') && !flag('user'))) {
  console.log('Tools and the folders they read skills from:\n');
  for (const [tool, [project, user, who]] of Object.entries(TOOLS)) console.log(`  ${tool.padEnd(9)} ${project.padEnd(18)} ${user.padEnd(28)} ${who}`);
  console.log(`\nDefault: --tools ${DEFAULT_TOOLS.join(',')} (covers Claude Code, Codex, Copilot, Cursor, Gemini CLI, Windsurf and Cline).`);
  console.log('Usage: node scripts/install.mjs --project <dir> | --user [--tools a,b | --all] [--skills x,y] [--link] [--agents-md] [--force] [--dry] [--uninstall]');
  process.exit(flag('list') || flag('help') ? 0 : 2);
}

const skills = readSkills().filter((s) => s.data);
const wanted = opt('skills') ? opt('skills').split(',').map((s) => s.trim()) : skills.map((s) => s.name);
const unknown = wanted.filter((w) => !skills.some((s) => s.name === w));
if (unknown.length) {
  console.error(`Unknown skill${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. Available: ${skills.map((s) => s.name).join(', ')}`);
  process.exit(2);
}
const tools = flag('all') ? Object.keys(TOOLS) : (opt('tools') ?? DEFAULT_TOOLS.join(',')).split(',').map((t) => t.trim());
const badTool = tools.filter((t) => !TOOLS[t]);
if (badTool.length) {
  console.error(`Unknown tool${badTool.length > 1 ? 's' : ''}: ${badTool.join(', ')}. Run with --list.`);
  process.exit(2);
}
const base = flag('user') ? homedir() : resolve(opt('project'));
if (!flag('user') && !existsSync(base)) {
  console.error(`No folder at ${base}`);
  process.exit(2);
}
const dry = flag('dry');
const say = (m) => console.log(`${dry ? '[dry] ' : ''}${m}`);
const folderFor = (tool) => {
  const [project, user] = TOOLS[tool];
  return flag('user') ? user.replace(/^~/, homedir()) : join(base, project);
};

let done = 0;
for (const tool of tools) {
  const dir = folderFor(tool);
  for (const name of wanted) {
    const src = skills.find((s) => s.name === name).dir;
    const dest = join(dir, name);
    const exists = existsSync(dest) || (() => {
      try {
        return lstatSync(dest).isSymbolicLink();
      } catch {
        return false;
      }
    })();
    if (flag('uninstall')) {
      if (!exists) continue;
      const own = existsSync(join(dest, 'SKILL.md')) && readFileSync(join(dest, 'SKILL.md'), 'utf8').includes(`name: ${name}`);
      if (!own && !lstatSync(dest).isSymbolicLink()) {
        say(`skip ${dest}: not this pack's skill`);
        continue;
      }
      if (!dry) rmSync(dest, { recursive: true, force: true });
      say(`removed ${dest}`);
      done++;
      continue;
    }
    if (exists && !flag('force')) {
      say(`skip ${relative(base, dest) || dest}: already there (use --force to replace)`);
      continue;
    }
    if (!dry) {
      mkdirSync(dir, { recursive: true });
      if (exists) rmSync(dest, { recursive: true, force: true });
      if (flag('link')) symlinkSync(src, dest, process.platform === 'win32' ? 'junction' : 'dir');
      else cpSync(src, dest, { recursive: true });
    }
    say(`${flag('link') ? 'linked' : 'copied'} ${name} → ${flag('user') ? dest : relative(base, dest)}`);
    done++;
  }
}

if (flag('agents-md') && !flag('user') && !flag('uninstall')) {
  const rel = TOOLS[tools.includes('agents') ? 'agents' : tools[0]][0];
  const block = [
    '<!-- seo-geo-vercel-skills:start -->',
    '## SEO, GEO and Vercel skills',
    '',
    `Before working on one of these tasks, read the matching skill's SKILL.md in \`${rel}/\` and follow it:`,
    '',
    ...skills.filter((s) => wanted.includes(s.name)).map((s) => `- \`${rel}/${s.name}/SKILL.md\`: ${summary(s.data.description)}`),
    '<!-- seo-geo-vercel-skills:end -->',
  ].join('\n');
  const file = join(base, 'AGENTS.md');
  const before = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const after = /<!-- seo-geo-vercel-skills:start -->[\s\S]*?<!-- seo-geo-vercel-skills:end -->/.test(before)
    ? before.replace(/<!-- seo-geo-vercel-skills:start -->[\s\S]*?<!-- seo-geo-vercel-skills:end -->/, block)
    : `${before}${before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : ''}${block}\n`;
  if (!dry) writeFileSync(file, after);
  say(`${before ? 'updated' : 'created'} AGENTS.md with the skill list`);
}

console.log(`\n${done} ${flag('uninstall') ? 'removed' : 'installed'}${dry ? ' (dry run, nothing changed)' : ''}. ${!flag('uninstall') && done ? 'Restart the AI tool (or start a new session) so it picks up the skills.' : ''}`);
