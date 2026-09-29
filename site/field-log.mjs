// About page field log (#log): seven real sessions that built a production site, told in eight beats by
// one pool of WebGL2 particles on a 1920 x 1080 stage, with captions as HTML over the canvas. Every
// frame is a pure function of the timeline t (the renderer comes from particle-engine.mjs).
//   scroll     the section is nine screens tall and its stage pins under the header; scrolling down
//              moves the picture towards the scroll position at play speed, and the scroll is held
//              at most MAX_LEAD seconds ahead of the picture, so a fast flick cannot skip a beat
//   auto-run   once the timeline passes AUTO_START with the scroll ahead of it, the piece plays by
//              itself and the page scroll follows; scrolling up hands control back
//   pace       play runs at RATE timeline units per second while shapes morph or a caption needs
//              reading time, and RATE x FAST between (buildPace); scroll maps to play time, so a quiet
//              stretch also takes less scroll
//   skip       the Skip button scrolls past the section
// #log[data-state] is live, or static under prefers-reduced-motion or without WebGL2; static shows the
// written log instead of the stage.
import {TAU, clamp, lerp, sm, eo, ei, eio, backOut, mulberry, path, rectPt, splitWords, renderer} from './particle-engine.mjs';

const W = 1920;
// The visible band of the stage: y 50 to 1000 (1920 x 950).
const BAND_TOP = 50, BAND_H = 950;
// Tuned in the field-log lab (2026-09-28).
const RATE = .8, FAST = 3, EASE = .6, HOLD = 2.5, AUTO_START = .6, MAX_LEAD = 2, SMOOTH = 6;
const MORPH = 1.2, STAGGER = .45, BOUNCE = .6, ARC = .18, FLIGHT_GLOW = .5, DRIFT = 1, DUST = .2;
const LOOK = {POINT_SIZE: 2.4, EXPOSURE: 1, TRAIL: .86, BLOOM: .8, GRAIN: .05, VIGNETTE: .4, GREEN: [.325, .859, .463], AMBER: [.937, .784, .494], PAPER: [.953, .953, .925], INK: [.059, .071, .063]};

// ---- beats: [id, length]; each holds HOLD more with nothing new appearing
const BEATS = [['work', 8], ['handoff', 8], ['memory', 10], ['review', 10], ['judged', 8], ['stale', 8], ['fixed', 10], ['inherit', 7]];
const ST = {}; let TOTAL = 0; for (const [id, d] of BEATS) { ST[id] = [TOTAL, d]; TOTAL += d + HOLD; }
const B = (id, x) => ST[id][0] + x, E = id => ST[id][0] + ST[id][1] + HOLD;

// ---- particles: seeded randoms, roles as fixed index ranges, shapes sampled once
const MARK = ['M47 65 123 21v168l-76-30Z', 'M232 21l76 44v103l-76-28Z', 'M47 172l76 30v108l-76-25Z', 'M134 115l174 64v105l-76 26v-84l-98-32Z'];
let N, R1, R2, R3, R4, ROLES, MX, MY, ME, DLN, DU, SLN, SLU, buf;
const DL = 18, DLEN = [], SLEN = [900, 760, 980, 640];
function alloc(count) {
  N = count; const r = mulberry(7);
  R1 = new Float32Array(N); R2 = new Float32Array(N); R3 = new Float32Array(N); R4 = new Float32Array(N);
  for (let i = 0; i < N; i++) { R1[i] = r(); R2[i] = r(); R3[i] = r(); R4[i] = r(); }
  let off = 0; ROLES = {};
  for (const [k, f] of [['SPARK', .02], ['LANES', .3], ['ARCS', .06], ['SLAB', .12], ['DIFF', .18], ['AUX', .1]]) { const n = Math.floor(N * f); ROLES[k] = {start: off, n}; off += n; }
  ROLES.DUST = {start: off, n: N - off};
  sampleMark(ROLES.DIFF.n);
  [DLN, DU] = wordsLayout(ROLES.DIFF.n, DL, 71); const rl = mulberry(72); for (let l = 0; l < DL; l++) DLEN.push(180 + rl() * 460);
  [SLN, SLU] = wordsLayout(ROLES.SLAB.n, 4, 81);
  buf = new Float32Array(N * 6);
}
// The H mark, rasterised at 2x over the DIFF role: half the points on its edges (drawn brighter), half inside.
function sampleMark(n) {
  const sc = 2, cw = 720, ch = 660, c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d'); x.scale(sc, sc); x.fillStyle = '#fff'; for (const d of MARK) x.fill(new Path2D(d));
  const img = x.getImageData(0, 0, cw, ch).data, ins = (p, q) => p >= 0 && q >= 0 && p < cw && q < ch && img[(q * cw + p) * 4 + 3] > 127, edge = [], fill = [];
  for (let q = 0; q < ch; q++) for (let p = 0; p < cw; p++) if (ins(p, q)) (!ins(p + 1, q) || !ins(p - 1, q) || !ins(p, q + 1) || !ins(p, q - 1) ? edge : fill).push(p, q);
  const r = mulberry(11); MX = new Float32Array(n); MY = new Float32Array(n); ME = new Uint8Array(n);
  for (let m = 0; m < n; m++) { const e = r() < .5, l = e ? edge : fill, j = Math.floor(r() * l.length / 2) * 2; MX[m] = (l[j] + r()) / sc - 177.5; MY[m] = (l[j + 1] + r()) / sc - 165.5; ME[m] = e ? 1 : 0; }
}
// Lines of words: each point gets a line and a position along it that falls inside a word.
function wordsLayout(n, lines, seed) {
  const r = mulberry(seed), words = [];
  for (let l = 0; l < lines; l++) { const w = []; let u = 0; while (u < 1) { const len = Math.min(.07 + r() * .16, 1 - u); w.push([u, len]); u += len + .045; } words.push(w); }
  const L = new Uint8Array(n), U = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const l = Math.min(lines - 1, Math.floor(k * lines / n)), w = words[l], tot = w.reduce((s, x) => s + x[1], 0);
    let u = r() * tot, p = 0; for (const [a, len] of w) { if (u <= len) { p = a + u; break; } u -= len; }
    L[k] = l; U[k] = p;
  }
  return [L, U];
}

