#!/usr/bin/env node
/**
 * Builds the release files in dist/ (no zip tool or packages needed):
 *   dist/<repository name>-<version>.zip       the whole repository, ready to unpack or push to GitHub
 *   dist/skills/<skill>.zip                    one skill each, for upload to claude.ai or other tools
 *
 *   node scripts/package.mjs
 * Runs sync --check and validate first, and refuses to package anything out of date or invalid.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deflateRawSync } from 'node:zlib';
import { ROOT, pkg, readSkills } from './lib/skills.mjs';

const SKIP = new Set(['.git', 'node_modules', 'dist', '.DS_Store', 'Thumbs.db']);
/** the repository's name, from package.json, so the archive unpacks like a clone */
const NAME = pkg().repository.url.match(/([^/]+?)(?:\.git)?$/)[1];

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

/** a ZIP archive of [{ name, data, mode }] with a fixed timestamp, so the same input gives the same bytes */
export function zip(entries) {
  const time = ((0 << 11) | (0 << 5)) & 0xffff; // 00:00
  const date = (((2026 - 1980) << 9) | (11 << 5) | 5) & 0xffff; // 5 November 2026
  const locals = [];
  const central = [];
  let offset = 0;
  for (const { name, data, mode = 0o644 } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const useDeflate = packed.length < data.length;
    const body = useDeflate ? packed : data;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(useDeflate ? 8 : 0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE((3 << 8) | 20, 4); // made by Unix, so permissions survive
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(useDeflate ? 8 : 0, 10);
    cen.writeUInt16LE(time, 12);
    cen.writeUInt16LE(date, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE(((0o100000 | mode) << 16) >>> 0, 38); // regular file + mode
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cenSize = central.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cenSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...central, end]);
}

const files = (dir) =>
  readdirSync(dir)
    .filter((n) => !SKIP.has(n))
    .sort()
    .flatMap((n) => {
      const full = join(dir, n);
      return statSync(full).isDirectory() ? files(full) : [full];
    });
const entry = (file, prefix, from) => ({
  name: `${prefix}/${relative(from, file).split('\\').join('/')}`,
  data: readFileSync(file),
  mode: /\.(mjs|cjs|sh)$/.test(file) && readFileSync(file, 'utf8').startsWith('#!') ? 0o755 : 0o644,
});

// refuse to package something stale or invalid
for (const args of [['scripts/sync.mjs', '--check'], ['scripts/validate.mjs']]) {
  try {
    execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  } catch (e) {
    console.error(`${args.join(' ')} failed:\n${e.stdout}${e.stderr}`);
    process.exit(1);
  }
}

const version = pkg().version;
const out = join(ROOT, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'skills'), { recursive: true });

const repo = zip(files(ROOT).map((f) => entry(f, NAME, ROOT)));
writeFileSync(join(out, `${NAME}-${version}.zip`), repo);
console.log(`dist/${NAME}-${version}.zip  ${Math.round(repo.length / 1024)} KB`);
for (const s of readSkills()) {
  const z = zip(files(s.dir).map((f) => entry(f, s.name, s.dir)));
  writeFileSync(join(out, 'skills', `${s.name}.zip`), z);
  console.log(`dist/skills/${s.name}.zip  ${Math.round(z.length / 1024)} KB`);
}
