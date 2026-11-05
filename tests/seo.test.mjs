import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { SITE, checks, load, run, serve, skill } from './helpers.mjs';

const { audit, blocksEveryone } = await load('seo-technical-audit', 'seo-audit.mjs');
const { serpWidth, TITLE_PX } = await load('seo-metadata', 'serp-width.mjs');
const { checkPage } = await load('structured-data', 'jsonld-check.mjs');

test('seo-audit finds every planted problem in the fixture build', async () => {
  const { findings, pages, site } = await audit({ dir: SITE });
  assert.equal(site, 'https://www.example.com');
  assert.equal(pages, 4);
  const at = (page) => checks(findings, page);
  // home page: the good parts stay quiet, the planted mistakes are found
  assert.deepEqual([...at('/')].sort(), ['file-missing', 'img-alt', 'img-size', 'link-broken', 'link-index-html', 'link-redirect', 'title-duplicate']);
  for (const c of ['description-missing', 'canonical-relative', 'h1-missing', 'jsonld-parse', 'heading-skip', 'hreflang-return', 'hreflang-x-default']) assert.ok(at('/about/').has(c), `/about/ ${c}`);
  for (const c of ['description-width', 'og-image-relative']) assert.ok(at('/nl/').has(c), `/nl/ ${c}`);
  for (const c of ['noindex', 'h1-multiple', 'description-short']) assert.ok(at('/nl/over/').has(c), `/nl/over/ ${c}`);
  for (const c of ['sitemap-url-missing', 'sitemap-lastmod', 'sitemap-host', 'sitemap-url-redirects']) assert.ok(at('/sitemap.xml').has(c), c);
  // links in comments and scripts are not links
  assert.ok(!findings.some((f) => /commented-out|inside-script/.test(f.message)));
  // the noindex page is left out of duplicate and sitemap checks
  assert.ok(!findings.some((f) => f.check === 'sitemap-page-missing' && f.page === '/nl/over/'));
});

test('seo-audit exit codes: 1 with errors, 2 without a source', async () => {
  const withErrors = await run(skill('seo-technical-audit', 'seo-audit.mjs'), ['--dir', SITE]);
  assert.equal(withErrors.code, 1);
  assert.match(withErrors.stdout, /14 errors/);
  assert.equal((await run(skill('seo-technical-audit', 'seo-audit.mjs'), [])).code, 2);
});

test('seo-audit live mode reads the sitemap and reports URLs that fail', async () => {
  const srv = await serve({}, SITE);
  try {
    const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8').replaceAll('https://www.example.com', srv.url).replace(/<url><loc>https:\/\/staging[^\n]*\n/, '');
    const local = await serve({ '/sitemap.xml': { headers: { 'content-type': 'application/xml' }, body: sitemap } }, SITE);
    try {
      const { findings } = await audit({ sitemap: `${local.url}/sitemap.xml` });
      assert.ok(findings.some((f) => f.check === 'sitemap-url-not-200' && f.page === '/gone/'));
      assert.ok(findings.some((f) => f.check === 'title-duplicate'));
    } finally {
      await local.close();
    }
  } finally {
    await srv.close();
  }
});

test('robots.txt that shuts out everyone is an error; a partial block is not', () => {
  assert.equal(blocksEveryone('User-agent: *\nDisallow: /\n'), true);
  assert.equal(blocksEveryone('User-agent: *\nDisallow: /\nAllow: /public/\n'), false);
  assert.equal(blocksEveryone('User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n'), false);
  assert.equal(blocksEveryone('User-agent: *\nDisallow: /private/\n'), false);
});

test('serp-width: known widths at 20 px Arial', () => {
  assert.equal(serpWidth('Hello', 20), 46); // H 722 + e 556 + l 222 + l 222 + o 556 = 2278 units × 20 px / 1000
  assert.equal(serpWidth('Hello', 14), 32);
  assert.equal(serpWidth('', 20), 0);
  assert.ok(serpWidth('W'.repeat(40), 20) > TITLE_PX);
});

test('jsonld-check: a clean graph passes; planted errors are found', () => {
  const good = JSON.stringify({ '@context': 'https://schema.org', '@graph': [{ '@type': 'Organization', '@id': 'https://a.test/#org', name: 'A', url: 'https://a.test/', logo: 'https://a.test/l.png' }, { '@type': 'WebSite', '@id': 'https://a.test/#site', name: 'A', url: 'https://a.test/', publisher: { '@id': 'https://a.test/#org' } }] });
  assert.deepEqual(checkPage([good]).findings, []);
  const bad = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'LocalBusiness', name: 'B', image: '/x.png' },
      { '@type': 'Event', name: 'E', startDate: 'next Friday', location: { '@id': 'https://a.test/#venue' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ position: 1, name: 'Home' }, { position: 2, name: 'Here' }] },
    ],
  });
  const found = new Set(checkPage([bad]).findings.map((f) => f.check));
  for (const c of ['property-required', 'url-relative', 'date-format', 'id-unresolved', 'breadcrumb-item']) assert.ok(found.has(c), c);
  assert.equal(checkPage(['{"@context": "https://schema.org",}']).findings[0].check, 'jsonld-parse');
});

test('jsonld-check runs over the fixture build', async () => {
  const r = await run(skill('structured-data', 'jsonld-check.mjs'), ['--dir', SITE]);
  assert.equal(r.code, 1);
  for (const c of ['id-unresolved', 'date-format', 'breadcrumb-position', 'faq-answer', 'org-id-varies']) assert.match(r.stdout, new RegExp(c));
});
