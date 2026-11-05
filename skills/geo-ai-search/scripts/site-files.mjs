/**
 * Reads a website's pages for the audit scripts: from a build folder (dist/, out/, public/)
 * or from a live site through its sitemap. No dependencies: Node.js 18 or later.
 *
 * Shared file: the copy in each skill's scripts/ folder is written by the pack's
 * scripts/sync.mjs from shared/site-files.mjs. Change the shared file, not a copy.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const USER_AGENT = 'seo-geo-vercel-skills/1.0 (site check; +https://github.com/sharabarinillia/SEO-GEO-Vercel-Playbook-Skill)';

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', copy: '©', reg: '®', trade: '™', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', euro: '€', middot: '·', bull: '•', times: '×' };

/** decodes HTML character references (named ones in common use, and all numeric ones) */
export function decode(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
    if (e[0] !== '#') return NAMED[e.toLowerCase()] ?? m;
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isInteger(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
  });
}

/** the attributes of one start tag, names lower-cased; a bare attribute has the value '' */
export function attrs(tag) {
  const out = {};
  const body = tag.replace(/^<\s*[^\s>/]+/, '').replace(/\/?\s*>$/, '');
  for (const m of body.matchAll(/([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!(name in out)) out[name] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

/** start tags of one element name, quote-aware so a ">" inside an attribute value doesn't end the tag */
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b(?:[^>"']|"[^"]*"|'[^']*')*>`, 'gi'))].map((m) => m[0]);
const text = (s) => decode(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

/**
 * Everything the checks need from one HTML document. URLs are left as written;
 * resolve them against the page URL with new URL(href, page.url).
 */
export function parseHtml(html) {
  const scripts = [...html.matchAll(/<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/gi)].map((m) => ({ ...attrs(`<script${m[1]}>`), body: m[2] }));
  const jsonld = scripts.filter((s) => (s.type ?? '').trim().toLowerCase() === 'application/ld+json').map((s) => s.body.trim());
  // scan markup without scripts, styles and comments, so code and comments can't add fake tags
  const clean = html
    .replace(/<script\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/script\s*>/gi, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const bodyAt = clean.search(/<body\b/i);
  const head = bodyAt > -1 ? clean.slice(0, bodyAt) : clean;
  const body = bodyAt > -1 ? clean.slice(bodyAt) : clean;

  const metas = tags(head, 'meta').map(attrs);
  const meta = (key, value) => metas.find((m) => (m[key] ?? '').toLowerCase() === value)?.content;
  const links = tags(head, 'link').map(attrs);
  const rel = (l) => (l.rel ?? '').toLowerCase().split(/\s+/);
  const titleMatch = head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);

  const headings = [...body.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((m) => ({ level: Number(m[1]), text: text(m[2]) }));
  const srcset = (v) => (v ? v.split(/,\s+/).map((c) => c.trim().split(/\s+/)[0]).filter(Boolean) : []);
  const images = tags(body, 'img').map(attrs);
  const sources = tags(clean, 'source').map(attrs);
  const videos = tags(body, 'video').map(attrs);

  const assets = [
    ...scripts.filter((s) => s.src).map((s) => s.src),
    ...links.filter((l) => l.href && rel(l).some((r) => ['stylesheet', 'preload', 'modulepreload', 'icon', 'apple-touch-icon', 'manifest', 'mask-icon'].includes(r))).map((l) => l.href),
    ...images.flatMap((i) => [i.src, ...srcset(i.srcset)].filter(Boolean)),
    ...sources.flatMap((s) => [s.src, ...srcset(s.srcset)].filter(Boolean)),
    ...videos.flatMap((v) => [v.src, v.poster].filter(Boolean)),
  ];

  return {
    lang: attrs(tags(clean, 'html')[0] ?? '<html>').lang ?? null,
    title: titleMatch ? text(titleMatch[1]) : null,
    description: meta('name', 'description') ?? null,
    robots: [meta('name', 'robots'), meta('name', 'googlebot')].filter(Boolean).join(', ') || null,
    viewport: meta('name', 'viewport') ?? null,
    canonical: links.find((l) => rel(l).includes('canonical'))?.href ?? null,
    hreflang: links.filter((l) => rel(l).includes('alternate') && l.hreflang).map((l) => ({ lang: l.hreflang, href: l.href })),
    og: Object.fromEntries(metas.filter((m) => /^og:/i.test(m.property ?? '')).map((m) => [m.property.toLowerCase(), m.content ?? ''])),
    twitterCard: meta('name', 'twitter:card') ?? null,
    headings,
    links: tags(body, 'a').map(attrs).filter((a) => a.href !== undefined).map((a) => a.href),
    images,
    assets: [...new Set(assets)],
    jsonld,
    bytes: Buffer.byteLength(html),
  };
}

/** URL path of a built HTML file: index.html → /, about/index.html → /about/, page.html → /page.html */
export function fileToPath(rel) {
  const p = '/' + rel.split(sep).join('/');
  return p.endsWith('/index.html') ? p.slice(0, -'index.html'.length) : p;
}

function walk(dir, root = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, root, out);
    else out.push(relative(root, full));
  }
  return out;
}

/** every file in a build folder, as URL paths (for "does this link or asset exist?") */
export function buildFiles(dir) {
  return new Set(walk(dir).map((f) => '/' + f.split(sep).join('/')));
}

/**
 * What a link to `path` finds in the build: 'file' (served as is), 'page' (a folder's index.html),
 * 'slashless' (the page exists only with a trailing slash), 'index' (an explicit /index.html), or null.
 */
export function resolveInBuild(files, path) {
  let p;
  try {
    p = decodeURIComponent(path);
  } catch {
    p = path;
  }
  if (p.endsWith('/index.html') && files.has(p)) return 'index';
  if (p.endsWith('/')) return files.has(p + 'index.html') ? 'page' : null;
  if (files.has(p)) return 'file';
  if (files.has(p + '/index.html')) return 'slashless';
  if (files.has(p + '.html')) return 'file'; // cleanUrls
  return null;
}

/** pages of a build folder: [{ path, file, url, html }] (404.html is marked notFound) */
export function loadBuild(dir, site) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new Error(`No folder at ${dir}`);
  const pages = walk(dir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((file) => {
      const path = fileToPath(file);
      return { path, file, url: new URL(path, site ?? 'https://example.invalid').href, html: readFileSync(join(dir, file), 'utf8'), notFound: /^\/(404|_404|not-found)\.html$/.test(path) };
    });
  if (!pages.length) throw new Error(`No .html files in ${dir}`);
  return pages;
}

/** the site origin a build declares: the home page's canonical, then its og:url */
export function guessSite(pages) {
  const home = pages.find((p) => p.path === '/') ?? pages[0];
  const info = parseHtml(home.html);
  for (const u of [info.canonical, info.og['og:url']]) {
    try {
      if (u && /^https?:/i.test(u)) return new URL(u).origin;
    } catch {}
  }
  return null;
}

/** GET with a timeout, a clear user agent and manual redirects; never throws (status 0 = network error) */
export async function get(url, { method = 'GET', headers = {}, timeout = 20000, body = true } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { method, redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': USER_AGENT, ...headers } });
    const content = body && method !== 'HEAD' ? await res.text() : (await res.body?.cancel(), '');
    return { url, status: res.status, headers: res.headers, text: content, location: res.headers.get('location') ? new URL(res.headers.get('location'), url).href : null };
  } catch (e) {
    return { url, status: 0, headers: new Headers(), text: '', location: null, error: e.name === 'AbortError' ? 'timed out' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/** follows redirects by hand (up to `max` hops) and returns every hop */
export async function follow(url, opts = {}, max = 10) {
  const hops = [];
  let current = url;
  for (let i = 0; i <= max; i++) {
    const r = await get(current, opts);
    hops.push(r);
    if (!(r.status >= 300 && r.status < 400 && r.location)) break;
    current = r.location;
  }
  return hops;
}

/** runs fn over items with limited concurrency, keeping order */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** parses sitemap XML: { urls: [{ loc, lastmod, alternates }], sitemaps: [loc] } */
export function parseSitemap(xml) {
  const val = (block, tag) => decode(block.match(new RegExp(`<${tag}>\\s*([^<]*?)\\s*</${tag}>`))?.[1] ?? '') || null;
  const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, b]) => ({
    loc: val(b, 'loc'),
    lastmod: val(b, 'lastmod'),
    alternates: tags(b, 'xhtml:link').map(attrs).filter((a) => a.hreflang).map((a) => ({ lang: a.hreflang, href: a.href })),
  }));
  const sitemaps = [...xml.matchAll(/<sitemap>([\s\S]*?)<\/sitemap>/g)].map(([, b]) => val(b, 'loc')).filter(Boolean);
  return { urls: urls.filter((u) => u.loc), sitemaps };
}

/** every URL in a live sitemap or sitemap index (child sitemaps fetched, at most 50) */
export async function readSitemap(source) {
  const load = async (s) => {
    if (!/^https?:/i.test(s)) return readFileSync(s, 'utf8');
    const r = await get(s);
    if (r.status !== 200) throw new Error(`${s} answered ${r.status || r.error}`);
    return r.text;
  };
  const first = parseSitemap(await load(source));
  const urls = [...first.urls];
  for (const child of first.sitemaps.slice(0, 50)) urls.push(...parseSitemap(await load(child)).urls);
  return urls;
}

/** pages of a live site from its sitemap: [{ path, url, html, status, finalUrl }] */
export async function loadLive(sitemap, { limit = 500, concurrency = 4 } = {}) {
  const urls = (await readSitemap(sitemap)).map((u) => u.loc).slice(0, limit);
  if (!urls.length) throw new Error(`No URLs in ${sitemap}`);
  return pool(urls, concurrency, async (url) => {
    const hops = await follow(url);
    const last = hops.at(-1);
    return { path: new URL(url).pathname, url, html: last.status === 200 ? last.text : '', status: last.status, redirected: hops.length > 1, finalUrl: last.url, error: last.error };
  });
}

/** --name value / --flag arguments */
export function args(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (a.includes('=')) out[a.slice(2, a.indexOf('='))] = a.slice(a.indexOf('=') + 1);
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}