// ---- role functions fn(t, i, k, n, P) write position x,y, brightness b, amber mix a, white mix w, size s
const Pd = {x: 0, y: 0, b: 0, a: 0, w: 0, s: 1};
function dust(t, i, P) {
  const r1 = R1[i], r3 = R3[i], r4 = R4[i];
  P.x = ((r1 * 3300 + t * (5 + r3 * 14) * DRIFT) % 3300) - 690;
  P.y = R2[i] * 1700 - 310 + Math.sin(t * .21 + r4 * 6.283) * 22 + Math.sin(t * .05 + r1 * 9) * 26;
  P.b = DUST * (.25 + .75 * r4 * r4) * (.7 + .3 * Math.sin(t * 1.3 + r3 * 40)); P.a = 0; P.w = 0; P.s = .6 + r3 * .6;
}
const dustFn = (t, i, k, n, P) => dust(t, i, P);
const hidden = (t, i, k, n, P) => { P.x = 960; P.y = 540; P.b = 0; };
function fromDust(P, t, t0, d, i) {
  const p = eo((t - t0) / d); if (p >= 1) return; dust(t, i, Pd); const g = Math.sin(Math.PI * p) * FLIGHT_GLOW * .8;
  P.x = lerp(Pd.x, P.x, p); P.y = lerp(Pd.y, P.y, p); P.b = lerp(Pd.b, P.b, p) + g; P.a *= p; P.w *= p; P.s = lerp(Pd.s, P.s, p);
}
const twinkle = (t, i) => .85 + .15 * Math.sin(t * 2.1 + R1[i] * 40);
function glitch(P, t, i, g) { P.x += Math.sin(t * 37 + R1[i] * 60) * 5 * g * R2[i]; P.y += Math.cos(t * 29 + R2[i] * 50) * 3 * g; P.b *= 1 + g * .6 * Math.abs(Math.sin(t * 23 + R4[i] * 9)); }
function fixBurst(P, t, i, tx) { if (t <= tx) return; const q = eo((t - tx - R3[i] * .15) / .55); P.x += (R1[i] - .5) * 50 * (1 - q); P.y += (R2[i] - .5) * 50 * (1 - q); P.b += .9 * (1 - q); }

// The work and the handoffs: seven sessions over three days as lanes on a timeline, the briefs handed
// from one to the next, and the pull request that lands them all.
// Real spans in hours from 2026-09-24 12:00 UTC, from the session transcripts.
const LANES = [['TUNNEL', 3.55, 64.5], ['HERO', 5.6, 62.8], ['MASTHEAD', 45.1, 59.5], ['ABOUT', 36.1, 86.9], ['ORCHESTRATOR', 63, 100.8], ['PERF PASS', 100.9, 107.8], ['STUDY ENGINE', 106.8, 108.7]];
const HOURS = 109, X0 = 380, X1 = 1540, hx = h => X0 + h / HOURS * (X1 - X0), laneY = j => 330 + j * 58;
const sweep = h => B('work', .6) + h / HOURS * 5.4, playH = t => HOURS * clamp((t - B('work', .6)) / 5.4);
function lanes(t, i, k, n, P) {
  const j = Math.min(6, Math.floor(k * 7 / n)), [, a, b] = LANES[j], h = lerp(a, b, R1[i]), tp = sweep(h);
  if (t < tp) { dust(t, i, P); return; }
  P.x = hx(h); P.y = laneY(j) + (R2[i] - .5) * 3; P.b = .42 * twinkle(t, i);
  const head = Math.exp(-(((playH(t) - h) / 2.5) ** 2)) * (t < B('work', 6.3) ? 1 : 0); P.b += head * .9; P.w = head * .3;
  fromDust(P, t, tp, .5, i);
}
function playhead(t, i, k, n, P) { const on = sm((t - B('work', .4)) / .4) * (1 - sm((t - B('work', 6.1)) / .5)); P.x = hx(playH(t)) + (R2[i] - .5) * 2; P.y = 306 + R1[i] * 396; P.b = .45 * on; P.w = .4; P.s = .9; }
const HANDOFFS = [[0, 3, 36.1], [1, 2, 45.1], [3, 4, 85.9], [5, 6, 106.75]];
function arcs(t, i, k, n, P) {
  const m = Math.min(3, Math.floor(k * 4 / n)), [a, b, h] = HANDOFFS[m], x = hx(h), y0 = laneY(a), y1 = laneY(b), t0 = B('handoff', .8 + m * .9);
  if (t < t0) { dust(t, i, P); return; }
  const u = (R1[i] + t * .5) % 1, cx = x - 70 - (b - a) * 8, cy = (y0 + y1) / 2, q = 1 - u;
  P.x = q * q * x + 2 * q * u * cx + u * u * x; P.y = q * q * y0 + 2 * q * u * cy + u * u * y1; P.b = .95 * Math.sin(Math.PI * u) * sm((t - t0) / .4); P.w = .25;
  fromDust(P, t, t0, .5, i);
}
const MERGE = {x: hx(100.55), y: laneY(4)};
function merge(t, i, k, n, P) {
  const ang = R1[i] * TAU + t * .25 * (R4[i] < .5 ? 1 : -1), r = 5 + Math.sqrt(R2[i]) * 40;
  P.x = MERGE.x + Math.cos(ang) * r; P.y = MERGE.y + Math.sin(ang) * r * .9; P.b = .5 * twinkle(t, i) + .7 * Math.exp(-(((t - B('handoff', 6.6)) / .35) ** 2)); P.w = .2;
}

