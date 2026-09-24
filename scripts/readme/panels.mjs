/* README art: the site's hero headline, redrawn for a page that runs no script and loads no font.

   CONSTRAINT CONTRACT. Every rule below is a build rule; breaking one is a bug, not a taste call.

   Source
   - Every word, line, skill name and timing comes from site/hero-pillars.mjs via facts.mjs.
     The art shows exactly the six pillars the home page cycles, in the home page's order,
     each with exactly the skills or memory files the home page lists for it.
   - Letters are outlines cut from the site's own faces (glyphs.json). No <text> element, no
     font-family, no external URL of any kind: GitHub serves the file under
     `default-src 'none'`.

   Type roles (the site's, unchanged)
   - Lineal 781: the fixed lead-in, "Your agent's work,". Tracking -0.015em, line height 0.99.
   - Fraunces italic: the pillar word only. It shares the lead-in's size, as on the site, where
     one fit-to-width size covers every row.
   - Harness Text 500: the pillar's line, the masthead name, "Your goal".
   - Departure Mono: skill names, tags, the domain. Nothing else is set in mono.

   Colour
   - One accent, the site green, and it means one thing: the pillar in view. The word, the
     rule under it, the branch it grows, the goal dot and the lit segment. Skill names stay
     ink; the light theme's green is the site's green-on-paper, too weak for small type.
   - Two fields: the site's green-black for dark readers, the site's paper for light ones.

   Motion
   - One loop of six slots. A slot is the site's entrance (duration), its rest (hold), and an
     exit a third as long as the entrance, as the site's leaving front sweeps three times
     faster. Glyphs enter on the site's wave: delay grows 55 ms per em of x.
   - Delays are negative, so no element sits in a before-start state; the first frame is the
     loop already running.
   - Reduced motion stops all animation and shows the authored state: pillar one, complete.

   Surface
   - Four variants: wide and narrow, light and dark. Narrow is its own composition: the
     lead-in stacks "Your agent's / work," as the site does below its breakpoint, the branch
     moves under the text.
   - Layout reserves the tallest pillar's space, so nothing shifts between slots.
   - Minimum rendered sizes, at an 880 px README column and a 358 px phone column: 12 px for
     skill names, 10 px for tags, 14 px for the pillar line. verifySizes() checks this. */
import { collectFacts } from "./facts.mjs";
import { Defs, r, set, wrap } from "./type.mjs";
import { esc, fail, read, writeText } from "./lib.mjs";

const facts = await collectFacts();
const { pillars, motion } = facts;

export const THEMES = {
  dark: { bg: "#11120d", ink: "#f2efdf", muted: "#c2c9ba", tag: "#9aa191", rule: "#2c2e25", accent: "#53db76" },
  light: { bg: "#f3f3ec", ink: "#11120d", muted: "#474d42", tag: "#5f6559", rule: "#d6d7ca", accent: "#1d8f43" },
};

const DISPLAY_TRACK = -0.015;
const SUB_TRACK = -0.012;
const LINE = 0.99;
const RISE = 0.3; // em a glyph rises on entry (site: RISE)
const LIFT = 0.2; // em a glyph lifts on exit (site: LIFT)
const SMALL = 0.8; // tags and the list heading, relative to skill names
const EXIT = "cubic-bezier(0.5, 0, 0.75, 0)";

const SLOT = motion.duration + motion.hold + Math.round(motion.duration / 3);
const LOOP = SLOT * pillars.length;
const pct = (ms) => `${+((ms / LOOP) * 100).toFixed(3)}%`;
const delay = (i, ms) => `${Math.round(i * SLOT + ms - LOOP)}ms`;

// The mark, read from the site so a redraw of the logo reaches the README.
const MARK = (() => {
  const svg = read("site/assets/harness-mark.svg");
  const box = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  return { w: +box[1], h: +box[2], paths: [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]) };
})();

const COMPOSITIONS = {
  wide: { W: 1280, P: 64, display: 150, sub: 28, subWidth: 560, mono: 22, name: 21, markH: 36, shown: 880 },
  narrow: { W: 560, P: 32, display: 110, sub: 26, subWidth: 496, mono: 22, name: 20, markH: 28, shown: 358 },
};

function em(role, text, track) {
  return set(role, text, 1, { track }).width;
}

