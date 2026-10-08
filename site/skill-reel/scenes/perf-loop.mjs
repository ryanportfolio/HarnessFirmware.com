// /perf-loop at final fidelity (pitch A 3.7, re-staged in round 5).
// A Galileo inclined plane as a bench instrument, in clean side elevation: one straight inclined
// track with two fork timing gates; a sled carrying the blank runs down it, and a strip-chart
// recorder traces each run's gate-to-gate time as a bar in a lane: the baseline lane (grey) on
// top, the candidate lane (green) below. Shorter bar, dot further left: faster. No numbers.
// One section of the track is swappable. Below the track, out of the sled's way, a two-pocket
// cradle and a magazine of spare sections do the swaps between runs.
// Round 1: the loop opens on a baseline run (grey dot), then the candidate and the baseline
// alternate on the same workload. A fresh inspector (clean green outline, its own trolley, rail
// and lamp) arrives from off stage right, lowers its caliper head between the lanes, opens the
// jaws across the gap between the two clusters' spreads and sets a green tick plate there; it
// leaves, and only then the candidate is bolted in (bright contacts), the old section drops into
// the retired bin and the candidate's dots rise into the baseline lane.
// Round 2: one baseline run, a second candidate swapped in, one run. A different fresh inspector
// arrives from off stage left, its jaws cannot open (the new dot sits inside the baseline spread),
// it sets an amber cross plate and leaves; the candidate turns amber, drops out, the kept section
// rises back and the candidate returns to the magazine. Hold on that result; the chart then
// advances clean and the amber section cools back to stock.
// Pure function of t. No Math.random, no setTransform. Static geometry lives in cached layers;
// rigid moving parts are drawn once into per-scale sprites and placed each frame.

import {
  W, P, D, MAT, FLOOR, BACK_Y, BENCH_Y, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, indexEase, setLod, lw, cached, grainOver, poly, prism, rect,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, dimension, centreLine,
  benchFinal, lampFalloff,
} from '../kit.mjs';

const T = 10.0;
const sm = (u) => { const v = clamp01(u); return v * v * (3 - 2 * v); };
const sseg = (t, a, b) => sm(seg(t, a, b));
const eOut3 = (u) => 1 - Math.pow(1 - clamp01(u), 3);

// ---------------------------------------------------------------------------------------------
// Sprites: a rigid part drawn once per device scale into a small canvas, then placed by
// translation. The sprite keeps the sub-pixel phase of its reference pose, so at rest it lands on
// the same pixels a direct draw would. One scale is held per key.

const SPR = new Map(), SPR_AT = new Map();
let SCALE = 1; // device scale of the frame being drawn, read once per draw()
function sprite(ctx, key, box, draw) {
  const s = SCALE;
  const id = key + '@' + s.toFixed(5);
  let S = SPR.get(id);
  if (!S) {
    const old = SPR_AT.get(key);
    if (old) SPR.delete(old);
    const [x0, y0, w, h] = box;
    const pad = 3, X0 = s * x0, Y0 = s * y0;
    const ox = X0 - Math.floor(X0), oy = Y0 - Math.floor(Y0);
    const cw = Math.ceil(w * s + ox) + 2 * pad, ch = Math.ceil(h * s + oy) + 2 * pad;
    const cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.translate(pad + ox, pad + oy);
    c.scale(s, s);
    c.translate(-x0, -y0);
    const saved = { ...LOD };
    setLod(c);
    draw(c);
    Object.assign(LOD, saved);
    S = { cv, cw, ch, k: (pad + ox) / s, l: (pad + oy) / s, x0, y0, s };
    SPR.set(id, S);
    SPR_AT.set(key, id);
  }
  return S;
}
function blit(ctx, S, dx = 0, dy = 0) {
  ctx.drawImage(S.cv, S.x0 + dx - S.k, S.y0 + dy - S.l, S.cw / S.s, S.ch / S.s);
}
function boxOf(pts, depth = 0, m = 8) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) {
    for (const z of [0, depth]) {
      const X = x + D.x * z, Y = y + D.y * z;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y;
    }
  }
  return [x0 - m, y0 - m, x1 - x0 + 2 * m, y1 - y0 + 2 * m];
}

// ---------------------------------------------------------------------------------------------
// Geometry. The track runs in a local frame down the incline: x along the track, y along its
// normal (down positive), z into the bench depth. lp() maps local to stage units. The rig sits low
// enough that an inspector on the overhead rail clears its tallest parts (gate posts, winch).

const ANG = (11 * Math.PI) / 180;
const CA = Math.cos(ANG), SA = Math.sin(ANG);
const P0 = { x: 170, y: 380 };
const L = 880, TH = 24, DEP = 44; // track length, rail thickness, rail depth
const SEC = 190, SC = 380, SEL0 = SC - SEC / 2, SEL1 = SC + SEC / 2; // the swappable section
const PITCH = 230; // cradle pocket pitch along the track direction
const DROP = 118; // section top (local y) when it sits in a cradle pocket
const RX = SC + 2 * PITCH; // the magazine's dispensing slot
const MAG_P = 32; // section pitch in the magazine stack (along the normal)
const MAG_TOP = 44; // the magazine's window top (local y): it carries the track's lower end
const GATES = [120, 760];
const GATE_H = 60; // fork gate posts rise this far above the rail; the blank passes the beam
const S_REST = 60, S_END = 800; // sled centre along the track
const LIFT_H = 6;

const lp = (lx, ly, z = 0) => [P0.x + lx * CA - ly * SA + D.x * z, P0.y + lx * SA + ly * CA + D.y * z];
const lrect = (x, y, w, h, z = 0) => [lp(x, y, z), lp(x + w, y, z), lp(x + w, y + h, z), lp(x, y + h, z)];
const ldelta = (dx, dy) => [dx * CA - dy * SA, dx * SA + dy * CA];
const lbox = (x0, y0, x1, y1, depth = 0, m = 8) => boxOf([lp(x0, y0), lp(x1, y0), lp(x1, y1), lp(x0, y1)], depth, m);

// Retired bin on the bench, under the cradle's left pocket when the cradle is indexed.
const BIN = { x0: 196, x1: 432, top: 700 };

// Strip chart: two lanes, baseline (grey) on top, candidate (green) below; between them a band
// where the inspector reads the two spreads.
const CAB = { x: 1170, y: 300, w: 690, h: FLOOR - 300 };
const WIN = { x: 1200, y: 332, w: 630, h: 360 };
const LANE = [{ y: 412, h: 80 }, { y: 540, h: 80 }]; // [baseline, candidate]
const LY = [LANE[0].y + LANE[0].h / 2, LANE[1].y + LANE[1].h / 2];
const BAND = { y0: LANE[0].y + LANE[0].h, y1: LANE[1].y, mid: (LANE[0].y + LANE[0].h + LANE[1].y) / 2 };
const X0 = 1262; // lane start (gate 1)
const T0 = 0.15, KX = 500 / 0.09; // suppressed zero: a 0.24 s run draws a 500-unit bar
const DOT_R = 13, BOX_M = DOT_R + 6;
const PEN_RAIL = [LANE[0].y - 10, LANE[1].y + LANE[1].h + 10];

// ---------------------------------------------------------------------------------------------
// The story in numbers that never appear on screen: drop times (s). B is the baseline section,
// C1 round 1's candidate (kept), C2 round 2's candidate (inside the noise, reverted).

const BOUNCE = 0.03, RET = 0.28;
const RUNS = [
  { s: 0.06, lane: 0, drop: 0.235, jy: -7 }, // B
  { s: 0.98, lane: 1, drop: 0.188, jy: 7, up: -9 }, // C1 (rises into the baseline lane at the keep)
  { s: 1.85, lane: 0, drop: 0.245, jy: 6 }, // B
  { s: 2.78, lane: 1, drop: 0.196, jy: -6, up: 8 }, // C1
  { s: 4.95, lane: 0, drop: 0.192, jy: 0 }, // C1, now the baseline
  { s: 5.83, lane: 1, drop: 0.19, jy: 1, dwell: 0.16 }, // C2 (the sled waits at the foot while the inspector passes over the top)
];
for (const r of RUNS) {
  r.dwell = r.dwell || 0;
  r.tStart = gateTime(r, GATES[0]);
  r.tDot = gateTime(r, GATES[1]);
  r.land = r.s + r.drop;
  r.r0 = r.land + BOUNCE + r.dwell;
  r.r1 = r.r0 + RET;
  r.x = X0 + KX * (r.drop - T0);
  r.y = LY[r.lane] + r.jy;
}
function gateTime(r, g) { return r.s + r.drop * Math.sqrt((g - S_REST) / (S_END - S_REST)); }

