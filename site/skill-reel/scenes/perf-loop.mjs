// /perf-loop at final fidelity (pitch A 3.7).
// A Galileo inclined plane rebuilt as a bench instrument: a sled carrying the blank runs down a
// track through two timing gates, and a strip-chart recorder marks each run as a dot on paper that
// moves left at constant speed. One track section sits in a machined two-position selector: the
// baseline in the track, the candidate parked above it. Runs alternate between them; after each run
// the winch reels the sled home, lifted clear of the rail. A fresh caliper drops onto the chart,
// the spread of each row is bracketed, and the caliper opens its inside jaws in the clear gap
// between the two rows. Round 1: a clear gap, the candidate is bolted in and the old section drops
// to the retired rack. Round 2: the rows overlap, the jaws cannot open, and the session's hand lifts
// the candidate back out with an amber edge. No numbers, no bars, no stamp.
// Pure function of t. No Math.random, no setTransform. Static geometry lives in cached layers;
// rigid moving parts are drawn once into per-scale sprites and placed each frame.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, dimension, centreLine,
  benchFinal, lampFalloff, activeMat, rng, hole,
} from '../kit.mjs';

const T = 10.0;
const sm = (u) => { const v = clamp01(u); return v * v * (3 - 2 * v); };

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
// box of a track-local rectangle (all four corners), with depth
const lbox = (x0, y0, x1, y1, depth = 0, m = 8) => boxOf([lp(x0, y0), lp(x1, y0), lp(x1, y1), lp(x0, y1)], depth, m);

// ---------------------------------------------------------------------------------------------
// Geometry. The track is drawn in a local frame running down the incline: x along the track,
// y along its normal (down positive), z into the bench depth. lp() maps local to stage units.

const ANG = (15 * Math.PI) / 180;
const CA = Math.cos(ANG), SA = Math.sin(ANG);
const P0 = { x: 236, y: 380 };
const L = 900, TH = 24, DEP = 44; // track length, rail thickness, rail depth
const SEL0 = 420, SEL1 = 610, SEC = SEL1 - SEL0, SC = (SEL0 + SEL1) / 2; // selector section
const DS = 118; // selector stroke along the normal: slot 1 parks DS above the track
const GATES = [150, 792];
const S_REST = 70, S_END = 818; // sled centre along the track
const LIFT_H = 6; // the winch lifts the sled clear of the rail for the trip home

const lp = (lx, ly, z = 0) => [P0.x + lx * CA - ly * SA + D.x * z, P0.y + lx * SA + ly * CA + D.y * z];
const lrect = (x, y, w, h, z = 0) => [lp(x, y, z), lp(x + w, y, z), lp(x + w, y + h, z), lp(x, y + h, z)];
const ldelta = (dx, dy) => [dx * CA - dy * SA, dx * SA + dy * CA];

// Strip chart.
const CAB = { x: 1240, y: 300, w: 596, h: FLOOR - 300 };
const WIN = { x: 1268, y: 334, w: 540, h: 370 };
const PAPER = { x: 1298, y: 342, w: 478, h: 354 };
const PEN_X = 1716, ROD_X = PEN_X + 44;
const V = 52, GRID = 26; // V * T = 520 px = 20 grid cells: the paper advances a whole pattern per loop
const RULE_P = 4 * GRID; // the ruling pattern repeats every major cell
const DOT_R = 13;
const CAL_X = PEN_X - 204;

// Session gantry: hatched column right of the track, boom, and the hand's housing over the selector.
const COL_X = 1150, BOOM_Y = 244;
const HOUSE = { x: 664, y: 240, w: 256, h: 88 };
const PARK = -DS - 40; // held section's top (local y) at the hand's park pose
const HIDE = PARK - 98; // retracted into the housing

// Retired rack under the selector (slot 0 drops into it when the carriage is down).
const RACK_X = lp(SC, DS + TH / 2)[0];
const RACK_Y0 = 694, RACK_P = 30;
const rackY = (k) => RACK_Y0 + k * RACK_P;

// ---------------------------------------------------------------------------------------------
// Timing. A run: release, gravity drop, rebound on the buffer, then the winch lifts the sled and
// reels it home with an ease in-out. The selector indexes while the sled is on the upper track.

const RET = 0.4, BOUNCE = 0.05, IDX = 0.14, IDX_AT = 0.24;
const ROUND_START = [0.05, 4.27];
const DROP = { base: 0.28, B: 0.22, C: 0.27 }; // B really runs faster
const ROW = { base: 470, B: 604, C: 484 }; // chart rows, relative to the current baseline

const RUNS = (() => {
  const r = rng(7);
  const out = [];
  ROUND_START.forEach((R, ri) => {
    let s = R;
    for (let k = 0; k < 4; k++) {
      const cand = k % 2 === 1;
      const kind = cand ? (ri === 0 ? 'B' : 'C') : 'base';
      const drop = DROP[kind];
      const tDot = s + drop, r0 = tDot + BOUNCE, r1 = r0 + RET;
      out.push({ ri, k, s, kind, cand, drop, tDot, r0, r1, y: ROW[kind] + (r() - 0.5) * 30 });
      s = r1 + 0.02;
    }
  });
  return out;
})();

const KEEP = 3.65, FALL_T = 3.71, FALL_END = 4.25, REHOME = 4.09, SLOT_C = 4.25, REV = 7.7, GRIP = 7.98;
const RACK_T = [9.82, 9.96];

// Carriage: 0 = slot 0 (baseline) in the track, 1 = slot 1 (candidate) in the track.
const CAR_EV = (() => {
  const ev = [];
  for (let i = 0; i < RUNS.length - 1; i++) {
    const a = RUNS[i], b = RUNS[i + 1];
    if (a.ri === b.ri && a.cand !== b.cand) ev.push([a.r0 + IDX_AT, a.cand ? 1 : 0, b.cand ? 1 : 0]);
  }
  ev.push([REHOME, 1, 0]); // keep: B stays bolted, the carriage rehomes around it
  ev.push([REV, 1, 0]); // revert: C goes back up to slot 1
  return ev.sort((x, y) => x[0] - y[0]);
})();
function carriage(t) {
  let c = 0;
  for (const [s, a, b] of CAR_EV) if (t >= s) c = lerp(a, b, indexEase(seg(t, s, s + IDX)));
  return c;
}

function sledPos(t) {
  for (const r of RUNS) {
    if (t < r.s || t >= r.r1) continue;
    const td = t - r.s;
    if (td < r.drop) { const u = td / r.drop; return { x: S_REST + (S_END - S_REST) * u * u, lift: 0 }; }
    if (t < r.r0) return { x: S_END + 10 * Math.sin((Math.PI * (t - r.tDot)) / BOUNCE), lift: 0 };
    const u = (t - r.r0) / RET;
    // lifted only between the gates, where nothing hangs over the rail
    return { x: lerp(S_END, S_REST, sm(u)), lift: LIFT_H * (sm((u - 0.28) / 0.12) - sm((u - 0.58) / 0.1)) };
  }
  return { x: S_REST, lift: 0 };
}
const gateTime = (r, g) => r.s + r.drop * Math.sqrt((g - S_REST) / (S_END - S_REST));

