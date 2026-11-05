#!/usr/bin/env node
/**
 * Drafts /llms.txt from a build folder: the site's name and summary, then every indexable page
 * as a link with its description, grouped by the first part of its path, other languages last.
 * The draft only knows what the pages say. Read it, cut it down, add the confirmed key facts
 * (address, phone, certifications) and save it as public/llms.txt (or your static folder).
 *
 *   node llms-txt.mjs --dir dist [--site https://www.example.com] [--name "Brand"] [--out llms.txt]
 *
 * Format: https://llmstxt.org (an H1, a > summary, then H2 sections of links).
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { args, guessSite, loadBuild, parseHtml } from './site-files.mjs';

const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function draft(pages, { site, name } = {}) {
  const info = pages
    .filter((p) => !p.notFound)
    .map((p) => ({ ...p, ...parseHtml(p.html) }))
    .filter((p) => !/noindex/i.test(p.robots ?? '') && (!p.canonical || new URL(p.canonical, site).pathname === p.path));
  const home = info.find((p) => p.path === '/') ?? info[0];
  const mainLang = (home.lang ?? '').split('-')[0].toLowerCase();
  const brand = name ?? home.og['og:site_name'] ?? (home.title ?? '').split(/\s[|–—-]\s/).pop() ?? new URL(site).host;
  const short = (t) => (t ?? '').split(/\s[|–—]\s/)[0].trim();
  const line = (p) => `- [${short(p.title) || p.path}](${new URL(p.path, site).href})${p.description ? `: ${p.description}` : ''}`;

  const sections = new Map();
  const other = [];
  for (const p of info) {
    if (p === home) continue;
    const lang = (p.lang ?? '').split('-')[0].toLowerCase();
    if (mainLang && lang && lang !== mainLang) {
      other.push(p);
      continue;
    }
    const key = p.path.split('/').filter(Boolean)[0] ?? '';
    sections.set(key, [...(sections.get(key) ?? []), p]);
  }
  const out = [`# ${brand}`, '', `> ${home.description ?? 'One-paragraph summary: what the business does, where, since when, and for whom.'}`, ''];
  out.push('Key facts (fill in, confirmed facts only): address, phone, email, opening hours, certifications, languages.', '');
  const singles = [];
  for (const [key, list] of sections) {
    if (list.length === 1 && list[0].path.split('/').filter(Boolean).length <= 1) singles.push(list[0]);
    else out.push(`## ${titleCase(key) || 'Pages'}`, '', ...list.map(line), '');
  }
  if (singles.length) out.push('## Company', '', ...singles.map(line), '');
  if (other.length) {
    const byLang = new Map();
    for (const p of other) byLang.set(p.lang, [...(byLang.get(p.lang) ?? []), p]);
    for (const [lang, list] of byLang) out.push(`## Optional: pages in ${lang}`, '', ...list.map(line), '');
  }
  return out.join('\n').trimEnd() + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  if (opts.help || !opts.dir) {
    console.log('usage: node llms-txt.mjs --dir dist [--site https://www.example.com] [--name "Brand"] [--out llms.txt]');
    process.exit(opts.help ? 0 : 2);
  }
  try {
    const pages = loadBuild(opts.dir);
    const site = opts.site ?? guessSite(pages);
    if (!site) throw new Error('pass --site: the home page has no absolute canonical to take it from');
    const text = draft(pages, { site, name: opts.name });
    if (opts.out) {
      writeFileSync(opts.out, text);
      console.log(`Wrote ${opts.out} (${text.split('\n').length} lines). Edit it before publishing: confirmed facts only.`);
    } else process.stdout.write(text);
  } catch (e) {
    console.error(`llms-txt: ${e.message}`);
    process.exit(2);
  }
}
