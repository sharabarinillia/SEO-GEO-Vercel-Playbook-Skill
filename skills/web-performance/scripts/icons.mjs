// Logo and icon files from the SVG logo files (needs sharp: npm i -D sharp).
//
// 1. An inline SVG <symbol> of the logo, to include once per page (for example from the header
//    partial). Draw it with <svg class="logo"><use href="#site-logo" /></svg> in the header and
//    footer, and set the wordmark colour with CSS `color`. That replaces separate light and dark
//    logo files: two requests fewer on every first visit. Give the <svg> an aspect-ratio in CSS.
//    The holder is zero-size, not display: none, which would break clip paths inside the symbol.
// 2. favicon.ico (16, 32, 48 px) from the logo mark, for browsers and crawlers that ask for
//    /favicon.ico instead of using the SVG icon.
// 3. apple-touch-icon.png (180 px, opaque: iOS fills transparency with black) for home screens.
//    Link it in the head: <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
//
//   node icons.mjs
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

// ── settings ──────────────────────────────────────────────────────────
const LOGO = 'public/logo.svg'; // full logo with viewBox
const MARK = 'public/logo-mark.svg'; // square-ish mark for the favicon
const WORDMARK_FILL = 'fill="#FFFFFF"'; // the fill in LOGO that becomes the CSS colour
const SYMBOL_ID = 'site-logo';
const SYMBOL_OUT = 'src/partials/logo-symbol.html';
const TOUCH_BG = '#0b2140'; // home-screen icon background
const TOUCH_ART = LOGO; // the file drawn on the home-screen icon: LOGO or MARK
// ──────────────────────────────────────────────────────────────────────

const logo = readFileSync(LOGO, 'utf8');
const mark = readFileSync(MARK, 'utf8');
const viewBox = (svg) => svg.match(/viewBox="([^"]+)"/)[1];
const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title[^>]*>.*?<\/title>/, '');

// 1. inline symbol; path points rounded to 0.1 when the paths use absolute commands only
// (rounding relative commands would drift): a fifth less markup, no visible change at logo sizes
const round = (d) => d.replace(/-?\d*\.\d+|-?\d+/g, (n) => {
  const r = (+n).toFixed(1).replace(/\.0$/, '');
  return r === '-0' ? '0' : r;
});
let symbol = inner(logo).replace(WORDMARK_FILL, 'fill="currentColor"');
if (!symbol.includes('currentColor')) throw new Error(`${LOGO}: ${WORDMARK_FILL} not found`);
if (!/ d="[^"]*[mlhvcsqta]/.test(symbol)) symbol = symbol.replace(/ d="([^"]+)"/g, (_, d) => ` d="${round(d)}"`);
writeFileSync(
  SYMBOL_OUT,
  `<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><symbol id="${SYMBOL_ID}" viewBox="${viewBox(logo)}">${symbol}</symbol></svg>\n`,
);

// a square tile with the artwork centred at a share of its width
const tile = (size, art, share, bg) => {
  const [, , w, h] = viewBox(art).split(/[\s,]+/).map(Number);
  const W = Math.min(size * share, (size * share * w) / Math.max(w, h));
  const H = (W * h) / w;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      (bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '') +
      `<svg x="${(size - W) / 2}" y="${(size - H) / 2}" width="${W}" height="${H}" viewBox="${viewBox(art)}">${inner(art)}</svg></svg>`,
  );
};

// 2. favicon.ico: PNG images in an ICO directory (supported by every current browser)
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(tile(s, mark, 1)).png().toBuffer()));
const head = Buffer.alloc(6 + 16 * sizes.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(sizes.length, 4);
let offset = head.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e);
  head.writeUInt8(s, e + 1);
  head.writeUInt16LE(1, e + 4); // colour planes
  head.writeUInt16LE(32, e + 6); // bits per pixel
  head.writeUInt32LE(pngs[i].length, e + 8);
  head.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
writeFileSync('public/favicon.ico', Buffer.concat([head, ...pngs]));

// 3. apple-touch-icon.png
await sharp(tile(180, readFileSync(TOUCH_ART, 'utf8'), 0.8, TOUCH_BG)).flatten({ background: TOUCH_BG }).png({ compressionLevel: 9 }).toFile('public/apple-touch-icon.png');

console.log(`wrote ${SYMBOL_OUT}, public/favicon.ico, public/apple-touch-icon.png`);
