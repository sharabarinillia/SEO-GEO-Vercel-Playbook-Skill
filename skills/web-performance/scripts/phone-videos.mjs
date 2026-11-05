// Phone copies of background video loops (needs ffmpeg and ffprobe on the PATH).
//
// Portrait phones show background loops in two ways:
// - small cards (about 330 × 250 px): the whole frame, so a 960 px copy is enough   → name-m.mp4
// - tall full-height sections: object-fit: cover shows only an upright slice of the 16:9
//   frame, so the copy is that slice at full resolution: same sharpness, a fraction
//   of the data                                                                    → name-<suffix>.mp4
//
// Crop math: a crop starts at x = p × (frame width − crop width), p being the section's
// horizontal object-position (0.5 = centred). For any section narrower than the crop, the
// visible part, and the poster under it, then line up exactly with the desktop file, so
// nothing jumps when the video starts. Make the crop shape (width ÷ height) a little wider
// than the widest such section on phones (measure them at 320–480 px wide).
//
// Use the copies as the first <source>, with these media queries:
//   card:  <source media="(max-width: 479.98px)" src="/video/name-m.mp4" type="video/mp4">
//   crop:  <source media="(max-width: 479.98px) and (orientation: portrait)" src="/video/name-tall.mp4" type="video/mp4">
//
//   node phone-videos.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

// ── settings (the names below are examples: use your own video file names, without .mp4) ──
const DIR = 'public/video';
/** videos shown in small cards on phones: whole frame, 960 px wide */
const CARDS = ['road-highway', 'sea-river'];
/** videos shown in tall sections: [file suffix, horizontal object-position, crop width ÷ height] */
const CROPS = {
  'air-loading': [['tall', 0.5, 0.7], ['band', 0.4, 0.5]],
  'close-wing': [['tall', 0.5, 0.7]],
};
const CARD_CRF = 26; // whole frame scaled down: a little more compression is invisible at card size
const CROP_CRF = 25; // full-resolution slice: stay close to the source
// ──────────────────────────────────────────────────────────────────────

const ENC = ['-an', '-map', '0:v:0', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-fps_mode', 'passthrough', '-movflags', '+faststart'];
const size = (name) => {
  const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', `${DIR}/${name}.mp4`], { encoding: 'utf8' });
  const [w, h] = out.trim().split(',').map(Number);
  return { w, h };
};
const even = (n) => 2 * Math.round(n / 2); // yuv420p needs even sizes and offsets
const kb = (file) => Math.round(statSync(file).size / 1024);
const encode = (name, out, vf, crf) => {
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', `${DIR}/${name}.mp4`, ...ENC, '-vf', vf, '-crf', String(crf), `${DIR}/${out}.mp4`]);
  console.log(`${out}.mp4  ${kb(`${DIR}/${out}.mp4`)} KB (desktop file ${kb(`${DIR}/${name}.mp4`)} KB)`);
};

const missing = [...CARDS, ...Object.keys(CROPS)].filter((name) => !existsSync(`${DIR}/${name}.mp4`));
if (missing.length) {
  console.error(`Not found in ${DIR}/: ${missing.map((n) => `${n}.mp4`).join(', ')}. Edit the settings at the top of this script.`);
  process.exit(2);
}
for (const name of CARDS) encode(name, `${name}-m`, 'scale=960:-2:flags=lanczos', CARD_CRF);
for (const [name, crops] of Object.entries(CROPS)) {
  const { w, h } = size(name);
  for (const [suffix, p, shape] of crops) {
    const cw = Math.min(w, even(h * shape));
    encode(name, `${name}-${suffix}`, `crop=${cw}:${h}:${even(p * (w - cw))}:0`, CROP_CRF);
  }
}
