// /why at final fidelity (pitch A 3.5, same beats and timing as scenes/why.js).
// The session's arm reaches in from the right and sets the recommendation in the vice: an ivory
// bracket with the user's slip clipped to it. A hood lowers so only the recommendation is in view. One fresh proving ring (clean green, same model as the session, never steel)
// drops in and presses three times; the third bows the bracket and the needle passes the amber
// mark. The ring lifts out, the hood rises, the session's hatched arm fits a gusset and the
// bracket straightens. Hold. Seam: the vice opens and the same arm carries the bracket out right;
// it is the arm that brings the next one in at the start of the loop. The arm is the session's
// (hatched, dim green), never a tester: the clean-outlined ring is the only reviewer.
// Nothing goes to a tray or file: /why changes nothing on disk.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, follow, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, discPts, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, lightShaft, activeMat, rng,
} from '../kit.mjs';

const T = 8.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

// Bracket: the leg stands in the vice, the arm cantilevers right. Local origin = bottom-left of the leg.
const LEG_X = 790, LEG_W = 46, BASE = 730, ARM_TOP = 520, ARM_T = 44, ARM_L = 460, THICK = 34;
const LEG_H = BASE - ARM_TOP;
const CHAMFER = 22, FILLET = 12;
const shape = (lx) => { const u = clamp01((lx - LEG_W) / (ARM_L - LEG_W)); return u * u; };
const slopeK = 2 / (ARM_L - LEG_W);
const G = 100; // gusset leg length

// Vice.
const JAW_Y = 660, SCREW_Y = 703, END_X = 968;
const LIFT = 100, RUN = 1200; // the arm lifts the bracket clear of the jaws and carries it past the right edge

// Feed with a constant-speed middle: accelerate over fraction a, decelerate over fraction d.
function trap(u, a, d) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const v = 1 / (1 - a / 2 - d / 2);
  if (u < a) return (v * u * u) / (2 * a);
  if (u < 1 - d) return v * (a / 2 + (u - a));
  const r = 1 - u;
  return 1 - (v * r * r) / (2 * d);
}

// Part sprites: a part drawn once into an OffscreenCanvas that covers its box (bx, by, bw, bh in the
// caller's coordinates) at the current device scale, then blitted; moving parts are drawn by
// translating the context first. The sprite is drawn with the same calls every time, so the output
// depends only on (key, scale). At most two scales are held per key.
const sprites = new Map();
function sprite(ctx, key, bx, by, bw, bh, draw) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  let list = sprites.get(key);
  if (!list) sprites.set(key, (list = []));
  let S = list.find((e) => e.s === s);
  if (!S) {
    const cw = Math.max(1, Math.ceil(bw * s)), ch = Math.max(1, Math.ceil(bh * s));
    const cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.scale(cw / bw, ch / bh);
    c.translate(-bx, -by);
    const saved = { ...LOD };
    setLod(c);
    draw(c);
    Object.assign(LOD, saved);
    S = { s, cv };
    list.unshift(S);
    while (list.length > 2) { const old = list.pop(); old.cv.width = old.cv.height = 0; }
  }
  ctx.drawImage(S.cv, bx, by, bw, bh);
}

// Two sprites of one part, idle and active, crossfaded by u (0 idle, 1 active).
function spriteAct(ctx, key, box, u, draw) {
  if (u < 0.999) sprite(ctx, key + ':0', box[0], box[1], box[2], box[3], (c) => draw(c, 0));
  if (u > 0.001) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, u);
    sprite(ctx, key + ':1', box[0], box[1], box[2], box[3], (c) => draw(c, 1));
    ctx.restore();
  }
}

// Proving ring.
const PX = [950, 1060, 1168];
const R_OUT = 80, R_IN = 59, R_DEP = 20, BOSS_W = 38, BOSS_H = 14, PLUNGER = 22, TIP = 10, HOVER = 24;
const RY0 = ARM_TOP - HOVER - PLUNGER - TIP - BOSS_H - R_OUT;
const BOW = 60, ELASTIC = 10;
const DIAL_K = 1.1; // dial drawn at 40 units, scaled to sit inside the larger ring
const NEEDLE_BAND = 0.7, AMBER_AT = 1.25, NEEDLE_OVER = 1.6;
const DROP = 640;

// Hood.
const BEAM_Y0 = 228, BEAM_Y1 = 248;
const WIN_X0 = 652, WIN_X1 = 1310, RAIL_XS = [96, WIN_X0, WIN_X1, 1824];
const CURT_END = BENCH_Y - 8;

// Session hand: a carriage on a column at the right, telescoping boom, angled head holding the gusset
// by its hypotenuse. At rest the carriage is down and the head sits on its rest stand; it comes in low,
// under the bowed arm, and rises on the diagonal into the inside corner.
const GX_REST = 1400, GX_FIT = LEG_X + LEG_W, HAND_DROP = 70;
const BY = 640, SLEEVE_X0 = 1540, COL_X = 1700, MAG_W = 112;
const HAND_A = (1.0 - 0.2) / 1.75;
const HAND_P1 = [1150, HAND_DROP], HAND_P2 = [GX_FIT + 80, 80];
const bez = (a, b, c, d, u) => (1 - u) * (1 - u) * (1 - u) * a + 3 * (1 - u) * (1 - u) * u * b + 3 * (1 - u) * u * u * c + u * u * u * d;
const handPose = (d) => ({ gx: bez(GX_REST, HAND_P1[0], HAND_P2[0], GX_FIT, d), hy: bez(HAND_DROP, HAND_P1[1], HAND_P2[1], 0, d) });
const STAND_X = 1446, STAND_W = 76, STAND_TOP = ARM_TOP + ARM_T + G / 2 + HAND_DROP + 50;

// ---------------------------------------------------------------------------------------------
// Timing helpers (same contract as scenes/why.js).

function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, t3, c: (t - t1) / 0.12 };
}

// Loop timeline.
// The bracket is wholly off frame (slip included) once it is RUN_VIS right of the vice.
const RUN_VIS = 1196, RUN_V = 1600;
const ENTRY_VIS = 0.4, ENTRY_B = 1.36, LOWER_A = 1.31, LOWER_B = 1.51; // the arm brings the bracket in and sets it
const RETRACT_A = 1.58, RETRACT_B = 2.08; // the arm lets go and parks in the right bay
const HOOD_DOWN = [1.6, 2.15], HOOD_UP = [4.2, 4.7];
const RING_IN = 2.12, P0 = 2.55, PRESS_S = [0, 0.48, 0.96], PRESS_LEN = [0.48, 0.48, 0.62];
const P_END = P0 + PRESS_S[2] + PRESS_LEN[2], RING_OUT = [P_END, P_END + 0.35];
const FIT_A = 4.35, FIT_B = 4.88; // the arm carries the gusset in and seats it
const SETTLE_K = [0.75, 30]; // the straightening spring: one small overshoot, still within 0.3 s
const REGRIP = [6.84, 6.99], JAW_OPEN = [6.86, 6.98], LIFT_T = [6.94, 7.24];
const RUN_A = 7.07, RUN_GONE = RUN_A + (RUN_VIS * 1.176) / RUN_V; // off frame at RUN_GONE, still moving
const ENTRY_V = (RUN_VIS * 1.29) / (ENTRY_B - ENTRY_VIS);
const JAW_CLOSE = [1.46, 1.58];

