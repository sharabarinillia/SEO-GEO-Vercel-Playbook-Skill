#!/usr/bin/env node
/**
 * Firewall rules for a static or mostly static site on Vercel: deny the paths vulnerability
 * scanners probe (WordPress, PHP, dotfiles, backups) so they cost nothing, then the bot settings.
 * Prints the rules; it never changes a project. A person reviews them and applies them with the
 * Vercel CLI, the REST API or vercel.json.
 *
 *   node firewall-rules.mjs                         CLI commands (default)
 *   node firewall-rules.mjs --format rest           request bodies for PATCH /v1/security/firewall/config
 *   node firewall-rules.mjs --format vercel-json    "routes" entries with "mitigate" for vercel.json
 *   node firewall-rules.mjs --check-dist dist       prove the deny pattern matches no file or page of the site
 *   node firewall-rules.mjs --check-sitemap https://www.example.com/sitemap.xml
 *   node firewall-rules.mjs --test /wp-login.php,/about/
 *
 *   --keep LIST    extensions or path prefixes the site really serves, removed from the pattern (e.g. --keep log,/cgi-bin/)
 *   --methods      also deny methods other than GET, HEAD and OPTIONS (only for sites with no forms or APIs on Vercel)
 *
 * Exit code: 0 fine, 1 the pattern would block a real file or page (with --check-*), 2 could not run.
 */
import { pathToFileURL } from 'node:url';
import { args, buildFiles, readSitemap } from './site-files.mjs';

/** path prefixes that only scanners ask for on a site without WordPress or PHP */
export const PREFIXES = ['wp-', 'wordpress/', 'xmlrpc.php', 'cgi-bin/', 'phpmyadmin', 'pma/', 'administrator/', '.env', '.git', '.svn', '.hg', '.aws', '.ssh', '.htaccess', '.htpasswd', '.DS_Store', '.vscode', '.idea'];
/** file extensions a static site never serves */
export const EXTENSIONS = ['php', 'php5', 'php7', 'phtml', 'asp', 'aspx', 'jsp', 'jspx', 'cgi', 'cfm', 'sql', 'bak', 'old', 'swp', 'env', 'ini', 'log'];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, (c) => (c === '/' ? '/' : '\\' + c));

