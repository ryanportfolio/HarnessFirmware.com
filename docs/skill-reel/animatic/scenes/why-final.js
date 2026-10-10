// /why at final fidelity (pitch A 3.5, same beats and timing as scenes/why.js).
// A hood lowers so only the recommendation is in view: an ivory bracket in a vice with the user's
// slip clipped to it. One fresh proving ring (clean green, same model as the session, never steel)
// drops in and presses three times; the third bows the bracket and the needle passes the amber
// mark. The ring lifts out, the hood rises, the session's hatched hand fits a gusset and the
// bracket straightens. Hold. Seam: the vice opens, the bracket feeds out, a fresh one feeds in.
// Nothing goes to a tray or file: /why changes nothing on disk.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, follow, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, discPts, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, lightShaft, activeMat, rng,
} from '../kit-final.js';

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

// Session hand: column at the right, telescoping boom, angled head holding the gusset by its hypotenuse.
const GX_REST = 1360, GX_FIT = LEG_X + LEG_W;
const BY = 614, SLEEVE_X0 = 1540, COL_X = 1700;
const HAND_A = (1.0 - 0.2) / 1.75;

// ---------------------------------------------------------------------------------------------
// Timing helpers (same contract as scenes/why.js).

function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, t3, c: (t - t1) / 0.12 };
}

// The three presses: ring x, ring travel below hover, needle target, bracket bow, contacts.
function presses(t) {
  let rx = PX[0], travel = 0, needle = 0, bow = 0;
  const flashes = [];
  for (let i = 0; i < 3; i++) {
    const s = 1.4 + 0.8 * i;
    if (t >= s && i > 0) rx = lerp(PX[i - 1], PX[i], indexEase(seg(t, s, s + 0.26)));
    const dwell = i === 2 ? 0.3 : 0.2;
    const e = engage(t, s + 0.15, (0.65 - dwell) / 1.75, dwell);
    const bmax = i < 2 ? ELASTIC : BOW;
    const sh = shape(PX[i] - LEG_X);
    const total = HOVER + bmax * sh;
    if (t >= s && t < s + 0.8) {
      travel = e.d * total;
      needle = e.d * (i < 2 ? NEEDLE_BAND : NEEDLE_OVER);
      bow = bmax * clamp01((travel - HOVER) / (bmax * sh));
      if (i === 2 && t >= e.t1) bow = BOW;
    }
    if (e.c > 0 && e.c < 1) flashes.push({ i, c: e.c });
  }
  if (t >= 3.8) rx = PX[2];
  return { rx, travel, needle, bow, flashes };
}
const needleTarget = (s) => (s < 1.4 || s > 4.4 ? 0 : presses(s).needle);
// The needle lags, overshoots and damps (about 5 Hz), integrated from rest at a fixed step.
const needleAt = (t) => (t < 1.4 || t > 4.6 ? 0 : follow(needleTarget, 1.35, t, 0.3, 34));

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

const gussetPts = (x, y) => [[x, y], [x + G, y], [x, y + G]];