// Memory: the last two lanes, zoomed. The perf pass wipes shared node_modules and saves two pitfalls;
// the study engine reads them and avoids the same trap.
const ZH0 = 100, ZH1 = 109.5, zx = h => X0 + (h - ZH0) / (ZH1 - ZH0) * (X1 - X0), ZY = [380, 540], EVP = 106.67, EVS = 107.82;
function zoom(t, i, k, n, P) {
  const j = Math.min(6, Math.floor(k * 7 / n)); if (j < 5) { dust(t, i, P); return; }
  const [, a, b] = LANES[j], h = lerp(a, b, R1[i]); P.x = zx(h); P.y = ZY[j - 5] + (R2[i] - .5) * 4; P.b = .5 * twinkle(t, i);
  if (j === 5) { const g = sm((t - B('memory', 1.6)) / .3) * (1 - sm((t - B('memory', 3.6)) / .5)) * Math.exp(-(((P.x - zx(EVP)) / 40) ** 2)); P.a = g; glitch(P, t, i, g); }
  else { const g = Math.exp(-(((t - B('memory', 7.3)) / .6) ** 2)) * Math.exp(-(((P.x - zx(EVS)) / 60) ** 2)); P.b += g * 1.3; P.w = g * .3; }
}
function slab(t, i, k, n, P) {
  if (R3[i] < .2) { const [x, y] = rectPt(R1[i], 380, 760, 1540, 990); P.x = x; P.y = y; P.b = .4; return; }
  const l = SLN[k]; P.x = 420 + SLU[k] * SLEN[l]; P.y = 800 + l * 30 + (R2[i] - .5) * 1.5; P.b = .32 * twinkle(t, i);
}
function note(t, i, k, n, P) {
  if (k < n * .25) {
    const a = B('memory', 6.2), z = B('memory', 7.8); if (t < a || t > z + .4) { dust(t, i, P); return; }
    const u = (R1[i] + t * .8) % 1; P.x = lerp(700, zx(EVS), u) + (R2[i] - .5) * 3; P.y = lerp(922, ZY[1], u);
    P.b = Math.sin(Math.PI * u) * .85 * sm((t - a) / .3) * (1 - sm((t - z) / .4)); P.w = .3; return;
  }
  const t0 = B('memory', 3.2) + R3[i] * .3; if (t < t0) { dust(t, i, P); return; }
  const tx = 420 + R1[i] * 560, ty = 922 + (R2[i] - .5) * 2, sx = zx(EVP) + (R2[i] - .5) * 24, u = eio((t - t0) / .9);
  P.x = lerp(sx, tx, u) - Math.sin(Math.PI * u) * 60 * (R4[i] - .5); P.y = lerp(ZY[0], ty, u);
  P.b = u < 1 ? .9 : .5 + .6 * Math.exp(-(((t - B('memory', 7)) / .6) ** 2)); P.a = (1 - u) * .6; P.w = .2;
}

// Review: six same-model audits scan the diff and pass; another vendor's lens finds the bug on line 11.
const DY = l => 320 + l * 22, SCAN0 = 300, SCAN1 = 720;
function scanY(t) { for (let p = 0; p < 6; p++) { const a = B('review', 1 + p * .6), z = a + .5; if (t >= a && t < z) return lerp(SCAN0, SCAN1, (t - a) / .5); } return -1e4; }
function diff(t, i, k, n, P) {
  const l = DLN[k]; P.x = 560 + (l % 5 === 2 ? 28 : 0) + DU[k] * DLEN[l]; P.y = DY(l) + (R2[i] - .5) * 1.5; P.b = .42 * twinkle(t, i);
  const sy = scanY(t); if (sy > 0) P.b += .6 * Math.exp(-(((P.y - sy) / 12) ** 2));
  if (l === 11) { const tf = B('review', 6.4), tx = B('review', 7.6), g = sm((t - tf) / .25) * (1 - sm((t - tx) / .3)); P.a = g; glitch(P, t, i, g); fixBurst(P, t, i, tx); if (t > tx) P.b += .2; }
}
let LENS = null;
function scanLens(t, i, k, n, P) {
  if (t < B('review', 4.8)) { const sy = scanY(t); P.x = 540 + R1[i] * 680; P.y = sy > 0 ? sy : SCAN0; P.b = sy > 0 ? .7 : 0; P.w = .2; return; }
  const p = LENS(t), f = k / n;
  if (f < .64) { const th = TAU * f / .64; P.x = p.x + Math.cos(th) * 46; P.y = p.y + Math.sin(th) * 46; }
  else { const d = 46 + (f - .64) / .36 * 40; P.x = p.x + Math.cos(.785) * d; P.y = p.y + Math.sin(.785) * d; }
  P.a = 1; P.b = .22 * (1 - sm((t - B('review', 8.2)) / .5)); P.w = 0;
}

// Judged: 24 blind rounds fill a grid (one tie), and three measured bars move from before to after.
function grid(t, i, k, n, P) {
  const c = Math.min(23, Math.floor(k * 24 / n)), cx = 380 + (c % 6) * 84, cy = 330 + Math.floor(c / 6) * 84, fill = sm((t - B('judged', 1) - c * .11) / .25), tie = c === 17;
  if (R3[i] < .45) { const [x, y] = rectPt(R1[i], cx, cy, cx + 62, cy + 62); P.x = x; P.y = y; P.b = .38; }
  else { P.x = cx + 5 + R1[i] * 52; P.y = cy + 5 + R2[i] * 52; P.b = fill * (tie ? .2 : .6); P.w = tie ? .7 : 0; }
}
const BARS = [[360, 1, .01], [500, 1, .593], [640, .783, 1]];
function bars(t, i, k, n, P) {
  const b = Math.min(2, Math.floor(k * 3 / n)), [y, w0, w1] = BARS[b], u = eio((t - B('judged', 3) - b * .5) / 1.6), w = lerp(w0, w1, u);
  if (R3[i] < .3) { const [x, yy] = rectPt(R1[i], 1040, y, 1040 + 480 * w0, y + 22); P.x = x; P.y = yy; P.b = .18; }
  else { P.x = 1040 + R1[i] * 480 * w; P.y = y + 2 + R2[i] * 18; P.b = .7; P.a = 1 - u; }
}

