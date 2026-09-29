// About page film (#film): seven chapters drawn by one pool of WebGL2 particles on a 1920 x 1080 stage,
// with captions as HTML over the canvas. Every frame is a pure function of the clock t, so the film can
// be scrubbed, paused and replayed; the one piece of state is the phosphor trail buffer, cleared on seek.
//   autoplay   the first time half the stage is on screen, unless prefers-reduced-motion is set; then
//              the last frame shows as a still and the film waits for Play
//   pause      when the stage leaves the screen or the tab is hidden (resumes by itself), or on Pause
//              (resumes only on Play)
//   end        holds the last frame; the button reads Replay
// #film[data-chapter] names the chapter on screen; #film[data-state] is idle, playing, paused or ended.
// Without WebGL2 the film shows a static message that says what the film shows.
// The renderer and the easing helpers live in particle-engine.mjs, shared with the field log.
import {TAU, clamp, lerp, sm, eo, ei, eio, backOut, mulberry, path, rectPt, splitWords, renderer} from './particle-engine.mjs';

const W = 1920, H = 1080;
const CHAPTERS = [['cold', 14], ['flash', 10], ['recall', 11], ['skills', 10], ['audit', 14], ['round', 10], ['resolve', 8]];
const START = {}; let TOTAL = 0; for (const [id, d] of CHAPTERS) { START[id] = TOTAL; TOTAL += d; }
const L = (c, x) => START[c] + x;
// The visible band of the stage: y 50 to 1040 (1920 x 990); above and below it the stage is empty.
const BAND_TOP = 50, BAND_H = 990;
// Motion constants, tuned in the animatic lab (2026-09-28).
const MORPH = 1.4, STAGGER = .45, BOUNCE = .8, ARC = .18, FLIGHT_GLOW = .6, DRIFT = 1, DUST = .22;
const POINT_SIZE = 2.4, EXPOSURE = 1, TRAIL = .88, BLOOM = .8, GRAIN = .05, VIGNETTE = .4;
const LOOK = {POINT_SIZE, EXPOSURE, TRAIL, BLOOM, GRAIN, VIGNETTE, GREEN: [.325, .859, .463], AMBER: [.937, .784, .494], PAPER: [.953, .953, .925], INK: [.059, .071, .063]};

function blockCenters(cx, cy) { const rows = [4, 3, 2, 1], ys = [130, 34, -62, -158], o = []; rows.forEach((c, r) => { for (let j = 0; j < c; j++) o.push({x: cx + (j - (c - 1) / 2) * 188, y: cy + ys[r]}); }); return o; }

// ---- particles: seeded randoms, roles as fixed index ranges, shapes sampled once
const MARK = ['M47 65 123 21v168l-76-30Z', 'M232 21l76 44v103l-76-28Z', 'M47 172l76 30v108l-76-25Z', 'M134 115l174 64v105l-76 26v-84l-98-32Z'];
const ROWY = [898, 924, 950, 976, 1002], ROWEND = [1330, 1190, 1080, 1150, 990];
let N, R1, R2, R3, R4, ROLES, MX, MY, ME, BX, BY, BB, BBR, SX, SY, SK, CC, CL, CU, buf;
function alloc(count) {
  N = count; const r = mulberry(7);
  R1 = new Float32Array(N); R2 = new Float32Array(N); R3 = new Float32Array(N); R4 = new Float32Array(N);
  for (let i = 0; i < N; i++) { R1[i] = r(); R2[i] = r(); R3[i] = r(); R4[i] = r(); }
  let off = 0; ROLES = {};
  for (const [k, f] of [['SPARK', .02], ['BUILD', .25], ['RING', .12], ['SLAB', .16], ['AUX', .13]]) { const n = Math.floor(N * f); ROLES[k] = {start: off, n}; off += n; }
  ROLES.DUST = {start: off, n: N - off};
  sampleMark(off); sampleBlocks(ROLES.BUILD.n); sampleSlab(ROLES.SLAB.n); sampleColumns(ROLES.BUILD.n);
  buf = new Float32Array(N * 6);
}
// The H mark, rasterised at 2x: half the points on its edges (drawn brighter), half inside.
function sampleMark(M) {
  const sc = 2, cw = 720, ch = 660, c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
  x.scale(sc, sc); x.fillStyle = '#fff'; for (const d of MARK) x.fill(new Path2D(d));
  const img = x.getImageData(0, 0, cw, ch).data, ins = (p, q) => p >= 0 && q >= 0 && p < cw && q < ch && img[(q * cw + p) * 4 + 3] > 127;
  const edge = [], fill = []; for (let q = 0; q < ch; q++) for (let p = 0; p < cw; p++) if (ins(p, q)) (!ins(p + 1, q) || !ins(p - 1, q) || !ins(p, q + 1) || !ins(p, q - 1) ? edge : fill).push(p, q);
  const r = mulberry(11); MX = new Float32Array(M); MY = new Float32Array(M); ME = new Uint8Array(M);
  for (let m = 0; m < M; m++) { const e = r() < .5, l = e ? edge : fill, j = Math.floor(r() * l.length / 2) * 2; MX[m] = (l[j] + r()) / sc - 177.5; MY[m] = (l[j + 1] + r()) / sc - 165.5; ME[m] = e ? 1 : 0; }
}
// Ten blocks of a pyramid, each an outline and three code lines, as offsets from its centre.
function sampleBlocks(n) {
  const r = mulberry(21), lens = []; for (let j = 0; j < 30; j++) lens.push(50 + r() * 78);
  BX = new Float32Array(n); BY = new Float32Array(n); BB = new Uint8Array(n); BBR = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const b = Math.min(9, Math.floor(k * 10 / n)); BB[k] = b;
    if (r() < .62) { const [x, y] = rectPt(r(), -85, -38, 85, 38); BX[k] = x; BY[k] = y; BBR[k] = .85; }
    else { const l = Math.floor(r() * 3); BX[k] = -64 + r() * lens[b * 3 + l]; BY[k] = -17 + l * 17; BBR[k] = .45; }
  }
}
// The repository slab: an outline and five rows of words.
function sampleSlab(n) {
  const r = mulberry(41), segs = []; let tot = 0;
  for (let row = 0; row < 5; row++) { let x = 790; while (x < ROWEND[row]) { const w = Math.min(24 + r() * 70, ROWEND[row] - x); segs.push([x, x + w, row]); tot += w; x += w + 12; } }
  SX = new Float32Array(n); SY = new Float32Array(n); SK = new Int8Array(n);
  for (let k = 0; k < n; k++) {
    if (r() < .22) { const [x, y] = rectPt(r(), 380, 870, 1540, 1024); SX[k] = x; SY[k] = y; SK[k] = -1; continue; }
    let u = r() * tot, s = segs[0]; for (const g of segs) { if (u <= g[1] - g[0]) { s = g; break; } u -= g[1] - g[0]; }
    SX[k] = s[0] + u; SY[k] = ROWY[s[2]] + (r() - .5) * 2; SK[k] = s[2];
  }
}
// Token-efficient: three columns of text, one per thing the agent reads or writes. Each has 16
// lines broken into words; COLS lists the lines that survive the cut and how long they stay.
const COLS = [{x: 300, keep: [0, 2, 3, 6, 9], len: .55}, {x: 720, keep: [0, 5, 11], len: .8}, {x: 1140, keep: [0, 2, 4, 7, 10, 13], len: .42, outline: true}];
const COL_Y = 300, COL_W = 340, COL_LH = 20, COL_LEN = [];
function sampleColumns(n) {
  const r = mulberry(51), words = [];
  for (let l = 0; l < 48; l++) { COL_LEN.push(COL_W * (.45 + r() * .55)); const w = []; let u = 0; while (u < 1) { const len = Math.min(.08 + r() * .16, 1 - u); w.push([u, len]); u += len + .045; } words.push(w); }
  CC = new Uint8Array(n); CL = new Uint8Array(n); CU = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const line = Math.min(47, Math.floor(k * 48 / n)), w = words[line], tot = w.reduce((s, x) => s + x[1], 0);
    let u = r() * tot, pos = 0; for (const [a, len] of w) { if (u <= len) { pos = a + u; break; } u -= len; }
    CC[k] = line >> 4; CL[k] = line & 15; CU[k] = pos;
  }
}

