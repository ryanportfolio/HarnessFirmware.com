// Promo film (/promo, #promo): what conference speakers recommend, paired with how Harness Firmware
// already does it. One isometric machine, "the harness bench", stands for a repository with the
// firmware in it: a kernel plate, a skill rack, a cabinet of reference drawers, a planning desk, the
// long-horizon line, an arena, the review gate and a return pipe that carries lessons back. Two gantry
// heads ride a rail above it: Claude Code (green) and Codex (amber). Each beat moves the camera to the
// station that does what the quote recommends.
// Drawn on a 1920 x 1080 canvas with the anatomy kit's geometry (iso-kit.mjs) painted through Path2D;
// captions are HTML over it. Every frame is a pure function of the clock t: frame(t) paints, seek(t)
// jumps, and window.promoFilm exposes both, the beat table and the total for checks.
// Beat sheet, quotes and sources: docs/specs/2026-10-12-promo-film-design.md.
import * as k from './iso-kit.mjs';
import {clamp, lerp, sm, eo, eio, mulberry} from './particle-engine.mjs';

const W = 1920, H = 1080;
const P = {origin: [0, 0], scale: 1, azimuth: 58, elevation: 30};
const iso = p => k.iso(p, P);

// ---- palette: the site's ink, paper, green and amber, with the anatomy kit's four side shades
const INK = [15, 18, 16], PAPER = [20, 25, 21], TOP = [27, 34, 29], SHADE = [[12, 15, 13], [16, 20, 17], [19, 24, 20], [23, 29, 24]];
const GREEN = [83, 219, 118], AMBER = [239, 200, 126], CREAM = [243, 243, 236];
const TONE = {hi: .86, mid: .44, lo: .24, faint: .12};
const mix = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;
const LW = 1.15;

// ---- beats. Times in seconds. Quotes are verbatim from docs/promo/social-proof.md.
const BEATS = [
  {id: 'open', dur: 9},
  {id: 'f1', dur: 6.5, n: '01', ch: 'Foundations', who: 'Nick Saraev · YouTube educator',
    q: 'Because you only ever need to create it once it saves you the time from having to continuously reprompt.',
    a: 'CLAUDE.md and AGENTS.md load in every <em>session</em>', ansAt: 4.2},
  {id: 'f2', dur: 6, n: '02', ch: 'Foundations', who: 'Tereza Tížková · Factory',
    q: 'We just progressively disclose what’s in the context and what tools to use.',
    a: 'A skill’s full playbook loads only when a task calls <em>it</em>', ansAt: 3.4},
  {id: 'f3', dur: 7, n: '03', ch: 'Foundations', who: 'Rafal Wilinski · Runlayer',
    q: 'If agents would try to figure out that from scratch, they are likely going to fail.',
    a: 'A quirk that cost a retry goes into pitfalls.md, without <em>asking</em>', ansAt: 4},
  {id: 'f4', dur: 6.5, n: '04', ch: 'Foundations', who: 'Davis Palmie · Factory',
    q: 'Even though humans and agents may use different services, everything should share the same underlying harness and context.',
    a: 'Claude Code and Codex read the same <em>files</em>', ansAt: 4.3},
  {id: 'p1', dur: 8, n: '05', ch: 'Plan', who: 'Tereza Tížková · Factory', q: 'Deciding what to build in the software not how to build it.',
    who2: 'Gabriel Martinez · G2i', q2: 'The danger is that the engineer never noticed that there was a choice to make.', q2At: 3.6,
    a: 'Every open choice comes to you as a <em>decision</em>', ansAt: 5.4, tag: '/deep-plan'},
  {id: 'p2', dur: 7, n: '06', ch: 'Plan', who: 'Ryan Cooke · WorkOS',
    q: 'We don’t need a human to be shepherding this agent through every single step of the life cycle.',
    a: 'You say go once. Ready steps run in <em>rounds</em>', ansAt: 4.2, tag: '/long-horizon'},
  {id: 'c1', dur: 8, n: '07', ch: 'Check the work', who: 'Miguel · Browserbase  ·  Corby · Microsoft',
    q: 'The agents will often overconfidently claim that they did something when in fact they did not do it.',
    a: 'A fresh Auditor checks each step against a brief written <em>first</em>', ansAt: 4.6, tag: '/long-horizon'},
  {id: 'c3', dur: 7, n: '08', ch: 'Check the work', who: 'Hussein · Braintrust',
    q: 'Being able to do this type of side-by-side comparison becomes the next evolution of the eval cycle that we see.',
    a: 'Several attempts, judged blind, the best ideas <em>grafted</em>', ansAt: 4.2, tag: '/arena'},
  {id: 'g1', dur: 10.5, n: '09', ch: 'Gate the pull request', who: 'Dru Knox · Tessl', beyond: true,
    q: 'This is for expensive things you want to run once when the PR goes up.',
    a: 'Codex reviews every pull request before it <em>merges</em>', ansAt: 3.4, tag: '/merge'},
  {id: 'i1', dur: 9.5, n: '10', ch: 'Improve over time', who: 'Ryan Cooke · WorkOS', beyond: true,
    q: 'We can actually point agents at sessions and see where are the gaps and how people are using our factory.',
    a: 'Repeated corrections become proposed rules. You <em>apply</em> them', ansAt: 4.8, tag: '/refine weekly'},
  {id: 'x0', dur: 2.5},
  {id: 'x1', dur: 7, n: '11', ch: 'Beyond the talks', a: 'Work from Claude Code, reviewed by Codex|Work from Codex, reviewed by <em>Claude</em>', ansAt: .6, tag: 'Every pull request'},
  {id: 'x2', dur: 6, n: '12', ch: 'Beyond the talks', a: 'Two sessions check each other and agree before <em>acting</em>', ansAt: .6, tag: '/coordinate'},
  {id: 'x3', dur: 5, n: '13', ch: 'Beyond the talks', a: 'CI flags any skill whose Codex version <em>drifts</em>', ansAt: .6, tag: 'Two tools, one skill set'},
  {id: 'res', dur: 9.5},
  {id: 'close', dur: 6.5},
];
let TOTAL = 0; const B = {};
for (const b of BEATS) { b.start = TOTAL; TOTAL += b.dur; B[b.id] = b; }
const at = (id, u) => B[id].start + u;
const local = (id, t) => t - B[id].start;
const beatAt = t => { let r = BEATS[0]; for (const b of BEATS) if (t >= b.start) r = b; return r; };

// ---- camera: [time, centre x, y, z, zoom, focus screen x, y]; eased between keys
const FULL = [820, 90, 40, .8, 1040, 700];
const ST = {kernel: [85, 95, 50], rack: [305, 100, 60], drawers: [520, 120, 70], plan: [750, 110, 60], line: [1010, 100, 50],
  arena: [1284, 120, 50], gate: [1530, 130, 60], back: [1520, -20, 30]};
const camAt = (s, z = 1.8, fx = 1260, fy = 620) => [...ST[s], z, fx, fy];
const CAM = [
  [0, ...FULL], [at('open', 8.8), 820, 90, 40, .86, 1040, 690],
  [at('f1', .2), ...camAt('kernel', 1.95)], [at('f2', .2), ...camAt('rack')], [at('f3', .2), ...camAt('drawers', 1.75, 1260, 580)],
  [at('f4', .2), 330, 90, 60, 1.2, 1240, 640], [at('p1', .2), ...camAt('plan', 1.85)], [at('p2', .2), 960, 120, 50, 1.55, 1270, 620],
  [at('c1', .2), ...camAt('line', 1.8)], [at('c3', .2), ...camAt('arena', 1.9)], [at('g1', .2), ...camAt('gate', 1.8)],
  [at('i1', .2), 1560, -10, 40, 1.8, 1260, 640], [at('i1', 2.6), 1560, -10, 40, 1.8, 1260, 640], [at('i1', 6.4), 680, 80, 40, 1.5, 1260, 600],
  [at('x0', .2), ...FULL], [at('x1', .3), ...camAt('gate', 1.8)], [at('x2', .2), 1000, 80, 80, 1.7, 1270, 600],
  [at('x3', .2), ...camAt('rack', 1.9)], [at('res', .2), 1560, 130, 60, 1.8, 1340, 600], [at('close', .3), ...FULL],
];
const TRAVEL = 1.3;
function camera(t) {
  let j = 0; for (let q = 0; q < CAM.length; q++) if (CAM[q][0] <= t) j = q;
  const a = CAM[j], b = CAM[j + 1];
  if (!b) return a.slice(1);
  const u = eio((t - a[0]) / Math.min(TRAVEL, b[0] - a[0]));
  // Hold a until the travel window before b begins.
  const start = b[0] - Math.min(TRAVEL, b[0] - a[0]), v = t < start ? 0 : eio((t - start) / (b[0] - start));
  void u; return a.slice(1).map((x, i) => lerp(x, b[i + 1], v));
}

// ---- Path2D cache for kit solids and lines
const cache = new WeakMap();
function p2(sp) {
  let o = cache.get(sp); if (o) return o;
  o = {fill: new Path2D(sp.fill), shades: sp.shades.map(d => d ? new Path2D(d) : null), top: new Path2D(sp.top),
    crease: sp.crease ? new Path2D(sp.crease) : null, outline: new Path2D(sp.outline), bevel: sp.bevel ? new Path2D(sp.bevel) : null};
  cache.set(sp, o); return o;
}
const lineCache = new Map();
const lp = d => { let o = lineCache.get(d); if (!o) { o = new Path2D(d); lineCache.set(d, o); } return o; };