// The three presses: ring x, ring travel below hover, needle target, bracket bow, contacts.
function presses(t) {
  let rx = PX[0], travel = 0, needle = 0, bow = 0;
  const flashes = [];
  for (let i = 0; i < 3; i++) {
    const s = P0 + PRESS_S[i], len = PRESS_LEN[i];
    if (t >= s && i > 0) rx = lerp(PX[i - 1], PX[i], indexEase(seg(t, s, s + 0.2)));
    const dwell = i === 2 ? 0.3 : 0.2;
    const e = engage(t, s + 0.1, (len - 0.12 - dwell) / 1.75, dwell);
    const bmax = i < 2 ? ELASTIC : BOW;
    const sh = shape(PX[i] - LEG_X);
    const total = HOVER + bmax * sh;
    if (t >= s && t < s + len) {
      travel = e.d * total;
      needle = e.d * (i < 2 ? NEEDLE_BAND : NEEDLE_OVER);
      bow = bmax * clamp01((travel - HOVER) / (bmax * sh));
      if (i === 2 && t >= e.t1) bow = BOW;
    }
    if (e.c > 0 && e.c < 1) flashes.push({ i, c: e.c });
  }
  if (t >= P_END) rx = PX[2];
  return { rx, travel, needle, bow, flashes };
}
const needleTarget = (s) => (s < P0 || s > P_END + 0.6 ? 0 : presses(s).needle);
// The needle lags, overshoots and damps (about 5 Hz), integrated from rest at a fixed step.
const needleAt = (t) => (t < P0 || t > RING_OUT[1] ? 0 : follow(needleTarget, P0 - 0.05, t, 0.3, 34));

// ---------------------------------------------------------------------------------------------
// Bracket, drawn in local coordinates (origin bottom-left of the leg's front face).

function armFrame(lx, bow) {
  const sl = lx > LEG_W ? bow * slopeK * clamp01((lx - LEG_W) / (ARM_L - LEG_W)) : 0;
  const ax = lx, ay = -LEG_H + ARM_T / 2 + bow * shape(lx);
  return { sl, ax, ay };
}
const topAt = (lx, bow) => { const f = armFrame(lx, bow); return [f.ax + (f.sl * ARM_T) / 2, f.ay - ARM_T / 2]; };
const botAt = (lx, bow) => { const f = armFrame(lx, bow); return [f.ax - (f.sl * ARM_T) / 2, f.ay + ARM_T / 2]; };

function bracketOutline(bow) {
  const top = -LEG_H;
  const pts = [[0, 0], [0, top]];
  for (let lx = 20; lx < ARM_L - CHAMFER; lx += 20) pts.push(topAt(lx, bow));
  const cs = topAt(ARM_L - CHAMFER, bow);
  pts.push(cs);
  const et = topAt(ARM_L, bow), eb = botAt(ARM_L, bow);
  const ex = eb[0] - et[0], ey = eb[1] - et[1], el = Math.hypot(ex, ey);
  pts.push([et[0] + (ex / el) * CHAMFER, et[1] + (ey / el) * CHAMFER]);
  pts.push(eb);
  for (let lx = ARM_L - 20; lx > LEG_W + FILLET; lx -= 20) pts.push(botAt(lx, bow));
  // fillet in the inner corner
  const cx = LEG_W + FILLET, cy = top + ARM_T + FILLET;
  for (let k = 0; k <= 5; k++) {
    const a = -Math.PI / 2 - (k / 5) * (Math.PI / 2);
    pts.push([cx + Math.cos(a) * FILLET, cy + Math.sin(a) * FILLET]);
  }
  pts.push([LEG_W, 0]);
  return { pts, et, eb };
}

// Right-angle plate with a relief cut across the corner, clearing the bracket's fillet.
const RELIEF = 15;
const gussetPts = (x, y) => [[x + RELIEF, y], [x + G, y], [x, y + G], [x, y + RELIEF]];

// The gusset is a separate plate: a shade greyer than the bracket, outlined, with a machined bevel on
// its long edge, so once seated it still reads as a part fitted into the corner.
const GUSSET_MAT = { ...MAT.ivory, front: ['#e9eadf', '#c4c6b8'], top: '#f6f6ee', side: '#9d9f93' };
const BEV = 9 * Math.SQRT2;
function gussetSolid(ctx, x, y, standalone) {
  const pts = gussetPts(x, y);
  prism(ctx, pts, THICK, GUSSET_MAT, { noLines: false });
  ctx.save();
  // bevel strip along the hypotenuse (faces down-right, away from the lamp) with a lit inner edge
  const bev = [[x + G, y], [x, y + G], [x, y + G - BEV], [x + G - BEV, y]];
  const bg = ctx.createLinearGradient(x + G / 2 - 6, y + G / 2 - 6, x + G / 2 + 4, y + G / 2 + 4);
  bg.addColorStop(0, '#c9cbbe');
  bg.addColorStop(1, '#a6a89c');
  ctx.fillStyle = bg;
  poly(ctx, bev);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,248,0.75)';
  ctx.lineWidth = lw(1.5);
  ctx.beginPath();
  ctx.moveTo(x + 1, y + G - BEV);
  ctx.lineTo(x + G - BEV, y + 1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(96,100,90,0.85)';
  ctx.lineWidth = lw(2);
  ctx.lineJoin = 'round';
  poly(ctx, pts);
  ctx.stroke();
  ctx.restore();
  hole(ctx, x + 24, y + 52, 6.5, THICK, MAT.ivory);
  hole(ctx, x + 52, y + 24, 6.5, THICK, MAT.ivory);
  if (standalone && !LOD.card) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,250,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + RELIEF + 2, y + 1);
    ctx.lineTo(x + G - 6, y + 1);
    ctx.stroke();
    ctx.restore();
  }
}