// ---------------------------------------------------------------------------------------------
// Timeline. A swap: the section in the track drops into the cradle pocket under the gap, the
// cradle indexes one pitch, the other pocket's section rises into the gap.

const swap = (a) => ({ drop: [a, a + 0.11], shift: [a + 0.11, a + 0.26], rise: [a + 0.26, a + 0.36] });
const S1 = swap(0.61), S2 = swap(1.48), S3 = swap(2.41), S4 = swap(5.46);
const K = {
  load1: [0.12, 0.48], stack1: [0.48, 0.62],
  keep: 3.95, keepTint: [3.98, 4.38], retire: [4.0, 4.3], home1: [4.32, 4.48],
  wipe1: [4.5, 4.8], rise1: [4.55, 4.9],
  load2: [4.5, 4.86], stack2: [4.86, 5.0],
  amber: [7.24, 7.34], dropC2: [7.34, 7.45], home2: [7.46, 7.61], riseC1: [7.62, 7.72],
  stackUp: [7.68, 7.8], returnC2: [7.76, 8.06],
  reset: [9.6, 9.95],
};

// The two inspectors. Each is its own agent: own trolley on the overhead rail, own lamp; the
// first comes from off stage right, the second from off stage left (over the rig, head up).
const HY_UP = 266, HY_DOWN = BAND.y0 - 10; // caliper beam top, stowed and at the band
const INSP = [
  { t0: 2.85, arr: 0.5, xs: 2150, xc: 0, down: [3.1, 3.42], spread: [3.44, 3.68], press: [3.72, 3.84], up: [3.9, 4.2], leave: [4.16, 4.56], xe: 2150, ri: 0 },
  { t0: 6.02, arr: 0.8, xs: -230, xc: 0, down: [6.5, 6.82], spread: [6.84, 7.04], press: [7.07, 7.19], up: [7.23, 7.53], leave: [7.49, 7.89], xe: 2150, ri: 1 },
];

// Cradle index: 0 home (left pocket under the gap), -1 indexed (right pocket under the gap).
function cradle(t) {
  return -sseg(t, ...S1.shift) + sseg(t, ...S2.shift) - sseg(t, ...S3.shift) + sseg(t, ...K.home1)
    - sseg(t, ...S4.shift) + sseg(t, ...K.home2);
}

// Sled: gravity down the incline, rebound on the buffer, wait, winch home (eased, lifted between gates).
function sledPos(t) {
  for (const r of RUNS) {
    if (t < r.s || t >= r.r1) continue;
    const td = t - r.s;
    if (td < r.drop) { const u = td / r.drop; return { x: S_REST + (S_END - S_REST) * u * u, lift: 0 }; }
    if (t < r.land + BOUNCE) return { x: S_END + 10 * Math.sin((Math.PI * (t - r.land)) / BOUNCE), lift: 0 };
    if (t < r.r0) return { x: S_END, lift: 0 };
    const u = (t - r.r0) / RET;
    return { x: lerp(S_END, S_REST, sm(u)), lift: LIFT_H * (sm((u - 0.28) / 0.12) - sm((u - 0.58) / 0.1)) };
  }
  return { x: S_REST, lift: 0 };
}

// A lane's pen: from the lane start to the run's dot while the sled is between the gates
// (constant speed: the bar is the time), back to the start during the return.
function penX(t, lane) {
  for (const r of RUNS) {
    if (r.lane !== lane || t >= r.r1) continue;
    if (t < r.tStart) return X0;
    if (t < r.tDot) return lerp(X0, r.x, (t - r.tStart) / (r.tDot - r.tStart));
    if (t < r.r0) return r.x;
    return lerp(r.x, X0, sm((t - r.r0) / RET));
  }
  return X0;
}

// The lamp: on the rig during the runs, over the chart while an inspector reads, back on the rig
// for the keep, then between the track and the magazine for the revert and the hold.
const ei = (t, a, b) => easeInOut(seg(t, a, b));
const lampX = (t) => 560 + 1066 * (ei(t, 2.85, 3.35) - ei(t, 3.95, 4.4)) + 924 * ei(t, 6.35, 6.85) - 584 * ei(t, 7.24, 7.7) - 340 * ei(t, ...K.reset);

// ---------------------------------------------------------------------------------------------
// Materials.

const RAIL = MAT.lit;
const NEUTRAL = { front: ['#33433a', '#1f2922'], top: '#56705d', side: '#121914', sil: '#6a8d72', hi: '#b3d1b9', line: '#2e3d33' };
const CAND = { front: ['#24563a', '#143020'], top: '#3f8a55', side: '#0c1811', sil: P.green, hi: P.glow, line: '#2a4a33' };
const AMBER = { front: ['#b98a42', '#6e4f22'], top: '#efc87e', side: '#3a2a12', sil: P.amber, hi: '#ffe8b8', line: '#8a6a2e' };
const CRADLE = { front: ['#2c3a31', '#1a221d'], top: '#4a6150', side: '#0f1411', sil: '#5a7c62', hi: '#9cbea3', line: '#2c3a30' };
const SLED = { front: ['#33443a', '#1c251f'], top: '#5b7563', side: '#111713', sil: '#6a8d72', hi: '#b3d1b9', line: '#2e3d33' };
const BEZEL = { front: ['#2a362d', '#1a221c'], top: '#4a6150', side: '#0f1411', sil: '#58795f', hi: '#97b99e', line: '#2c3a30' };
const CAST = { front: ['#26322a', '#141b16'], top: '#3d5243', side: '#0d120f', sil: '#4f6f57', hi: '#86a98e', line: '#2b3a2f' };
const FRESH = MAT.fresh;
const PLATE_OK = { front: ['#3f9a5e', '#1d4d30'], top: '#6fd08c', side: '#0e1d14', sil: P.bright, hi: P.glow, line: '#2f5c40' };
const PLATE_BLANK = { front: ['#1d3a29', '#10241a'], top: '#2f5c40', side: '#0b160f', sil: P.green, hi: P.glow, line: '#2a4a33' };
const INK_BASE = '#c2c9ba';

// ---------------------------------------------------------------------------------------------
// Parts.

const screwRow = (ctx, pts, r = 3.2) => {
  if (LOD.card) return;
  ctx.save();
  ctx.fillStyle = '#0b100c';
  ctx.beginPath();
  for (const [x, y] of pts) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
  ctx.fill();
  ctx.restore();
};

function rail(ctx, l0, l1, mat) {
  prism(ctx, lrect(l0, 0, l1 - l0, TH), DEP, mat, { sil: 3 });
  if (LOD.card) return;
  const a = lp(l0 + 3, 0, DEP * 0.5), b = lp(l1 - 3, 0, DEP * 0.5);
  ctx.save();
  ctx.strokeStyle = '#0b100c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
  const sc = [];
  for (let x = l0 + 30; x < l1 - 20; x += 120) sc.push(lp(x, TH / 2));
  screwRow(ctx, sc, 3);
}

