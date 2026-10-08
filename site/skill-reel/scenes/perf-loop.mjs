// /perf-loop at final fidelity (pitch A 3.7, re-laid out in round 4).
// A Galileo inclined plane as a bench instrument, in clean side elevation: one straight inclined
// track with two timing gates; a sled carrying the blank runs down it, and a strip-chart recorder
// traces each run's gate-to-gate time as a bar in its own lane: the baseline lane (grey) on top,
// the candidate lane (green) below. Shorter bar, dot further left: faster. No numbers.
// One section of the track is swappable. Below the track, out of the sled's way, a two-pocket
// cradle and a magazine of spare sections do the swap: the candidate leaves the magazine, the
// baseline drops out of the track into the cradle, the cradle indexes, the candidate rises in.
// A fresh caliper drops in over the chart, spans the gap between the two lanes' clusters, holds,
// and lifts out. Round 1: a clear gap; KEEP: the candidate is bolted in with a bright contact, its
// dots become the new baseline, the old section drops into the retired bin. Round 2: the clusters
// overlap, the caliper cannot open; REVERT: the candidate turns amber, drops out, the baseline
// rises back, and the candidate returns to the magazine. Hold.
// Pure function of t. No Math.random, no setTransform. Static geometry lives in cached layers;
// rigid moving parts are drawn once into per-scale sprites and placed each frame.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, indexEase, setLod, lw, cached, grainOver, poly, prism, rect,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, dimension, centreLine,
  benchFinal, lampFalloff, activeMat,
} from '../kit.mjs';

const T = 10.0;
const sm = (u) => { const v = clamp01(u); return v * v * (3 - 2 * v); };
const sseg = (t, a, b) => sm(seg(t, a, b));

// ---------------------------------------------------------------------------------------------
// Sprites: a rigid part drawn once per device scale into a small canvas, then placed by
// translation. The sprite keeps the sub-pixel phase of its reference pose, so at rest it lands on
// the same pixels a direct draw would. One scale is held per key.

const SPR = new Map(), SPR_AT = new Map();
function sprite(ctx, key, box, draw) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
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
// normal (down positive), z into the bench depth. lp() maps local to stage units.

const ANG = (13 * Math.PI) / 180;
const CA = Math.cos(ANG), SA = Math.sin(ANG);
const P0 = { x: 170, y: 320 };
const L = 880, TH = 24, DEP = 44; // track length, rail thickness, rail depth
const SEC = 190, SC = 380, SEL0 = SC - SEC / 2, SEL1 = SC + SEC / 2; // the swappable section
const PITCH = 230; // cradle pocket pitch along the track direction
const DROP = 118; // section top (local y) when it sits in a cradle pocket
const RX = SC + 2 * PITCH; // the magazine's dispensing slot
const MAG_P = 32; // section pitch in the magazine stack (along the normal)
const MAG_TOP = 44; // the magazine's window top (local y): it carries the track's lower end
const GATES = [120, 760];
const S_REST = 60, S_END = 800; // sled centre along the track
const LIFT_H = 6;

const lp = (lx, ly, z = 0) => [P0.x + lx * CA - ly * SA + D.x * z, P0.y + lx * SA + ly * CA + D.y * z];
const lrect = (x, y, w, h, z = 0) => [lp(x, y, z), lp(x + w, y, z), lp(x + w, y + h, z), lp(x, y + h, z)];
const ldelta = (dx, dy) => [dx * CA - dy * SA, dx * SA + dy * CA];
const lbox = (x0, y0, x1, y1, depth = 0, m = 8) => boxOf([lp(x0, y0), lp(x1, y0), lp(x1, y1), lp(x0, y1)], depth, m);

// Retired bin on the bench, under the cradle's left pocket when the cradle is indexed.
const BIN = { x0: 190, x1: 414, top: 700 };

// Strip chart: two lanes, baseline (grey) on top, candidate (green) below.
const CAB = { x: 1170, y: 300, w: 690, h: FLOOR - 300 };
const WIN = { x: 1200, y: 332, w: 630, h: 360 };
const LANE = [{ y: 412, h: 80 }, { y: 540, h: 80 }]; // [baseline, candidate]
const LY = [LANE[0].y + LANE[0].h / 2, LANE[1].y + LANE[1].h / 2];
const X0 = 1262, LSCALE = 500; // lane start (gate 1) and the baseline's bar length
const DOT_R = 13;