function headline(c, narrow) {
  const cut = motion.lead.lastIndexOf(" ");
  const leadRows = narrow ? [motion.lead.slice(0, cut), motion.lead.slice(cut + 1)] : [motion.lead];
  const fit = Math.max(
    ...leadRows.map((t) => em("display", t, DISPLAY_TRACK)),
    ...pillars.map((p) => em("accent", p.word, DISPLAY_TRACK)),
  );
  const size = Math.min(c.display, (c.W - 2 * c.P) / fit);
  return { leadRows, size };
}

function hero(theme, variant, { still = 0, animate = true, display, height } = {}) {
  const t = THEMES[theme];
  const narrow = variant === "narrow";
  const c = { ...COMPOSITIONS[variant], ...(display && { display }) };
  const defs = new Defs();
  const { W, P } = c;
  const out = [];
  const css = [];

  // Masthead: mark and the two-line name, as the site header sets it.
  const ms = c.markH / MARK.h;
  out.push(`<g fill="${t.ink}" transform="translate(${P} ${P - 20}) scale(${r(ms)})">${MARK.paths.map((d) => `<path d="${d}"/>`).join("")}</g>`);
  const nx = P + MARK.w * ms + 12;
  const top = P - 20;
  out.push(`<g fill="${t.ink}">${defs.uses(set("text", "Harness", c.name, { track: -0.02 }), nx, top + c.name * 0.82)}${defs.uses(set("text", "Firmware", c.name, { track: -0.02 }), nx, top + c.name * 1.72)}</g>`);
  const domain = set("mono", "harnessfirmware.com", c.mono * 0.9);

  // Headline.
  const { leadRows, size } = headline(c, narrow);
  let y = P + c.markH + (narrow ? 64 : 44) + size * 0.8;
  const leadYs = [];
  for (const row of leadRows) {
    out.push(`<g fill="${t.ink}">${defs.uses(set("display", row, size, { track: DISPLAY_TRACK }), P - size * 0.02, y)}</g>`);
    leadYs.push(y);
    y += size * LINE;
  }
  const wordY = y;

  pillars.forEach((p, i) => {
    if (!animate && i !== still) return;
    const run = set("accent", p.word, size, { track: DISPLAY_TRACK });
    const off = i === still ? "" : " off"; // on the animated element itself: a hidden parent would hide the animation
    const glyphs = run.glyphs
      .map((g, k) => {
        const one = { ...run, glyphs: [g] };
        const use = defs.uses(one, P, wordY);
        if (!use) return "";
        const wave = (g.x / size) * motion.wave;
        return animate ? `<g class="wg${off}" style="animation-delay:${delay(i, wave)}">${use}</g>` : use;
      })
      .join("");
    out.push(`<g fill="${t.accent}">${glyphs}</g>`);
  });

  // Rule and the pillar's line. Space is reserved for the pillar with the most lines.
  const ruleY = wordY + size * 0.3 + 22;
  out.push(`<rect x="${P}" y="${r(ruleY)}" width="34" height="2" fill="${t.accent}"/>`);
  const subLead = c.sub * 1.28;
  const subTop = ruleY + 18 + c.sub * 0.78;
  const subLines = pillars.map((p) => wrap("text", p.line, c.sub, c.subWidth, { track: SUB_TRACK }));
  const subRows = Math.max(...subLines.filter((_, i) => animate || i === still).map((l) => l.length));
  pillars.forEach((p, i) => {
    if (!animate && i !== still) return;
    const body = subLines[i].map((run, k) => defs.uses(run, P, subTop + k * subLead)).join("");
    const cls = ["sl", i === still ? "" : "off"].filter(Boolean).join(" ");
    const attrs = animate ? ` class="${cls}" style="animation-delay:${delay(i, motion.gap * 2)}"` : "";
    out.push(`<g fill="${t.muted}"${attrs}>${body}</g>`);
  });
  const subBottom = subTop + (subRows - 1) * subLead + c.sub * 0.3;

  // The branch: your goal, fanning out to what does the work behind the pillar.
  const shown = (_, i) => animate || i === still; // a still frame reserves only its own pillar
  const most = Math.max(...pillars.filter(shown).map((p) => p.skills.length));
  const pitch = c.mono * 2;
  let gx, gy, lx, bandBottom;
  if (narrow) {
    gx = P + 10;
    lx = P + 150;
    const bandTop = subBottom + 64;
    gy = bandTop + ((most - 1) * pitch) / 2;
    bandBottom = bandTop + (most - 1) * pitch + 30;
  } else {
    gx = 690;
    lx = 880;
    const bandTop = wordY + size * 0.3 + 60;
    gy = Math.max(bandTop + ((most - 1) * pitch) / 2 + 20, subTop);
    bandBottom = gy + ((most - 1) * pitch) / 2 + 20;
  }
  pillars.forEach((p, i) => {
    if (!animate && i !== still) return;
    const n = p.skills.length;
    const parts = [];
    const off = i === still ? "" : " off";
    p.skills.forEach((s, j) => {
      const ly = gy + (j - (n - 1) / 2) * pitch;
      const d = `M${r(gx)} ${r(gy)}C${r(gx + (lx - gx) * 0.55)} ${r(gy)} ${r(lx - (lx - gx) * 0.45)} ${r(ly)} ${r(lx)} ${r(ly)}`;
      const curve = `<path d="${d}" pathLength="1" fill="none" stroke="${t.accent}" stroke-width="2"${animate ? ` class="cv${off}" style="animation-delay:${delay(i, 120 + j * 80)}"` : ""}/>`;
      const name = set("mono", s.name, c.mono);
      const label = defs.uses(name, lx + 16, ly + c.mono * 0.36);
      const tag = s.tag ? defs.uses(set("mono", s.tag, c.mono * SMALL), lx + 16 + name.width + c.mono * 0.7, ly + c.mono * 0.3) : "";
      const lab = `<g${animate ? ` class="lb${off}" style="animation-delay:${delay(i, 300 + j * 80)}"` : ""}><circle cx="${r(lx)}" cy="${r(ly)}" r="4.5" fill="${t.accent}"/><g fill="${t.ink}">${label}</g><g fill="${t.tag}">${tag}</g></g>`;
      parts.push(curve, lab);
    });
    const heading = set("mono", p.label.toUpperCase(), c.mono * SMALL, { track: 0.06 });
    const hy = gy - ((n - 1) / 2) * pitch - c.mono * 1.35;
    parts.push(`<g fill="${t.tag}"${animate ? ` class="lb${off}" style="animation-delay:${delay(i, 240)}"` : ""}>${defs.uses(heading, lx + 16, hy)}</g>`);
    out.push(`<g>${parts.join("")}</g>`);
  });
  const goal = set("text", "Your goal", c.sub * 0.8, { track: SUB_TRACK });
  const goalX = narrow ? P : gx - goal.width / 2;
  out.push(`<circle cx="${r(gx)}" cy="${r(gy)}" r="11" fill="${t.accent}"/>`);
  if (animate) out.push(`<circle cx="${r(gx)}" cy="${r(gy)}" r="11" fill="none" stroke="${t.accent}" stroke-width="2" class="pr"/>`);
  out.push(`<g fill="${t.ink}">${defs.uses(goal, goalX, gy + 46)}</g>`);

  // Foot: one segment per pillar, lit in turn; the domain.
  const natural = Math.round(Math.max(bandBottom, gy + 46, subBottom) + (narrow ? 72 : 76));
  if (height && natural > height) fail(`${theme} ${variant}: content needs ${natural} px, ${height} available`);
  const H = height || natural;
  const footY = H - (narrow ? 48 : 40);
  const seg = narrow ? 40 : 44;
  pillars.forEach((p, i) => {
    const x = P + i * (seg + 8);
    out.push(`<rect x="${x}" y="${footY - 3}" width="${seg}" height="3" fill="${t.rule}"/>`);
    if (!animate && i !== still) return;
    const lit = i === still ? "" : "off";
    const cls = [animate ? "sg" : "", lit].filter(Boolean).join(" ");
    out.push(`<rect x="${x}" y="${footY - 3}" width="${seg}" height="3" fill="${t.accent}"${cls ? ` class="${cls}"` : ""}${animate ? ` style="animation-delay:${delay(i, 0)}"` : ""}/>`);
  });
  const domainY = top + c.name * 1.3;
  out.push(`<g fill="${t.muted}">${defs.uses(domain, W - P - domain.width, domainY)}</g>`);

  if (animate) {
    const rise = r(RISE * size);
    const lift = r(LIFT * size);
    const sub = r(0.25 * c.sub);
    const inEnd = pct(motion.duration);
    const holdEnd = pct(motion.duration + motion.hold);
    const out_ = pct(SLOT);
    css.push(
      `.wg,.sl,.lb{animation:${LOOP}ms infinite}`,
      `.wg{animation-name:wv}.sl,.lb{animation-name:sv}`,
      `.cv{stroke-dasharray:1;animation:dc ${LOOP}ms infinite}`,
      `.sg{animation:sg ${LOOP}ms infinite}`,
      `.pr{opacity:0;transform-box:fill-box;transform-origin:center;animation:pr ${SLOT}ms infinite}`,
      `.off{opacity:0}`,
      `@keyframes wv{0%{opacity:0;transform:translateY(${rise}px);animation-timing-function:${motion.ease}}${inEnd}{opacity:1;transform:none;animation-timing-function:linear}${holdEnd}{opacity:1;transform:none;animation-timing-function:${EXIT}}${out_},100%{opacity:0;transform:translateY(-${lift}px)}}`,
      `@keyframes sv{0%{opacity:0;transform:translateY(${sub}px);animation-timing-function:${motion.ease}}${inEnd}{opacity:1;transform:none;animation-timing-function:linear}${holdEnd}{opacity:1;transform:none;animation-timing-function:${EXIT}}${out_},100%{opacity:0;transform:none}}`,
      `@keyframes dc{0%{stroke-dashoffset:1;opacity:1;animation-timing-function:${motion.ease}}${inEnd}{stroke-dashoffset:0;opacity:1}${holdEnd}{stroke-dashoffset:0;opacity:1}${out_},100%{stroke-dashoffset:0;opacity:0}}`,
      `@keyframes sg{0%,${pct(SLOT - 1)}{opacity:1}${out_},100%{opacity:0}}`,
      `@keyframes pr{0%{opacity:.7;transform:scale(1);animation-timing-function:${motion.ease}}35%{opacity:0;transform:scale(3.4)}100%{opacity:0;transform:scale(3.4)}}`,
      `@media (prefers-reduced-motion:reduce){*{animation:none!important}}`,
    );
  }

  const label = `Your agent's work, ${pillars.map((p) => p.word).join(", ")}. ${pillars.map((p) => `${p.word[0].toUpperCase()}${p.word.slice(1)}: ${p.line.replace(/\.$/, "")} (${p.skills.map((s) => s.name).join(", ")}).`).join(" ")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(label)}">
${css.length ? `<style>${css.join("")}</style>\n` : ""}${defs}
<rect width="${W}" height="${H}" rx="${height ? 0 : narrow ? 20 : 16}" fill="${t.bg}"/>
${out.join("\n")}
</svg>
`;
  return { svg, H, W, size, sizes: { mono: c.mono, small: c.mono * SMALL, sub: c.sub, shown: c.shown } };
}