// A track section with its centre at local (SC, TH/2): the rail profile, two bolt heads.
function drawSection(ctx, mat) {
  const cx = SC, ly = 0;
  prism(ctx, lrect(cx - SEC / 2, ly, SEC, TH), DEP, mat, { sil: 3 });
  if (!LOD.card) {
    const a = lp(cx - SEC / 2 + 3, ly, DEP * 0.5), b = lp(cx + SEC / 2 - 3, ly, DEP * 0.5);
    ctx.strokeStyle = '#0b100c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (const u of [cx - SEC / 2 + 15, cx + SEC / 2 - 15]) {
    const p = lp(u, TH / 2);
    ball(ctx, p[0], p[1], 4.6, MAT.lit);
  }
}
const MATS = { n: NEUTRAL, c: CAND, a: AMBER };
const secSprite = (ctx, k) => sprite(ctx, 'pl5-sec-' + k, lbox(SC - SEC / 2 - 6, -8, SC + SEC / 2 + 6, TH + 8, DEP, 6), (c) => drawSection(c, MATS[k]));
// Draw a section at local (x centre, y top), tint: [from key, to key, u].
function section(ctx, lx, ly, k1, k2 = k1, u = 0) {
  const [dx, dy] = ldelta(lx - SC, ly);
  if (u < 1) blit(ctx, secSprite(ctx, k1), dx, dy);
  if (u > 0 && k2 !== k1) {
    ctx.save();
    ctx.globalAlpha *= u;
    blit(ctx, secSprite(ctx, k2), dx, dy);
    ctx.restore();
  }
}

// Fork timing gates: a post behind the rail and one in front, each with an emitter head; the
// beam crosses at the blank's height, the blank's top passes above the posts.
function gateBack(ctx, g) {
  prism(ctx, lrect(g - 6, -GATE_H, 12, GATE_H + TH, DEP + 6), 10, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 10, -GATE_H - 8, 20, 12, DEP + 6), 12, MAT.lit, { sil: 2 });
}
function gateFront(ctx, g) {
  prism(ctx, lrect(g - 7, -GATE_H, 14, GATE_H + TH + 8, -10), 10, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 11, -GATE_H - 8, 22, 14, -12), 14, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 12, TH - 4, 24, 12, -12), 14, MAT.metal, { sil: 2 });
  const e = lp(g, -38, -2);
  ball(ctx, e[0], e[1], 4, MAT.metal);
}
const gateLed = (g) => lp(g, -GATE_H - 1, -12);

// The sled: a machined carriage on two wheels with a chamfered nose, the blank clamped on top.
function drawSled(ctx) {
  const s = S_REST, z = 8;
  const body = [lp(s - 50, -26, z), lp(s + 38, -26, z), lp(s + 52, -18, z), lp(s + 52, -9, z), lp(s - 50, -9, z)];
  prism(ctx, body, 28, SLED, { sil: 2.5 });
  prism(ctx, [lp(s - 30, -26, z + 4), lp(s - 23, -26, z + 4), lp(s - 23, -44, z + 4), lp(s - 30, -44, z + 4)], 20, MAT.lit, { sil: 2 });
  const eye = lp(s - 50, -17, z + 14);
  ctx.save();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.2);
  ctx.beginPath();
  ctx.arc(eye[0] - 5, eye[1], 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const bw = 39, bh = 58, cut = 9, x0 = s - bw / 2 + 4, y0 = -26;
  const pts = [lp(x0, y0, z + 10), lp(x0 + bw, y0, z + 10), lp(x0 + bw, y0 - bh + cut, z + 10), lp(x0 + bw - cut, y0 - bh, z + 10), lp(x0, y0 - bh, z + 10)];
  prism(ctx, pts, 9, MAT.ivory, { sil: 2 });
  const h = lp(x0 + 14, y0 - bh + 10, z + 10);
  ctx.fillStyle = '#1c2620';
  ctx.beginPath();
  ctx.arc(h[0], h[1], 4, 0, Math.PI * 2);
  ctx.fill();
  for (const u of [s - 32, s + 32]) {
    const p = lp(u, -7, z - 2);
    ball(ctx, p[0], p[1], 7.5, MAT.metal);
    ctx.fillStyle = '#86a98e';
    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  screwRow(ctx, [lp(s - 40, -17, z), lp(s + 14, -17, z), lp(s + 32, -17, z)], 2.6);
}
function sledAt(ctx, x, lift) {
  const ref = lp(S_REST, -40);
  const [dx, dy] = ldelta(x - S_REST, -lift);
  blit(ctx, sprite(ctx, 'pl5-sled', [ref[0] - 75, ref[1] - 72, 165, 144], drawSled), dx, dy);
}

function winchSpokes(ctx, x) {
  const c = lp(-30, -12, DEP * 0.5);
  const ang = (x - S_REST) / 22;
  const hook = lp(x - 50, -17, 8 + 14);
  const tan = lp(-30, -36, DEP * 0.5);
  ctx.save();
  ctx.strokeStyle = '#8f988a';
  ctx.lineWidth = lw(2.4);
  ctx.beginPath();
  ctx.moveTo(tan[0], tan[1]);
  ctx.lineTo(hook[0] - 9, hook[1]);
  ctx.stroke();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = ang + (k * Math.PI * 2) / 3;
    ctx.moveTo(c[0] + Math.cos(a) * 7, c[1] + Math.sin(a) * 7);
    ctx.lineTo(c[0] + Math.cos(a) * 20, c[1] + Math.sin(a) * 20);
  }
  ctx.stroke();
  ctx.restore();
}
function winchDrum(ctx) {
  const c = lp(-30, -12, DEP * 0.5);
  const g = ctx.createRadialGradient(c[0] - 8, c[1] - 9, 2, c[0], c[1], 26);
  g.addColorStop(0, '#4b6352');
  g.addColorStop(1, '#141b16');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c[0], c[1], 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  ball(ctx, c[0], c[1], 5.5, MAT.lit);
}
function bufferSpring(ctx, x, direct = false) {
  const comp = clamp01((x - S_END) / 10);
  const x1 = L - 20, len = 30 - 10 * comp, x0 = x1 - len;
  ctx.save();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.4);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    const p = lp(x0 + (len * i) / 8, i % 2 ? -26 : -6, DEP * 0.5);
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.restore();
  const stop = (c) => prism(c, lrect(L - 56, -32, 6, 32, 6), 32, RAIL, { sil: 2 });
  if (direct) stop(ctx);
  else blit(ctx, sprite(ctx, 'pl5-stop', lbox(L - 60, -36, L - 46, 4, 38, 6), stop), ...ldelta(x0 - (L - 50), 0));
}

// The cradle: a plate with two section pockets that indexes one pitch along its rail, under the
// track and behind the sections it carries. Drawn with the left pocket at x = SC (home).
function drawCradle(ctx) {
  const a = SC - 105, b = SC + PITCH + 105;
  const y0 = DROP - 10, y1 = DROP + TH + 18;
  prism(ctx, lrect(a, y0, b - a, y1 - y0, DEP + 4), 14, CRADLE, { sil: 2.5 });
  for (const c of [SC, SC + PITCH]) {
    const p = lrect(c - SEC / 2 - 4, DROP - 4, SEC + 8, TH + 8, DEP + 4);
    ctx.save();
    poly(ctx, p);
    ctx.fillStyle = '#0a0e0b';
    ctx.fill();
    const l0 = lp(c - SEC / 2 - 4, DROP + TH + 4, DEP + 4), l1 = lp(c + SEC / 2 + 4, DROP + TH + 4, DEP + 4);
    ctx.strokeStyle = CRADLE.hi;
    ctx.lineWidth = lw(1.6);
    ctx.beginPath();
    ctx.moveTo(l0[0], l0[1]);
    ctx.lineTo(l1[0], l1[1]);
    ctx.stroke();
    ctx.restore();
  }
  for (const x of [a + 30, SC + PITCH / 2, b - 30]) {
    const p = lp(x, y1 + 4, DEP + 4);
    ball(ctx, p[0], p[1], 7, MAT.lit);
  }
  screwRow(ctx, [lp(a + 12, y0 + 8, DEP + 4), lp(b - 12, y0 + 8, DEP + 4), lp(SC + PITCH / 2, y0 + 8, DEP + 4)], 3);
}
function cradleAt(ctx, c) {
  const [dx, dy] = ldelta(c * PITCH, 0);
  blit(ctx, sprite(ctx, 'pl5-cradle', lbox(SC - 115, DROP - 16, SC + PITCH + 115, DROP + TH + 34, DEP + 20), drawCradle), dx, dy);
}

