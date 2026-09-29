// Homepage explainer (#explainer): nine beats drawn on one SVG stage, captions as HTML.
// The markup is the end state of the sequence, so without this module the finished drawing and the
// last caption show. On load the module paints t = 0, and one clock t runs 0 to TOTAL once:
//   autoplay   the first time beat 1's caption is wholly on screen below the fixed .site-header
//              and at least half of the drawing (.ex-art-box) is too; the header height is read
//              on mount and on resize, never inside frame. If the viewport is too short for both,
//              it starts once the caption is whole and the drawing already runs under the header.
//   pause      when the stage leaves the screen entirely, when the tab is hidden, or on Pause;
//              it resumes from the same t once none of those holds, with any part of the stage
//              on screen (hysteresis: the start asks for more than staying on does, so a stage at
//              the viewport edge does not flicker)
//   end        stops at TOTAL on the composite drawing; Pause hides in place, Replay stays
// prefers-reduced-motion is not read: the sequence plays the same with it on (spec amendment v2).
// Observable hooks: #explainer[data-state] is idle, playing, paused or ended, and
// #explainer[data-beat] is the beat on screen, 1 to 9. The section title carries .is-under (faded out) while it
// is not wholly below the fixed header.
// Captions: one li per beat, stacked; within the beat on screen each .ex-line fades in at its REVEAL time,
// timed to the drawing cue that shows what it says. Both are painted from t alone, beside frame().
// Pattern from card-art.mjs: parts(svg) collects elements once, frame(parts, t) is pure and writes
// attributes only when they change, one rAF loop with dt capped at 64 ms runs only while playing.
// Scroll hold (amendment v10, hold() below), as the Planned card row pins: with the smooth-scroll layer
// the section is 150svh longer, and from the reading position (bottom row, drawing and captions together
// below the header, centred in the room left, with the title when it fits, else the title wholly under
// the header; published as #explainer[data-reading]) the section's content stays still on screen for that
// length of scroll, in either direction, then scrolls on. No input is cancelled.

const GREEN = '#53db76';
const BRIGHT = '#72f28c';
const AMBER = '#efc87e';
const DIM = '#3e5a45';

// [beat, start, duration] in ms, from the spec's Timing table.
const BEATS = [[1, 0, 10600], [2, 10600, 13200], [3, 23800, 14200], [4, 38000, 12400], [5, 50400, 11200], [6, 61600, 11400], [7, 73000, 11000], [8, 84000, 9400], [9, 93400, 10400]];
const TOTAL = 103800;
// Beat start by number. Every cue below is timed from its beat's start and ends at least 2000 ms
// before that beat ends, so the drawing holds still while the caption is read; the only changes in a
// beat's last 800 ms are beat 1's exit (the sessions turn to ghosts and shrink to their place) and,
// at the very end, the composite coming back.
const START = Object.fromEntries(BEATS.map(([n, s]) => [n, s]));
// Focal dimming (spec: Visuals, Focus): at each beat the groups listed here are lit (opacity 1) and every
// other drawn group, with its stage labels, dims to DIMMED. The change runs over the first FOCUS_IN ms of
// a beat, outside every hold. In the last END_IN ms of the sequence the composite comes back: groups at
// their rest opacity (.7, beat 9 at 1) and every label at 1, as in the markup.
const FOCUS = {1: [1], 2: [2], 3: [2, 3], 4: [2, 4], 5: [2, 4, 5], 6: [2, 4, 6], 7: [2, 7], 8: [2, 8], 9: [1, 2, 9]};
const DIMMED = .35, FOCUS_IN = 600, END_IN = 800;
// Caption line reveals (spec: Timing, Caption reveals): per beat, the ms from the beat's start at which
// each .ex-line starts to appear, in DOM order. Each is timed to the drawing cue that shows what the
// line says, and fades in with the site's small rise over LINE_IN ms.
const REVEAL = {1: [1400, 2400, 4400, 5600], 2: [700, 1700, 3000, 4000, 5400, 6400], 3: [1400, 3000, 6800], 4: [900, 2400, 3800, 5200], 5: [600, 2800, 4000, 5600], 6: [700, 2800, 4200], 7: [1600, 2800, 4800], 8: [1000], 9: [800, 2400, 3800]};
const LINE_IN = 400;

// Geometry that differs between the wide (960 x 560) and tall (360 x 480) drawings. Offsets are
// viewBox units relative to where each element sits in the markup (its end state).
// zoom: beat 1's cluster (sessions, bar, arc and their labels) is drawn at scale s and moved by (x, y)
// viewBox units, centring it in the stage; it eases to its markup place during beat 1's exit.
// retire: [cx, cy, fx, fy, s], beat 2's third reference note: its centre (cx, cy) comes forward to
// (fx, fy), above the strip, drawn s times its size while the contradicted and retired lines play.
// stall: [cx, cy, fx, fy, s], beat 4's failing step: tile 2 on the rail with its two crosses, centre (cx, cy),
// comes forward to (fx, fy), into room nothing else uses in beat 4, drawn s times its size while it fails.
const GEOM = {
  wide: {
    name: 'wide', vbw: 960,
    zoom: [1.6, 172.8, 166.4],
    bar: [40, 344, 116],
    retire: [316, 439, 316, 330, 3],
    stall: [582, 244.5, 740, 140, 2.5],
    refBright: [0, 3], refPrune: 5, refRetire: 2, tickBright: 3, tickSwap: 4, tickPrune: 7,
    tileSplit: [[-102, -72], [-116, -72], [-130, -72]],
    tileRail: [-142, -104, -46],
    briefFrom: [0, 2],
    gate: [772, 788, 764, 796, 226, 274],
    scan3: [572, 744], scan5: [378, 520], scancx: [668, 752], scan7: [220, 744],
    sheet: [634, 424, 452, 88, 14 / 40],
  },
  tall: {
    name: 'tall', vbw: 360,
    zoom: [1.6, -10.4, 188.8],
    bar: [16, 222, 64],
    retire: [176, 361, 176, 250, 3],
    stall: [162, 211, 294, 146, 3],
    refBright: [0, 1], refPrune: 5, refRetire: 2, tickBright: 3, tickSwap: 4, tickPrune: 5,
    tileSplit: [[-30, -48], [-52, -48], [-74, -48]],
    tileRail: [-116, -78, -40],
    briefFrom: [30, -26],
    gate: [316, 332, 310, 338, 204, 228],
    scan3: [210, 340], scan5: [10, 104], scancx: [258, 338], scan7: [90, 340],
    sheet: [268, 350, 36, 132, 14 / 32],
  },
};

