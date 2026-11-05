#!/usr/bin/env node
/**
 * Checks the JSON-LD structured data of every page: it parses, uses schema.org, every
 * { "@id": … } reference resolves inside the page, URLs are absolute, dates are ISO 8601,
 * and the common types carry the properties Google documents as required (errors) or
 * recommended (warnings). Run it in the build (fail on errors) and after big content changes.
 *
 *   node jsonld-check.mjs --dir dist
 *   node jsonld-check.mjs --sitemap https://www.example.com/sitemap.xml [--limit 300]
 *   node jsonld-check.mjs --file page.html
 *   add --json FILE to write the findings and every page's node types; --strict fails on warnings too
 *
 * Exit code: 0 no errors, 1 errors (or warnings with --strict), 2 could not run. Node.js 18+, no packages.
 * This is a structural check. Rich-result eligibility still needs Google's Rich Results Test.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { args, guessSite, loadBuild, loadLive, parseHtml } from './site-files.mjs';

/** per type: properties that must be present (error) and should be present (warning) */
export const RULES = {
  Organization: { recommended: ['name', 'url', 'logo'] },
  LocalBusiness: { required: ['name', 'address'], recommended: ['telephone', 'url', 'openingHoursSpecification', 'geo'] },
  WebSite: { recommended: ['name', 'url'] },
  WebPage: { recommended: ['name', 'url'] },
  BreadcrumbList: { required: ['itemListElement'] },
  FAQPage: { required: ['mainEntity'] },
  Article: { recommended: ['headline', 'image', 'datePublished', 'dateModified', 'author'] },
  Product: { required: ['name'], oneOf: [['offers', 'review', 'aggregateRating']] },
  Service: { recommended: ['name', 'provider', 'description'] },
  SoftwareApplication: { required: ['name'], recommended: ['offers', 'applicationCategory'] },
  Event: { required: ['name', 'startDate', 'location'] },
  Person: { required: ['name'] },
  Review: { required: ['author', 'itemReviewed'] },
  AggregateRating: { required: ['ratingValue'], oneOf: [['ratingCount', 'reviewCount']] },
  Offer: { recommended: ['price', 'priceCurrency'] },
  JobPosting: { required: ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation'] },
  Recipe: { required: ['name', 'image'] },
  VideoObject: { required: ['name', 'thumbnailUrl', 'uploadDate'] },
};
/** subtypes checked with their parent's rules */
const PARENT = {
  NewsArticle: 'Article', BlogPosting: 'Article', TechArticle: 'Article', Report: 'Article',
  AboutPage: 'WebPage', ContactPage: 'WebPage', CollectionPage: 'WebPage', FAQPage: 'FAQPage', ItemPage: 'WebPage', ProfilePage: 'WebPage', SearchResultsPage: 'WebPage', CheckoutPage: 'WebPage', MedicalWebPage: 'WebPage', QAPage: 'WebPage',
  WebApplication: 'SoftwareApplication', MobileApplication: 'SoftwareApplication', VideoGame: 'SoftwareApplication',
  Corporation: 'Organization', NGO: 'Organization', EducationalOrganization: 'Organization', GovernmentOrganization: 'Organization', OnlineStore: 'Organization', OnlineBusiness: 'Organization',
  ProfessionalService: 'LocalBusiness', Store: 'LocalBusiness', Restaurant: 'LocalBusiness', MovingCompany: 'LocalBusiness', AutoRepair: 'LocalBusiness', LegalService: 'LocalBusiness', Dentist: 'LocalBusiness', MedicalBusiness: 'LocalBusiness', FinancialService: 'LocalBusiness', HomeAndConstructionBusiness: 'LocalBusiness', FoodEstablishment: 'LocalBusiness', LodgingBusiness: 'LocalBusiness', SportsActivityLocation: 'LocalBusiness', TravelAgency: 'LocalBusiness',
  ProductGroup: 'Product', IndividualProduct: 'Product', ProductModel: 'Product',
};
const URL_KEYS = new Set(['url', 'logo', 'image', 'sameAs', 'item', 'thumbnailUrl', 'contentUrl', 'embedUrl', 'hasMap', 'mainEntityOfPage']);
const DATE_KEYS = new Set(['datePublished', 'dateModified', 'dateCreated', 'uploadDate', 'startDate', 'endDate', 'datePosted', 'validThrough', 'validFrom', 'priceValidUntil', 'foundingDate']);
const ISO = /^\d{4}(-\d{2}(-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?)?)?$/;

const typesOf = (n) => [].concat(n?.['@type'] ?? []).map(String);
const isRef = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 1 && '@id' in v;
const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);

