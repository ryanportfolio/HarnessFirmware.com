// /showpiece at final fidelity (pitch A 3.9).
// A contour gauge, the session's own tool, copies the profile of the real subject casting, a cast
// part with flowing curves, and lays it on a plain blank. The cutter first takes a small specimen
// from the blank's corner, carries it to the subject's most specific feature and test-fits it,
// then drops it in the scrap slot; then it cuts the whole edge, past the cautious scribe line, to
// the full profile. The light-gap check: the finished piece is carried low to two other castings
// with a backlight behind each; it stops at first contact and light pours through amber-edged
// gaps. Against its own subject it mates flush: no light, one bright join line. Hold. Seam: the
// piece is carried out right under the parked cutter, the gauge pins spring flat, a new plain
// blank rises on the station lift. No list, no score, no reviewer.
// Both tools hang from one overhead gantry and park at its ends, so the work can travel under them.
// Pure function of t. No Math.random, no setTransform. Static geometry lives in cached layers;
// rigid moving parts are drawn once into per-scale sprites and placed each frame.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, setLod, lw, cached, grainOver, poly, prism, rect, hole, rodV, rodH, ball,
  contactShadow, contactGlow, softGlow, dust, centreLine, dimension, benchFinal, lampFalloff,
  activeMat, rng,
} from '../kit.mjs';

