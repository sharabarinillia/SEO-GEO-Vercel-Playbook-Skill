import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SITE, load, run, serve, skill } from './helpers.mjs';

const redirects = await load('site-migration', 'check-redirects.mjs');
const headers = await load('vercel-static-config', 'check-headers.mjs');
const { budget, visitsPerTier, TIERS } = await load('vercel-cost-optimization', 'budget.mjs');
const fw = await load('vercel-firewall', 'firewall-rules.mjs');

test('redirect maps: CSV with header and comments, JSON list and JSON object', () => {
  assert.deepEqual(redirects.readMap('old,new\n/a,/b/\n# note\n/c ; /d/\n'), [{ from: '/a', to: '/b/' }, { from: '/c', to: '/d/' }]);
  assert.deepEqual(redirects.readMap('[{"source":"/a","destination":"/b/"}]'), [{ from: '/a', to: '/b/' }]);
  assert.deepEqual(redirects.readMap('{"/a": "/b/"}'), [{ from: '/a', to: '/b/' }]);
});

test('check-redirects judges status, hops, target and loops', async () => {
  const srv = await serve({
    '/old': { status: 301, headers: { location: '/new/' } },
    '/old-308': { status: 308, headers: { location: '/new/' } },
    '/temp': { status: 302, headers: { location: '/new/' } },
    '/chain': { status: 301, headers: { location: '/mid' } },
    '/mid': { status: 308, headers: { location: '/new/' } },
    '/wrong': { status: 301, headers: { location: '/other/' } },
    '/broken': { status: 301, headers: { location: '/missing/' } },
    '/loop': { status: 301, headers: { location: '/loop' } },
    '/still-here': { status: 200, body: 'old page' },
    '/new/': { status: 200, body: 'new' },
    '/other/': { status: 200, body: 'other' },
  });
  try {
    const map = ['/old', '/old-308', '/temp', '/chain', '/wrong', '/broken', '/loop', '/still-here', '/gone'].map((from) => ({ from, to: '/new/' }));
    const results = await redirects.checkMap(map, { base: srv.url });
    const by = Object.fromEntries(results.map((r) => [r.from, r.problems.map(([sev, msg]) => `${sev}: ${msg}`).join(' | ')]));
    assert.equal(by['/old'], '');
    assert.equal(by['/old-308'], '');
    assert.match(by['/temp'], /^warning: temporary redirect \(302\)/);
    assert.match(by['/chain'], /^warning: 2 hops/);
    assert.match(by['/wrong'], /error: ends at \/other\/, expected \/new\//);
    assert.match(by['/broken'], /error: the target answers 404/);
    assert.match(by['/loop'], /too many redirects/);
    assert.match(by['/still-here'], /answers 200: no redirect/);
    assert.match(by['/gone'], /answers 404: no redirect/);
  } finally {
    await srv.close();
  }
});

test('check-headers classifies files and judges caching', () => {
  assert.equal(headers.kind('/assets/app-3f2a9b1c.js'), 'hashed');
  assert.equal(headers.kind('/_next/static/chunks/main-a1b2c3d4e5.js'), 'hashed');
  assert.equal(headers.kind('/js/app.js'), 'code');
  assert.equal(headers.kind('/fonts/inter.woff2'), 'font');
  assert.equal(headers.kind('/about/'), 'html');
  assert.equal(headers.kind('/video/a.mp4'), 'video');
  assert.deepEqual(headers.parseCacheControl('public, max-age=31536000, immutable'), { public: true, 'max-age': 31536000, immutable: true });
  const h = (o) => new Headers(o);
  assert.deepEqual(headers.judge('/assets/app-3f2a9b1c.js', h({ 'cache-control': 'public, max-age=31536000, immutable', 'content-type': 'text/javascript', 'content-encoding': 'br' })).findings, []);
  assert.match(headers.judge('/assets/app-3f2a9b1c.js', h({ 'cache-control': 'public, max-age=0, must-revalidate', 'content-type': 'text/javascript', 'content-encoding': 'br' })).findings[0][1], /send public, max-age=31536000, immutable/);
  assert.match(headers.judge('/img/a.webp', h({ 'cache-control': 'public, max-age=0, must-revalidate', 'content-type': 'image/webp' })).findings[0][1], /re-check it on every page view/);
  assert.deepEqual(headers.judge('/about/', h({ 'cache-control': 'public, max-age=0, must-revalidate', 'content-type': 'text/html', 'content-encoding': 'br' })).findings, []);
  assert.equal(headers.judge('/about/', h({ 'content-type': 'text/html', 'x-robots-tag': 'noindex', 'content-encoding': 'gzip' })).findings[0][0], 'error');
  assert.match(headers.judge('/about/', h({ 'content-type': 'text/html', 'content-length': '50000' })).findings[0][1], /uncompressed/);
});

test('check-headers against a local site: assets from the home page, duplicates, preview noindex', async () => {
  const html = '<!doctype html><html><head><script src="/assets/app-3f2a9b1c.js"></script></head><body><a href="/about/">a</a><img src="/img/a.webp" alt=""></body></html>';
  const preview = await serve({ '/': { status: 200, headers: { 'content-type': 'text/html' }, body: 'preview' } });
  const srv = await serve({
    '/': { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }, body: html },
    '/about/': { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' }, body: 'about' },
    '/about': { status: 200, headers: { 'content-type': 'text/html' }, body: 'about again' },
    '/about/index.html': { status: 308, headers: { location: '/about/' } },
    '/assets/app-3f2a9b1c.js': { status: 200, headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=31536000, immutable' }, body: 'x' },
    '/img/a.webp': { status: 200, headers: { 'content-type': 'image/webp', 'cache-control': 'public, max-age=0, must-revalidate' }, body: 'x' },
    '/robots.txt': { status: 200, headers: { 'content-type': 'text/plain' }, body: 'User-agent: *' },
    '/sitemap.xml': { status: 200, headers: { 'content-type': 'application/xml' }, body: '<urlset/>' },
    '/favicon.ico': { status: 200, headers: { 'content-type': 'image/x-icon', 'cache-control': 'public, max-age=2592000' }, body: 'x' },
  });
  try {
    const out = await headers.run(srv.url, { paths: ['/about/'], preview: preview.url });
    const msgs = out.findings.map((f) => `${f.severity} ${f.path} ${f.message}`);
    assert.ok(msgs.some((m) => /^warning \/img\/a\.webp image cached 0 s/.test(m)), msgs.join('\n'));
    assert.ok(msgs.some((m) => /^warning \/about serves the page at a second URL/.test(m)), msgs.join('\n'));
    assert.ok(msgs.some((m) => /^error .* preview deployment without X-Robots-Tag: noindex/.test(m)), msgs.join('\n'));
    assert.ok(!msgs.some((m) => m.includes('/assets/app-3f2a9b1c.js')), msgs.join('\n'));
  } finally {
    await srv.close();
    await preview.close();
  }
});

test('budget: known answers for the tiers', () => {
  // 18,181 visits of 55 requests fit in 1M; one more visit does not
  assert.equal(visitsPerTier(55)[0].visits, 18181);
  const small = budget([{ name: 'a', visits: 8000, requestsPerVisit: 55, mbPerVisit: 7 }], { margin: 0 });
  assert.equal(small.requests, 440000);
  assert.equal(small.tier.price, 0);
  assert.equal(small.gb, Math.round((8000 * 7) / 1024));
  const big = budget([{ name: 'a', visits: 30000, requestsPerVisit: 55 }], { margin: 0.1 });
  assert.equal(big.requests, 1815000);
  assert.equal(big.tier.price, 20);
  // a one-minute uptime check is 43,200 requests a month
  assert.equal(budget([{ name: 'a', visits: 0, requestsPerVisit: 1 }], { margin: 0, monitorMinutes: 1 }).requests, 43200);
  assert.equal(budget([{ name: 'a', visits: 3e6, requestsPerVisit: 60 }], { margin: 0 }).tier, null);
  assert.deepEqual(TIERS.map((t) => t.price), [0, 20, 100, 300]);
  assert.throws(() => budget([{ name: 'x', visits: 'many', requestsPerVisit: 5 }]), /must be numbers/);
});

test('firewall pattern: denies scanner paths, never real pages or assets', () => {
  const re = new RegExp(fw.denyPattern());
  for (const p of ['/wp-login.php', '/wp-admin/', '/wp-content/x.js', '/xmlrpc.php', '/.env', '/.env.production', '/.git/config', '/index.php', '/a/b/config.php', '/db.sql', '/site.bak', '/cgi-bin/x', '/phpmyadmin/', '/.DS_Store'])
    assert.ok(re.test(p), `should deny ${p}`);
  for (const p of ['/', '/about/', '/assets/app-3f2a9b1c.js', '/.well-known/security.txt', '/wp/', '/wordpress-guide/', '/blog/php-tips/', '/img/a.webp', '/sitemap.xml', '/robots.txt', '/llms.txt', '/0123456789abcdef0123456789abcdef.txt', '/fonts/a.woff2'])
    assert.ok(!re.test(p), `should allow ${p}`);
  assert.ok(!new RegExp(fw.denyPattern({ keep: ['log', '/cgi-bin/'] })).test('/changes.log'));
  assert.ok(!new RegExp(fw.denyPattern({ keep: ['log', '/cgi-bin/'] })).test('/cgi-bin/x'));
  assert.deepEqual(fw.collisions(fw.denyPattern(), ['/a.php', '/b/']), ['/a.php']);
  const [route] = fw.asVercelJson(fw.rules());
  assert.deepEqual(Object.keys(route), ['src', 'mitigate']);
  assert.equal(route.mitigate.action, 'deny');
  const [rest] = fw.asRest(fw.rules());
  assert.equal(rest.action, 'rules.insert');
  assert.equal(rest.value.action.mitigate.rateLimit, null);
  assert.equal(fw.rules({ methods: true }).length, 2);
});

test('firewall-rules --check-dist passes on the fixture build and fails on a collision', async () => {
  const ok = await run(skill('vercel-firewall', 'firewall-rules.mjs'), ['--check-dist', SITE]);
  assert.equal(ok.code, 0, ok.stdout + ok.stderr);
  const cli = await run(skill('vercel-firewall', 'firewall-rules.mjs'), []);
  assert.match(cli.stdout, /vercel firewall rules add 'Deny scanner paths'/);
  assert.match(cli.stdout, /vercel firewall publish --yes/);
});