// Stale: four cards glitch amber as the work shows each problem, then settle as each is fixed.
const CARDS = [[520, 320], [1000, 320], [520, 530], [1000, 530]];
function stale(t, i, k, n, P) {
  const c = Math.min(3, Math.floor(k * 4 / n)), [x0, y0] = CARDS[c], [x, y] = rectPt(R1[i], x0, y0, x0 + 440, y0 + 180);
  P.x = x; P.y = y; P.b = .5;
  const fx = sm((t - B('stale', 3.8 + c * .4)) / .4), g = sm((t - B('stale', 1 + c * .7)) / .3);
  P.a = g * (1 - fx); glitch(P, t, i, g * (1 - fx) * .4 * (.5 + .5 * Math.sin(t * 3 + c)));
}

// Why small: what loads every turn against what would if everything did. Heights share one scale
// (460 px = 87,000 tokens): everything every turn, then the firmware's 3,400, then what one task adds.
const COLTOP = 300, COLBOT = 760, TOK = 460 / 87000, hGreen = t => (3400 + 4100 * sm((t - B('fixed', 5.4)) / .8) + 2160 * sm((t - B('fixed', 7.4)) / .6)) * TOK;
function columns(t, i, k, n, P) {
  if (R3[i] < .62) {
    const u = eio((t - B('fixed', .6)) / 1.2); P.x = 430 + R1[i] * 100; P.y = COLBOT - R2[i] * 460 * u; P.b = R4[i] < .25 ? .5 : .16; P.a = 1;
    if (R4[i] < .25) { const [x, y] = rectPt(R1[i], 430, COLBOT - 460 * u, 530, COLBOT); P.x = x; P.y = y; } return;
  }
  const h = hGreen(t), on = sm((t - B('fixed', 2.6)) / .5); P.x = 600 + R1[i] * 100; P.y = COLBOT - R2[i] * h; P.b = .9 * on; P.w = .1;
}
const NOTES = ['ARCHITECTURE', 'COMMANDS', 'DEPLOYMENT', 'PITFALLS', 'SECRETS', 'TECH STACK'].map((nm, c) => ({nm, x: 880 + (c % 3) * 242, y: 360 + Math.floor(c / 3) * 96}));
const SKX = j => 880 + (j % 18) * 35, SKY = j => 620 + Math.floor(j / 18) * 26;
function shelf(t, i, k, n, P) {
  const f = k / n;
  if (f < .62) {
    const c = Math.min(5, Math.floor(f / .62 * 6)), {x, y} = NOTES[c], lit = (c === 0 || c === 3) ? sm((t - B('fixed', 4.8)) / .4) : 0, [px, py] = rectPt(R1[i], x, y, x + 224, y + 70);
    P.x = px; P.y = py; P.b = .3 + .6 * lit; P.w = .1 * lit; return;
  }
  const j = Math.min(35, Math.floor((f - .62) / .38 * 36)), lit = j === 9 ? sm((t - B('fixed', 7)) / .4) : 0, grow = eio((t - B('fixed', 7)) / .6), len = lit ? lerp(22, 190, grow) : 22;
  P.x = SKX(j) + R1[i] * len; P.y = SKY(j) + (R2[i] - .5) * 1.5 - (lit ? (R3[i] * 3 | 0) * 7 * grow : 0); P.b = .35 + .55 * lit;
}
function loads(t, i, k, n, P) {
  const f = k / n, a = f < .66, t0 = a ? B('fixed', 5) : B('fixed', 7.2), t1 = a ? B('fixed', 6.6) : B('fixed', 8.4); if (t < t0 || t > t1 + .4) { dust(t, i, P); return; }
  const src = a ? NOTES[f < .33 ? 0 : 3] : {x: SKX(9), y: SKY(9)}, sx = src.x + (a ? 112 : 60), sy = src.y + (a ? 35 : 0), u = (R1[i] + t * .9) % 1;
  P.x = lerp(sx, 650, u); P.y = lerp(sy, COLBOT - hGreen(t), u) - Math.sin(Math.PI * u) * 40; P.b = .85 * Math.sin(Math.PI * u) * sm((t - t0) / .3) * (1 - sm((t - t1) / .4)); P.w = .2;
}

// Inherit: the H mark hands the fix to six repositories.
const markAt = (cx, cy, sc) => (t, i, k, n, P) => { P.x = cx + MX[k] * sc + Math.sin(t * .7 + R1[i] * 6.3) * 1.1; P.y = cy + MY[k] * sc + Math.cos(t * .6 + R2[i] * 6.3) * 1.1; P.b = ME[k] ? .95 : .4; P.a = 0; P.w = 0; P.s = 1; };
const REPOS = [...Array(6)].map((_, c) => ({x: 400 + c * 200, y: 760}));
function repos(t, i, k, n, P) {
  const c = Math.min(5, Math.floor(k * 6 / n)), {x, y} = REPOS[c], tc = B('inherit', 1.6 + c * .35);
  if (R3[i] < .6) { const [px, py] = rectPt(R1[i], x, y, x + 140, y + 84); P.x = px; P.y = py; } else { P.x = x + 16 + R1[i] * 100; P.y = y + 34 + Math.floor(R2[i] * 2) * 18; }
  P.b = .22 + .45 * sm((t - tc) / .4) + .7 * Math.exp(-(((t - tc) / .25) ** 2));
}
function emit(t, i, k, n, P) {
  const c = Math.min(5, Math.floor(k * 6 / n)), {x, y} = REPOS[c], t0 = B('inherit', 1.2 + c * .35); if (t < t0) { dust(t, i, P); return; }
  const u = (R1[i] + t * .6) % 1; P.x = lerp(960, x + 70, u); P.y = lerp(600, y, u) - Math.sin(Math.PI * u) * 20; P.b = .75 * Math.sin(Math.PI * u) * sm((t - t0) / .3); P.w = .2;
  fromDust(P, t, t0, .4, i);
}