const T = 9.0;
const sm = (u) => u * u * (3 - 2 * u);
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
// draw a session-family part crossfading from idle to active by a
function blit2(ctx, key, box, draw, a, dx, dy) {
  blit(ctx, sprite(ctx, key + '0', box, (c) => draw(c, activeMat(MAT.session, 0))), dx, dy);
  if (a > 0.004) {
    ctx.save();
    ctx.globalAlpha *= a;
    blit(ctx, sprite(ctx, key + '1', box, (c) => draw(c, activeMat(MAT.session, 1))), dx, dy);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080). Everything stands on FLOOR (the bench's front plane).

const BOT = FLOOR;
const BW = 160, BH = 240, BTOP = BOT - BH, THICK = 30; // the blank, 2:3
const CLIP = BW * 0.22; // clipped top-right corner
const BASE0 = 790; // blank station
const SUB_FACE = 560; // the subject's profiled face
const FOOT_Y = 726, FOOT = 64; // the subject's toe; the specimen comes out of the blank's matching corner
const CUT0 = 570, CUT1 = FOOT_Y;
const SPEC_H = BOT - FOOT_Y;
const SCRIBE = 0.65; // the scribe is a cautious mark; the cut goes past it to the full profile

// The subject's face: depth to the right of SUB_FACE by y. A cast form, all radii: a rounded lobe,
// a soft waist, then an S-curve sweeping out to the toe. Catmull-Rom through the control points,
// sampled once into a table.
const CTRL = [[558, 0], [570, 0], [582, 14], [594, 40], [606, 50], [618, 43], [632, 25], [648, 14], [664, 16], [680, 30], [696, 50], [712, 61], [726, 64], [738, 64]];
const PROF = (() => {
  const out = new Float64Array(CUT1 - CUT0 + 1);
  for (let y = CUT0; y <= CUT1; y++) {
    let k = 1;
    while (k < CTRL.length - 2 && CTRL[k + 1][0] <= y) k++;
    const [y0, p0] = CTRL[k - 1], [y1, p1] = CTRL[k], [y2, p2] = CTRL[k + 1], [y3, p3] = CTRL[Math.min(k + 2, CTRL.length - 1)];
    const u = (y - y1) / (y2 - y1);
    const m1 = (p2 - p0) / (y2 - y0) * (y2 - y1), m2 = (p3 - p1) / (y3 - y1) * (y2 - y1);
    const u2 = u * u, u3 = u2 * u;
    out[y - CUT0] = (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
  }
  out[0] = 0;
  out[CUT1 - CUT0] = FOOT;
  return out;
})();
function f(y) {
  if (y >= FOOT_Y) return FOOT;
  if (y <= CUT0) return 0;
  const i = Math.floor(y - CUT0), v = y - CUT0 - i;
  return lerp(PROF[i], PROF[i + 1], v);
}
const g = (ly) => f(CUT0 + ly); // the specimen's edge: the lobe, the most specific part

// The two other castings: low, so the work can be carried over them. One round-shouldered with a
// gently bowed face, one with a ledge.
const D1 = { x0: 975, face: 1060, top: 650 };
const D2 = { x0: 1240, face: 1330, top: 660 };
const g1 = (y) => (y < D1.top ? null : 12 * Math.sin((Math.PI * (y - D1.top)) / (BOT - D1.top)));
const g2 = (y) => (y < D2.top ? null : y < 700 ? 28 : 0);
const E = (y) => f(y); // the finished edge (the toe rows are the notch, FOOT deep)
function touch(face, prof) {
  let m = -Infinity, at = 0;
  for (let y = BTOP; y <= BOT; y += 1) { const v = prof(y); if (v !== null && v - E(y) > m) { m = v - E(y); at = y; } }
  return { x: face + m, y: at };
}
const T1 = touch(D1.face, g1), T2 = touch(D2.face, g2);
const P1 = T1.x, P2 = T2.x;
// Where the light gaps are widest, above and below the contact: the glow blooms there.
function gapBlooms(d, prof, P, ty) {
  const out = [];
  for (const [y0, y1] of [[d.top + 14, ty - 8], [ty + 8, BOT - 6]]) {
    let best = null;
    for (let y = y0; y <= y1; y += 2) {
      const a = d.face + prof(y), b = P + E(y);
      if (!best || b - a > best.w) best = { w: b - a, x: (a + b) / 2, y };
    }
    if (best && best.w > 12) out.push(best);
  }
  return out;
}
const BLOOMS = [gapBlooms(D1, g1, P1, T1.y), gapBlooms(D2, g2, P2, T2.y)];

// Gantry and tools.
const BEAM_Y0 = 232, BEAM_Y1 = 254, CAR_Y = 276;
const PINS = 8, PIN0 = 588, PIN_STEP = 23, PIN_LEN = 150;
const PIN_Y = Array.from({ length: PINS }, (_, i) => PIN0 + PIN_STEP * i);
const GB_X = 108, GB_W = 34, GB_TOP = PIN0 - 16, GB_BOT = PIN_Y[PINS - 1] + 16; // gauge body
const G_PARK = { X: 40, dy: -282 };
const C_PARK = 1850, C_HOVER = 466, HOUSE = 176; // cutter: park x, tip y when raised, tip to housing top
const LIFT = 140; // carried low over the castings

// ---------------------------------------------------------------------------------------------
// Materials.

const CAST = { front: ['#33443a', '#1f2922'], top: '#4b6152', side: '#111814', sil: '#6a8d72', hi: '#a3c6aa', line: '#34453a' };
const CAST_DIM = { front: ['#2a362e', '#1b231e'], top: '#3a4c40', side: '#0e1411', sil: '#4d6d57', hi: '#6f9277', line: '#26332a' };
const PIN_MAT = { front: ['#3f7d52', '#1d3b28'], top: '#a4f5ba', side: '#10241a', sil: null };
const PIN_IDLE = { front: ['#2a4f37', '#14261b'], top: '#5d9a70', side: '#0b1610', sil: null };
const BIT_MAT = { front: ['#33463a', '#1a241e'], top: '#7f9b86', side: '#0d120f', sil: null };

// ---------------------------------------------------------------------------------------------
// Timeline (s). Gauge 0 to 2.4; specimen cut 2.3 to 2.5, carried and test-fitted 2.58 to 2.98,
// dropped 3.08; full cut 3.14 to 3.56; light-gap check 3.95 to 6.6; still 6.74 to 8.25; seam 8.25.

const T_SPEC = [2.3, 2.5], T_CUT = [3.14, 3.56];
const SPEC = { grip: 2.58, fit: 2.92, off: 2.98, drop: 3.08 };
const HOPS = [[3.95, 4.4], [4.82, 5.3], [5.72, 6.6]];
const REST_AT = [[4.4, 4.82], [5.3, 5.72]]; // resting against D1, D2
const FLUSH = 6.6;
const SEAM = 8.25;
const SCRAP_X = 732; // the scrap slot between the subject and the station

// ---------------------------------------------------------------------------------------------
// Paths and poses.

function along(pts, u) {
  let total = 0;
  const L = [];
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); L.push(d); total += d; }
  let s = clamp01(u) * total;
  for (let k = 0; k < L.length; k++) {
    if (s <= L[k] || k === L.length - 1) {
      const v = L[k] ? clamp01(s / L[k]) : 0;
      return [lerp(pts[k][0], pts[k + 1][0], v), lerp(pts[k][1], pts[k + 1][1], v)];
    }
    s -= L[k];
  }
  return pts[pts.length - 1];
}
const SPEC_PATH = (() => {
  const pts = [[BASE0 + FOOT, BOT], [BASE0 + FOOT, FOOT_Y]];
  for (let ly = 0; ly <= SPEC_H; ly += 2) pts.push([BASE0 + g(ly), FOOT_Y + ly]);
  return pts;
})();
const CUT_PATH = (() => {
  const pts = [];
  for (let y = CUT0; y <= CUT1 - 0.5; y += 2) pts.push([BASE0 + f(y), y]);
  pts.push([BASE0 + f(CUT1 - 0.01), CUT1]);
  return pts;
})();
const lerpPt = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// The specimen's top-left corner while the cutter carries it (null when it is not carried).
const SPEC_CARRY = [[BASE0, FOOT_Y], [BASE0 - 100, FOOT_Y], [SUB_FACE + 36, CUT0]];
function specimenAt(t) {
  if (t < T_SPEC[1] || t >= SPEC.drop + 0.3) return null;
  if (t < SPEC.grip) return { x: BASE0, y: FOOT_Y };
  if (t < SPEC.fit - 0.08) { const [x, y] = along(SPEC_CARRY, sseg(t, SPEC.grip, SPEC.fit - 0.08)); return { x, y }; }
  if (t < SPEC.fit) return { x: lerp(SUB_FACE + 36, SUB_FACE, easeOut(seg(t, SPEC.fit - 0.08, SPEC.fit))), y: CUT0 };
  if (t < SPEC.off) return { x: SUB_FACE, y: CUT0 };
  if (t < SPEC.drop) return { x: lerp(SUB_FACE, SCRAP_X - FOOT / 2, sseg(t, SPEC.off, SPEC.drop)), y: CUT0 };
  return { x: SCRAP_X - FOOT / 2, y: CUT0 + 240 * easeIn(seg(t, SPEC.drop + 0.02, SPEC.drop + 0.28)), falling: true };
}
const GRIP_DX = 40; // the bit holds the specimen at this point on its top edge

function cutterTip(t) {
  const hover = [BASE0 + FOOT, C_HOVER];
  if (t < 1.75) return [C_PARK, C_HOVER];
  if (t < 2.15) return [lerp(C_PARK, hover[0], sseg(t, 1.75, 2.15)), C_HOVER];
  if (t < T_SPEC[0]) return lerpPt(hover, SPEC_PATH[0], easeInOut(seg(t, 2.15, T_SPEC[0])));
  if (t < T_SPEC[1]) return along(SPEC_PATH, sseg(t, T_SPEC[0], T_SPEC[1]));
  const specEnd = SPEC_PATH[SPEC_PATH.length - 1];
  if (t < SPEC.grip) return lerpPt(specEnd, [BASE0 + GRIP_DX, FOOT_Y], sseg(t, T_SPEC[1], SPEC.grip));
  if (t < SPEC.drop) { const sp = specimenAt(t); return [sp.x + GRIP_DX, sp.y]; }
  const rel = [SCRAP_X - FOOT / 2 + GRIP_DX, CUT0];
  const top = CUT_PATH[0];
  if (t < T_CUT[0]) return lerpPt(rel, top, sseg(t, SPEC.drop, T_CUT[0]));
  if (t < T_CUT[1]) return along(CUT_PATH, sseg(t, T_CUT[0], T_CUT[1]));
  // withdraw: left out of the cut, up (0.36 s, eased), then along the beam to its park, blended
  const end = CUT_PATH[CUT_PATH.length - 1];
  // out of the toe notch to the left of the new edge first, so the bit never crosses the piece
  const x = end[0] - 74 * sseg(t, T_CUT[1], T_CUT[1] + 0.12) + (C_PARK - end[0] + 74) * sseg(t, 3.84, 4.55);
  return [x, lerp(end[1], C_HOVER, sseg(t, T_CUT[1], 3.92))];
}
const cutting = (t) => (t >= T_SPEC[0] && t < T_SPEC[1]) || (t >= T_CUT[0] && t < T_CUT[1]);

function cutY(t) {
  if (t < T_CUT[0]) return CUT0;
  if (t < T_CUT[1]) return cutterTip(t)[1];
  return CUT1;
}
const notched = (t) => t >= T_SPEC[1];

// The work's left edge offset by y, at time t.
function edgeAt(t) {
  const cy = cutY(t), n = notched(t);
  return (y) => (y >= FOOT_Y ? (n ? FOOT : 0) : y < cy ? f(y) : 0);
}

// Trapezoid ease: accelerate over the first quarter, cruise, decelerate over the last quarter
// (peak speed 1.33x the average, lower than a smoothstep's 1.5x).
function tz(u, a = 0.25) {
  const vp = 1 / (1 - a);
  if (u < a) return (0.5 * vp * u * u) / a;
  if (u < 1 - a) return vp * (u - a / 2);
  return 1 - (0.5 * vp * (1 - u) * (1 - u)) / a;
}
// One carried move of the work: back off, lift, travel, lower, slide in to touch.
function hop(t, t0, t1, xa, xb, app, back) {
  const u = seg(t, t0, t1);
  const bk = back * sm(clamp01(u / 0.12));
  const up = sm(clamp01((u - 0.06) / 0.3)) - sm(clamp01((u - 0.66) / 0.26));
  const tr = tz(clamp01((u - 0.24) / 0.6));
  const sl = easeOut(clamp01((u - 0.84) / 0.16));
  return { x: lerp(xa + bk, xb + app, tr) - app * sl, dy: -LIFT * up };
}

// Seam: slide off the subject, lift clear of the castings, set down past them and roll out of
// frame right along the bench, under the parked cutter.
const OUT_V = 2350, OUT_ACC = 0.15, OUT_T0 = SEAM + 0.12;
function outX(t) {
  const lt = t - OUT_T0;
  if (lt <= 0) return 0;
  if (lt < OUT_ACC) return (OUT_V * lt * lt) / (2 * OUT_ACC);
  return OUT_V * (lt - OUT_ACC / 2);
}
const CLEAR_X = D2.face + 28 + 22; // the piece's left edge is past the ledged casting here
function piecePose(t) {
  if (t < HOPS[0][0]) return { x: BASE0, dy: 0 };
  if (t < HOPS[0][1]) return hop(t, ...HOPS[0], BASE0, P1, 20, 0);
  if (t < HOPS[1][0]) return { x: P1, dy: 0 };
  if (t < HOPS[1][1]) return hop(t, ...HOPS[1], P1, P2, 20, 22);
  if (t < HOPS[2][0]) return { x: P2, dy: 0 };
  if (t < HOPS[2][1]) return hop(t, ...HOPS[2], P2, SUB_FACE, 60, 50);
  if (t < SEAM) return { x: SUB_FACE, dy: 0 };
  const x = SUB_FACE + 70 * sseg(t, SEAM, SEAM + 0.12) + outX(t);
  if (x > W + 4) return null;
  const up = Math.min(sseg(t, SEAM + 0.08, SEAM + 0.22), 1 - sm(clamp01((x - CLEAR_X) / 190)));
  return { x, dy: -LIFT * up };
}

// The station lift: the platform drops at the seam and rises with a new plain blank.
const LIFT_DROP = [SEAM + 0.12, SEAM + 0.22], LIFT_RISE = [SEAM + 0.28, T - 0.02];
const RISE = BH + 16;
function liftOffset(t) {
  if (t < LIFT_DROP[0]) return 0;
  if (t < LIFT_DROP[1]) return 30 * easeIn(seg(t, LIFT_DROP[0], LIFT_DROP[1]));
  if (t < LIFT_RISE[0]) return RISE;
  return RISE * (1 - easeOut(seg(t, LIFT_RISE[0], LIFT_RISE[1])));
}

function gaugePose(t) {
  const fi = PIN_Y.map(f);
  if (t < 0.5) {
    return { X: lerp(G_PARK.X, 630, sseg(t, 0, 0.38)), dy: lerp(G_PARK.dy, 0, sseg(t, 0.28, 0.5)), p: fi.map(() => 0), flat: true };
  }
  if (t < 0.62) {
    const X = lerp(630, SUB_FACE, easeInOut(seg(t, 0.5, 0.62)));
    return { X, dy: 0, p: fi.map((v) => Math.max(0, SUB_FACE + v - X)) };
  }
  if (t < 1.0) {
    // index ripple top to bottom: each pin seats with a small click
    return { X: SUB_FACE, dy: 0, p: fi.map((v, i) => { const u = seg(t, 0.62 + 0.033 * i, 0.75 + 0.033 * i); return v + 5 * (u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0); }) };
  }
  if (t < 1.18) return { X: lerp(SUB_FACE, 610, easeIn(seg(t, 1.0, 1.18))), dy: 0, p: fi, set: true };
  if (t < 1.72) return { X: lerp(610, BASE0, easeInOut(seg(t, 1.18, 1.45))), dy: 0, p: fi, set: true };
  if (t < 1.92) return { X: BASE0, dy: lerp(0, G_PARK.dy, sseg(t, 1.72, 1.92)), p: fi, set: true };
  if (t < SEAM) return { X: lerp(BASE0, G_PARK.X, sseg(t, 1.92, 2.4)), dy: G_PARK.dy, p: fi, set: true };
  // seam: pins spring back flat, one after another
  if (t >= SEAM + 0.06 + 0.035 * PINS + 0.16) return { X: G_PARK.X, dy: G_PARK.dy, p: fi.map(() => 0), flat: true };
  return { X: G_PARK.X, dy: G_PARK.dy, p: fi.map((v, i) => v * (1 - indexHome(seg(t, SEAM + 0.035 * i, SEAM + 0.16 + 0.035 * i)))) };
}
// 0 -> 1 with one 4% overshoot, settled at u = 1
function indexHome(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < 0.6) return 1.04 * easeOut(u / 0.6);
  return 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4);
}