// Rendered-size floor, at the width each variant is shown.
function verifySizes(name, h) {
  const scale = h.sizes.shown / h.W;
  const mono = h.sizes.mono * scale;
  const small = h.sizes.small * scale;
  const sub = h.sizes.sub * scale;
  if (mono < 12) fail(`${name}: skill names render at ${mono.toFixed(1)} px`);
  if (small < 10) fail(`${name}: tags render at ${small.toFixed(1)} px`);
  if (sub < 14) fail(`${name}: pillar line renders at ${sub.toFixed(1)} px`);
}

export const HERO_FILES = [];
for (const variant of ["wide", "narrow"]) {
  for (const theme of ["light", "dark"]) {
    const name = variant === "wide" ? `hero-${theme}` : `hero-narrow-${theme}`;
    const h = hero(theme, variant);
    verifySizes(name, h);
    for (const p of pillars) {
      if (!h.svg.includes(esc(p.word))) fail(`${name}: pillar ${p.word} missing from the label`);
    }
    if (/<text|font-family|https?:\/\/(?!www\.w3\.org)/.test(h.svg)) fail(`${name}: text element, font or external URL`);
    const file = `assets/readme/${name}.svg`;
    writeText(file, h.svg);
    HERO_FILES.push(file);
  }
}
// GitHub's social preview: 1280 x 640, one still frame, the pillar that names the review step.
const social = hero("dark", "wide", { still: pillars.findIndex((p) => p.word === "audited"), animate: false, display: 110, height: 640 });
if (social.W !== 1280 || social.H !== 640) fail("social preview must be 1280 x 640");
writeText("assets/readme/social-preview.svg", social.svg);

process.stdout.write(`Wrote ${HERO_FILES.length} hero variants and the social preview source (loop ${LOOP} ms, ${pillars.length} slots of ${SLOT} ms).\n`);