// ---- timeline: per role, keyframes {at, dur, stag, fn, exit}; an exit eases in, an arrival eases out
// with a small overshoot.
const kf = (at, fn, dur = MORPH, stag = STAGGER) => ({at, fn, dur, stag, exit: false});
const out = (at, dur = MORPH * .75, stag = STAGGER) => ({at, fn: dustFn, dur, stag, exit: true});
const R = x => B('review', x);
LENS = path([[R(4.8), 1300, 300], [R(5.4), 900, DY(2)], [R(6.3), 900, DY(11)], [R(7.8), 900, DY(11)], [R(8.4), 1300, 300]]);
const TR = {
  SPARK: [kf(0, playhead), kf(B('work', 6.5), hidden, .3, 0)],
  LANES: [kf(0, lanes), kf(B('handoff', 5.6), merge, 1.4, .5), kf(B('memory', 0), zoom, 1.4, .5), out(B('review', 0)), kf(B('inherit', 0), repos, 1.2, .45)],
  ARCS: [kf(0, dustFn), kf(B('handoff', 0), arcs, .6, .3), out(B('handoff', 6.8)), kf(B('fixed', 4.8), loads, .5, .3), out(B('fixed', 8.9), .5), kf(B('inherit', 1), emit, .6, .3)],
  SLAB: [kf(0, dustFn), kf(B('memory', 0), slab, 1.4, .5), out(B('review', 0))],
  DIFF: [kf(0, dustFn), kf(B('review', 0), diff, 1.4, .5), kf(B('judged', 0), grid, 1.4, .5), kf(B('stale', 0), stale, 1.4, .5), kf(B('fixed', 0), columns, 1.4, .5), kf(B('inherit', 0), markAt(960, 440, .9), 1.4, .4)],
  AUX: [kf(0, dustFn), kf(B('memory', 0), note, .6, .3), out(B('review', 0)), kf(B('review', .8), scanLens, .6, .3), out(B('judged', 0)), kf(B('judged', .5), bars, 1, .4), out(B('stale', 0)), kf(B('fixed', .5), shelf, 1, .4), out(B('inherit', 0))],
  DUST: [kf(0, dustFn)],
};
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
    const Rl = ROLES[name], tr = TR[name]; let j = 0; for (let q = 1; q < tr.length; q++) if (tr[q].at <= t) j = q;
    for (let k = 0; k < Rl.n; k++) { const i = Rl.start + k, P = evalTrack(tr, j, t, i, k, Rl.n, 0), o = i * 6; buf[o] = P.x; buf[o + 1] = P.y; buf[o + 2] = P.b > 0 ? P.b : 0; buf[o + 3] = P.a; buf[o + 4] = P.w; buf[o + 5] = P.s; }
  }
}

