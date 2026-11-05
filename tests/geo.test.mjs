import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { SITE, load, run, skill } from './helpers.mjs';

const { parseRobots, rulesFor, allowed, check, BOTS } = await load('geo-ai-search', 'robots-check.mjs');
const { draft } = await load('geo-ai-search', 'llms-txt.mjs');
const { loadBuild } = await load('geo-ai-search', 'site-files.mjs');

const robots = readFileSync(join(SITE, 'robots.txt'), 'utf8');

test('robots: each bot obeys its own group, else *', () => {
  const p = parseRobots(robots);
  assert.equal(p.groups.length, 3);
  assert.deepEqual(p.sitemaps, ['https://www.example.com/sitemap.xml']);
  assert.equal(rulesFor(p, 'GPTBot').matched, 'GPTBot');
  assert.equal(rulesFor(p, 'gptbot').matched, 'gptbot'); // tokens match case-insensitively
  assert.equal(rulesFor(p, 'PerplexityBot').matched, 'PerplexityBot'); // two user-agent lines share one group
  assert.equal(rulesFor(p, 'Googlebot').matched, '*');
});

test('robots: longest match wins, Allow wins a tie, * and $ work', () => {
  const r = (bot) => rulesFor(parseRobots(robots), bot).rules;
  assert.equal(allowed(r('Googlebot'), '/'), true);
  assert.equal(allowed(r('Googlebot'), '/private/x'), false);
  assert.equal(allowed(r('Googlebot'), '/private/public-page'), true);
  assert.equal(allowed(r('Googlebot'), '/private/public-page/more'), false); // $ anchors the end
  assert.equal(allowed(r('Googlebot'), '/files/a.pdf'), false);
  assert.equal(allowed(r('Googlebot'), '/files/a.pdf?download=1'), true);
  assert.equal(allowed(r('GPTBot'), '/'), false);
  assert.equal(allowed(r('GPTBot'), '/robots.txt'), true); // robots.txt itself is always allowed
  assert.equal(allowed(r('OAI-SearchBot'), '/video/a.mp4'), false);
  assert.equal(allowed(r('OAI-SearchBot'), '/private/x'), true); // its own group has no /private/ rule
  const tie = rulesFor(parseRobots('User-agent: *\nDisallow: /page\nAllow: /page\n'), 'x').rules;
  assert.equal(allowed(tie, '/page'), true);
  const literal = rulesFor(parseRobots('User-agent: *\nDisallow: /a$b\n'), 'x').rules;
  assert.equal(allowed(literal, '/a$b'), false); // a $ that is not last is a literal character
  assert.equal(allowed(rulesFor(parseRobots('User-agent: *\nDisallow:\n'), 'x').rules, '/anything'), true);
});

test('robots: the table covers search, AI search, user fetchers and training bots', () => {
  const groups = new Set(BOTS.map((b) => b.group));
  assert.deepEqual([...groups].sort(), ['ai-search', 'ai-training', 'ai-user', 'search']);
  const result = check(robots, ['/', '/video/a.mp4']);
  const row = (t) => result.rows.find((r) => r.token === t);
  assert.equal(row('GPTBot').paths['/'], false);
  assert.equal(row('OAI-SearchBot').paths['/'], true);
  assert.equal(row('OAI-SearchBot').paths['/video/a.mp4'], false);
  assert.equal(row('ClaudeBot').matched, '*');
});

test('robots-check CLI reads a local file', async () => {
  const r = await run(skill('geo-ai-search', 'robots-check.mjs'), ['--file', join(SITE, 'robots.txt'), '--paths', '/,/private/x']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /GPTBot\s+GPTBot\s+BLOCKED/);
});

test('llms-txt draft: summary, sections, other languages, no noindex or 404 pages', () => {
  const text = draft(loadBuild(SITE), { site: 'https://www.example.com' });
  assert.match(text, /^# Example Freight\n\n> Air and road freight from Rotterdam since 1998/);
  assert.match(text, /## Optional: pages in nl\n\n- \[Example Freight: lucht- en wegvracht vanuit Rotterdam\]\(https:\/\/www\.example\.com\/nl\/\)/);
  assert.doesNotMatch(text, /Over Example Freight/); // noindex
  assert.doesNotMatch(text, /Page not found/); // 404
  assert.match(text, /## Company\n\n- \[[^\]]+\]\(https:\/\/www\.example\.com\/about\/\)/); // a relative canonical that resolves to the page itself keeps it
});
