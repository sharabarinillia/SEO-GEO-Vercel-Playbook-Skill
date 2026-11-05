#!/usr/bin/env node
/**
 * Technical SEO audit of a static site: a build folder (before deploy) or a live site (through its sitemap).
 * Every check is explained, with the fix, in ../references/checks.md (look up the check id).
 *
 *   node seo-audit.mjs --dir dist [--site https://www.example.com]
 *   node seo-audit.mjs --sitemap https://www.example.com/sitemap.xml [--limit 300] [--check-links]
 *
 *   --dir          a build folder (dist, out, build, public); finds missing files and broken links offline
 *   --site         the production origin; default: the home page's canonical
 *   --sitemap      a live sitemap URL (or a local sitemap.xml with --site); fetches every page in it
 *   --check-links  live mode: also request internal links that are not in the sitemap
 *   --json FILE    also write the findings as JSON
 *   --strict       exit 1 on warnings as well as errors
 *
 * Exit code: 0 no errors, 1 errors (or warnings with --strict), 2 the audit could not run.
 * Needs Node.js 18 or later; no packages.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { args, buildFiles, follow, guessSite, loadBuild, loadLive, parseHtml, parseSitemap, pool, resolveInBuild } from './site-files.mjs';
import { DESCRIPTION_PX, TITLE_PX, serpWidth } from './serp-width.mjs';

const HELP = `usage: node seo-audit.mjs --dir dist [--site https://www.example.com] [--json out.json] [--strict]
       node seo-audit.mjs --sitemap https://www.example.com/sitemap.xml [--limit 300] [--check-links]`;

export async function audit(opts) {
  const findings = [];
  const add = (severity, check, page, message) => findings.push({ severity, check, page, message });
  const error = (c, p, m) => add('error', c, p, m);
  const warn = (c, p, m) => add('warning', c, p, m);

  // ── load ─────────────────────────────────────────────────────────────
  let pages;
  let files = null;
  let site = opts.site ? new URL(opts.site).origin : null;
  if (opts.dir) {
    pages = loadBuild(opts.dir, site ?? undefined);
    files = buildFiles(opts.dir);
    site ??= guessSite(pages);
    if (!site) {
      warn('site-unknown', '/', 'No --site given and the home page has no absolute canonical; host checks are skipped');
      site = 'https://example.invalid';
    }
    pages = pages.map((p) => ({ ...p, url: new URL(p.path, site).href }));
  } else if (opts.sitemap) {
    pages = await loadLive(opts.sitemap, { limit: Number(opts.limit ?? 500) });
    site ??= new URL(pages[0].url).origin;
    for (const p of pages) {
      if (p.status !== 200) error('sitemap-url-not-200', p.path, `listed in the sitemap but answers ${p.status || p.error}${p.redirected ? ` (redirects to ${p.finalUrl})` : ''}`);
      else if (p.redirected) warn('sitemap-url-redirects', p.path, `listed in the sitemap but redirects to ${p.finalUrl}; list the final URL`);
    }
    pages = pages.filter((p) => p.status === 200);
  } else throw new Error(HELP);
  const host = new URL(site).host;

  const info = new Map(pages.map((p) => [p.path, { ...p, ...parseHtml(p.html) }]));
  const live = [...info.values()].filter((p) => !p.notFound);
  const indexable = live.filter((p) => !/noindex/i.test(p.robots ?? ''));
  const abs = (href, base) => {
    try {
      return new URL(href, base);
    } catch {
      return null;
    }
  };

  // ── per page ─────────────────────────────────────────────────────────
  for (const p of live) {
    const at = p.path;
    if (!p.lang) error('html-lang', at, '<html> has no lang attribute');
    if (!p.viewport) error('viewport', at, 'no <meta name="viewport">: the page is not mobile-friendly');
    if (/noindex/i.test(p.robots ?? '')) warn('noindex', at, `robots meta says "${p.robots}": the page will not be indexed`);

    if (!p.title) error('title-missing', at, 'no <title>');
    else if (serpWidth(p.title, 20) > TITLE_PX) warn('title-width', at, `title is ${serpWidth(p.title, 20)} px wide (about ${TITLE_PX} px fit): "${p.title}"`);

    if (!p.description) error('description-missing', at, 'no <meta name="description">');
    else {
      const w = serpWidth(p.description, 14);
      if (w > DESCRIPTION_PX) warn('description-width', at, `description is ${w} px wide (about ${DESCRIPTION_PX} px fit)`);
      if (p.description.length < 100) warn('description-short', at, `description has only ${p.description.length} characters`);
    }

    if (!p.canonical) error('canonical-missing', at, 'no <link rel="canonical">');
    else if (!/^https?:\/\//i.test(p.canonical)) error('canonical-relative', at, `canonical "${p.canonical}" is not an absolute URL`);
    else {
      const c = abs(p.canonical);
      if (c.host !== host) error('canonical-host', at, `canonical is on ${c.host}, not ${host}`);
      else if (c.pathname !== new URL(p.url).pathname) warn('canonical-other-page', at, `canonical points to ${c.pathname}: this page asks to be left out in favour of that one`);
    }

    const h1 = p.headings.filter((h) => h.level === 1);
    if (!h1.length) error('h1-missing', at, 'no <h1>');
    else if (h1.length > 1) warn('h1-multiple', at, `${h1.length} <h1> elements: ${h1.map((h) => `"${h.text}"`).join(', ')}`);
    else if (!h1[0].text) error('h1-empty', at, '<h1> has no text');
    for (let i = 1; i < p.headings.length; i++) {
      const [a, b] = [p.headings[i - 1].level, p.headings[i].level];
      if (b > a + 1) {
        warn('heading-skip', at, `<h${a}> is followed by <h${b}> ("${p.headings[i].text}")`);
        break;
      }
    }

    for (const k of ['og:title', 'og:description', 'og:image']) if (!p.og[k]) warn('og-missing', at, `no ${k}: link previews fall back to guesses`);
    if (p.og['og:image'] && !/^https?:\/\//i.test(p.og['og:image'])) error('og-image-relative', at, `og:image "${p.og['og:image']}" must be an absolute URL`);

    for (const block of p.jsonld) {
      try {
        const data = JSON.parse(block);
        const ctx = JSON.stringify([].concat(data).map((d) => d?.['@context']));
        if (!/schema\.org/.test(ctx)) warn('jsonld-context', at, 'JSON-LD without a schema.org @context');
      } catch (e) {
        error('jsonld-parse', at, `JSON-LD does not parse: ${e.message}`);
      }
    }

    if (p.bytes > 2 * 1024 * 1024) warn('html-size', at, `HTML is ${(p.bytes / 1048576).toFixed(1)} MB; keep the head and main content well inside the first 2 MB`);

    // images
    let noAlt = 0;
    let noSize = 0;
    for (const img of p.images) {
      if (!('alt' in img)) noAlt++;
      if (!(img.width && img.height) && !/^data:/.test(img.src ?? '')) noSize++;
    }
    if (noAlt) error('img-alt', at, `${noAlt} <img> without an alt attribute (use alt="" for decoration)`);
    if (noSize) warn('img-size', at, `${noSize} <img> without width and height: the layout can shift while it loads`);

    // links and files
    for (const href of p.links) {
      if (!href || /^(#|mailto:|tel:|javascript:|data:|sms:)/i.test(href)) continue;
      const u = abs(href, p.url);
      if (!u || !/^https?:$/.test(u.protocol) || u.host !== host) continue;
      if (files) {
        const found = resolveInBuild(files, u.pathname);
        if (!found) error('link-broken', at, `links to ${u.pathname}, which is not in the build`);
        else if (found === 'slashless') warn('link-redirect', at, `links to ${u.pathname} without the trailing slash: that costs a redirect (or makes a duplicate URL)`);
        else if (found === 'index') warn('link-index-html', at, `links to ${u.pathname}; link to ${u.pathname.slice(0, -10)} instead`);
      }
    }
    if (files) {
      const missing = new Set();
      for (const src of [...p.assets, p.og['og:image']].filter(Boolean)) {
        const u = abs(src, p.url);
        if (u && u.host === host && /^https?:$/.test(u.protocol) && !resolveInBuild(files, u.pathname)) missing.add(u.pathname);
      }
      for (const m of missing) error('file-missing', at, `references ${m}, which is not in the build`);
    }

    // hreflang (pairs are checked across pages below)
    if (p.hreflang.length) {
      for (const h of p.hreflang) {
        if (!/^([a-z]{2,3}(-[a-z0-9]{2,8})*|x-default)$/i.test(h.lang)) error('hreflang-code', at, `hreflang "${h.lang}" is not a language code`);
        if (!/^https?:\/\//i.test(h.href)) error('hreflang-relative', at, `hreflang ${h.lang} link "${h.href}" is not absolute`);
      }
      const self = abs(p.canonical ?? p.url, p.url)?.href;
      if (!p.hreflang.some((h) => abs(h.href, p.url)?.href === self)) error('hreflang-self', at, 'hreflang set without a link to the page itself');
      if (!p.hreflang.some((h) => h.lang.toLowerCase() === 'x-default')) warn('hreflang-x-default', at, 'hreflang set without x-default');
    }
  }

  // ── across pages ─────────────────────────────────────────────────────
  for (const [key, check] of [['title', 'title-duplicate'], ['description', 'description-duplicate']]) {
    const seen = new Map();
    for (const p of indexable) {
      if (!p[key]) continue;
      if (seen.has(p[key])) error(check, p.path, `same ${key} as ${seen.get(p[key])}: "${p[key]}"`);
      else seen.set(p[key], p.path);
    }
  }
  const canon = new Map();
  for (const p of indexable) {
    if (!p.canonical) continue;
    if (canon.has(p.canonical)) warn('canonical-duplicate', p.path, `same canonical as ${canon.get(p.canonical)}: ${p.canonical}`);
    else canon.set(p.canonical, p.path);
  }
  // hreflang must be confirmed from the other side
  const byUrl = new Map(live.map((p) => [abs(p.canonical ?? p.url, p.url)?.href, p]));
  for (const p of live) {
    const self = abs(p.canonical ?? p.url, p.url)?.href;
    for (const h of p.hreflang) {
      const target = byUrl.get(abs(h.href, p.url)?.href);
      if (!target || target === p) continue;
      if (!target.hreflang.some((t) => abs(t.href, target.url)?.href === self)) error('hreflang-return', p.path, `lists ${target.path} as "${h.lang}", but ${target.path} does not link back`);
    }
  }

  // ── site files: robots.txt, sitemap.xml, 404 ─────────────────────────
  if (files) {
    const robotsFile = join(opts.dir, 'robots.txt');
    if (!existsSync(robotsFile)) warn('robots-missing', '/robots.txt', 'no robots.txt in the build');
    else {
      const robots = readFileSync(robotsFile, 'utf8');
      if (blocksEveryone(robots)) error('robots-blocks-all', '/robots.txt', 'robots.txt disallows the whole site for every crawler');
      if (!/^\s*sitemap:/im.test(robots)) warn('robots-sitemap', '/robots.txt', 'robots.txt does not name the sitemap');
    }
    if (!pages.some((p) => p.notFound)) warn('404-missing', '/404.html', 'no 404.html: the host shows its own error page');
    const smFile = join(opts.dir, 'sitemap.xml');
    if (!existsSync(smFile)) warn('sitemap-missing', '/sitemap.xml', 'no sitemap.xml in the build');
    else {
      const { urls, sitemaps } = parseSitemap(readFileSync(smFile, 'utf8'));
      const listed = new Set();
      for (const u of urls) {
        const url = abs(u.loc);
        if (!url) {
          error('sitemap-bad-url', '/sitemap.xml', `"${u.loc}" is not a URL`);
          continue;
        }
        listed.add(url.pathname);
        if (url.host !== host) error('sitemap-host', '/sitemap.xml', `${u.loc} is not on ${host}`);
        else if (!resolveInBuild(files, url.pathname)) error('sitemap-url-missing', '/sitemap.xml', `${url.pathname} is listed but not in the build`);
        else if (resolveInBuild(files, url.pathname) === 'slashless') warn('sitemap-url-redirects', '/sitemap.xml', `${url.pathname} is listed without its trailing slash`);
        if (u.lastmod && Number.isNaN(Date.parse(u.lastmod))) error('sitemap-lastmod', '/sitemap.xml', `lastmod "${u.lastmod}" of ${url.pathname} is not a W3C date`);
      }
      if (!urls.length && !sitemaps.length) error('sitemap-empty', '/sitemap.xml', 'sitemap.xml lists no URLs');
      if (urls.length) for (const p of indexable) if (!listed.has(p.path)) warn('sitemap-page-missing', p.path, 'indexable page not listed in sitemap.xml');
    }
  } else if (opts['check-links']) {
    const known = new Set(pages.map((p) => new URL(p.url).href));
    const internal = new Set();
    for (const p of live)
      for (const href of p.links) {
        const u = abs(href, p.url);
        if (u && u.host === host && /^https?:$/.test(u.protocol)) {
          u.hash = '';
          if (!known.has(u.href)) internal.add(u.href);
        }
      }
    const checked = await pool([...internal].slice(0, 300), 4, async (url) => [url, await follow(url, { body: false })]);
    for (const [url, hops] of checked) {
      const last = hops.at(-1);
      if (last.status >= 400 || last.status === 0) error('link-broken', new URL(url).pathname, `linked internally but answers ${last.status || last.error}`);
      else if (hops.length > 1) warn('link-redirect', new URL(url).pathname, `linked internally but redirects to ${last.url}; link to the final URL`);
    }
  }

  return { site, source: opts.dir ?? opts.sitemap, pages: live.length, findings };
}

/** true when the * group of a robots.txt says Disallow: / and allows nothing back */
export function blocksEveryone(robots) {
  let agents = [];
  let inRules = false;
  const rules = [];
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (inRules) [agents, inRules] = [[], false];
      agents.push(value.toLowerCase());
    } else if (key === 'allow' || key === 'disallow') {
      inRules = true;
      if (agents.includes('*')) rules.push([key, value]);
    }
  }
  return rules.some(([k, v]) => k === 'disallow' && v === '/') && !rules.some(([k, v]) => k === 'allow' && v);
}