function penY(t) {
  let y = RUNS[RUNS.length - 1].y;
  for (const r of RUNS) {
    if (t >= r.tDot) y = r.y;
    else { if (t >= r.s) y = lerp(y, r.y, easeInOut((t - r.s) / r.drop)); break; }
  }
  return y;
}
function penInk(t) {
  let cand = RUNS[RUNS.length - 1].cand;
  for (const r of RUNS) if (t >= r.s - 0.03) cand = r.cand;
  return cand;
}

// Engage: ease in-out approach, dwell, ease-in withdrawal at 75% of the approach time.
function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, t3, c: (t - t1) / 0.12 };
}
const SLOT_A = (0.4 - 0.2) / 1.75;

// Hand: local y of the held section's top and what it holds.
function handState(t) {
  for (const [s, held] of [[0, 'B'], [SLOT_C, 'C']]) {
    if (t >= s && t < s + 0.4) {
      const e = engage(t, s, SLOT_A);
      return { y: lerp(PARK, -DS, e.d), held: t < e.t1 ? held : null };
    }
  }
  // fetch C during round 1's runs: up into the housing, back out with the next section
  if (t >= 0.95 && t < 2.5) {
    if (t < 1.5) return { y: lerp(PARK, HIDE, easeInOut(seg(t, 0.95, 1.5))), held: null };
    if (t < 1.95) return { y: HIDE, held: null };
    return { y: lerp(HIDE, PARK, easeOut(seg(t, 1.95, 2.5))), held: 'C' };
  }
  if (t >= 2.5 && t < SLOT_C) return { y: PARK, held: 'C' };
  // revert: down to C in slot 1, grip, lift it back into the housing
  if (t >= 7.84 && t < 8.3) {
    if (t < GRIP) return { y: lerp(PARK, -DS, easeInOut(seg(t, 7.84, GRIP))), held: null };
    if (t < 8.04) return { y: -DS, held: 'Cx' };
    return { y: lerp(-DS, HIDE, easeIn(seg(t, 8.04, 8.3))), held: 'Cx' };
  }
  if (t >= 8.3 && t < 9.8) return { y: HIDE, held: null };
  if (t >= 9.8) return { y: lerp(HIDE, PARK, easeOut(seg(t, 9.8, 10.0))), held: 'B' };
  return { y: PARK, held: null };
}

// The hand brightens while it works and dims back to idle (continuous across the seam).
const bump = (t, a, b, r = 0.25) => easeInOut(seg(t, a - r, a)) * (1 - easeInOut(seg(t, b, b + r)));
const handActive = (t) => Math.max(bump(t, 0, 0.45), bump(t, 10, 10.45), bump(t, SLOT_C, SLOT_C + 0.45), bump(t, 7.84, 8.3), 0.4 * bump(t, 0.95, 2.45));

// Fresh caliper: one per round. Drops in (ease-out 0.5 s), opens its jaws, dwells, lifts (ease-in 0.4 s).
const CALS = [{ t0: 2.36, ri: 0, lift: 1.24 }, { t0: 6.7, ri: 1, lift: 0.95 }];
const C_IN = 0.5, C_OUT = 0.4, C_DROP = 430;
// The lamp follows the work to the chart while the caliper measures.
const hump = (t, a, b, c, d) => easeInOut(seg(t, a, b)) * (1 - easeInOut(seg(t, c, d)));
const lampX = (t) => 860 + 560 * (hump(t, 2.36, 2.86, 3.55, 3.95) + hump(t, 6.7, 7.2, 7.6, 8.0));

// ---------------------------------------------------------------------------------------------
// Materials.

const RAIL = MAT.lit;
const CAND = { front: ['#213b2b', '#13241a'], top: '#33613f', side: '#0c1811', sil: P.green, hi: P.glow, line: '#2a4a33' };
const REVERT = { ...CAND, sil: P.amber, hi: '#ffe4ae' };
const RETIRED = MAT.metal;
const INK_BASE = '#c2c9ba';
const SHUTTLE = { front: ['#3b4c40', '#222d26'], top: '#5a745f', side: '#121914', sil: '#6a8d72', hi: '#b3d1b9', line: '#33443a' };
const BED = { front: ['#2a362e', '#1a221d'], top: '#3c4f42', side: '#0d120f', sil: '#527059', hi: '#86a98e', line: '#26332a' };
const SLED = { front: ['#33443a', '#1c251f'], top: '#5b7563', side: '#111713', sil: '#6a8d72', hi: '#b3d1b9', line: '#2e3d33' };
const BEZEL = { front: ['#2a362d', '#1a221c'], top: '#4a6150', side: '#0f1411', sil: '#58795f', hi: '#97b99e', line: '#2c3a30' };

// ---------------------------------------------------------------------------------------------
// Parts (vector; drawn into layers and sprites).

const screwRow = (ctx, pts, r = 3.2) => {
  if (LOD.card) return;
  ctx.save();
  ctx.fillStyle = '#0b100c';
  ctx.beginPath();
  for (const [x, y] of pts) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,185,158,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [x, y] of pts) { ctx.moveTo(x - r * 0.6, y - r * 0.6); ctx.lineTo(x + r * 0.6, y + r * 0.6); }
  ctx.stroke();
  ctx.restore();
};

// One rail bar in track-local units, with the running groove on its top face.
function rail(ctx, l0, l1, mat, z = 0) {
  prism(ctx, lrect(l0, 0, l1 - l0, TH, z), DEP, mat, { sil: 3 });
  if (LOD.card) return;
  const a = lp(l0 + 3, 0, z + DEP * 0.5), b = lp(l1 - 3, 0, z + DEP * 0.5);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#0b100c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(134,169,142,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(a[0] + 1, a[1] + 2.5);
  ctx.lineTo(b[0] + 1, b[1] + 2.5);
  ctx.stroke();
  ctx.restore();
  // a fixing screw every 120 units on the front face
  const sc = [];
  for (let x = l0 + 30; x < l1 - 20; x += 120) sc.push(lp(x, TH / 2));
  screwRow(ctx, sc, 3);
}