// ---- role functions fn(t, i, k, n, P) write position x,y, brightness b, amber mix a, white mix w, size s
const Pd = {x: 0, y: 0, b: 0, a: 0, w: 0, s: 1};
function dust(t, i, P) {
  const r1 = R1[i], r3 = R3[i], r4 = R4[i];
  P.x = ((r1 * 3300 + t * (5 + r3 * 14) * DRIFT) % 3300) - 690;
  P.y = R2[i] * 1700 - 310 + Math.sin(t * .21 + r4 * 6.283) * 22 * DRIFT + Math.sin(t * .05 + r1 * 9) * 26 * DRIFT;
  P.b = DUST * (.25 + .75 * r4 * r4) * (.7 + .3 * Math.sin(t * 1.3 + r3 * 40)) * (1 - .55 * sm((t - START.resolve) / 2));
  P.a = 0; P.w = 0; P.s = .6 + r3 * .6;
}
const dustFn = (t, i, k, n, P) => dust(t, i, P);
const hidden = (t, i, k, n, P) => { P.x = 960; P.y = 540; P.b = 0; };
// Gather out of the dust (arrival: ease-out), or scatter back into it (exit: ease-in, burst outwards).
function fromDust(P, t, t0, d, i) {
  const p = eo((t - t0) / d); if (p >= 1) return; dust(t, i, Pd); const g = Math.sin(Math.PI * p) * FLIGHT_GLOW * .8;
  P.x = lerp(Pd.x, P.x, p); P.y = lerp(Pd.y, P.y, p); P.b = lerp(Pd.b, P.b, p) + g; P.a *= p; P.w *= p; P.s = lerp(Pd.s, P.s, p);
}
function toDust(P, t, t0, d, i, cx, cy, burst) {
  if (t <= t0) return; const q = ei((t - t0) / d), q2 = sm((t - t0) / (d * 1.3)); dust(t, i, Pd);
  const bx = P.x + (P.x - cx) * burst * q, by = P.y + (P.y - cy) * burst * q;
  P.x = lerp(bx, Pd.x, q2); P.y = lerp(by, Pd.y, q2); P.b = lerp(P.b * (1 + (1 - q) * .9), Pd.b, q2); P.a *= 1 - q2; P.w *= 1 - q2;
}
function mixDust(P, t, i, f) { if (f <= 0) return; dust(t, i, Pd); P.x = lerp(P.x, Pd.x, f); P.y = lerp(P.y, Pd.y, f); P.b = lerp(P.b, Pd.b, f); P.a *= 1 - f; P.w *= 1 - f; }
function spark(P, t, i, x, y, b, am) {
  const r3 = R3[i], dir = R4[i] < .5 ? 1 : -1, ang = R1[i] * TAU + t * (1.2 + R2[i] * 2.6) * dir, rad = 2 + Math.pow(r3, 2.4) * 30;
  P.x = x + Math.cos(ang) * rad; P.y = y + Math.sin(ang) * rad * .85; P.b = b * (1.7 - rad / 22); P.a = am; P.w = .45 * (1 - r3); P.s = 1.15;
}
function glitch(P, t, i, g) { P.x += Math.sin(t * 37 + R1[i] * 60) * 5 * g * R2[i]; P.y += Math.cos(t * 29 + R2[i] * 50) * 3 * g; P.b *= 1 + g * .6 * Math.abs(Math.sin(t * 23 + R4[i] * 9)); }
// Secondary motion for built things that hold still: each block sways a pixel on its own phase and a
// faint scan line runs down the stage every 3.2 s. Neither changes a shape or the layout.
function alive(P, t, b) { P.y += Math.sin(t * .9 + b * 1.5) * 1.2; const sy = ((t * .31) % 1) * 1400 - 200; P.b += .22 * Math.exp(-(((P.y - sy) / 26) ** 2)); }
const twinkle = (t, i) => .85 + .15 * Math.sin(t * 2.1 + R1[i] * 40);
function fixBurst(P, t, i, tx) { if (t <= tx) return; const q = eo((t - tx - R3[i] * .15) / .55); P.x += (R1[i] - .5) * 50 * (1 - q); P.y += (R2[i] - .5) * 50 * (1 - q); P.b += .9 * (1 - q); }

