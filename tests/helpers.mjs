/** Test helpers: paths into the pack, a local HTTP server, and running scripts as a user would. */
import { execFile } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
export const SITE = join(ROOT, 'tests/fixtures/site');
export const skill = (name, file) => join(ROOT, 'skills', name, 'scripts', file);
export const load = (name, file) => import(skill(name, file));

/**
 * A local server. `routes` maps a path to { status, headers, body } or a function returning one;
 * other paths are served from `dir` (with index.html for folders) when given, else 404.
 */
export async function serve(routes = {}, dir = null) {
  const server = createServer((req, res) => {
    const path = new URL(req.url, 'http://x').pathname;
    let r = routes[path];
    if (typeof r === 'function') r = r(req);
    if (!r && dir) {
      const file = join(dir, path.endsWith('/') ? path + 'index.html' : path);
      if (existsSync(file) && statSync(file).isFile()) {
        const type = file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.xml') ? 'application/xml' : file.endsWith('.txt') ? 'text/plain' : 'application/octet-stream';
        r = { status: 200, headers: { 'content-type': type }, body: readFileSync(file) };
      }
    }
    r ??= { status: 404, body: 'not found' };
    res.writeHead(r.status ?? 200, r.headers ?? {});
    res.end(req.method === 'HEAD' ? undefined : r.body ?? '');
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise((ok) => server.close(ok)) };
}

/** runs a script with node; resolves { code, stdout, stderr } */
export function run(script, args = [], opts = {}) {
  return new Promise((ok) => {
    execFile(process.execPath, [script, ...args], { cwd: opts.cwd ?? ROOT, timeout: 60000, env: { ...process.env, ...opts.env } }, (err, stdout, stderr) => ok({ code: err ? err.code ?? 1 : 0, stdout, stderr }));
  });
}

/** the set of check ids in a findings list, optionally for one page */
export const checks = (findings, page) => new Set(findings.filter((f) => !page || f.page === page).map((f) => f.check));
