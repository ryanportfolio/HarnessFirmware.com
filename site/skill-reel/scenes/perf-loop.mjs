// /perf-loop at final fidelity (pitch A 3.7, same beats and timing as the animatic perf-loop.js).
// A Galileo inclined plane rebuilt as a bench instrument: a sled carrying the blank runs down a
// track through two timing gates, and a strip-chart recorder marks each run as a dot on paper that
// moves left at constant speed. One track section sits on a two-position selector: the baseline in
// the track, the candidate parked above it. Runs alternate between them. A fresh caliper drops onto
// the chart and opens its inside jaws in the clear gap between the two rows of dots. Round 1: a
// clear gap, the candidate is bolted in and the old section drops to the retired rack. Round 2: the
// rows overlap, the jaws cannot open, and the session's hand lifts the candidate back out with an
// amber edge. No numbers, no bars, no stamp: the chart is relative to the current baseline.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, dimension, centreLine,
  benchFinal, lampFalloff, activeMat, rng,
} from '../kit.mjs';

const T = 10.0;

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
const SLED_L = 104;

const lp = (lx, ly, z = 0) => [P0.x + lx * CA - ly * SA + D.x * z, P0.y + lx * SA + ly * CA + D.y * z];
const lrect = (x, y, w, h, z = 0) => [lp(x, y, z), lp(x + w, y, z), lp(x + w, y + h, z), lp(x, y + h, z)];

// Strip chart.
const CAB = { x: 1240, y: 300, w: 596, h: FLOOR - 300 };
const WIN = { x: 1268, y: 334, w: 540, h: 370 };
const PAPER = { x: 1298, y: 342, w: 478, h: 354 };
const PEN_X = 1716, ROD_X = PEN_X + 44;
const V = 52, GRID = 26; // V * T = 520 px = 20 grid cells: the paper advances a whole pattern per loop
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

// ---------------------------------------------------------------------------------------------
// Timing (same contract as the animatic).

const RUN = 0.6, IDX = 0.14;
const ROUNDS = [0.4, 4.6];
const DROP = { base: 0.28, B: 0.22, C: 0.27 }; // B really runs faster
const ROW = { base: 470, B: 604, C: 484 }; // chart rows, relative to the current baseline
const BUF = 0.05;

const RUNS = (() => {
  const r = rng(7);
  const out = [];
  ROUNDS.forEach((R, ri) => {
    for (let k = 0; k < 4; k++) {
      const cand = k % 2 === 1;
      const kind = cand ? (ri === 0 ? 'B' : 'C') : 'base';
      const t0 = R + RUN * k;
      const s = t0 + IDX; // release
      const drop = DROP[kind];
      out.push({ ri, k, t0, s, kind, cand, drop, tDot: s + drop, y: ROW[kind] + (r() - 0.5) * 30 });
    }
  });
  return out;
})();

// Carriage: 0 = slot 0 (baseline) in the track, 1 = slot 1 (candidate) in the track.
const CAR_EV = (() => {
  const ev = [];
  let prev = 0;
  RUNS.forEach((r) => {
    const target = r.cand ? 1 : 0;
    if (target !== prev) ev.push([r.s - 0.16, prev, target]);
    prev = target;
    if (r.ri === 0 && r.k === 3) { ev.push([4.04, 1, 0]); prev = 0; } // keep: B stays bolted, the carriage rehomes around it
    if (r.ri === 1 && r.k === 3) { ev.push([7.6, 1, 0]); prev = 0; } // revert: C goes back up to slot 1
  });
  return ev;
})();
function carriage(t) {
  let c = 0;
  for (const [s, a, b] of CAR_EV) if (t >= s) c = lerp(a, b, indexEase(seg(t, s, s + IDX)));
  return c;
}