// ---------------------------------------------------------------------------------------------
// The story in numbers that never appear on screen: drop times (s) of the old baseline (measured
// before the loop), candidate B (round 1, kept) and candidate C (round 2, reverted).

const REF0 = 0.28, REF1 = 0.2; // baseline drop time before and after the keep
const RUNS = [
  { ri: 0, s: 1.08, drop: 0.194, jy: -6 },
  { ri: 0, s: 1.7, drop: 0.206, jy: 6 },
  { ri: 1, s: 4.83, drop: 0.197, jy: 5 },
  { ri: 1, s: 5.45, drop: 0.207, jy: -5 },
];
const BOUNCE = 0.04, RET = 0.36;
for (const r of RUNS) {
  r.tDot = gateTime(r, GATES[1]);
  r.tStart = gateTime(r, GATES[0]);
  r.r0 = r.s + r.drop + BOUNCE;
  r.r1 = r.r0 + RET;
  r.x = X0 + LSCALE * (r.drop / (r.ri === 0 ? REF0 : REF1)); // relative to the baseline of the round
  r.y = LY[1] + r.jy;
}
function gateTime(r, g) { return r.s + r.drop * Math.sqrt((g - S_REST) / (S_END - S_REST)); }
// The baseline lane's cluster: B's runs re-zeroed to the new baseline (same at loop start and end).
const GREY = RUNS.filter((r) => r.ri === 0).map((r) => ({ x: X0 + LSCALE * (r.drop / REF1), y: LY[0] + r.jy }));

// ---------------------------------------------------------------------------------------------
// Timeline.

const K = {
  loadB: [0.0, 0.4], dropOld: [0.45, 0.6], shift1: [0.62, 0.86], riseB: [0.88, 1.03],
  cal1: { t0: 1.95, lift: 1.03 }, keep: 3.0, rezero: [3.05, 3.45], retire: [3.1, 3.42], home1: [3.45, 3.7],
  loadC: [3.7, 4.1], dropB: [4.2, 4.35], shift2: [4.37, 4.61], riseC: [4.63, 4.78],
  cal2: { t0: 5.72, lift: 1.03 }, revert: 6.8, dropC: [6.9, 7.05], home2: [7.1, 7.34], riseB2: [7.36, 7.51],
  stackUp: [7.5, 7.64], returnC: [7.6, 7.9],
};
const IDX = 0.14;
const C_IN = 0.5, C_OUT = 0.4, C_DROP = 380;

// Cradle index: 0 home (left pocket under the gap), -1 indexed (right pocket under the gap).
function cradle(t) {
  return -sseg(t, ...K.shift1) + sseg(t, ...K.home1) - sseg(t, ...K.shift2) + sseg(t, ...K.home2);
}

// Sled: gravity down the incline, rebound on the buffer, winch home (eased, lifted between gates).
function sledPos(t) {
  for (const r of RUNS) {
    if (t < r.s || t >= r.r1) continue;
    const td = t - r.s;
    if (td < r.drop) { const u = td / r.drop; return { x: S_REST + (S_END - S_REST) * u * u, lift: 0 }; }
    if (t < r.r0) return { x: S_END + 10 * Math.sin((Math.PI * (t - r.s - r.drop)) / BOUNCE), lift: 0 };
    const u = (t - r.r0) / RET;
    return { x: lerp(S_END, S_REST, sm(u)), lift: LIFT_H * (sm((u - 0.28) / 0.12) - sm((u - 0.58) / 0.1)) };
  }
  return { x: S_REST, lift: 0 };
}

// The candidate lane's pen: from the lane start to the run's dot while the sled is between the
// gates (constant speed: the bar is the time), back to the start during the return.
function penX(t) {
  for (const r of RUNS) {
    if (t < r.tStart) return X0;
    if (t < r.tDot) return lerp(X0, r.x, (t - r.tStart) / (r.tDot - r.tStart));
    if (t < r.r0) return r.x;
    if (t < r.r1) return lerp(r.x, X0, sm((t - r.r0) / RET));
  }
  return X0;
}

const hump = (t, a, b, c, d) => easeInOut(seg(t, a, b)) * (1 - easeInOut(seg(t, c, d)));
// The lamp: on the track and cradle; over the chart while the caliper measures.
const lampX = (t) => 600 + 900 * (hump(t, 1.9, 2.3, 2.95, 3.3) + hump(t, 5.67, 6.07, 6.7, 7.1));

// ---------------------------------------------------------------------------------------------
// Materials.