// Stage labels (HTML spans over the drawing): the moment each fades in, in ms on the clock.
// Each fades in over 400 ms, done at least 2000 ms before its beat ends.
const LABEL_AT = {
  'Session': 300, 'Self-reported: done': 4400,
  'CLAUDE.md · AGENTS.md': 12300, '.claude/reference/': 14600, '.claude/skills/': 15000, '.agents/skills/': 15200, 'Claude Code': 19400, 'Codex': 19600,
  'New task': 24500, 'pitfalls.md': 25200, 'commands.md': 25200, 'skill index': 30600,
  'Goal': 38200, 'Acceptance checks': 38900,
  'Auditor brief · written first': 51000, 'Builder · fresh context': 51600, 'Baseline': 53200, 'Auditor · fresh context': 54400, 'VERIFIED': 56200,
  '/codex-review': 62300, 'You': 64400,
  '/refine': 74600, 'candidate to prune': 77800,
  '/sync-starter': 84700, 'Template': 85200, 'Next project': 87000,
};

const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = x => { const p = clamp01(x); return p * p * (3 - 2 * p); };
const lerp = (a, b, u) => a + (b - a) * u;
const span = (t, a, b) => clamp01((t - a) / (b - a));
const quart = u => 1 - (1 - clamp01(u)) ** 4;
const expo = u => u >= 1 ? 1 : u <= 0 ? 0 : 1 - 2 ** (-10 * u);
const bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx;
  return u => {
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    let s = u;
    for (let i = 0; i < 8; i++) { const e = X(s) - u, d = dX(s); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; s -= e / d; }
    if (!(Math.abs(X(s) - u) < 1e-4)) { let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (X(s) < u) lo = s; else hi = s; } }
    return Y(s);
  };
};
const easeExpo = bezier(0.16, 1, 0.3, 1);
const easeInk = bezier(0.4, 0, 0.2, 1);
const easeQuint = bezier(0.22, 1, 0.36, 1);
// A pulse for scan lines: fades in over the first 15% of its run and out over the last 15%.
const pulse = u => u <= 0 || u >= 1 ? 0 : Math.min(smooth(u / .15), smooth((1 - u) / .15));
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, u) => {
  if (u <= 0) return a;
  if (u >= 1) return b;
  const x = rgb(a), y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(',')})`;
};

// Writes go through a per-element cache, so an unchanged value costs no DOM work.
const cache = new WeakMap();
const changed = (el, key, value) => {
  let m = cache.get(el);
  if (!m) cache.set(el, m = new Map());
  if (m.get(key) === value) return false;
  m.set(key, value);
  return true;
};
const set = (el, name, value) => { if (el && changed(el, name, value)) el.setAttribute(name, value); };
const style = (el, name, value) => { if (el && changed(el, '$' + name, value)) el.style[name] = value; };
const opacity = (el, v) => set(el, 'opacity', v.toFixed(3));
const move = (el, x, y) => set(el, 'transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
const stroke = (el, c) => set(el, 'stroke', c);

// Markup values (rest opacity, stamp transform) read the first time an element is seen, before any
// paint, so collecting parts again after a layout switch still starts from the markup.
const markup = new WeakMap();
const original = (el, name) => {
  let m = markup.get(el);
  if (!m) markup.set(el, m = {});
  if (!(name in m)) m[name] = el.getAttribute(name);
  return m[name];
};

function parts(svg) {
  const one = name => svg.querySelector(`[data-p="${name}"]`);
  const all = name => [...svg.querySelectorAll(`[data-p="${name}"]`)];
  const len = new Map(), base = new Map(), filled = new Set();
  const measure = el => {
    if (!el || len.has(el)) return;
    len.set(el, el.getTotalLength() + 1);
    base.set(el, +(original(el, 'opacity') ?? 1));
    const f = el.getAttribute('fill');
    if (f && f !== 'none') filled.add(el);
  };
  const stampOf = el => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(original(el, 'transform'));
    return {el, x: +m[1], y: +m[2], s: +m[3]};
  };
  // Every element the frame touches records its markup values now, before the first paint.
  svg.querySelectorAll('[data-p]').forEach(el => { original(el, 'opacity'); original(el, 'transform'); });
  const tick = rect => ({rect, line: rect.nextElementSibling});
  const P = {
    geom: GEOM[svg.classList.contains('ex-art--tall') ? 'tall' : 'wide'],
    len, base, filled,
    groups: Object.fromEntries([...svg.querySelectorAll('.ex-g')].map(g => [g.dataset.beat, g])),
    sess: all('sess').map(g => ({frame: g.querySelector('[data-p="sf"]'), head: g.querySelector('[data-p="sh"]'), dots: [...g.querySelectorAll('[data-p="sd"]')], notes: g.querySelector('[data-p="sn"]')})),
    kernel: all('k'), refs: all('ref'), rowA: all('tA').map(tick), rowB: all('tB').map(tick),
    chips: all('chip'), rows: all('row').map(g => ({g, check: g.querySelector('[data-p="rowck"]')})),
    tiles: all('tile').map(g => ({g, box: g.querySelector('[data-p="tbox"]'), bars: g.querySelector('[data-p="tbars"]')})),
    stampsT: all('stampt').map(stampOf), rticks: all('rtick'), s4d: all('s4d'),
    person: [...(one('person')?.children || [])],
    fail4: all('fail4'),
  };
  for (const name of ['strip', 'div2', 'chipl', 'old2', 'ret2', 'barbase', 'barfill', 'bartick', 'arc', 'selftick', 'task', 'card', 'strands3', 'sheet', 'scan3', 'contract', 'goal', 'rail', 'detour4', 'baseline', 'builder', 'auditor', 'brief', 'cxo', 'cxi', 'cxl', 'cxd', 'cxx', 'scan5', 'scancx', 'posts', 'merge', 'newnote', 'newtick', 'drop7', 'reach7', 'scan7', 'out8', 'next8', 'appr', 'apprck', 'tpl', 'np', 'npdiv', 'npg', 'fill9', 's4', 's4h', 's4n']) P[name] = one(name);
  for (const name of ['stampcx', 'stampp', 'stamp9']) { const el = one(name); P[name] = el && stampOf(el); }
  // Stroke lengths are measured once, for every element that draws in with a dash.
  [...P.sess.flatMap(s => [s.frame, s.notes]), ...P.chips, ...P.rows.map(r => r.check), ...P.tiles.map(x => x.bars), ...P.rticks, ...P.person, ...P.fail4,
    P.strip, P.chipl, P.old2, P.ret2, P.barbase, P.arc, P.task, P.strands3, P.contract, P.goal, P.rail, P.detour4, P.auditor, P.cxo, P.cxi, P.cxx, P.merge,
    P.newnote, P.newtick, P.drop7, P.reach7, P.out8, P.next8, P.apprck, P.tpl, P.np, P.fill9, P.s4, P.s4n].forEach(measure);
  return P;
}

// Draws a stroke in from its start (u 0 to 1) with a dash as long as the path.
function draw(P, el, u, base = P.base.get(el) ?? 1) {
  if (!el) return;
  const L = P.len.get(el);
  set(el, 'stroke-dasharray', `${L.toFixed(1)} ${L.toFixed(1)}`);
  set(el, 'stroke-dashoffset', (L * (1 - clamp01(u))).toFixed(1));
  opacity(el, u > 0 ? base : 0);
  // The fill (it occludes what is behind) switches on once the outline closes. A half-transparent
  // fill would let the active beat's drop-shadow wash the whole shape green.
  if (P.filled.has(el)) set(el, 'fill-opacity', u >= 1 ? '1' : '0');
}
// Fades an element in with a small rise, as the drawing inks in.
function inkIn(el, u, base = 1, rise = 6) {
  if (!el) return;
  opacity(el, smooth(u) * base);
  move(el, 0, rise * (1 - expo(u)));
}
// Check stamp: pops in from 1.6x its size at its markup position plus an offset.
function stamp(st, u, dx = 0, dy = 0) {
  if (!st) return;
  opacity(st.el, smooth(u * 3));
  set(st.el, 'transform', `translate(${(st.x + dx).toFixed(2)} ${(st.y + dy).toFixed(2)}) scale(${(st.s * lerp(1.6, 1, easeExpo(u))).toFixed(3)})`);
}
function scan(el, range, u) {
  if (!el) return;
  move(el, lerp(range[0], range[1], u), 0);
  opacity(el, pulse(u));
}

const beatAt = t => { let b = 1; for (const [n, s] of BEATS) if (t >= s) b = n; return b; };

// Opacity of beat n's group (or its labels) at time t once it is drawn: 1 while its beat is on screen or
// while a later beat lists it in FOCUS, DIMMED otherwise, eased over the first FOCUS_IN ms of each beat;
// rest is the value the end state returns to over the last END_IN ms.
function focus(n, t, rest) {
  const b = beatAt(t);
  const lit = m => FOCUS[m].includes(n) ? 1 : DIMMED;
  const o = n >= b ? 1 : b > 1 ? lerp(lit(b - 1), lit(b), smooth(span(t, START[b], START[b] + FOCUS_IN))) : lit(b);
  return lerp(o, rest, smooth(span(t, TOTAL - END_IN, TOTAL)));
}

// Beat 1's cluster: [scale, dx, dy] at time t, from G.zoom during beat 1 to [1, 0, 0] over its exit.
function zoom(G, t) {
  const k = 1 - smooth(span(t, BEATS[0][2] - 800, BEATS[0][2]));
  const [s, x, y] = G.zoom;
  return [lerp(1, s, k), x * k, y * k];
}

// Where the three step tiles sit at time t, relative to their end position at the gate.
function tileOffset(G, i, t) {
  const split = easeExpo(span(t - START[4], 2400 + i * 100, 3400 + i * 100));
  const gate = easeExpo(span(t - START[6], 2200 + i * 60, 2980 + i * 60));
  const [sx, sy] = G.tileSplit[i];
  return [lerp(lerp(sx, G.tileRail[i], split), 0, gate), lerp(sy, 0, split)];
}

// Paints the drawing at time t. Pure: the same t always gives the same attributes.
function frame(P, t) {
  const G = P.geom;
  const cur = beatAt(t);
  for (const [n, s, d] of BEATS) {
    const g = P.groups[n];
    if (!g) continue;
    opacity(g, t < s ? 0 : focus(n, t, n === 9 ? 1 : .7));
    if (changed(g, 'active', n === cur)) g.classList.toggle('is-active', n === cur);
  }

  // 1 Without it: three sessions open one after another and lose their notes; the compaction bar
  // fills and drops twice; S3 marks itself done (amber tick), then checks itself (amber arc back into
  // its own frame). The cluster is drawn 1.6x, centred in the stage; as the beat exits, the three turn
  // to ghosts and the cluster eases to its place in the sessions row.
  let T = t;
  if (P.groups[1]) { const [s, x, y] = zoom(G, t); set(P.groups[1], 'transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(3)})`); }
  const ghost = mix(GREEN, DIM, smooth(span(T, BEATS[0][2] - 800, BEATS[0][2])));
  P.sess.forEach((s, i) => {
    const at = [0, 1400, 2800][i];
    draw(P, s.frame, quart(span(T, at, at + 600)));
    const head = smooth(span(T, at + 300, at + 600));
    opacity(s.head, head);
    s.dots.forEach(dot => { opacity(dot, head); stroke(dot, ghost); });
    stroke(s.frame, ghost);
    stroke(s.head, ghost);
    if (i < 2) {
      const [w, we, f] = [[600, 1200, 1400], [1900, 2400, 2800]][i];
      draw(P, s.notes, quart(span(T, w, we)), 1 - smooth(span(T, f, f + 500)));
    } else opacity(s.notes, 0);
  });
  draw(P, P.barbase, quart(span(T, 0, 600)));
  let fill = 0;
  if (T >= 3800) fill = lerp(.7, .2, smooth(span(T, 3800, 4000)));
  else if (T >= 2600) fill = lerp(.2, .7, smooth(span(T, 2600, 3800)));
  else if (T >= 2400) fill = lerp(.7, .2, smooth(span(T, 2400, 2600)));
  else if (T >= 400) fill = .7 * smooth(span(T, 400, 2400));
  const [bx0, bx1, by] = G.bar;
  set(P.barfill, 'd', `M${bx0} ${by}H${lerp(bx0, bx1, fill).toFixed(2)}`);
  opacity(P.barfill, fill > .002 ? 1 : 0);
  opacity(P.bartick, T < 2400 ? 0 : smooth(span(T, 2400, 2500)) * (T < 3800 ? lerp(1, .45, smooth(span(T, 2700, 3200))) : lerp(.45, 1, smooth(span(T, 3800, 3900)))));
  opacity(P.selftick, smooth(span(T, 4400, 4600)));
  draw(P, P.arc, quart(span(T, 5600, 6400)));

  // 2 In your repository: the strip draws, its compartments ink in left to right; the third note comes
  // forward for its caption pair and goes back; then the runtimes join. Each compartment arrives with the
  // caption line it goes with (REVEAL[2]); nothing else inks in while the note is forward.
  T = t - START[2];
  draw(P, P.strip, quart(span(T, 0, 1500)));
  opacity(P.div2, .45 * smooth(span(T, 1200, 1700)));
  P.kernel.forEach((el, i) => inkIn(el, span(T, 1700 + i * 100, 2100 + i * 100)));
  const T3 = t - START[3], T7 = t - START[7];
  const lit = smooth(span(T3, 1400, 1800));
  const prune = smooth(span(T7, 4800, 5400));
  const conflict = smooth(span(T, 5400, 5600)) * (1 - smooth(span(T, 6400, 6700)));
  // The third note leaves its slot and is drawn G.retire[4] times its size above the strip (5400-5900),
  // holds there while its lines change, and eases back into the strip (8000-8800).
  const fwd = easeExpo(span(T, 5400, 5900)) * (1 - smooth(span(T, 8000, 8800)));
  const lift = (el, dy = 0) => {
    const [cx, cy, fx, fy, S] = G.retire, s = lerp(1, S, fwd);
    set(el, 'transform', `translate(${(lerp(cx, fx, fwd) - s * cx).toFixed(2)} ${(lerp(cy, fy, fwd) - s * cy + dy).toFixed(2)}) scale(${s.toFixed(3)})`);
  };
  P.refs.forEach((el, i) => {
    const u = span(T, 3000 + i * 120, 3400 + i * 120);
    const bright = G.refBright.includes(i);
    let o = smooth(u) * (bright ? 1 : lerp(1, .45, lit));
    let c = bright ? mix(GREEN, BRIGHT, lit) : GREEN;
    if (i === G.refPrune) { o = lerp(o, 1, prune); c = mix(GREEN, DIM, prune); set(el, 'stroke-dasharray', prune > .5 ? '3 3' : 'none'); }
    // The note that holds the contradicted fact is outlined amber until its retired line is written.
    if (i === G.refRetire) c = mix(c, AMBER, conflict);
    opacity(el, o);
    if (i === G.refRetire) lift(el, 6 * (1 - expo(u)));
    else move(el, 0, 6 * (1 - expo(u)));
    stroke(el, c);
  });
  // The third pair, on reference glyph 3 while it is forward: the note turns amber and one of its lines is
  // overwritten in amber (a new fact contradicts it), then the amber goes and one short dated line writes
  // in at the note's foot (the "retired" line). It dims with the glyph from beat 3 on.
  draw(P, P.old2, quart(span(T, 5600, 6000)), 1 - smooth(span(T, 6400, 6700)));
  draw(P, P.ret2, quart(span(T, 6400, 6900)), lerp(1, .45, lit));
  lift(P.old2);
  lift(P.ret2);
  const tickOn = (tk, u) => { opacity(tk.rect, smooth(u)); opacity(tk.line, smooth(u)); };
  P.rowA.forEach((tk, i) => {
    tickOn(tk, span(T, 4400 + i * 40, 4700 + i * 40));
    const c = i === G.tickBright ? mix(GREEN, BRIGHT, smooth(span(T3, 6950, 7150))) : GREEN;
    stroke(tk.rect, c);
    if (i === G.tickSwap) {
      stroke(tk.line, mix(GREEN, AMBER, smooth(span(T7, 2800, 3000))));
      opacity(tk.line, smooth(span(T, 4400 + i * 40, 4700 + i * 40)) * (1 - smooth(span(T7, 3000, 3300))));
    } else stroke(tk.line, c);
  });
  P.rowB.forEach((tk, i) => {
    tickOn(tk, span(T, 4600 + i * 40, 4900 + i * 40));
    if (i === G.tickPrune) {
      const c = mix(GREEN, DIM, prune), dashes = prune > .5 ? '2 2' : 'none';
      stroke(tk.rect, c); stroke(tk.line, c);
      set(tk.rect, 'stroke-dasharray', dashes); set(tk.line, 'stroke-dasharray', dashes);
    }
  });
  P.chips.forEach((el, i) => draw(P, el, quart(span(T, 8800 + i * 200, 9400 + i * 200))));
  draw(P, P.chipl, quart(span(T, 9000, 9600)));

  // 3 Recall: the task frame draws and its card slides in; two notes brighten and send strands up;
  // a scan runs along the skill index and one tick grows into a playbook that rises into the frame.
  T = T3;
  draw(P, P.task, quart(span(T, 0, 700)));
  if (P.card) { const u = span(T, 500, 1100); opacity(P.card, smooth(u * 2)); move(P.card, 0, -24 * (1 - expo(u))); }
  draw(P, P.strands3, quart(span(T, 1400, 3000)));
  scan(P.scan3, G.scan3, span(T, 6800, 7400));
  if (P.sheet) {
    const [fx0, fy0, fx1, fy1, s0] = G.sheet;
    const u = quart(span(T, 7400, 8200));
    const s = lerp(s0, 1, u), X = lerp(fx0, fx1, u), Y = lerp(fy0, fy1, u);
    set(P.sheet, 'transform', `translate(${(X - s * fx1).toFixed(2)} ${(Y - s * fy1).toFixed(2)}) scale(${s.toFixed(3)})`);
    opacity(P.sheet, smooth(span(T, 7400, 7550)));
  }

  // 4 Plan: a contract sheet with a goal and three checks; the sheet splits into three step tiles,
  // then the rail draws under them.
  T = t - START[4];
  draw(P, P.contract, quart(span(T, 0, 600)));
  draw(P, P.goal, quart(span(T, 200, 800)));
  P.rows.forEach((r, i) => {
    const a = 900 + i * 250;
    opacity(r.g, smooth(span(T, a, a + 200)));
    draw(P, r.check, quart(span(T, a + 80, a + 250)));
  });
  draw(P, P.rail, quart(span(T, 3800, 4600)));
  const T5 = t - START[5], T6 = t - START[6];
  // Stall rule: step 2 fails twice (its tile turns amber, two amber marks), then the route changes (a
  // detour draws round it and the tile turns back). The marks and the detour leave as beat 5 opens.
  const gone4 = 1 - smooth(span(T5, 0, FOCUS_IN));
  // The failing tile and its crosses come forward, drawn G.stall[4] times their size, just before the first
  // cross (4900-5300); they hold there while both crosses draw and ease back to the rail (5950-6300) before
  // the detour draws round the tile. One transform, written to the tile and both crosses.
  const fwd4 = easeExpo(span(T, 4900, 5300)) * (1 - smooth(span(T, 5950, 6300)));
  const lift4 = (el, dx = 0, dy = 0) => {
    const [cx, cy, fx, fy, S] = G.stall, s = lerp(1, S, fwd4);
    set(el, 'transform', `translate(${(lerp(cx, fx, fwd4) + s * (dx - cx)).toFixed(2)} ${(lerp(cy, fy, fwd4) + s * (dy - cy)).toFixed(2)}) scale(${s.toFixed(3)})`);
  };
  P.fail4.forEach((el, i) => { draw(P, el, quart(span(T, 5200 + i * 500, 5400 + i * 500)), gone4); lift4(el); });
  draw(P, P.detour4, quart(span(T, 6300, 7000)), gone4);
  if (P.tiles[1]) stroke(P.tiles[1].box, mix(GREEN, AMBER, smooth(span(T, 5200, 5300)) * (1 - smooth(span(T, 6300, 6600)))));
  const offsets = P.tiles.map((_, i) => tileOffset(G, i, t));
  const built = [span(T5, 1700, 2800), span(T5, 6000, 6300), span(T5, 6300, 6600)];
  const stamped = [span(T5, 5600, 5900), span(T5, 6300, 6550), span(T5, 6600, 6800)];
  P.tiles.forEach((x, i) => {
    if (i === 1 && fwd4 > 0) lift4(x.g, offsets[i][0], offsets[i][1]);
    else move(x.g, offsets[i][0], offsets[i][1]);
    opacity(x.g, smooth(span(T, 2400 + i * 100, 2700 + i * 100)));
    set(x.box, 'fill-opacity', (.35 * smooth(stamped[i] * 2)).toFixed(3));
    draw(P, x.bars, quart(built[i]));
  });

  // 5 Checked apart: the auditor's brief comes first; a fresh builder frame fills tile 1; the
  // baseline appears; the auditor frame takes the brief, scans tile 1 against the baseline and
  // stamps; then tiles 2 and 3 run the same in a shorter pulse.
  T = T5;
  if (P.brief) {
    const u = span(T, 600, 1200), slide = easeExpo(span(T, 4000, 4600));
    opacity(P.brief, smooth(u));
    move(P.brief, G.briefFrom[0] * (1 - slide), G.briefFrom[1] * (1 - slide) + 8 * (1 - expo(u)));
  }
  opacity(P.builder, smooth(span(T, 1200, 1500)));
  set(P.builder, 'stroke-dasharray', T < 1700 ? '4 3' : 'none');
  set(P.builder, 'fill-opacity', T >= 1500 ? '1' : '0');
  opacity(P.baseline, smooth(span(T, 2800, 3200)));
  draw(P, P.auditor, quart(span(T, 4000, 4500)));
  scan(P.scan5, G.scan5, span(T, 4600, 5600));
  P.stampsT.forEach((st, i) => stamp(st, stamped[i], offsets[i][0], offsets[i][1]));

  // 6 Review and your call: a second-family reviewer (double frame) checks the diff and stamps; the
  // tiles slide to the closed gate; the person appears and stamps; only then does the gate open and
  // the merge run down into the strip.
  T = T6;
  draw(P, P.cxo, quart(span(T, 700, 1200)));
  draw(P, P.cxi, quart(span(T, 850, 1350)));
  opacity(P.cxl, .45 * smooth(span(T, 1100, 1400)));
  // One finding is dismissed and stays listed: its line turns dashed and an amber cross marks it.
  opacity(P.cxd, .45 * smooth(span(T, 1100, 1400)));
  set(P.cxd, 'stroke-dasharray', T >= 2900 ? '2 3' : 'none');
  draw(P, P.cxx, quart(span(T, 2800, 3100)));
  scan(P.scancx, G.scancx, span(T, 1300, 1700));
  stamp(P.stampcx, span(T, 1700, 2000));
  if (P.posts) {
    const [cl, cr, ol, or, y0, y1] = G.gate;
    const o = easeQuint(span(T, 4600, 5200));
    set(P.posts, 'd', `M${lerp(cl, ol, o).toFixed(2)} ${y0}V${y1}M${lerp(cr, or, o).toFixed(2)} ${y0}V${y1}`);
    opacity(P.posts, smooth(span(T, 2000, 2400)));
  }
  P.person.forEach(el => draw(P, el, quart(span(T, 2800, 3400))));
  stamp(P.stampp, span(T, 4200, 4500));
  draw(P, P.merge, quart(span(T, 4800, 5400)));

  // 7 Refine: a strand to pitfalls.md writes a new line; three checks by /refine, then one skill
  // line swaps (amber out, green in); a scan marks one note and one skill as candidates to prune.
  T = T7;
  draw(P, P.drop7, quart(span(T, 0, 700)));
  draw(P, P.newnote, quart(span(T, 700, 1200)));
  P.rticks.forEach((el, i) => draw(P, el, quart(span(T, 1600 + i * 300, 1800 + i * 300))));
  draw(P, P.reach7, quart(span(T, 2600, 2800)));
  draw(P, P.newtick, quart(span(T, 3300, 3800)));
  scan(P.scan7, G.scan7, span(T, 4000, 4800));

  // 8 Next project: out of the strip, past an approval stamp, into the template, then to a next
  // project that inks in with the same compartments in miniature.
  T = t - START[8];
  draw(P, P.out8, quart(span(T, 0, 1000)));
  opacity(P.appr, smooth(span(T, 350, 600)));
  set(P.appr, 'fill-opacity', T >= 600 ? '1' : '0');
  draw(P, P.apprck, quart(span(T, 700, 1100)));
  draw(P, P.tpl, quart(span(T, 1000, 2000)));
  draw(P, P.next8, quart(span(T, 2600, 3200)));
  draw(P, P.np, quart(span(T, 3000, 3500)));
  opacity(P.npdiv, .45 * smooth(span(T, 3300, 3700)));
  if (P.npg) opacity(P.npg, smooth(span(T, 3400, 3800)) * +(original(P.npg, 'opacity') ?? 1));

  // 9 Next session: S4 opens beside the ghosts; strands rise into it from the repository; a check
  // stamp lands in its corner; its notes write in.
  T = t - START[9];
  draw(P, P.s4, quart(span(T, 0, 700)));
  const head = smooth(span(T, 300, 700));
  opacity(P.s4h, head);
  P.s4d.forEach(dot => opacity(dot, head));
  draw(P, P.fill9, quart(span(T, 800, 1800)));
  stamp(P.stamp9, span(T, 2400, 2700));
  draw(P, P.s4n, quart(span(T, 3800, 4500)));
  return offsets;
}