// ---- painting. e is emphasis (1 focused, lower dims), acc an accent colour, g its strength 0..1
let ctx, ZOOM = 1, DPR = 1, GA = 1;
function paint(sp, {e = 1, tone = 'mid', acc = null, g = 0, alpha = 1, flat = false} = {}) {
  const p = p2(sp), d = .35 + .65 * e, tint = c => acc && g ? mix(c, mix(c, acc, .5), Math.min(1, g) * .55) : c;
  ctx.globalAlpha = alpha * GA;
  ctx.fillStyle = css(mix(INK, tint(PAPER), d)); ctx.fill(p.fill);
  if (!flat) {
    p.shades.forEach((s, i) => { if (s) { ctx.fillStyle = css(mix(INK, tint(SHADE[i]), d)); ctx.fill(s); } });
    ctx.fillStyle = css(mix(INK, tint(TOP), d)); ctx.fill(p.top);
  }
  ctx.lineWidth = LW / ZOOM;
  if (p.crease) { ctx.strokeStyle = css(CREAM, TONE.faint * d); ctx.stroke(p.crease); }
  if (p.bevel) { ctx.strokeStyle = css(CREAM, TONE.faint * d * 1.4); ctx.stroke(p.bevel); }
  if (acc && g > 0) { glow(acc, g * e); ctx.strokeStyle = css(mix(CREAM, acc, .85), Math.min(1, .5 + g) * d); }
  else ctx.strokeStyle = css(CREAM, TONE[tone] * d);
  ctx.stroke(p.outline); noGlow(); ctx.globalAlpha = GA;
}
function line(d, {e = 1, tone = 'lo', col = CREAM, a = null, w = 1, g = 0} = {}) {
  if (!d) return;
  ctx.lineWidth = LW * w / ZOOM; ctx.strokeStyle = css(col, (a ?? TONE[tone]) * (.35 + .65 * e));
  if (g) glow(col, g); ctx.stroke(lp(d)); if (g) noGlow();
}
function glow(c, g) { ctx.shadowColor = css(c, Math.min(1, g)); ctx.shadowBlur = 14 * DPR * Math.min(1.5, g); }
function noGlow() { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }
function dot(p, r, c, a) { const [x, y] = iso(p); ctx.fillStyle = css(c, a); ctx.beginPath(); ctx.arc(x, y, r / ZOOM * 1.0, 0, 6.2832); ctx.fill(); }
function spark(p, r, c, a) {
  const [x, y] = iso(p), R = r;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, css(mix(c, CREAM, .6), a)); gr.addColorStop(.25, css(c, a * .7)); gr.addColorStop(1, css(c, 0));
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.fill();
}
// Text engraved on a face: on a top face along x, or on the +y (front) face.
function faceText(str, [x, y, z], {size = 6, face = 'top', col = CREAM, a = .5, e = 1, align = 'left', font = 'mono'} = {}) {
  const o = iso([x, y, z]), u = iso([x + 1, y, z]), v = face === 'top' ? iso([x, y + 1, z]) : iso([x, y, z - 1]);
  ctx.save(); ctx.transform(u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]);
  ctx.font = `${size}px ${font === 'mono' ? '"Departure Mono", monospace' : '"Harness Text", sans-serif'}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = css(col, a * (.35 + .65 * e)); ctx.fillText(str, 0, 0); ctx.restore();
}
// A person, standing at a floor point: head and shoulders in the site's line style.
function person(p, {e = 1, lit = 0} = {}) {
  const [x, y] = iso(p), s = 1;
  ctx.lineWidth = LW * 1.3 / ZOOM; ctx.strokeStyle = css(mix(CREAM, GREEN, lit), (.5 + .5 * lit) * (.35 + .65 * e));
  if (lit) glow(GREEN, lit * .8);
  ctx.beginPath(); ctx.arc(x, y - 62 * s, 10 * s, 0, 6.2832); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y - 18 * s, 24 * s, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  noGlow();
}

// ---- geometry helpers: static solids are built once and cached by key
const S = new Map();
const box = (x, y, w, d, z, h, r = 1.5, bevel = 0, steps = 3) => { const key = [x, y, w, d, z, h, r, bevel, steps].join(); let s = S.get(key); if (!s) { s = k.slabOf({x, y, w, d, r}, z, h, P, steps, bevel); S.set(key, s); } return s; };
const cyl = (x, y, r, z, h, steps = 24) => { const key = ['c', x, y, r, z, h, steps].join(); let s = S.get(key); if (!s) { s = k.cylinder(x, y, r, z, h, P, steps); S.set(key, s); } return s; };
const dyn = (x, y, w, d, z, h, r = 1.5, bevel = 0) => k.slabOf({x, y, w, d, r}, z, h, P, 3, bevel);
const dcyl = (x, y, r, z, h, steps = 20) => k.cylinder(x, y, r, z, h, P, steps);
const Z0 = 22;

// ---- emphasis: which stations a beat lights
const FOCUS = {open: null, f1: ['kernel', 'cc'], f2: ['rack', 'cc'], f3: ['drawers', 'cc'], f4: ['kernel', 'rack', 'drawers', 'cc', 'cx'], p1: ['plan', 'cc'],
  p2: ['line', 'plan', 'cc'], c1: ['line', 'cc'], c3: ['arena', 'cc'], g1: ['gate', 'cc', 'cx'], i1: ['back', 'drawers', 'gate'], x0: null, x1: ['gate', 'cc', 'cx'],
  x2: ['plan', 'line', 'cc', 'cc2'], x3: ['rack', 'cx'], res: ['gate', 'cx'], close: null};
function emphasis(t, name) {
  const b = beatAt(t), f = FOCUS[b.id], prev = BEATS[BEATS.indexOf(b) - 1], pf = prev ? FOCUS[prev.id] : null;
  const val = list => !list || list.includes(name) ? 1 : .45;
  return lerp(val(pf), val(f), sm((t - b.start) / .9));
}

// ---- bench, rail and the return pipe
const BENCH = {x: -40, y: -80, w: 1760, d: 340, r: 16};
function drawBench(t) {
  const e = .75 + .25 * emphasis(t, 'bench');
  const [hx, hy] = iso([830, 90, 0]);
  const gr = ctx.createRadialGradient(hx, hy + 40, 50, hx, hy + 40, 1300); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(hx - 1500, hy - 700, 3000, 1500);
  for (const [x, y] of [[-20, -60], [1700, -60], [-20, 240], [1700, 240]]) { paint(cyl(x, y, 9, -16, 3, 20), {e, tone: 'lo'}); paint(cyl(x, y, 7, -13, 13, 20), {e, tone: 'lo'}); }
  paint(box(BENCH.x, BENCH.y, BENCH.w, BENCH.d, 0, Z0, 16, 1.6, 8), {e, tone: 'mid'});
  line(k.planOutline(k.insetPlan(BENCH, 8), Z0, P, 8), {e, tone: 'faint'});
  // ruler strip along the front edge
  paint(box(-20, 236, 1720, 9, Z0, .8, 1, 0, 2), {e, tone: 'lo', flat: true});
  const tk = rulerTicks(); line(tk.minor, {e, tone: 'lo'}); line(tk.major, {e, tone: 'mid'});
  for (const [x, y] of k.corners(BENCH, 16)) dot([x, y, Z0], 1.6, CREAM, .35 * e);
  // label plate, front left
  paint(box(-24, 196, 150, 34, Z0, 1.2, 2, 0, 3), {e, tone: 'lo'});
  faceText('HARNESS FIRMWARE', [-16, 206, Z0 + 1.2], {size: 8.5, a: .62, e});
  faceText('YOUR REPOSITORY', [-16, 220, Z0 + 1.2], {size: 6.2, a: .4, e});
}
let TICKS = null;
function rulerTicks() { if (!TICKS) TICKS = k.topTicks(-10, 1690, 10, 5, 237, Z0 + .8, [3, 6], P); return TICKS; }

const POSTS = [-20, 540, 1110, 1690];
function drawRailBack(t) {
  const e = .7 + .3 * Math.max(emphasis(t, 'cc'), emphasis(t, 'cx'));
  for (const x of POSTS) { paint(cyl(x, -62, 9, Z0, 4, 20), {e, tone: 'lo'}); paint(cyl(x, -62, 5.5, Z0 + 4, 148, 20), {e, tone: 'mid'}); }
  paint(box(-34, -70, 1740, 14, 174, 8, 2, .6), {e, tone: 'mid'});
  line(k.sideSeam({x: -34, y: -70, w: 1740, d: 14, r: 2}, 178, P, 3), {e, tone: 'faint'});
}
// Return pipe: from the reader behind the gate, along the back of the bench, then forward beside the
// drawers to the apply slot.
const PIPE = [[1650, -44], [618, -44], [618, 214]];
function drawPipe(t) {
  const e = emphasis(t, 'back');
  paint(box(618, -50, 1032, 12, Z0 + 4, 7, 5), {e, tone: 'lo'});
  paint(box(612, -50, 12, 270, Z0 + 4, 7, 5), {e, tone: 'lo'});
  for (let x = 700; x < 1650; x += 120) paint(box(x, -53, 6, 18, Z0, 13, 1), {e, tone: 'faint'});
}

// ---- gantry heads: Claude Code (green) and Codex (amber). Keys: [time, rail x, arm y, tip z, on]
const HEADS = {
  cc: {col: GREEN, name: 'CLAUDE CODE', keys: []},
  cx: {col: AMBER, name: 'CODEX', keys: []},
  cc2: {col: GREEN, name: 'CLAUDE CODE', keys: []},
};
function headKeys() {
  const K = (h, id, u, x, y, z, on = 1) => HEADS[h].keys.push([at(id, u), x, y, z, on]);
  const park = (h, id, u, x) => K(h, id, u, x, -20, 140, 1);
  // Claude Code
  park('cc', 'open', 0, -10); K('cc', 'open', 4, 400, 60, 150); K('cc', 'open', 8, 60, 90, 140);
  // f1: three sessions read the kernel
  for (let s = 0; s < 3; s++) { K('cc', 'f1', .8 + s * 1.9, 85, 90, 120); K('cc', 'f1', 1.3 + s * 1.9, 85, 90, 60); K('cc', 'f1', 2.1 + s * 1.9, 85, 90, 120); }
  // f2: to the rack, over the cartridge that lifts
  K('cc', 'f2', .9, 300, 110, 140); K('cc', 'f2', 1.6, 300, 110, 140); K('cc', 'f2', 5.4, 300, 110, 140);
  // f3: build four blocks, snag, save, next session reads pitfalls first and builds all four
  K('cc', 'f3', .4, 470, 212, 70); for (let j = 0; j < 3; j++) { K('cc', 'f3', .7 + j * .45, 466 + j * 36, 212, 52); K('cc', 'f3', .9 + j * .45, 466 + j * 36, 212, 70); }
  K('cc', 'f3', 2.3, 540, 212, 62); K('cc', 'f3', 3.4, 540, 212, 80);
  K('cc', 'f3', 4.6, 556, 150, 110); K('cc', 'f3', 5.1, 556, 165, 100);
  for (let j = 0; j < 4; j++) { K('cc', 'f3', 5.6 + j * .35, 466 + j * 36, 212, 52); K('cc', 'f3', 5.75 + j * .35, 466 + j * 36, 212, 70); }
  // f4: read the kernel and the drawers, beside Codex
  K('cc', 'f4', 1, 70, 70, 80); K('cc', 'f4', 2.5, 70, 70, 80); K('cc', 'f4', 3.4, 500, 100, 170); K('cc', 'f4', 5.5, 500, 100, 170);
  // p1: drop facts in the tray, then wait while you decide
  K('cc', 'p1', .6, 700, 80, 90); for (let j = 0; j < 3; j++) { K('cc', 'p1', 1 + j * .55, 692 + (j % 2) * 12, 74 + j * 8, 72); K('cc', 'p1', 1.25 + j * .55, 692, 80, 92); }
  K('cc', 'p1', 3.2, 640, 40, 150); K('cc', 'p1', 7.6, 640, 40, 150);
  // p2: after Go, run the line
  K('cc', 'p2', 1.2, 1006, 118, 120); K('cc', 'p2', 6.5, 1006, 118, 120);
  // c1: executor at the press
  K('cc', 'c1', .6, 1006, 118, 120); K('cc', 'c1', 8, 1006, 118, 120);
  // c3: build the three candidates
  for (let j = 0; j < 3; j++) { K('cc', 'c3', .5 + j * .7, 1226 + j * 58, 140, 90); K('cc', 'c3', .85 + j * .7, 1226 + j * 58, 140, 70); }
  K('cc', 'c3', 3, 1200, 40, 150); K('cc', 'c3', 6.5, 1200, 40, 150);
  // g1: write the PR, then fix confirmed findings
  K('cc', 'g1', .4, 1430, 140, 70); K('cc', 'g1', 1.6, 1430, 140, 70); K('cc', 'g1', 2.3, 1400, 30, 150);
  K('cc', 'g1', 5.3, 1505, 140, 80); K('cc', 'g1', 6.3, 1505, 140, 80); K('cc', 'g1', 6.9, 1400, 30, 150); K('cc', 'g1', 10.5, 1400, 30, 150);
  park('cc', 'i1', 1, 1300); park('cc', 'x0', 2, 820);
  // x1: Claude Code's PR first, then Claude Code reviews Codex's
  K('cc', 'x1', .4, 1430, 140, 70); K('cc', 'x1', 1.2, 1430, 140, 70); K('cc', 'x1', 1.8, 1400, 30, 150);
  K('cc', 'x1', 4.2, 1500, 100, 150); K('cc', 'x1', 4.6, 1500, 140, 120); K('cc', 'x1', 6.4, 1500, 140, 120); K('cc', 'x1', 7.2, 1400, 30, 150);
  // x2: session A over the desk
  K('cc', 'x2', .5, 820, 110, 130); K('cc', 'x2', 4.2, 820, 110, 130); K('cc', 'x2', 5.4, 1006, 118, 120);
  park('cc', 'x3', .6, 160); park('cc', 'close', .5, 700); K('cc', 'close', 3.5, 1006, 118, 120); K('cc', 'close', 6.5, 1430, 140, 90);
  // Codex: arrives in f4, reviews at the gate, writes in x1, sits by the rack in x3
  K('cx', 'open', 0, -60, -20, 140, 0); K('cx', 'f4', 0, -60, -20, 140, 0); K('cx', 'f4', 1.2, 30, 70, 140, 1); K('cx', 'f4', 2.2, 30, 70, 80);
  K('cx', 'f4', 3, 30, 70, 80); K('cx', 'f4', 3.8, 300, 100, 140); K('cx', 'f4', 5.5, 300, 100, 140);
  K('cx', 'p1', .5, 200, -20, 140); K('cx', 'g1', 0, 1660, -20, 140); K('cx', 'x1', 2.6, 1600, -20, 140);
  K('cx', 'x1', 3.2, 1430, 140, 70); K('cx', 'x1', 4, 1430, 140, 70); K('cx', 'x1', 4.4, 1620, 30, 150);
  K('cx', 'x3', .3, 300, 60, 140); K('cx', 'x3', 5, 300, 60, 140); K('cx', 'close', 1, 1660, -20, 140);
  // A second Claude Code session for /coordinate
  K('cc2', 'open', 0, 1700, -20, 140, 0); K('cc2', 'x1', 7, 1700, -20, 140, 0); K('cc2', 'x2', .2, 1300, -20, 140, 1); K('cc2', 'x2', 1, 1006, 118, 130);
  K('cc2', 'x2', 4.2, 1006, 118, 130); K('cc2', 'x2', 5.4, 1500, 140, 120); K('cc2', 'x3', .8, 1700, -20, 140, 0);
  for (const h of Object.values(HEADS)) h.keys.sort((a, b) => a[0] - b[0]);
}
function headAt(h, t) {
  const ks = HEADS[h].keys; if (!ks.length) return null;
  if (t <= ks[0][0]) return ks[0].slice(1);
  for (let j = 1; j < ks.length; j++) if (t < ks[j][0]) { const a = ks[j - 1], b = ks[j], u = b[0] > a[0] ? eio((t - a[0]) / (b[0] - a[0])) : 1; return a.slice(1).map((v, i) => lerp(v, b[i + 1], u)); }
  return ks[ks.length - 1].slice(1);
}
function drawCarriage(h, t) {
  const s = headAt(h, t); if (!s || s[4] < .01) return;
  const [x, , , on] = s, e = emphasis(t, h), c = HEADS[h].col;
  paint(dyn(x - 16, -74, 32, 22, 166, 22, 3, .6), {e, tone: 'hi', acc: c, g: .55, alpha: on});
}
function drawArm(h, t) {
  const s = headAt(h, t); if (!s || s[4] < .01) return;
  const [x, y, z, on] = s, e = emphasis(t, h), c = HEADS[h].col;
  paint(dyn(x - 5, -56, 10, y + 56 + 5, 176, 6, 2), {e, tone: 'mid', alpha: on});
  faceText(HEADS[h].name, [x - 3, -48, 182], {size: 5.2, a: .55, e, col: c});
  paint(dcyl(x, y, 3.2, z + 6, 176 - z - 6, 14), {e, tone: 'mid', alpha: on});
  paint(dcyl(x, y, 6, z, 6, 18), {e, tone: 'hi', acc: c, g: 1, alpha: on});
  spark([x, y, z - 1], 26 * on, c, .55 * on * (.4 + .6 * e));
}

// ---- stations
// Kernel: CLAUDE.md and AGENTS.md as two engraved plates on a plinth.
function drawKernel(t) {
  const e = emphasis(t, 'kernel'), u = local('f1', t);
  let read = 0; for (let s = 0; s < 3; s++) read = Math.max(read, sm((u - 1.2 - s * 1.9) / .25) * (1 - sm((u - 1.9 - s * 1.9) / .3)));
  const u4 = local('f4', t); read = Math.max(read, sm((u4 - 1.2) / .3) * (1 - sm((u4 - 3.2) / .4)));
  paint(box(0, 20, 170, 150, Z0, 22, 6, 1.4, 6), {e, tone: 'mid'});
  for (const [x, y] of k.corners({x: 0, y: 20, w: 170, d: 150}, 7)) dot([x, y, Z0 + 22], 1.4, CREAM, .4 * e);
  paint(box(12, 32, 146, 74, Z0 + 22, 4, 3, .8), {e, tone: 'hi', acc: GREEN, g: read * .9});
  paint(box(12, 114, 146, 44, Z0 + 22, 4, 3, .8), {e, tone: 'hi', acc: AMBER, g: sm((u4 - 2) / .3) * (1 - sm((u4 - 3.4) / .4)) * .9});
  faceText('CLAUDE.md', [20, 42, Z0 + 26], {size: 8, a: .75, e});
  faceText('AGENTS.md', [20, 124, Z0 + 26], {size: 8, a: .75, e});
  for (let r = 0; r < 6; r++) line(k.lineOnTop([20, 54 + r * 8], [20 + 60 + ((r * 37) % 60), 54 + r * 8], Z0 + 26, P), {e, tone: 'lo'});
  for (let r = 0; r < 3; r++) line(k.lineOnTop([20, 134 + r * 8], [20 + 50 + ((r * 41) % 70), 134 + r * 8], Z0 + 26, P), {e, tone: 'lo'});
  if (read > 0) { const sy = 50 + ((u * 60) % 54); line(k.lineOnTop([14, sy], [156, sy], Z0 + 26.2, P), {e, col: GREEN, a: read * .9, w: 1.6, g: read * .6}); }
}
// Skill rack: front row .claude/skills, back row .agents/skills (Codex versions); two back slots
// hold a small registration tag instead (skills registered as Claude only).
const RACK_N = 11, RACK_X = i => 230 + i * 14.5, CLAUDE_ONLY = [3, 8];
function drawRack(t) {
  const e = emphasis(t, 'rack'), u = local('f2', t), lift = sm((u - 1.5) / .8) * (1 - sm((u - 5) / .7)), unf = sm((u - 2.2) / .7) * (1 - sm((u - 4.7) / .5));
  const ux = local('x3', t), drift = sm((ux - 1.4) / .4), flag = sm((ux - 2.4) / .4);
  const twin = Math.max(sm((local('f4', t) - 3.6) / .5) * (1 - sm((local('f4', t) - 6.4) / .5)), sm(ux / .5) * (1 - sm((ux - 5) / .5)));
  paint(box(220, 28, 172, 146, Z0, 10, 4, 1, 4), {e, tone: 'mid'});
  paint(box(220, 28, 172, 8, Z0 + 10, 44, 2, .6), {e, tone: 'mid'});
  faceText('.agents/skills', [226, 40, Z0 + 10], {size: 5.5, a: .55, e, col: twin ? AMBER : CREAM});
  faceText('.claude/skills', [226, 170, Z0 + 10.2], {size: 5.5, a: .55, e});
  for (let i = 0; i < RACK_N; i++) {
    const x = RACK_X(i);
    if (CLAUDE_ONLY.includes(i)) paint(box(x, 52, 9, 16, Z0 + 10, 6, 1), {e, tone: 'lo'});
    else {
      const dr = i === 6 ? drift : 0;
      paint(box(x, 46, 9, 50, Z0 + 10, 40, 1.2), {e, tone: 'mid', acc: AMBER, g: twin * .5 + dr * .8});
      if (i === 6 && flag) spark([x + 4.5, 70, Z0 + 56], 30, AMBER, .7 * flag);
    }
  }
  for (let i = 0; i < RACK_N; i++) {
    const x = RACK_X(i), up = i === 5 ? lift * 70 : 0;
    paint(i === 5 ? dyn(x, 104, 9, 56, Z0 + 10 + up, 46, 1.2) : box(x, 104, 9, 56, Z0 + 10, 46, 1.2), {e, tone: i === 5 ? 'hi' : 'mid', acc: GREEN, g: i === 5 ? lift : 0});
    line(k.lineOnTop([x + 4.5, 110], [x + 4.5, 110 + 14 + (i * 7) % 24], Z0 + 56 + up, P), {e, tone: 'lo'});
    if (i === 5 && unf > 0) {
      // The playbook unfolds: a sheet of rule lines rises out of the lifted cartridge.
      const hgt = 70 * unf;
      paint(dyn(x - 40, 120, 90, 2, Z0 + 56 + up, hgt, .5), {e, tone: 'hi', acc: GREEN, g: .5});
      for (let r = 0; r < 8; r++) { const z = Z0 + 56 + up + hgt - 8 - r * 8; if (z > Z0 + 58 + up) line(k.segment([x - 34, 122, z], [x - 34 + 30 + ((r * 29) % 48), 122, z], P), {e, tone: 'mid'}); }
    }
  }
}
// Reference drawers: six files in a cabinet; pitfalls is the middle right drawer.
const DRAWERS = ['architecture', 'commands', 'deployment', 'pitfalls', 'secrets', 'tech-stack'];
function drawerOpen(t) {
  const u = local('f3', t), u4 = local('f4', t), ui = local('i1', t);
  return Math.max(sm((u - 3.1) / .4) * (1 - sm((u - 3.9) / .4)), sm((u - 4.6) / .4) * (1 - sm((u - 5.4) / .4)), sm((u4 - 3.8) / .4) * (1 - sm((u4 - 5.6) / .4)), sm((ui - 7.4) / .4) * (1 - sm((ui - 8.6) / .4)));
}
function drawDrawers(t) {
  const e = emphasis(t, 'drawers'), u = local('f3', t), open = drawerOpen(t) * 46;
  paint(box(440, 30, 160, 120, Z0, 124, 3, 1, 4), {e, tone: 'mid'});
  line(k.sideSeam({x: 440, y: 30, w: 160, d: 120, r: 3}, Z0 + 120, P, 4), {e, tone: 'faint'});
  faceText('.claude/reference', [446, 40, Z0 + 124], {size: 6.5, a: .6, e});
  for (let j = 0; j < 6; j++) {
    const c = j % 2, r = 2 - Math.floor(j / 2), x = 446 + c * 78, z = Z0 + 6 + r * 39, pit = j === 3, o = pit ? open : 0;
    if (o > .5) { paint(dyn(x + 3, 150, 66, o, z + 3, 28, 1), {e, tone: 'mid'}); }
    const g = pit ? Math.max(sm((u - 2.6) / .3) * (1 - sm((u - 6.6) / .5)), drawerOpen(t)) : 0;
    paint(pit ? dyn(x, 150 + o, 72, 5, z, 35, 1, .5) : box(x, 150, 72, 5, z, 35, 1, .5), {e, tone: pit ? 'hi' : 'mid', acc: GREEN, g: g * .8});
    paint(pit ? dyn(x + 24, 155 + o, 24, 3, z + 22, 4, 1) : box(x + 24, 155, 24, 3, z + 22, 4, 1), {e, tone: 'lo'});
    faceText(DRAWERS[j] + '.md', [x + 6, 155 + o, z + 13], {size: 5.4, face: 'front', a: pit ? .8 : .5, e});
  }
  // Work blocks on the bench in front: the first session snags on the third, the second clears it.
  const s1 = u < 5.4, n = s1 ? 3 : 4;
  for (let j = 0; j < 4; j++) {
    const tb = s1 ? .8 + j * .45 : 5.75 + j * .35; if (u < tb || (s1 && j > 2) || u > B.f3.dur + .5) continue;
    const snag = s1 && j === 2, g = snag ? sm((u - 2.2) / .2) : 0;
    const fade = s1 ? 1 - sm((u - 4.4) / .5) : sm((u - tb) / .2);
    paint(dyn(454 + j * 36, 200, 26, 26, Z0, 16, 2), {e, tone: 'hi', acc: snag ? AMBER : GREEN, g: snag ? g : (s1 ? .15 : .5), alpha: Math.max(0, fade)});
  }
  void n;
  // The lesson card: printed after the snag, filed into pitfalls.md.
  const c0 = 2.6, c1 = 3.5;
  if (u > c0 && u < 4.2) {
    const f = eio((u - c0) / (c1 - c0)), x = lerp(530, 600 - 70, f), y = lerp(212, 175 + open, f), z = lerp(Z0 + 40, Z0 + 6 + 39 + 30, f) + Math.sin(Math.PI * f) * 30;
    paint(dyn(x, y, 22, 14, z - (u > c1 ? (u - c1) * 40 : 0), 1.5, 1), {e, tone: 'hi', acc: GREEN, g: .8});
  }
}
// Planning desk: facts drop into the tray; open choices rise as switches; you flip each; Go.
const SW = [0, 1, 2, 3].map(j => 744 + j * 20);
function drawPlan(t) {
  const e = emphasis(t, 'plan'), u = local('p1', t), up = local('p2', t);
  paint(box(660, 40, 184, 124, Z0, 36, 4, 1.2, 4), {e, tone: 'mid'});
  paint(box(670, 50, 164, 104, Z0 + 36, 3, 3, .6), {e, tone: 'hi'});
  paint(box(678, 62, 40, 40, Z0 + 39, 1, 2), {e, tone: 'lo', flat: true});
  faceText('FACTS', [680, 108, Z0 + 39], {size: 5, a: .5, e});
  for (let j = 0; j < 3; j++) { const tj = 1.15 + j * .55; if (u > tj || up > 0) paint(dcyl(688 + (j % 2) * 14, 72 + j * 9, 5, Z0 + 40 + Math.max(0, 14 * (1 - sm((u - tj) / .25))) * (up > 0 ? 0 : 1), 3, 14), {e, tone: 'hi', acc: GREEN, g: .5}); }
  faceText('YOUR CALL', [740, 108, Z0 + 39], {size: 5, a: .5, e});
  for (let j = 0; j < 4; j++) {
    const x = SW[j], rise = up > 0 ? 1 : sm((u - 2.6 - j * .15) / .4), flip = up > 0 ? 1 : sm((u - 4.4 - j * .32) / .25);
    if (rise <= 0) continue;
    paint(dcyl(x, 128, 6, Z0 + 39, 3 * rise, 16), {e, tone: 'hi', acc: flip > .5 ? GREEN : AMBER, g: .7});
    const [bx, by] = iso([x, 128, Z0 + 42 * rise]), [tx, ty] = iso([x + lerp(-6, 6, flip), 128, Z0 + 42 + 14 * rise]);
    ctx.lineWidth = 2.4 / ZOOM; ctx.strokeStyle = css(flip > .5 ? GREEN : AMBER, .9 * (.35 + .65 * e)); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    dot([x + lerp(-6, 6, flip), 128, Z0 + 42 + 14 * rise], 3, CREAM, .8 * e);
  }
  // Go lever
  const go = up > 0 ? sm(up / .6) : 0;
  paint(box(822, 112, 12, 26, Z0 + 39, 4, 2), {e, tone: 'mid'});
  const [bx, by] = iso([828, 125, Z0 + 43]), [tx, ty] = iso([828 + lerp(-10, 12, go), 125, Z0 + 43 + 30]);
  ctx.lineWidth = 3 / ZOOM; ctx.strokeStyle = css(go > .5 ? GREEN : CREAM, (.5 + .5 * go) * (.35 + .65 * e)); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
  dot([828 + lerp(-10, 12, go), 125, Z0 + 73], 4.5, go > .5 ? GREEN : CREAM, .9 * e);
  faceText('GO', [820, 146, Z0 + 39], {size: 6, a: .6, e});
}
// Long-horizon line: Manager with the state file, Executor press, Auditor with a dial; steps wait on
// a dependency rack in front and run through the line once their dependencies pass.
const STEPS = [[0, []], [1, [0]], [2, [0]], [3, [1, 2]], [4, [2]], [5, [3, 4]]];
const STEP_POS = [[900, 196], [940, 180], [940, 214], [980, 196], [1000, 222], [1030, 200]];
function stepRun(i) { const r = [0, 1, 1, 2, 2, 3][i], lane = [0, 0, 1, 0, 1, 0][i]; return {t0: at('p2', 1.4 + r * 1.2), lane}; }
function drawLine(t) {
  const e = emphasis(t, 'line'), uc = local('c1', t);
  paint(box(884, 24, 58, 58, Z0, 40, 3, 1), {e, tone: 'mid'});
  paint(cyl(913, 53, 19, Z0 + 40, 16, 32), {e, tone: 'hi', acc: GREEN, g: sm((uc - .4) / .3) * (1 - sm((uc - 1.6) / .3)) * .8});
  for (let r = 1; r < 4; r++) line(k.sideArc(913, 53, 19, Z0 + 40 + r * 4, P, 20), {e, tone: 'faint'});
  faceText('MANAGER', [888, 84, Z0 + 32], {size: 5, face: 'front', a: .5, e});
  faceText('state.md', [900, 46, Z0 + 56], {size: 4.6, a: .55, e});
  // Belt with moving cleats
  paint(box(880, 98, 286, 44, Z0, 14, 6, .8), {e, tone: 'mid'});
  for (let j = 0; j < 14; j++) { const x = 888 + ((j * 20 + (t * 22) % 20)); if (x < 1160) line(k.lineOnTop([x, 102], [x, 138], Z0 + 14, P), {e, tone: 'faint'}); }
  // Auditor pedestal and dial (behind the belt)
  paint(box(1086, 24, 64, 58, Z0, 30, 3, 1), {e, tone: 'mid'});
  faceText('AUDITOR', [1090, 84, Z0 + 22], {size: 5, face: 'front', a: .5, e});
  paint(cyl(1118, 52, 23, Z0 + 30, 7, 48), {e, tone: 'hi'});
  const tk = k.radialTicks(1118, 52, 21, 30, 5, Z0 + 37, [2, 4], P, -2.2, 4.4); line(tk.minor, {e, tone: 'lo'}); line(tk.major, {e, tone: 'mid'});
  const needle = auditNeedle(t), na = -2.2 + 4.4 * needle;
  line(k.lineOnTop([1118, 52], [1118 + Math.sin(na) * 18, 52 - Math.cos(na) * 18], Z0 + 37.4, P), {e, col: needle > .7 ? GREEN : needle > .05 ? AMBER : CREAM, a: .95, w: 1.6});
  // The sealed brief: written by the Manager and slid to the Auditor before the Executor starts.
  const fb = sm((uc - 1.1) / 1.1);
  if (uc > .9 && uc < 8.5) paint(dyn(lerp(906, 1104, fb), lerp(86, 86, fb), 18, 12, Z0 + lerp(56, 30, fb) + Math.sin(Math.PI * fb) * 26, 2, 1), {e, tone: 'hi', acc: AMBER, g: .9});
  // Executor press over the belt
  for (const y of [92, 148]) paint(cyl(1006, y, 4.5, Z0 + 14, 82, 16), {e, tone: 'mid'});
  paint(box(1000, 88, 12, 64, Z0 + 96, 9, 2, .5), {e, tone: 'mid'});
  faceText('EXECUTOR', [990, 150, Z0 + 108], {size: 5, face: 'front', a: .5, e});
  // Steps
  const up = local('p2', t);
  for (const [i, deps] of STEPS) {
    const [px, py] = STEP_POS[i], r = stepRun(i), u = t - r.t0, ready = up > 0 && deps.every(d => t > stepRun(d).t0 + 1);
    if (up < 0 || t > at('c1', 0)) { if (t < at('c1', 0)) paint(dyn(px - 9, py - 9, 18, 18, Z0, 12, 2), {e, tone: 'mid'}); continue; }
    if (u < 0) { paint(dyn(px - 9, py - 9, 18, 18, Z0, 12, 2), {e, tone: ready ? 'hi' : 'mid', acc: GREEN, g: ready ? .5 : 0}); continue; }
    const f = clamp(u / 1.1), x = lerp(px, 900 + f * 250, eio(f)), y = lerp(py, 112 + r.lane * 16, sm(u / .3));
    paint(dyn(x - 9, y - 9, 18, 18, Z0 + 14 * sm(u / .3), 12, 2), {e, tone: 'hi', acc: GREEN, g: f >= 1 ? .9 : .4});
  }
  for (const [i, deps] of STEPS) for (const d of deps) {
    const [ax, ay] = STEP_POS[d], [bx, by] = STEP_POS[i], done = up > 0 && t > stepRun(d).t0 + 1;
    if (t < at('c1', 0)) line(k.lineOnTop([ax, ay], [bx, by], Z0 + .5, P), {e, col: done ? GREEN : CREAM, a: done ? .7 : .25});
  }
  // c1: one step through the line twice. The Executor says DONE; the Auditor fails it; it goes back;
  // the second pass verifies.
  if (uc > 0 && uc < B.c1.dur) {
    const pass = uc < 5.2 ? 0 : 1, u0 = pass ? uc - 5.2 : uc - 2.2;
    let x = 900, z = Z0 + 14, acc = GREEN, g = .4;
    if (pass === 0 && uc > 2.2) { x = lerp(900, 1006, eio(clamp(u0 / .7))); if (u0 > 1) x = lerp(1006, 1110, eio(clamp((u0 - 1) / .7))); if (u0 > 2.2) x = lerp(1110, 900, eio(clamp((u0 - 2.2) / .8))); if (u0 > 1.7 && u0 < 3) { acc = AMBER; g = .9; } }
    if (pass === 1) { x = lerp(900, 1006, eio(clamp(u0 / .5))); if (u0 > .7) x = lerp(1006, 1150, eio(clamp((u0 - .7) / .9))); if (u0 > 1.5) g = 1; }
    paint(dyn(x - 10, 110, 20, 20, z, 14, 2), {e, tone: 'hi', acc, g});
    const press = Math.max(sm((u0 - .7) / .15) * (1 - sm((u0 - .95) / .15)), 0);
    paint(dcyl(1006, 120, 9, Z0 + 96 - 30 - press * 22, 30, 18), {e, tone: 'hi', acc: GREEN, g: press});
  } else paint(dcyl(1006, 120, 9, Z0 + 66, 30, 18), {e, tone: 'mid'});
}
function auditNeedle(t) {
  const uc = local('c1', t);
  if (uc < 0 || uc > B.c1.dur) return 0;
  return Math.max(sm((uc - 3.4) / .3) * .45 * (1 - sm((uc - 4.4) / .3)), sm((uc - 6.6) / .4) * .92);
}
// Arena: three turntables; a blind judge lamp sweeps them; B is the base and takes one idea from A and C.
function drawArena(t) {
  const e = emphasis(t, 'arena'), u = local('c3', t);
  paint(box(1196, 30, 178, 172, Z0, 8, 6, 1, 6), {e, tone: 'mid'});
  const judge = [[3, 3.6, 0], [3.6, 4.2, 1], [4.2, 4.8, 2]], win = sm((u - 5) / .4);
  for (let j = 0; j < 3; j++) {
    const cx = 1226 + j * 58, cy = 140, rot = t * .6 + j;
    paint(cyl(cx, cy, 24, Z0 + 8, 6, 40), {e, tone: 'mid', acc: GREEN, g: j === 1 ? win * .8 : 0});
    const tk = k.radialTicks(cx, cy, 23, 24, 6, Z0 + 14, [1.5, 3], P, rot % 6.283); line(tk.minor, {e, tone: 'faint'});
    const built = sm((u - .7 - j * .7) / .3) + (u > 5 ? 0 : 0);
    if (built > 0 || u > B.c3.dur) {
      const hts = [[12, 10], [16, 8, 10], [8, 14]][j]; let z = Z0 + 14;
      hts.forEach((h, q) => { paint(dyn(cx - 8 + q * 2, cy - 8, 14 - q * 2, 14, z, h * built, 1.5), {e, tone: 'hi', acc: GREEN, g: j === 1 ? win * .7 : .15}); z += h * built; });
      // Grafted ideas fly from A and C onto B.
      if (j !== 1 && u > 5.4) {
        const f = eio(clamp((u - 5.4 - (j ? .3 : 0)) / .8)), bx = 1284, sx = cx, x = lerp(sx, bx, f), zz = lerp(z, Z0 + 14 + 34 + (j ? 6 : 0), f) + Math.sin(Math.PI * f) * 30;
        paint(dyn(x - 4, cy - 4, 8, 8, zz, 5, 1), {e, tone: 'hi', acc: GREEN, g: .9});
      }
    }
    paint(box(cx - 12, 172, 24, 12, Z0 + 8, 2, 1), {e, tone: 'lo'});
    faceText('ABC'[j], [cx - 3, 178, Z0 + 10], {size: 7, a: .7, e});
    // The blind: a cover slides over each name plate while judging.
    const cover = sm((u - 2.6) / .3) * (1 - sm((u - 4.9) / .3));
    if (cover > 0) paint(dyn(cx - 13, 171, 26 * cover, 14, Z0 + 10, 2, 1), {e, tone: 'mid'});
  }
  // Judge lamp on a post at the back
  paint(cyl(1286, 46, 6, Z0 + 8, 92, 18), {e, tone: 'mid'});
  let jx = 1284, bright = 0; for (const [a, b, j] of judge) if (u >= a && u < b) { jx = 1226 + j * 58; bright = sm((u - a) / .15) * (1 - sm((u - b + .1) / .15)); }
  if (u >= 4.8) { jx = 1284; bright = win; }
  paint(dyn(1282, 46, 8, 70, Z0 + 96, 6, 2), {e, tone: 'mid'});
  if (bright > 0 && e > .5) {
    const a1 = iso([1286, 110, Z0 + 92]), b1 = iso([jx - 22, 140, Z0 + 14]), b2 = iso([jx + 22, 140, Z0 + 14]);
    ctx.fillStyle = css(CREAM, .07 * bright); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
  }
  paint(dcyl(1286, 112, 10, Z0 + 92, 10, 20), {e, tone: 'hi', acc: CREAM, g: bright * .6});
}
// Review gate: a PR card rides the track under an arch of reviewer lenses; you turn the /merge key;
// findings are checked, the confirmed ones fixed, the whole card scanned again, CI lights, and the card
// merges at the commit that was reviewed.
function gateScript(t) {
  // returns {key, card: [{x, col, findings: [{state}], scan, lensCol}], ci}
  const ug = local('g1', t), ux = local('x1', t), ur = local('res', t);
  const o = {key: 0, cards: [], ci: [0, 0], lens: AMBER, scan: 0};
  if (ug >= 0 && ug < B.g1.dur + .5) {
    o.key = sm((ug - .2) / .4);
    const x = ug < 2 ? lerp(1404, 1440, sm(ug / 1.2)) : ug < 2.6 ? lerp(1440, 1500, eio((ug - 2) / .6)) : ug < 7.8 ? 1500 : lerp(1500, 1676, eio((ug - 8.6) / .8));
    o.scan = Math.max(sm((ug - 2.6) / .3) * (1 - sm((ug - 3.8) / .3)), sm((ug - 6.4) / .3) * (1 - sm((ug - 7.6) / .3)));
    const fs = [0, 1, 2].map(j => ({show: sm((ug - 3 - j * .2) / .2), drop: j === 1 ? sm((ug - 4.3) / .4) : 0, fixed: j !== 1 ? sm((ug - 5.6 - j * .2) / .3) : 0}));
    o.cards.push({x, col: GREEN, fs, merged: ug > 9.4, stack: 0});
    o.ci = [sm((ug - 7.9) / .3), sm((ug - 8.1) / .3)];
  }
  if (ux >= 0 && ux < B.x1.dur + .3) {
    const x1 = ux < .4 ? 1404 : ux < 1.6 ? lerp(1404, 1500, eio((ux - .4) / 1.2)) : ux < 2.7 ? 1500 : lerp(1500, 1676, eio((ux - 2.7) / .7));
    o.cards.push({x: x1, col: GREEN, fs: [], merged: ux > 3.3, stack: 1});
    o.scan = Math.max(sm((ux - 1.6) / .2) * (1 - sm((ux - 2.5) / .2)), sm((ux - 4.7) / .2) * (1 - sm((ux - 6.2) / .2)));
    o.lens = ux < 3.6 ? AMBER : GREEN;
    if (ux > 3.2) { const x2 = ux < 4.2 ? lerp(1404, 1500, eio((ux - 3.2) / 1)) : ux < 6.3 ? 1500 : lerp(1500, 1676, eio((ux - 6.3) / .7)); o.cards.push({x: x2, col: AMBER, fs: [], merged: ux > 7, stack: 2}); }
    o.ci = [sm((ux - 2.4) / .2) * (1 - sm((ux - 3.4) / .3)) + sm((ux - 6) / .2), sm((ux - 2.5) / .2) * (1 - sm((ux - 3.4) / .3)) + sm((ux - 6.1) / .2)];
  }
  if (ur >= 0) {
    // Results: #211 three rounds 2, 4, 0; #212 three reviewers, 0, CI on two systems; #214 the rule.
    o.lens = AMBER; o.res = ur;
    o.scan = [[.4, 1], [1.3, 1.9], [2.2, 2.8], [4.1, 4.9]].reduce((m, [a, b]) => Math.max(m, sm((ur - a) / .15) * (1 - sm((ur - b) / .2))), 0);
    o.ci = [sm((ur - 5.1) / .3), sm((ur - 5.3) / .3)];
  }
  return o;
}
function drawGate(t) {
  const e = emphasis(t, 'gate'), s = gateScript(t);
  paint(box(1400, 118, 290, 44, Z0, 6, 4, .6), {e, tone: 'mid'});
  for (let j = 0; j < 14; j++) line(k.lineOnTop([1408 + j * 20, 122], [1408 + j * 20, 158], Z0 + 6, P), {e, tone: 'faint'});
  // CI tower, behind the track
  paint(cyl(1600, 70, 5, Z0, 74, 16), {e, tone: 'mid'});
  for (let j = 0; j < 2; j++) { paint(cyl(1600, 70, 9, Z0 + 74 + j * 16, 12, 20), {e, tone: 'hi', acc: GREEN, g: s.ci[j]}); }
  faceText('CI', [1612, 78, Z0 + 92], {size: 6, face: 'front', a: .55, e});
  // Arch: back post, lintel with lenses, front post drawn after the card
  paint(cyl(1500, 104, 6, Z0, 116, 18), {e, tone: 'mid'});
  paint(box(1494, 96, 12, 88, Z0 + 116, 10, 2, .6), {e, tone: 'mid'});
  faceText('REVIEW', [1496, 186, Z0 + 124], {size: 4.6, face: 'front', a: .5, e});
  for (let j = 0; j < 3; j++) {
    const y = 116 + j * 24; paint(dcyl(1500, y, 7, Z0 + 100, 16, 18), {e, tone: 'hi', acc: s.lens, g: .4 + s.scan * .6});
    if (s.scan > 0 && e > .5) {
      const a1 = iso([1500, y, Z0 + 100]), b1 = iso([1478, y - 8, Z0 + 12]), b2 = iso([1522, y + 8, Z0 + 12]);
      ctx.fillStyle = css(s.lens, .09 * s.scan); ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b1); ctx.lineTo(...b2); ctx.closePath(); ctx.fill();
    }
  }
  // Merged stack at the exit
  const merged = s.cards.filter(c => c.merged).length + (s.res != null ? 0 : 0);
  let stackZ = Z0 + 6; const stackN = Math.max(0, mergedCount(t));
  for (let j = 0; j < stackN; j++) { paint(box(1650, 122, 46, 36, stackZ, 3, 2), {e, tone: 'mid'}); stackZ += 3.6; }
  void merged;
  for (const c of s.cards) {
    if (c.merged) continue;
    paint(dyn(c.x - 23, 122, 46, 36, Z0 + 6, 4, 2, .5), {e, tone: 'hi', acc: c.col, g: .45});
    for (let r = 0; r < 4; r++) line(k.lineOnTop([c.x - 18, 128 + r * 6], [c.x - 18 + 14 + ((r * 13) % 20), 128 + r * 6], Z0 + 10.2, P), {e, tone: 'mid'});
    faceText('a3f9c1e', [c.x - 18, 154, Z0 + 10.2], {size: 4.4, a: .7, e, col: c.col});
    c.fs.forEach((f, j) => {
      if (f.show <= 0) return; const fx = c.x + 4 + j * 6, fy = 132 + j * 7, gone = f.drop;
      const col = f.fixed > .5 ? GREEN : AMBER, a = f.show * (1 - f.fixed) * (1 - gone);
      if (a > .01) { dot([fx, fy, Z0 + 10.4 + (gone ? -gone * 20 : 0)], 3.2, col, a); spark([fx, fy, Z0 + 11], 12, col, .5 * a); }
      if (gone > 0 && gone < 1) dot([fx + gone * 18, fy + gone * 30, Z0 + 10 - gone * 18], 2.6, CREAM, .5 * (1 - gone));
    });
  }
  paint(cyl(1500, 176, 6, Z0, 116, 18), {e, tone: 'mid'});
  // The /merge key switch, with you beside it
  paint(box(1428, 196, 22, 22, Z0, 40, 2, .6), {e, tone: 'mid'});
  paint(cyl(1439, 207, 6, Z0 + 40, 4, 18), {e, tone: 'hi', acc: GREEN, g: s.key * .8});
  const ka = -.8 + s.key * 1.6; line(k.lineOnTop([1439 - Math.cos(ka) * 6, 207 - Math.sin(ka) * 6], [1439 + Math.cos(ka) * 6, 207 + Math.sin(ka) * 6], Z0 + 44.2, P), {e, col: s.key > .5 ? GREEN : CREAM, a: .95, w: 2.2});
  faceText('/merge', [1430, 218, Z0 + 30], {size: 4.6, face: 'front', a: .65, e});
}
function mergedCount(t) {
  let n = 0;
  if (t > at('g1', 9.4)) n++;
  if (t > at('x1', 3.3)) n++;
  if (t > at('x1', 7)) n++;
  return n;
}
// Reader behind the gate: session strips feed a drum; corrections tally in three jars; at three the
// proposal prints and rides the pipe to the apply slot beside the drawers.
function drawBack(t) {
  const e = emphasis(t, 'back'), u = local('i1', t);
  paint(box(1560, -38, 90, 52, Z0, 30, 4, 1), {e, tone: 'mid'});
  paint(dcyl(1605, -12, 16, Z0 + 30, 12, 28), {e, tone: 'hi', acc: GREEN, g: u > 0 && u < 5 ? .6 : 0});
  faceText('/refine weekly', [1566, 16, Z0 + 18], {size: 4.8, face: 'front', a: .6, e});
  for (let j = 0; j < 5; j++) { const f = ((u * .6 + j * .2) % 1); if (u > .3 && u < 4.6) paint(dyn(1660 + 50 * (1 - f), -26, 18, 26, Z0 + 30 + 2, 1.5, 1), {e, tone: 'hi', alpha: Math.sin(Math.PI * f)}); }
  const tallies = [[.9, 1.6, 2.4], [1.3], [2, 3.1]];
  tallies.forEach((ts, j) => {
    const x = 1470 + j * 30; paint(cyl(x, -16, 10, Z0, 6, 20), {e, tone: 'mid'});
    let z = Z0 + 6; ts.forEach(tt => { if (u > tt) { paint(dcyl(x, -16, 8, z, 3, 18), {e, tone: 'hi', acc: AMBER, g: j === 0 && ts.length === 3 && u > 2.4 ? 1 : .4}); z += 3.6; } });
  });
  // Proposal card along the pipe, then the apply slot and you
  paint(box(604, 206, 30, 26, Z0, 20, 2, .6), {e: emphasis(t, 'drawers'), tone: 'mid'});
  faceText('apply', [606, 232, Z0 + 12], {size: 4.8, face: 'front', a: .6, e: emphasis(t, 'drawers')});
  if (u > 2.8 && u < 9.8) {
    const f = clamp((u - 3) / 3.4), seg = 1032 + 258, d = eio(f) * seg;
    let x, y; if (d < 1032) { x = 1650 - d; y = -44; } else { x = 618; y = -44 + (d - 1032); }
    let z = Z0 + 12;
    const applied = sm((u - 6.9) / .3);
    if (u > 7.1) { const g2 = eio(clamp((u - 7.3) / .9)); x = lerp(618, 600 - 70 + 36, g2); y = lerp(214, 175, g2); z = lerp(Z0 + 22, Z0 + 6 + 39 + 30, g2) + Math.sin(Math.PI * g2) * 24 - (u > 8.2 ? (u - 8.2) * 40 : 0); }
    if (u < 8.8) paint(dyn(x - 11, y - 7, 22, 14, z, 1.5, 1), {e: 1, tone: 'hi', acc: applied > .5 ? GREEN : AMBER, g: .9});
  }
}

// ---- dust: seeded motes drifting across the whole stage (screen space)
const DUST = []; { const r = mulberry(29); for (let i = 0; i < 420; i++) DUST.push([r(), r(), r(), r()]); }
function drawDust(t, k0) {
  for (const [a, b, c, d] of DUST) {
    const x = ((a * 2200 + t * (6 + c * 16)) % 2200) - 140, y = b * 1180 - 50 + Math.sin(t * .2 + d * 6.3) * 18;
    const al = (.05 + .16 * d * d) * (.7 + .3 * Math.sin(t * 1.3 + c * 40)) * k0;
    ctx.fillStyle = css(d > .9 ? GREEN : CREAM, al); ctx.fillRect(x, y, 1.6 + c * 1.4, 1.6 + c * 1.4);
  }
}
function drawCorners() {
  ctx.strokeStyle = css(CREAM, .18); ctx.lineWidth = 1;
  for (const [x, y, sx, sy] of [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + sy * 22); ctx.lineTo(x, y); ctx.lineTo(x + sx * 22, y); ctx.stroke(); }
}

// ---- one frame
function assemble(t) { return local('open', t) < 0 ? 1 : 1; }
function frame(t, view) {
  const {w, h, d} = view; DPR = d;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = css(INK); ctx.fillRect(0, 0, w, h);
  const s = view.s, ox = view.ox, oy = view.oy;
  ctx.setTransform(s * d, 0, 0, s * d, ox * d, oy * d);
  drawDust(t, 1);
  const [cx, cy, cz, z, fx, fy] = camera(t), c = iso([cx, cy, cz]); ZOOM = z * s;
  // Assembly in the opening: the machine fades up from the dust over the first seconds.
  const up = sm((t - 3.7) / 1.8);
  ctx.save(); ctx.globalAlpha = 1; ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-c[0], -c[1]);
  ZOOM = z * s;
  GA = up; ctx.globalAlpha = up;
  drawBench(t); drawRailBack(t); for (const h of ['cx', 'cc2', 'cc']) drawCarriage(h, t);
  drawPipe(t);
  drawKernel(t); drawRack(t); drawDrawers(t); drawBack(t); drawPlan(t); drawLine(t); drawArena(t); drawGate(t);
  person([744, 300, 0], {e: emphasis(t, 'plan'), lit: Math.max(sm((local('p1', t) - 4.2) / .3) * (1 - sm((local('p2', t) - 1) / .4)), 0)});
  person([1452, 300, 0], {e: emphasis(t, 'gate'), lit: sm((local('g1', t) - .1) / .3) * (1 - sm((local('g1', t) - 2.4) / .4))});
  person([660, 290, 0], {e: emphasis(t, 'drawers'), lit: sm((local('i1', t) - 6.6) / .3) * (1 - sm((local('i1', t) - 8.2) / .4))});
  for (const h of ['cx', 'cc2', 'cc']) drawArm(h, t);
  ctx.restore();
  GA = 1; ctx.globalAlpha = 1;
  // Scrim under the left column while a beat carries copy there.
  const sb = beatAt(t), copy = id => !!(B[id] && (B[id].q || B[id].n || id === 'res'));
  const prevB = BEATS[BEATS.indexOf(sb) - 1], sc = lerp(prevB && copy(prevB.id) ? 1 : 0, copy(sb.id) ? 1 : 0, sm((t - sb.start) / .8));
  if (sc > 0) { const lg = ctx.createLinearGradient(0, 0, 1100, 0); lg.addColorStop(0, css(INK, .88 * sc)); lg.addColorStop(.62, css(INK, .62 * sc)); lg.addColorStop(1, css(INK, 0)); ctx.fillStyle = lg; ctx.fillRect(0, 0, 1100, H); }
  drawCorners();
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05); vg.addColorStop(0, 'rgba(15,18,16,0)'); vg.addColorStop(1, 'rgba(8,10,9,.75)');
  ctx.fillStyle = vg; ctx.fillRect(-200, -200, W + 400, H + 400);
  void assemble;
}

// ---- captions: one layer per beat, built from the beat table; each child has data-at (seconds into the beat)
function captionHTML() {
  const out = [];
  const words = s => s.split(/(\s+)/).map(w => /\s+/.test(w) ? w : `<span class="w">${w}</span>`).join('');
  for (const b of BEATS) {
    let h = '';
    if (b.q) {
      h += `<div class="pf-copy"><p class="pf-eye" data-at=".2"><b>${b.n}</b> ${b.ch}</p>`;
      h += `<blockquote class="pf-q" data-at=".45" data-words>${words('“' + b.q + '”')}</blockquote>`;
      h += `<p class="pf-who" data-at="1.3">${b.who}</p>`;
      if (b.beyond) h += `<p class="pf-beyond" data-at="${b.ansAt + 1}">Goes beyond the recommendation</p>`;
      if (b.q2) h += `<blockquote class="pf-q pf-q2" data-at="${b.q2At}" data-words>${words('“' + b.q2 + '”')}</blockquote><p class="pf-who" data-at="${b.q2At + .8}">${b.who2}</p>`;
      h += `</div>`;
    } else if (b.a && b.n) h += `<div class="pf-copy"><p class="pf-eye" data-at=".1"><b>${b.n}</b> ${b.ch}</p></div>`;
    if (b.a) h += `<div class="pf-answer"><p class="pf-tag" data-at="${b.ansAt}">${b.tag || 'Harness Firmware'}</p>${b.a.split('|').map((l, j) => `<p class="pf-ans" data-at="${b.ansAt + .15 + j * 1.6}" data-words>${words(l)}</p>`).join('')}</div>`;
    if (b.id === 'open') h += `<div class="pf-stmt pf-open1"><p class="pf-big" data-at=".4" data-until="3.9" data-words>${words('Coding agents forget, grade their own work and get lost in long <em>jobs</em>')}</p></div>
      <div class="pf-stmt"><p class="pf-big pf-big-s" data-at="4.2" data-words>${words('Harness Firmware adds memory, skills and review to your <em>repository</em>')}</p>
      <p class="pf-sub" data-at="5.4">For Claude Code and Codex</p></div>
      <p class="pf-cue" data-at="7.2">What the talks recommend · what Harness Firmware already does</p>`;
    if (b.id === 'x0') h += `<div class="pf-stmt pf-mid"><p class="pf-sub" data-at=".2">No talk recommended these</p><p class="pf-big" data-at=".4" data-words>${words('Beyond what the talks <em>covered</em>')}</p></div>`;
    if (b.id === 'res') h += `<div class="pf-copy pf-res"><p class="pf-eye" data-at=".1">Results</p>
      <div class="pf-row" data-at=".3"><p class="pf-pr">Harness-Firmware #211</p><p class="pf-fig"><span data-at=".5">2 findings</span><span data-at="1.4">then 4</span><span data-at="2.3">then <em>none</em></span></p><p class="pf-note" data-at="2.8">Three Codex review rounds · every finding fixed</p></div>
      <div class="pf-row" data-at="3.6"><p class="pf-pr">Harness-Firmware #212</p><p class="pf-fig"><span data-at="3.8">3 reviewers, no <em>findings</em></span></p><p class="pf-note" data-at="5.2">CI passed on Ubuntu and Windows</p></div>
      <div class="pf-row" data-at="6.2"><p class="pf-pr">Harness-Firmware #214</p><p class="pf-fig pf-fig-s"><span data-at="6.4">Review by the other vendor’s model, the rule for every pull <em>request</em></span></p></div></div>`;
    if (b.id === 'close') h += `<div class="pf-stmt pf-close"><p class="pf-big" data-at=".6" data-words>${words('Better outcomes, every <em>round</em>')}</p>
      <p class="pf-sub" data-at="1.6">Memory, workflows and review for Claude Code and Codex, built into the repository</p>
      <p class="pf-url" data-at="2.2">harnessfirmware.com</p>
      <p class="pf-fine" data-at="2.8">Quotes from AI Engineer and YouTube talks · no speaker reviewed or endorsed Harness Firmware</p></div>`;
    h += `<p class="pf-readout" data-readout></p>`;
    out.push(`<div class="pf-beat" data-beat="${b.id}">${h}</div>`);
  }
  return out.join('');
}
// Live readouts, bottom right: what the station shows at this moment.
function readout(t) {
  const b = beatAt(t), u = t - b.start;
  switch (b.id) {
    case 'f1': return `SESSION ${Math.min(3, 1 + Math.floor(Math.max(0, u - .8) / 1.9))} · CLAUDE.md LOADED`;
    case 'f2': return u > 2 && u < 5 ? 'ONE SKILL · FULL PLAYBOOK LOADED' : 'SKILLS IDLE · NAME AND DESCRIPTION ONLY';
    case 'f3': return u < 2.2 ? 'SESSION 1 · BUILDING' : u < 4.4 ? 'SAVED TO pitfalls.md' : u < 5.5 ? 'NEXT SESSION · READS pitfalls.md' : 'NEXT SESSION · CLEAR';
    case 'f4': return 'SAME KERNEL · SAME REFERENCE · SAME SKILLS';
    case 'p1': return u < 2.6 ? 'FACTS · FOUND BY THE AGENT' : u < 4.4 ? `OPEN CHOICES ${Math.min(4, 1 + Math.floor((u - 2.6) / .15))}` : `DECIDED BY YOU ${Math.min(4, Math.floor((u - 4.4) / .32) + 1)} OF 4`;
    case 'p2': return `ROUND ${Math.min(4, 1 + Math.floor(Math.max(0, u - 1.4) / 1.2))} · READY STEPS RUN TOGETHER`;
    case 'c1': return u < 2.2 ? 'BRIEF SEALED BEFORE THE STEP RUNS' : u < 3.4 ? 'EXECUTOR · DONE' : u < 5.2 ? 'AUDITOR · FAIL · BACK TO THE START' : u < 6.7 ? 'EXECUTOR · DONE' : 'AUDITOR · PASS · VERIFIED';
    case 'c3': return u < 2.8 ? 'THREE ATTEMPTS' : u < 4.9 ? 'JUDGED BLIND' : 'B IS THE BASE · IDEAS FROM A AND C';
    case 'g1': return u < 2.4 ? 'YOU TYPED /merge' : u < 4.2 ? 'CODEX REVIEWERS · FINDINGS 3' : u < 5.4 ? 'EACH FINDING CHECKED · 2 CONFIRMED' : u < 6.4 ? 'FIXED' : u < 7.8 ? 'WHOLE DIFF REVIEWED AGAIN · CLEAN' : u < 9.2 ? 'CI PASSED' : 'MERGED AT a3f9c1e · THE COMMIT REVIEWED';
    case 'i1': return u < 2.8 ? 'READING SESSIONS · REPEATED CORRECTIONS' : u < 6.8 ? 'PROPOSAL · WAITING FOR YOU' : u < 7.4 ? 'APPLIED BY YOU' : 'SAVED · THE NEXT SESSION READS IT';
    case 'x1': return u < 3.4 ? 'AUTHOR CLAUDE CODE · REVIEWER CODEX' : 'AUTHOR CODEX · REVIEWER CLAUDE';
    case 'x2': return u < 4.2 ? 'VERDICTS EXCHANGED · NOT YET AGREED' : 'AGREED · EACH TAKES ITS STEP';
    case 'x3': return u < 2.4 ? 'CI · SKILLS AND CODEX VERSIONS MATCH' : 'CI · ONE VERSION DRIFTED · FLAGGED';
    default: return '';
  }
}
// /coordinate: verdict chips arc between the two sessions until both agree.
function drawCoordinate(t) {
  const u = local('x2', t); if (u < 1 || u > 4.6) return;
  const a = headAt('cc', t), b = headAt('cc2', t); if (!a || !b) return;
  for (let j = 0; j < 4; j++) {
    const t0 = 1.1 + j * .75, f = clamp((u - t0) / .6); if (f <= 0 || f >= 1) continue;
    const [p, q] = j % 2 ? [b, a] : [a, b], x = lerp(p[0], q[0], f), y = lerp(p[1], q[1], f), z = lerp(p[2], q[2], f) + Math.sin(Math.PI * f) * 50;
    spark([x, y, z], 22, j === 3 ? GREEN : AMBER, .9); dot([x, y, z], 3, CREAM, .9);
  }
}