// The gusset is a separate plate: a touch warmer than the bracket and outlined, so it reads as fitted.
const GUSSET_MAT = { ...MAT.ivory, front: ['#efefe6', '#cfd0c3'] };
function gussetSolid(ctx, x, y, standalone) {
  const pts = gussetPts(x, y);
  prism(ctx, pts, THICK, GUSSET_MAT, { noLines: false });
  ctx.save();
  ctx.strokeStyle = 'rgba(112,116,104,0.75)';
  ctx.lineWidth = lw(2);
  ctx.lineJoin = 'round';
  poly(ctx, pts);
  ctx.stroke();
  ctx.restore();
  hole(ctx, x + 24, y + 58, 6.5, THICK, MAT.ivory);
  hole(ctx, x + 58, y + 24, 6.5, THICK, MAT.ivory);
  if (standalone && !LOD.card) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,250,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 1);
    ctx.lineTo(x + G - 6, y + 1);
    ctx.stroke();
    ctx.restore();
  }
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
  const { dx = 0, dy = 0, s = 1, alpha = 1, bow = 0, seated = false } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(LEG_X + dx, BASE + dy);
  if (s !== 1) ctx.scale(s, s);
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
  if (seated) {
    hole(ctx, LEG_W + 24, top + ARM_T + 58, 6.5, THICK, MAT.ivory);
    hole(ctx, LEG_W + 58, top + ARM_T + 24, 6.5, THICK, MAT.ivory);
  }
  // registration hole near the arm end, and two bolt holes in the leg
  const hf = armFrame(ARM_L - 44, bow);
  hole(ctx, hf.ax, hf.ay, 10, THICK, MAT.ivory);
  hole(ctx, LEG_W / 2, top + ARM_T + 44, 6.5, THICK, MAT.ivory);
  hole(ctx, LEG_W / 2, top + ARM_T + 92, 6.5, THICK, MAT.ivory);
  slip(ctx);
  // drafting texture: leg centre line, arm thickness dimension
  centreLine(ctx, LEG_W / 2, top - 18, LEG_W / 2, top + ARM_T + 12, 0.5);
  dimension(ctx, et[0], et[1], eb[0], eb[1], -34, 0.55);
  ctx.restore();
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

function movingJaw(ctx, jaw) {
  const x = LEG_X + LEG_W + jaw;
  prism(ctx, rect(x, JAW_Y, 48, BASE - JAW_Y), 80, MAT.lit);
  jawInsert(ctx, x, true);
}

// ---------------------------------------------------------------------------------------------
// Session hand.

