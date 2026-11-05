/** Reads the skills in skills/: frontmatter (the YAML subset SKILL.md files use) and body. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
export const SKILLS_DIR = join(ROOT, 'skills');

/**
 * Parses the frontmatter subset used here: `key: value`, quoted values, folded (>) and
 * literal (|) blocks, and one level of nested map (metadata). Throws on anything else.
 */
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error('SKILL.md must start with YAML frontmatter between --- lines');
  const lines = m[1].split(/\r?\n/);
  const data = {};
  const unquote = (v) => {
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
    return v;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\t/.test(line)) throw new Error(`tab indentation in frontmatter line ${i + 1}`);
    const kv = line.match(/^([A-Za-z][\w-]*):(?:\s+(.*))?$/);
    if (!kv) throw new Error(`cannot read frontmatter line ${i + 1}: "${line}"`);
    const [, key, raw = ''] = kv;
    if (raw === '>' || raw === '|' || raw === '>-' || raw === '|-') {
      const block = [];
      while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || !lines[i + 1].trim())) block.push(lines[++i].trim());
      data[key] = raw.startsWith('>') ? block.join(' ').replace(/\s+/g, ' ').trim() : block.join('\n').trim();
    } else if (raw === '') {
      const map = {};
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        const sub = lines[++i].trim().match(/^([A-Za-z][\w.-]*):\s+(.*)$/);
        if (!sub) throw new Error(`cannot read nested frontmatter line ${i + 1}`);
        map[sub[1]] = unquote(sub[2]);
      }
      data[key] = map;
    } else data[key] = unquote(raw);
  }
  return { data, body: text.slice(m[0].length) };
}

/** the order skills are listed in (entry point first, then roughly the order of a launch); others follow alphabetically */
export const ORDER = ['seo-geo-vercel-playbook', 'seo-technical-audit', 'seo-metadata', 'structured-data', 'site-migration', 'geo-ai-search', 'web-performance', 'vercel-cost-optimization', 'vercel-static-config', 'vercel-firewall'];
const rank = (n) => (ORDER.includes(n) ? ORDER.indexOf(n) : ORDER.length);

/** [{ name, dir, file, data, body }] for every folder in skills/ */
export function readSkills() {
  return readdirSync(SKILLS_DIR)
    .filter((n) => statSync(join(SKILLS_DIR, n)).isDirectory())
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((name) => {
      const dir = join(SKILLS_DIR, name);
      const file = join(dir, 'SKILL.md');
      if (!existsSync(file)) return { name, dir, file, data: null, body: '', error: 'no SKILL.md' };
      const text = readFileSync(file, 'utf8');
      try {
        return { name, dir, file, text, ...parseFrontmatter(text) };
      } catch (e) {
        return { name, dir, file, text, data: null, body: '', error: e.message };
      }
    });
}

/** the first sentence of a description, for tables */
export const summary = (description) => (description.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? description).trim();

export const pkg = () => JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
