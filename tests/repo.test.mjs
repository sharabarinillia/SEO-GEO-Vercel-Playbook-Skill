import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { inflateRawSync } from 'node:zlib';
import { ROOT, load, run, skill } from './helpers.mjs';

test('every skill follows the Agent Skills spec (validate.mjs)', async () => {
  const r = await run(join(ROOT, 'scripts/validate.mjs'), ['--strict']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

test('generated parts are up to date (sync.mjs --check)', async () => {
  const r = await run(join(ROOT, 'scripts/sync.mjs'), ['--check']);
  assert.equal(r.code, 0, r.stdout + r.stderr);
});

test('every audit check id is documented in checks.md, and nothing more', () => {
  const src = readFileSync(skill('seo-technical-audit', 'seo-audit.mjs'), 'utf8');
  const ids = new Set([...src.matchAll(/(?:error|warn)\('([a-z0-9-]+)'/g), ...src.matchAll(/'([a-z]+-duplicate)'\]/g)].map((m) => m[1]));
  const doc = readFileSync(join(ROOT, 'skills/seo-technical-audit/references/checks.md'), 'utf8');
  const documented = new Set([...doc.matchAll(/^\| `([a-z0-9-]+)`/gm)].map((m) => m[1]));
  assert.deepEqual([...ids].filter((i) => !documented.has(i)), [], 'undocumented check ids');
  assert.deepEqual([...documented].filter((i) => !ids.has(i)), [], 'documented ids the script never reports');
  assert.equal(ids.size, 49); // the README says 49 checks
});

test('the structured-data template passes jsonld-check without errors', async () => {
  const { checkPage } = await load('structured-data', 'jsonld-check.mjs');
  const template = readFileSync(join(ROOT, 'skills/structured-data/assets/graph-template.json'), 'utf8');
  assert.deepEqual(checkPage([template]).findings.filter((f) => f.severity === 'error'), []);
});

test('vercel.json templates parse, and every route pattern compiles', () => {
  for (const f of ['vercel.static.json', 'vercel.routes.json']) {
    const json = JSON.parse(readFileSync(join(ROOT, 'skills/vercel-static-config/assets', f), 'utf8'));
    for (const r of json.routes ?? []) assert.doesNotThrow(() => new RegExp(r.src), r.src);
    assert.ok(!(json.routes && (json.redirects || json.headers || json.trailingSlash)), `${f} mixes routes with modern keys`);
  }
});

test('the robots.txt template lets AI search in and keeps decorative video out', async () => {
  const { check } = await load('geo-ai-search', 'robots-check.mjs');
  const { rows } = check(readFileSync(join(ROOT, 'skills/geo-ai-search/assets/robots.txt'), 'utf8'), ['/', '/video/a.mp4']);
  for (const r of rows) {
    assert.equal(r.paths['/'], true, `${r.token} should be allowed on /`);
    assert.equal(r.paths['/video/a.mp4'], false, `${r.token} should not fetch /video/`);
  }
});

test('install.mjs copies, links, writes AGENTS.md and uninstalls', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-install-'));
  try {
    const install = (...args) => run(join(ROOT, 'scripts/install.mjs'), ['--project', dir, ...args]);
    let r = await install('--agents-md');
    assert.equal(r.code, 0, r.stderr);
    assert.equal(readdirSync(join(dir, '.claude/skills')).length, 10);
    assert.equal(readdirSync(join(dir, '.agents/skills')).length, 10);
    assert.ok(existsSync(join(dir, '.agents/skills/geo-ai-search/scripts/robots-check.mjs')));
    assert.match(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), /\.agents\/skills\/seo-technical-audit\/SKILL\.md/);
    r = await install('--tools', 'kiro', '--skills', 'vercel-firewall', '--link');
    assert.match(r.stdout, /linked vercel-firewall/);
    r = await install();
    assert.match(r.stdout, /0 installed/); // already there, nothing replaced without --force
    r = await install('--agents-md'); // the AGENTS.md section is replaced, not duplicated
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8').match(/seo-geo-vercel-skills:start/g).length, 1);
    r = await install('--tools', 'claude,agents,kiro', '--uninstall');
    assert.match(r.stdout, /21 removed/);
    assert.equal(readdirSync(join(dir, '.claude/skills')).length, 0);
    assert.equal((await install('--tools', 'nope')).code, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** reads a ZIP's central directory and inflates the entries (enough to check our own archives) */
function unzip(buf) {
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const out = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extra = buf.readUInt16LE(p + 30);
    const comment = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const body = buf.subarray(start, start + size);
    out.set(name, method === 8 ? inflateRawSync(body) : body);
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

const pkgJson = () => JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const repoName = () => pkgJson().repository.url.match(/([^/]+?)(?:\.git)?$/)[1];

test('every link and command names the published repository from package.json', () => {
  const url = pkgJson().repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
  const owner = url.split('/').at(-2);
  const files = ['README.md', 'INSTALL.md', 'CHANGELOG.md', 'AGENTS.md', 'GEMINI.md', 'plugin.json', '.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.github/plugin/plugin.json', '.github/plugin/marketplace.json', '.agents/plugins/marketplace.json', 'gemini-extension.json', 'shared/site-files.mjs'];
  const wrong = [];
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    // owner/name in URLs and in shorthand commands (marketplace add owner/name)
    for (const m of text.matchAll(new RegExp(`${owner}/([A-Za-z0-9._-]+)`, 'g'))) if (m[1] !== repoName()) wrong.push(`${f}: ${m[0]}`);
    for (const m of text.matchAll(/node ([A-Za-z0-9._-]+)\/scripts\/install\.mjs/g)) if (m[1] !== repoName()) wrong.push(`${f}: ${m[0]} (a clone creates ${repoName()}/)`);
  }
  assert.deepEqual(wrong, []);
  for (const f of ['plugin.json', '.claude-plugin/plugin.json', '.github/plugin/plugin.json']) {
    const m = JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
    assert.equal(m.repository, url, f);
    assert.equal(m.license, pkgJson().license, f);
  }
});

test('package.mjs writes a repository ZIP and one ZIP per skill, byte-exact', async () => {
  const r = await run(join(ROOT, 'scripts/package.mjs'));
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const name = repoName();
  const repo = unzip(readFileSync(join(ROOT, 'dist', `${name}-${pkgJson().version}.zip`)));
  assert.ok(repo.has(`${name}/README.md`));
  assert.ok(repo.has(`${name}/LICENSE`));
  assert.ok(repo.has(`${name}/.claude-plugin/marketplace.json`));
  assert.ok(![...repo.keys()].some((k) => /\/(\.git|node_modules|dist)\//.test(k)));
  assert.deepEqual(repo.get(`${name}/skills/geo-ai-search/SKILL.md`), readFileSync(join(ROOT, 'skills/geo-ai-search/SKILL.md')));
  const one = unzip(readFileSync(join(ROOT, 'dist/skills/vercel-firewall.zip')));
  assert.ok(one.has('vercel-firewall/SKILL.md'));
  assert.ok(one.has('vercel-firewall/scripts/firewall-rules.mjs'));
});