// A selector section at stage centre (cx, cy), rotated by ang: the same rail profile, two bolts.
function drawSection(ctx, cx, cy, ang, mat) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const Pt = (u, v, z = 0) => [cx + u * c - v * s + D.x * z, cy + u * s + v * c + D.y * z];
  const hw = SEC / 2, hh = TH / 2;
  prism(ctx, [Pt(-hw, -hh), Pt(hw, -hh), Pt(hw, hh), Pt(-hw, hh)], DEP, mat, { sil: 3 });
  if (!LOD.card) {
    const a = Pt(-hw + 3, -hh, DEP * 0.5), b = Pt(hw - 3, -hh, DEP * 0.5);
    ctx.save();
    ctx.strokeStyle = '#0b100c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  }
  for (const u of [-hw + 15, hw - 15]) {
    const p = Pt(u, 0);
    ball(ctx, p[0], p[1], 4.6, MAT.lit);
  }
}
const trackCentre = (ly) => lp(SC, ly + TH / 2);
const SEC_REF = trackCentre(0);
function sectionSprite(ctx, key, mat) {
  const [cx, cy] = SEC_REF;
  const pts = [[cx - 110, cy - 40], [cx + 110, cy + 40], [cx - 110, cy + 40], [cx + 110, cy - 40]];
  return sprite(ctx, 'pl-sec-' + key, boxOf(pts, DEP, 6), (c) => drawSection(c, cx, cy, ANG, mat));
}
// draw a track-angle section with its top at local y, crossfading toward mat2 by u
function sectionAt(ctx, ly, k1, m1, k2, m2, u = 0) {
  const [x, y] = trackCentre(ly);
  const dx = x - SEC_REF[0], dy = y - SEC_REF[1];
  if (u < 1) blit(ctx, sectionSprite(ctx, k1, m1), dx, dy);
  if (u > 0) {
    ctx.save();
    ctx.globalAlpha *= u;
    blit(ctx, sectionSprite(ctx, k2, m2), dx, dy);
    ctx.restore();
  }
}
const RACK_REF = [RACK_X, rackY(0)];
function rackSprite(ctx) {
  const [cx, cy] = RACK_REF;
  return sprite(ctx, 'pl-sec-rack', [cx - SEC / 2 - 8, cy - TH / 2 - 26, SEC + 40, TH + 34], (c) => drawSection(c, cx, cy, 0, RETIRED));
}

// Inverted-U photogate straddling the track in depth. back: the far post (drawn before the sled).
function gateBack(ctx, g) {
  prism(ctx, lrect(g - 6, -88, 12, 88 + TH, DEP + 6), 10, MAT.lit, { sil: 2.5 });
}
function gateFront(ctx, g) {
  prism(ctx, lrect(g - 7, -88, 14, 88 + TH + 8, -10), 10, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 12, -100, 24, 13, -10), DEP + 26, MAT.lit, { sil: 2.5 });
  // foot clamp on the rail and the cable gland on the crossbar
  prism(ctx, lrect(g - 12, TH - 4, 24, 12, -12), 14, MAT.metal, { sil: 2 });
  const e = lp(g, -38, -2);
  ball(ctx, e[0], e[1], 4, MAT.metal);
}

// The sled: a machined carriage on two wheels with a chamfered nose, the blank clamped on top.
const SLED_X0 = S_REST;
function drawSled(ctx) {
  const s = SLED_X0, z = 8;
  // body
  const body = [lp(s - 50, -26, z), lp(s + 38, -26, z), lp(s + 52, -18, z), lp(s + 52, -9, z), lp(s - 50, -9, z)];
  prism(ctx, body, 28, SLED, { sil: 2.5 });
  // clamp jaw at the rear of the blank and the cord eye at the tail
  prism(ctx, [lp(s - 30, -26, z + 4), lp(s - 23, -26, z + 4), lp(s - 23, -44, z + 4), lp(s - 30, -44, z + 4)], 20, MAT.lit, { sil: 2 });
  const eye = lp(s - 50, -17, z + 14);
  ctx.save();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.2);
  ctx.beginPath();
  ctx.arc(eye[0] - 5, eye[1], 4.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // the blank: 2:3, clipped top-right corner, registration hole
  const bw = 39, bh = 58, cut = 9, x0 = s - bw / 2 + 4, y0 = -26;
  const pts = [lp(x0, y0, z + 10), lp(x0 + bw, y0, z + 10), lp(x0 + bw, y0 - bh + cut, z + 10), lp(x0 + bw - cut, y0 - bh, z + 10), lp(x0, y0 - bh, z + 10)];
  prism(ctx, pts, 9, MAT.ivory, { sil: 2 });
  const h = lp(x0 + 14, y0 - bh + 10, z + 10);
  ctx.fillStyle = '#1c2620';
  ctx.beginPath();
  ctx.arc(h[0], h[1], 4, 0, Math.PI * 2);
  ctx.fill();
  // wheels on the near side, with hubs
  for (const u of [s - 32, s + 32]) {
    const p = lp(u, -7, z - 2);
    ball(ctx, p[0], p[1], 7.5, MAT.metal);
    ctx.fillStyle = '#86a98e';
    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!LOD.card) screwRow(ctx, [lp(s - 40, -17, z), lp(s + 14, -17, z), lp(s + 32, -17, z)], 2.6);
}
function sledSprite(ctx) {
  const ref = lp(SLED_X0, -40);
  return sprite(ctx, 'pl-sled', [ref[0] - 75, ref[1] - 72, 165, 144], drawSled);
}
function sledAt(ctx, x, lift) {
  const [dx, dy] = ldelta(x - SLED_X0, -lift);
  blit(ctx, sledSprite(ctx), dx, dy);
}

function winchSpokes(ctx, x) {
  const c = lp(-30, -12, DEP * 0.5);
  const ang = (x - S_REST) / 22;
  // cord from the drum to the sled's tail eye
  const hook = lp(x - 50, -17, 8 + 14);
  const tan = lp(-30, -36, DEP * 0.5);
  ctx.save();
  ctx.strokeStyle = '#8f988a';
  ctx.lineWidth = lw(2.4);
  ctx.beginPath();
  ctx.moveTo(tan[0], tan[1]);
  ctx.lineTo(hook[0] - 9, hook[1]);
  ctx.stroke();
  // spokes turning as cord pays out
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
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c[0], c[1], 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  ctx.restore();
  ball(ctx, c[0], c[1], 5.5, MAT.lit);
}