// ---------------------------------------------------------------------------------------------
// The work.

function blankOutline(x, top, e) {
  const pts = [[x + e(BTOP), top], [x + BW - CLIP, top], [x + BW, top + CLIP], [x + BW, top + BH]];
  const ys = [];
  for (let y = BOT; y >= BTOP; y -= 2) ys.push(y);
  ys.push(FOOT_Y + 0.01, FOOT_Y - 0.01);
  ys.sort((a, b) => b - a);
  for (const y of ys) pts.push([x + e(y), top + (y - BTOP)]);
  return pts;
}

function pieceVec(ctx, x, dy, e, cy = null) {
  const top = BTOP + dy;
  let pts = blankOutline(x, top, e);
  if (cy !== null && cy > CUT0 && cy < CUT1) {
    // the cut front: a square shoulder where the cutter is
    pts = pts.filter(([, py]) => Math.abs(py - (top + cy - BTOP)) > 0.6);
    const yy = top + cy - BTOP;
    let k = pts.findIndex(([, py], i) => i > 3 && py < yy);
    if (k < 0) k = pts.length;
    pts.splice(k, 0, [x, yy + 0.01], [x + f(cy), yy - 0.01]);
  }
  prism(ctx, pts, THICK, MAT.ivory);
  // lit top edge, registration hole, a quiet centre line through the hole
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,250,0.85)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x + e(BTOP) + 1, top + 1);
  ctx.lineTo(x + BW - CLIP - 1, top + 1);
  ctx.stroke();
  ctx.restore();
  hole(ctx, x + BW * 0.35, top + BH * 0.16, 10, THICK, MAT.ivory);
  centreLine(ctx, x + BW * 0.35, top + 10, x + BW * 0.35, top + BH * 0.16 + 26, 0.5);
}
const PIECE_BOX = [BASE0 - 8, BTOP - 20, BW + 30, BH + 30];
const EDGES = {
  plain: () => 0,
  notched: (y) => (y >= FOOT_Y ? FOOT : 0),
  done: (y) => E(y),
};
function piece(ctx, t, x, dy, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (t >= T_CUT[0] && t < T_CUT[1]) pieceVec(ctx, x, dy, edgeAt(t), cutY(t));
  else {
    const k = t >= T_CUT[1] ? 'done' : notched(t) ? 'notched' : 'plain';
    blit(ctx, sprite(ctx, 'sp-piece-' + k, PIECE_BOX, (c) => pieceVec(c, BASE0, 0, EDGES[k])), x - BASE0, dy);
  }
  ctx.restore();
}