// Cold open. Monday: the agent snags on one block, you correct it in the chat, it finishes; the chat
// ends and the correction scatters with it. Thursday: a new session snags on the same block, beside
// the empty dashed outline where the correction was.
let SESS = [], C1 = [], NOTE = {};
const sessionAt = t => { for (const s of SESS) if (t >= s.start && t < s.end) return s; return null; };
function coldBuild(t, i, k, n, P) {
  const s = sessionAt(t); if (!s) { dust(t, i, P); return; }
  const b = BB[k], tb = s.tb[b] + R3[i] * .12; if (t < tb) { dust(t, i, P); return; }
  P.x = C1[b].x + BX[k]; P.y = C1[b].y + BY[k]; P.b = BBR[k]; alive(P, t, b);
  if (b === 5) { const g = clamp((t - s.ts) / .3) * (1 - sm((t - s.tfix) / .3)); P.a = g; glitch(P, t, i, g); fixBurst(P, t, i, s.tfix); }
  fromDust(P, t, tb, .45, i); toDust(P, t, s.td + R3[i] * .25, .7, i, 960, 540, .35);
}
function coldSpark(t, i, k, n, P) {
  const s = sessionAt(t); if (!s) { hidden(t, i, k, n, P); return; }
  const p = s.path(t), b = eo((t - s.start) / .3) * (1 - sm((t - s.td) / .4)), am = sm((t - s.ts) / .3) * (1 - sm((t - s.tfix) / .3));
  spark(P, t, i, p.x + (am ? Math.sin(t * 41) * 4 * am : 0), p.y, b * (1 + am * .3 * Math.sin(t * 30)), am);
}
function coldNote(t, i, k, n, P) {
  const thread = k < n * .22, u0 = (k - n * .22) / (n * .78);
  if (t < NOTE.ghost) {
    if (thread) {
      if (t < NOTE.readA || t > NOTE.readZ + .4) { dust(t, i, P); return; }
      const u = (R1[i] + t * .9) % 1, sp = SESS[0].path(t);
      P.x = lerp(NOTE.x0, sp.x + 30, u); P.y = lerp(NOTE.y, sp.y, u) + (R2[i] - .5) * 4;
      P.b = Math.sin(Math.PI * u) * .7 * sm((t - NOTE.readA) / .3) * (1 - sm((t - NOTE.readZ) / .4)); P.w = .8; return;
    }
    if (t < NOTE.inT + R3[i] * .35) { dust(t, i, P); return; }
    const [x, y] = rectPt(u0, NOTE.x0, NOTE.y - 40, NOTE.x1, NOTE.y + 40); P.x = x; P.y = y; P.b = .3 * twinkle(t, i); P.w = 1;
    fromDust(P, t, NOTE.inT + R3[i] * .35, .6, i); toDust(P, t, NOTE.outT + R3[i] * .3, .8, i, (NOTE.x0 + NOTE.x1) / 2, NOTE.y, .5); return;
  }
  if (thread || (k / n * 40) % 1 < .5 || R4[i] > .5) { dust(t, i, P); return; }
  const [x, y] = rectPt(u0, NOTE.x0, NOTE.y - 40, NOTE.x1, NOTE.y + 40); P.x = x; P.y = y;
  P.b = .22 * (.55 + .45 * Math.sin(t * 9 + R1[i])) * sm((t - NOTE.ghost) / .6); P.w = 1; fromDust(P, t, NOTE.ghost + R3[i] * .3, .6, i);
}

// Flash and resolve: the H mark, flashed by a scan line, or crossed by a slow sheen.
function markFn(cx, cy, sc, o = {}) {
  const top = cy - 150 * sc - 30, bot = cy + 150 * sc + 30;
  return (t, i, k, n, P) => {
    const x = cx + MX[i] * sc, y = cy + MY[i] * sc; P.x = x + Math.sin(t * .7 + R1[i] * 6.3) * 1.1; P.y = y + Math.cos(t * .6 + R2[i] * 6.3) * 1.1;
    let b = ME[i] ? .95 : .42, w = 0;
    if (o.scan) { const [a, z] = o.scan; if (t > a && t < z + .4) { const ys = lerp(top, bot, eio((t - a) / (z - a))), g = Math.exp(-(((y - ys) / 24) ** 2)); b += g * 1.4; w = g * .7; } b += .18 * sm((t - z) / .6); }
    if (o.sheen != null) { const u = ((t - o.sheen) % 5) / 2; if (t > o.sheen && u < 1.2) { const pos = cx + lerp(-420, 420, u / 1.2), d = (x - pos) + (y - cy) * .6, g = Math.exp(-((d / 46) ** 2)); b += g * .9; w = g * .5; } }
    P.b = b; P.w = w; P.a = 0; P.s = 1;
  };
}
let T = {};
function slab(t, i, k, n, P) {
  P.x = SX[k]; P.y = SY[k]; let b = .5 * twinkle(t, i);
  if (SK[k] === 2) { const e = sm((t - T.readA) / .3) * (1 - sm((t - T.readZ) / .5)); b += e * 1.1; P.w = e * .35; }
  P.b = b;
}

// Remembered: the next session reads pitfalls.md first, then builds the whole pyramid.
let TB3 = [], SP3 = null;
function recallBuild(t, i, k, n, P) {
  const b = BB[k], tb = TB3[b] + R3[i] * .12; if (t < tb) { dust(t, i, P); return; }
  P.x = C1[b].x + BX[k]; P.y = C1[b].y + BY[k]; P.b = BBR[k] + .25 * sm((t - TB3[9] - .4) / .6) * Math.exp(-(((t - TB3[9] - .9) / .7) ** 2)); alive(P, t, b);
  fromDust(P, t, tb, .45, i);
}
function recallSpark(t, i, k, n, P) { if (t < T.ign3) { hidden(t, i, k, n, P); return; } const p = SP3(t); spark(P, t, i, p.x, p.y, eo((t - T.ign3) / .35) * (1 + 1.4 * Math.exp(-(((t - (TB3[5] - .15)) / .14) ** 2))), 0); }
function thread(t, i, k, n, P) { const u = (R1[i] + t * .9) % 1; P.x = 720 + (R2[i] - .5) * 6; P.y = lerp(945, 772, u); P.b = Math.sin(Math.PI * u) * .85; P.w = .2; }