// Sled: gravity down the incline (s = k t^2), into the end buffer, rebound and the winch brakes it home.
function sledPos(t) {
  for (const r of RUNS) {
    if (t < r.s || t >= r.t0 + RUN + IDX - 0.02) continue;
    const td = t - r.s;
    if (td < r.drop) { const u = td / r.drop; return S_REST + (S_END - S_REST) * u * u; }
    const tb = td - r.drop;
    if (tb < BUF) return S_END + 10 * Math.sin((Math.PI * tb) / BUF);
    const end = r.s + RUN - 0.04; // clear of the selector before the next index, home before the release
    const u = seg(t, r.s + r.drop + BUF, end);
    return lerp(S_END, S_REST, 1 - Math.pow(1 - u, 2.4));
  }
  return S_REST;
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
  for (const r of RUNS) if (t >= r.s - 0.16) cand = r.cand;
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

// Hand: local y of the held section's top, what it holds, and how lit it is.
function handState(t) {
  // slot B (0 to 0.4) and C (4.2 to 4.6)
  for (const [s, held] of [[0, 'B'], [4.2, 'C']]) {
    if (t >= s && t < s + 0.4) {
      const e = engage(t, s, SLOT_A);
      return { y: lerp(PARK, -DS, e.d), held: t < e.t1 ? held : null, active: 1 };
    }
  }
  // fetch C during round 1's runs: up into the housing, back out with the next section
  if (t >= 0.9 && t < 2.5) {
    if (t < 1.45) return { y: lerp(PARK, HIDE, easeInOut(seg(t, 0.9, 1.45))), held: null, active: 0.4 };
    if (t < 1.95) return { y: HIDE, held: null, active: 0 };
    return { y: lerp(HIDE, PARK, easeOut(seg(t, 1.95, 2.5))), held: 'C', active: 0.4 };
  }
  if (t >= 2.5 && t < 4.2) return { y: PARK, held: 'C', active: 0 };
  // revert: down to C in slot 1, grip, lift it back into the housing
  if (t >= 7.74 && t < 8.2) {
    if (t < 7.88) return { y: lerp(PARK, -DS, easeInOut(seg(t, 7.74, 7.88))), held: null, active: 1 };
    if (t < 7.94) return { y: -DS, held: 'Cx', active: 1 };
    return { y: lerp(-DS, HIDE, easeIn(seg(t, 7.94, 8.2))), held: 'Cx', active: 1 };
  }
  if (t >= 8.2 && t < 9.7) return { y: HIDE, held: null, active: 0 };
  if (t >= 9.7) return { y: lerp(HIDE, PARK, easeOut(seg(t, 9.7, 10.0))), held: 'B', active: 0.3 };
  if (t >= 4.6 && t < 7.74) return { y: PARK, held: null, active: 0 };
  return { y: PARK, held: t < 0.4 ? 'B' : null, active: 0 };
}

// The hand brightens while it works and dims back to idle (continuous across the seam).
const bump = (t, a, b, r = 0.25) => easeInOut(seg(t, a - r, a)) * (1 - easeInOut(seg(t, b, b + r)));
const handActive = (t) => Math.max(bump(t, 0, 0.45), bump(t, 10, 10.45), bump(t, 4.2, 4.65), bump(t, 7.74, 8.2), 0.4 * bump(t, 0.95, 2.45));

// ---------------------------------------------------------------------------------------------
// Materials.

const RAIL = MAT.lit;
const CAND = { front: ['#213b2b', '#13241a'], top: '#33613f', side: '#0c1811', sil: P.green, hi: P.glow, line: '#2a4a33' };
const REVERT = { ...CAND, sil: P.amber, hi: '#ffe4ae' };
const RETIRED = MAT.metal;
const INK_BASE = '#c2c9ba';

function mixMat(a, b, u) {
  if (u <= 0) return a;
  if (u >= 1) return b;
  return {
    front: [mix(a.front[0], b.front[0], u), mix(a.front[1], b.front[1], u)],
    top: mix(a.top, b.top, u),
    side: mix(a.side, b.side, u),
    sil: mix(a.sil, b.sil, u),
    hi: mix(a.hi, b.hi, u),
    line: a.line,
  };
}

// ---------------------------------------------------------------------------------------------
// Parts.

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
}

// A selector section at world centre (cx, cy), rotated by ang: the same rail profile, two bolts.
function section(ctx, cx, cy, ang, mat, alpha = 1) {
  if (alpha <= 0) return;
  const c = Math.cos(ang), s = Math.sin(ang);
  const Pt = (u, v, z = 0) => [cx + u * c - v * s + D.x * z, cy + u * s + v * c + D.y * z];
  const hw = SEC / 2, hh = TH / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  prism(ctx, [Pt(-hw, -hh), Pt(hw, -hh), Pt(hw, hh), Pt(-hw, hh)], DEP, mat, { sil: 3 });
  if (!LOD.card) {
    const a = Pt(-hw + 3, -hh, DEP * 0.5), b = Pt(hw - 3, -hh, DEP * 0.5);
    ctx.strokeStyle = '#0b100c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  for (const u of [-hw + 15, hw - 15]) {
    const p = Pt(u, 0);
    ball(ctx, p[0], p[1], 4.6, MAT.lit);
  }
  ctx.restore();
}
const trackCentre = (ly) => lp(SC, ly + TH / 2);