function bufferBlock(ctx) {
  prism(ctx, lrect(L - 20, -40, 20, 40 + TH, 0), DEP, RAIL, { sil: 2.5 });
}
function bufferSpring(ctx, x) {
  const comp = clamp01((x - S_END) / 10); // 0 rest .. 1 fully squashed
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

// The selector. Fixed bed with two guide ways (static, back layer); the shuttle plate slides on
// them along the normal and carries the two section pockets.
function bed(ctx) {
  const y0 = -DS - 36, y1 = DS + TH + 30;
  prism(ctx, lrect(SEL0 - 64, y0, SEC + 128, y1 - y0, DEP + 22), 12, BED, { sil: 2.5 });
  // ways, with a lit wear line, and the stop blocks at both ends
  for (const x of [SEL0 - 46, SEL1 + 32]) {
    prism(ctx, lrect(x, y0 + 8, 14, y1 - y0 - 16, DEP + 12), 10, MAT.lit, { sil: 2 });
    if (!LOD.card) {
      const a = lp(x + 4, y0 + 12, DEP + 12), b = lp(x + 4, y1 - 12, DEP + 12);
      ctx.save();
      ctx.strokeStyle = 'rgba(164,200,172,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.restore();
    }
  }
  for (const y of [y0, y1 - 12]) prism(ctx, lrect(SEL0 - 64, y, SEC + 128, 12, DEP + 10), 14, MAT.lit, { sil: 2 });
  screwRow(ctx, [lp(SEL0 - 54, y0 + 6, DEP + 10), lp(SEL1 + 54, y0 + 6, DEP + 10), lp(SEL0 - 54, y1 - 6, DEP + 10), lp(SEL1 + 54, y1 - 6, DEP + 10), lp(SC, y0 + 6, DEP + 10), lp(SC, y1 - 6, DEP + 10)], 3.2);
}
function drawShuttle(ctx) {
  const y0 = -DS - 16, y1 = TH + 16;
  // plate with chamfered corners and shoes that ride the ways
  const k = 10, xa = SEL0 - 30, xb = SEL1 + 30;
  const plate = [lp(xa + k, y0, DEP + 2), lp(xb - k, y0, DEP + 2), lp(xb, y0 + k, DEP + 2), lp(xb, y1 - k, DEP + 2), lp(xb - k, y1, DEP + 2), lp(xa + k, y1, DEP + 2), lp(xa, y1 - k, DEP + 2), lp(xa, y0 + k, DEP + 2)];
  for (const x of [SEL0 - 52, SEL1 + 26]) prism(ctx, lrect(x, y0 + 6, 26, y1 - y0 - 12, DEP), 16, MAT.lit, { sil: 2 });
  prism(ctx, plate, 12, SHUTTLE, { sil: 2.5 });
  // pockets: recessed berths with a shadowed upper lip and a lit lower lip
  for (const y of [-DS, 0]) {
    const p = lrect(SEL0 - 5, y - 5, SEC + 10, TH + 10, DEP + 2);
    ctx.save();
    poly(ctx, p);
    ctx.fillStyle = '#0a0e0b';
    ctx.fill();
    ctx.strokeStyle = '#1b231d';
    ctx.lineWidth = lw(1.5);
    ctx.stroke();
    const a = lp(SEL0 - 5, y + TH + 5, DEP + 2), b = lp(SEL1 + 5, y + TH + 5, DEP + 2);
    ctx.strokeStyle = SHUTTLE.hi;
    ctx.lineWidth = lw(1.6);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    ctx.restore();
  }
  // detent plunger between the pockets
  prism(ctx, lrect(SC - 16, -DS + TH + 12, 32, DS - TH - 24, DEP), 10, MAT.lit, { sil: 2 });
  const d = lp(SC, -DS / 2 + TH / 2, DEP);
  ball(ctx, d[0], d[1], 6, MAT.lit);
  screwRow(ctx, [lp(xa + 12, y0 + 10, DEP + 2), lp(xb - 12, y0 + 10, DEP + 2), lp(xa + 12, y1 - 10, DEP + 2), lp(xb - 12, y1 - 10, DEP + 2)], 3.2);
}
function shuttleAt(ctx, c) {
  const S = sprite(ctx, 'pl-shuttle', lbox(SEL0 - 70, -DS - 30, SEL1 + 70, TH + 30, DEP + 30), drawShuttle);
  const [dx, dy] = ldelta(0, DS * c);
  blit(ctx, S, dx, dy);
}

// The session's hand: telescoping rod out of the housing, a hatched head with two fingers.
function drawHand(ctx, SM) {
  const y = PARK;
  prism(ctx, lrect(SC - 9, y - 16 - 200, 18, 200), 16, SM, { sil: 2.5 });
  // head with the two fingers as one casting
  const head = [
    lp(SC - 74, y - 18, -4), lp(SC + 74, y - 18, -4), lp(SC + 74, y + TH - 6, -4), lp(SC + 62, y + TH - 6, -4),
    lp(SC + 62, y - 4, -4), lp(SC - 62, y - 4, -4), lp(SC - 62, y + TH - 6, -4), lp(SC - 74, y + TH - 6, -4),
  ];
  prism(ctx, head, 30, SM, { hatch: true, sil: 3, hatchGap: 10 });
  screwRow(ctx, [lp(SC - 40, y - 11, -4), lp(SC + 40, y - 11, -4)], 2.6);
}
function handSprite(ctx, on) {
  return sprite(ctx, 'pl-hand-' + on, lbox(SC - 90, PARK - 230, SC + 90, PARK + TH + 10, 32), (c) => drawHand(c, activeMat(MAT.session, on)));
}
function hand(ctx, hs, t) {
  if (hs.y <= HIDE + 0.5 && !hs.held) return; // fully inside the housing (the housing is opaque)
  const [dx, dy] = ldelta(0, hs.y - PARK);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOUSE.y + 4, W, H);
  ctx.clip();
  if (hs.held) {
    if (hs.held === 'Cx') sectionAt(ctx, hs.y, 'rev', REVERT);
    else sectionAt(ctx, hs.y, 'cand', CAND);
  }
  const a = handActive(t);
  blit(ctx, handSprite(ctx, 0), dx, dy);
  if (a > 0.004) {
    ctx.globalAlpha *= a;
    blit(ctx, handSprite(ctx, 1), dx, dy);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Chart.

const PEN_REF = ROW.base;
function drawPen(ctx) {
  const y = PEN_REF;
  prism(ctx, rect(ROD_X - 16, y - 17, 32, 34), 18, MAT.lit, { sil: 2.5 });
  rodH(ctx, PEN_X + 6, ROD_X - 16, y, 9, MAT.lit);
  const tip = [[PEN_X - 2, y], [PEN_X + 12, y - 8], [PEN_X + 12, y + 8]];
  ctx.fillStyle = '#1a231c';
  poly(ctx, tip);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2);
  ctx.stroke();
  screwRow(ctx, [[ROD_X - 6, y - 8], [ROD_X + 6, y + 8]], 2.4);
}
function pen(ctx, t) {
  const y = penY(t);
  blit(ctx, sprite(ctx, 'pl-pen', [PEN_X - 8, PEN_REF - 30, ROD_X + 30 - PEN_X, 60], drawPen), 0, y - PEN_REF);
  ctx.fillStyle = penInk(t) ? P.green : INK_BASE;
  ctx.beginPath();
  ctx.arc(PEN_X + 1, y, 3.6 * LOD.k, 0, Math.PI * 2);
  ctx.fill();
}

// Paper rulings and sprocket holes, one pattern period wider than the paper so it can scroll.
function drawRulings(ctx) {
  const top = PAPER.y + 16, bot = PAPER.y + PAPER.h - 16;
  const xa = PAPER.x - 4, xb = PAPER.x + PAPER.w + RULE_P + 4;
  ctx.lineCap = 'butt';
  for (const major of [false, true]) {
    if (LOD.card && !major) continue;
    ctx.strokeStyle = major ? '#33463a' : '#253228';
    ctx.lineWidth = lw(major ? 2 : 1.5);
    ctx.beginPath();
    const n0 = Math.ceil((xa - PEN_X) / GRID), n1 = Math.floor((xb - PEN_X) / GRID);
    for (let n = n0; n <= n1; n++) {
      if ((((n % 4) + 4) % 4 === 0) !== major) continue;
      const x = PEN_X + n * GRID;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bot);
    }
    for (let y = top, i = 0; y <= bot + 0.5; y += GRID, i++) {
      if ((i % 4 === 0) !== major) continue;
      ctx.moveTo(xa, y);
      ctx.lineTo(xb, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = '#080b09';
  ctx.beginPath();
  const n0 = Math.ceil((xa - PEN_X) / GRID) - 1, n1 = Math.floor((xb - PEN_X) / GRID);
  for (let n = n0; n <= n1; n++) {
    const x = PEN_X + n * GRID + GRID / 2;
    for (const y of [PAPER.y + 7, PAPER.y + PAPER.h - 7]) ctx.roundRect(x - 4, y - 3, 8, 6, 2.5);
  }
  ctx.fill();
}
const q64 = (v) => Math.round(v * 64) / 64;
function drawDot(ctx, cand) {
  const r = DOT_R, x = 0, y = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(x + 1.5, y + 2.5, r, 0, Math.PI * 2);
  ctx.fill();
  const col = cand ? P.green : INK_BASE;
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, cand ? '#a4f5ba' : '#eef0e6');
  g.addColorStop(0.45, col);
  g.addColorStop(1, cand ? '#2f8a4a' : '#7e857a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function paper(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAPER.x, PAPER.y, ROD_X - 6 - PAPER.x, PAPER.h);
  ctx.clip();
  // rulings are fixed to the paper; the paper has moved V * t (a whole pattern per loop)
  const off = q64(V * t);
  const sh = off - RULE_P * Math.floor(off / RULE_P);
  blit(ctx, sprite(ctx, 'pl-rulings', [PAPER.x - 6, PAPER.y, PAPER.w + RULE_P + 12, PAPER.h], drawRulings), -sh, 0);
  // dots: every run marks one; earlier loops' dots are still on the paper
  const S = [sprite(ctx, 'pl-dot-0', [-DOT_R - 2, -DOT_R - 2, 2 * DOT_R + 6, 2 * DOT_R + 7], (c) => drawDot(c, false)), sprite(ctx, 'pl-dot-1', [-DOT_R - 2, -DOT_R - 2, 2 * DOT_R + 6, 2 * DOT_R + 7], (c) => drawDot(c, true))];
  for (const r of RUNS) {
    for (let m = 0; m < 3; m++) {
      const age = t - r.tDot + m * T;
      if (age < 0) continue;
      const x = q64(PEN_X - V * age);
      if (x < PAPER.x - DOT_R * 2) continue;
      blit(ctx, S[r.cand ? 1 : 0], x, r.y);
    }
  }
  ctx.restore();
}

// The spread of each row in the round under test, bracketed while the caliper measures. Where the
// brackets overlap (round 2) the overlap is tinted amber: the gain is inside the noise.
function spreads(ctx, t, ri, a) {
  if (a <= 0) return;
  const rs = RUNS.filter((r) => r.ri === ri);
  const box = (cand) => {
    const g = rs.filter((r) => r.cand === cand);
    const xs = g.map((r) => PEN_X - V * (t - r.tDot)), ys = g.map((r) => r.y);
    return { x0: Math.min(...xs) - DOT_R - 9, x1: Math.max(...xs) + DOT_R + 9, y0: Math.min(...ys) - DOT_R - 4, y1: Math.max(...ys) + DOT_R + 4 };
  };
  const b = box(false), c = box(true);
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAPER.x, PAPER.y, ROD_X - 6 - PAPER.x, PAPER.h);
  ctx.clip();
  ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(214,220,204,0.10)';
  ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  ctx.fillStyle = 'rgba(83,219,118,0.11)';
  ctx.fillRect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
  const oy0 = Math.max(b.y0, c.y0), oy1 = Math.min(b.y1, c.y1);
  if (oy1 > oy0) {
    ctx.fillStyle = 'rgba(239,200,126,0.30)';
    ctx.fillRect(Math.max(b.x0, c.x0), oy0, Math.min(b.x1, c.x1) - Math.max(b.x0, c.x0), oy1 - oy0);
  }
  // bracket rules: top and bottom of each spread, with end ticks on the left
  ctx.lineWidth = lw(2);
  for (const [k, col] of [[b, 'rgba(214,220,204,0.7)'], [c, 'rgba(114,242,140,0.75)']]) {
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(k.x0 + 8, k.y0); ctx.lineTo(k.x0, k.y0); ctx.lineTo(k.x0, k.y1); ctx.lineTo(k.x0 + 8, k.y1);
    ctx.moveTo(k.x0, k.y0); ctx.lineTo(k.x1, k.y0);
    ctx.moveTo(k.x0, k.y1); ctx.lineTo(k.x1, k.y1);
    ctx.stroke();
  }
  ctx.restore();
}

// Fresh caliper: clean green. Drops out of the chart's header, opens its inside jaws in the clear
// gap between the baseline row and the candidate row, and lifts out.
const BLADE = 12;
function roundStats(ri) {
  const rs = RUNS.filter((r) => r.ri === ri);
  const baseLow = Math.max(...rs.filter((r) => !r.cand).map((r) => r.y)) + DOT_R;
  const candHigh = Math.min(...rs.filter((r) => r.cand).map((r) => r.y)) - DOT_R;
  const top = Math.min(...rs.map((r) => r.y)) - DOT_R;
  // Inside jaws: two blades back to back (2 * BLADE thick). A clear gap: the upper blade seats under
  // the baseline row and the lower one opens down to the candidate row. None: the closed blades stop
  // on top of the cluster.
  const gap = Math.max(0, candHigh - baseLow - 2 * BLADE);
  return { gap, jawY: gap > 0 ? baseLow : top - 2 * BLADE };
}
const STATS = [roundStats(0), roundStats(1)];

function caliperPose(t, cal) {
  const lt = t - cal.t0;
  if (lt < 0 || lt >= cal.lift + C_OUT) return null;
  const { gap, jawY } = STATS[cal.ri];
  let dy = 0;
  if (lt < C_IN) dy = -C_DROP * (1 - easeOut(lt / C_IN));
  else if (lt >= cal.lift) dy = -C_DROP * easeIn((lt - cal.lift) / C_OUT);
  const o0 = C_IN + 0.02, o1 = C_IN + 0.32;
  const open = gap * easeInOut(seg(lt, o0, o1));
  const band = seg(lt, C_IN - 0.1, C_IN + 0.1) * (1 - seg(lt, cal.lift - 0.05, cal.lift + 0.12));
  return { dy, open, jawY, gap, touchT: cal.t0 + (gap > 0 ? o1 : C_IN), band };
}

const CAL_REF = 0; // sprites are drawn with the fixed blade's upper edge at y = 0
function drawCalBody(ctx) {
  const x = CAL_X, top = CAL_REF;
  // beam and fixed blade as one piece, with engraved graduations (no figures)
  prism(ctx, [[x - 13, top - 150], [x + 13, top - 150], [x + 13, top], [x + 188, top], [x + 150, top + BLADE], [x + 13, top + BLADE], [x + 13, top + 150], [x - 13, top + 150]], 12, MAT.fresh, { sil: 3 });
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(164,245,186,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const y = top - 140 + i * 10;
      if (y > top - 4 && y < top + BLADE + 4) continue;
      ctx.moveTo(x + 13, y);
      ctx.lineTo(x + 13 - (i % 5 === 0 ? 11 : 6), y);
    }
    ctx.stroke();
  }
  ball(ctx, x, top - 136, 6, MAT.fresh);
}
function drawCalSlider(ctx) {
  const x = CAL_X, sy = CAL_REF + BLADE;
  prism(ctx, [[x - 20, sy - 30], [x + 20, sy - 30], [x + 20, sy], [x + 150, sy], [x + 188, sy + BLADE], [x + 20, sy + BLADE], [x + 20, sy + 16], [x - 20, sy + 16]], 16, MAT.fresh, { sil: 2.5 });
  ball(ctx, x - 26, sy - 8, 8, MAT.fresh);
}
function caliper(ctx, pose) {
  const { dy, open, jawY } = pose;
  const top = jawY + dy;
  ctx.save();
  ctx.beginPath();
  ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h + 40);
  ctx.clip();
  blit(ctx, sprite(ctx, 'pl-cal-body', [CAL_X - 24, CAL_REF - 166, 230, 330], drawCalBody), 0, top - CAL_REF);
  blit(ctx, sprite(ctx, 'pl-cal-slider', [CAL_X - 40, CAL_REF - 30, 240, 70], drawCalSlider), 0, top - CAL_REF + open);
  ctx.restore();
  if (!LOD.card && open > 20) dimension(ctx, CAL_X - 16, top, CAL_X - 16, top + BLADE + open + BLADE, 30, 0.7);
}