// Token-efficient: a reply, a command's output and a large file read fill the context meter; caveman,
// RTK and STK each cut one down in turn and the meter falls.
const level = t => .05 + .7 * sm((t - T.colIn) / 1.4) - .2 * T.cut.reduce((s, tc) => s + sm((t - tc) / .6), 0);
function columns(t, i, k, n, P) {
  const c = CC[k], l = CL[k], col = COLS[c], L = COL_LEN[c * 16 + l], x = col.x + CU[k] * L, y = COL_Y + l * COL_LH, tc = T.cut[c];
  P.x = x; P.y = y; P.b = .5 * twinkle(t, i); P.a = .55;
  if (t > tc - .7 && t < tc + .1) { const sy = lerp(COL_Y - 20, COL_Y + 16 * COL_LH, (t - tc + .7) / .7); P.b += .9 * Math.exp(-(((y - sy) / 14) ** 2)); }
  if (t <= tc) return;
  const ki = col.keep.indexOf(l);
  if (ki >= 0 && CU[k] * L <= col.len * COL_W) {
    const q = eio((t - tc) / .7);
    P.x = lerp(x, x + (col.outline && ki % 2 ? 26 : 0), q); P.y = lerp(y, COL_Y + ki * COL_LH, q);
    P.a = .55 * (1 - q); P.b += .3 * q + .9 * Math.exp(-(((t - tc - .35) / .25) ** 2)); alive(P, t, c);
  } else toDust(P, t, tc + R3[i] * .2, .7, i, col.x + COL_W / 2, COL_Y + 160, .4);
}
function meter(t, i, k, n, P) {
  const lv = level(t), no = Math.floor(n * .35);
  if (k < no) { const [x, y] = rectPt(k / no, 1540, 290, 1580, 760); P.x = x; P.y = y; P.b = .5; }
  else { const f = (k - no) / (n - no); P.x = 1545 + R2[i] * 30; P.y = f < lv ? 756 - f * 462 : 756 - lv * 462; P.b = f < lv ? .8 : 0; }
  P.a = sm((lv - .45) / .3);
}
let SP4 = null;
function skillsSpark(t, i, k, n, P) { if (t < T.task) { hidden(t, i, k, n, P); return; } const p = SP4(t); spark(P, t, i, p.x, p.y, eo((t - T.task) / .3) * (1 - ei((t - T.taskEnd) / .4)), 0); }

// Audited: a DONE stamp slams and cracks; an amber lens sweeps with fresh context and flags two blocks;
// the builder fixes them; a recheck passes; you approve.
let CA = [], FLAG = {}, LENS = null, SP5 = null;
function auditBuild(t, i, k, n, P) {
  const b = BB[k]; P.x = CA[b].x + BX[k]; P.y = CA[b].y + BY[k]; P.b = BBR[k] + .3 * sm((t - T.verified) / .5); alive(P, t, b);
  const fl = FLAG[b];
  if (fl) { const [tf, tx] = fl; if (t > tf && t < tx + .6) { const g = sm((t - tf) / .25) * (1 - sm((t - tx) / .3)); P.a = g; glitch(P, t, i, g); } fixBurst(P, t, i, tx); }
}
function stamp(t, i, k, n, P) {
  const r = k & 1 ? 104 : 90, th = TAU * k / n, s = t < T.slam ? 1.35 : 1 + .35 * (1 - backOut(clamp((t - T.slam) / .28), 1.6));
  let x = Math.cos(th) * r * s, y = Math.sin(th) * r * s, b = t < T.slam ? .3 : .95 + .8 * Math.exp(-(((t - T.slam) / .12) ** 2));
  if (t > T.crack) { const q = (t - T.crack) / 1.1, side = Math.cos(th) * .8 + Math.sin(th) * .6 > 0 ? 1 : -1; x += side * 60 * eo(q); y += -side * 10 * eo(q) + 300 * q * q; b *= 1 - sm(q / .9); }
  P.x = 860 + x; P.y = 520 + y; P.b = b; P.w = .15;
}
function lens(t, i, k, n, P) {
  const p = LENS(t), f = k / n; let x, y;
  if (f < .64) { const th = TAU * f / .64; x = Math.cos(th) * 52; y = Math.sin(th) * 52; } else { const d = 52 + (f - .64) / .36 * 46; x = Math.cos(.785) * d + (R2[i] - .5) * 3; y = Math.sin(.785) * d; }
  P.x = p.x + x; P.y = p.y + y; P.a = 1; P.b = .2; P.w = 0;
}
function connector(t, i, k, n, P) { const u = (R1[i] + t * .45) % 1; P.x = lerp(1240, 1500, u); P.y = 540 + (R2[i] - .5) * 3; P.b = (.35 + .4 * sm((t - T.approve) / .5)) * Math.sin(Math.PI * u); }
function person(t, i, k, n, P) {
  const lit = eo((t - T.approve) / .5), f = k / n;
  if (f < .4) { const th = TAU * f / .4; P.x = 1580 + Math.cos(th) * 30; P.y = 470 + Math.sin(th) * 30; }
  else { const th = Math.PI + Math.PI * (f - .4) / .6; P.x = 1580 + Math.cos(th) * 64; P.y = 590 + Math.sin(th) * 62; }
  P.b = .16 + .3 * lit; P.w = .7 * lit;
}
function auditSpark(t, i, k, n, P) { const p = SP5(t); spark(P, t, i, p.x, p.y, .9, 0); }

