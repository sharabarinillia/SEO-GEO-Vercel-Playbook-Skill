#!/usr/bin/env node
/**
 * Tells Bing (and the other IndexNow engines, which share submissions) which pages changed, so they
 * recrawl them within minutes. Bing's index also feeds Microsoft Copilot. Google does not use IndexNow.
 * Run it after a production deploy.
 *
 * One-time setup: make a key of 32 hex characters
 *   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
 * save it as <static folder>/<key>.txt containing only the key, and deploy, so
 * https://<host>/<key>.txt is live before the first submission.
 *
 *   node indexnow.mjs --host www.example.com                      pages whose sitemap lastmod is today
 *   node indexnow.mjs --host www.example.com --since 2026-10-01   pages changed on or after a date
 *   node indexnow.mjs --host www.example.com --since all          every page in the sitemap
 *   node indexnow.mjs --host www.example.com --urls /a/,/b/       these pages
 *
 *   --sitemap FILE|URL  default https://<host>/sitemap.xml
 *   --key KEY           the key; default: the <32 hex>.txt file in --public (default: public)
 *   --dry               list the URLs, send nothing
 *
 * Exit code: 0 sent (or nothing to send), 1 IndexNow refused, 2 could not run.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};
const fail = (m) => {
  console.error(`indexnow: ${m}`);
  process.exit(2);
};

const HOST = arg('host');
if (!HOST || argv.includes('--help')) {
  console.log('usage: node indexnow.mjs --host www.example.com [--since YYYY-MM-DD|all] [--urls /a/,/b/] [--sitemap FILE|URL] [--key KEY] [--public DIR] [--dry]');
  process.exit(argv.includes('--help') ? 0 : 2);
}
const dry = argv.includes('--dry');
const since = arg('since', new Date().toISOString().slice(0, 10));
if (since !== 'all' && !/^\d{4}-\d{2}-\d{2}$/.test(since)) fail(`--since takes a date (YYYY-MM-DD) or "all", got "${since}"`);

let key = arg('key');
if (!key) {
  const dir = arg('public', 'public');
  const file = existsSync(dir) ? readdirSync(dir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f)) : null;
  if (!file) fail(`no key: pass --key, or put a <32 hex characters>.txt key file in ${dir}/`);
  key = file.slice(0, -4);
}
if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) fail('the key must be 8–128 letters, digits or dashes');

let urlList;
if (arg('urls')) urlList = arg('urls').split(',').map((u) => new URL(u.trim(), `https://${HOST}`).href);
else {
  const source = arg('sitemap', `https://${HOST}/sitemap.xml`);
  let xml;
  if (/^https?:/.test(source)) {
    const res = await fetch(source);
    if (!res.ok) fail(`${source} answered ${res.status}`);
    xml = await res.text();
  } else xml = readFileSync(source, 'utf8');
  urlList = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map(([, u]) => ({ loc: u.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1]?.replace(/&amp;/g, '&'), lastmod: u.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '' }))
    .filter((u) => u.loc && new URL(u.loc).host === HOST && (since === 'all' || u.lastmod.slice(0, 10) >= since))
    .map((u) => u.loc);
}

if (!urlList.length) {
  console.log(`No pages on ${HOST} changed since ${since}.`);
  process.exit(0);
}
if (urlList.length > 10000) fail('IndexNow takes at most 10,000 URLs per request');
console.log(`${urlList.length} URL${urlList.length === 1 ? '' : 's'}${arg('urls') || since === 'all' ? '' : ` changed since ${since}`}:\n  ${urlList.join('\n  ')}`);
if (dry) process.exit(0);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList }),
});
// 200 and 202 both mean accepted; 403 means the key file is not reachable on the site yet; 422 URLs not on the host
console.log(`IndexNow: ${res.status} ${res.statusText}`);
if (!res.ok) process.exit(1);