// The old baseline falls out of slot 0 when the carriage is down, lands on its low end and flops flat.
function fallingOld(ctx, t) {
  if (t < FALL_T || t >= FALL_END) return false;
  const [x0, y0] = trackCentre(DS);
  const yLand = rackY(0);
  const tf = 0.16; // free fall until the low end meets the stack
  const lt = t - FALL_T;
  let cy, ang;
  const lowDrop = yLand - (SEC / 2) * SA - y0; // centre drop when the low end reaches the stack top
  if (lt < tf) {
    const u = lt / tf;
    cy = y0 + lowDrop * u * u;
    ang = ANG;
  } else {
    const k = springStep(lt - tf, 0.55, 26);
    ang = ANG * (1 - k);
    cy = y0 + lowDrop + (yLand - y0 - lowDrop) * k;
  }
  drawSection(ctx, x0, cy, ang, RETIRED);
  return true;
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 900, 560);
  // shadows on the bench
  const legs = [40, 860].map((lx) => lp(lx, TH));
  for (const [x] of legs) contactShadow(ctx, x + 14, FLOOR - 6, 60, 12, 0.55);
  contactShadow(ctx, RACK_X + 10, FLOOR - 6, 150, 16, 0.5);
  contactShadow(ctx, CAB.x + CAB.w / 2 + 20, FLOOR - 4, 340, 22, 0.6);
  contactShadow(ctx, COL_X + 30, FLOOR - 6, 80, 14, 0.55);
  // track legs: posts from the rail to the bench, foot plates, clamp collars
  for (const [x, y] of legs) {
    prism(ctx, rect(x - 26, FLOOR - 12, 64, 12), 40, MAT.metal, { sil: 2.5 });
    rodV(ctx, x + 6, y + 6, FLOOR - 12, 16, MAT.lit);
    prism(ctx, rect(x - 6, y + 2, 24, 22), 22, MAT.lit, { sil: 2.5 });
    if (!LOD.card) ball(ctx, x - 12, y + 14, 5, MAT.lit);
    screwRow(ctx, [[x - 16, FLOOR - 6], [x + 28, FLOOR - 6]], 2.6);
  }
  // winch bracket
  const wc = lp(-30, -12, DEP * 0.5);
  prism(ctx, rect(wc[0] - 8, wc[1], 16, lp(40, TH)[1] - wc[1] + 10), 14, MAT.metal, { sil: 2 });
  // selector bed, fixed to the track frame behind the shuttle
  bed(ctx);
  // rack: base sunk into the bench, two posts with shelf pins
  const rx = RACK_X;
  ctx.fillStyle = '#060807';
  ctx.beginPath();
  ctx.moveTo(rx - SEC / 2 - 14, FLOOR - 2);
  ctx.lineTo(rx + SEC / 2 + 14, FLOOR - 2);
  ctx.lineTo(rx + SEC / 2 + 14 + D.x * 60, FLOOR - 2 + D.y * 60);
  ctx.lineTo(rx - SEC / 2 - 14 + D.x * 60, FLOOR - 2 + D.y * 60);
  ctx.closePath();
  ctx.fill();
  for (const x of [rx - SEC / 2 - 14, rx + SEC / 2 + 4]) prism(ctx, rect(x, RACK_Y0 - 36, 10, FLOOR - RACK_Y0 + 32), 54, MAT.metal, { sil: 2.5 });
  // chart recorder cabinet, lit bezel round the window, the window recess
  prism(ctx, rect(CAB.x, CAB.y, CAB.w, CAB.h), 64, MAT.metal, { sil: 3 });
  const bz = 14;
  prism(ctx, rect(WIN.x - bz, WIN.y - bz, WIN.w + 2 * bz, bz), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x - bz, WIN.y + WIN.h, WIN.w + 2 * bz, bz), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x - bz, WIN.y, bz, WIN.h), 10, BEZEL, { sil: 2 });
  prism(ctx, rect(WIN.x + WIN.w, WIN.y, bz, WIN.h), 10, BEZEL, { sil: 2 });
  screwRow(ctx, [[WIN.x - 7, WIN.y - 7], [WIN.x + WIN.w + 7, WIN.y - 7], [WIN.x - 7, WIN.y + WIN.h + 7], [WIN.x + WIN.w + 7, WIN.y + WIN.h + 7]], 3.2);
  ctx.fillStyle = '#080b09';
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  // the paper face, lit from the upper left
  let g = ctx.createLinearGradient(PAPER.x, PAPER.y, PAPER.x + PAPER.w, PAPER.y + PAPER.h);
  g.addColorStop(0, '#1c271f');
  g.addColorStop(0.55, '#26332a');
  g.addColorStop(1, '#202b23');
  ctx.fillStyle = g;
  ctx.fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  g = ctx.createRadialGradient(PAPER.x + PAPER.w * 0.62, PAPER.y + 120, 10, PAPER.x + PAPER.w * 0.62, PAPER.y + 120, 320);
  g.addColorStop(0, 'rgba(200,232,208,0.07)');
  g.addColorStop(1, 'rgba(200,232,208,0)');
  ctx.fillStyle = g;
  ctx.fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  // pen guide rod
  rodV(ctx, ROD_X, WIN.y + 4, WIN.y + WIN.h - 4, 8, MAT.lit);
  // cabinet foot rail and controls below the window
  prism(ctx, rect(CAB.x - 10, FLOOR - 14, CAB.w + 20, 14), 70, MAT.metal, { sil: 2.5 });
  if (!LOD.card) {
    for (const x of [CAB.x + 60, CAB.x + 110]) ball(ctx, x, WIN.y + WIN.h + 40, 9, MAT.lit);
    prism(ctx, rect(CAB.x + CAB.w - 180, WIN.y + WIN.h + 30, 130, 18), 6, BEZEL, { sil: 1.5 });
    ctx.fillStyle = '#0a0e0b';
    ctx.fillRect(CAB.x + CAB.w - 172, WIN.y + WIN.h + 35, 114, 8);
  }
  // session column and boom (the hand's fixed part)
  const idle = activeMat(MAT.session, 0.3);
  prism(ctx, rect(COL_X - 24, FLOOR - 14, 96, 14), 50, idle, { sil: 3 });
  screwRow(ctx, [[COL_X - 12, FLOOR - 7], [COL_X + 58, FLOOR - 7]], 3);
  // gussets at the foot
  prism(ctx, [[COL_X - 16, FLOOR - 14], [COL_X, FLOOR - 14], [COL_X, FLOOR - 64]], 8, idle, { sil: 2 });
  prism(ctx, [[COL_X + 46, FLOOR - 14], [COL_X + 62, FLOOR - 14], [COL_X + 46, FLOOR - 64]], 8, idle, { sil: 2 });
  prism(ctx, rect(COL_X, BOOM_Y + 8, 46, FLOOR - 14 - BOOM_Y - 8), 36, idle, { hatch: true, sil: 3.5 });
  // a cable conduit clipped down the column's side
  rodV(ctx, COL_X + 56, BOOM_Y + 40, FLOOR - 30, 9, MAT.lit);
  for (let y = BOOM_Y + 80; y < FLOOR - 40; y += 120) prism(ctx, rect(COL_X + 44, y, 20, 8), 6, MAT.lit, { sil: 1.5 });
  screwRow(ctx, [[COL_X + 23, BOOM_Y + 70], [COL_X + 23, (BOOM_Y + FLOOR) / 2], [COL_X + 23, FLOOR - 60]], 3);
  // boom, cap block and the gusset under the joint
  prism(ctx, rect(HOUSE.x + HOUSE.w - 20, BOOM_Y, COL_X + 46 - (HOUSE.x + HOUSE.w - 20), 26), 30, idle, { hatch: true, sil: 3 });
  prism(ctx, rect(COL_X - 8, BOOM_Y - 8, 62, 30), 40, idle, { sil: 3 });
  prism(ctx, [[COL_X - 50, BOOM_Y + 26], [COL_X, BOOM_Y + 26], [COL_X, BOOM_Y + 76]], 10, idle, { sil: 2 });
  screwRow(ctx, [[COL_X + 4, BOOM_Y + 7], [COL_X + 42, BOOM_Y + 7]], 3);
}