// Every round: the five-stage loop, three laps that speed up, each finding dropped into the repository.
let LAPS = [], TG = [];
const SEG = [[1100, 1210, 2], [1170, 1280, 3], [1230, 1340, 2]], RC = {x: 1100, y: 510, r: 260};
function phi(t) {
  if (t < LAPS[0][0]) return 0;
  for (let j = 0; j < 3; j++) { const [a, b] = LAPS[j]; if (t < b) { const u = (t - a) / (b - a); return j + (j === 0 ? 2 * u * u - u * u * u : j === 2 ? u + u * u - u * u * u : u); } }
  return 3;
}
const theta = t => -Math.PI / 2 + TAU * phi(t), lapsDone = t => LAPS.reduce((s, l) => s + sm((t - l[1]) / .5), 0);
const nodePos = j => { const a = (-90 + 72 * j) * Math.PI / 180; return {x: RC.x + Math.cos(a) * RC.r, y: RC.y + Math.sin(a) * RC.r, a}; };
function loopRing(t, i, k, n, P) {
  const Ls = lapsDone(t), th = TAU * k / n - Math.PI / 2, r = RC.r + (R3[i] - .5) * (3 + Ls * 5);
  P.x = RC.x + Math.cos(th) * r; P.y = RC.y + Math.sin(th) * r;
  const behind = ((theta(t) - th) % TAU + TAU) % TAU, tail = t > LAPS[0][0] && t < LAPS[2][1] + .6 ? Math.exp(-behind / .7) : 0;
  P.b = (.3 + .2 * Ls) * twinkle(t, i) + 1.1 * tail; P.w = .25 * tail; mixDust(P, t, i, 1 - sm((.42 + .19 * Ls - R4[i]) / .06));
}
function nodes(t, i, k, n, P) {
  const j = Math.min(4, Math.floor(k * 5 / n)), np = nodePos(j), u = k * 5 / n - j;
  P.x = np.x + Math.cos(u * TAU) * 24; P.y = np.y + Math.sin(u * TAU) * 24;
  let d = Math.abs(((theta(t) - np.a) % TAU + TAU) % TAU); d = Math.min(d, TAU - d);
  const g = t < LAPS[2][1] + .3 ? Math.exp(-((d / .25) ** 2)) * 1.1 : 0; P.b = .55 + g; P.w = g * .35;
  if (j === 3) { let f = 0; for (const tg of TG) f = Math.max(f, Math.exp(-(((t - tg) / .35) ** 2))); P.a = f; P.b += f * .6; }
}
function packets(t, i, k, n, P) {
  const half = Math.floor(n * .5); if (k >= half) { dust(t, i, P); return; }
  const m = Math.min(2, Math.floor(k * 3 / half)), tg = TG[m], gs = tg - .25 + R3[i] * .2; if (t < gs) { dust(t, i, P); return; }
  const np = nodePos(3), ang = R1[i] * TAU + t * 2, rad = Math.sqrt(R2[i]) * 16, cx = np.x + Math.cos(ang) * rad, cy = np.y + Math.sin(ang) * rad;
  const s = SEG[m], tx = lerp(s[0], s[1], R1[i]), ty = ROWY[s[2]] + (R2[i] - .5) * 2, fs = tg + .45 + R4[i] * .25, fd = .8, u = clamp((t - fs) / fd), f = eio(u);
  P.x = lerp(cx, tx, f); P.y = lerp(cy, ty, f) - Math.sin(Math.PI * u) * 30; P.a = 1 - f; P.b = u < 1 ? 1 : .55 + .6 * (1 - sm((t - fs - fd) / 1.5));
  fromDust(P, t, gs, .45, i);
}
function orbitSpark(t, i, k, n, P) { const th = theta(t); spark(P, t, i, RC.x + Math.cos(th) * RC.r, RC.y + Math.sin(th) * RC.r, 1.1, 0); }