// The joint once seated: a dark fit line on the two edges it shares with the leg and the arm, and
// a little occlusion on the gusset beside it, drawn over the bracket's front face.
function gussetSeam(ctx, x, y) {
  ctx.save();
  poly(ctx, gussetPts(x, y));
  ctx.clip();
  let g = ctx.createLinearGradient(0, y, 0, y + 16);
  g.addColorStop(0, 'rgba(34,38,32,0.32)');
  g.addColorStop(1, 'rgba(34,38,32,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, G, 16);
  g = ctx.createLinearGradient(x, 0, x + 12, 0);
  g.addColorStop(0, 'rgba(34,38,32,0.24)');
  g.addColorStop(1, 'rgba(34,38,32,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, 12, G);
  ctx.restore();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = 'rgba(30,34,29,0.92)';
  ctx.lineWidth = lw(2.6);
  ctx.beginPath();
  ctx.moveTo(x + G - 1, y);
  ctx.lineTo(x + RELIEF, y);
  ctx.lineTo(x, y + RELIEF);
  ctx.lineTo(x, y + G - 1);
  ctx.stroke();
  ctx.restore();
}

// The slip: the one user message the reviewer may see, held to the leg by a small binder clip.
function slip(ctx) {
  const top = -LEG_H;
  const ang = -0.11;
  const px = -2, py = top + 66; // clip point on the leg's left edge
  const corners = [[-62, 0], [0, 0], [0, 52], [-50, 52], [-62, 40]].map(([u, v]) => [
    px + u * Math.cos(ang) - v * Math.sin(ang),
    py + u * Math.sin(ang) + v * Math.cos(ang),
  ]);
  // shadow on the leg and wall behind
  ctx.save();
  ctx.fillStyle = 'rgba(2,4,3,0.38)';
  poly(ctx, corners.map(([x, y]) => [x + 5, y + 7]));
  ctx.fill();
  const g = ctx.createLinearGradient(px - 62, py, px, py + 52);
  g.addColorStop(0, '#f4f4ec');
  g.addColorStop(1, '#d3d4c8');
  ctx.fillStyle = g;
  poly(ctx, corners);
  ctx.fill();
  // folded corner
  const f0 = corners[3], f1 = corners[4];
  ctx.fillStyle = '#b9baae';
  ctx.beginPath();
  ctx.moveTo(f0[0], f0[1]);
  ctx.lineTo(f1[0], f1[1]);
  ctx.lineTo(f0[0] - 9, f0[1] - 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,124,112,0.6)';
  ctx.lineWidth = lw(1.5);
  poly(ctx, corners);
  ctx.stroke();
  ctx.restore();
  // binder clip over the slip's corner and the leg edge: dark body, two folded wire handles
  const cx = px - 2, cy = py - 4;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#a3c2aa';
  ctx.lineWidth = lw(2.4);
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx - 6 * k - 1, cy + 4);
    ctx.lineTo(cx - 9 * k - 9, cy - 22);
    ctx.lineTo(cx - 9 * k + 3, cy - 25);
    ctx.lineTo(cx - 6 * k + 5, cy + 4);
    ctx.stroke();
  }
  ctx.restore();
  prism(ctx, [[cx - 13, cy], [cx + 13, cy], [cx + 9, cy + 22], [cx - 9, cy + 22]], 10, MAT.lit, { sil: 2.5 });
}

// o: { dx, dy, s, alpha, bow, seated }
function bracket(ctx, o) {
  const { dx = 0, dy = 0, s = 1, alpha = 1, seated = false } = o;
  if (alpha <= 0) return;
  // at rest (straight, or held at the full bow) the bracket is a sprite; while it bends it is live
  let bow = o.bow || 0;
  if (Math.abs(bow) < 0.02) bow = 0;
  else if (Math.abs(bow - BOW) < 0.02) bow = BOW;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(LEG_X + dx, BASE + dy);
  if (s !== 1) ctx.scale(s, s);
  if (bow === 0 || bow === BOW) {
    sprite(ctx, 'why-br' + (bow ? 1 : 0) + (seated ? 1 : 0), -110, -LEG_H - 60, ARM_L + 200, LEG_H + 80, (c) => bracketBody(c, bow, seated));
  } else bracketBody(ctx, bow, seated);
  ctx.restore();
}

function bracketBody(ctx, bow, seated) {
  const top = -LEG_H;
  const { pts, et, eb } = bracketOutline(bow);
  prism(ctx, pts, THICK, MAT.ivory, {
    inner: seated ? () => gussetSolid(ctx, LEG_W, top + ARM_T, false) : null,
  });
  // soft occlusion where the leg meets the arm and where it enters the jaws
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  let g = ctx.createRadialGradient(LEG_W, top + ARM_T, 0, LEG_W, top + ARM_T, 70);
  g.addColorStop(0, 'rgba(40,46,38,0.22)');
  g.addColorStop(1, 'rgba(40,46,38,0)');
  ctx.fillStyle = g;
  ctx.fillRect(LEG_W - 70, top + ARM_T - 70, 140, 140);
  g = ctx.createLinearGradient(0, JAW_Y - BASE - 26, 0, JAW_Y - BASE);
  g.addColorStop(0, 'rgba(20,26,20,0)');
  g.addColorStop(1, 'rgba(20,26,20,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(-4, JAW_Y - BASE - 26, LEG_W + 8, 26);
  // lit top edge of the arm
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,250,0.85)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(1, top + 1);
  for (let lx = 20; lx < ARM_L - CHAMFER; lx += 20) { const p = topAt(lx, bow); ctx.lineTo(p[0], p[1] + 1); }
  ctx.stroke();
  ctx.restore();
  if (seated) gussetSeam(ctx, LEG_W, top + ARM_T);
  // registration hole near the arm end, and two bolt holes in the leg
  const hf = armFrame(ARM_L - 44, bow);
  hole(ctx, hf.ax, hf.ay, 10, THICK, MAT.ivory);
  hole(ctx, LEG_W / 2, top + ARM_T + 44, 6.5, THICK, MAT.ivory);
  hole(ctx, LEG_W / 2, top + ARM_T + 92, 6.5, THICK, MAT.ivory);
  slip(ctx);
  // drafting texture: leg centre line, arm thickness dimension
  centreLine(ctx, LEG_W / 2, top - 18, LEG_W / 2, top + ARM_T + 12, 0.5);
  dimension(ctx, et[0], et[1], eb[0], eb[1], -34, 0.55);
}

// ---------------------------------------------------------------------------------------------
// Proving ring: thick ring with top and bottom bosses, plunger, stem, dial gauge inside.

