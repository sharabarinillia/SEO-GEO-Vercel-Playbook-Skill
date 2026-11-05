#!/usr/bin/env node
/**
 * Validates every skill against the Agent Skills specification (agentskills.io/specification)
 * and this pack's own rules, plus the plugin manifests.
 *
 *   node scripts/validate.mjs            exit 1 on errors
 *   node scripts/validate.mjs --strict   exit 1 on warnings too
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { ROOT, pkg, readSkills } from './lib/skills.mjs';

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const ALLOWED = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));

const skills = readSkills();
if (!skills.length) err('skills/', 'no skills found');
const names = new Set();

for (const s of skills) {
  const at = `skills/${s.name}`;
  if (s.error) {
    err(at, s.error);
    continue;
  }
  const d = s.data;
  for (const k of Object.keys(d)) if (!ALLOWED.has(k)) err(at, `frontmatter key "${k}" is not in the Agent Skills spec`);
  // name
  if (!d.name) err(at, 'name is required');
  else {
    if (d.name.length > 64) err(at, 'name is longer than 64 characters');
    if (!NAME.test(d.name)) err(at, `name "${d.name}" must be lowercase letters, digits and single hyphens`);
    if (d.name !== s.name) err(at, `name "${d.name}" must match the folder name "${s.name}"`);
    if (names.has(d.name)) err(at, `duplicate skill name ${d.name}`);
    names.add(d.name);
  }
  // description
  if (!d.description) err(at, 'description is required');
  else {
    if (d.description.length > 1024) err(at, `description is ${d.description.length} characters (max 1024)`);
    if (/[<>]/.test(d.description)) err(at, 'description must not contain < or >');
    if (!/\bUse (it|this|when)\b/i.test(d.description)) warn(at, 'description should say when to use the skill ("Use it when …")');
  }
  if (d.compatibility !== undefined && (typeof d.compatibility !== 'string' || !d.compatibility.length || d.compatibility.length > 500)) err(at, 'compatibility must be 1-500 characters');
  if (d.metadata !== undefined) {
    if (typeof d.metadata !== 'object') err(at, 'metadata must be a map of strings');
    else if (d.metadata.version && d.metadata.version !== pkg().version) err(at, `metadata.version ${d.metadata.version} differs from package.json ${pkg().version} (run node scripts/sync.mjs)`);
  }
  // body
  const lines = s.body.split('\n').length;
  if (lines > 500) warn(at, `SKILL.md body has ${lines} lines; the spec recommends under 500`);
  if (!/^#\s/m.test(s.body)) warn(at, 'SKILL.md body has no heading');

  // file references
  const files = walk(s.dir).map((f) => relative(s.dir, f).split('\\').join('/'));
  const mentioned = new Set();
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const text = readFileSync(join(s.dir, f), 'utf8');
    for (const m of text.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
      const target = m[1];
      if (/^(https?:|mailto:)/.test(target)) continue;
      const abs = resolve(dirname(join(s.dir, f)), target);
      if (!existsSync(abs)) err(`${at}/${f}`, `link to missing file ${target}`);
      else if (relative(s.dir, abs).startsWith('..')) err(`${at}/${f}`, `link leaves the skill folder: ${target} (skills must be self-contained)`);
    }
    // skill-relative paths only: not URL paths such as https://site/assets/app.js or /assets/*
    for (const m of text.matchAll(/(?<![\w/.-])((?:scripts|references|assets)\/[\w./-]+\.\w+)/g)) mentioned.add(m[1]);
  }
  for (const m of mentioned) if (!files.includes(m)) err(at, `mentions ${m}, which is not in the skill`);
  for (const f of files.filter((x) => x.startsWith('scripts/'))) {
    if (f !== 'scripts/site-files.mjs' && ![...mentioned].some((m) => m === f) && !readFileSync(s.file, 'utf8').includes(f.slice(8))) warn(at, `${f} is not mentioned in SKILL.md or the references`);
    if (/\.(mjs|cjs|js)$/.test(f)) {
      try {
        execFileSync(process.execPath, ['--check', join(s.dir, f)], { stdio: 'pipe' });
      } catch (e) {
        err(`${at}/${f}`, `syntax error: ${String(e.stderr).split('\n').find((l) => l.trim()) ?? e.message}`);
      }
    }
  }
}

// manifests
const version = pkg().version;
for (const rel of ['plugin.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.github/plugin/plugin.json', '.github/plugin/marketplace.json', '.agents/plugins/marketplace.json', 'gemini-extension.json']) {
  const file = join(ROOT, rel);
  if (!existsSync(file)) {
    err(rel, 'missing');
    continue;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(rel, `not valid JSON: ${e.message}`);
    continue;
  }
  if (data.version && data.version !== version) err(rel, `version ${data.version} differs from package.json ${version} (run node scripts/sync.mjs)`);
  if (!data.name) err(rel, 'name is required');
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`ERROR    ${e}`);
console.log(`\n${skills.length} skills checked: ${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);
process.exit(errors.length || (process.argv.includes('--strict') && warnings.length) ? 1 : 0);
