/**
 * Shared file: copies in the skills are written by scripts/sync.mjs from shared/serp-width.mjs.
 *
 * How wide a title or description is in search results: Google sets title links
 * in 20 px Arial and snippets in 14 px Arial, and cuts them off at about 580 px
 * and 920 px on desktop. Widths are Arial advance widths per 1000 units (taken
 * from Liberation Sans, which shares Arial's metrics); other characters count as "n".
 */
const RUNS = [
  [0x20, 278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
  [0xa0, 278, 333, 556, 556, 556, 556, 260, 556, 333, 737, 370, 556, 584, 0, 737, 552, 400, 549, 333, 333, 333, 576, 537, 333, 333, 333, 365, 556, 834, 834, 834, 611, 667, 667, 667, 667, 667, 667, 1000, 722, 667, 667, 667, 667, 278, 278, 278, 278, 722, 722, 778, 778, 778, 778, 778, 584, 778, 722, 722, 722, 722, 667, 667, 611, 556, 556, 556, 556, 556, 556, 889, 500, 556, 556, 556, 556, 278, 278, 278, 278, 556, 556, 556, 556, 556, 556, 556, 549, 611, 556, 556, 556, 556, 500, 556, 500, 667, 556, 667, 556, 667, 556, 722, 500, 722, 500, 722, 500, 722, 500, 722, 615, 722, 556, 667, 556, 667, 556, 667, 556, 667, 556, 667, 556, 778, 556, 778, 556, 778, 556, 778, 556, 722, 556, 722, 556, 278, 278, 278, 278, 278, 278, 278, 222, 278, 278, 735, 444, 500, 222, 667, 500, 500, 556, 222, 556, 222, 556, 292, 556, 334, 556, 222, 722, 556, 722, 556, 722, 556, 604, 723, 556, 778, 556, 778, 556, 778, 556, 1000, 944, 722, 333, 722, 333, 722, 333, 667, 500, 667, 500, 667, 500, 667, 500, 611, 278, 611, 375, 611, 278, 722, 556, 722, 556, 722, 556, 722, 556, 722, 556, 722, 556, 944, 722, 667, 500, 667, 611, 500, 611, 500, 611, 500, 222],
  [0x2013, 556, 1000],
  [0x2018, 222, 222, 222],
  [0x201c, 333, 333, 333],
  [0x2022, 350],
  [0x2026, 1000],
  [0x2032, 188, 354],
  [0x20ac, 556],
  [0x2122, 1000],
  [0x2190, 1000],
  [0x2192, 1000],
  [0x2194, 1000],
];
const WIDTH = new Map(RUNS.flatMap(([start, ...w]) => w.map((x, i) => [start + i, x])));

/** rendered width in px at the given font size (20 for titles, 14 for descriptions) */
export function serpWidth(text, size) {
  let units = 0;
  for (const ch of text) units += WIDTH.get(ch.codePointAt(0)) ?? WIDTH.get(0x6e);
  return Math.round((units * size) / 1000);
}

export const TITLE_PX = 580;
export const DESCRIPTION_PX = 920;

// node serp-width.mjs "A title to check" ["a description to check"]
import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [title, description] = process.argv.slice(2);
  if (!title || title === '--help') {
    console.log('usage: node serp-width.mjs "title" ["description"]');
    process.exit(title ? 0 : 2);
  }
  const t = serpWidth(title, 20);
  console.log(`title: ${t} px of about ${TITLE_PX}${t > TITLE_PX ? '  (likely cut off)' : ''}`);
  if (description) {
    const d = serpWidth(description, 14);
    console.log(`description: ${d} px of about ${DESCRIPTION_PX}${d > DESCRIPTION_PX ? '  (likely cut off)' : ''}`);
  }
}