function dial(ctx, cx, cy, needle, amberLit) {
  // bezel
  let g = ctx.createRadialGradient(cx - 14, cy - 16, 4, cx, cy, 42);
  g.addColorStop(0, '#3f7d52');
  g.addColorStop(1, '#0e1d14');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(3);
  ctx.stroke();
  // face
  g = ctx.createRadialGradient(cx, cy - 6, 2, cx, cy, 34);
  g.addColorStop(0, '#141d16');
  g.addColorStop(1, '#090d0a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fill();
  // safe band
  const a0 = -Math.PI / 2;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(83,219,118,0.38)';
  ctx.lineWidth = lw(5);
  ctx.beginPath();
  ctx.arc(cx, cy, 26, a0, a0 + NEEDLE_BAND);
  ctx.stroke();
  // amber zone and the amber limit mark
  ctx.strokeStyle = rgba(P.amber, 0.35 + 0.4 * amberLit);
  ctx.lineWidth = lw(4);
  ctx.beginPath();
  ctx.arc(cx, cy, 29, a0 + AMBER_AT, a0 + AMBER_AT + 0.75);
  ctx.stroke();
  // ticks
  ctx.strokeStyle = 'rgba(194,201,186,0.75)';
  const N = 48;
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const major = i % 6 === 0;
    if (LOD.card && !major) continue;
    const a = a0 + (i / N) * Math.PI * 2;
    const r1 = 33, r0 = major ? 25 : 29;
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  }
  ctx.lineWidth = lw(LOD.card ? 2 : 1.6);
  ctx.stroke();
  const am = a0 + AMBER_AT;
  ctx.strokeStyle = amberLit > 0 ? mix(P.amber, '#fff1d6', amberLit * 0.6) : P.amber;
  ctx.lineWidth = lw(5);
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(am) * 18, cy + Math.sin(am) * 18);
  ctx.lineTo(cx + Math.cos(am) * 35, cy + Math.sin(am) * 35);
  ctx.stroke();
  // needle with counterweight, and its shadow on the face
  const na = a0 + needle;
  const c = Math.cos(na), s = Math.sin(na);
  const needlePath = (ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(cx + ox + c * 30, cy + oy + s * 30);
    ctx.lineTo(cx + ox - s * 2.6, cy + oy + c * 2.6);
    ctx.lineTo(cx + ox - c * 9, cy + oy - s * 9);
    ctx.lineTo(cx + ox + s * 2.6, cy + oy - c * 2.6);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  needlePath(2, 3);
  ctx.fill();
  ctx.fillStyle = P.bright;
  needlePath(0, 0);
  ctx.fill();
  ctx.fillStyle = P.green;
  ctx.beginPath();
  ctx.arc(cx - c * 10, cy - s * 10, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ball(ctx, cx, cy, 5.5, MAT.fresh);
  // glass reflection
  if (!LOD.card) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 33, 0, Math.PI * 2);
    ctx.clip();
    g = ctx.createLinearGradient(cx - 30, cy - 30, cx + 6, cy + 6);
    g.addColorStop(0, 'rgba(243,243,236,0.10)');
    g.addColorStop(0.5, 'rgba(243,243,236,0.03)');
    g.addColorStop(0.51, 'rgba(243,243,236,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 34, cy - 34, 68, 68);
    ctx.restore();
  }
}

function ring(ctx, cx, cy, needle, load, amberLit) {
  const sy = 1 - 0.04 * load, sx = 1 + 0.02 * load; // a proving ring is a spring: it squashes under load
  const rT = cy - R_OUT * sy, rB = cy + R_OUT * sy;
  ctx.save();
  ctx.lineJoin = 'round';
  // stem from the hood beam
  rodV(ctx, cx, BEAM_Y1 - 4, rT - BOSS_H + 2, 14, MAT.fresh);
  // plunger and its rounded contact tip
  rodV(ctx, cx, rB + BOSS_H - 2, rB + BOSS_H + PLUNGER, 22, MAT.fresh);
  const ty = rB + BOSS_H + PLUNGER;
  const tg = ctx.createRadialGradient(cx - 4, ty + 1, 1, cx, ty, 12);
  tg.addColorStop(0, '#5aa874');
  tg.addColorStop(1, '#10241a');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.arc(cx, ty, 11, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  // ring body: depth layers back to front, then the lit front face
  const dx = D.x * R_DEP, dy = D.y * R_DEP;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  const annulus = (ox, oy) => {
    ctx.beginPath();
    ctx.arc(ox, oy, R_OUT, 0, Math.PI * 2);
    ctx.moveTo(ox + R_IN, oy);
    ctx.arc(ox, oy, R_IN, 0, Math.PI * 2, true);
  };
  const layers = LOD.card ? 3 : 6;
  for (let k = layers; k >= 1; k--) {
    const f = k / layers;
    annulus(dx * f, dy * f);
    ctx.fillStyle = mix('#0a160f', '#1d3b28', 1 - f);
    ctx.fill('evenodd');
  }
  // inner dial assembly sits mid-depth, behind the front face
  ctx.restore();
  // post from the lower inside of the ring and the measuring spindle from the upper inside
  const post = rect(cx - 6, cy + 42, 12, R_IN * sy - 42 + 2);
  prism(ctx, post, 10, MAT.fresh, { sil: 2 });
  rodV(ctx, cx, cy - R_IN * sy - 2, cy - 43, 5, MAT.fresh, false);
  ctx.save();
  ctx.translate(cx + D.x * 6, cy + D.y * 6);
  ctx.scale(DIAL_K, DIAL_K);
  dial(ctx, 0, 0, needle, amberLit);
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sx, sy);
  const cg = ctx.createConicGradient(0, 0, 0);
  cg.addColorStop(0, '#1d3a27');
  cg.addColorStop(0.12, '#2f5f40');
  cg.addColorStop(0.25, '#16301f');
  cg.addColorStop(0.4, '#10241a');
  cg.addColorStop(0.58, '#3c7a51');
  cg.addColorStop(0.64, '#5a9f71');
  cg.addColorStop(0.72, '#356b47');
  cg.addColorStop(0.86, '#16301f');
  cg.addColorStop(1, '#1d3a27');
  annulus(0, 0);
  ctx.fillStyle = cg;
  ctx.fill('evenodd');
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(4.5);
  ctx.beginPath();
  ctx.arc(0, 0, R_OUT, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  ctx.arc(0, 0, R_IN, 0, Math.PI * 2);
  ctx.stroke();
  if (!LOD.card) {
    // turned-face rings and a specular arc on the upper left
    ctx.strokeStyle = 'rgba(164,245,186,0.10)';
    ctx.lineWidth = 2;
    for (const r of [64, 69, 74]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(164,245,186,0.55)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, R_OUT - 5, Math.PI * 1.08, Math.PI * 1.38);
    ctx.stroke();
  }
  ctx.restore();
  // bosses
  prism(ctx, rect(cx - BOSS_W / 2, rT - BOSS_H, BOSS_W, BOSS_H + 3), 22, MAT.fresh, { sil: 3 });
  prism(ctx, rect(cx - BOSS_W / 2, rB - 3, BOSS_W, BOSS_H + 3), 22, MAT.fresh, { sil: 3 });
  // centre lines
  centreLine(ctx, cx - R_OUT - 22, cy, cx + R_OUT + 22, cy, 0.5);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Vice parts that move (static body is in the back layer).

function screwAndHandle(ctx, jaw, theta) {
  const x0 = LEG_X + LEG_W + 48 + jaw;
  rodH(ctx, x0, END_X + 2, SCREW_Y, 16, MAT.lit);
  if (!LOD.card) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, SCREW_Y - 8, END_X - x0, 16);
    ctx.clip();
    const pitch = 7, ph = ((theta / (Math.PI * 2)) * pitch) % pitch;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0b100c';
    ctx.beginPath();
    for (let x = x0 - 20 + ph; x < END_X + 10; x += pitch) { ctx.moveTo(x, SCREW_Y + 8); ctx.lineTo(x + 5, SCREW_Y - 8); }
    ctx.stroke();
    ctx.strokeStyle = '#3c5242';
    ctx.beginPath();
    for (let x = x0 - 17 + ph; x < END_X + 10; x += pitch) { ctx.moveTo(x, SCREW_Y + 8); ctx.lineTo(x + 5, SCREW_Y - 8); }
    ctx.stroke();
    ctx.restore();
  }
  // handle: hub, then a T-bar turning about the screw axis
  rodH(ctx, END_X + 34, END_X + 52, SCREW_Y, 20, MAT.lit);
  const px = END_X + 58, L = 50;
  const sn = Math.sin(theta), cs = Math.cos(theta);
  const ends = [1, -1].map((k) => [px + k * D.x * L * sn * 1.6, SCREW_Y - k * L * cs + k * D.y * L * sn * 1.6, k * sn]);
  ends.sort((a, b) => b[2] - a[2]); // far end first
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = lw(11);
  ctx.beginPath();
  ctx.moveTo(ends[0][0], ends[0][1]);
  ctx.lineTo(ends[1][0], ends[1][1]);
  ctx.stroke();
  ctx.strokeStyle = '#26332a';
  ctx.lineWidth = lw(6);
  ctx.stroke();
  ctx.restore();
  ball(ctx, px, SCREW_Y, 8, MAT.lit);
  for (const e of ends) ball(ctx, e[0], e[1], 9, MAT.lit);
}