// ---- captions: [from, to, class, x, y, html] on the 1920 x 1080 stage; statements rise word by word
function captions() {
  const C = [], cap = (a, b, cls, x, y, h) => C.push({a, b, cls, x, y, h}), S = B;
  cap(S('work', .3), E('work'), 'stmt', 120, 84, 'Seven sessions, three days, one production <em>site</em>');
  LANES.forEach(([nm], j) => cap(S('work', .5), E('handoff'), 'mono s r', 360, laneY(j) - 11, nm));
  const TAGS = ['/long-horizon · /wow-loop', '/init-project · /wow-loop', '/perf-loop · /refine', '/long-horizon-workflows · 80 rounds', '/codex-review before merge', '/perf-loop · /codex-fullreview', '/why · /long-horizon-swarm'];
  LANES.forEach(([, a, b], j) => j < 5 ? cap(sweep(b), S('handoff', 5.4), 'mono s grn', hx(b) + 16, laneY(j) - 11, TAGS[j]) : cap(sweep(a), S('handoff', 5.4), 'mono s grn r', hx(a) - 16, laneY(j) - 11, TAGS[j]));
  [['SEP 25', 12], ['SEP 26', 36], ['SEP 27', 60], ['SEP 28', 84], ['SEP 29', 108]].forEach(([d, h]) => cap(sweep(h), E('handoff'), 'mono s c', hx(h), 724, d));
  cap(S('handoff', .3), E('handoff'), 'stmt', 120, 84, 'Each session hands the plan on; one lands it <em>all</em>');
  cap(S('handoff', 1), S('handoff', 5.4), 'mono s', 380, 776, 'EACH SESSION WRITES THE BRIEF FOR THE NEXT');
  cap(S('handoff', 6.2), E('handoff'), 'mono grn r', 1540, 776, 'ONE PULL REQUEST · 575 FILES · 6 PRS LANDED');
  cap(S('handoff', 6), E('handoff'), 'mono s r', 1540, 814, 'EVERY HANDOFF CHECKED AGAINST GITHUB · /codex-review CAUGHT 1 BUG');
  cap(S('memory', .3), E('memory'), 'stmt', 120, 84, 'A lesson saved in one session protects the <em>next</em>');
  cap(S('memory', .4), E('memory'), 'mono s r', 360, ZY[0] - 11, 'PERF PASS'); cap(S('memory', .4), E('memory'), 'mono s r', 360, ZY[1] - 11, 'STUDY ENGINE');
  [['16:00', 100], ['20:00', 104], ['00:00', 108]].forEach(([d, h]) => cap(S('memory', .6), E('memory'), 'mono s c', zx(h), 600, d));
  cap(S('memory', .8), E('memory'), 'mono s grn', zx(100.9), ZY[0] + 22, '16:52 · RECALL READS PITFALLS, ARCHITECTURE, COMMANDS');
  cap(S('memory', 1.7), E('memory'), 'mono s amb r', zx(EVP) + 30, ZY[0] - 88, '22:40 · A FORCED REMOVAL WIPES SHARED NODE_MODULES');
  cap(S('memory', 2.8), E('memory'), 'mono s', 380, 732, 'PITFALLS.MD');
  cap(S('memory', 3.4), E('memory'), 'mono s grn r', zx(EVP) + 30, ZY[0] - 54, 'RESTORED, THEN TWO PITFALLS SAVED');
  cap(S('memory', 4.3), E('memory'), 'mono q', 420, 896, 'Never force-remove a worktree whose node_modules is a junction.');
  cap(S('memory', 4.7), E('memory'), 'mono q', 420, 940, 'Git Bash rewrites /about into a path; set MSYS_NO_PATHCONV=1.');
  cap(S('memory', 5.2), E('memory'), 'mono s grn r', zx(106.8) - 16, ZY[1] - 11, '22:51 · RECALL READS PITFALLS.MD');
  cap(S('memory', 7.1), E('memory'), 'mono s grn r', zx(EVS) + 40, ZY[1] - 62, '23:49 · SAME TRAP, AVOIDED · 69 MINUTES LATER');
  cap(S('review', .3), E('review'), 'stmt', 120, 84, 'Another model catches what the builder <em>missed</em>');
  cap(S('review', .9), E('review'), 'mono s', 1256, 300, '/long-horizon · 6 SAME-MODEL AUDITS');
  for (let p = 0; p < 6; p++) cap(S('review', 1.3 + p * .6), E('review'), 'mono grn', 1256 + p * 34, 334, '✓');
  cap(S('review', 4.9), E('review'), 'mono s amb', 1256, 400, '/codex-review · OTHER VENDOR');
  cap(S('review', 6.4), E('review'), 'mono s amb', 1256, 440, 'DOOR-HOLE LAYERING BUG FOUND');
  cap(S('review', 7.6), E('review'), 'mono s grn', 1256, 480, 'FIXED, THEN RE-REVIEWED');
  cap(S('review', 7.8), E('review'), 'mono', 560, 760, '/codex-review + /astra-review ON ONE PAGE · 10 REAL BUGS, ALL FIXED');
  cap(S('judged', .3), E('judged'), 'stmt', 120, 84, 'Judged blind, measured before and <em>after</em>');
  cap(S('judged', .8), E('judged'), 'mono s', 380, 296, '/wow-loop · BLIND JUDGE, NEW VS OLD');
  cap(S('judged', .8), E('judged'), 'mono s grn', 1040, 272, '/perf-loop · ONE CHANGE PER ROUND, MEASURED');
  ['MASTHEAD · MS PER FRAME', 'HOME PAGE · MB PER FULL SCROLL', 'ABOUT PAGE · FPS ON INTEGRATED GPU'].forEach((l, b) => {
    cap(S('judged', .8), E('judged'), 'mono s', 1040, BARS[b][0] - 36, l);
    cap(S('judged', 4.4 + b * .5), E('judged'), 'mono grn', 1546, BARS[b][0] - 6, ['6.01 → 0.06', '4.10 → 2.43', '50.8 → 64.9'][b]);
  });
  cap(S('judged', 3.8), E('judged'), 'mono big grn', 380, 690, '23 OF 24');
  cap(S('judged', 4.2), E('judged'), 'mono s amb', 380, 780, '/long-horizon-workflows · A JUDGE FLAGS A ROUND THAT TUNED ITS CODE TO PASS ITS OWN CHECK');
  cap(S('stale', .3), E('stale'), 'stmt', 120, 84, 'The work showed what had gone <em>stale</em>');
  ['PROJECT RULES AND NOTES HAD GONE STALE', 'A REVIEW SKILL NAMED A RETIRED MODEL', 'A REVIEWER WITH WRITE ACCESS DELETED THE BUILD', 'PROJECT SETUP HAD NEVER BEEN RUN'].forEach((s, c) => cap(S('stale', 1 + c * .7), E('stale'), 'mono s amb wrap', CARDS[c][0] + 24, CARDS[c][1] + 22, s));
  ['→ CLAUDE.MD AND AGENTS.MD REVIEWED IN THE FIRMWARE', '→ /refine UPDATED THE REVIEW SKILLS', '→ REVIEWERS NOW READ-ONLY', '→ /init-project RUN BEFORE RELEASE WORK'].forEach((s, c) => cap(S('stale', 3.8 + c * .4), E('stale'), 'mono s grn wrap', CARDS[c][0] + 24, CARDS[c][1] + 100, s));
  cap(S('fixed', .3), E('fixed'), 'stmt', 120, 84, 'Rules load every turn; detail loads when it is <em>needed</em>');
  cap(S('fixed', .9), E('fixed'), 'mono s amb c', 480, COLBOT + 16, 'EVERYTHING,<br>EVERY TURN'); cap(S('fixed', 1.6), E('fixed'), 'mono amb c', 480, COLTOP - 40, '≈87,000');
  NOTES.forEach(({nm, x, y}, c) => cap(S('fixed', 1 + c * .12), E('fixed'), 'mono s', x + 14, y + 24, nm)); cap(S('fixed', 1), E('fixed'), 'mono s', 880, 326, '.CLAUDE/REFERENCE/ · PROJECT NOTES');
  cap(S('fixed', 1.6), E('fixed'), 'mono s', 880, 588, '.CLAUDE/SKILLS/ · 36 PLAYBOOKS, ONE INDEX LINE EACH');
  cap(S('fixed', 2.8), E('fixed'), 'mono s grn c', 650, COLBOT + 16, 'HARNESS<br>FIRMWARE'); cap(S('fixed', 3), S('fixed', 5.4), 'mono grn c', 650, COLBOT - 64, '≈3,400');
  cap(S('fixed', 3.2), E('fixed'), 'mono s', 880, 700, 'EVERY TURN: CLAUDE.MD (THE RULES) AND ONE INDEX LINE PER SKILL');
  cap(S('fixed', 4.8), E('fixed'), 'mono s grn', 880, 742, 'A BUILD BUG: RECALL LOADS PITFALLS AND ARCHITECTURE · +4,100');
  cap(S('fixed', 5.4), S('fixed', 8.6), 'mono s grn c', 650, COLBOT - 100, 'TOKENS');
  cap(S('fixed', 7), E('fixed'), 'mono s grn', 880, 784, 'THEN ONE PLAYBOOK, ONLY WHEN THE TASK CALLS IT · +2,160');
  cap(S('fixed', 8.6), E('fixed'), 'mono grn c', 650, COLBOT - 100, '≈9,700');
  cap(S('inherit', .3), TOTAL + 1, 'stmt', 120, 84, 'What one project learns, the firmware <em>keeps</em>');
  cap(S('inherit', .6), TOTAL + 1, 'mono s c', 960, 262, 'HARNESS FIRMWARE');
  cap(S('inherit', 3.4), TOTAL + 1, 'mono c', 960, 880, 'EVERY NEW REPOSITORY STARTS FROM THE FIX');
  cap(S('inherit', 4.2), TOTAL + 1, 'mono s grn c', 960, 926, '/sync-starter BRINGS THE FIXES INTO EXISTING ONES');
  return C;
}