/** checks the JSON-LD blocks of one page; returns { findings, types, ids, orgIds } */
export function checkPage(blocks, page = '/') {
  const findings = [];
  const add = (severity, check, message) => findings.push({ severity, check, page, message });
  const nodes = [];
  for (const raw of blocks) {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      add('error', 'jsonld-parse', `JSON-LD does not parse: ${e.message}`);
      continue;
    }
    for (const top of [].concat(data)) {
      if (!top || typeof top !== 'object') continue;
      const ctx = JSON.stringify(top['@context'] ?? '');
      if (!/schema\.org/i.test(ctx)) add('error', 'jsonld-context', 'a JSON-LD block has no schema.org @context');
      if (Array.isArray(top['@graph'])) nodes.push(...top['@graph']);
      else nodes.push(top);
    }
  }
  // every node at any depth, with the path to it
  const all = [];
  const walk = (v, path, top) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`, top));
    if (!v || typeof v !== 'object') return;
    if (!isRef(v)) all.push({ node: v, path, top });
    for (const [k, x] of Object.entries(v)) if (k !== '@context') walk(x, `${path}.${k}`, false);
  };
  nodes.forEach((n, i) => walk(n, `node ${i + 1}`, true));

  const ids = new Map();
  for (const { node } of all) {
    if (!node['@id']) continue;
    const prev = ids.get(node['@id']);
    const t = typesOf(node).join(',');
    if (prev && t && prev !== t && prev !== '') add('warning', 'id-type-conflict', `@id ${node['@id']} is used for ${prev} and for ${t}`);
    if (!prev) ids.set(node['@id'], t);
  }
  const refs = [];
  const findRefs = (v) => {
    if (Array.isArray(v)) return v.forEach(findRefs);
    if (!v || typeof v !== 'object') return;
    if (isRef(v)) refs.push(v['@id']);
    else for (const [k, x] of Object.entries(v)) if (k !== '@context') findRefs(x);
  };
  nodes.forEach(findRefs);
  for (const r of new Set(refs)) if (!ids.has(r)) add('error', 'id-unresolved', `{ "@id": "${r}" } refers to a node that is not on this page`);

  for (const { node, path, top } of all) {
    const types = typesOf(node);
    const label = types.join('/') || path;
    if (!types.length && !node['@id'] && path.split('.').length <= 1) add('warning', 'type-missing', `${path} has no @type`);
    for (const t of types) {
      const rule = RULES[t] ?? RULES[PARENT[t]];
      if (!rule) continue;
      for (const k of rule.required ?? []) if (empty(node[k])) add('error', 'property-required', `${label} needs ${k}`);
      // recommendations apply to the page's main nodes, not to every organisation or offer nested in them
      if (top) for (const k of rule.recommended ?? []) if (empty(node[k])) add('warning', 'property-recommended', `${label} should have ${k}`);
      for (const group of rule.oneOf ?? []) if (group.every((k) => empty(node[k]))) add('error', 'property-required', `${label} needs one of ${group.join(', ')}`);
    }
    if (types.includes('BreadcrumbList') && Array.isArray(node.itemListElement)) {
      node.itemListElement.forEach((it, i) => {
        if (Number(it?.position) !== i + 1) add('error', 'breadcrumb-position', `breadcrumb item ${i + 1} has position ${it?.position}`);
        if (empty(it?.name) && empty(it?.item?.name)) add('error', 'breadcrumb-name', `breadcrumb item ${i + 1} has no name`);
        if (i < node.itemListElement.length - 1 && empty(it?.item)) add('error', 'breadcrumb-item', `breadcrumb item ${i + 1} has no item URL (only the last one may leave it out)`);
      });
    }
    if (types.includes('FAQPage'))
      for (const q of [].concat(node.mainEntity ?? [])) if (empty(q?.name) || empty(q?.acceptedAnswer?.text)) add('error', 'faq-answer', 'an FAQ question has no name or no acceptedAnswer.text');
    for (const [k, v] of Object.entries(node)) {
      if (URL_KEYS.has(k))
        for (const u of [].concat(v)) if (typeof u === 'string' && u && !/^https?:\/\//i.test(u)) add('error', 'url-relative', `${label}.${k} "${u}" is not an absolute URL`);
      if (DATE_KEYS.has(k) && typeof v === 'string' && !ISO.test(v.trim())) add('error', 'date-format', `${label}.${k} "${v}" is not an ISO 8601 date`);
    }
  }
  const orgIds = all.filter(({ node }) => typesOf(node).some((t) => t === 'Organization' || t === 'LocalBusiness' || PARENT[t] === 'Organization' || PARENT[t] === 'LocalBusiness') && node['@id']).map(({ node }) => node['@id']);
  return { findings, types: [...new Set(all.flatMap(({ node }) => typesOf(node)))].sort(), ids: [...ids.keys()], orgIds: [...new Set(orgIds)] };
}

export async function run(opts) {
  let pages;
  if (opts.dir) {
    pages = loadBuild(opts.dir).filter((p) => !p.notFound);
    const site = opts.site ?? guessSite(pages);
    pages = pages.map((p) => ({ ...p, url: new URL(p.path, site ?? 'https://example.invalid').href }));
  } else if (opts.sitemap) pages = (await loadLive(opts.sitemap, { limit: Number(opts.limit ?? 500) })).filter((p) => p.status === 200);
  else if (opts.file) pages = [{ path: opts.file, html: readFileSync(opts.file, 'utf8') }];
  else throw new Error('pass --dir, --sitemap or --file');

  const findings = [];
  const perPage = [];
  const orgIds = new Set();
  for (const p of pages) {
    const { jsonld } = parseHtml(p.html);
    if (!jsonld.length) {
      findings.push({ severity: 'warning', check: 'jsonld-none', page: p.path, message: 'no JSON-LD on this page' });
      continue;
    }
    const r = checkPage(jsonld, p.path);
    findings.push(...r.findings);
    r.orgIds.forEach((id) => orgIds.add(id));
    perPage.push({ page: p.path, types: r.types });
  }
  if (orgIds.size > 1) findings.push({ severity: 'warning', check: 'org-id-varies', page: '(site)', message: `the organisation appears under ${orgIds.size} different @ids: ${[...orgIds].join(', ')}; use one everywhere` });
  return { pages: perPage, findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  if (opts.help || (!opts.dir && !opts.sitemap && !opts.file)) {
    console.log('usage: node jsonld-check.mjs --dir dist | --sitemap URL | --file page.html [--json out.json] [--strict]');
    process.exit(opts.help ? 0 : 2);
  }
  try {
    const { pages, findings } = await run(opts);
    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    console.log(`Structured data: ${pages.length} page${pages.length === 1 ? '' : 's'} with JSON-LD`);
    const types = new Map();
    for (const p of pages) for (const t of p.types) types.set(t, (types.get(t) ?? 0) + 1);
    if (types.size) console.log(`Types: ${[...types].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ×${n}`).join(', ')}`);
    for (const [title, list] of [['Errors', errors], ['Warnings', warnings]]) {
      if (!list.length) continue;
      console.log(`\n${title} (${list.length})`);
      // the same finding on many pages (a site-wide node) is shown once, with its pages
      const same = new Map();
      for (const f of list) same.set(`${f.check}  ${f.message}`, [...(same.get(`${f.check}  ${f.message}`) ?? []), f.page]);
      const rows = [...same].map(([k, pg]) => `  ${k.replace('  ', `  ${pg.length > 3 ? `${pg.length} pages (${pg.slice(0, 3).join(', ')} …)` : pg.join(', ')}  `)}`);
      rows.slice(0, 60).forEach((r) => console.log(r));
      if (rows.length > 60) console.log(`  … ${rows.length - 60} more (see --json)`);
    }
    console.log(`\n${errors.length} error${errors.length === 1 ? '' : 's'}, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}.`);
    if (opts.json) writeFileSync(opts.json, JSON.stringify({ pages, findings }, null, 2));
    process.exit(errors.length || (opts.strict && warnings.length) ? 1 : 0);
  } catch (e) {
    console.error(`jsonld-check: ${e.message}`);
    process.exit(2);
  }
}