function jawInsert(ctx, x, right) {
  // serrated jaw plate on the clamping edge
  ctx.save();
  ctx.fillStyle = '#2a362d';
  ctx.fillRect(x, JAW_Y + 3, 10, BASE - JAW_Y - 6);
  ctx.strokeStyle = '#0c110d';
  ctx.lineWidth = lw(1.6);
  ctx.beginPath();
  for (let y = JAW_Y + 7; y < BASE - 4; y += LOD.card ? 9 : 5) { ctx.moveTo(x, y); ctx.lineTo(x + 10, y); }
  ctx.stroke();
  ctx.fillStyle = '#0b0f0c';
  for (const y of [JAW_Y + 18, BASE - 18]) {
    ctx.beginPath();
    ctx.arc(x + 5, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // teeth along the clamping edge
  if (!LOD.card) {
    ctx.fillStyle = '#3a4c3f';
    ctx.beginPath();
    const ex = right ? x : x + 10, dir = right ? -1 : 1;
    ctx.moveTo(ex, JAW_Y + 3);
    for (let y = JAW_Y + 3; y < BASE - 3; y += 5) { ctx.lineTo(ex + dir * 3, y + 2.5); ctx.lineTo(ex, y + 5); }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// A vice jaw: a body on the slide and a wider jaw head on top with its outer top edge chamfered.
// The head overhangs the body on the outer side and throws a shadow on the body under it.
// xc: the clamping face; dir: +1 the jaw extends right of it, -1 left.
const JAW_W = 48, JAW_HEAD = 26, JAW_OVER = 7, JAW_CH = 11;
function viceJaw(ctx, xc, dir) {
  const xo = xc + dir * JAW_W, hy = JAW_Y + JAW_HEAD;
  const bx = Math.min(xc, xo - dir * 2);
  prism(ctx, rect(bx, hy, JAW_W - 2, BASE - hy), 74, MAT.lit);
  // shadow under the jaw head, on the body's front face
  ctx.save();
  const g = ctx.createLinearGradient(0, hy, 0, hy + 22);
  g.addColorStop(0, 'rgba(2,4,3,0.62)');
  g.addColorStop(1, 'rgba(2,4,3,0)');
  ctx.fillStyle = g;
  ctx.fillRect(bx, hy, JAW_W - 2, 22);
  ctx.restore();
  const xr = xo + dir * JAW_OVER;
  prism(ctx, [[xc, JAW_Y], [xr - dir * JAW_CH, JAW_Y], [xr, JAW_Y + JAW_CH], [xr, hy], [xc, hy]], 80, MAT.lit);
  // the chamfer catches the lamp on the fixed jaw (faces up-left) and falls dark on the moving one
  ctx.save();
  ctx.strokeStyle = dir < 0 ? '#9cc0a4' : '#2a382e';
  ctx.lineWidth = lw(2.4);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(xr - dir * JAW_CH, JAW_Y + 1);
  ctx.lineTo(xr, JAW_Y + JAW_CH);
  ctx.stroke();
  ctx.restore();
  jawInsert(ctx, dir > 0 ? xc : xc - 10, dir > 0);
}

function movingJaw(ctx, jaw) {
  ctx.save();
  ctx.translate(jaw, 0);
  sprite(ctx, 'why-jaw', LEG_X + LEG_W - 12, JAW_Y - 36, 120, BASE - JAW_Y + 44, (c) => viceJaw(c, LEG_X + LEG_W, 1));
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Session hand.

// The arm is drawn from sprites made at its parked pose (gx GX_REST, hy HAND_DROP) and moved. It is
// a machine: a hatched column on a carriage that rides a floor track off the right edge, a sleeve
// that slides on the column, and a boom that telescopes out of the sleeve to the head. To bring a
// bracket in or take one out, the whole carriage travels along the track.
const BOOM_LEN = 640; // longer than the boom ever shows; the sleeve hides the rest
const COL_TOP = 440;
function armColumn(ctx, active) {
  const SM = activeMat(MAT.session, active);
  contactShadow(ctx, COL_X + 40, FLOOR - 8, 90, 16, 0.5);
  prism(ctx, rect(COL_X - 30, FLOOR - 16, 108, 16), 60, SM, { sil: 3 });
  if (!LOD.card) for (const x of [COL_X - 14, COL_X + 62]) ball(ctx, x, FLOOR - 4, 6, MAT.lit);
  prism(ctx, rect(COL_X, COL_TOP, 48, FLOOR - 16 - COL_TOP), 40, SM, { hatch: true, sil: 3.5 });
  prism(ctx, rect(COL_X - 6, COL_TOP - 14, 60, 14), 44, SM, { sil: 3 });
}
function armSleeve(ctx, active) {
  const SM = activeMat(MAT.session, active);
  const by = BY + HAND_DROP;
  prism(ctx, rect(SLEEVE_X0, by - 18, COL_X - SLEEVE_X0, 36), 40, SM, { hatch: true, sil: 3.5 });
  prism(ctx, rect(COL_X - 8, by - 30, 64, 60), 46, SM, { sil: 3 });
  if (!LOD.card) for (const yy of [by - 18, by + 18]) ball(ctx, COL_X + 48, yy, 4, SM);
}
const ARM_ACT = 0.5; // the arm never lights to the ring's clean green: it is the session, not a tester
function handBoom(ctx, active) {
  const SM = activeMat(MAT.session, active);
  const headR = GX_REST + G / 2 + 76, by = BY + HAND_DROP;
  prism(ctx, rect(headR - 4, by - 12, BOOM_LEN, 24), 24, SM, { hatch: true, sil: 3 });
}
function handHead(ctx, active) {
  const SM = activeMat(MAT.session, active);
  const M = [GX_REST + G / 2, ARM_TOP + ARM_T + G / 2 + HAND_DROP];
  const headR = M[0] + 76;
  // head with a 45 degree pad that seats on the gusset's hypotenuse
  const head = [[M[0] - 14, M[1] + 28], [M[0] + 28, M[1] - 14], [headR, M[1] - 14], [headR, M[1] + 50], [M[0] - 14, M[1] + 50]];
  prism(ctx, head, 34, SM, { hatch: true, sil: 3.5 });
  const A = [M[0] - 21.2, M[1] + 21.2], B = [M[0] + 21.2, M[1] - 21.2];
  const pad = [A, B, [B[0] + 7.1, B[1] + 7.1], [A[0] + 7.1, A[1] + 7.1]];
  ctx.save();
  poly(ctx, pad);
  ctx.fillStyle = '#0c1a11';
  ctx.fill();
  ctx.strokeStyle = SM.sil;
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  ctx.restore();
  // wrist pivot
  ball(ctx, headR - 22, M[1] + 20, 7, SM);
}
function hand(ctx, gx, hy, gusset, active, cdx = 0) {
  const ox = gx - GX_REST, oy = hy - HAND_DROP;
  // column and carriage (travel with the carriage only)
  ctx.save();
  ctx.translate(cdx, 0);
  spriteAct(ctx, 'why-col', [COL_X - 40, COL_TOP - 30, 140, FLOOR - COL_TOP + 50], active, armColumn);
  ctx.restore();
  // boom: telescopes out of the sleeve
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SLEEVE_X0 + 30 + cdx, H);
  ctx.clip();
  ctx.translate(ox, oy);
  spriteAct(ctx, 'why-boom', [GX_REST + 112, BY + HAND_DROP - 26, BOOM_LEN + 30, 44], active, handBoom);
  ctx.restore();
  ctx.save();
  ctx.translate(ox, oy);
  if (gusset) {
    ctx.save();
    ctx.translate(gusset.dx, 0);
    sprite(ctx, 'why-gus', GX_REST - 6, ARM_TOP + ARM_T + HAND_DROP - 16, G + 30, G + 26, (c) => gussetSolid(c, GX_REST, ARM_TOP + ARM_T + HAND_DROP, true));
    ctx.restore();
  }
  spriteAct(ctx, 'why-head', [GX_REST + 20, 640, 130, 115], active, handHead);
  ctx.restore();
  // sleeve on the column (moves with the carriage and slides with the boom's height)
  ctx.save();
  ctx.translate(cdx, oy);
  spriteAct(ctx, 'why-sleeve', [SLEEVE_X0 - 8, BY + HAND_DROP - 50, COL_X + 90 - SLEEVE_X0, 100], active, armSleeve);
  ctx.restore();
}

// Arm poses (gusset-corner x gx, drop hy). FIT: the gusset centred on the inside corner. CARRY: the
// head under the bracket's arm, just right of the gusset, holding it up. PARK: on its rest stand.
const PARK = [GX_REST, HAND_DROP], FIT = [GX_FIT, 0], CARRY = [GX_FIT + 24, -29];
const bezPose = (p0, p1, p2, p3, u) => [bez(p0[0], p1[0], p2[0], p3[0], u), bez(p0[1], p1[1], p2[1], p3[1], u)];
function armPose(t) {
  if (t < LOWER_B) {
    // the carriage brings the bracket in from beyond the right edge, lifted, and sets it in the jaws;
    // until ENTRY_VIS it is still off frame, then it comes on at a steady feed and eases to a stop
    const dx = t < ENTRY_VIS ? RUN_VIS + ENTRY_V * (ENTRY_VIS - t) : RUN_VIS * (1 - trap(seg(t, ENTRY_VIS, ENTRY_B), 0, 0.45));
    const dy = -LIFT * (1 - smooth(seg(t, LOWER_A, LOWER_B)));
    return { gx: CARRY[0] + dx, hy: CARRY[1] + dy, dx, dy, carrying: true };
  }
  if (t < RETRACT_A) return { gx: CARRY[0], hy: CARRY[1] };
  if (t < FIT_A) {
    // back to the park: right first at the carrying height (clear of the vice), then down to the stand
    const u = seg(t, RETRACT_A, RETRACT_B);
    return { gx: lerp(CARRY[0], PARK[0], smooth(u)), hy: CARRY[1] - 8 * Math.sin(Math.PI * seg(u, 0, 0.5)) + (PARK[1] - CARRY[1]) * smooth(seg(u, 0.45, 1)) };
  }
  if (t < REGRIP[0]) {
    const [gx, hy] = bezPose(PARK, HAND_P1, HAND_P2, FIT, smooth(seg(t, FIT_A, FIT_B)));
    return { gx, hy };
  }
  // re-grip under the arm, lift clear of the jaws, carry out past the right edge
  const r = smooth(seg(t, REGRIP[0], REGRIP[1]));
  const dx = t < RUN_GONE ? RUN_VIS * trap(seg(t, RUN_A, RUN_GONE), 0.3, 0) : RUN_VIS + RUN_V * (t - RUN_GONE);
  const dy = -LIFT * smooth(seg(t, LIFT_T[0], LIFT_T[1]));
  return { gx: lerp(FIT[0], CARRY[0], r) + dx, hy: lerp(FIT[1], CARRY[1], r) + dy, dx, dy, carrying: t >= REGRIP[1] };
}
const smooth = (u) => u * u * (3 - 2 * u);

// ---------------------------------------------------------------------------------------------
// Hood: roller curtains between rails, rolled up into the beam.

function curtain(ctx, x0, x1, edge) {
  if (edge <= BEAM_Y1 + 1) return;
  const xa = x0 + 9, xb = x1 - 9;
  ctx.save();
  // shadow the curtain throws on what is behind its lower edge
  const sg = ctx.createLinearGradient(0, edge, 0, edge + 40);
  sg.addColorStop(0, 'rgba(2,4,3,0.45)');
  sg.addColorStop(1, 'rgba(2,4,3,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(xa, edge, xb - xa, 40);
  const g = ctx.createLinearGradient(0, BEAM_Y1, 0, CURT_END);
  g.addColorStop(0, '#121814');
  g.addColorStop(1, '#19211b');
  ctx.fillStyle = g;
  ctx.fillRect(xa, BEAM_Y1, xb - xa, edge - BEAM_Y1);
  // slats, anchored to the moving bottom edge
  const SL = 22;
  ctx.lineWidth = lw(2);
  ctx.strokeStyle = '#070a08';
  ctx.beginPath();
  for (let y = edge - 30; y > BEAM_Y1; y -= SL) { ctx.moveTo(xa, y); ctx.lineTo(xb, y); }
  ctx.stroke();
  if (!LOD.card) {
    ctx.strokeStyle = '#26322a';
    ctx.beginPath();
    for (let y = edge - 30 + 3; y > BEAM_Y1 + 3; y -= SL) { ctx.moveTo(xa, y); ctx.lineTo(xb, y); }
    ctx.stroke();
  }
  // bottom bar with a lit lip and a pull
  const by = edge - 30;
  const bg = ctx.createLinearGradient(0, by, 0, edge);
  bg.addColorStop(0, '#2a372d');
  bg.addColorStop(1, '#131915');
  ctx.fillStyle = bg;
  ctx.fillRect(xa, by, xb - xa, 30);
  ctx.fillStyle = '#5f8167';
  ctx.fillRect(xa, by, xb - xa, 2.5);
  ctx.fillStyle = P.dim;
  ctx.fillRect(xa, edge - 3, xb - xa, 3);
  const mx = (xa + xb) / 2;
  rodH(ctx, mx - 40, mx + 40, by + 15, 8, MAT.metal);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function slipSpike(ctx, x) {
  const y = FLOOR - 6;
  contactShadow(ctx, x + 18, y - 4, 80, 18, 0.5);
  const base = discPts(x, y, 42);
  ctx.fillStyle = '#0d120f';
  poly(ctx, base.map(([px, py]) => [px, py + 9]));
  ctx.fill();
  ctx.fillStyle = '#26322a';
  poly(ctx, base);
  ctx.fill();
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  rodV(ctx, x + D.x * 8, y - 150, y, 5, MAT.metal, false);
  // the conversation: slips on the spike, lowest darkest
  const r = rng(0x5115);
  const n = 8;
  let topY = y;
  for (let k = 0; k < n; k++) {
    const sy = y - 14 - k * 8;
    topY = sy;
    const a = (r() - 0.5) * 0.7;
    const off = (r() - 0.5) * 8;
    const corners = [[-44, -30], [36, -30], [44, -20], [44, 30], [-44, 30]].map(([u, v]) => {
      const uu = u * Math.cos(a) - v * Math.sin(a), vv = u * Math.sin(a) + v * Math.cos(a);
      return [x + off + uu + D.x * vv + D.x * 8, sy + D.y * vv];
    });
    ctx.fillStyle = '#0b0f0c';
    poly(ctx, corners.map(([px, py]) => [px, py + 3]));
    ctx.fill();
    ctx.fillStyle = mix('#53554f', '#a3a59b', k / (n - 1));
    poly(ctx, corners);
    ctx.fill();
  }
  rodV(ctx, x + D.x * 8, y - 150, topY, 5, MAT.metal, false);
  ctx.fillStyle = '#6f8f77';
  ctx.beginPath();
  ctx.moveTo(x + D.x * 8 - 2.5, y - 150);
  ctx.lineTo(x + D.x * 8, y - 164);
  ctx.lineTo(x + D.x * 8 + 2.5, y - 150);
  ctx.closePath();
  ctx.fill();
}

function backLayer(ctx) {
  benchFinal(ctx, 980, 600);
  lightShaft(ctx, WIN_X0 + 40, WIN_X1 - 40, BEAM_Y1, WIN_X0 - 10, WIN_X1 + 10, BENCH_Y, 0.045);
  // contact shadows on the bench
  contactShadow(ctx, 880, FLOOR - 8, 230, 26, 0.6);
  slipSpike(ctx, 380);
  // vice body: base with slots, fixed jaw, end block
  prism(ctx, rect(700, BASE, END_X + 36 - 700, FLOOR - BASE), 80, MAT.lit);
  prism(ctx, rect(LEG_X + LEG_W, 714, END_X - LEG_X - LEG_W, BASE - 714), 50, MAT.lit, { sil: 2.5 });
  ctx.fillStyle = '#080b09';
  for (const sx of [714, END_X + 6]) {
    ctx.beginPath();
    ctx.roundRect(sx, BASE + 13, 18, 14, 7);
    ctx.fill();
  }
  viceJaw(ctx, LEG_X, -1);
  prism(ctx, rect(END_X, 676, 36, BASE - 676), 80, MAT.lit);
  centreLine(ctx, LEG_X + LEG_W + 30, SCREW_Y, END_X + 120, SCREW_Y, 0.45);
  // the floor track the arm's carriage rides, running off the right edge
  rodH(ctx, COL_X - 50 + D.x * 40, W + 20, FLOOR - 6 + D.y * 40, 8, MAT.metal);
  rodH(ctx, COL_X - 50 + D.x * 8, W + 20, FLOOR - 4 + D.y * 8, 6, MAT.metal);
  // the stand the arm's head rests on when parked
  contactShadow(ctx, STAND_X + STAND_W / 2 + 14, FLOOR - 6, 70, 12, 0.5);
  prism(ctx, rect(STAND_X, STAND_TOP, STAND_W, FLOOR - STAND_TOP), 50, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(STAND_X - 8, FLOOR - 8, STAND_W + 16, 8), 58, MAT.metal, { sil: 2 });
}

function frontLayer(ctx) {
  for (const x of RAIL_XS) {
    prism(ctx, rect(x - 9, BEAM_Y1, 18, BENCH_Y - 4 - BEAM_Y1), 20, MAT.metal, { sil: 3 });
    ctx.fillStyle = '#080b09';
    ctx.fillRect(x - 2, BEAM_Y1 + 4, 4, BENCH_Y - 12 - BEAM_Y1);
    prism(ctx, rect(x - 18, BENCH_Y - 10, 36, 8), 26, MAT.metal, { sil: 2.5 });
  }
  prism(ctx, rect(60, BEAM_Y0, W - 120, BEAM_Y1 - BEAM_Y0), 26, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#060807';
  ctx.fillRect(WIN_X0 + 20, BEAM_Y1 - 5, WIN_X1 - WIN_X0 - 40, 3);
  if (!LOD.card) {
    for (let x = 140; x < W - 100; x += 172) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  }
  lampFalloff(ctx, 980, 600, 380, 1150, 0.6);
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'why',
  name: '/why',
  caption: 'Pressure-test a recommendation with one fresh reviewer',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'why-final-back', backLayer);

    // Ring presses and the bow they leave.
    const pr = presses(t);
    let bow = pr.bow;
    if (t >= P_END) bow = BOW;
    // The session's arm seats the gusset; on contact the bracket springs straight (one small overshoot).
    const seated = t >= FIT_B;
    if (seated) bow = BOW * (1 - springStep(t - FIT_B, SETTLE_K[0], SETTLE_K[1]));
    const arm = armPose(t);

    // Vice jaw and handle: open at the start (the arm sets the bracket in), closed for the review and
    // the fit, open again in the seam.
    const jaw = 36 * (1 - easeInOut(seg(t, JAW_CLOSE[0], JAW_CLOSE[1])) + easeInOut(seg(t, JAW_OPEN[0], JAW_OPEN[1])));
    const theta = 0.95 + (jaw / 36) * Math.PI * 3; // T-bar rests on a diagonal, turns 1.5 times
    if (Math.abs(jaw) < 1e-4 || Math.abs(jaw - 36) < 1e-4) sprite(ctx, 'why-screw' + (jaw > 18 ? 'o' : ''), LEG_X + LEG_W + 30, SCREW_Y - 80, END_X + 140 - LEG_X - LEG_W, 160, (c) => screwAndHandle(c, jaw > 18 ? 36 : 0, jaw > 18 ? 0.95 + Math.PI * 3 : 0.95));
    else screwAndHandle(ctx, jaw, theta);

    // Brackets: current one; in the seam it lifts out of the jaws and feeds out right while the next
    // one feeds in from the left at the same height and drops into the jaws. Both stay opaque: the
    // finished one leaves past the right edge of the frame (gone by 7.7) and the fresh one enters
    // from wholly off frame left; the feeds keep more than a bracket's length between them.
    // The bracket: carried in by the arm, reviewed and fitted in the vice, carried out by the arm.
    if (arm.dx !== undefined && arm.dx > RUN_VIS + 40) { /* wholly beyond the right edge */ }
    else bracket(ctx, { dx: arm.dx || 0, dy: arm.dy || 0, bow, seated });

    // The ring, present 0.7 to 4.2: drop on a stiff spring, presses, lift out.
    const ringOn = t >= RING_IN && t < RING_OUT[1];
    const needle = needleAt(t);
    let ringY = 0;
    if (ringOn) {
      ringY = RY0 + pr.travel - DROP * (1 - springStep(t - RING_IN, 0.8, 11.6)) - DROP * easeIn(seg(t, RING_OUT[0], RING_OUT[1]));
      // its shadow on the arm's top face, darker as the plunger closes in
      const tipY = ringY + R_OUT + BOSS_H + PLUNGER + TIP;
      const lx = pr.rx - LEG_X;
      const surf = ARM_TOP + bow * shape(lx);
      const gap = surf - tipY;
      if (gap < 140) contactShadow(ctx, pr.rx + D.x * 18, surf + D.y * 17, 26 + gap * 0.25, 6, 0.55 * clamp01(1 - gap / 140));
    }

    movingJaw(ctx, jaw);

    // Session hand.
    const { gx, hy } = arm;
    // the gusset rides on the head from the park (loaded behind the closed hood) until it is seated
    let gus = null;
    if (t >= 2.4 && !seated) gus = { dx: 60 * (1 - smooth(seg(t, 2.4, 2.9))) };
    const parked = clamp01(1 - Math.hypot(gx - PARK[0], hy - PARK[1]) / 60);
    contactShadow(ctx, gx + 140, FLOOR - 10, 120, 14, 0.3 * clamp01(1 - (gx - 1500) / 300));
    // parked, the head sits on its rest stand: a contact shadow on the stand's top face
    contactShadow(ctx, gx + 84 + D.x * 24, STAND_TOP + D.y * 24, 50, 8, 0.65 * parked);
    // the arm brightens a little while it works (to its own dim session green, never the ring's)
    const active = ARM_ACT * (1 - parked);
    hand(ctx, gx, hy, gus, active, arm.dx || 0);

    if (ringOn) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, BEAM_Y1, W, H);
      ctx.clip();
      const load = clamp01(needle / NEEDLE_OVER) * (pr.travel > HOVER ? 1 : 0);
      const lit = clamp01((needle - AMBER_AT) / 0.12);
      softGlow(ctx, pr.rx, ringY, 150, P.green, 0.07);
      ring(ctx, pr.rx, ringY, needle, load, lit);
      ctx.restore();
    }

    // Hood: curtains descend 0 to 0.7, rise 3.8 to 4.4; the window over the bracket stays open.
    const edge = BEAM_Y1 + (CURT_END - BEAM_Y1) * (easeInOut(seg(t, HOOD_DOWN[0], HOOD_DOWN[1])) - easeInOut(seg(t, HOOD_UP[0], HOOD_UP[1])));
    if (edge > BEAM_Y1 + 1) {
      // the curtains are drawn fully down once and slid up into the beam
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, BEAM_Y1, W, H - BEAM_Y1);
      ctx.clip();
      // whole device pixels, so the landing frame does not re-sample the curtain (no settle flicker)
      const ds = Math.hypot(ctx.getTransform().a, ctx.getTransform().b) || 1;
      ctx.translate(0, Math.round((edge - CURT_END) * ds) / ds);
      for (const [a, b] of [[0, 1], [2, 3]]) {
        sprite(ctx, 'why-curtain' + a, RAIL_XS[a], BEAM_Y1, RAIL_XS[b] - RAIL_XS[a], CURT_END + 44 - BEAM_Y1, (c) => curtain(c, RAIL_XS[a], RAIL_XS[b], CURT_END));
      }
      ctx.restore();
    }

    cached(ctx, 'why-final-front', frontLayer);

    // Light on top of the lamp falloff: contacts, the lit amber mark, the seating puff.
    for (const f of pr.flashes) {
      const x = PX[f.i];
      contactGlow(ctx, x, ARM_TOP + bow * shape(x - LEG_X), f.c);
    }
    if (ringOn && needle > AMBER_AT) {
      const am = -Math.PI / 2 + AMBER_AT;
      const cx = pr.rx + D.x * 6, cy = ringY + D.y * 6;
      softGlow(ctx, cx + Math.cos(am) * 27, cy + Math.sin(am) * 27, 30, P.amber, 0.5 * clamp01((needle - AMBER_AT) / 0.12));
    }
    contactGlow(ctx, LEG_X + LEG_W + 4, ARM_TOP + ARM_T + 4, (t - FIT_B) / 0.12, 40);
    if (seated) {
      const tau = t - FIT_B;
      dust(ctx, LEG_X + LEG_W + 2, ARM_TOP + ARM_T + 70, tau, 0x9a1, { ang: Math.PI * 0.75, spread: 1.4, n: 9, dur: 0.3 });
      dust(ctx, LEG_X + LEG_W + 60, ARM_TOP + ARM_T + 2, tau, 0x9b2, { ang: -Math.PI * 0.35, spread: 1.2, n: 7, dur: 0.28 });
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