// ---------------------------------------------------------------------------------------------
// Sections: where each one is at time t. B: the old baseline. C1: round 1's candidate, kept.
// C2: round 2's candidate, reverted (part of the magazine stack until it is loaded).

const pocketX = (c, k) => SC + (c + k) * PITCH; // k = 0 left pocket, 1 right pocket
const dropIn = (t, w) => DROP * sseg(t, ...w); // track to pocket
const riseUp = (t, w) => DROP * (1 - sseg(t, ...w)); // pocket to track
function sectionsAt(t) {
  const c = cradle(t);
  const out = [];
  // B: track, left pocket, track, left pocket, retired bin
  {
    let lx = SC, ly = 0, fall;
    if (t < S1.drop[1]) ly = dropIn(t, S1.drop);
    else if (t < S2.rise[0]) { lx = pocketX(c, 0); ly = DROP; }
    else if (t < S3.drop[0]) ly = riseUp(t, S2.rise);
    else if (t < S3.drop[1]) ly = dropIn(t, S3.drop);
    else if (t < K.retire[0]) { lx = pocketX(c, 0); ly = DROP; }
    else if (t < K.retire[1] + 0.02) { lx = pocketX(c, 0); ly = DROP; fall = 300 * easeIn(seg(t, ...K.retire)); }
    else lx = null;
    if (lx !== null) out.push({ lx, ly, k1: 'n', fall });
  }
  // C1: magazine slot, right pocket, track, right pocket, track (kept), left pocket, track
  {
    let lx = SC, ly = 0, k1 = 'n', k2 = 'c', u = sseg(t, K.load1[0] + 0.05, K.load1[1] - 0.01);
    if (t < K.load1[0]) { lx = RX; ly = DROP; }
    else if (t < K.load1[1]) { lx = lerp(RX, pocketX(0, 1), sseg(t, ...K.load1)); ly = DROP; }
    else if (t < S1.rise[0]) { lx = pocketX(c, 1); ly = DROP; }
    else if (t < S2.drop[0]) ly = riseUp(t, S1.rise);
    else if (t < S2.drop[1]) ly = dropIn(t, S2.drop);
    else if (t < S3.rise[0]) { lx = pocketX(c, 1); ly = DROP; }
    else if (t < S4.drop[0]) ly = riseUp(t, S3.rise);
    else if (t < S4.drop[1]) ly = dropIn(t, S4.drop);
    else if (t < K.riseC1[0]) { lx = pocketX(c, 0); ly = DROP; }
    else ly = riseUp(t, K.riseC1);
    if (t >= K.keep) { k1 = 'c'; k2 = 'n'; u = sseg(t, ...K.keepTint); }
    out.push({ lx, ly, k1, k2, u });
  }
  // C2: out of the magazine, right pocket, track, amber, right pocket, back into the magazine
  if (t >= K.load2[0]) {
    let lx = SC, ly = 0, k1 = 'n', k2 = 'c', u = sseg(t, K.load2[0] + 0.05, K.load2[1] - 0.01);
    if (t < K.load2[1]) { lx = lerp(RX, pocketX(0, 1), sseg(t, ...K.load2)); ly = DROP; }
    else if (t < S4.rise[0]) { lx = pocketX(c, 1); ly = DROP; }
    else if (t < K.dropC2[0]) ly = riseUp(t, S4.rise);
    else if (t < K.dropC2[1]) ly = dropIn(t, K.dropC2);
    else if (t < K.returnC2[0]) { lx = pocketX(c, 1); ly = DROP; }
    else { lx = lerp(pocketX(0, 1), RX, sseg(t, ...K.returnC2)); ly = DROP; }
    if (t >= K.amber[0]) { k1 = 'c'; k2 = 'a'; u = sseg(t, ...K.amber); }
    if (t >= K.reset[0]) { k1 = 'a'; k2 = 'n'; u = sseg(t, ...K.reset); }
    out.push({ lx, ly, k1, k2, u });
  }
  return out;
}

// The magazine stack behind the tracked sections (identical stock sections); j = 0 is the
// dispensing slot at the cradle level. Positions above the window top are clipped away.
function stackSlots(t) {
  const N = 4;
  const at = (j) => DROP - j * MAG_P;
  const list = (from, to, sh) => { const o = []; for (let j = from; j <= to; j++) o.push(at(j) + sh * MAG_P); return o; };
  if (t < K.stack1[0]) return list(1, N, 0);
  if (t < K.stack1[1]) return list(1, N, indexEase(seg(t, ...K.stack1)));
  if (t < K.load2[0]) return list(0, N - 1, 0);
  if (t < K.stack2[0]) return list(1, N, 0);
  if (t < K.stack2[1]) return list(1, N, indexEase(seg(t, ...K.stack2)));
  if (t < K.stackUp[0]) return list(0, N - 1, 0);
  if (t < K.stackUp[1]) return list(0, N - 1, -indexEase(seg(t, ...K.stackUp)));
  return list(1, N, 0);
}

// ---------------------------------------------------------------------------------------------
// Chart.

