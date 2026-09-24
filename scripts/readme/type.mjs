/* Text as outlines. GitHub loads README images under `default-src 'none'`, so an SVG there
   cannot fetch a web font and system fonts are whatever the reader has. The art draws every
   letter from glyphs.json instead: the site's own four faces, instanced at the settings
   site/fonts.css uses, cut by glyphs.py. Advances, GPOS offsets and pair kerning come from
   HarfBuzz, so a line set here matches the width the browser gives the same line on the site. */
import { readJson } from "./lib.mjs";

const FACES = readJson("scripts/readme/glyphs.json");

export function face(role) {
  const f = FACES[role];
  if (!f) throw new Error(`type: no face ${role}`);
  return f;
}

/* Lay out one line. Returns glyph placements in user units and the ink width (the tracking
   after the last glyph is not counted, which is how a browser's measured box differs from
   the visual one only by that trailing space). */
export function set(role, text, size, { track = 0 } = {}) {
  const f = face(role);
  const scale = size / f.upm;
  const glyphs = [];
  let x = 0;
  const chars = [...text];
  chars.forEach((ch, i) => {
    const g = f.glyphs[ch];
    if (!g) throw new Error(`type: ${role} has no glyph for ${JSON.stringify(ch)}; add it to EXTRA in glyphs.py`);
    glyphs.push({ ch, x: x + g.dx * scale });
    x += g.adv * scale + track * size;
    const next = chars[i + 1];
    if (next) x += (f.kern[ch + next] || 0) * scale;
  });
  return { role, size, scale, glyphs, width: x - track * size, text };
}

/* Greedy wrap into lines no wider than `width`. */
export function wrap(role, text, size, width, opts) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (line && set(role, trial, size, opts).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines.map((l) => set(role, l, size, opts));
}

/* Collects the glyph outlines one SVG uses, so each is written once in <defs>. */
export class Defs {
  constructor() {
    this.used = new Map();
  }
  id(role, ch) {
    const key = `${role}:${ch}`;
    if (!this.used.has(key)) this.used.set(key, `${role[0]}${this.used.size.toString(36)}`);
    return this.used.get(key);
  }
  /* <use> elements for a set line with its baseline at (x, y). */
  uses(run, x, y) {
    const s = +run.scale.toFixed(5);
    return run.glyphs
      .filter((g) => face(run.role).glyphs[g.ch].d)
      .map((g) => `<use href="#${this.id(run.role, g.ch)}" transform="translate(${r(x + g.x)} ${r(y)}) scale(${s} -${s})"/>`)
      .join("");
  }
  toString() {
    const paths = [...this.used].map(([key, id]) => {
      const [role, ch] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
      return `<path id="${id}" d="${face(role).glyphs[ch].d}"/>`;
    });
    return `<defs>${paths.join("")}</defs>`;
  }
}

export const r = (v) => +v.toFixed(2);
