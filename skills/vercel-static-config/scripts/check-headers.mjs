#!/usr/bin/env node
/**
 * Checks the response headers a deployed static site sends: caching per file type, compression,
 * noindex on preview hosts (and not on production), and redirects for duplicate URLs.
 * By default it takes the home page plus every script, stylesheet, font, image and video it references.
 *
 *   node check-headers.mjs https://www.example.com [--paths /,/about/,/fonts/x.woff2] [--no-assets]
 *   node check-headers.mjs https://www.example.com --preview https://my-site-git-main-team.vercel.app
 *
 *   --paths     extra paths to check (comma-separated)
 *   --no-assets don't collect assets from the home page
 *   --preview   a preview deployment URL: it must send X-Robots-Tag: noindex
 *   --json FILE write every response's headers and findings
 *
 * Expected policy (see ../references/caching.md): hashed build files a year + immutable; fonts a
 * year; other static files days to weeks; HTML revalidated on every view; text compressed.
 * Exit code: 0 no errors, 1 errors, 2 could not run. Node.js 18+, no packages.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { args, follow, get, parseHtml, pool } from './site-files.mjs';

const DAY = 86400;
/** a build tool's content hash in the file name: app-3f2a9b1c.js, index.BX7k-2aQ.css, chunk.8f3e2a1b9c.js */
export const HASHED = /[.-][A-Za-z0-9_-]{8,}\.(?:js|mjs|css|woff2?|png|jpe?g|webp|avif|svg|gif|wasm)$/;