const RAIL = MAT.lit;
const NEUTRAL = { front: ['#33433a', '#1f2922'], top: '#56705d', side: '#121914', sil: '#6a8d72', hi: '#b3d1b9', line: '#2e3d33' };
const CAND = { front: ['#24563a', '#143020'], top: '#3f8a55', side: '#0c1811', sil: P.green, hi: P.glow, line: '#2a4a33' };
const AMBER = { front: ['#b98a42', '#6e4f22'], top: '#efc87e', side: '#3a2a12', sil: P.amber, hi: '#ffe8b8', line: '#8a6a2e' };
const CRADLE = { front: ['#2c3a31', '#1a221d'], top: '#4a6150', side: '#0f1411', sil: '#5a7c62', hi: '#9cbea3', line: '#2c3a30' };
const SLED = { front: ['#33443a', '#1c251f'], top: '#5b7563', side: '#111713', sil: '#6a8d72', hi: '#b3d1b9', line: '#2e3d33' };
const BEZEL = { front: ['#2a362d', '#1a221c'], top: '#4a6150', side: '#0f1411', sil: '#58795f', hi: '#97b99e', line: '#2c3a30' };
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

// A track section with its centre at local (cx, ly + TH/2): the rail profile, two bolt heads.
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
const secSprite = (ctx, k) => sprite(ctx, 'pl4-sec-' + k, lbox(SC - SEC / 2 - 6, -8, SC + SEC / 2 + 6, TH + 8, DEP, 6), (c) => drawSection(c, MATS[k]));
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

function gateBack(ctx, g) {
  prism(ctx, lrect(g - 6, -88, 12, 88 + TH, DEP + 6), 10, MAT.lit, { sil: 2.5 });
}
function gateFront(ctx, g) {
  prism(ctx, lrect(g - 7, -88, 14, 88 + TH + 8, -10), 10, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 12, -100, 24, 13, -10), DEP + 26, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 12, TH - 4, 24, 12, -12), 14, MAT.metal, { sil: 2 });
  const e = lp(g, -38, -2);
  ball(ctx, e[0], e[1], 4, MAT.metal);
}

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
  blit(ctx, sprite(ctx, 'pl4-sled', [ref[0] - 75, ref[1] - 72, 165, 144], drawSled), dx, dy);
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
function bufferSpring(ctx, x) {
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
  prism(ctx, lrect(x0 - 6, -32, 6, 32, 6), 32, RAIL, { sil: 2 });
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
  // rollers on the rail
  for (const x of [a + 30, SC + PITCH / 2, b - 30]) {
    const p = lp(x, y1 + 4, DEP + 4);
    ball(ctx, p[0], p[1], 7, MAT.lit);
  }
  screwRow(ctx, [lp(a + 12, y0 + 8, DEP + 4), lp(b - 12, y0 + 8, DEP + 4), lp(SC + PITCH / 2, y0 + 8, DEP + 4)], 3);
}
function cradleAt(ctx, c) {
  const [dx, dy] = ldelta(c * PITCH, 0);
  blit(ctx, sprite(ctx, 'pl4-cradle', lbox(SC - 115, DROP - 16, SC + PITCH + 115, DROP + TH + 34, DEP + 20), drawCradle), dx, dy);
}

// ---------------------------------------------------------------------------------------------
// Sections: where each one is at time t.