// ---- pace: RATE x FAST by default, RATE while a keyframe morphs, and RATE wherever a caption would
// otherwise leave before a reader gets through it. The reader takes statements and longer labels one
// after another; labels of up to 3 words are read at a glance alongside. Reading budget: 0.25 s a word
// + 1 s for a statement, 0.3 s a word + 0.8 s for a label. Slow stretches go where the reader is
// reading that caption, then ease over EASE units. PACE[q] is play time in seconds at timeline q * PS.
const PS = .02; let PACE = new Float32Array(1), UT = 0;
function toU(t) { const x = clamp(t, 0, TOTAL) / PS, q = Math.min(PACE.length - 2, Math.floor(x)); return lerp(PACE[q], PACE[q + 1], x - q); }
function toT(u) {
  let lo = 0, hi = PACE.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (PACE[m] <= u) lo = m; else hi = m; }
  const f = PACE[hi] > PACE[lo] ? (u - PACE[lo]) / (PACE[hi] - PACE[lo]) : 0; return Math.min(TOTAL, (lo + clamp(f)) * PS);
}
function buildPace(caps) {
  const n = Math.ceil(TOTAL / PS) + 2, hard = new Uint8Array(n), iq = x => clamp(Math.round(x / PS), 0, n - 1);
  const acc = v => { PACE = new Float32Array(n); let u = 0; for (let q = 0; q < n; q++) { PACE[q] = u; u += PS / (RATE * lerp(FAST, 1, v[q])); } };
  for (const tr of Object.values(TR)) for (const f of tr) if (f.at > 0) hard.fill(1, iq(f.at), iq(f.at + f.dur) + 1);
  acc(hard); let free = 0;
  const list = caps.map(c => { const tx = c.el.textContent.trim(); return {a: c.a, b: Math.min(c.b, TOTAL), tx, w: tx.split(/\s+/).length, stmt: !!c.words}; }).filter(c => c.tx !== '✓').sort((x, y) => x.a - y.a);
  for (const c of list) {
    const need = c.stmt ? c.w * .25 + 1 : c.w * .3 + .8, IN = .7 + (c.stmt ? c.w * .07 : 0), glance = !c.stmt && c.w <= 3, q1 = iq(c.b - .45);
    const s = glance ? toU(c.a + IN) : Math.max(toU(c.a + IN), free), e = s + need, qs = clamp(iq(toT(s)), iq(c.a + IN), q1);
    const order = []; for (let q = qs; q < q1; q++) order.push(q); for (let q = iq(c.a + IN); q < qs; q++) order.push(q);
    for (let j = 0; j < order.length && toU(c.b - .45) < e;) { let m = 0; for (; j < order.length && m < 10; j++) if (!hard[order[j]]) { hard[order[j]] = 1; m++; } acc(hard); }
    if (!glance) free = e;
  }
  const soft = new Float32Array(n), r = Math.ceil(EASE / PS);
  for (let q = 0; q < n; q++) if (hard[q]) for (let d = -r; d <= r; d++) { const p = q + d; if (p >= 0 && p < n) { const v = sm(1 - Math.abs(d) / r); if (v > soft[p]) soft[p] = v; } }
  acc(soft); UT = PACE[Math.min(n - 1, Math.ceil(TOTAL / PS))];
}