function mount(root) {
  const stage = root.querySelector('.ex-stage');
  const svgs = {wide: root.querySelector('.ex-art--wide'), tall: root.querySelector('.ex-art--tall')};
  const items = [...root.querySelectorAll('.ex-beat')];
  const lines = items.map(li => [...li.querySelectorAll('.ex-line')]);
  // Each label's beat and its anchor in viewBox units (inline --x/--y wide, --nx/--ny tall), for the
  // focal dimming and for beat 1's labels, which move with the cluster's zoom.
  const labels = [...root.querySelectorAll('.ex-label')].map(el => {
    const v = name => +(el.style.getPropertyValue(name) || 0);
    return {el, at: LABEL_AT[el.textContent.replace(/\s+/g, ' ').trim()] ?? 0, ok: el.classList.contains('ex-label--ok'), beat: +el.dataset.beat || 9,
      anchor: {wide: [v('--x'), v('--y')], tall: [v('--nx'), v('--ny')]}};
  });
  const pauseButton = root.querySelector('.ex-pause');
  const replayButton = root.querySelector('.ex-replay');
  const narrow = matchMedia('(max-width:767px)');
  let P = null, t = 0, started = false, ended = false, userPaused = false, inView = false, visible = false, raf = 0, previous = null;

  const collect = () => { const svg = narrow.matches ? svgs.tall : svgs.wide; P = svg ? parts(svg) : null; };
  const paint = () => {
    const offsets = P ? frame(P, t) : null;
    const beat = String(beatAt(t));
    if (root.dataset.beat !== beat) root.dataset.beat = beat;
    // Captions change in sequence: the outgoing beat lifts and fades out over the first 250 ms after
    // the boundary (ink), then the incoming beat rises in from 250 to 850 ms (expo), so the two never
    // show together. Beat 1 is already in place at t = 0.
    items.forEach((li, i) => {
      const start = BEATS[i][1], next = BEATS[i + 1]?.[1] ?? Infinity;
      let o = 0, y = .45;
      if (t >= next) { const e = easeInk(span(t, next, next + 250)); o = 1 - e; y = -.3 * e; }
      else if (t >= start) { const e = i === 0 ? 1 : easeExpo(span(t, start + 250, start + 850)); o = e; y = .45 * (1 - e); }
      style(li, 'opacity', o.toFixed(3));
      style(li, 'transform', `translateY(${y.toFixed(3)}em)`);
      style(li, 'pointerEvents', o > .5 ? 'auto' : 'none');
      // Inside the beat, each line appears at its REVEAL time: opacity 0 to 1 (smooth) and a .45em
      // rise (expo) over LINE_IN ms, no blur. Before its beat a line is hidden, so Replay and each
      // new pass start from the headline alone; after its time it stays shown.
      const at = REVEAL[i + 1];
      lines[i].forEach((el, j) => {
        const a = start + (at?.[j] ?? 0), u = span(t, a, a + LINE_IN);
        style(el, 'opacity', smooth(u).toFixed(3));
        style(el, 'transform', `translateY(${(.45 * (1 - easeExpo(u))).toFixed(3)}em)`);
      });
    });
    const vbw = P?.geom.vbw ?? 960;
    const shift = (el, x, y) => style(el, 'translate', `calc(${x.toFixed(2)} / ${vbw} * 100cqw) calc(${y.toFixed(2)} / ${vbw} * 100cqw)`);
    const [zs, zx, zy] = P ? zoom(P.geom, t) : [1, 0, 0];
    labels.forEach(({el, at, ok, beat, anchor}) => {
      // Fades in at its time; dims with its beat's group (FOCUS); back to full at the end.
      style(el, 'opacity', (smooth(span(t, at, at + 400)) * (t < START[beat] ? 1 : focus(beat, t, 1))).toFixed(3));
      // VERIFIED rides above tile 1 from the rail to the gate (viewBox units to container width).
      if (ok && offsets?.[0]) shift(el, offsets[0][0], offsets[0][1]);
      // Beat 1's labels keep their place on the zoomed cluster: the anchor moves as the drawing does.
      else if (beat === 1 && P) { const [ax, ay] = anchor[P.geom.name]; shift(el, zx + (zs - 1) * ax, zy + (zs - 1) * ay); }
    });
  };
  const running = () => started && !ended && !userPaused && inView && !document.hidden;
  const sync = () => {
    const run = running();
    if (run && !raf) { previous = null; raf = requestAnimationFrame(tick); }
    else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
    const state = !started ? 'idle' : ended ? 'ended' : run ? 'playing' : 'paused';
    if (root.dataset.state !== state) root.dataset.state = state;
    const text = userPaused ? 'Play ▷' : 'Pause ‖';
    if (pauseButton.textContent !== text) pauseButton.textContent = text;
    if (pauseButton.hidden !== ended) {
      // Hiding a focused button would drop focus to the page; hand it to Replay first.
      if (ended && document.activeElement === pauseButton) replayButton.focus();
      // explainer.css keeps a hidden Pause's box (visibility:hidden), so Replay does not move.
      pauseButton.hidden = ended;
    }
  };
  const tick = now => {
    if (previous !== null) t += Math.min(now - previous, 64);
    previous = now;
    if (t >= TOTAL) { t = TOTAL; ended = true; raf = 0; paint(); sync(); return; }
    paint();
    raf = requestAnimationFrame(tick);
  };

  collect();
  paint();
  root.dataset.state = 'idle';
  root.classList.add('is-live');
  pauseButton.hidden = false;
  replayButton.hidden = false;

  // Hysteresis: after the start, the stage only has to be on screen at all.
  new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    visible = entry.isIntersecting;
    inView = visible;
    sync();
  }, {threshold: 0}).observe(stage);
  // Start trigger: the viewport minus the fixed header, whose height differs by width, so it is read
  // here and on resize (never inside frame) and the observer is rebuilt when it changes. So is the room
  // the layout needs: the span from beat 1's caption to the nearer half of the drawing. When that fits
  // under the header (with a scroll step to spare), playback waits for the whole caption and half the
  // drawing; when it does not (landscape phones, short windows), for the caption alone: whole, or when
  // it is taller than the room, filling nearly all of it.
  const caption = items[0], art = root.querySelector('.ex-art-box'), header = document.querySelector('.site-header');
  let trigger = null, armedKey = '', capOk = false, artHalf = false, artCut = false;
  const arm = () => {
    if (started) { trigger?.disconnect(); trigger = null; armedKey = ''; return; }
    const hb = Math.max(0, Math.round(header ? header.getBoundingClientRect().bottom : 0));
    const room = innerHeight - hb, c = caption.getBoundingClientRect(), a = art.getBoundingClientRect();
    const half = a.height / 2, s = Math.min(Math.max(c.top, a.top), a.top + half);
    const both = Math.max(c.bottom, s + half) - Math.min(c.top, s) <= room - 24;
    const capNeed = both || c.height <= room - 40 ? .994 : +(.92 * Math.min(1, room / c.height)).toFixed(3);
    const key = `${hb} ${both} ${capNeed}`;
    if (key === armedKey && trigger) return;
    armedKey = key;
    trigger?.disconnect();
    capOk = artHalf = artCut = false;
    trigger = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.target === caption) capOk = e.isIntersecting && e.intersectionRatio >= capNeed;
        else {
          artHalf = e.isIntersecting && e.intersectionRatio >= .495;
          artCut = e.isIntersecting && e.boundingClientRect.top < (e.rootBounds?.top ?? 0);
        }
      }
      // artCut: the drawing already runs under the header while the caption is whole, so scrolling on
      // cannot show more of it; start rather than never.
      if (!started && capOk && (!both || artHalf || artCut)) { started = true; inView = visible = true; arm(); sync(); }
    }, {rootMargin: `-${hb}px 0px 0px 0px`, threshold: [0, .5, capNeed, .995, 1]});
    trigger.observe(caption);
    trigger.observe(art);
  };
  arm();
  addEventListener('resize', arm);
  // Title (round 16): the header's scrolled background is 95% opaque, so a title under it shows through.
  // While the h2 is not wholly below the header it carries .is-under, which explainer.css fades out over
  // 200 ms. An observer whose root stops at the header's foot (the header height read here and on resize,
  // as for the start trigger); no scroll listener, nothing in the frame loop. Below the fold is not under.
  const title = root.querySelector('.ex-title');
  let titleIO = null, titleHb = -1;
  const armTitle = () => {
    const hb = Math.max(0, Math.round(header ? header.getBoundingClientRect().bottom : 0));
    if (hb === titleHb && titleIO) return;
    titleHb = hb;
    titleIO?.disconnect();
    titleIO = new IntersectionObserver(entries => {
      const e = entries[entries.length - 1];
      const under = e.intersectionRatio < 1 && e.boundingClientRect.top < (e.rootBounds?.top ?? 0);
      if (title.classList.contains('is-under') !== under) title.classList.toggle('is-under', under);
    }, {rootMargin: `-${hb}px 0px 0px 0px`, threshold: [0, 1]});
    titleIO.observe(title);
  };
  if (title) { armTitle(); addEventListener('resize', armTitle); }
  document.addEventListener('visibilitychange', sync);
  narrow.addEventListener('change', () => { collect(); paint(); });
  pauseButton.addEventListener('click', () => {
    userPaused = !userPaused;
    // Play pressed before autoplay: start now if any of the stage is on screen.
    if (!userPaused && !started && visible) { started = true; inView = true; arm(); }
    sync();
  });
  replayButton.addEventListener('click', () => {
    t = 0; ended = false; userPaused = false; started = true;
    if (visible) inView = true;
    arm();
    paint();
    sync();
  });
}