// Inverted-U photogate straddling the track in depth. back: the far post (drawn before the sled).
function gateBack(ctx, g) {
  prism(ctx, lrect(g - 6, -88, 12, 88 + TH, DEP + 6), 10, MAT.lit, { sil: 2.5 });
}
function gateFront(ctx, g) {
  prism(ctx, lrect(g - 7, -88, 14, 88 + TH + 8, -10), 10, MAT.lit, { sil: 2.5 });
  prism(ctx, lrect(g - 12, -100, 24, 13, -10), DEP + 26, MAT.lit, { sil: 2.5 });
  // emitter and receiver lenses facing each other across the track
  const e = lp(g, -38, -2);
  ball(ctx, e[0], e[1], 4, MAT.metal);
}
function gateBeam(ctx, g, lit) {
  if (LOD.card) return;
  const a = lp(g, -38, -2), b = lp(g, -38, DEP + 6);
  ctx.save();
  ctx.strokeStyle = rgba(P.green, 0.18 + 0.5 * lit);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

function sled(ctx, s) {
  // body on the track's top face, wheels, and the blank standing on it
  const z = 8;
  prism(ctx, lrect(s - SLED_L / 2, -15, SLED_L, 13, z), 28, MAT.lit, { sil: 2.5 });
  for (const u of [s - 32, s + 32]) {
    const p = lp(u, -3, z - 1);
    ball(ctx, p[0], p[1], 6.5, MAT.metal);
  }
  // the blank: 2:3, clipped top-right corner, registration hole
  const bw = 42, bh = 63, cut = 10, x0 = s - bw / 2, y0 = -15;
  const pts = [lp(x0, y0, z + 10), lp(x0 + bw, y0, z + 10), lp(x0 + bw, y0 - bh + cut, z + 10), lp(x0 + bw - cut, y0 - bh, z + 10), lp(x0, y0 - bh, z + 10)];
  prism(ctx, pts, 9, MAT.ivory, { sil: 2 });
  const h = lp(x0 + 15, y0 - bh + 11, z + 10);
  ctx.fillStyle = '#1c2620';
  ctx.beginPath();
  ctx.arc(h[0], h[1], 4.2, 0, Math.PI * 2);
  ctx.fill();
}

function winch(ctx, s) {
  const c = lp(-30, -12, DEP * 0.5);
  const ang = (s - S_REST) / 22;
  // cord from the drum to the sled's rear hook
  const hook = lp(s - SLED_L / 2, -9, 8 + 14);
  const tan = lp(-30, -34, DEP * 0.5);
  ctx.save();
  ctx.strokeStyle = '#8f988a';
  ctx.lineWidth = lw(2.4);
  ctx.beginPath();
  ctx.moveTo(tan[0], tan[1]);
  ctx.lineTo(hook[0], hook[1]);
  ctx.stroke();
  ctx.restore();
  // drum with spokes turning as cord pays out
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
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = ang + (k * Math.PI * 2) / 3;
    ctx.moveTo(c[0] + Math.cos(a) * 6, c[1] + Math.sin(a) * 6);
    ctx.lineTo(c[0] + Math.cos(a) * 20, c[1] + Math.sin(a) * 20);
  }
  ctx.stroke();
  ctx.restore();
  ball(ctx, c[0], c[1], 5.5, MAT.lit);
}