function hand(ctx, gx, gusset, active) {
  const SM = activeMat(MAT.session, active);
  const M = [gx + G / 2, ARM_TOP + ARM_T + G / 2];
  const headR = M[0] + 76;
  // inner boom (telescopes out of the sleeve)
  prism(ctx, rect(headR - 4, BY - 12, SLEEVE_X0 + 30 - headR, 24), 24, SM, { hatch: true, sil: 3 });
  if (gusset) {
    ctx.save();
    ctx.globalAlpha *= gusset.alpha;
    const gx0 = gx + gusset.dx, gy0 = ARM_TOP + ARM_T;
    if (gusset.s !== 1) {
      ctx.translate(gx0 + G / 3, gy0 + G / 3);
      ctx.scale(gusset.s, gusset.s);
      ctx.translate(-(gx0 + G / 3), -(gy0 + G / 3));
    }
    gussetSolid(ctx, gx0, gy0, true);
    ctx.restore();
  }
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
  // sleeve
  prism(ctx, rect(SLEEVE_X0, BY - 18, COL_X - SLEEVE_X0, 36), 40, SM, { hatch: true, sil: 3.5 });
  // wrist pivot
  ball(ctx, headR - 22, M[1] + 20, 7, SM);
}

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
  contactShadow(ctx, COL_X + 40, FLOOR - 8, 90, 18, 0.5);
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
  prism(ctx, rect(742, JAW_Y, LEG_X - 742, BASE - JAW_Y), 80, MAT.lit);
  jawInsert(ctx, LEG_X - 10, false);
  prism(ctx, rect(END_X, 676, 36, BASE - 676), 80, MAT.lit);
  centreLine(ctx, LEG_X + LEG_W + 30, SCREW_Y, END_X + 120, SCREW_Y, 0.45);
  // session column and foot (the hand's fixed part)
  const idle = activeMat(MAT.session, 0);
  prism(ctx, rect(COL_X - 26, FLOOR - 14, 100, 14), 60, idle, { sil: 3 });
  prism(ctx, rect(COL_X, 520, 48, FLOOR - 14 - 520), 40, idle, { hatch: true, sil: 3.5 });
  prism(ctx, rect(COL_X - 6, 506, 60, 16), 44, idle, { sil: 3 });
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
  id: 'why-final',
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
    if (t >= 3.8) bow = BOW;
    // The session hand carries the gusset in; on contact the arm springs straight (one small overshoot).
    const he = engage(t, 4.4, HAND_A);
    const seated = t >= he.t1;
    if (seated) bow = BOW * (1 - springStep(t - he.t1, 0.55, 20));

    // Vice jaw and handle (the seam opens and closes them).
    const jaw = 36 * (easeInOut(seg(t, 7.0, 7.2)) - easeInOut(seg(t, 7.8, 8.0)));
    const theta = 0.95 + (jaw / 36) * Math.PI * 3; // T-bar rests on a diagonal, turns 1.5 times
    screwAndHandle(ctx, jaw, theta);

    // Brackets: current one; in the seam it lifts out of the jaws and feeds right while the next
    // one feeds in from the left and drops into the jaws.
    // Staggered so the two never sit on top of each other: out lifts 7.15, slides and fades by 7.6;
    // in appears at 7.5, slides to the jaws by 7.8, drops in by 7.92; the jaws close by 8.0.
    if (t < 7.15) bracket(ctx, { bow, seated });
    else if (t < 7.6) {
      const f = easeInOut(seg(t, 7.28, 7.6));
      bracket(ctx, { dx: 360 * easeIn(seg(t, 7.25, 7.6)), dy: -84 * easeInOut(seg(t, 7.15, 7.32)), s: lerp(1, 0.9, f), alpha: 1 - f, bow, seated });
    }
    if (t >= 7.5) {
      const e = easeOut(seg(t, 7.5, 7.8));
      bracket(ctx, { dx: -360 * (1 - e), dy: -84 * (1 - easeInOut(seg(t, 7.8, 7.92))), s: lerp(0.9, 1, e), alpha: easeOut(seg(t, 7.5, 7.7)) });
    }

    // The ring, present 0.7 to 4.2: drop on a stiff spring, presses, lift out.
    const ringOn = t >= 0.7 && t < 4.2;
    const needle = needleAt(t);
    let ringY = 0;
    if (ringOn) {
      ringY = RY0 + pr.travel - DROP * (1 - springStep(t - 0.7, 0.8, 11.6)) - DROP * easeIn(seg(t, 3.8, 4.2));
      // its shadow on the arm's top face, darker as the plunger closes in
      const tipY = ringY + R_OUT + BOSS_H + PLUNGER + TIP;
      const lx = pr.rx - LEG_X;
      const surf = ARM_TOP + bow * shape(lx);
      const gap = surf - tipY;
      if (gap < 140) contactShadow(ctx, pr.rx + D.x * 18, surf + D.y * 17, 26 + gap * 0.25, 6, 0.55 * clamp01(1 - gap / 140));
    }

    movingJaw(ctx, jaw);

    // Session hand.
    const gx = lerp(GX_REST, GX_FIT, he.d);
    let gus = null;
    if (!seated) gus = { dx: 0, s: 1, alpha: 1 };
    else if (t >= 7.4) {
      const u = easeOut(seg(t, 7.4, 7.9));
      gus = { dx: 120 * (1 - u), s: lerp(0.9, 1, u), alpha: u };
    }
    contactShadow(ctx, gx + 140, FLOOR - 10, 120, 14, 0.35);
    // the hand brightens while it works and dims back to idle
    const active = easeInOut(seg(t, 4.05, 4.4)) - easeInOut(seg(t, 5.4, 6.0));
    hand(ctx, gx, gus, active);

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
    const edge = BEAM_Y1 + (CURT_END - BEAM_Y1) * (easeInOut(seg(t, 0, 0.7)) - easeInOut(seg(t, 3.8, 4.4)));
    curtain(ctx, RAIL_XS[0], RAIL_XS[1], edge);
    curtain(ctx, RAIL_XS[2], RAIL_XS[3], edge);

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
    contactGlow(ctx, LEG_X + LEG_W + 4, ARM_TOP + ARM_T + 4, he.c, 40);
    if (seated) {
      const tau = t - he.t1;
      dust(ctx, LEG_X + LEG_W + 2, ARM_TOP + ARM_T + 70, tau, 0x9a1, { ang: Math.PI * 0.75, spread: 1.4, n: 9, dur: 0.5 });
      dust(ctx, LEG_X + LEG_W + 60, ARM_TOP + ARM_T + 2, tau, 0x9b2, { ang: -Math.PI * 0.35, spread: 1.2, n: 7, dur: 0.45 });
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
