#!/usr/bin/env node
/**
 * Keeps generated parts of the pack in step with their sources:
 *   1. shared/*  → the copies in each skill's scripts/ folder (shared/manifest.json says which)
 *   2. package.json version → every plugin manifest and each SKILL.md's metadata.version
 *   3. the skill list between <!-- skills:start --> and <!-- skills:end --> in README.md, AGENTS.md and GEMINI.md
 *
 *   node scripts/sync.mjs           write the changes
 *   node scripts/sync.mjs --check   change nothing; exit 1 if anything is out of date (CI)
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, pkg, readSkills, summary } from './lib/skills.mjs';

const check = process.argv.includes('--check');
const version = pkg().version;
const changes = [];

function put(file, content) {
  const before = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (before === content) return;
  changes.push(file.slice(ROOT.length + 1));
  if (!check) writeFileSync(file, content);
}

// 1. shared files
const manifest = JSON.parse(readFileSync(join(ROOT, 'shared/manifest.json'), 'utf8'));
for (const [file, skills] of Object.entries(manifest)) {
  if (file.startsWith('_')) continue;
  const content = readFileSync(join(ROOT, 'shared', file), 'utf8');
  for (const skill of skills) put(join(ROOT, 'skills', skill, 'scripts', file), content);
}

// 2. versions
for (const rel of ['plugin.json', '.claude-plugin/plugin.json', '.github/plugin/plugin.json', 'gemini-extension.json']) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  put(file, text.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`));
}
const skills = readSkills();
for (const s of skills) {
  if (!s.text) continue;
  put(s.file, s.text.replace(/^(\s+version:\s*)"?[^"\n]*"?$/m, `$1"${version}"`));
}

// 3. skill lists
// site-files.mjs is a helper the other scripts import, not a tool of its own
const scripts = (s) => (existsSync(join(s.dir, 'scripts')) ? readdirSync(join(s.dir, 'scripts')).filter((f) => f !== 'site-files.mjs').sort() : []);
const table = [
  '| Skill | What it does | Scripts |',
  '|---|---|---|',
  ...skills.filter((s) => s.data).map((s) => `| [\`${s.name}\`](skills/${s.name}/SKILL.md) | ${summary(s.data.description)} | ${scripts(s).map((f) => `\`${f}\``).join(', ') || '–'} |`),
].join('\n');
const list = skills.filter((s) => s.data).map((s) => `- **${s.name}** (\`skills/${s.name}/SKILL.md\`): ${summary(s.data.description)}`).join('\n');
for (const [rel, block] of [['README.md', table], ['AGENTS.md', list], ['GEMINI.md', list]]) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  const next = text.replace(/<!-- skills:start -->[\s\S]*?<!-- skills:end -->/, `<!-- skills:start -->\n${block}\n<!-- skills:end -->`);
  put(file, next);
}

if (check) {
  if (changes.length) {
    console.error(`Out of date (run node scripts/sync.mjs):\n  ${changes.join('\n  ')}`);
    process.exit(1);
  }
  console.log('sync: everything is up to date');
} else console.log(changes.length ? `sync: updated\n  ${changes.join('\n  ')}` : 'sync: nothing to change');