function buffer(ctx, s) {
  const comp = clamp01((s - S_END) / 10); // 0 rest .. 1 fully squashed
  prism(ctx, lrect(L - 20, -40, 20, 40 + TH, 0), DEP, RAIL, { sil: 2.5 });
  // coil spring between the stop block and the striker plate
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

// The carriage: a plate behind the track that slides along the normal on two guide rods.
const PLATE = { ...MAT.lit, front: ['#26322a', '#182019'] };
function carriagePlate(ctx, c) {
  const yc = DS * c;
  // guide rods (fixed to the track frame) and the shuttle plate sliding on them
  for (const x of [SEL0 - 30, SEL1 + 30]) prism(ctx, lrect(x - 5, -DS - 34, 10, 2 * DS + TH + 50, DEP + 14), 10, MAT.lit, { sil: 2 });
  prism(ctx, lrect(SEL0 - 38, yc - DS - 14, SEC + 76, DS + TH + 28, DEP + 2), 10, PLATE, { sil: 2.5 });
  // two sockets shaped like a section: an empty berth reads as a dark slot
  for (const y of [yc - DS, yc]) {
    const p = lrect(SEL0 - 4, y - 4, SEC + 8, TH + 8, DEP + 2);
    ctx.fillStyle = '#070a08';
    poly(ctx, p);
    ctx.fill();
    ctx.strokeStyle = '#3c5242';
    ctx.lineWidth = lw(1.5);
    ctx.stroke();
  }
  // slider blocks on the rods
  for (const x of [SEL0 - 30, SEL1 + 30]) prism(ctx, lrect(x - 9, yc - DS + 4, 18, DS + 12, DEP + 10), 10, MAT.lit, { sil: 2 });
}

function hand(ctx, hs, t) {
  const SM = activeMat(MAT.session, handActive(t));
  const y = hs.y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOUSE.y + 4, W, H);
  ctx.clip();
  // telescoping rod up along the normal into the housing
  prism(ctx, lrect(SC - 9, y - 16 - 200, 18, 200), 16, SM, { sil: 2.5 });
  if (hs.held) {
    let mat = CAND;
    if (hs.held === 'Cx') mat = REVERT;
    section(ctx, ...trackCentre(y), ANG, mat);
  }
  prism(ctx, lrect(SC - 74, y - 18, 148, 14, -4), 30, SM, { hatch: true, sil: 3, hatchGap: 10 });
  for (const fx of [SC - 74, SC + 62]) prism(ctx, lrect(fx, y - 18, 12, 18 + TH - 6, -6), 8, SM, { sil: 2.5 });
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Chart.

function paper(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  ctx.clip();
  const g = ctx.createLinearGradient(PAPER.x, 0, PAPER.x + PAPER.w, 0);
  g.addColorStop(0, '#151d17');
  g.addColorStop(1, '#202b22');
  ctx.fillStyle = g;
  ctx.fillRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  // rulings are fixed to the paper at n * GRID; the paper has moved V * t (a whole pattern per loop)
  const off = q64(V * t); // quantized so the seam frame matches t = 0 exactly
  const n0 = Math.ceil((off + PAPER.x - 2 - PEN_X) / GRID), n1 = Math.floor((off + PAPER.x + PAPER.w + 2 - PEN_X) / GRID);
  const top = PAPER.y + 16, bot = PAPER.y + PAPER.h - 16;
  // vertical rulings
  for (let n = n0; n <= n1; n++) {
    const x = PEN_X + n * GRID - off;
    const major = ((n % 4) + 4) % 4 === 0;
    if (LOD.card && !major) continue;
    ctx.strokeStyle = major ? '#2c3c30' : '#212c24';
    ctx.lineWidth = lw(major ? 2 : 1.5);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bot);
    ctx.stroke();
  }
  // horizontal rulings (the paper does not move vertically)
  for (let y = top, i = 0; y <= bot + 0.5; y += GRID, i++) {
    const major = i % 4 === 0;
    if (LOD.card && !major) continue;
    ctx.strokeStyle = major ? '#2c3c30' : '#212c24';
    ctx.lineWidth = lw(major ? 2 : 1.5);
    ctx.beginPath();
    ctx.moveTo(PAPER.x, y);
    ctx.lineTo(PAPER.x + PAPER.w, y);
    ctx.stroke();
  }
  // sprocket holes along both edges, moving with the paper
  ctx.fillStyle = '#080b09';
  for (let n = n0 - 1; n <= n1; n++) {
    const x = PEN_X + n * GRID - off + GRID / 2;
    for (const y of [PAPER.y + 7, PAPER.y + PAPER.h - 7]) {
      ctx.beginPath();
      ctx.roundRect(x - 4, y - 3, 8, 6, 2.5);
      ctx.fill();
    }
  }
  // dots: every run marks one; earlier loops' dots are still on the paper
  for (const r of RUNS) {
    for (let m = 0; m < 3; m++) {
      const age = t - r.tDot + m * T;
      if (age < 0) continue;
      const x = q64(PEN_X - V * age);
      if (x < PAPER.x - DOT_R * 2) continue;
      dot(ctx, x, r.y, r.cand);
    }
  }
  // paper shading: the lamp falls off toward the take-up roller
  const sh = ctx.createLinearGradient(PAPER.x, 0, PAPER.x + 120, 0);
  sh.addColorStop(0, 'rgba(4,6,5,0.55)');
  sh.addColorStop(1, 'rgba(4,6,5,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(PAPER.x, PAPER.y, 120, PAPER.h);
  ctx.restore();
}

const q64 = (v) => Math.round(v * 64) / 64;
function dot(ctx, x, y, cand) {
  const r = DOT_R;
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

function pen(ctx, t) {
  const y = penY(t);
  const cand = penInk(t);
  // carriage on the guide rod, arm, stylus with its ink tip
  prism(ctx, rect(ROD_X - 16, y - 17, 32, 34), 18, MAT.lit, { sil: 2.5 });
  rodH(ctx, PEN_X + 6, ROD_X - 16, y, 9, MAT.lit);
  const tip = [[PEN_X - 2, y], [PEN_X + 12, y - 8], [PEN_X + 12, y + 8]];
  ctx.save();
  ctx.fillStyle = '#1a231c';
  poly(ctx, tip);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2);
  ctx.stroke();
  ctx.fillStyle = cand ? P.green : INK_BASE;
  ctx.beginPath();
  ctx.arc(PEN_X + 1, y, 3.6 * LOD.k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Fresh caliper: clean green. Drops out of the chart's header, opens its inside jaws in the clear
// gap between the baseline row and the candidate row, and lifts out. Never comes back in a loop.
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

function caliperPose(t, t0, dur, ri) {
  const lt = t - t0;
  if (lt < 0 || lt >= dur) return null;
  const { gap, jawY } = STATS[ri];
  const dIn = 0.3 * dur, open0 = dIn + 0.02, open1 = 0.62 * dur, lift = 0.72 * dur;
  let dy = 0;
  if (lt < dIn) dy = -420 * (1 - springStep(lt / dIn, 0.75, 7.5));
  else if (lt >= lift) dy = -420 * easeIn((lt - lift) / (dur - lift));
  const open = gap * easeInOut(seg(lt, open0, open1));
  const touch = gap > 0 ? open0 + (open1 - open0) : open0;
  return { dy, open, jawY, gap, touchT: t0 + touch, landT: t0 + dIn * 0.55 };
}

function caliper(ctx, pose) {
  const { dy, open, jawY } = pose;
  const top = jawY + dy;
  const x = CAL_X;
  ctx.save();
  ctx.beginPath();
  ctx.rect(WIN.x, WIN.y, WIN.w, WIN.h + 40);
  ctx.clip();
  // beam with engraved graduations (no figures)
  prism(ctx, rect(x - 13, top - 150, 26, 300), 12, MAT.fresh, { sil: 3 });
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(164,245,186,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const y = top - 140 + i * 10;
      ctx.moveTo(x + 13, y);
      ctx.lineTo(x + 13 - (i % 5 === 0 ? 11 : 6), y);
    }
    ctx.stroke();
  }
  // fixed blade: its upper edge measures (inside jaws)
  prism(ctx, [[x + 13, top], [x + 188, top], [x + 150, top + BLADE], [x + 13, top + BLADE]], 10, MAT.fresh, { sil: 2.5 });
  // slider with the moving blade: its lower edge measures
  const sy = top + BLADE + open;
  prism(ctx, rect(x - 20, sy - 30, 40, 46), 16, MAT.fresh, { sil: 2.5 });
  prism(ctx, [[x + 20, sy], [x + 150, sy], [x + 188, sy + BLADE], [x + 20, sy + BLADE]], 10, MAT.fresh, { sil: 2.5 });
  ball(ctx, x - 26, sy - 8, 8, MAT.fresh);
  ctx.restore();
  if (!LOD.card && open > 20) dimension(ctx, x - 16, top, x - 16, sy + BLADE, 30, 0.7);
}

// ---------------------------------------------------------------------------------------------
// Retired rack: horizontal shelves; the stack indexes down one pitch at the seam and the lowest
// section sinks through a slot in the bench top.

const rackY = (k) => RACK_Y0 + k * RACK_P;
function rack(ctx, t) {
  const shift = RACK_P * indexEase(seg(t, 9.74, 9.88));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, FLOOR - 4);
  ctx.clip();
  const ks = t >= FALL_END ? [0, 1, 2, 3] : [1, 2, 3];
  for (const k of ks) {
    const y = rackY(k) + shift;
    if (y - TH / 2 > FLOOR) continue;
    section(ctx, RACK_X, y, 0, RETIRED);
  }
  ctx.restore();
}

// The old baseline falls out of slot 0 when the carriage is down, lands on its low end and flops flat.
const FALL_T = 3.66, FALL_END = 4.2;
function fallingOld(ctx, t) {
  if (t < FALL_T || t >= FALL_END) return null;
  const [x0, y0] = trackCentre(DS);
  const yLand = rackY(0);
  const tf = 0.16; // free fall until the low end meets the stack
  const lt = t - FALL_T;
  let cy, ang;
  const lowDrop = yLand - SEC / 2 * SA - y0; // centre drop when the low end reaches the stack top
  if (lt < tf) {
    const u = lt / tf;
    cy = y0 + lowDrop * u * u;
    ang = ANG;
  } else {
    const k = springStep(lt - tf, 0.55, 26);
    ang = ANG * (1 - k);
    cy = y0 + lowDrop + (yLand - y0 - lowDrop) * k;
  }
  section(ctx, x0, cy, ang, RETIRED);
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
  contactShadow(ctx, COL_X + 30, FLOOR - 6, 70, 14, 0.5);
  // track legs: posts from the rail to the bench, foot plates, clamp collars
  for (const [x, y] of legs) {
    prism(ctx, rect(x - 26, FLOOR - 12, 64, 12), 40, MAT.metal, { sil: 2.5 });
    rodV(ctx, x + 6, y + 6, FLOOR - 12, 16, MAT.lit);
    prism(ctx, rect(x - 6, y + 2, 24, 22), 22, MAT.lit, { sil: 2.5 });
    if (!LOD.card) ball(ctx, x - 12, y + 14, 5, MAT.lit);
  }
  // winch bracket
  const wc = lp(-30, -12, DEP * 0.5);
  prism(ctx, rect(wc[0] - 8, wc[1], 16, lp(40, TH)[1] - wc[1] + 10), 14, MAT.metal, { sil: 2 });
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
  // chart recorder cabinet and its window recess
  prism(ctx, rect(CAB.x, CAB.y, CAB.w, CAB.h), 64, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#080b09';
  ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
  const ig = ctx.createLinearGradient(0, WIN.y, 0, WIN.y + 30);
  ig.addColorStop(0, 'rgba(0,0,0,0.6)');
  ig.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ig;
  ctx.fillRect(WIN.x, WIN.y, WIN.w, 30);
  // pen guide rod
  rodV(ctx, ROD_X, WIN.y + 4, WIN.y + WIN.h - 4, 8, MAT.lit);
  // cabinet foot rail and controls below the window
  prism(ctx, rect(CAB.x - 10, FLOOR - 14, CAB.w + 20, 14), 70, MAT.metal, { sil: 2.5 });
  if (!LOD.card) {
    for (const x of [CAB.x + 60, CAB.x + 110]) ball(ctx, x, WIN.y + WIN.h + 34, 9, MAT.lit);
    ctx.fillStyle = '#0a0e0b';
    ctx.fillRect(CAB.x + CAB.w - 180, WIN.y + WIN.h + 26, 130, 16);
  }
  // session column and boom (the hand's fixed part)
  const idle = activeMat(MAT.session, 0);
  prism(ctx, rect(COL_X - 24, FLOOR - 14, 96, 14), 50, idle, { sil: 3 });
  prism(ctx, rect(COL_X, BOOM_Y + 8, 46, FLOOR - 14 - BOOM_Y - 8), 36, idle, { hatch: true, sil: 3.5 });
  prism(ctx, rect(HOUSE.x + HOUSE.w - 20, BOOM_Y, COL_X + 46 - (HOUSE.x + HOUSE.w - 20), 26), 30, idle, { hatch: true, sil: 3 });
}

function frontLayer(ctx) {
  for (const g of GATES) gateFront(ctx, g);
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
  const idle = activeMat(MAT.session, 0);
  prism(ctx, rect(HOUSE.x, HOUSE.y, HOUSE.w, HOUSE.h), 50, idle, { hatch: true, sil: 3.5 });
  ctx.fillStyle = '#050806';
  ctx.fillRect(HOUSE.x + 24, HOUSE.y + HOUSE.h - 5, HOUSE.w - 48, 5);
  if (!LOD.card) {
    centreLine(ctx, lp(-20, TH / 2)[0], lp(-20, TH / 2)[1], lp(L + 20, TH / 2)[0], lp(L + 20, TH / 2)[1], 0.35);
    const a = lp(GATES[0], TH), b = lp(GATES[1], TH);
    dimension(ctx, a[0], a[1], b[0], b[1], 46, 0.55);
  }
  lampFalloff(ctx, 860, 540, 440, 1300, 0.62);
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
    const s = sledPos(t);
    const hs = handState(t);

    rack(ctx, t);
    carriagePlate(ctx, c);

    // rails and the sections the carriage holds
    rail(ctx, 0, SEL0 - 6, RAIL);
    rail(ctx, SEL1 + 6, L, RAIL);
    // slot 0: the baseline. It is the old one until it drops at the keep; after the keep it is B.
    const yc = DS * c;
    if (t < FALL_T) section(ctx, ...trackCentre(yc), ANG, RAIL);
    // B: slot 1 from its seating until the keep, then bolted into the track (it becomes the baseline)
    if (t >= SLOT_A && t < 3.6) section(ctx, ...trackCentre(yc - DS), ANG, CAND);
    else if (t >= 3.6) section(ctx, ...trackCentre(t < 4.18 ? 0 : yc), ANG, mixMat(CAND, RAIL, seg(t, 3.62, 4.0)));
    // C: slot 1 from its seating until the hand grips it at the revert
    if (t >= 4.2 + SLOT_A && t < 7.88) section(ctx, ...trackCentre(yc - DS), ANG, mixMat(CAND, REVERT, seg(t, 7.6, 7.72)));
    fallingOld(ctx, t);

    for (const g of GATES) gateBack(ctx, g);
    winch(ctx, s);
    buffer(ctx, s);
    contactShadow(ctx, ...lp(s, -2, 22), 52, 7, 0.5);
    sled(ctx, s);

    hand(ctx, hs, t);

    paper(ctx, t);
    pen(ctx, t);
    const cal = [caliperPose(t, 2.8, 0.8, 0), caliperPose(t, 7.0, 0.6, 1)].find(Boolean);
    if (cal) caliper(ctx, cal);

    cached(ctx, 'perf-loop-front', frontLayer);

    // Light on top: gate lamps, the pen's contact, the bolts, the hand's contacts, the caliper jaws.
    for (const g of GATES) {
      let lit = 0;
      for (const r of RUNS) {
        const u = (t - gateTime(r, g)) / 0.16;
        if (u > 0 && u < 1) lit = Math.max(lit, 1 - u);
      }
      gateBeam(ctx, g, lit);
      const led = lp(g, -94, -10);
      ball(ctx, led[0], led[1], 5, lit > 0 ? { ...MAT.fresh, top: mix('#2f6141', P.bright, lit), hi: '#e9fff0' } : MAT.metal);
      if (lit > 0) softGlow(ctx, led[0], led[1], 26, P.bright, 0.55 * lit);
    }
    for (const r of RUNS) contactGlow(ctx, PEN_X, r.y, (t - r.tDot) / 0.12, 26);
    for (const s0 of [0, 4.2]) {
      const e = engage(t, s0, SLOT_A);
      contactGlow(ctx, ...lp(SC, -DS + TH * 0.5, -6), e.c, 36);
    }
    for (const lx of [SEL0 + 15, SEL1 - 15]) contactGlow(ctx, ...lp(lx, TH / 2), (t - 3.6) / 0.12, 30);
    contactGlow(ctx, ...lp(SC, -DS - 10, -6), (t - 7.88) / 0.12, 36);
    if (cal) {
      const cu = (t - cal.touchT) / 0.12;
      if (cal.gap > 0) {
        contactGlow(ctx, CAL_X + 120, cal.jawY + cal.dy, cu, 28);
        contactGlow(ctx, CAL_X + 120, cal.jawY + cal.dy + 2 * BLADE + cal.open, cu, 28);
      } else contactGlow(ctx, CAL_X + 150, cal.jawY + cal.dy + 2 * BLADE, (t - cal.landT) / 0.12, 28);
    }
    dust(ctx, RACK_X + SEC / 2 - 10, rackY(0) - 8, t - FALL_T - 0.16, 0x7e1, { ang: -Math.PI * 0.2, spread: 1.2, n: 8, dur: 0.4 });

    grainOver(ctx, 0.3, 'soft-light');
  },
};