function drawSpecimen(ctx, sx, sy, alpha = 1, s = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (s !== 1) {
    const cx = sx + FOOT / 2, cy = sy + SPEC_H / 2;
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
  }
  const pts = [[sx + FOOT, sy], [sx + FOOT, sy + SPEC_H]];
  for (let ly = SPEC_H; ly >= 0; ly -= 2) pts.push([sx + g(ly), sy + ly]);
  prism(ctx, pts, THICK, MAT.ivory);
  ctx.restore();
}

// The scribe line: a cautious copy of the profile, scratched onto the blank's face.
function drawScribe(ctx, t) {
  if (t < 1.45 || t >= T_CUT[1]) return;
  const end = lerp(CUT0, CUT1, sseg(t, 1.45, 1.72));
  const start = Math.max(CUT0, cutY(t) + 3);
  if (end <= start) return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,70,44,0.55)';
  ctx.lineWidth = lw(4);
  ctx.beginPath();
  for (let y = start; y <= end; y += 2) { const x = BASE0 + SCRIBE * f(y) + 1; y === start ? ctx.moveTo(x, y + 1) : ctx.lineTo(x, y + 1); }
  ctx.stroke();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  for (let y = start; y <= end; y += 2) { const x = BASE0 + SCRIBE * f(y); y === start ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Tools.

function drawCarriageBlock(ctx, SM) {
  const cx = 0;
  prism(ctx, rect(cx - 30, BEAM_Y1, 60, CAR_Y - BEAM_Y1), 36, SM, { hatch: true, sil: 3 });
  if (!LOD.card) for (const k of [-17, 17]) ball(ctx, cx + k, BEAM_Y1 + 11, 4.5, SM);
}
const CAR_BOX = [-38, BEAM_Y1 - 22, 96, CAR_Y - BEAM_Y1 + 30];
function carriage(ctx, cx, toolTop, a) {
  blit2(ctx, 'sp-car', CAR_BOX, drawCarriageBlock, a, cx, 0);
  if (toolTop > CAR_Y) {
    const SM = activeMat(MAT.session, a);
    rodV(ctx, cx, CAR_Y - 2, toolTop + 2, 9, SM);
    rodV(ctx, cx, CAR_Y - 2, Math.min(CAR_Y + 54, toolTop), 17, SM);
  }
}

// The contour gauge: a comb of sliding pins held in a hatched body (the session's own tool).
// Drawn with its body's left edge at x = 0 and dy = 0; pins pushed back by p[i].
function drawGaugeAt(ctx, p, SM, PM) {
  const X = 0, bx = X + GB_X, top = GB_TOP, bot = GB_BOT;
  const ph = LOD.card ? 9 : 7;
  for (let i = 0; i < PINS; i++) {
    const y = PIN_Y[i], x0 = X + p[i];
    rodH(ctx, x0 + 3, x0 + PIN_LEN, y, ph, PM, false);
    ctx.fillStyle = mix('#10241a', PM.top, 0.75);
    ctx.beginPath();
    ctx.arc(x0 + 4, y, ph / 2 + 0.6, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.fill();
  }
  // clamp head on top of the body, then the body with its slot cover
  prism(ctx, rect(bx - 6, top - 14, GB_W + 12, 16), 30, SM, { sil: 3 });
  prism(ctx, rect(bx, top, GB_W, bot - top), 26, SM, { hatch: true, sil: 3.5, hatchGap: 11 });
  if (!LOD.card) {
    ctx.fillStyle = '#07100a';
    ctx.fillRect(bx + GB_W / 2 - 2, top + 8, 4, bot - top - 16);
  }
  ball(ctx, bx + GB_W / 2, top + 4 - 10, 6.5, SM);
  ball(ctx, bx + GB_W / 2, bot - 9, 5.5, SM);
}
const GAUGE_BOX = [-6, GB_TOP - 26, GB_X + PIN_LEN + 80, GB_BOT - GB_TOP + 40];
function drawGauge(ctx, t) {
  const pose = gaugePose(t);
  const { X, dy, p } = pose;
  const a = sseg(t, 0, 0.2) - sseg(t, 2.2, 2.6);
  const bx = X + GB_X, top = GB_TOP + dy;
  carriage(ctx, bx + GB_W / 2, top - 14, a);
  const PM = a > 0.5 ? PIN_MAT : PIN_IDLE;
  if (pose.flat || pose.set) {
    // a fixed pin state: one sprite per state, crossfaded idle to active
    const k = 'sp-gauge-' + (pose.flat ? 'f' : 's') + (a > 0.5 ? 'a' : 'i');
    const pp = pose.flat ? PIN_Y.map(() => 0) : PIN_Y.map(f);
    blit2(ctx, k, GAUGE_BOX, (c, SM) => drawGaugeAt(c, pp, SM, PM), a, X, dy);
  } else {
    ctx.save();
    ctx.translate(X, dy);
    drawGaugeAt(ctx, p, activeMat(MAT.session, a), PM);
    ctx.restore();
  }
  // a contact shadow on the bench while the gauge works low
  if (dy > -60) contactShadow(ctx, X + 90, FLOOR - 4, 110, 10, 0.35 * clamp01(1 + dy / 60));
}

// The cutter: a hatched spindle on the second carriage, a fluted bit pointing down. Drawn with
// its tip at (0, 0).
function drawCutterAt(ctx, SM) {
  const px = 0, py = 0, hTop = py - HOUSE;
  prism(ctx, rect(px - 27, hTop, 54, 104), 40, SM, { hatch: true, sil: 3.5 });
  if (!LOD.card) {
    ctx.strokeStyle = '#06100a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = hTop + 16; y < hTop + 50; y += 8) { ctx.moveTo(px - 20, y); ctx.lineTo(px + 20, y); }
    ctx.stroke();
  }
  rodV(ctx, px, hTop + 104, hTop + 124, 30, SM);
  rodV(ctx, px, hTop + 124, hTop + 138, 17, MAT.lit);
  const b0 = hTop + 138, b1 = py - 8;
  rodV(ctx, px, b0, b1, 10, BIT_MAT, false);
  ctx.fillStyle = '#5f7f68';
  ctx.beginPath();
  ctx.moveTo(px - 5, b1);
  ctx.lineTo(px + 5, b1);
  ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
}
const CUTTER_BOX = [-34, -HOUSE - 24, 90, HOUSE + 30];
function drawCutter(ctx, t) {
  const [px, py] = cutterTip(t);
  const a = sseg(t, 1.6, 1.8) - sseg(t, 4.1, 4.5);
  const hTop = py - HOUSE;
  carriage(ctx, px, hTop, a);
  blit2(ctx, 'sp-cutter', CUTTER_BOX, drawCutterAt, a, px, py);
  // flutes run down the bit while it spins
  if (!LOD.card && t >= 2.15 && t < 3.7) {
    const b0 = hTop + 138, b1 = py - 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - 5, b0, 10, b1 - b0);
    ctx.clip();
    ctx.strokeStyle = '#0a110c';
    ctx.lineWidth = 2;
    const ph = (t * 260) % 9;
    ctx.beginPath();
    for (let y = b0 - 12 + ph; y < b1 + 10; y += 9) { ctx.moveTo(px - 6, y); ctx.lineTo(px + 6, y + 6); }
    ctx.stroke();
    ctx.restore();
  }
}

// Chips thrown from the bit while it cuts: one small seeded puff per 45 ms of cutting.
function chips(ctx, t) {
  for (const [a, b, seed] of [[T_SPEC[0], T_SPEC[1], 0x51], [T_CUT[0], T_CUT[1], 0xc7]]) {
    if (t < a || t > b + 0.5) continue;
    for (let k = 0, te = a; te < b; k++, te = a + k * 0.045) {
      const tau = t - te;
      if (tau <= 0 || tau >= 0.45) continue;
      const [x, y] = cutterTip(te);
      dust(ctx, x - 4, y, tau, seed * 97 + k, { ang: Math.PI * 0.86, spread: 1.3, n: 5, dur: 0.45 });
    }
  }
}

// The light-gap check: a backlight behind the bench shines while the piece rests against a
// casting. Drawn before the castings and the piece, so both occlude it: light reaches the eye only
// through the gaps where the two profiles do not meet.
function gapLight(ctx, d, a) {
  if (a <= 0) return;
  const y0 = d.top + 14;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createLinearGradient(0, y0, 0, FLOOR);
  gr.addColorStop(0, rgba(P.paper, 0.55 * a));
  gr.addColorStop(0.25, rgba(P.paper, 0.9 * a));
  gr.addColorStop(1, rgba(P.paper, 0.95 * a));
  ctx.fillStyle = gr;
  ctx.fillRect(d.face - 10, y0, 130, FLOOR - 1 - y0);
  ctx.restore();
}
// Amber rules along both edges of every gap where the piece does not meet a wrong casting.
function gapEdges(ctx, d, prof, P, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.strokeStyle = P_AMBER;
  ctx.lineWidth = lw(3.2);
  ctx.lineCap = 'round';
  for (const side of [0, 1]) {
    ctx.beginPath();
    let on = false;
    for (let y = d.top + 2; y <= BOT - 2; y += 2) {
      const xa = d.face + prof(y), xb = P + E(y);
      if (xb - xa > 4) {
        const x = side ? xb - 1 : xa + 1;
        on ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        on = true;
      } else on = false;
    }
    ctx.stroke();
  }
  ctx.restore();
}
const P_AMBER = P.amber;
const lightOn = (t, a, b) => sseg(t, a + 0.03, a + 0.12) - sseg(t, b - 0.1, b - 0.02);

// ---------------------------------------------------------------------------------------------
// Static layers.

function speckle(ctx, pts, seed, x0, y0, x1, y1, n, a) {
  if (LOD.card) return;
  const r = rng(seed);
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()), s = 0.8 + r() * 1.6;
    ctx.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(160,200,170,${a * 0.6})`;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function castingPts(left, face, prof, top) {
  const pts = [...left];
  for (let y = top; y <= BOT; y += 2) pts.push([face + prof(y), y]);
  pts.push([face + prof(BOT), BOT]);
  return pts;
}
const arcPts = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, k) => { const a = lerp(a0, a1, k / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

function subject(ctx) {
  // a cast bracket: rounded heel, a domed boss, a filleted shoulder down to the profiled face
  const left = [
    [250, BOT], [250, 640],
    ...arcPts(292, 640, 42, Math.PI, Math.PI * 1.5, 8),
    [330, 598],
    ...arcPts(418, 588, 84, Math.PI * 1.03, Math.PI * 1.9, 24),
    [SUB_FACE, 560],
  ];
  const pts = castingPts(left, SUB_FACE, (y) => f(y), 560);
  contactShadow(ctx, 430, FLOOR - 4, 230, 22, 0.6);
  prism(ctx, pts, 64, CAST, { sil: 3.5 });
  speckle(ctx, pts, 0x5ab, 250, 500, 640, BOT, 900, 0.22);
  // parting line following the dome, a curved rib, a cored boss: a specific object, not a block
  ctx.save();
  ctx.strokeStyle = 'rgba(140,180,150,0.3)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(252, 682);
  ctx.bezierCurveTo(360, 690, 470, 660, SUB_FACE + f(650) - 3, 650);
  ctx.stroke();
  ctx.restore();
  const rib = [];
  for (let k = 0; k <= 12; k++) { const u = k / 12; rib.push([lerp(300, 470, u), 700 - 40 * Math.sin(Math.PI * u)]); }
  for (let k = 12; k >= 0; k--) { const u = k / 12; rib.push([lerp(300, 470, u), 712 - 40 * Math.sin(Math.PI * u)]); }
  prism(ctx, rib, 10, CAST, { sil: 2 });
  const bossPts = arcPts(320, 730, 26, 0, Math.PI * 2, 20).slice(0, 20);
  prism(ctx, bossPts, 12, CAST, { sil: 2.5 });
  hole(ctx, 320, 730, 11, 64, CAST);
  hole(ctx, 418, 560, 13, 64, CAST);
  centreLine(ctx, 418, 488, 418, 600, 0.5);
  centreLine(ctx, 284, 730, 356, 730, 0.45);
}

function otherCasting(ctx, left, d, prof, seed, holeAt) {
  const pts = castingPts(left, d.face, (y) => prof(y) ?? 0, d.top);
  contactShadow(ctx, (d.x0 + d.face) / 2 + 30, FLOOR - 4, 120, 16, 0.5);
  prism(ctx, pts, 22, CAST_DIM, { sil: 3 });
  speckle(ctx, pts, seed, d.x0, d.top, d.face + 50, BOT, 380, 0.2);
  hole(ctx, holeAt[0], holeAt[1], 11, 22, CAST_DIM);
}

function backLayer(ctx) {
  benchFinal(ctx, 760, 600);
  // gantry: posts at the frame edges and one beam the two tools ride on
  prism(ctx, rect(4, BEAM_Y1, 20, BOT - BEAM_Y1), 22, MAT.metal, { sil: 3 }); // the right-hand post stands off frame
  prism(ctx, rect(0, BEAM_Y0, W, BEAM_Y1 - BEAM_Y0), 26, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#060807';
  ctx.fillRect(0, BEAM_Y1 - 6, W, 3);
  if (!LOD.card) for (let x = 120; x < W - 60; x += 180) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
}
function castLayer(ctx) {
  subject(ctx);
  otherCasting(ctx, [[D1.x0, BOT], ...arcPts(D1.x0 + 34, D1.top + 34, 34, Math.PI, Math.PI * 1.5, 8)], D1, g1, 0xd1, [1012, 724]);
  otherCasting(ctx, [[D2.x0, BOT], [D2.x0, 700], [D2.x0 + 30, 700], [D2.x0 + 30, D2.top]], D2, g2, 0xd2, [1290, 736]);
  // the station lift's platform, flush in the bench top
  stationPlate(ctx, 0);
  // the subject's height, as on a drawing
  dimension(ctx, 250, 504, 250, BOT, 34, 0.5);
}
const SLOT_PTS = [[BASE0 - 12, FLOOR], [BASE0 + BW + 12, FLOOR], [BASE0 + BW + 12 + D.x * 46, FLOOR + D.y * 46], [BASE0 - 12 + D.x * 46, FLOOR + D.y * 46]];
function stationPlate(ctx, off) {
  ctx.save();
  poly(ctx, SLOT_PTS.map(([x, y]) => [x, y + off]));
  ctx.fillStyle = '#26322a';
  ctx.fill();
  ctx.strokeStyle = '#4f6f57';
  ctx.lineWidth = lw(1.5);
  ctx.stroke();
  ctx.restore();
}


// ---------------------------------------------------------------------------------------------

export default {
  id: 'showpiece',
  name: '/showpiece',
  caption: 'Push an artifact past what people expect from its kind',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'showpiece-back', backLayer);

    // The light-gap check: the backlight behind each wrong casting, under the castings and the piece.
    const l1 = lightOn(t, ...REST_AT[0]), l2 = lightOn(t, ...REST_AT[1]);
    gapLight(ctx, D1, l1);
    gapLight(ctx, D2, l2);
    cached(ctx, 'showpiece-cast', castLayer);

    // The station lift at the seam: the slot opens, a new plain blank rises on the platform.
    const lo = liftOffset(t);
    if (lo > 0) {
      ctx.save();
      poly(ctx, SLOT_PTS);
      ctx.fillStyle = '#030504';
      ctx.fill();
      ctx.clip();
      stationPlate(ctx, lo);
      ctx.restore();
      if (t >= LIFT_RISE[0]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, FLOOR);
        ctx.clip();
        blit(ctx, sprite(ctx, 'sp-piece-plain', PIECE_BOX, (c) => pieceVec(c, BASE0, 0, EDGES.plain)), 0, lo);
        ctx.restore();
      }
    }

    // The scrap slot opens for the test specimen.
    const sd = sseg(t, SPEC.drop - 0.04, SPEC.drop + 0.02) - sseg(t, SPEC.drop + 0.3, SPEC.drop + 0.36);
    if (sd > 0) {
      ctx.fillStyle = '#030504';
      poly(ctx, [[SCRAP_X - 38, FLOOR - 2], [SCRAP_X + 38, FLOOR - 2], [SCRAP_X + 38 + D.x * 44 * sd, FLOOR - 2 + D.y * 44 * sd], [SCRAP_X - 38 + D.x * 44 * sd, FLOOR - 2 + D.y * 44 * sd]]);
      ctx.fill();
    }

    // The work.
    const pose = piecePose(t);
    if (pose) {
      const lift = -pose.dy;
      contactShadow(ctx, pose.x + BW / 2 + 16, FLOOR - 4, 110, 14, 0.5 * clamp01(1 - lift / 160));
      piece(ctx, t, pose.x, pose.dy);
    }
    if (lo === 0 && t >= LIFT_RISE[0]) {
      contactShadow(ctx, BASE0 + BW / 2 + 16, FLOOR - 4, 110, 14, 0.5);
      blit(ctx, sprite(ctx, 'sp-piece-plain', PIECE_BOX, (c) => pieceVec(c, BASE0, 0, EDGES.plain)), 0, 0);
    }
    drawScribe(ctx, t);

    // The specimen: carried by the cutter to the subject's lobe, test-fitted, dropped in the scrap slot.
    const sp = specimenAt(t);
    if (sp) {
      ctx.save();
      if (sp.falling) {
        ctx.beginPath();
        ctx.rect(0, 0, W, FLOOR);
        ctx.clip();
      }
      drawSpecimen(ctx, sp.x, sp.y);
      ctx.restore();
    }

    chips(ctx, t);
    drawGauge(ctx, t);
    drawCutter(ctx, t);

    // the lamp follows the work through the light-gap check and comes back to the station
    const lw8 = sseg(t, 3.95, 4.4) - sseg(t, 6.3, 6.7);
    const lpx = pose && t >= 3.95 && t < 6.7 ? pose.x + 80 : 760;
    lampFalloff(ctx, lerp(760, lpx, lw8), 600, 380, 1180, 0.6);

    // Light: the gauge's first contact, the bit while it cuts, the specimen's fit on its subject,
    // light through the gaps at each wrong casting (amber-edged, no join glow), the flush join.
    contactGlow(ctx, SUB_FACE + f(PIN_Y[3]), PIN_Y[3], (t - 0.62) / 0.12);
    if (cutting(t)) {
      const [x, y] = cutterTip(t);
      softGlow(ctx, x, y, 34, P.bright, 0.5);
      ctx.save();
      ctx.fillStyle = 'rgba(240,255,244,0.9)';
      ctx.beginPath();
      ctx.arc(x, y, 4 * LOD.k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    contactGlow(ctx, SUB_FACE + g(SPEC_H / 2), CUT0 + SPEC_H / 2, (t - SPEC.fit) / 0.12);
    for (const [k, l] of [[0, l1], [1, l2]]) {
      if (l <= 0) continue;
      for (const b of BLOOMS[k]) {
        softGlow(ctx, b.x, b.y, 24 + 0.6 * b.w, P.paper, 0.24 * l);
        softGlow(ctx, b.x, b.y, 150, P.paper, 0.07 * l);
      }
    }
    gapEdges(ctx, D1, g1, P1, l1);
    gapEdges(ctx, D2, g2, P2, l2);
    const ja = 0.9 * sseg(t, FLUSH, FLUSH + 0.05) * (1 - sseg(t, FLUSH + 0.06, FLUSH + 0.14));
    if (ja > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = ja;
      ctx.strokeStyle = P.bright;
      ctx.lineWidth = lw(5);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(SUB_FACE, CUT0 - 8);
      for (let y = CUT0; y <= BOT; y += 2) ctx.lineTo(SUB_FACE + f(y), y);
      ctx.stroke();
      ctx.restore();
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