// ---- mount
function mount(root) {
  const stage = root.querySelector('.pf-stage'), canvas = root.querySelector('.pf-canvas'), ov = root.querySelector('.pf-ov');
  const playBtn = root.querySelector('.pf-play'), timeEl = root.querySelector('.pf-time'), range = root.querySelector('.pf-scrub'), ticks = root.querySelector('.pf-ticks');
  ctx = canvas.getContext('2d');
  headKeys();
  ov.innerHTML = captionHTML();
  const layers = [...ov.querySelectorAll('.pf-beat')].map(el => ({el, b: B[el.dataset.beat], items: [...el.querySelectorAll('[data-at]')].map(n => ({n, a: +n.dataset.at, until: n.dataset.until ? +n.dataset.until : null, words: n.hasAttribute('data-words') ? [...n.querySelectorAll('.w')] : null})), ro: el.querySelector('[data-readout]')}));
  for (const b of BEATS) if (b.n || b.id === 'res') { const i = document.createElement('i'); i.style.left = b.start / TOTAL * 100 + '%'; ticks.append(i); }
  const view = {w: 1, h: 1, d: 1, s: 1, ox: 0, oy: 0};
  let t = 0, state = 'idle', raf = 0, last = 0, onScreen = true, scrubbing = false;
  const fmt = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  function paintCaptions(t) {
    const b = beatAt(t);
    for (const L of layers) {
      const u = t - L.b.start, on = t >= L.b.start - .01 && t < L.b.start + L.b.dur;
      if (!on) { if (L.vis) { L.el.style.opacity = 0; L.vis = false; } continue; }
      L.vis = true; const out = 1 - sm((u - (L.b.dur - .5)) / .5); L.el.style.opacity = L.b.id === 'close' ? 1 : out;
      for (const it of L.items) {
        let o = sm((u - it.a) / .5); if (it.until != null) o *= 1 - sm((u - it.until) / .4);
        it.n.style.opacity = o; it.n.style.transform = it.words ? '' : `translateY(${(1 - eo((u - it.a) / .6)) * 10}px)`;
        if (it.words) it.words.forEach((w, j) => { const p = eo((u - it.a - j * .035) / .5); w.style.opacity = p; w.style.transform = `translateY(${(1 - p) * 14}px)`; });
      }
      if (L.ro) L.ro.textContent = readout(t);
    }
    root.dataset.beat = b.id;
  }
  function draw() {
    frame(Math.min(t, TOTAL - .001), view);
    // Extra layers drawn in world space after the frame: the /coordinate chips.
    const [cx, cy, cz, z, fx, fy] = camera(t), c = iso([cx, cy, cz]);
    ctx.setTransform(view.s * view.d, 0, 0, view.s * view.d, view.ox * view.d, view.oy * view.d);
    ctx.save(); ctx.translate(fx, fy); ctx.scale(z, z); ctx.translate(-c[0], -c[1]); drawCoordinate(t); ctx.restore();
    paintCaptions(Math.min(t, TOTAL - .001));
    timeEl.textContent = `${fmt(Math.min(t, TOTAL))} / ${fmt(TOTAL)}`;
    if (!scrubbing) range.value = Math.round(Math.min(t, TOTAL) / TOTAL * 1000);
    range.style.setProperty('--p', range.value / 1000);
  }
  const running = () => state === 'playing' && onScreen && !document.hidden;
  function setState(s) { state = s; root.dataset.state = s; playBtn.textContent = s === 'playing' ? 'Pause' : s === 'ended' ? 'Replay' : 'Play'; }
  function tick(now) {
    raf = 0; const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
    if (running()) { t += dt; if (t >= TOTAL) { t = TOTAL; setState('ended'); } }
    draw();
    if (running()) raf = requestAnimationFrame(tick); else last = 0;
  }
  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };
  function play() { if (t >= TOTAL) t = 0; setState('playing'); wake(); }
  function pause() { setState('paused'); wake(); }
  function seek(x) { t = clamp(x, 0, TOTAL); if (state === 'ended' && t < TOTAL) setState('paused'); draw(); }
  playBtn.addEventListener('click', () => state === 'playing' ? pause() : play());
  range.addEventListener('input', () => seek(range.value / 1000 * TOTAL));
  range.addEventListener('pointerdown', () => { scrubbing = true; });
  addEventListener('pointerup', () => { scrubbing = false; });
  stage.addEventListener('click', () => playBtn.click());
  stage.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); playBtn.click(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(t + 5); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(t - 5); }
  });
  const layout = () => {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w) return;
    const s = Math.min(w / W, h / H), ox = (w - W * s) / 2, oy = (h - H * s) / 2, d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
    Object.assign(view, {w: canvas.width, h: canvas.height, d, s, ox, oy});
    ov.style.left = ox + 'px'; ov.style.top = oy + 'px'; ov.style.transform = `scale(${s})`;
    draw();
  };
  new ResizeObserver(layout).observe(stage);
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (running()) wake(); }, {threshold: 0}).observe(stage);
  document.addEventListener('visibilitychange', () => { if (running()) { last = 0; wake(); } });
  const q = new URLSearchParams(location.search);
  setState('idle');
  document.fonts.ready.then(() => {
    layout();
    if (q.has('t')) seek(+q.get('t'));
    else if (!q.has('still') && !matchMedia('(prefers-reduced-motion: reduce)').matches) play();
  });
  window.promoFilm = {seek, frame: x => { seek(x); }, play, pause, TOTAL, BEATS: BEATS.map(({id, start, dur}) => ({id, start, dur})), get t() { return t; }};
}

const root = document.getElementById('promo');
if (root) mount(root);
