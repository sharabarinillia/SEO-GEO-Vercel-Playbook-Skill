#!/usr/bin/env node
/**
 * Which search engines and AI crawlers a robots.txt lets in, page by page. Matching follows
 * RFC 9309 as Google implements it: a crawler obeys the group with its product token (or *),
 * the longest matching rule wins, and Allow wins a tie.
 *
 *   node robots-check.mjs https://www.example.com [--paths /,/services/,/video/a.mp4]
 *   node robots-check.mjs --file dist/robots.txt [--paths /,/blog/]
 *   add --fetch to request each path with each bot's user agent and show the status the site returns
 *   add --json FILE to write the table
 *
 * --fetch caveat: a request that only claims to be a bot is not that bot. Firewalls that verify bots
 * (by IP or signature) may block the impostor and still let the real bot in, so a 403 here means
 * "check the firewall log for the real bot", not "the bot is blocked".
 *
 * Exit code: 0 checked, 1 robots.txt blocks every crawler from the home page, 2 could not run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { args, get } from './site-files.mjs';

/** crawlers by purpose; tokens as their operators document them (checked November 2026) */
export const BOTS = [
  { token: 'Googlebot', group: 'search', note: 'Google Search; Google AI Overviews and AI Mode use the same index' },
  { token: 'Bingbot', group: 'search', note: 'Bing; Microsoft Copilot answers come from the Bing index' },
  { token: 'Applebot', group: 'search', note: 'Apple Spotlight, Siri and Safari suggestions' },
  { token: 'DuckDuckBot', group: 'search', note: 'DuckDuckGo' },
  { token: 'OAI-SearchBot', group: 'ai-search', note: 'OpenAI: shows pages as sources in ChatGPT search' },
  { token: 'Claude-SearchBot', group: 'ai-search', note: 'Anthropic: search results for Claude' },
  { token: 'PerplexityBot', group: 'ai-search', note: 'Perplexity: its search index' },
  { token: 'ChatGPT-User', group: 'ai-user', note: 'OpenAI: fetches a page a ChatGPT user asked about' },
  { token: 'Claude-User', group: 'ai-user', note: 'Anthropic: fetches a page a Claude user asked about' },
  { token: 'Perplexity-User', group: 'ai-user', note: 'Perplexity: fetches a page a user asked about' },
  { token: 'GPTBot', group: 'ai-training', note: 'OpenAI: training data' },
  { token: 'ClaudeBot', group: 'ai-training', note: 'Anthropic: training data' },
  { token: 'Google-Extended', group: 'ai-training', note: 'Google: control token for Gemini model use (not a separate crawler)' },
  { token: 'Applebot-Extended', group: 'ai-training', note: 'Apple: control token for model training (not a separate crawler)' },
  { token: 'CCBot', group: 'ai-training', note: 'Common Crawl: open dataset used to train many models' },
  { token: 'meta-externalagent', group: 'ai-training', note: 'Meta: AI training and indexing' },
];
const GROUP_NAME = { search: 'Search engines', 'ai-search': 'AI search', 'ai-user': 'AI, fetched for a user', 'ai-training': 'AI training' };
const SAMPLE_UA = (token) => `Mozilla/5.0 (compatible; ${token}/1.0)`;

/** parses robots.txt into groups: [{ agents: [lower-case tokens], rules: [{ allow, path }] }] and sitemaps */
export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  let current = null;
  let inRules = false;
  for (const raw of text.replace(/^﻿/, '').split(/\r?\n|\r/)) {
    const line = raw.replace(/#.*/, '').trim();
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') {
      if (!current || inRules) {
        current = { agents: [], rules: [] };
        groups.push(current);
        inRules = false;
      }
      current.agents.push(value.toLowerCase());
    } else if (key === 'allow' || key === 'disallow') {
      if (!current) continue; // rules before any user-agent line belong to nobody
      inRules = true;
      if (key === 'disallow' && value === '') continue; // empty Disallow allows everything
      current.rules.push({ allow: key === 'allow', path: value });
    } else if (key === 'sitemap') sitemaps.push(value);
  }
  return { groups, sitemaps };
}