// ---- timeline: per role, keyframes {at, dur, stag, fn, exit}; an exit eases in, an arrival eases out
// with a small overshoot.
let TR;
function timeline() {
  const kf = (at, fn, dur = MORPH, stag = STAGGER) => ({at, fn, dur, stag, exit: false});
  const out = (at, dur = MORPH * .75, stag = STAGGER) => ({at, fn: dustFn, dur, stag, exit: true});
  const C = x => L('cold', x), F = x => L('flash', x), Rc = x => L('recall', x), K = x => L('skills', x), A = x => L('audit', x), R = x => L('round', x);
  C1 = blockCenters(960, 540);
  SESS = [[.3, .45, 9.4, 5.8, 6.1, .38], [9.7, .22, 0, 0, 0, 0]].map(([st, pace, en, fix, resume, p2]) => {
    const start = C(st), end = en ? C(en) : START.flash, tb = new Array(10).fill(Infinity);
    for (let j = 0; j <= 5; j++) tb[j] = start + .6 + j * pace;
    if (resume) for (let j = 6; j < 10; j++) tb[j] = C(resume) + (j - 6) * p2;
    const at = (j, x) => [x, C1[j].x, C1[j].y - 6], keys = [at(0, start)];
    for (let j = 0; j <= 5; j++) { keys.push(at(j, tb[j])); if (j < 5) keys.push(at(j, tb[j] + pace * .35)); }
    if (resume) { keys.push(at(5, tb[6] - p2 * .9)); for (let j = 6; j < 10; j++) { keys.push(at(j, tb[j])); keys.push(at(j, tb[j] + p2 * .35)); } }
    return {start, end, tb, ts: tb[5], tfix: fix ? C(fix) : Infinity, td: en ? end - .9 : Infinity, path: path(keys)};
  });
  NOTE = {x0: 1250, x1: 1640, y: 560, inT: C(3.8), readA: C(4.8), readZ: C(5.7), outT: C(8.3), ghost: C(11.6)};
  TB3 = [...Array(10)].map((_, j) => Rc(4) + j * .34);
  T = {ign3: Rc(.4), readA: Rc(1.4), readZ: Rc(3.4), colIn: K(.8), cut: [K(3), K(4.3), K(5.6)], task: K(.2), taskEnd: K(6.4), slam: A(1.1), crack: A(2.7), verified: A(10.2), approve: A(12)};
  const k3 = [[T.ign3, 960, 420], [Rc(1.3), 720, 760], [Rc(3.2), 720, 760]];
  for (let j = 0; j < 10; j++) { k3.push([TB3[j], C1[j].x, C1[j].y - 6]); k3.push([TB3[j] + .12, C1[j].x, C1[j].y - 6]); }
  SP3 = path(k3); SP4 = path([[T.task, 960, 430], ...T.cut.flatMap((tc, c) => [[tc - .8, COLS[c].x + 170, 272], [tc + .1, COLS[c].x + 170, 272]]), [K(6.3), 960, 230]]);
  CA = blockCenters(860, 540); FLAG = {3: [A(5.3), A(7.9)], 7: [A(6.6), A(8.6)]};
  LENS = path([[A(4), 1350, 420], [A(4.5), 1350, 420], [A(5.3), 1142, 640], [A(5.7), 1142, 640], [A(6.6), 766, 470], [A(7), 766, 470], [A(7.6), 480, 420], [A(9.3), 480, 420], [A(10.2), 1350, 420]]);
  SP5 = path([[A(0), 860, 316], [A(7.5), 860, 316], [A(7.9), 1142, 664], [A(8.2), 1142, 664], [A(8.6), 766, 472], [A(8.9), 766, 472], [A(9.3), 860, 316]]);
  LAPS = [[1.2, 4], [4, 6.2], [6.2, 7.8]].map(([a, b]) => [R(a), R(b)]);
  TG = [0, 1, 2].map(m => { let lo = LAPS[m][0], hi = LAPS[m][1]; for (let q = 0; q < 40; q++) { const mid = (lo + hi) / 2; phi(mid) < m + .6 ? lo = mid : hi = mid; } return lo; });
  const toC2 = kf(F(0), markFn(960, 560, 1.45, {scan: [F(2), F(4.2)]}), 2, .6), out2 = out(F(7.2), 1.2, .5);
  const toC7 = kf(L('resolve', 0), markFn(960, 410, 1.05, {sheen: L('resolve', 2.8)}), 2.4, .55);
  TR = {
    SPARK: [kf(0, coldSpark), kf(F(0), hidden), kf(Rc(0), recallSpark), kf(K(0), skillsSpark), kf(A(0), auditSpark), kf(R(0), orbitSpark), toC7],
    BUILD: [kf(0, coldBuild), toC2, out2, kf(Rc(0), recallBuild), kf(K(0), columns, 1.6, .5), kf(A(0), auditBuild), kf(R(0), packets), toC7],
    RING: [kf(0, dustFn), toC2, out2, kf(K(0), meter), kf(A(.2), stamp, .6, .2), out(A(3.9)), kf(A(10.8), person, 1, .3), kf(R(0), loopRing), toC7],
    SLAB: [kf(0, dustFn), toC2, kf(F(7.2), slab, 1.6, .5), toC7],
    AUX: [kf(0, coldNote), toC2, out2, kf(Rc(1.3), thread, .7, .3), out(Rc(3.3), .7, .4), out(A(0)), kf(A(4), lens, .8, .25), out(A(10.5), .6, .3), kf(A(10.9), connector, .8, .3), kf(R(0), nodes), toC7],
    DUST: [kf(0, dustFn)],
  };
}
// Staggered morph: each particle starts its transition at a seeded offset; when a keyframe begins before
// the previous transition ends, the previous one is evaluated as its own blend, so nothing jumps.
const POOL = Array.from({length: 10}, () => ({x: 0, y: 0, b: 0, a: 0, w: 0, s: 1}));
function evalTrack(tr, j, t, i, k, n, d) {
  const P = POOL[d]; P.b = 1; P.a = 0; P.w = 0; P.s = 1; const f = tr[j]; f.fn(t, i, k, n, P);
  if (j === 0 || d >= 8) return P;
  const u = (t - f.at - R1[i] * f.stag * f.dur) / (f.dur * (1 - f.stag)); if (u >= 1) return P;
  const A = evalTrack(tr, j - 1, t, i, k, n, d + 1); if (u <= 0) return A;
  const e = f.exit ? ei(u) : backOut(u, BOUNCE), dx = P.x - A.x, dy = P.y - A.y, off = Math.sin(Math.PI * u) * ARC * (R2[i] - .5) * 2;
  const glow = Math.sin(Math.PI * u) * FLIGHT_GLOW * Math.min(1, Math.hypot(dx, dy) / 260) * Math.min(1, (A.b + P.b) * 2);
  P.x = A.x + dx * e - dy * off; P.y = A.y + dy * e + dx * off; P.b = A.b + (P.b - A.b) * u + glow; P.a = A.a + (P.a - A.a) * u; P.w = A.w + (P.w - A.w) * u; P.s = A.s + (P.s - A.s) * u;
  return P;
}
function fillBuf(t) {
  for (const name in ROLES) {
    const R = ROLES[name], tr = TR[name]; let j = 0; for (let q = 1; q < tr.length; q++) if (tr[q].at <= t) j = q;
    for (let k = 0; k < R.n; k++) { const i = R.start + k, P = evalTrack(tr, j, t, i, k, R.n, 0), o = i * 6; buf[o] = P.x; buf[o + 1] = P.y; buf[o + 2] = P.b > 0 ? P.b : 0; buf[o + 3] = P.a; buf[o + 4] = P.w; buf[o + 5] = P.s; }
  }
}