// Scroll hold (amendment v10, the Planned card row's pattern). With the smooth-scroll layer, the section is
// 150svh longer (explainer.css, keyed on html[data-smooth-scroll] so the height is there at first paint).
// Once the page reaches the reading position, the title, stage and controls ride with the rendered spring
// offset for that length of scroll, so the block holds still on screen, then scroll on from the bottom of
// the section. It reads position only: no input is cancelled, and wheel, touch, keys, links, the scrollbar
// and scripts all scroll through it the same way, in either direction. Native scroll (reduced motion, or no
// layer) has no hold.
function hold(root) {
  const engine = window.harnessScroll;
  const layer = document.querySelector('[data-scroll-layer]');
  const header = document.querySelector('.site-header');
  const boxes = ['.ex-bottom', '.ex-art-box', '.ex-beats'].map(sel => root.querySelector(sel)).filter(Boolean);
  const title = root.querySelector('h2');
  const riders = [...root.children].filter(el => el.tagName !== 'NOSCRIPT');
  if (!engine || !layer || !boxes.length) return;
  // reading: the scroll offset where the hold starts; len: how long it lasts; shift: the offset applied now.
  let reading = 0, len = 0, shift = 0;

  // Reading position: the reading block (the bottom row with the note and controls, the drawing and the
  // captions) sits below the header, centred in the room left under it when it fits. When the section title
  // fits in that room together with the block, the title joins it; otherwise the title sits wholly under the
  // header, never sliced by it. Published as #explainer[data-reading] (the scroll offset in px). Measured on
  // mount, resize, load, font load and layout changes, never while scrolling; the shift in place is taken
  // out, so the measure is the same wherever the page is.
  const measure = () => {
    const hb = header ? header.getBoundingClientRect().bottom : 0;
    const room = innerHeight - hb;
    const base = layer.getBoundingClientRect().top + shift; // viewport y of the document's top, unshifted
    const rects = boxes.map(el => el.getBoundingClientRect());
    const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
    const spare = Math.max(0, (room - (bottom - top)) / 2);
    const t = title?.getBoundingClientRect();
    let y = top - base - hb - spare;
    if (t && bottom - t.top <= room) y = t.top - base - hb - (room - (bottom - t.top)) / 2;
    else if (t) y = Math.max(y, t.bottom - base - hb);
    const max = document.documentElement.scrollHeight - innerHeight;
    reading = Math.round(Math.min(Math.max(0, y), Math.max(0, max)));
    len = parseFloat(getComputedStyle(root, '::after').height) || 0;
    if (root.dataset.reading !== String(reading)) root.dataset.reading = String(reading);
    update(-engine.y.get());
  };
  const update = shown => {
    const next = Math.min(len, Math.max(0, shown - reading));
    if (next === shift) return;
    shift = next;
    for (const el of riders) el.style.transform = shift ? `translate3d(0,${shift}px,0)` : '';
  };

  engine.y.on('change', y => update(-y));
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  const resized = new ResizeObserver(measure);
  resized.observe(root);
  // Anything above the section that changes height moves it; the layer's height follows.
  resized.observe(layer);
}

const root = document.getElementById('explainer');
if (root) { mount(root); hold(root); }