/** the rules a crawler obeys: every group naming its token (merged), else the * groups, else none */
export function rulesFor(parsed, token) {
  const t = token.toLowerCase();
  const own = parsed.groups.filter((g) => g.agents.includes(t));
  const chosen = own.length ? own : parsed.groups.filter((g) => g.agents.includes('*'));
  return { rules: chosen.flatMap((g) => g.rules), matched: own.length ? token : chosen.length ? '*' : null };
}

/** a robots.txt path pattern as a RegExp: * matches anything, a final $ anchors the end, everything else is literal */
const toRegExp = (pattern) => {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  return new RegExp('^' + body.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + (anchored ? '$' : ''));
};

/** true if `path` (with query) may be crawled under these rules */
export function allowed(rules, path) {
  if (path === '/robots.txt') return true;
  let best = null;
  for (const r of rules) {
    if (!toRegExp(r.path).test(path)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow && !best.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}

export function check(robotsText, paths) {
  const parsed = parseRobots(robotsText);
  const rows = BOTS.map((b) => {
    const { rules, matched } = rulesFor(parsed, b.token);
    return { ...b, matched, paths: Object.fromEntries(paths.map((p) => [p, allowed(rules, p)])) };
  });
  return { rows, sitemaps: parsed.sitemaps, groups: parsed.groups.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  const site = opts._[0];
  if (opts.help || (!site && !opts.file)) {
    console.log('usage: node robots-check.mjs https://www.example.com [--paths /,/blog/] [--fetch] [--json out.json]\n       node robots-check.mjs --file robots.txt [--paths /,/blog/]');
    process.exit(opts.help ? 0 : 2);
  }
  const paths = String(opts.paths ?? '/').split(',').map((p) => p.trim()).filter(Boolean);
  let text;
  if (opts.file) text = readFileSync(opts.file, 'utf8');
  else {
    const r = await get(new URL('/robots.txt', site).href);
    if (r.status === 404) {
      console.log(`${site}/robots.txt: 404, so every crawler may crawl everything (a robots.txt with a Sitemap line is still recommended).`);
      process.exit(0);
    }
    if (r.status !== 200) {
      console.error(`robots.txt answered ${r.status || r.error}. Google treats 5xx answers as "crawl nothing" for a while.`);
      process.exit(2);
    }
    text = r.text;
  }
  const result = check(text, paths);
  console.log(`robots.txt: ${result.groups} group${result.groups === 1 ? '' : 's'}, sitemap ${result.sitemaps.length ? result.sitemaps.join(', ') : 'NOT LISTED'}`);
  const width = Math.max(...paths.map((p) => p.length), 7);
  for (const g of Object.keys(GROUP_NAME)) {
    console.log(`\n${GROUP_NAME[g]}`);
    console.log(`  ${'bot'.padEnd(20)} ${'group'.padEnd(20)} ${paths.map((p) => p.padEnd(width)).join(' ')}`);
    for (const r of result.rows.filter((x) => x.group === g))
      console.log(`  ${r.token.padEnd(20)} ${(r.matched ?? '(none: all allowed)').padEnd(20)} ${paths.map((p) => (r.paths[p] ? 'allowed' : 'BLOCKED').padEnd(width)).join(' ')}`);
  }
  const blockedSearch = result.rows.filter((r) => (r.group === 'search' || r.group === 'ai-search') && !r.paths[paths[0]]);
  if (blockedSearch.length) console.log(`\nNote: ${blockedSearch.map((r) => r.token).join(', ')} cannot crawl ${paths[0]}. Blocking AI search bots removes the site from those assistants' citations.`);

  if (opts.fetch && site) {
    console.log(`\nResponses to requests that claim to be each bot (see the caveat in this script's header):`);
    for (const r of result.rows.filter((x) => !/Extended$/.test(x.token))) {
      const statuses = [];
      for (const p of paths) {
        const res = await get(new URL(p, site).href, { headers: { 'user-agent': SAMPLE_UA(r.token) }, body: false });
        statuses.push(String(res.status || res.error).padEnd(width));
      }
      console.log(`  ${r.token.padEnd(20)} ${''.padEnd(20)} ${statuses.join(' ')}`);
    }
  }
  if (opts.json) writeFileSync(opts.json, JSON.stringify(result, null, 2));
  const allBlocked = result.rows.filter((r) => r.group === 'search').every((r) => !r.paths['/'] && paths.includes('/'));
  process.exit(allBlocked ? 1 : 0);
}
