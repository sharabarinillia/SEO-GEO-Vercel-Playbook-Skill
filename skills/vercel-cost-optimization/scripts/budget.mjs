#!/usr/bin/env node
/**
 * Monthly CDN requests and data for every site on one Vercel team, against the Flat Rate CDN tiers.
 * Requests per visit come from measure-requests.cjs (a first visit plus one more page, full scroll).
 *
 *   node budget.mjs --sites "client-a:8000:55:7.3,client-b:3000:40:4"
 *        name:visits per month:requests per visit[:MB per visit]
 *   node budget.mjs --file sites.json     [{ "name", "visits", "requestsPerVisit", "mbPerVisit" }]
 *   node budget.mjs --requests-per-visit 55   how many visits fit in each tier
 *
 *   --margin 0.1          extra share for crawlers, previews and bots (default 0.1 = 10%)
 *   --monitor-minutes 5   one uptime check per site every N minutes (adds 43,200 ÷ N requests a month per site)
 *   --json FILE           write the result
 *
 * The tier table below was checked on 4–5 November 2026 (vercel.com/docs/pricing/flat-rate-cdn).
 * Check it again before quoting a price, and update TIERS and CHECKED if it changed.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const CHECKED = '4–5 November 2026';
export const SOURCE = 'https://vercel.com/docs/pricing/flat-rate-cdn';
/** Flat Rate CDN tiers on Pro: monthly price on top of the plan, CDN requests and data transfer per month */
export const TIERS = [
  { price: 0, requests: 1e6, tb: 1, name: 'included' },
  { price: 20, requests: 10e6, tb: 50, name: '$20 tier' },
  { price: 100, requests: 50e6, tb: 50, name: '$100 tier' },
  { price: 300, requests: 150e6, tb: 50, name: '$300 tier' },
];
/** lowest regional on-demand prices without the flat rate (same check date, vercel.com/pricing) */
export const ON_DEMAND = { perMillionRequests: 2, perGB: 0.15 };

export function budget(sites, { margin = 0.1, monitorMinutes = 0 } = {}) {
  const rows = sites.map((s) => {
    const visits = Number(s.visits);
    const rpv = Number(s.requestsPerVisit);
    if (!(visits >= 0) || !(rpv > 0)) throw new Error(`site "${s.name}": visits and requests per visit must be numbers`);
    const monitor = monitorMinutes > 0 ? Math.round((30 * 24 * 60) / monitorMinutes) : 0;
    const requests = visits * rpv + monitor;
    const gb = s.mbPerVisit ? (visits * Number(s.mbPerVisit)) / 1024 : null;
    return { name: s.name, visits, requestsPerVisit: rpv, monitorRequests: monitor, requests, gb };
  });
  const requests = rows.reduce((a, r) => a + r.requests, 0) * (1 + margin);
  const knownGb = rows.every((r) => r.gb !== null);
  const gb = knownGb ? rows.reduce((a, r) => a + r.gb, 0) * (1 + margin) : null;
  const tier = TIERS.find((t) => requests <= t.requests && (gb === null || gb <= t.tb * 1024)) ?? null;
  const onDemand = (requests / 1e6) * ON_DEMAND.perMillionRequests + (gb ?? 0) * ON_DEMAND.perGB;
  return { rows, margin, requests: Math.round(requests), gb: gb === null ? null : Math.round(gb), tier, shareOfIncluded: requests / TIERS[0].requests, onDemand: Math.round(onDemand * 100) / 100 };
}

export const visitsPerTier = (requestsPerVisit) => TIERS.map((t) => ({ ...t, visits: Math.floor(t.requests / requestsPerVisit) }));

const n = (x) => Math.round(x).toLocaleString('en-US');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const opt = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i > -1 ? argv[i + 1] : undefined;
  };
  if (argv.includes('--help') || (!opt('sites') && !opt('file') && !opt('requests-per-visit'))) {
    console.log('usage: node budget.mjs --sites "name:visits:requestsPerVisit[:mbPerVisit],…" [--margin 0.1] [--monitor-minutes 5]\n       node budget.mjs --file sites.json\n       node budget.mjs --requests-per-visit 55');
    process.exit(argv.includes('--help') ? 0 : 2);
  }
  if (opt('requests-per-visit')) {
    const rpv = Number(opt('requests-per-visit'));
    console.log(`Visits a month that fit at ${rpv} requests per visit (Flat Rate CDN, checked ${CHECKED}):`);
    for (const t of visitsPerTier(rpv)) console.log(`  ${t.name.padEnd(10)} ${`$${t.price}/mo`.padEnd(9)} ${n(t.requests / 1e6)}M requests → ${n(t.visits)} visits`);
    process.exit(0);
  }
  const sites = opt('file')
    ? JSON.parse(readFileSync(opt('file'), 'utf8'))
    : opt('sites')
        .split(',')
        .map((s) => s.trim().split(':'))
        .map(([name, visits, requestsPerVisit, mbPerVisit]) => ({ name, visits, requestsPerVisit, mbPerVisit }));
  try {
    const r = budget(sites, { margin: Number(opt('margin') ?? 0.1), monitorMinutes: Number(opt('monitor-minutes') ?? 0) });
    console.log(`${'site'.padEnd(20)} ${'visits/mo'.padStart(10)} ${'req/visit'.padStart(10)} ${'monitor'.padStart(9)} ${'requests/mo'.padStart(12)} ${'GB/mo'.padStart(7)}`);
    for (const s of r.rows) console.log(`${s.name.padEnd(20)} ${n(s.visits).padStart(10)} ${String(s.requestsPerVisit).padStart(10)} ${n(s.monitorRequests).padStart(9)} ${n(s.requests).padStart(12)} ${(s.gb === null ? '?' : n(s.gb)).padStart(7)}`);
    console.log(`\nTotal with ${Math.round(r.margin * 100)}% margin: ${n(r.requests)} requests${r.gb === null ? '' : ` and ${n(r.gb)} GB`} a month = ${Math.round(r.shareOfIncluded * 100)}% of the included 1M requests.`);
    console.log(r.tier ? `Flat Rate CDN: ${r.tier.name}${r.tier.price ? ` (+$${r.tier.price} a month)` : ' (no extra cost)'}, up to ${n(r.tier.requests / 1e6)}M requests and ${r.tier.tb} TB.` : 'Above the highest flat tier: on-demand pricing; talk to Vercel sales.');
    if (r.gb === null) console.log('Data not checked (add MB per visit to each site).');
    console.log(`Without the flat rate, at the lowest on-demand prices: about $${r.onDemand} a month.`);
    console.log(`Prices checked ${CHECKED} (${SOURCE}); check again before quoting.`);
    if (opt('json')) writeFileSync(opt('json'), JSON.stringify({ ...r, checked: CHECKED, source: SOURCE }, null, 2));
  } catch (e) {
    console.error(`budget: ${e.message}`);
    process.exit(2);
  }
}