export function kind(path, contentType = '') {
  const ct = contentType.toLowerCase();
  if (ct.includes('text/html') || path.endsWith('/') || path.endsWith('.html')) return 'html';
  if (/\.(woff2?|ttf|otf)$/.test(path) || ct.includes('font/')) return 'font';
  if (/^\/(?:_next\/static|assets|_astro|static\/chunks|build)\//.test(path) && HASHED.test(path)) return 'hashed';
  if (HASHED.test(path) && /\.(js|mjs|css)$/.test(path)) return 'hashed';
  if (/\.(js|mjs|css)$/.test(path)) return 'code';
  if (/\.(mp4|webm|mov|m4v)$/.test(path) || ct.startsWith('video/')) return 'video';
  if (/\.(avif|webp|png|jpe?g|gif|svg|ico)$/.test(path) || ct.startsWith('image/')) return 'image';
  if (/\.(json|xml|txt|webmanifest)$/.test(path)) return 'data';
  return 'other';
}

export const parseCacheControl = (v) =>
  Object.fromEntries(
    (v ?? '')
      .toLowerCase()
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [k, x] = d.split('=');
        return [k.trim(), x === undefined ? true : Number(x.replace(/"/g, ''))];
      }),
  );

/** findings for one response: [[severity, message]] */
export function judge(path, headers) {
  const out = [];
  const ct = headers.get('content-type') ?? '';
  const k = kind(path, ct);
  const raw = headers.get('cache-control');
  const cc = parseCacheControl(raw);
  const maxAge = cc['s-maxage'] !== undefined && k === 'html' ? cc['max-age'] : cc['max-age'];
  const browserAge = typeof maxAge === 'number' ? maxAge : 0;
  if (k === 'html') {
    if (browserAge > 0 && !cc['must-revalidate'] && !cc['no-cache']) out.push(['warning', `HTML cached ${browserAge} s in browsers (${raw}): a new deployment shows late`]);
  } else if (k === 'hashed') {
    if (browserAge < 365 * DAY * 0.9 || !cc.immutable) out.push(['warning', `hashed build file sent with "${raw ?? 'no cache-control'}"; send public, max-age=31536000, immutable`]);
  } else if (k === 'font') {
    if (browserAge < 30 * DAY) out.push(['warning', `font cached ${browserAge} s; fonts can be cached a year`]);
  } else if (['image', 'video', 'code', 'other'].includes(k)) {
    if (browserAge < DAY) out.push(['warning', `${k} cached ${browserAge} s ("${raw ?? 'none'}"): browsers re-check it on every page view, one request each time`]);
  }
  const textual = /^(text\/|application\/(javascript|json|xml|manifest\+json|ld\+json)|image\/svg\+xml)/.test(ct);
  const enc = headers.get('content-encoding');
  // only judged when the size is known: tiny files are not worth compressing
  if (textual && !enc && Number(headers.get('content-length') ?? 0) > 1024) out.push(['warning', `${ct.split(';')[0]} sent uncompressed (${headers.get('content-length')} bytes)`]);
  if (/noindex/i.test(headers.get('x-robots-tag') ?? '') && k === 'html') out.push(['error', `X-Robots-Tag: ${headers.get('x-robots-tag')} on a production page: it will drop out of search`]);
  return { kind: k, findings: out };
}

export async function run(site, opts = {}) {
  const origin = new URL(site).origin;
  const paths = new Set(['/', ...(opts.paths ?? [])]);
  const findings = [];
  const add = (severity, path, message) => findings.push({ severity, path, message });
  const home = await get(origin + '/', { headers: { 'accept-encoding': 'br, gzip' } });
  if (home.status !== 200) throw new Error(`${origin}/ answered ${home.status || home.error}`);
  if (opts.assets !== false) {
    const info = parseHtml(home.text);
    for (const a of [...info.assets, info.og['og:image']].filter(Boolean)) {
      const u = new URL(a, origin + '/');
      if (u.origin === origin) paths.add(u.pathname);
    }
    for (const extra of ['/robots.txt', '/sitemap.xml', '/favicon.ico']) paths.add(extra);
  }
  const results = await pool([...paths], 6, async (path) => {
    const r = await get(origin + path, { headers: { 'accept-encoding': 'br, gzip' }, body: false });
    return { path, status: r.status, headers: r.headers, error: r.error };
  });
  // *.vercel.app is a preview or default host: noindex is right there (production is the custom domain)
  const previewHost = /\.vercel\.app$/i.test(new URL(origin).hostname);
  for (const r of results) {
    if (r.status === 404) {
      add(r.path === '/favicon.ico' ? 'warning' : 'error', r.path, `404: ${r.path === '/favicon.ico' ? 'browsers ask for /favicon.ico anyway, and every 404 is a request that is never cached' : 'referenced but missing'}`);
      continue;
    }
    if (r.status >= 300 && r.status < 400) {
      add('warning', r.path, `answers ${r.status} → ${r.headers.get('location')}: link the final URL instead`);
      continue;
    }
    if (r.status !== 200) {
      add('error', r.path, `answers ${r.status || r.error}`);
      continue;
    }
    const j = judge(r.path, r.headers);
    r.kind = j.kind;
    for (const [sev, msg] of j.findings) {
      if (previewHost && msg.startsWith('X-Robots-Tag')) continue;
      add(sev, r.path, msg);
    }
  }
  // duplicate URLs: /page and /page/index.html should redirect to the canonical form
  const page = [...paths].find((p) => p !== '/' && p.endsWith('/'));
  if (page) {
    for (const variant of [page.slice(0, -1), page + 'index.html']) {
      const hops = await follow(origin + variant, { body: false });
      const last = hops.at(-1);
      if (hops.length === 1 && last.status === 200) add('warning', variant, `serves the page at a second URL (no redirect to ${page}); add a redirect or canonical, see references/caching.md`);
      else if (hops.length > 1 && ![301, 308].includes(hops[0].status)) add('warning', variant, `redirects with ${hops[0].status}; use 308 or 301`);
    }
  }
  if (previewHost) {
    const tagged = results.filter((r) => r.kind === 'html' && /noindex/i.test(r.headers.get('x-robots-tag') ?? '')).length;
    const html = results.filter((r) => r.kind === 'html').length;
    add(tagged === html ? 'info' : 'error', origin, tagged === html ? 'a *.vercel.app host: pages carry X-Robots-Tag: noindex, as they should; check the production domain too' : `a *.vercel.app host, but ${html - tagged} of ${html} pages lack X-Robots-Tag: noindex`);
  }
  if (opts.preview) {
    const p = await get(new URL('/', opts.preview).href, { body: false });
    const tag = p.headers.get('x-robots-tag') ?? '';
    if (p.status === 401 || p.status === 403) add('info', opts.preview, `preview answers ${p.status} (protected): crawlers can't reach it`);
    else if (!/noindex/i.test(tag)) add('error', opts.preview, 'preview deployment without X-Robots-Tag: noindex: it can be indexed as a duplicate of the site');
  }
  return { origin, results: results.map((r) => ({ path: r.path, status: r.status, kind: r.kind, cacheControl: r.headers.get('cache-control'), contentEncoding: r.headers.get('content-encoding'), vercelCache: r.headers.get('x-vercel-cache'), xRobotsTag: r.headers.get('x-robots-tag') })), findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  const site = opts._[0];
  if (opts.help || !site) {
    console.log('usage: node check-headers.mjs https://www.example.com [--paths /a/,/b.js] [--no-assets] [--preview https://x.vercel.app] [--json out.json]');
    process.exit(opts.help ? 0 : 2);
  }
  try {
    const out = await run(site, { paths: opts.paths ? String(opts.paths).split(',') : [], assets: !opts['no-assets'], preview: opts.preview });
    const byKind = new Map();
    for (const r of out.results) byKind.set(r.kind ?? `status ${r.status}`, [...(byKind.get(r.kind ?? `status ${r.status}`) ?? []), r]);
    console.log(`Headers on ${out.origin}: ${out.results.length} URLs`);
    for (const [k, list] of byKind) {
      const policies = [...new Set(list.map((r) => r.cacheControl ?? '(none)'))];
      console.log(`  ${k.padEnd(8)} ${String(list.length).padStart(3)}  cache-control: ${policies.join(' | ')}`);
    }
    for (const sev of ['error', 'warning', 'info']) {
      const list = out.findings.filter((f) => f.severity === sev);
      if (!list.length) continue;
      console.log(`\n${sev === 'error' ? 'Errors' : sev === 'warning' ? 'Warnings' : 'Notes'} (${list.length})`);
      for (const f of list) console.log(`  ${f.path}  ${f.message}`);
    }
    const errors = out.findings.filter((f) => f.severity === 'error').length;
    console.log(`\n${errors} error${errors === 1 ? '' : 's'}, ${out.findings.filter((f) => f.severity === 'warning').length} warnings.`);
    if (opts.json) writeFileSync(opts.json, JSON.stringify(out, null, 2));
    process.exit(errors ? 1 : 0);
  } catch (e) {
    console.error(`check-headers: ${e.message}`);
    process.exit(2);
  }
}