function drawDot(ctx, cand) {
  const r = DOT_R;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(1.5, 2.5, r, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
  g.addColorStop(0, cand ? '#a4f5ba' : '#eef0e6');
  g.addColorStop(0.45, cand ? P.green : INK_BASE);
  g.addColorStop(1, cand ? '#2f8a4a' : '#7e857a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}
const DOT_BOX = [-DOT_R - 2, -DOT_R - 2, 2 * DOT_R + 6, 2 * DOT_R + 7];
const dotSprite = (ctx, cand) => sprite(ctx, 'pl5-dot-' + (cand ? 1 : 0), DOT_BOX, (c) => drawDot(c, cand));
function dot(ctx, x, y, cand) { blit(ctx, dotSprite(ctx, cand), x, y); }
function dotXfade(ctx, x, y, u) {
  if (u < 1) dot(ctx, x, y, true);
  if (u > 0) { ctx.save(); ctx.globalAlpha *= u; dot(ctx, x, y, false); ctx.restore(); }
}

// Spread of a cluster: x range of its dots with a margin.
const spanOf = (xs) => ({ x0: Math.min(...xs) - BOX_M, x1: Math.max(...xs) + BOX_M });
const R = RUNS;
const SPREAD = [
  { grey: spanOf([R[0].x, R[2].x]), cand: spanOf([R[1].x, R[3].x]) },
  { grey: spanOf([R[1].x, R[3].x, R[4].x]), cand: spanOf([R[5].x]) },
];
// Each inspector parks over the middle of the gap (round 1) or of the overlap (round 2).
INSP[0].xc = (SPREAD[0].cand.x1 + SPREAD[0].grey.x0) / 2;
INSP[1].xc = (Math.max(SPREAD[1].cand.x0, SPREAD[1].grey.x0) + Math.min(SPREAD[1].cand.x1, SPREAD[1].grey.x1)) / 2;
const JC = 29, JB = 9; // jaw outer face from the head centre when closed, blade width
INSP[0].open = SPREAD[0].grey.x0 - INSP[0].xc - JC;
INSP[1].open = 0;
const PLATE = 36, PLATE_Y = BAND.mid;

// The spreads the inspector reads, drawn in the band: the baseline's under its lane, the
// candidate's over its lane; where they overlap (round 2) the band is tinted amber.
function spreads(ctx, ri, a, pulse) {
  if (a <= 0) return;
  const { grey: g, cand: c } = SPREAD[ri];
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(214,220,204,0.08)';
  ctx.fillRect(g.x0, LANE[0].y + 6, g.x1 - g.x0, LANE[0].h - 6);
  ctx.fillStyle = 'rgba(83,219,118,0.1)';
  ctx.fillRect(c.x0, LANE[1].y, c.x1 - c.x0, LANE[1].h - 6);
  const ox0 = Math.max(g.x0, c.x0), ox1 = Math.min(g.x1, c.x1);
  if (ox1 > ox0) {
    ctx.fillStyle = rgba(P.amber, 0.3 + 0.25 * pulse);
    ctx.fillRect(ox0, BAND.y0 + 2, ox1 - ox0, BAND.y1 - BAND.y0 - 4);
  }
  ctx.lineWidth = lw(2.5);
  ctx.lineCap = 'butt';
  const yg = BAND.y0 + 6, yc = BAND.y1 - 6;
  ctx.strokeStyle = 'rgba(214,220,204,0.85)';
  ctx.beginPath();
  ctx.moveTo(g.x0, BAND.y0); ctx.lineTo(g.x0, yg); ctx.lineTo(g.x1, yg); ctx.lineTo(g.x1, BAND.y0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(114,242,140,0.9)';
  ctx.beginPath();
  ctx.moveTo(c.x0, BAND.y1); ctx.lineTo(c.x0, yc); ctx.lineTo(c.x1, yc); ctx.lineTo(c.x1, BAND.y1);
  ctx.stroke();
  ctx.restore();
}

// Verdict plates: chamfered, with a tick (green) or a cross (amber); blank while carried.
const PREF = 1000; // reference x for the inspector's sprites
function drawPlate(c, kind) {
  const x = PREF, y = PLATE_Y, h = PLATE / 2, k = 6;
  const pts = [[x - h + k, y - h], [x + h - k, y - h], [x + h, y - h + k], [x + h, y + h - k], [x + h - k, y + h], [x - h + k, y + h], [x - h, y + h - k], [x - h, y - h + k]];
  prism(c, pts, 6, kind === 'ok' ? PLATE_OK : kind === 'no' ? AMBER : PLATE_BLANK, { sil: 2.5 });
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = lw(5);
  if (kind === 'ok') {
    c.strokeStyle = '#effff3';
    c.beginPath();
    c.moveTo(x - 10, y + 1); c.lineTo(x - 3, y + 9); c.lineTo(x + 11, y - 9);
    c.stroke();
  } else if (kind === 'no') {
    c.strokeStyle = '#3a2a12';
    c.beginPath();
    c.moveTo(x - 9, y - 9); c.lineTo(x + 9, y + 9);
    c.moveTo(x + 9, y - 9); c.lineTo(x - 9, y + 9);
    c.stroke();
  } else {
    c.fillStyle = '#0b160f';
    c.beginPath();
    c.arc(x - h + 7, y - h + 7, 2.2, 0, Math.PI * 2);
    c.arc(x + h - 7, y - h + 7, 2.2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
const PLATE_BOX = [PREF - PLATE / 2 - 6, PLATE_Y - PLATE / 2 - 10, PLATE + 16, PLATE + 16];
const plateSprite = (ctx, kind) => sprite(ctx, 'pl5-plate-' + kind, PLATE_BOX, (c) => drawPlate(c, kind));
function plateAt(ctx, x, y, kind, glyph = 1) {
  if (glyph < 1) blit(ctx, plateSprite(ctx, 'blank'), x - PREF, y - PLATE_Y);
  if (glyph > 0) {
    ctx.save();
    ctx.globalAlpha *= glyph;
    blit(ctx, plateSprite(ctx, kind), x - PREF, y - PLATE_Y);
    ctx.restore();
  }
}

// Wipes: the chart advances right out of the window (old baseline at the keep; everything at the reset).
const wipeAt = (t, w) => 700 * easeIn(seg(t, ...w));

function chart(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.clip();
  const w1 = wipeAt(t, K.wipe1), w2 = wipeAt(t, K.reset);
  const gone1 = t >= K.wipe1[1], gone2 = t >= K.reset[1];
  // bars: the pen's trace for the run in progress, fading after the dot lands
  for (const r of RUNS) {
    if (t < r.tStart || t > r.tDot + 0.75) continue;
    const end = t < r.tDot ? penX(t, r.lane) : r.x;
    const fade = 1 - seg(t, r.tDot + 0.15, r.tDot + 0.75);
    ctx.strokeStyle = rgba(r.lane ? P.bright : '#e4e8dc', (r.lane ? 0.85 : 0.7) * fade);
    ctx.lineWidth = lw(6);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(X0, r.y);
    ctx.lineTo(end, r.y);
    ctx.stroke();
  }
  // spreads read by the inspectors
  const I0 = INSP[0], I1 = INSP[1];
  if (!gone1 && t >= I0.down[1] - 0.12) {
    ctx.save();
    ctx.translate(w1, 0);
    spreads(ctx, 0, seg(t, I0.down[1] - 0.12, I0.down[1]), 0);
    ctx.restore();
  }
  if (!gone2 && t >= I1.down[1] - 0.12) {
    ctx.save();
    ctx.translate(w2, 0);
    spreads(ctx, 1, seg(t, I1.down[1] - 0.12, I1.down[1]), Math.sin(Math.PI * seg(t, ...I1.spread)));
    ctx.restore();
  }
  // dots
  for (let i = 0; i < RUNS.length; i++) {
    const r = RUNS[i];
    if (t < r.tDot) continue;
    if (i === 0 || i === 2) { if (!gone1) dot(ctx, r.x + w1, r.y, false); continue; }
    if (gone2) continue;
    if (i === 1 || i === 3) {
      const u = sseg(t, ...K.rise1);
      if (u <= 0) dot(ctx, r.x, r.y, true);
      else dotXfade(ctx, r.x + w2, lerp(r.y, LY[0] + r.up, u), u);
      continue;
    }
    dot(ctx, r.x + w2, r.y, i === 5);
  }
  // verdict plates on the glass
  if (t >= I0.press[0] + 0.06 && !gone1) plateAt(ctx, I0.xc + w1, PLATE_Y, 'ok', seg(t, I0.press[0] + 0.04, I0.press[1]));
  if (t >= I1.press[0] + 0.06 && !gone2) plateAt(ctx, I1.xc + w2, PLATE_Y, 'no', seg(t, I1.press[0] + 0.04, I1.press[1]));
  ctx.restore();
}

// Pens: one per lane on its own guide rod; the baseline pen hangs from above, the candidate's
// rises from below.
function drawPen(ctx, lane) {
  const x = X0, y = LY[lane], s = lane ? -1 : 1, yr = PEN_RAIL[lane];
  prism(ctx, rect(x - 9, yr - 11, 18, 22), 10, MAT.lit, { sil: 2 });
  ctx.fillStyle = '#1a231c';
  poly(ctx, [[x - 6, yr + s * 10], [x + 6, yr + s * 10], [x, y - s * 7]]);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2);
  ctx.stroke();
  ctx.fillStyle = lane ? P.green : INK_BASE;
  ctx.beginPath();
  ctx.arc(x, y - s * 7, 3.4 * LOD.k, 0, Math.PI * 2);
  ctx.fill();
}
function pen(ctx, t, lane) {
  const yr = PEN_RAIL[lane], y = LY[lane];
  const y0 = Math.min(yr, y) - 16, y1 = Math.max(yr, y) + 16;
  blit(ctx, sprite(ctx, 'pl5-pen' + lane, [X0 - 22, y0, 44, y1 - y0], (c) => drawPen(c, lane)), penX(t, lane) - X0, 0);
}

// ---------------------------------------------------------------------------------------------
// The inspector: a fresh agent on its own trolley. Trolley wheels run on the overhead rail's
// lower flange; two telescoping hangers carry the caliper head (a beam with two jaws that open
// outward, a blank verdict plate held between them); a lamp on the trolley's nose.

const RAIL_Y = 226, RAIL_H = 14; // the overhead rail: y 226 to 240, clear of the caption band
const TB = RAIL_Y + RAIL_H + 2; // trolley body top
function drawTrolley(c) {
  const x = PREF;
  for (const s of [-1, 1]) prism(c, rect(x + s * 46 - 5, RAIL_Y + 6, 10, TB - RAIL_Y), 8, FRESH, { sil: 2 });
  prism(c, [[x - 72, TB], [x + 64, TB], [x + 72, TB + 7], [x + 72, TB + 20], [x - 72, TB + 20]], 16, FRESH, { sil: 2.5 });
  for (const s of [-1, 1]) prism(c, rect(x + s * 60 - 6, TB + 20, 12, 8), 10, FRESH, { sil: 2 });
  // lamp hood on the nose
  prism(c, [[x + 74, TB + 2], [x + 92, TB + 2], [x + 100, TB + 22], [x + 68, TB + 22]], 12, FRESH, { sil: 2 });
  for (const s of [-1, 1]) {
    ball(c, x + s * 46, RAIL_Y + 8, 7, FRESH);
    c.fillStyle = '#0e1d14';
    c.beginPath();
    c.arc(x + s * 46, RAIL_Y + 8, 2.2, 0, Math.PI * 2);
    c.fill();
  }
  screwRow(c, [[x - 60, TB + 10], [x - 20, TB + 10], [x + 20, TB + 10], [x + 54, TB + 10]], 2.4);
}
const LENS = [PREF + 84, TB + 22];
function drawBeam(c) {
  const x = PREF, y = HY_DOWN;
  prism(c, rect(x - 96, y, 192, 12), 12, FRESH, { sil: 2.5 });
  if (!LOD.card) {
    c.strokeStyle = 'rgba(164,245,186,0.5)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = -10; i <= 10; i++) { const xx = x + i * 8; c.moveTo(xx, y); c.lineTo(xx, y + (i % 5 === 0 ? 7 : 4)); }
    c.stroke();
  }
  for (const s of [-1, 1]) ball(c, x + s * 60, y - 1, 5, FRESH);
}
// Jaw s = -1 (left) or 1 (right), closed: outer (measuring) face at s * JC from the centre.
function drawJaw(c, s) {
  const xo = PREF + s * JC, xi = xo - s * JB, y1 = HY_DOWN + 12, y2 = HY_DOWN + 50;
  prism(c, rect(Math.min(xo, xi) - 3, HY_DOWN - 5, JB + 6, 19), 16, FRESH, { sil: 2 });
  prism(c, [[xo, y1], [xi, y1], [xi, y2 - 7], [xi + s * 5, y2], [xo, y2]], 10, FRESH, { sil: 2 });
}
function inspPose(t, I) {
  if (t < I.t0 || t >= I.leave[1]) return null;
  let x;
  if (t < I.t0 + I.arr) x = lerp(I.xs, I.xc, eOut3(seg(t, I.t0, I.t0 + I.arr)));
  else x = lerp(I.xc, I.xe, easeIn(seg(t, ...I.leave)));
  const down = easeOut(seg(t, ...I.down)) * (1 - easeIn(seg(t, ...I.up)));
  const hy = lerp(HY_UP, HY_DOWN, down);
  let open;
  if (I.open > 0) open = I.open * easeInOut(seg(t, ...I.spread)) * (1 - easeInOut(seg(t, I.up[0] - 0.04, I.up[0] + 0.14)));
  else open = 4 * Math.sin(Math.PI * seg(t, ...I.spread)); // blocked: the jaws push and stop
  const lamp = seg(t, I.down[0] - 0.15, I.down[0] + 0.1) * (1 - seg(t, I.up[0], I.up[0] + 0.25));
  return { x, hy, open, lamp, carried: t < I.press[0] + 0.06, I };
}
function inspector(ctx, p) {
  const dx = p.x - PREF, dy = p.hy - HY_DOWN;
  // hangers: sleeves on the trolley, rods down to the beam
  const len = p.hy + 2 - (TB + 26);
  if (len > 0.5) {
    // one full-length rod sprite, cropped to the extended length
    const S = sprite(ctx, 'pl5-hanger', [PREF - 60 - 6, TB + 26, 12, HY_DOWN + 2 - (TB + 26)], (c) => rodV(c, PREF - 60, TB + 26, HY_DOWN + 2, 6, FRESH));
    const sh = Math.min(S.ch, Math.ceil((S.l + len) * S.s));
    for (const s of [-1, 1]) ctx.drawImage(S.cv, 0, 0, S.cw, sh, S.x0 + p.x - PREF + (s + 1) * 60 - S.k, S.y0 - S.l, S.cw / S.s, sh / S.s);
  }
  blit(ctx, sprite(ctx, 'pl5-trolley', [PREF - 80, RAIL_Y - 4, 190, TB + 30 - RAIL_Y], drawTrolley), dx, 0);
  blit(ctx, sprite(ctx, 'pl5-beam', [PREF - 104, HY_DOWN - 10, 208, 30], drawBeam), dx, dy);
  for (const s of [-1, 1]) blit(ctx, sprite(ctx, 'pl5-jaw' + s, [PREF + s * JC - 16, HY_DOWN - 12, 32, 66], (c) => drawJaw(c, s)), dx + s * p.open, dy);
  if (p.carried) plateAt(ctx, p.x, PLATE_Y + dy, 'blank', 0);
  // the lens
  const on = p.lamp;
  ball(ctx, LENS[0] + dx, LENS[1], 5, { ...FRESH, top: mix('#2f6141', '#e9fff0', on), hi: '#ffffff' });
  if (!LOD.card && p.open > 24) dimension(ctx, p.x - JC - p.open, p.hy + 50, p.x + JC + p.open, p.hy + 50, 16, 0.75);
}
// The inspector's own light: a cone from the lens and a pool on the chart glass.
function inspectorLight(ctx, p) {
  if (p.lamp <= 0) return;
  const lx = LENS[0] + p.x - PREF, ly = LENS[1];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, ly, 0, LANE[1].y + LANE[1].h);
  g.addColorStop(0, `rgba(205,245,215,${0.16 * p.lamp})`);
  g.addColorStop(1, 'rgba(205,245,215,0)');
  ctx.fillStyle = g;
  poly(ctx, [[lx - 7, ly], [lx + 7, ly], [p.x + 170, LANE[1].y + LANE[1].h], [p.x - 170, LANE[1].y + LANE[1].h]]);
  ctx.fill();
  ctx.restore();
  softGlow(ctx, p.x, BAND.mid, 230, '#cdf5d7', 0.11 * p.lamp);
  softGlow(ctx, lx, ly + 2, 16, P.glow, 0.7 * p.lamp);
}

// ---------------------------------------------------------------------------------------------
// The lamp's pool on the bench and wall at the active station (the cached bench keeps a dim one).

// The pool is drawn once into a sprite at a reference x and slid along with the lamp.
function drawPool(c) {
  const x = PREF;
  c.save();
  c.beginPath();
  c.rect(x - 520, BACK_Y, 1040, BENCH_Y - BACK_Y);
  c.clip();
  c.translate(x, FLOOR - 6);
  c.scale(1, 0.13);
  let g = c.createRadialGradient(0, 0, 0, 0, 0, 520);
  g.addColorStop(0, 'rgba(225,240,225,0.24)');
  g.addColorStop(1, 'rgba(225,240,225,0)');
  c.fillStyle = g;
  c.fillRect(-520, -520, 1040, 1040);
  c.restore();
  g = c.createRadialGradient(x, 520, 0, x, 520, 560);
  g.addColorStop(0, 'rgba(150,215,170,0.11)');
  g.addColorStop(1, 'rgba(150,215,170,0)');
  c.fillStyle = g;
  c.fillRect(x - 560, RAIL_Y + RAIL_H, 1120, BACK_Y - RAIL_Y - RAIL_H);
}
function lampPool(ctx, x) {
  blit(ctx, sprite(ctx, 'pl5-pool', [PREF - 560, RAIL_Y + RAIL_H, 1120, BENCH_Y - RAIL_Y - RAIL_H], drawPool), x - PREF, 0);
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 640, 560);
  // the inspectors' overhead rail: an I-beam on wall standoffs, the full width of the stage
  for (let x = 120; x < W; x += 400) prism(ctx, rect(x - 7, RAIL_Y + 3, 14, 9), 14, MAT.metal, { sil: 2 });
  rodH(ctx, 0, W, RAIL_Y + RAIL_H / 2, RAIL_H, MAT.lit);
  ctx.fillStyle = '#0b100c';
  ctx.fillRect(0, RAIL_Y + 4, W, 2);
  ctx.fillRect(0, RAIL_Y + RAIL_H - 6, W, 2);
  // the upper end's leg: a column on a foot plate, the winch post above it
  const leg = lp(10, TH);
  contactShadow(ctx, leg[0] + 4, FLOOR - 4, 52, 10, 0.55);
  prism(ctx, rect(leg[0] - 24, FLOOR - 10, 44, 10), 36, MAT.metal, { sil: 2.5 });
  rodV(ctx, leg[0], leg[1] + 6, FLOOR - 10, 16, MAT.lit);
  prism(ctx, rect(leg[0] - 12, leg[1] + 2, 24, 22), 22, MAT.lit, { sil: 2.5 });
  const wc = lp(-30, -12, DEP * 0.5);
  prism(ctx, rect(wc[0] - 8, wc[1], 16, leg[1] - wc[1] + 10), 14, MAT.metal, { sil: 2 });
  // the cradle's rail, behind the cradle: its upper end clamps to the leg, a braced post stands
  // under the middle
  const r0 = lp(30, DROP + TH + 26, DEP + 22);
  prism(ctx, lrect(30, DROP + TH + 26, RX - 60 - 30, 12, DEP + 22), 10, MAT.metal, { sil: 2 });
  prism(ctx, rect(leg[0] - 12, r0[1] - 4, 24, 20), 30, MAT.lit, { sil: 2 });
  {
    const p = lp(500, DROP + TH + 38, DEP + 22), fy = FLOOR - 14;
    contactShadow(ctx, p[0] + 8, fy + 2, 40, 7, 0.55);
    prism(ctx, rect(p[0] - 7, p[1], 14, fy - 8 - p[1]), 14, MAT.metal, { sil: 2 });
    prism(ctx, [[p[0] - 7, p[1]], [p[0] - 30, p[1]], [p[0] - 7, p[1] + 24]], 8, MAT.metal, { sil: 1.5 });
    prism(ctx, [[p[0] + 7, p[1]], [p[0] + 30, p[1]], [p[0] + 7, p[1] + 24]], 8, MAT.metal, { sil: 1.5 });
    prism(ctx, rect(p[0] - 20, fy - 8, 40, 8), 28, MAT.lit, { sil: 2 });
    screwRow(ctx, [[p[0] - 14, fy - 4], [p[0] + 14, fy - 4]], 2.4);
  }
  // retired bin: back wall and the dark inside
  contactShadow(ctx, (BIN.x0 + BIN.x1) / 2 + 16, FLOOR - 2, 140, 12, 0.6);
  prism(ctx, rect(BIN.x0, BIN.top, BIN.x1 - BIN.x0, FLOOR - 8 - BIN.top), 46, CAST, { sil: 2.5 });
  ctx.fillStyle = '#070a08';
  ctx.fillRect(BIN.x0 + 8, BIN.top + 4, BIN.x1 - BIN.x0 - 16, FLOOR - 8 - BIN.top - 4);
  // the magazine pedestal: a ribbed column with a saddle matching the magazine's tilt, on a
  // bolted base flange
  {
    const a = lp(RX - 50, DROP + TH + 30), b = lp(RX + 50, DROP + TH + 30), fy = FLOOR - 10;
    contactShadow(ctx, (a[0] + b[0]) / 2 + 18, FLOOR - 3, 120, 13, 0.6);
    prism(ctx, [a, b, [b[0], fy], [a[0], fy]], 40, CAST, { sil: 2.5 });
    for (const u of [0.3, 0.7]) {
      const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u);
      prism(ctx, rect(x - 4, y + 2, 8, fy - y - 2), 5, MAT.lit, { sil: 1.5 });
    }
    prism(ctx, lrect(RX - 66, DROP + TH + 20, 132, 10, -2), 46, MAT.lit, { sil: 2.5 });
    prism(ctx, rect(a[0] - 16, fy, b[0] - a[0] + 32, 10), 54, MAT.lit, { sil: 2.5 });
    if (!LOD.card) for (const x of [a[0] - 7, b[0] + 7]) ball(ctx, x, fy + 5, 3.4, MAT.metal);
  }
  // magazine back plate
  prism(ctx, lrect(RX - 112, MAG_TOP - 14, 224, DROP + TH + 34 - MAG_TOP), 10, MAT.metal, { sil: 2.5 });
  // chart recorder cabinet, lit bezel, window, the two lanes
  contactShadow(ctx, CAB.x + CAB.w / 2 + 20, FLOOR - 4, 340, 22, 0.6);
  prism(ctx, rect(CAB.x, CAB.y, CAB.w, CAB.h), 64, MAT.metal, { sil: 3 });
  const bz = 14;
  prism(ctx, rect(WIN.x - bz, WIN.y - bz, WIN.w + 2 * bz, bz), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x - bz, WIN.y + WIN.h, WIN.w + 2 * bz, bz), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x - bz, WIN.y, bz, WIN.h), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x + WIN.w, WIN.y, bz, WIN.h), 10, BEZEL, { sil: 2 });
  const g = ctx.createLinearGradient(WIN.x, WIN.y, WIN.x + WIN.w, WIN.y + WIN.h);
  g.addColorStop(0, '#1c271f');
  g.addColorStop(0.55, '#26332a');
  g.addColorStop(1, '#202b23');
  ctx.fillStyle = g;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  // lanes: tinted bands, a colour swatch at each lane's head, the start rule (gate 1) and a grid
  for (const [i, col, sw] of [[0, 'rgba(214,220,204,0.09)', INK_BASE], [1, 'rgba(83,219,118,0.09)', P.green]]) {
    const ln = LANE[i];
    ctx.fillStyle = col;
    ctx.fillRect(WIN.x + 10, ln.y, WIN.w - 20, ln.h);
    ctx.strokeStyle = i ? 'rgba(83,219,118,0.35)' : 'rgba(214,220,204,0.3)';
    ctx.lineWidth = lw(1.5);
    ctx.strokeRect(WIN.x + 10, ln.y, WIN.w - 20, ln.h);
    ctx.fillStyle = sw;
    ctx.fillRect(WIN.x + 18, ln.y + 14, 22, ln.h - 28);
  }
  if (!LOD.card) {
    ctx.strokeStyle = '#2c3c30';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = X0 + 52.5; x < WIN.x + WIN.w - 10; x += 52.5) { ctx.moveTo(x, LANE[0].y); ctx.lineTo(x, LANE[1].y + LANE[1].h); }
    ctx.stroke();
  }
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.moveTo(X0, LANE[0].y - 6);
  ctx.lineTo(X0, LANE[1].y + LANE[1].h + 6);
  ctx.stroke();
  // pen guide rods above the baseline lane and below the candidate lane
  for (const y of PEN_RAIL) rodH(ctx, X0 - 20, WIN.x + WIN.w - 14, y, 6, MAT.lit);
  prism(ctx, rect(CAB.x - 10, FLOOR - 14, CAB.w + 20, 14), 70, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (const x of [CAB.x + 60, CAB.x + 110]) ball(ctx, x, WIN.y + WIN.h + 40, 9, MAT.lit);
}