export function report({ site, source, pages, findings }) {
  const lines = [`SEO audit of ${source}: ${pages} page${pages === 1 ? '' : 's'} (site ${site})`];
  for (const severity of ['error', 'warning']) {
    const list = findings.filter((f) => f.severity === severity);
    if (!list.length) continue;
    lines.push('', `${severity === 'error' ? 'Errors' : 'Warnings'} (${list.length})`);
    const byCheck = list.reduce((m, f) => m.set(f.check, [...(m.get(f.check) ?? []), f]), new Map());
    for (const [check, items] of byCheck) {
      lines.push(`  ${check} (${items.length})`);
      for (const f of items.slice(0, 25)) lines.push(`    ${f.page}  ${f.message}`);
      if (items.length > 25) lines.push(`    … ${items.length - 25} more (see --json)`);
    }
  }
  const e = findings.filter((f) => f.severity === 'error').length;
  const w = findings.length - e;
  lines.push('', `${e} error${e === 1 ? '' : 's'}, ${w} warning${w === 1 ? '' : 's'}.${e ? ' Fix the errors before launch; references/checks.md explains each check.' : ''}`);
  return lines.join('\n');
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  if (opts.help || (!opts.dir && !opts.sitemap)) {
    console.log(HELP);
    process.exit(opts.help ? 0 : 2);
  }
  try {
    const result = await audit(opts);
    console.log(report(result));
    if (opts.json) writeFileSync(opts.json, JSON.stringify(result, null, 2));
    const errors = result.findings.filter((f) => f.severity === 'error').length;
    process.exit(errors || (opts.strict && result.findings.length) ? 1 : 0);
  } catch (e) {
    console.error(`seo-audit: ${e.message}`);
    process.exit(2);
  }
}