const pocketX = (c, k) => SC + c * PITCH + k * PITCH; // k = 0 left pocket, 1 right pocket
function sectionsAt(t) {
  const c = cradle(t);
  const out = [];
  // the old baseline: in the track, then the left pocket, then the retired bin
  if (t < K.retire[0]) {
    let ly = 0, lx = SC;
    if (t >= K.dropOld[0]) { ly = DROP * sseg(t, ...K.dropOld); if (t >= K.dropOld[1]) lx = pocketX(c, 0); }
    out.push({ lx, ly, k1: 'n' });
  } else if (t < K.retire[1] + 0.02) {
    out.push({ lx: pocketX(c, 0), ly: DROP, fall: 330 * easeIn(seg(t, K.retire[0], K.retire[1])), k1: 'n' });
  }
  // B: out of the magazine into the right pocket, up into the track; the baseline after the keep
  {
    let lx, ly, k1 = 'n', k2 = 'c', u = sseg(t, 0.05, 0.35);
    if (t < K.loadB[1]) { lx = lerp(RX, pocketX(0, 1), sseg(t, ...K.loadB)); ly = DROP; }
    else if (t < K.riseB[0]) { lx = pocketX(c, 1); ly = DROP; }
    else if (t < K.dropB[0]) { lx = SC; ly = DROP * (1 - sseg(t, ...K.riseB)); }
    else if (t < K.home2[0]) { lx = t < K.dropB[1] ? SC : pocketX(c, 0); ly = DROP * sseg(t, ...K.dropB); }
    else if (t < K.riseB2[0]) { lx = pocketX(c, 0); ly = DROP; }
    else { lx = SC; ly = DROP * (1 - sseg(t, ...K.riseB2)); }
    if (t >= K.keep) { k1 = 'c'; k2 = 'n'; u = sseg(t, K.keep + 0.05, K.keep + 0.45); }
    out.push({ lx, ly, k1, k2, u });
  }
  // C: out of the magazine, into the track, amber at the revert, back into the magazine
  if (t >= K.loadC[0] && t < K.returnC[1]) {
    let lx, ly, k1 = 'n', k2 = 'c', u = sseg(t, K.loadC[0] + 0.05, K.loadC[0] + 0.35);
    if (t < K.loadC[1]) { lx = lerp(RX, pocketX(0, 1), sseg(t, ...K.loadC)); ly = DROP; }
    else if (t < K.riseC[0]) { lx = pocketX(c, 1); ly = DROP; }
    else if (t < K.dropC[0]) { lx = SC; ly = DROP * (1 - sseg(t, ...K.riseC)); }
    else if (t < K.returnC[0]) { lx = t < K.dropC[1] ? SC : pocketX(c, 1); ly = DROP * sseg(t, ...K.dropC); }
    else { lx = lerp(pocketX(0, 1), RX, sseg(t, ...K.returnC)); ly = DROP; }
    if (t >= K.revert) { k1 = 'c'; k2 = 'a'; u = sseg(t, K.revert, K.revert + 0.1); }
    if (t >= K.returnC[0] + 0.18) { k1 = 'a'; k2 = 'n'; u = sseg(t, K.returnC[0] + 0.18, K.returnC[1]); }
    out.push({ lx, ly, k1, k2, u });
  }
  return out;
}

// The magazine stack (identical neutral sections); j = 0 is the dispensing slot at the cradle level.
function stackSlots(t) {
  const N = 4;
  const at = (j) => DROP - j * MAG_P;
  const list = (from, to, sh) => { const o = []; for (let j = from; j <= to; j++) o.push(at(j) + sh * MAG_P); return o; };
  if (t < K.loadB[1]) return list(1, N, 0);
  if (t < K.loadB[1] + IDX) return list(1, N, indexEase(seg(t, K.loadB[1], K.loadB[1] + IDX)));
  if (t < K.loadC[0]) return list(0, N - 1, 0);
  if (t < K.loadC[1]) return list(1, N, 0);
  if (t < K.loadC[1] + IDX) return list(1, N, indexEase(seg(t, K.loadC[1], K.loadC[1] + IDX)));
  if (t < K.stackUp[0]) return list(0, N - 1, 0);
  if (t < K.stackUp[1]) return list(0, N - 1, -indexEase(seg(t, ...K.stackUp)));
  if (t < K.returnC[1]) return list(1, N, 0);
  return list(0, N - 1, 0);
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
const dotSprite = (ctx, cand) => sprite(ctx, 'pl4-dot-' + (cand ? 1 : 0), DOT_BOX, (c) => drawDot(c, cand));
function dotXfade(ctx, x, y, u) {
  if (u < 1) blit(ctx, dotSprite(ctx, true), x, y);
  if (u > 0) { ctx.save(); ctx.globalAlpha *= u; blit(ctx, dotSprite(ctx, false), x, y); ctx.restore(); }
}

function chart(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.clip();
  // the baseline cluster: the old baseline's dots wipe out right at the keep; B's arrive re-zeroed
  const wipe1 = 700 * easeIn(seg(t, K.rezero[0], K.rezero[0] + 0.3));
  if (t < K.rezero[0] + 0.3) for (const g of GREY) blit(ctx, dotSprite(ctx, false), g.x + wipe1, g.y);
  // the candidate lane: bars (the gate-to-gate time) and dots
  for (const r of RUNS) {
    if (t < r.tStart) continue;
    const end = t < r.tDot ? penX(t) : r.x;
    const fade = 1 - seg(t, r.tDot + 0.15, r.tDot + 0.75);
    if (fade > 0) {
      ctx.strokeStyle = rgba(P.bright, 0.85 * fade);
      ctx.lineWidth = lw(6);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(X0, r.y);
      ctx.lineTo(end, r.y);
      ctx.stroke();
    }
    if (t < r.tDot) continue;
    if (r.ri === 0) {
      // kept: rise into the baseline lane and re-zero onto the baseline position
      const u = sseg(t, ...K.rezero);
      const g = GREY[RUNS.indexOf(r)];
      if (t < K.rezero[0]) blit(ctx, dotSprite(ctx, true), r.x, r.y);
      else dotXfade(ctx, lerp(r.x, g.x, u), lerp(r.y, g.y, u), u);
    } else {
      // reverted: wiped out right
      const wipe = 700 * easeIn(seg(t, K.revert + 0.05, K.revert + 0.35));
      if (t < K.revert + 0.35) blit(ctx, dotSprite(ctx, true), r.x + wipe, r.y);
    }
  }
  ctx.restore();
}

function pen(ctx, t) {
  const x = penX(t), y = LY[1];
  blit(ctx, sprite(ctx, 'pl4-pen', [X0 - 22, LANE[1].y - 16, 44, LANE[1].h + 30], drawPen), x - X0, 0);
}
function drawPen(ctx) {
  const x = X0, y = LY[1];
  prism(ctx, rect(x - 9, LANE[1].y - 8, 18, 22), 10, MAT.lit, { sil: 2 });
  ctx.fillStyle = '#1a231c';
  poly(ctx, [[x - 6, y - 26], [x + 6, y - 26], [x, y - 6]]);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2);
  ctx.stroke();
  ctx.fillStyle = P.green;
  ctx.beginPath();
  ctx.arc(x, y - 6, 3.4 * LOD.k, 0, Math.PI * 2);
  ctx.fill();
}