// ---- captions: [from, to, class, x, y, html] on the 1920 x 1080 stage; statements rise word by word
function captions() {
  const C = [], cap = (a, b, cls, x, y, h) => C.push({a, b, cls, x, y, h});
  const c = x => L('cold', x), F = x => L('flash', x), Rc = x => L('recall', x), K = x => L('skills', x), A = x => L('audit', x), R = x => L('round', x), Z = x => L('resolve', x);
  const [s1, s2] = SESS;
  cap(s1.start, s1.end, 'mono', 120, 104, 'MONDAY');
  cap(s1.ts, s1.tfix + .3, 'mono amb c', 960, 770, 'TEST DATABASE NOT RESET');
  cap(NOTE.inT + .2, NOTE.outT + .3, 'mono s', NOTE.x0, NOTE.y - 74, 'YOU');
  cap(NOTE.inT + .5, NOTE.outT + .3, 'mono q', NOTE.x0 + 22, NOTE.y - 14, 'Reset the test database first.');
  cap(s1.tfix, c(7.9), 'mono grn c', 960, 770, 'TEST DATABASE RESET ✓');
  cap(c(8), s1.end, 'mono c', 960, 770, 'CHAT ENDS');
  cap(s2.start, c(11.9), 'mono', 120, 104, 'THURSDAY · NEW SESSION');
  cap(s2.ts, START.flash, 'mono amb c', 960, 770, 'TEST DATABASE NOT RESET');
  cap(c(12), START.flash, 'stmt', 120, 84, 'Every session starts from <em>zero</em>');
  cap(c(12.6), START.flash, 'mono', 124, 168, 'THE CORRECTION LIVED IN THE CHAT. THE CHAT ENDED.');
  cap(F(1.8), F(6.8), 'mono grn', 1440, 340, 'FLASHING');
  ['CLAUDE.md', 'AGENTS.md', '.claude/reference/', '.claude/skills/', '.agents/skills/'].forEach((f, j) => cap(F(2.2 + j * .35), F(6.8), 'mono file', 1440, 380 + j * 30, f));
  cap(F(2), F(6.8), 'mono c', 960, 832, 'HARNESS FIRMWARE');
  cap(F(3.8), F(10), 'stmt', 120, 84, 'Memory, skills and review, built into the <em>repository</em>');
  cap(F(7.8), R(10), 'mono s', 384, 842, 'YOUR REPOSITORY');
  ['CLAUDE.md · AGENTS.md', '.claude/reference/architecture.md', '.claude/reference/pitfalls.md', '.claude/skills/', '.agents/skills/'].forEach((f, r) => cap(F(8 + r * .12), R(10), 'mono s file', 404, ROWY[r] - 10, f));
  cap(Rc(.2), Rc(7), 'mono', 120, 104, 'NEXT SESSION · WITH HARNESS FIRMWARE');
  cap(Rc(1.7), Rc(6.6), 'mono q', 748, 772, 'pitfalls.md · 2026-03-14<br><b>Reset the test database first.</b>');
  cap(TB3[5] - .3, Rc(7.2), 'mono grn c', 960, 770, 'TEST DATABASE RESET ✓');
  cap(Rc(7.2), Rc(11), 'stmt', 120, 84, 'What one session learns, the next one <em>reads</em>');
  [['REPLY', 'CAVEMAN · NO FILLER'], ['COMMAND OUTPUT', 'RTK · FILTERED OUTPUT'], ['LARGE FILE READ', 'STK · OUTLINE FIRST']].forEach(([name, tool], c) => {
    cap(K(.8), K(10), 'mono s', COLS[c].x, 252, name);
    cap(T.cut[c] + .5, K(10), 'mono s grn', COLS[c].x, COL_Y + COLS[c].keep.length * COL_LH + 14, tool);
  });
  cap(K(.8), K(10), 'mono s c', 1560, 252, 'CONTEXT');
  cap(K(2.1), T.cut[1], 'mono amb c', 1560, 782, 'FILLING');
  cap(K(6.2), K(10), 'stmt', 120, 84, 'Replies, command output and file reads, <em>trimmed</em>');
  cap(K(7), K(10), 'mono s', 300, 700, 'SKILLS, TOO, LOAD ONLY WHEN A TASK CALLS THEM');
  cap(A(.9), A(2.7), 'mono s', 985, 508, 'SELF-REPORTED');
  cap(A(1.1), A(2.7), 'mono grn c big', 860, 500, 'DONE');
  cap(A(2.9), A(10.6), 'stmt', 120, 84, 'The builder never grades its own <em>work</em>');
  cap(A(4.2), A(10.4), 'mono amb', 1300, 322, 'CODEX · FRESH CONTEXT');
  cap(A(5.4), A(6.6), 'mono amb', 1300, 350, 'FINDINGS: 1'); cap(A(6.6), A(8.6), 'mono amb', 1300, 350, 'FINDINGS: 2');
  cap(A(8.6), A(10.3), 'mono grn', 1300, 350, 'FIXED · RECHECKING'); cap(A(10.3), A(14), 'mono grn', 1300, 350, 'VERIFIED');
  cap(A(11), A(14), 'mono s c', 1580, 680, 'YOU'); cap(A(12.1), A(14), 'mono grn c', 1580, 706, 'APPROVED');
  cap(A(10.9), A(14), 'stmt', 120, 84, 'A second model checks it. <em>You</em> approve');
  ['Recall', 'Plan', 'Execute', 'Audit', 'Integrate'].forEach((nm, j) => { const a = (-90 + 72 * j) * Math.PI / 180; cap(R(.6 + j * .1), R(10), 'lbl c', RC.x + Math.cos(a) * (RC.r + 62), RC.y + Math.sin(a) * (RC.r + 62) - 11, nm); });
  LAPS.forEach((l, j) => cap(l[0], j === 2 ? R(9.8) : l[1], 'mono c', RC.x, RC.y - 12, `ROUND ${j + 1}`));
  TG.forEach((tg, m) => cap(tg + 1.3, tg + 3, 'mono s grn', SEG[m][0], ROWY[SEG[m][2]] - 30, '+1 LESSON'));
  cap(R(5), R(10), 'stmt', 120, 84, 'Each round starts from what the last one <em>learned</em>');
  cap(Z(2.2), TOTAL + 1, 'stmt c big', 960, 606, 'Better outcomes, every <em>round</em>');
  cap(Z(3.2), TOTAL + 1, 'mono c', 960, 730, 'HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX');
  cap(Z(3.6), TOTAL + 1, 'mono grn c url', 960, 772, 'harnessfirmware.com');
  return C;
}
// ---- mount
function mount(root) {
  const stage = root.querySelector('.film-stage'), canvas = root.querySelector('.film-canvas'), ov = root.querySelector('.film-ov');
  const playBtn = root.querySelector('.film-play'), timeEl = root.querySelector('.film-time'), range = root.querySelector('.film-scrub'), ticks = root.querySelector('.film-ticks');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  alloc(innerWidth >= 1100 ? 22000 : 12000);
  let gl = null;
  try { gl = renderer(canvas, buf, LOOK); } catch (err) { console.error(err); }
  if (!gl) { root.dataset.state = 'unsupported'; return; }
  timeline();
  const caps = captions().map(c => {
    const el = document.createElement('div'); el.className = 'fc ' + c.cls + (c.x <= 124 ? ' l' : ''); el.style.left = c.x + 'px'; el.style.top = c.y + 'px'; el.innerHTML = c.h;
    const tx = /\bc\b/.test(c.cls) ? 'translateX(-50%)' : /\br\b/.test(c.cls) ? 'translateX(-100%)' : '';
    const words = c.cls.includes('stmt') ? splitWords(el) : null; if (words) el.style.transform = tx; ov.append(el);
    return {el, a: c.a, b: c.b, tx, words, vis: false};
  });
  const starts = CHAPTERS.map(([id]) => START[id]);
  for (const s of starts) { const i = document.createElement('i'); i.style.left = s / TOTAL * 100 + '%'; ticks.append(i); }

  let t = reduced ? TOTAL : 0, state = 'idle', onScreen = false, raf = 0, last = 0, settle = 0, chapter = -1, scrubbing = false;
  const fmt = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const running = () => state === 'playing' && onScreen && !document.hidden;
  function setState(s) { state = s; root.dataset.state = s; playBtn.textContent = s === 'playing' ? 'Pause' : s === 'ended' ? 'Replay' : 'Play'; playBtn.setAttribute('aria-label', `${playBtn.textContent} the film`); }
  function paintUI() {
    timeEl.textContent = `${fmt(Math.min(t, TOTAL))} / ${fmt(TOTAL)}`;
    if (!scrubbing) range.value = Math.round(Math.min(t, TOTAL) / TOTAL * 1000);
    range.style.setProperty('--p', range.value / 1000);
    range.setAttribute('aria-valuetext', fmt(Math.min(t, TOTAL)));
    let c = 0; for (let j = 0; j < starts.length; j++) if (t >= starts[j]) c = j;
    if (c !== chapter) { chapter = c; root.dataset.chapter = c + 1; }
    const IN = .7;
    for (const cp of caps) {
      let o = 0; if (t >= cp.a && t < cp.b) o = (cp.words ? 1 : eo((t - cp.a) / IN)) * (1 - sm((t - (cp.b - .45)) / .45));
      if (o <= 0) { if (cp.vis) { cp.el.style.opacity = 0; cp.vis = false; } continue; }
      cp.vis = true; cp.el.style.opacity = o;
      if (cp.words) cp.words.forEach((w, j) => { const p = eo((t - cp.a - j * .07) / IN); w.style.opacity = p; w.style.transform = `translateY(${(1 - p) * 16}px)`; });
      else cp.el.style.transform = `${cp.tx} translateY(${(1 - eo((t - cp.a) / IN)) * 8}px)`;
    }
  }
  function frame(now) {
    raf = 0; const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
    if (running()) { t += dt; if (t >= TOTAL) { t = TOTAL; setState('ended'); settle = 30; } }
    fillBuf(Math.min(t, TOTAL - .001)); gl.draw(t, dt * 60, sm(t / .8)); paintUI();
    // Keep drawing while playing, and for a moment after a pause or seek so the trails settle.
    if (running() || --settle > 0) raf = requestAnimationFrame(frame); else last = 0;
  }
  const wake = (frames = 45) => { settle = Math.max(settle, frames); if (!raf) raf = requestAnimationFrame(frame); };
  function play() { if (state === 'ended' || t >= TOTAL) { t = 0; gl.reset(); } setState('playing'); wake(); }
  function pause() { setState('paused'); wake(); }
  function seek(x) { t = clamp(x, 0, TOTAL); gl.reset(); if (state === 'ended' && t < TOTAL) setState('paused'); wake(); }

  playBtn.addEventListener('click', () => state === 'playing' ? pause() : play());
  range.addEventListener('input', () => seek(range.value / 1000 * TOTAL));
  // While a pointer holds the thumb, the frame loop leaves the range alone; focus alone does not count.
  range.addEventListener('pointerdown', () => { scrubbing = true; });
  addEventListener('pointerup', () => { scrubbing = false; });
  addEventListener('pointercancel', () => { scrubbing = false; });
  stage.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); playBtn.click(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); seek(t + 5); } else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(t - 5); }
  });
  stage.addEventListener('click', () => playBtn.click());
  // The stage band (BAND_TOP, BAND_H) is fitted into the stage box both ways and centred; captions set at the
  // stage's left margin (class l) are moved to the page gutter, which the transport's padding carries.
  const transport = root.querySelector('.film-transport');
  const layout = () => {
    const w = stage.clientWidth, full = stage.clientHeight, h = full - transport.offsetHeight; if (!w) return;
    const s = Math.min(w / W, h / BAND_H), ox = (w - W * s) / 2, oy = (h - BAND_H * s) / 2 - BAND_TOP * s;
    ov.style.setProperty('--lx', ((parseFloat(getComputedStyle(transport).paddingLeft) - ox) / s - 120) + 'px');
    ov.style.left = ox + 'px'; ov.style.top = oy + 'px'; ov.style.transform = `scale(${s})`;
    const d = Math.min(devicePixelRatio || 1, 1.5); gl.size(Math.round(w * d), Math.round(full * d)); gl.view(s * d, ox * d, oy * d); wake(3);
  };
  new ResizeObserver(layout).observe(stage); layout();
  // Starts once half the stage shows; keeps playing while any of it shows.
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (e.intersectionRatio >= .5 && state === 'idle' && !reduced) play();
    else if (running()) wake();
  }, {threshold: [0, .5]}).observe(stage);
  document.addEventListener('visibilitychange', () => { if (running()) { last = 0; wake(); } });
  setState('idle'); if (reduced) root.dataset.state = 'idle';
  wake(45);
}

const root = document.getElementById('film');
if (root) mount(root);