// Everything static that sits in front of the shuttle and behind the sled: rails, far gate posts,
// buffer stop, winch drum, the rack's resting sections.
function midLayer(ctx) {
  rail(ctx, 0, SEL0 - 6, RAIL);
  rail(ctx, SEL1 + 6, L, RAIL);
  for (const g of GATES) gateBack(ctx, g);
  bufferBlock(ctx);
  winchDrum(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, FLOOR - 4);
  ctx.clip();
  for (const k of [1, 2, 3]) drawSection(ctx, RACK_X, rackY(k), 0, RETIRED);
  ctx.restore();
}
const RACK_BOX = [RACK_X - SEC / 2 - 10, RACK_Y0 - 40, SEC + 50, FLOOR - RACK_Y0 + 40];

function frontLayer(ctx) {
  for (const g of GATES) gateFront(ctx, g);
  // unlit gate lamps and beams (lit states are drawn over them)
  for (const g of GATES) {
    const a = lp(g, -38, -2), b = lp(g, -38, DEP + 6);
    if (!LOD.card) {
      ctx.save();
      ctx.strokeStyle = rgba(P.green, 0.18);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.restore();
    }
    const led = lp(g, -94, -10);
    ball(ctx, led[0], led[1], 5, MAT.metal);
  }
  // paper shading toward the take-up roller
  const sh = ctx.createLinearGradient(PAPER.x, 0, PAPER.x + 120, 0);
  sh.addColorStop(0, 'rgba(4,6,5,0.55)');
  sh.addColorStop(1, 'rgba(4,6,5,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(PAPER.x, PAPER.y, 120, PAPER.h);
  // paper rollers at the window ends and the window lip
  rodV(ctx, WIN.x + 16, WIN.y + 2, WIN.y + WIN.h - 2, 28, MAT.lit);
  rodV(ctx, WIN.x + WIN.w - 16, WIN.y + 2, WIN.y + WIN.h - 2, 28, MAT.lit);
  ctx.save();
  ctx.strokeStyle = '#5f8167';
  ctx.lineWidth = lw(2.5);
  ctx.strokeRect(WIN.x, WIN.y, WIN.w, WIN.h);
  ctx.restore();
  prism(ctx, rect(WIN.x - 6, WIN.y - 14, WIN.w + 12, 14), 18, MAT.metal, { sil: 2.5 });
  // hand housing: the session's magazine over the selector
  const idle = activeMat(MAT.session, 0.3);
  prism(ctx, rect(HOUSE.x + HOUSE.w - 8, HOUSE.y + 6, 30, HOUSE.h - 22), 40, idle, { sil: 2.5 }); // flange to the boom
  prism(ctx, rect(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h), 50, idle, { hatch: true, sil: 3.5 });
  // access cover with four screws and a vent grille
  prism(ctx, rect(HOUSE.x + 20, HOUSE.y + 14, 92, 46), 4, { ...MAT.session, sil: '#3f8a57', hi: '#7fcf95' }, { sil: 2 });
  screwRow(ctx, [[HOUSE.x + 28, HOUSE.y + 22], [HOUSE.x + 104, HOUSE.y + 22], [HOUSE.x + 28, HOUSE.y + 52], [HOUSE.x + 104, HOUSE.y + 52]], 2.6);
  if (!LOD.card) {
    ctx.fillStyle = '#050906';
    for (let k = 0; k < 5; k++) ctx.fillRect(HOUSE.x + 136 + k * 16, HOUSE.y + 18, 7, 38);
  }
  // the mouth the rod runs through, with a lit lip and a guide bushing
  ctx.fillStyle = '#050806';
  ctx.fillRect(HOUSE.x + 24, HOUSE.y + HOUSE.h - 5, HOUSE.w - 48, 5);
  ctx.fillStyle = '#6fbf87';
  ctx.fillRect(HOUSE.x + 24, HOUSE.y + HOUSE.h - 1, HOUSE.w - 48, lw(1.5));
  if (!LOD.card) {
    centreLine(ctx, lp(-20, TH / 2)[0], lp(-20, TH / 2)[1], lp(L + 20, TH / 2)[0], lp(L + 20, TH / 2)[1], 0.35);
    const a = lp(GATES[0], TH), b = lp(GATES[1], TH);
    dimension(ctx, a[0], a[1], b[0], b[1], 46, 0.55);
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
    cached(ctx, 'perf-loop-back', backLayer);

    const c = carriage(t);
    const sled = sledPos(t);
    const hs = handState(t);
    const cal = CALS.map((k) => caliperPose(t, k)).find(Boolean);

    // chart
    paper(ctx, t);
    if (cal) spreads(ctx, t, CALS.find((k) => t >= k.t0 && t < k.t0 + k.lift + C_OUT).ri, cal.band);

    // selector: shuttle on its ways, then the sections it holds
    shuttleAt(ctx, c);
    const yc = DS * c;
    // slot 0: the baseline. It is the old one until it drops at the keep; after the keep it is B.
    if (t < FALL_T) sectionAt(ctx, yc, 'rail', RAIL);
    // B: slot 1 from its seating until the keep, then bolted into the track (it becomes the baseline)
    if (t >= SLOT_A && t < KEEP) sectionAt(ctx, yc - DS, 'cand', CAND);
    else if (t >= KEEP) sectionAt(ctx, t < REHOME + IDX ? 0 : yc, 'cand', CAND, 'rail', RAIL, seg(t, KEEP + 0.02, KEEP + 0.4));
    // C: slot 1 from its seating until the hand grips it at the revert
    if (t >= SLOT_C + SLOT_A && t < GRIP) sectionAt(ctx, yc - DS, 'cand', CAND, 'rev', REVERT, seg(t, REV, REV + 0.12));

    // rails and the rest of the static track; the rack's resting sections live in the same layer
    const shifting = t >= RACK_T[0] && t < RACK_T[1];
    if (shifting) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(...RACK_BOX);
      ctx.clip('evenodd');
      cached(ctx, 'perf-loop-mid', midLayer);
      ctx.restore();
      const sh = RACK_P * indexEase(seg(t, RACK_T[0], RACK_T[1]));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, FLOOR - 4);
      ctx.clip();
      for (const k of [0, 1, 2, 3]) {
        const y = rackY(k) + sh;
        if (y - TH / 2 > FLOOR) continue;
        blit(ctx, rackSprite(ctx), 0, y - RACK_REF[1]);
      }
      ctx.restore();
    } else {
      cached(ctx, 'perf-loop-mid', midLayer);
      if (!fallingOld(ctx, t) && t >= FALL_END && t < RACK_T[0]) blit(ctx, rackSprite(ctx), 0, 0);
    }

    winchSpokes(ctx, sled.x);
    if (sled.x > S_END) bufferSpring(ctx, sled.x);
    else blit(ctx, sprite(ctx, 'pl-buffer-rest', lbox(L - 70, -50, L - 10, 10, 40), (k) => bufferSpring(k, S_END)));
    contactShadow(ctx, ...lp(sled.x, -2, 22), 52, 7, 0.5 * (1 - sled.lift / (LIFT_H * 3)));
    sledAt(ctx, sled.x, sled.lift);

    hand(ctx, hs, t);

    pen(ctx, t);
    if (cal) caliper(ctx, cal);

    cached(ctx, 'perf-loop-front', frontLayer);
    lampFalloff(ctx, lampX(t), 540, 440, 1300, 0.62);

    // Light on top: gate lamps, the pen's contact, the bolts, the hand's contacts, the caliper jaws.
    for (const g of GATES) {
      let lit = 0;
      for (const r of RUNS) {
        const u = (t - gateTime(r, g)) / 0.16;
        if (u > 0 && u < 1) lit = Math.max(lit, 1 - u);
      }
      if (lit <= 0) continue;
      if (!LOD.card) {
        const a = lp(g, -38, -2), b = lp(g, -38, DEP + 6);
        ctx.save();
        ctx.strokeStyle = rgba(P.green, (0.5 * lit) / 0.82);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.restore();
      }
      const led = lp(g, -94, -10);
      ball(ctx, led[0], led[1], 5, { ...MAT.fresh, top: mix('#2f6141', P.bright, lit), hi: '#e9fff0' });
      softGlow(ctx, led[0], led[1], 26, P.bright, 0.55 * lit);
    }
    for (const r of RUNS) contactGlow(ctx, PEN_X, r.y, (t - r.tDot) / 0.12, 26);
    for (const s0 of [0, SLOT_C]) {
      const e = engage(t, s0, SLOT_A);
      contactGlow(ctx, ...lp(SC, -DS + TH * 0.5, -6), e.c, 36);
    }
    for (const lx of [SEL0 + 15, SEL1 - 15]) contactGlow(ctx, ...lp(lx, TH / 2), (t - KEEP) / 0.12, 30);
    contactGlow(ctx, ...lp(SC, -DS - 10, -6), (t - GRIP) / 0.12, 36);
    if (cal) {
      const cu = (t - cal.touchT) / 0.12;
      if (cal.gap > 0) {
        contactGlow(ctx, CAL_X + 120, cal.jawY + cal.dy, cu, 28);
        contactGlow(ctx, CAL_X + 120, cal.jawY + cal.dy + 2 * BLADE + cal.open, cu, 28);
      } else contactGlow(ctx, CAL_X + 150, cal.jawY + cal.dy + 2 * BLADE, cu, 28);
    }
    dust(ctx, RACK_X + SEC / 2 - 10, rackY(0) - 8, t - FALL_T - 0.16, 0x7e1, { ang: -Math.PI * 0.2, spread: 1.2, n: 8, dur: 0.4 });

    grainOver(ctx, 0.3, 'soft-light');
  },
};