// ---- mount
function mount(root) {
  const stage = root.querySelector('.log-stage'), canvas = root.querySelector('.log-canvas'), ov = root.querySelector('.log-ov');
  const bar = root.querySelector('.log-bar'), skip = root.querySelector('.log-skip'), header = document.querySelector('.site-header');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { root.dataset.state = 'static'; return; }
  alloc(innerWidth >= 1100 ? 20000 : 12000);
  let gl = null;
  try { gl = renderer(canvas, buf, LOOK); } catch (err) { console.error(err); }
  if (!gl) { root.dataset.state = 'static'; return; }
  root.dataset.state = 'live';
  const caps = captions().map(c => {
    const el = document.createElement('div'); el.className = 'fc ' + c.cls + (c.x <= 124 ? ' l' : ''); el.style.left = c.x + 'px'; el.style.top = c.y + 'px'; el.innerHTML = c.h;
    const tx = /\bc\b/.test(c.cls) ? 'translateX(-50%)' : /\br\b/.test(c.cls) ? 'translateX(-100%)' : '';
    const words = c.cls.includes('stmt') ? splitWords(el) : null; if (words) el.style.transform = tx; ov.append(el);
    return {el, a: c.a, b: c.b, tx, words, vis: false};
  });
  buildPace(caps);
  for (const [id] of BEATS) { const i = document.createElement('i'); i.style.left = toU(ST[id][0]) / UT * 100 + '%'; bar.append(i); }

  // Geometry, in document pixels. Under the smooth-scroll layer (skill-scroll.mjs) the section sits in a
  // fixed layer translated by harnessScroll.y, so the stage is pinned by translating it; on native scroll
  // it is position:sticky. docTop is the section's top in document coordinates, range its scroll length.
  const smooth = () => window.harnessScroll && root.closest('[data-scroll-layer]');
  let docTop = 0, range = 1, hh = 0;
  const measure = () => {
    const layer = smooth(), r = root.getBoundingClientRect();
    docTop = layer ? r.top - layer.getBoundingClientRect().top : r.top + scrollY;
    hh = header ? header.getBoundingClientRect().height : 0; range = Math.max(1, root.offsetHeight - stage.offsetHeight);
  };
  const progress = () => (scrollY + hh - docTop) / range;
  const scrollFor = p => docTop - hh + p * range;
  const pin = () => {
    if (!smooth()) { stage.style.transform = ''; return; }
    const top = docTop + window.harnessScroll.y.get();
    stage.style.transform = `translateY(${clamp(hh - top, 0, range)}px)`;
  };

  let t = 0, u = 0, running = false, armed = false, onScreen = false, raf = 0, last = 0, written = -1, settle = 0;
  const go = y => { written = y; window.scrollTo({top: y, behavior: 'instant'}); };
  function paint() {
    const IN = .7;
    for (const cp of caps) {
      let o = 0; if (t >= cp.a && t < cp.b) o = (cp.words ? 1 : eo((t - cp.a) / IN)) * (1 - sm((t - (cp.b - .45)) / .45));
      if (o <= 0) { if (cp.vis) { cp.el.style.opacity = 0; cp.vis = false; } continue; }
      cp.vis = true; cp.el.style.opacity = o;
      if (cp.words) cp.words.forEach((w, j) => { const p = eo((t - cp.a - j * .07) / IN); w.style.opacity = p; w.style.transform = `translateY(${(1 - p) * 16}px)`; });
      else cp.el.style.transform = `${cp.tx} translateY(${(1 - eo((t - cp.a) / IN)) * 8}px)`;
    }
    bar.style.setProperty('--p', u / UT);
  }
  function frame(now) {
    raf = 0; const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
    const p = progress();
    // Above the section the hold is armed; arriving from below (or mid-section on load) it is not, so a
    // reader coming back up is never pulled towards the start.
    if (p <= 0) armed = true; else if (p >= 1) { armed = false; running = false; }
    if (running && scrollY < written - 2) running = false;
    if (!running && armed && t > AUTO_START && u < UT && p < 1 && p * UT > u) running = true;
    if (running) { u = Math.min(UT, u + dt); go(scrollFor(u / UT)); if (u >= UT) running = false; }
    let target = running ? u : clamp(p) * UT;
    if (!running && armed && p > 0 && p < 1 && target - u > MAX_LEAD) { target = u + MAX_LEAD; go(scrollFor(target / UT)); }
    // Forward, the picture moves at play speed and eases in as it arrives; backward it rewinds faster.
    const d = target - u, v = d > 0 ? Math.min(1, d * SMOOTH) : Math.max(1, -d * SMOOTH);
    if (Math.abs(d) > 20) { u = target; gl.reset(); } else u += Math.sign(d) * Math.min(Math.abs(d), v * dt);
    t = toT(u); pin();
    fillBuf(Math.min(t, TOTAL - .001)); gl.draw(t, dt * 60, 1); paint();
    if (onScreen && !document.hidden && (running || Math.abs(target - u) > 1e-4 || --settle > 0)) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  const wake = (frames = 45) => { settle = Math.max(settle, frames); if (!raf && onScreen) raf = requestAnimationFrame(frame); };

  // The stage band (BAND_TOP, BAND_H) is fitted both ways into the stage above the progress bar, and
  // centred; captions set at the stage's left margin (class l) move to the page gutter, which the stage's
  // padding carries.
  const foot = root.querySelector('.log-foot');
  const layout = () => {
    measure();
    const w = stage.clientWidth, full = stage.clientHeight, h = full - foot.offsetHeight; if (!w) return;
    const s = Math.min(w / W, h / BAND_H), ox = (w - W * s) / 2, oy = (h - BAND_H * s) / 2 - BAND_TOP * s;
    ov.style.setProperty('--lx', ((parseFloat(getComputedStyle(stage).paddingLeft) - ox) / s - 120) + 'px');
    ov.style.left = ox + 'px'; ov.style.top = oy + 'px'; ov.style.transform = `scale(${s})`;
    const dpr = Math.min(devicePixelRatio || 1, 1.5); gl.size(Math.round(w * dpr), Math.round(full * dpr)); gl.view(s * dpr, ox * dpr, oy * dpr);
    pin(); wake(3);
  };
  new ResizeObserver(layout).observe(root); layout();
  // Mid-section on load (reload, restored history): start at the scroll position, not the beginning.
  { const p = progress(); if (p > 0) { u = clamp(p) * UT; t = toT(u); } }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) wake(); }, {threshold: 0}).observe(root);
  const follow = () => { pin(); wake(); };
  addEventListener('scroll', follow, {passive: true});
  // skill-scroll.mjs mounts the layer from its own module; pick it up once it exists.
  const hook = () => { if (window.harnessScroll) { window.harnessScroll.y.on('change', pin); measure(); pin(); } };
  hook(); if (!window.harnessScroll) addEventListener('load', hook, {once: true});
  document.addEventListener('visibilitychange', () => { last = 0; wake(); });
  skip.addEventListener('click', () => { running = false; armed = false; window.scrollTo({top: scrollFor(1) + stage.offsetHeight, behavior: 'smooth'}); });
}

const root = document.getElementById('log');
if (root) mount(root);
