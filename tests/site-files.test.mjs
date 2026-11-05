import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SITE, load } from './helpers.mjs';

const { decode, attrs, parseHtml, fileToPath, buildFiles, resolveInBuild, parseSitemap, args } = await load('seo-technical-audit', 'site-files.mjs');

test('decode: named and numeric references', () => {
  assert.equal(decode('Tom &amp; Jerry &#8211; &#x2014; &euro;5 &unknown;'), 'Tom & Jerry – — €5 &unknown;');
  assert.equal(decode('&#99999999;'), '&#99999999;');
});

test('attrs: quotes, bare attributes, first value wins, ">" inside a value', () => {
  assert.deepEqual(attrs(`<meta name="description" content='A > B' data-x=1 hidden content="second">`), { name: 'description', content: 'A > B', 'data-x': '1', hidden: '' });
});

test('parseHtml ignores tags inside scripts and comments, and reads the head', () => {
  const html = `<!doctype html><html lang="en-GB"><head><title>A &amp; B</title>
    <meta name="description" content="x > y"><link rel="canonical" href="https://a.test/p/">
    <link rel="alternate" hreflang="nl" href="https://a.test/nl/p/"><meta property="og:image" content="https://a.test/i.jpg">
    <script type="application/ld+json">{"@context":"https://schema.org"}</script></head>
    <body><!-- <a href="/c/">x</a> --><script>var s = '<a href="/s/"></a><h1>no</h1>';</script>
    <h1>Title <em>here</em></h1><h3>Sub</h3><a href="/real/">r</a><img src="/i.png" srcset="/i-2x.png 2x, /i-3x.png 3x" alt=""></body></html>`;
  const p = parseHtml(html);
  assert.equal(p.lang, 'en-GB');
  assert.equal(p.title, 'A & B');
  assert.equal(p.description, 'x > y');
  assert.equal(p.canonical, 'https://a.test/p/');
  assert.deepEqual(p.hreflang, [{ lang: 'nl', href: 'https://a.test/nl/p/' }]);
  assert.equal(p.og['og:image'], 'https://a.test/i.jpg');
  assert.deepEqual(p.links, ['/real/']);
  assert.deepEqual(p.headings, [{ level: 1, text: 'Title here' }, { level: 3, text: 'Sub' }]);
  assert.deepEqual(p.assets, ['/i.png', '/i-2x.png', '/i-3x.png']);
  assert.equal(p.jsonld.length, 1);
});

test('fileToPath and resolveInBuild follow how static hosts serve folders', () => {
  assert.equal(fileToPath('index.html'), '/');
  assert.equal(fileToPath('about/index.html'), '/about/');
  assert.equal(fileToPath('404.html'), '/404.html');
  const files = buildFiles(SITE);
  assert.equal(resolveInBuild(files, '/about/'), 'page');
  assert.equal(resolveInBuild(files, '/about'), 'slashless');
  assert.equal(resolveInBuild(files, '/nl/index.html'), 'index');
  assert.equal(resolveInBuild(files, '/img/logo.png'), 'file');
  assert.equal(resolveInBuild(files, '/missing/'), null);
});

test('parseSitemap reads URLs, lastmod and hreflang alternates', () => {
  const s = parseSitemap(`<urlset><url><loc>https://a.test/?a=1&amp;b=2</loc><lastmod>2026-01-02</lastmod><xhtml:link rel="alternate" hreflang="nl" href="https://a.test/nl/"/></url></urlset>`);
  assert.deepEqual(s.urls, [{ loc: 'https://a.test/?a=1&b=2', lastmod: '2026-01-02', alternates: [{ lang: 'nl', href: 'https://a.test/nl/' }] }]);
  assert.deepEqual(parseSitemap('<sitemapindex><sitemap><loc>https://a.test/s1.xml</loc></sitemap></sitemapindex>').sitemaps, ['https://a.test/s1.xml']);
});

test('args: values, flags, = form and positionals', () => {
  assert.deepEqual(args(['https://a.test', '--dir', 'dist', '--strict', '--json=out.json']), { _: ['https://a.test'], dir: 'dist', strict: true, json: 'out.json' });
});