// The spread of each lane's cluster in the round under test, bracketed while the caliper measures;
// where the brackets overlap (round 2) the overlap is tinted amber.
function clusterBox(pts) {
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs) - DOT_R - 6, x1: Math.max(...xs) + DOT_R + 6, y0: Math.min(...ys) - DOT_R - 8, y1: Math.max(...ys) + DOT_R + 8 };
}
// The chart is relative to the current baseline, so both rounds' baseline cluster sits at GREY.
const CL = [0, 1].map((ri) => ({ grey: clusterBox(GREY), cand: clusterBox(RUNS.filter((r) => r.ri === ri)) }));
function spreads(ctx, ri, a) {
  if (a <= 0) return;
  const { grey: g, cand: c } = CL[ri];
  ctx.save();
  ctx.beginPath();
  ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.clip();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(214,220,204,0.10)';
  ctx.fillRect(g.x0, g.y0, g.x1 - g.x0, g.y1 - g.y0);
  ctx.fillStyle = 'rgba(83,219,118,0.11)';
  ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  const ox0 = Math.max(g.x0, c.x0), ox1 = Math.min(g.x1, c.x1);
  if (ox1 > ox0) {
    ctx.fillStyle = 'rgba(239,200,126,0.32)';
    ctx.fillRect(ox0, g.y0, ox1 - ox0, c.y1 - g.y0);
  }
  ctx.lineWidth = lw(2);
  for (const [k, col] of [[g, 'rgba(214,220,204,0.75)'], [c, 'rgba(114,242,140,0.8)']]) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(k.x0, k.y1 - 8); ctx.lineTo(k.x0, k.y1); ctx.lineTo(k.x1, k.y1); ctx.lineTo(k.x1, k.y1 - 8);
    ctx.stroke();
  }
  ctx.restore();
}