// Static parts in front of the cradle and sections, behind the sled.
function midLayer(ctx) {
  rail(ctx, 0, SEL0 - 6, RAIL);
  rail(ctx, SEL1 + 6, L, RAIL);
  for (const g of GATES) gateBack(ctx, g);
  prism(ctx, lrect(L - 20, -40, 20, 40 + TH), DEP, RAIL, { sil: 2.5 });
  winchDrum(ctx);
}

function frontLayer(ctx) {
  for (const g of GATES) gateFront(ctx, g);
  for (const g of GATES) {
    if (!LOD.card) {
      const a = lp(g, -38, -2), b = lp(g, -38, DEP + 6);
      ctx.strokeStyle = rgba(P.green, 0.18);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    const led = gateLed(g);
    ball(ctx, led[0], led[1], 5, MAT.metal);
  }
  // magazine frame: posts either side of the stack (open at the bottom slot on the cradle side),
  // the cap under the track's lower end, the floor of the slot
  prism(ctx, lrect(RX - 118, MAG_TOP - 14, 236, 14, -4), 20, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(RX - 118, MAG_TOP, 12, DROP - 10 - MAG_TOP, -4), 16, MAT.lit, { sil: 2 });
  prism(ctx, lrect(RX + 106, MAG_TOP, 12, DROP + TH + 20 - MAG_TOP, -4), 16, MAT.lit, { sil: 2 });
  prism(ctx, lrect(RX - 118, DROP + TH + 6, 236, 14, -4), 20, MAT.lit, { sil: 2 });
  screwRow(ctx, [lp(RX - 112, MAG_TOP - 7, -4), lp(RX + 112, MAG_TOP - 7, -4)], 3);
  // retired bin: a tapered front wall with two ribs, a rolled lip, two feet
  {
    const { x0, x1, top } = BIN, fy = FLOOR - 8;
    for (const x of [x0 + 18, x1 - 44]) prism(ctx, rect(x, fy, 26, 8), 34, MAT.lit, { sil: 2 });
    prism(ctx, [[x0, top + 12], [x1, top + 12], [x1 - 7, fy], [x0 + 7, fy]], 8, CAST, { sil: 2.5 });
    for (const u of [0.33, 0.67]) {
      const x = lerp(x0, x1, u);
      prism(ctx, rect(x - 4, top + 22, 8, fy - top - 26), 4, MAT.lit, { sil: 1.5 });
    }
    rodH(ctx, x0 - 5, x1 + 5, top + 12, 10, MAT.lit);
  }
  // chart rollers and window lip
  rodV(ctx, WIN.x + 16, WIN.y + 2, WIN.y + WIN.h - 2, 22, MAT.lit);
  rodV(ctx, WIN.x + WIN.w - 16, WIN.y + 2, WIN.y + WIN.h - 2, 22, MAT.lit);
  ctx.strokeStyle = '#5f8167';
  ctx.lineWidth = lw(2.5);
  ctx.strokeRect(WIN.x, WIN.y, WIN.w, WIN.h);
  if (!LOD.card) {
    centreLine(ctx, ...lp(-20, TH / 2), ...lp(L + 20, TH / 2), 0.35);
    const a = lp(GATES[0], TH), b = lp(GATES[1], TH);
    dimension(ctx, a[0], a[1], b[0], b[1], 30, 0.5);
  }
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'perf-loop',
  name: '/perf-loop',
  caption: 'Run measured optimization rounds with independent review',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    SCALE = LOD.pxu;
    cached(ctx, 'perf-loop5-back', backLayer);
    const lx = lampX(t);
    lampPool(ctx, lx);

    // chart: bars, dots, spreads, plates; the pens
    chart(ctx, t);
    pen(ctx, t, 0);
    pen(ctx, t, 1);

    // the cradle, the tracked sections (before the stack, so the stack's overlaps never change),
    // the magazine stack clipped to its window, the falling section clipped to the bin
    cradleAt(ctx, cradle(t));
    const secs = sectionsAt(t);
    for (const s of secs) if (s.fall === undefined) section(ctx, s.lx, s.ly, s.k1, s.k2 ?? s.k1, s.u ?? 0);
    ctx.save();
    poly(ctx, lrect(RX - 150, MAG_TOP, 300, DROP + TH + 40 - MAG_TOP));
    ctx.clip();
    for (const y of stackSlots(t)) section(ctx, RX, y, 'n');
    ctx.restore();
    for (const s of secs) {
      if (s.fall === undefined) continue;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, BIN.top - 2);
      ctx.rect(BIN.x0 + 3, BIN.top - 2, BIN.x1 - BIN.x0 - 6, FLOOR - BIN.top - 6);
      ctx.clip();
      ctx.translate(0, s.fall);
      section(ctx, s.lx, s.ly, s.k1);
      ctx.restore();
    }

    cached(ctx, 'perf-loop5-mid', midLayer);
    const sled = sledPos(t);
    winchSpokes(ctx, sled.x);
    if (sled.x > S_END) bufferSpring(ctx, sled.x);
    else blit(ctx, sprite(ctx, 'pl5-buffer-rest', lbox(L - 70, -50, L - 10, 10, 40), (k) => bufferSpring(k, S_END, true)));
    contactShadow(ctx, ...lp(sled.x, -2, 22), 52, 7, 0.5 * (1 - sled.lift / (LIFT_H * 3)));
    sledAt(ctx, sled.x, sled.lift);

    cached(ctx, 'perf-loop5-front', frontLayer);

    const poses = INSP.map((I) => inspPose(t, I)).filter(Boolean);
    for (const p of poses) inspector(ctx, p);

    lampFalloff(ctx, lx, 560, 340, 1000, 0.78);

    // light: the inspectors' lamps, gate lamps, dot landings, section seating, the keep's bolts,
    // the jaws' contacts, the verdicts, the revert
    for (const p of poses) inspectorLight(ctx, p);
    for (const g of GATES) {
      let lit = 0;
      for (const r of RUNS) {
        const u = (t - gateTime(r, g)) / 0.16;
        if (u > 0 && u < 1) lit = Math.max(lit, 1 - u);
      }
      if (lit <= 0) continue;
      const led = gateLed(g);
      ball(ctx, led[0], led[1], 5, { ...MAT.fresh, top: mix('#2f6141', P.bright, lit), hi: '#e9fff0' });
      softGlow(ctx, led[0], led[1], 26, P.bright, 0.55 * lit);
    }
    for (const r of RUNS) contactGlow(ctx, r.x, r.y, (t - r.tDot) / 0.12, 26, r.lane ? P.bright : '#e4e8dc');
    for (const tk of [S1.rise[1], S2.rise[1], S3.rise[1], S4.rise[1], K.riseC1[1]]) contactGlow(ctx, ...lp(SC, TH / 2), (t - tk) / 0.12, 34);
    for (const sx of [SEL0 + 15, SEL1 - 15]) contactGlow(ctx, ...lp(sx, TH / 2), (t - K.keep) / 0.14, 46);
    {
      const I = INSP[0], xl = I.xc - JC - I.open, xr = I.xc + JC + I.open, u = (t - I.spread[1]) / 0.12;
      contactGlow(ctx, xl, BAND.mid, u, 28);
      contactGlow(ctx, xr, BAND.mid, u, 28);
      contactGlow(ctx, I.xc, PLATE_Y, (t - I.press[1] + 0.06) / 0.14, 40);
      // the tick stays lit until the chart advances
      const on = seg(t, I.press[1], I.press[1] + 0.2) * (1 - seg(t, K.wipe1[0], K.wipe1[0] + 0.15));
      softGlow(ctx, I.xc + wipeAt(t, K.wipe1), PLATE_Y, 44, P.green, 0.16 * on);
    }
    {
      const I = INSP[1];
      softGlow(ctx, I.xc, BAND.mid, 48, P.amber, 0.32 * Math.sin(Math.PI * seg(t, ...I.spread)));
      contactGlow(ctx, I.xc, PLATE_Y, (t - I.press[1] + 0.06) / 0.14, 40, P.amber);
      // the amber verdict stays lit through the hold, until the chart advances
      const hold = seg(t, I.press[1], I.press[1] + 0.2) * (1 - seg(t, K.reset[0], K.reset[0] + 0.15));
      softGlow(ctx, I.xc + wipeAt(t, K.reset), PLATE_Y, 44, P.amber, 0.18 * hold);
    }
    const rv = seg(t, K.amber[0], K.amber[1]) * (1 - seg(t, K.reset[0], K.reset[1]));
    if (rv > 0) {
      const s = sectionsAt(t).find((q) => q.k2 === 'a' || q.k1 === 'a');
      if (s) softGlow(ctx, ...lp(s.lx, s.ly + TH / 2), 130, P.amber, 0.22 * rv);
    }
    dust(ctx, (BIN.x0 + BIN.x1) / 2, BIN.top + 10, t - K.retire[1] + 0.04, 0x7e1, { ang: -Math.PI / 2, spread: 1.6, n: 8, dur: 0.4 });

    grainOver(ctx, 0.3, 'soft-light');
  },
};
