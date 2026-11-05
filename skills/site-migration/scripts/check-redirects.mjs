#!/usr/bin/env node
/**
 * Checks a redirect map against a live site: every old URL must answer a permanent redirect
 * (301 or 308) straight to its new page, and that page must answer 200. Also checks the host
 * variants (http://, apex ↔ www) when --hosts is given.
 *
 *   node check-redirects.mjs --map redirects.csv --base https://www.example.com
 *   node check-redirects.mjs --map redirects.json --base https://preview-abc.vercel.app   (test before the DNS switch)
 *   node check-redirects.mjs --hosts https://www.example.com
 *
 * Map formats: CSV lines "old,new" (a header line is skipped; # starts a comment), or JSON
 * [{ "from": "/old", "to": "/new/" }] or { "/old": "/new/" }. Paths are resolved against --base,
 * so the same map tests a preview deployment and production.
 *
 *   --base URL         where to send the requests (default: the host of the first absolute URL in the map)
 *   --keep-host        compare the final URL including its host (default: compare paths only)
 *   --hosts URL        also check http://, apex and www variants of this canonical origin
 *   --concurrency N    parallel requests (default 4)
 *   --json FILE        write every result
 *
 * Exit code: 0 all good, 1 problems found, 2 could not run. Node.js 18+, no packages.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { args, follow, pool } from './site-files.mjs';

/** reads a CSV or JSON redirect map into [{ from, to }] */
export function readMap(text) {
  const t = text.trim();
  if (t.startsWith('[') || t.startsWith('{')) {
    const data = JSON.parse(t);
    return Array.isArray(data) ? data.map((d) => ({ from: d.from ?? d.source ?? d.old, to: d.to ?? d.destination ?? d.new })) : Object.entries(data).map(([from, to]) => ({ from, to }));
  }
  return t
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((l) => l.split(/\s*[,;\t]\s*/))
    .filter(([a, b]) => a && b && !/^(old|from|source)$/i.test(a))
    .map(([from, to]) => ({ from, to }));
}

const norm = (u, keepHost) => {
  const x = new URL(u);
  x.hash = '';
  return keepHost ? x.href : x.pathname + x.search;
};

/** checks one mapping; hops are [{ url, status, location }] */
export function judge({ from, to }, hops, { keepHost = false } = {}) {
  const problems = [];
  const first = hops[0];
  const last = hops.at(-1);
  const redirects = hops.filter((h) => h.status >= 300 && h.status < 400);
  if (first.status === 0) problems.push(['error', `request failed: ${first.error}`]);
  else if (first.status === 200) problems.push(['error', 'answers 200: no redirect (the old URL still serves a page)']);
  else if (first.status === 404 || first.status === 410) problems.push(['error', `answers ${first.status}: no redirect`]);
  else if (first.status === 302 || first.status === 307) problems.push(['warning', `temporary redirect (${first.status}); use 301 or 308 so search engines move the ranking`]);
  else if (!(first.status === 301 || first.status === 308) && !(first.status >= 300 && first.status < 400)) problems.push(['error', `answers ${first.status}`]);
  if (redirects.length > 1) problems.push(['warning', `${redirects.length} hops (${hops.map((h) => h.status).join(' → ')}): point the old URL straight at the final page`]);
  if (last.status >= 300 && last.status < 400) problems.push(['error', 'too many redirects (loop?)']);
  else if (redirects.length && last.status !== 200) problems.push(['error', `the target answers ${last.status || last.error}`]);
  if (redirects.length && to && norm(last.url, keepHost) !== norm(new URL(to, last.url).href, keepHost)) problems.push(['error', `ends at ${norm(last.url, keepHost)}, expected ${norm(new URL(to, last.url).href, keepHost)}`]);
  return problems;
}

export async function checkMap(map, { base, keepHost = false, concurrency = 4 } = {}) {
  return pool(map, concurrency, async (m) => {
    const url = new URL(m.from, base).href;
    const to = m.to ? new URL(m.to, base).href : null;
    const hops = await follow(url, { body: false });
    return { ...m, url, hops: hops.map(({ url: u, status, location, error }) => ({ url: u, status, location, error })), problems: judge({ from: url, to }, hops, { keepHost }) };
  });
}

/** http:// and apex/www variants of a canonical origin should reach it in one permanent hop */
export async function checkHosts(origin) {
  const o = new URL(origin);
  const apex = o.hostname.replace(/^www\./, '');
  const variants = [...new Set([`http://${o.hostname}/`, `https://${apex}/`, `http://${apex}/`, `https://www.${apex}/`].filter((v) => new URL(v).origin !== o.origin))];
  return pool(variants, 4, async (v) => {
    const hops = await follow(v, { body: false });
    return { from: v, to: o.origin + '/', url: v, hops: hops.map(({ url, status, location, error }) => ({ url, status, location, error })), problems: judge({ from: v, to: o.origin + '/' }, hops, { keepHost: true }) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  if (opts.help || (!opts.map && !opts.hosts)) {
    console.log('usage: node check-redirects.mjs --map redirects.csv --base https://www.example.com [--keep-host] [--json out.json]\n       node check-redirects.mjs --hosts https://www.example.com');
    process.exit(opts.help ? 0 : 2);
  }
  try {
    const results = [];
    if (opts.map) {
      const map = readMap(readFileSync(opts.map, 'utf8'));
      if (!map.length) throw new Error(`no "old,new" pairs in ${opts.map}`);
      const base = opts.base ?? map.map((m) => m.from).find((f) => /^https?:/.test(f));
      if (!base) throw new Error('pass --base https://… (the map has only paths)');
      console.log(`Checking ${map.length} redirect${map.length === 1 ? '' : 's'} on ${new URL(base).origin}`);
      results.push(...(await checkMap(map, { base, keepHost: !!opts['keep-host'], concurrency: Number(opts.concurrency ?? 4) })));
    }
    if (opts.hosts) {
      console.log(`Checking host variants of ${new URL(opts.hosts).origin}`);
      results.push(...(await checkHosts(opts.hosts)));
    }
    let errors = 0;
    let warnings = 0;
    for (const r of results) {
      const chain = r.hops.map((h) => h.status || 'ERR').join(' → ');
      if (!r.problems.length) continue;
      for (const [sev, msg] of r.problems) {
        sev === 'error' ? errors++ : warnings++;
        console.log(`  ${sev === 'error' ? 'ERROR' : 'warn '}  ${r.from}  [${chain}]  ${msg}`);
      }
    }
    const ok = results.filter((r) => !r.problems.length).length;
    console.log(`\n${ok} of ${results.length} correct; ${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}.`);
    if (opts.json) writeFileSync(opts.json, JSON.stringify(results, null, 2));
    process.exit(errors ? 1 : 0);
  } catch (e) {
    console.error(`check-redirects: ${e.message}`);
    process.exit(2);
  }
}