/** one regular expression (no flags or look-arounds, so any regex engine reads it) */
export function denyPattern({ keep = [] } = {}) {
  const k = new Set(keep.map((x) => x.replace(/^\./, '').replace(/^\//, '')));
  const prefixes = PREFIXES.filter((p) => !k.has(p) && !k.has(p.replace(/\/$/, '')));
  const exts = EXTENSIONS.filter((e) => !k.has(e));
  const parts = [];
  if (prefixes.length) parts.push(`^/(?:${prefixes.map(esc).join('|')})`);
  if (exts.length) parts.push(`\\.(?:${exts.join('|')})$`);
  return parts.join('|');
}

export function rules(opts = {}) {
  const out = [
    {
      name: 'Deny scanner paths',
      description: 'WordPress, PHP, dotfile and backup probes: this static site has none of them. Denied traffic is not billed.',
      conditionGroup: [{ conditions: [{ type: 'path', op: 're', value: denyPattern(opts) }] }],
      action: { mitigate: { action: 'deny' } },
    },
  ];
  if (opts.methods)
    out.push({
      name: 'Deny unused methods',
      description: 'Only GET, HEAD and OPTIONS reach a static site.',
      conditionGroup: [{ conditions: [{ type: 'method', op: 'ninc', value: ['GET', 'HEAD', 'OPTIONS'] }] }],
      action: { mitigate: { action: 'deny' } },
    });
  return out;
}

const sh = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

export function asCli(list) {
  const lines = ['# Run in the project folder after `vercel link` (or add --project <name>). Changes stay drafts until published.', ''];
  for (const r of list) {
    lines.push(`vercel firewall rules add ${sh(r.name)} \\`);
    for (const c of r.conditionGroup[0].conditions) lines.push(`  --condition ${sh(JSON.stringify(c))} \\`);
    lines.push(`  --action ${r.action.mitigate.action} --description ${sh(r.description)} --yes`);
  }
  lines.push(
    'vercel firewall publish --yes',
    '',
    '# Bot Protection: watch first, then challenge. Verified bots (Googlebot, Bingbot, OAI-SearchBot,',
    '# Claude-SearchBot, PerplexityBot …) are not challenged. Check link previews and monitors in the log.',
    'vercel firewall rules edit bot-protection --action log --yes && vercel firewall publish --yes',
    '# … after a few days with no real visitors or services in the log:',
    'vercel firewall rules edit bot-protection --action challenge --yes && vercel firewall publish --yes',
    '',
    '# AI Bots: leave on "allow" (the default) if the site wants to be cited by AI assistants. Its "deny"',
    '# also blocks AI search and user-requested fetches, not only training. Refuse training in robots.txt.',
    'vercel firewall bot-management',
    '',
    '# Afterwards: what the rules caught',
    'vercel firewall overview',
  );
  return lines.join('\n');
}

export const asRest = (list) =>
  list.map((r) => ({ action: 'rules.insert', id: null, value: { ...r, active: true, action: { mitigate: { ...r.action.mitigate, rateLimit: null, redirect: null, actionDuration: null } } } }));

/** vercel.json "routes" entries (the routes format only allows deny and challenge here) */
export const asVercelJson = (list) =>
  list
    .filter((r) => r.conditionGroup[0].conditions.every((c) => c.type === 'path' && c.op === 're'))
    .map((r) => ({ src: r.conditionGroup[0].conditions[0].value, mitigate: { action: r.action.mitigate.action } }));

/** paths of the site the pattern would block: they must be none */
export function collisions(pattern, paths) {
  const re = new RegExp(pattern);
  return [...paths].filter((p) => re.test(p));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args();
  if (opts.help) {
    console.log('usage: node firewall-rules.mjs [--format cli|rest|vercel-json] [--keep log,/cgi-bin/] [--methods] [--check-dist dist] [--check-sitemap URL] [--test /a,/b]');
    process.exit(0);
  }
  const keep = opts.keep ? String(opts.keep).split(',').map((s) => s.trim()) : [];
  const list = rules({ keep, methods: !!opts.methods });
  const pattern = list[0].conditionGroup[0].conditions[0].value;
  try {
    if (opts.test) {
      const re = new RegExp(pattern);
      for (const p of String(opts.test).split(',')) console.log(`${re.test(p) ? 'DENY ' : 'allow'}  ${p}`);
      process.exit(0);
    }
    if (opts['check-dist'] || opts['check-sitemap']) {
      const paths = new Set();
      if (opts['check-dist']) buildFiles(opts['check-dist']).forEach((p) => paths.add(p));
      if (opts['check-sitemap']) (await readSitemap(opts['check-sitemap'])).forEach((u) => paths.add(new URL(u.loc).pathname));
      const hit = collisions(pattern, paths);
      if (hit.length) {
        console.log(`The pattern would deny ${hit.length} real path${hit.length === 1 ? '' : 's'}:\n  ${hit.slice(0, 50).join('\n  ')}\nAdd their extension or prefix to --keep and run again.`);
        process.exit(1);
      }
      console.log(`OK: the pattern matches none of the ${paths.size} paths checked.`);
      process.exit(0);
    }
    const format = opts.format ?? 'cli';
    if (format === 'cli') console.log(asCli(list));
    else if (format === 'rest') console.log(JSON.stringify(asRest(list), null, 2));
    else if (format === 'vercel-json') console.log(JSON.stringify({ routes: asVercelJson(list) }, null, 2));
    else throw new Error(`unknown --format ${format}`);
  } catch (e) {
    console.error(`firewall-rules: ${e.message}`);
    process.exit(2);
  }
}