// Fresh caliper: clean green, vertical jaws hanging through both lanes from a horizontal beam. It
// drops in from the chart's top slot, the moving jaw opens across the gap from the candidate
// cluster's right edge to the baseline cluster's left edge, holds, and lifts out.
const JAW_TOP = WIN.y + 20, JAW_BOT = LANE[1].y + LANE[1].h + 14, BLADE = 12;
function calStats(ri) {
  const { grey: g, cand: c } = CL[ri];
  const left = c.x1 + 2; // fixed jaw's measuring face
  const gap = Math.max(0, g.x0 - 2 - left - 2 * BLADE);
  return { left: gap > 0 ? left : Math.min(g.x0, c.x0) - 2 * BLADE - 6, gap };
}
const CSTAT = [calStats(0), calStats(1)];
function caliperPose(t, cal, ri) {
  const lt = t - cal.t0;
  if (lt < 0 || lt >= cal.lift + C_OUT) return null;
  const { left, gap } = CSTAT[ri];
  let dy = 0;
  if (lt < C_IN) dy = -C_DROP * (1 - easeOut(lt / C_IN));
  else if (lt >= cal.lift) dy = -C_DROP * easeIn((lt - cal.lift) / C_OUT);
  const open = gap * easeInOut(seg(lt, C_IN + 0.02, C_IN + 0.3));
  const band = seg(lt, C_IN - 0.1, C_IN + 0.1) * (1 - seg(lt, cal.lift - 0.05, cal.lift + 0.12));
  return { dy, open, left, gap, ri, touchT: cal.t0 + (gap > 0 ? C_IN + 0.3 : C_IN), band };
}
const CAL_X = 1500; // sprite reference: fixed jaw's measuring face
function drawCalBody(ctx) {
  const x = CAL_X, y0 = JAW_TOP;
  // beam with graduations along the top, fixed jaw down from its left end
  prism(ctx, [[x - BLADE - 30, y0 - 26], [x + 150, y0 - 26], [x + 150, y0], [x, y0], [x, JAW_BOT - 16], [x - 6, JAW_BOT], [x - BLADE, JAW_BOT], [x - BLADE, y0], [x - BLADE - 30, y0]], 12, MAT.fresh, { sil: 3 });
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(164,245,186,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 18; i++) { const xx = x + 4 + i * 8; ctx.moveTo(xx, y0 - 26); ctx.lineTo(xx, y0 - 26 + (i % 5 === 0 ? 11 : 6)); }
    ctx.stroke();
  }
  ball(ctx, x - BLADE - 20, y0 - 13, 6, MAT.fresh);
}
function drawCalSlider(ctx) {
  const x = CAL_X, y0 = JAW_TOP;
  prism(ctx, [[x, y0 - 34], [x + 34, y0 - 34], [x + 34, y0 + 6], [x + BLADE, y0 + 6], [x + BLADE, JAW_BOT], [x + 6, JAW_BOT], [x, JAW_BOT - 16]], 14, MAT.fresh, { sil: 2.5 });
  ball(ctx, x + 22, y0 - 40, 7, MAT.fresh);
}
function caliper(ctx, pose) {
  const dx = pose.left - CAL_X;
  ctx.save();
  ctx.beginPath();
  ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.clip();
  blit(ctx, sprite(ctx, 'pl4-cal-body', [CAL_X - BLADE - 46, JAW_TOP - 40, 220, JAW_BOT - JAW_TOP + 50], drawCalBody), dx, pose.dy);
  blit(ctx, sprite(ctx, 'pl4-cal-slider', [CAL_X - 8, JAW_TOP - 54, 60, JAW_BOT - JAW_TOP + 62], drawCalSlider), dx + BLADE + pose.open, pose.dy);
  ctx.restore();
  if (!LOD.card && pose.open > 20) dimension(ctx, pose.left, JAW_BOT + pose.dy, pose.left + 2 * BLADE + pose.open, JAW_BOT + pose.dy, 18, 0.7);
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 640, 560);
  // track supports: a leg under the upper end; the magazine pedestal carries the lower end
  const leg = lp(10, TH);
  contactShadow(ctx, leg[0] + 10, FLOOR - 6, 60, 12, 0.55);
  prism(ctx, rect(leg[0] - 26, FLOOR - 12, 60, 12), 40, MAT.metal, { sil: 2.5 });
  rodV(ctx, leg[0] + 4, leg[1] + 6, FLOOR - 12, 16, MAT.lit);
  prism(ctx, rect(leg[0] - 8, leg[1] + 2, 24, 22), 22, MAT.lit, { sil: 2.5 });
  const wc = lp(-30, -12, DEP * 0.5);
  prism(ctx, rect(wc[0] - 8, wc[1], 16, lp(10, TH)[1] - wc[1] + 10), 14, MAT.metal, { sil: 2 });
  // the cradle's rail, behind the cradle, on two brackets
  prism(ctx, lrect(SC - PITCH - 120, DROP + TH + 26, RX - SC + PITCH + 60, 12, DEP + 22), 10, MAT.metal, { sil: 2 });
  for (const x of [SC - PITCH - 100, SC + 120]) {
    const p = lp(x, DROP + TH + 38, DEP + 22);
    prism(ctx, rect(p[0] - 6, p[1], 12, FLOOR - 12 - p[1]), 14, MAT.metal, { sil: 2 });
  }
  // retired bin: back wall and floor
  contactShadow(ctx, (BIN.x0 + BIN.x1) / 2 + 16, FLOOR - 4, 110, 12, 0.5);
  prism(ctx, rect(BIN.x0, BIN.top, BIN.x1 - BIN.x0, FLOOR - BIN.top), 46, MAT.metal, { sil: 2.5 });
  ctx.fillStyle = '#070a08';
  ctx.fillRect(BIN.x0 + 8, BIN.top + 4, BIN.x1 - BIN.x0 - 16, FLOOR - BIN.top - 4);
  // the magazine: back plate behind the stack, pedestal to the bench
  const mb = lp(RX, DROP + TH + 20);
  contactShadow(ctx, mb[0] + 20, FLOOR - 4, 120, 14, 0.55);
  prism(ctx, rect(mb[0] - 60, mb[1], 120, FLOOR - mb[1]), 50, MAT.metal, { sil: 2.5 });
  prism(ctx, lrect(RX - 112, MAG_TOP - 14, 224, DROP + TH + 34 - MAG_TOP), 10, MAT.metal, { sil: 2.5 });
  // chart recorder cabinet, lit bezel, window, the two lanes
  contactShadow(ctx, CAB.x + CAB.w / 2 + 20, FLOOR - 4, 340, 22, 0.6);
  prism(ctx, rect(CAB.x, CAB.y, CAB.w, CAB.h), 64, MAT.metal, { sil: 3 });
  const bz = 14;
  prism(ctx, rect(WIN.x - bz, WIN.y - bz, WIN.w + 2 * bz, bz), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x - bz, WIN.y + WIN.h, WIN.w + 2 * bz, bz), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x - bz, WIN.y, bz, WIN.h), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x + WIN.w, WIN.y, bz, WIN.h), 10, BEZEL, { sil: 2 });
  let g = ctx.createLinearGradient(WIN.x, WIN.y, WIN.x + WIN.w, WIN.y + WIN.h);
  g.addColorStop(0, '#1c271f');
  g.addColorStop(0.55, '#26332a');
  g.addColorStop(1, '#202b23');
  ctx.fillStyle = g;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  // the caliper's slot in the top bezel
  ctx.fillStyle = '#050806';
  ctx.fillRect(WIN.x + 120, WIN.y - 10, 380, 6);
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
  // pen guide rail along the candidate lane's top
  rodH(ctx, X0 - 20, WIN.x + WIN.w - 14, LANE[1].y - 12, 6, MAT.lit);
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
    const led = lp(g, -94, -10);
    ball(ctx, led[0], led[1], 5, MAT.metal);
  }
  // magazine frame: posts either side of the stack (open at the bottom slot on the cradle side),
  // the cap under the track's lower end, the floor of the slot
  prism(ctx, lrect(RX - 118, MAG_TOP - 14, 236, 14, -4), 20, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(RX - 118, MAG_TOP, 12, DROP - 10 - MAG_TOP, -4), 16, MAT.lit, { sil: 2 });
  prism(ctx, lrect(RX + 106, MAG_TOP, 12, DROP + TH + 20 - MAG_TOP, -4), 16, MAT.lit, { sil: 2 });
  prism(ctx, lrect(RX - 118, DROP + TH + 6, 236, 14, -4), 20, MAT.lit, { sil: 2 });
  screwRow(ctx, [lp(RX - 112, MAG_TOP - 7, -4), lp(RX + 112, MAG_TOP - 7, -4)], 3);
  // retired bin: front panel with a lit lip
  prism(ctx, rect(BIN.x0, BIN.top + 14, BIN.x1 - BIN.x0, FLOOR - BIN.top - 14), 8, MAT.metal, { sil: 2.5 });
  ctx.fillStyle = '#86a98e';
  ctx.fillRect(BIN.x0 + 4, BIN.top + 14, BIN.x1 - BIN.x0 - 8, lw(2));
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
    cached(ctx, 'perf-loop4-back', backLayer);

    // chart: lanes' dots and bars, the spread brackets, the caliper, the pen
    chart(ctx, t);
    const cal = caliperPose(t, K.cal1, 0) || caliperPose(t, K.cal2, 1);
    if (cal) spreads(ctx, cal.ri, cal.band);
    pen(ctx, t);
    if (cal) caliper(ctx, cal);

    // magazine stack (clipped to its window), the cradle, the sections
    ctx.save();
    poly(ctx, lrect(RX - 150, MAG_TOP, 300, DROP + TH + 40 - MAG_TOP));
    ctx.clip();
    // a neutral section resting in the slot is drawn by the stack pass (same order and clip as the stack's own j = 0)
    const secs = sectionsAt(t);
    const inSlot = (s) => s.fall === undefined && s.lx === RX && s.ly === DROP && s.k1 === 'n' && !(s.u > 0);
    const slots = stackSlots(t);
    if (secs.some(inSlot)) slots.unshift(DROP);
    for (const y of slots) section(ctx, RX, y, 'n');
    ctx.restore();
    cradleAt(ctx, cradle(t));
    for (const s of secs) {
      if (inSlot(s)) continue;
      if (s.fall !== undefined) {
        ctx.save();
        // above the bin, or inside its mouth: the falling section never shows outside the bin walls
        ctx.beginPath();
        ctx.rect(0, 0, W, BIN.top - 12);
        ctx.rect(BIN.x0 + 3, BIN.top - 12, BIN.x1 - BIN.x0 - 4, FLOOR - BIN.top + 12);
        ctx.clip();
        ctx.translate(0, s.fall);
        section(ctx, s.lx, s.ly, s.k1);
        ctx.restore();
      } else section(ctx, s.lx, s.ly, s.k1, s.k2 ?? s.k1, s.u ?? 0);
    }

    cached(ctx, 'perf-loop4-mid', midLayer);
    const sled = sledPos(t);
    winchSpokes(ctx, sled.x);
    if (sled.x > S_END) bufferSpring(ctx, sled.x);
    else blit(ctx, sprite(ctx, 'pl4-buffer-rest', lbox(L - 70, -50, L - 10, 10, 40), (k) => bufferSpring(k, S_END)));
    contactShadow(ctx, ...lp(sled.x, -2, 22), 52, 7, 0.5 * (1 - sled.lift / (LIFT_H * 3)));
    sledAt(ctx, sled.x, sled.lift);

    cached(ctx, 'perf-loop4-front', frontLayer);
    lampFalloff(ctx, lampX(t), 540, 440, 1300, 0.62);

    // light: gate lamps, the pen's dot, the section seating, the keep's bolts, the revert, jaws
    for (const g of GATES) {
      let lit = 0;
      for (const r of RUNS) {
        const u = (t - gateTime(r, g)) / 0.16;
        if (u > 0 && u < 1) lit = Math.max(lit, 1 - u);
      }
      if (lit <= 0) continue;
      const led = lp(g, -94, -10);
      ball(ctx, led[0], led[1], 5, { ...MAT.fresh, top: mix('#2f6141', P.bright, lit), hi: '#e9fff0' });
      softGlow(ctx, led[0], led[1], 26, P.bright, 0.55 * lit);
    }
    for (const r of RUNS) contactGlow(ctx, r.x, r.y, (t - r.tDot) / 0.12, 26);
    for (const tk of [K.riseB[1], K.riseC[1], K.riseB2[1]]) contactGlow(ctx, ...lp(SC, TH / 2), (t - tk) / 0.12, 34);
    for (const lx of [SEL0 + 15, SEL1 - 15]) contactGlow(ctx, ...lp(lx, TH / 2), (t - K.keep) / 0.14, 46);
    const rv = hump(t, K.revert, K.revert + 0.1, K.returnC[0] + 0.1, K.returnC[1]);
    if (rv > 0) {
      const s = sectionsAt(t).find((q) => q.k2 === 'a' || q.k1 === 'a');
      if (s) softGlow(ctx, ...lp(s.lx, s.ly + TH / 2), 150, P.amber, 0.28 * rv);
    }
    if (cal) {
      const cu = (t - cal.touchT) / 0.12;
      const yj = (LY[0] + LY[1]) / 2 + cal.dy;
      if (cal.gap > 0) {
        contactGlow(ctx, cal.left, yj, cu, 28);
        contactGlow(ctx, cal.left + 2 * BLADE + cal.open, yj, cu, 28);
      } else softGlow(ctx, cal.left + BLADE, yj, 60, P.amber, 0.35 * cal.band);
    }
    dust(ctx, (BIN.x0 + BIN.x1) / 2, BIN.top + 10, t - K.retire[1] + 0.04, 0x7e1, { ang: -Math.PI / 2, spread: 1.6, n: 8, dur: 0.4 });

    grainOver(ctx, 0.3, 'soft-light');
  },
};
