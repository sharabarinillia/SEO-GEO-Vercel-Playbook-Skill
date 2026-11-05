// Requests and bytes per page view, as the CDN sees them.
//
// For each page: a first visit in a fresh browser (empty cache), then the next page in the same
// visit (warm cache). Each page is scrolled to the bottom, so lazy images and videos load as they
// would for a reader (worst case). Desktop and phone. Only files from the site's own host count;
// other hosts are listed separately.
//
//   BASE=https://www.example.com PAGES=/,/services/,/contact/ NEXT=/about/ node measure-requests.cjs
//
// BASE   the site. Measure a deployment: local servers (`vite preview`) don't compress and send no-cache,
//        so there text bytes are too high and the next page re-checks shared files (small 304 answers)
// PAGES  comma-separated paths to measure as first visits (default /)
// NEXT   the page opened after each first visit (default: / after any other page, PAGES[1] after /)
// OUT    optional path for a JSON file with every request
//
// Needs Playwright: npm i -D playwright && npx playwright install chromium (or set PLAYWRIGHT to an existing install).
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const fs = require('fs');

const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const HOST = new URL(BASE).host;
const PAGES = (process.env.PAGES || '/').split(',');
const nextOf = (p) => process.env.NEXT || (p === '/' ? PAGES[1] || '/' : '/');
const DEVICES = [
  ['desktop', { viewport: { width: 1440, height: 900 } }],
  ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }],
];

async function view(page, cdp, url) {
  const reqs = new Map();
  const on = {
    'Network.requestWillBeSent': (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type || 'Other' }),
    'Network.responseReceived': (e) => {
      const r = reqs.get(e.requestId);
      if (!r) return;
      r.status = e.response.status;
      r.cached = e.response.fromDiskCache || e.response.fromPrefetchCache || e.response.fromServiceWorker;
      r.cc = e.response.headers['cache-control'] || e.response.headers['Cache-Control'];
    },
    'Network.requestServedFromCache': (e) => reqs.get(e.requestId) && (reqs.get(e.requestId).cached = true),
    'Network.loadingFinished': (e) => reqs.get(e.requestId) && (reqs.get(e.requestId).bytes = e.encodedDataLength),
  };
  for (const [k, f] of Object.entries(on)) cdp.on(k, f);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => innerHeight);
  for (let y = 0; y < height; y += Math.round(vh * 0.8)) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(2500);
  for (const [k, f] of Object.entries(on)) cdp.off(k, f);

  // a request reached the server if it got a status, was not served from a cache and moved bytes
  const net = [...reqs.values()].filter((r) => /^https?:/.test(r.url) && r.status && !r.cached && r.bytes > 0);
  const ours = net.filter((r) => new URL(r.url).host === HOST);
  const byType = {};
  for (const r of ours) {
    const t = (byType[r.type] ??= { n: 0, kb: 0 });
    t.n++;
    t.kb += r.bytes / 1024;
  }
  return {
    url,
    requests: ours.length,
    kb: Math.round(ours.reduce((a, r) => a + r.bytes, 0) / 1024),
    byType,
    redirects: ours.filter((r) => r.status >= 300 && r.status < 400 && r.status !== 304).length,
    notFound: ours.filter((r) => r.status === 404).map((r) => new URL(r.url).pathname),
    external: [...new Set(net.filter((r) => new URL(r.url).host !== HOST).map((r) => new URL(r.url).host))],
    list: ours.map((r) => ({ path: new URL(r.url).pathname, type: r.type, status: r.status, kb: Math.round(r.bytes / 102.4) / 10, cacheControl: r.cc })),
  };
}

(async () => {
  const browser = await chromium.launch();
  const out = [];
  for (const [device, opts] of DEVICES) {
    for (const path of PAGES) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      const first = await view(page, cdp, BASE + path);
      const next = await view(page, cdp, BASE + nextOf(path));
      out.push({ device, path, first, next });
      const types = Object.entries(first.byType).map(([t, v]) => `${t} ${v.n}/${Math.round(v.kb)} KB`).join(', ');
      console.log(
        `${device.padEnd(8)} ${path.padEnd(28)} first: ${String(first.requests).padStart(3)} req ${String(first.kb).padStart(6)} KB` +
          ` | then ${nextOf(path)}: ${String(next.requests).padStart(3)} req ${String(next.kb).padStart(5)} KB\n         ${types}` +
          (first.redirects ? `\n         redirects: ${first.redirects}` : '') +
          (first.notFound.length ? `\n         404: ${first.notFound.join(', ')}` : '') +
          (first.external.length ? `\n         other hosts: ${first.external.join(', ')}` : ''),
      );
      await ctx.close();
    }
  }
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await browser.close();
})();
