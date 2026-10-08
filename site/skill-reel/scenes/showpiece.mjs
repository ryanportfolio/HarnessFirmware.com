// /showpiece at final fidelity (pitch A 3.9, mechanism and order of scenes/showpiece.js).
// A contour gauge, the session's own tool, copies the profile of the real subject casting and lays
// it on a plain blank. A cutter first takes a small specimen from the blank's corner and test-fits
// it on the subject's most specific feature; then it cuts the whole edge, past the cautious scribe
// line, to the full profile. The piece is tried against two dim other castings and leaves gaps on
// both; it mates flush with its own subject. Hold. Seam: the piece lifts out right, the gauge pins
// spring flat, a new plain blank arrives. No list, no score, no reviewer.
// Both tools hang from one overhead gantry and park at its ends, so the work can travel under them.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

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
// The subject's face: depth to the right of SUB_FACE by y (a chamfer, a bump, a deep lug, a nick).
const PROF = [[570, 0], [586, 30], [604, 40], [620, 6], [632, 6], [640, 48], [676, 48], [686, 16], [700, 24], [714, 0], [726, 0]];
function f(y) {
  if (y >= FOOT_Y) return FOOT;
  if (y <= PROF[0][0]) return 0;
  for (let k = 1; k < PROF.length; k++) {
    const [y1, v1] = PROF[k];
    if (y <= y1) {
      const [y0, v0] = PROF[k - 1];
      return lerp(v0, v1, (y - y0) / (y1 - y0));
    }
  }
  return 0;
}
const g = (ly) => f(CUT0 + ly); // the specimen's edge: the bump, the most specific part

// The two other castings: shorter, so the work can be carried over them.
const D1 = { x0: 1050, face: 1190, top: 610 };
const D2 = { x0: 1440, face: 1570, top: 622 };
const g1 = (y) => (y < D1.top ? null : 46 * Math.sin((Math.PI * (y - D1.top)) / (BOT - D1.top)));
const g2 = (y) => (y < D2.top ? null : y >= 740 ? 30 : 24 * Math.abs((((y - D2.top) / 40) % 1) * 2 - 1));
const E = (y) => f(y); // the finished edge (the toe rows are the notch, FOOT deep)
function touch(face, prof) {
  let m = -Infinity;
  for (let y = BTOP; y <= BOT; y += 1) { const v = prof(y); if (v !== null) m = Math.max(m, v - E(y)); }
  return face + m;
}
const P1 = touch(D1.face, g1), P2 = touch(D2.face, g2);

// Gantry and tools.
const BEAM_Y0 = 232, BEAM_Y1 = 254, CAR_Y = 276;
const PINS = 8, PIN0 = 588, PIN_STEP = 23, PIN_LEN = 150;
const PIN_Y = Array.from({ length: PINS }, (_, i) => PIN0 + PIN_STEP * i);
const GB_X = 108, GB_W = 34, GB_TOP = PIN0 - 16, GB_BOT = PIN_Y[PINS - 1] + 16; // gauge body
const G_PARK = { X: 40, dy: -282 };
const C_PARK = 1850, C_HOVER = 466, HOUSE = 176; // cutter: park x, tip y when raised, tip to housing top
const LIFT = 190;

// ---------------------------------------------------------------------------------------------
// Materials.

const CAST = { front: ['#26332a', '#161e19'], top: '#3a4d40', side: '#0f1512', sil: '#55775e', hi: '#8fb398', line: '#2e3d33' };
const CAST_DIM = { front: ['#18201b', '#111713'], top: '#26322a', side: '#0b0f0c', sil: '#2f4536', hi: '#3f5a46', line: '#1d2820' };
const PIN_MAT = { front: ['#3f7d52', '#1d3b28'], top: '#a4f5ba', side: '#10241a', sil: null };
const PIN_IDLE = { front: ['#2a4f37', '#14261b'], top: '#5d9a70', side: '#0b1610', sil: null };
const BIT_MAT = { front: ['#33463a', '#1a241e'], top: '#7f9b86', side: '#0d120f', sil: null };

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

// Timeline (s). Gauge 0 to 2.4; specimen 2.15 to 3.15; full cut 3.0 to 4.3; swap 4.4 to 6.4;
// hold 6.4 to 7.9; seam 7.9 to 9.0.
const T_SPEC = [2.3, 2.5], T_CUT = [3.15, 4.2];

function cutterTip(t) {
  const hover = [BASE0 + FOOT, C_HOVER];
  if (t < 1.75) return [C_PARK, C_HOVER];
  if (t < 2.15) return [lerp(C_PARK, hover[0], sseg(t, 1.75, 2.15)), C_HOVER];
  if (t < T_SPEC[0]) return lerpPt(hover, SPEC_PATH[0], easeInOut(seg(t, 2.15, T_SPEC[0])));
  if (t < T_SPEC[1]) return along(SPEC_PATH, sseg(t, T_SPEC[0], T_SPEC[1]));
  const specEnd = SPEC_PATH[SPEC_PATH.length - 1];
  if (t < 2.64) return lerpPt(specEnd, [specEnd[0], C_HOVER], easeIn(seg(t, T_SPEC[1], 2.64)));
  const top = CUT_PATH[0];
  if (t < 3.0) return [specEnd[0], C_HOVER];
  if (t < T_CUT[0]) return lerpPt([specEnd[0], C_HOVER], top, easeInOut(seg(t, 3.0, T_CUT[0])));
  if (t < T_CUT[1]) return along(CUT_PATH, sseg(t, T_CUT[0], T_CUT[1]));
  const end = CUT_PATH[CUT_PATH.length - 1];
  if (t < 4.32) return lerpPt(end, [end[0], C_HOVER], easeIn(seg(t, T_CUT[1], 4.32)));
  return [lerp(end[0], C_PARK, sseg(t, 4.3, 4.85)), C_HOVER];
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

// One carried move of the work: back off, lift, travel, lower, slide in to touch.
function hop(t, t0, t1, xa, xb, app, back) {
  const u = seg(t, t0, t1);
  const bk = back * sm(clamp01(u / 0.12));
  const up = sm(clamp01((u - 0.08) / 0.24)) - sm(clamp01((u - 0.6) / 0.24));
  const tr = sm(clamp01((u - 0.16) / 0.6));
  const sl = sm(clamp01((u - 0.86) / 0.14));
  return { x: lerp(xa + bk, xb + app, tr) - app * sl, dy: -LIFT * up };
}

function piecePose(t) {
  if (t < 4.4) return { x: BASE0, dy: 0 };
  if (t < 4.85) return hop(t, 4.4, 4.85, BASE0, P1, 60, 0);
  if (t < 5.12) return { x: P1, dy: 0 };
  if (t < 5.5) return hop(t, 5.12, 5.5, P1, P2, 60, 50);
  if (t < 5.8) return { x: P2, dy: 0 };
  if (t < 6.4) return hop(t, 5.8, 6.4, P2, SUB_FACE, 60, 50);
  if (t < 7.9) return { x: SUB_FACE, dy: 0 };
  if (t < 8.55) {
    // seam: slide off the subject, lift clear of the castings, feed out right, fade at the end
    const fo = easeIn(seg(t, 8.35, 8.55));
    return {
      x: SUB_FACE + 70 * sseg(t, 7.9, 8.02) + 1000 * easeIn(seg(t, 7.98, 8.55)),
      dy: -200 * easeInOut(seg(t, 7.98, 8.16)),
      alpha: 1 - fo,
      s: lerp(1, 0.9, fo),
    };
  }
  return null;
}

function gaugePose(t) {
  const fi = PIN_Y.map(f);
  if (t < 0.5) {
    return {
      X: lerp(G_PARK.X, 630, sseg(t, 0, 0.38)),
      dy: lerp(G_PARK.dy, 0, sseg(t, 0.28, 0.5)),
      p: fi.map(() => 0),
    };
  }
  if (t < 0.62) {
    const X = lerp(630, SUB_FACE, easeInOut(seg(t, 0.5, 0.62)));
    return { X, dy: 0, p: fi.map((v) => Math.max(0, SUB_FACE + v - X)) };
  }
  if (t < 1.0) {
    // index ripple top to bottom: each pin seats with a small click
    return { X: SUB_FACE, dy: 0, p: fi.map((v, i) => { const u = seg(t, 0.62 + 0.033 * i, 0.75 + 0.033 * i); return v + 5 * (u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0); }) };
  }
  if (t < 1.18) return { X: lerp(SUB_FACE, 610, easeIn(seg(t, 1.0, 1.18))), dy: 0, p: fi };
  if (t < 1.72) return { X: lerp(610, BASE0, easeInOut(seg(t, 1.18, 1.45))), dy: 0, p: fi };
  if (t < 1.92) return { X: BASE0, dy: lerp(0, G_PARK.dy, sseg(t, 1.72, 1.92)), p: fi };
  if (t < 7.9) return { X: lerp(BASE0, G_PARK.X, sseg(t, 1.92, 2.4)), dy: G_PARK.dy, p: fi };
  // seam: pins spring back flat, one after another
  return { X: G_PARK.X, dy: G_PARK.dy, p: fi.map((v, i) => v * (1 - indexHome(seg(t, 7.9 + 0.035 * i, 8.06 + 0.035 * i)))) };
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
  // exact points at the steps (the notch and the cut front) so the edge has square shoulders
  const steps = [FOOT_Y];
  for (const s of steps) { ys.push(s + 0.01, s - 0.01); }
  ys.sort((a, b) => b - a);
  for (const y of ys) pts.push([x + e(y), top + (y - BTOP)]);
  return pts;
}

function drawPiece(ctx, x, dy, e, o = {}) {
  const { alpha = 1, s = 1, cy = null } = o;
  if (alpha <= 0) return;
  const top = BTOP + dy;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (s !== 1) {
    const cx = x + BW / 2, cyy = top + BH / 2;
    ctx.translate(cx, cyy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cyy);
  }
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

function carriage(ctx, cx, toolTop, SM) {
  prism(ctx, rect(cx - 30, BEAM_Y1, 60, CAR_Y - BEAM_Y1), 36, SM, { hatch: true, sil: 3 });
  if (!LOD.card) for (const k of [-17, 17]) ball(ctx, cx + k, BEAM_Y1 + 11, 4.5, SM);
  const sleeveEnd = Math.min(CAR_Y + 54, toolTop);
  if (toolTop > CAR_Y) {
    rodV(ctx, cx, CAR_Y - 2, toolTop + 2, 9, SM);
    rodV(ctx, cx, CAR_Y - 2, sleeveEnd, 17, SM);
  }
}

// The contour gauge: a comb of sliding pins held in a hatched body (the session's own tool).
function drawGauge(ctx, t) {
  const { X, dy, p } = gaugePose(t);
  const a = sseg(t, 0, 0.2) - sseg(t, 2.2, 2.6);
  const SM = activeMat(MAT.session, a);
  const PM = a > 0.5 ? PIN_MAT : PIN_IDLE;
  const bx = X + GB_X, top = GB_TOP + dy, bot = GB_BOT + dy;
  carriage(ctx, bx + GB_W / 2, top - 14, SM);
  // pins: drawn first so they run through the body
  const ph = LOD.card ? 9 : 7;
  for (let i = 0; i < PINS; i++) {
    const y = PIN_Y[i] + dy, x0 = X + p[i];
    rodH(ctx, x0 + 3, x0 + PIN_LEN, y, ph, PM, false);
    ctx.save();
    ctx.fillStyle = mix('#10241a', PM.top, 0.75);
    ctx.beginPath();
    ctx.arc(x0 + 4, y, ph / 2 + 0.6, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.fill();
    ctx.restore();
  }
  // clamp head on top of the body, then the body with its slot cover
  prism(ctx, rect(bx - 6, top - 14, GB_W + 12, 16), 30, SM, { sil: 3 });
  prism(ctx, rect(bx, top, GB_W, bot - top), 26, SM, { hatch: true, sil: 3.5, hatchGap: 11 });
  if (!LOD.card) {
    ctx.save();
    ctx.fillStyle = '#07100a';
    ctx.fillRect(bx + GB_W / 2 - 2, top + 8, 4, bot - top - 16);
    ctx.restore();
  }
  ball(ctx, bx + GB_W / 2, top + 4 - 10, 6.5, SM);
  ball(ctx, bx + GB_W / 2, bot - 9, 5.5, SM);
  // a contact shadow on the bench while the gauge works low
  if (dy > -60) contactShadow(ctx, X + 90, FLOOR - 4, 110, 10, 0.35 * clamp01(1 + dy / 60));
}

// The cutter: a hatched spindle on the second carriage, a fluted bit pointing down.
function drawCutter(ctx, t) {
  const [px, py] = cutterTip(t);
  const a = sseg(t, 1.6, 1.8) - sseg(t, 4.6, 5.0);
  const SM = activeMat(MAT.session, a);
  const hTop = py - HOUSE;
  carriage(ctx, px, hTop, SM);
  prism(ctx, rect(px - 27, hTop, 54, 104), 40, SM, { hatch: true, sil: 3.5 });
  if (!LOD.card) {
    ctx.save();
    ctx.strokeStyle = '#06100a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = hTop + 16; y < hTop + 50; y += 8) { ctx.moveTo(px - 20, y); ctx.lineTo(px + 20, y); }
    ctx.stroke();
    ctx.restore();
  }
  rodV(ctx, px, hTop + 104, hTop + 124, 30, SM);
  rodV(ctx, px, hTop + 124, hTop + 138, 17, MAT.lit);
  // bit: fluted, the flutes run down while it spins
  const b0 = hTop + 138, b1 = py - 8;
  rodV(ctx, px, b0, b1, 10, BIT_MAT, false);
  const spin = t >= 2.15 && t < 4.4;
  if (!LOD.card) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(px - 5, b0, 10, b1 - b0);
    ctx.clip();
    ctx.strokeStyle = '#0a110c';
    ctx.lineWidth = 2;
    const ph = spin ? (t * 260) % 9 : 0;
    ctx.beginPath();
    for (let y = b0 - 12 + ph; y < b1 + 10; y += 9) { ctx.moveTo(px - 6, y); ctx.lineTo(px + 6, y + 6); }
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = '#5f7f68';
  ctx.beginPath();
  ctx.moveTo(px - 5, b1);
  ctx.lineTo(px + 5, b1);
  ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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

// Light through the gaps where the piece does not fit a casting (a machinist's light-gap check).
function lightGap(ctx, px, d, prof, a) {
  if (a <= 0) return;
  const L = [], R = [];
  for (let y = d.top; y <= BOT; y += 2) {
    L.push([d.face + prof(y), y]);
    R.push([px + E(y), y]);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath();
  L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  const gr = ctx.createLinearGradient(d.face - 20, 0, d.face + 70, 0);
  gr.addColorStop(0, rgba(P.paper, 0.1 * a));
  gr.addColorStop(1, rgba(P.paper, 0.42 * a));
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.restore();
}

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

function subject(ctx) {
  const left = [[250, BOT], [250, 606], [284, 572], [376, 572], [384, 528], [398, 514], [454, 514], [468, 528], [476, 560], [SUB_FACE, 560]];
  const pts = castingPts(left, SUB_FACE, (y) => f(y), 560);
  contactShadow(ctx, 430, FLOOR - 4, 230, 22, 0.6);
  prism(ctx, pts, 64, CAST, { sil: 3.5 });
  speckle(ctx, pts, 0x5ab, 250, 514, 640, BOT, 900, 0.22);
  // parting line, a rib and a cored boss: a specific object, not a block
  ctx.save();
  ctx.strokeStyle = 'rgba(120,160,130,0.28)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(252, 652);
  ctx.lineTo(SUB_FACE + f(652) - 2, 652);
  ctx.stroke();
  ctx.restore();
  prism(ctx, [[292, 610], [306, 600], [470, 700], [470, 716]], 10, CAST, { sil: 2 });
  const bossPts = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; bossPts.push([330 + Math.cos(a) * 30, 708 + Math.sin(a) * 30]); }
  prism(ctx, bossPts, 12, CAST, { sil: 2.5 });
  hole(ctx, 330, 708, 12, 64, CAST);
  hole(ctx, 426, 544, 12, 64, CAST);
  centreLine(ctx, 426, 500, 426, 590, 0.5);
  centreLine(ctx, 290, 708, 370, 708, 0.45);
}

function otherCasting(ctx, left, d, prof, seed, holeAt) {
  const pts = castingPts(left, d.face, (y) => prof(y) ?? 0, d.top);
  contactShadow(ctx, (d.x0 + d.face) / 2 + 30, FLOOR - 4, 120, 16, 0.5);
  prism(ctx, pts, 60, CAST_DIM, { sil: 3 });
  speckle(ctx, pts, seed, d.x0, d.top, d.face + 50, BOT, 380, 0.2);
  hole(ctx, holeAt[0], holeAt[1], 11, 60, CAST_DIM);
}

function backLayer(ctx) {
  benchFinal(ctx, 760, 600);
  // gantry: posts at the frame edges and one beam the two tools ride on
  for (const x of [14, W - 14]) prism(ctx, rect(x - 10, BEAM_Y1, 20, BOT - BEAM_Y1), 22, MAT.metal, { sil: 3 });
  prism(ctx, rect(0, BEAM_Y0, W, BEAM_Y1 - BEAM_Y0), 26, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#060807';
  ctx.fillRect(0, BEAM_Y1 - 6, W, 3);
  if (!LOD.card) for (let x = 120; x < W - 60; x += 180) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  subject(ctx);
  otherCasting(ctx, [[D1.x0, BOT], [D1.x0, D1.top + 34], [D1.x0 + 34, D1.top]], D1, g1, 0xd1, [1110, 700]);
  otherCasting(ctx, [[D2.x0, BOT], [D2.x0, 664], [D2.x0 + 46, 664], [D2.x0 + 46, D2.top]], D2, g2, 0xd2, [1500, 716]);
  // the subject's height, as on a drawing
  dimension(ctx, 250, 514, 250, BOT, 34, 0.5);
}

function frontLayer(ctx) {
  lampFalloff(ctx, 760, 600, 380, 1180, 0.6);
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

    // The work.
    const pose = piecePose(t);
    if (pose) {
      const lift = -pose.dy;
      contactShadow(ctx, pose.x + BW / 2 + 16, FLOOR - 4, 110, 14, 0.5 * (pose.alpha ?? 1) * clamp01(1 - lift / 160));
      drawPiece(ctx, pose.x, pose.dy, edgeAt(t), { alpha: pose.alpha ?? 1, s: pose.s ?? 1, cy: t >= T_CUT[0] && t < T_CUT[1] ? cutY(t) : null });
    }
    if (t >= 8.45) {
      const u = easeOut(seg(t, 8.45, 9.0));
      contactShadow(ctx, BASE0 + BW / 2 + 16, FLOOR - 4, 110, 14, 0.5 * u);
      drawPiece(ctx, BASE0, 0, () => 0, { alpha: u, s: lerp(0.9, 1, u) });
    }
    drawScribe(ctx, t);

    // The specimen: cut free, carried to the subject's bump, mates, then cleared.
    let specAt = null;
    if (t >= T_SPEC[1] && t < 3.15) {
      const a = [BASE0, FOOT_Y], b = [SUB_FACE + 40, CUT0], c = [SUB_FACE, CUT0];
      let pt;
      if (t < 2.54) pt = a;
      else if (t < 2.76) pt = lerpPt(a, b, sseg(t, 2.54, 2.76));
      else pt = lerpPt(b, c, easeOut(seg(t, 2.76, 2.86)));
      const fo = easeIn(seg(t, 3.0, 3.15));
      drawSpecimen(ctx, pt[0], pt[1], 1 - fo, lerp(1, 0.9, fo));
      specAt = pt;
    }

    // the gaps light up while the piece rests against a casting that is not its subject
    lightGap(ctx, P1, D1, g1, sseg(t, 4.78, 4.9) - sseg(t, 5.1, 5.18));
    lightGap(ctx, P2, D2, g2, sseg(t, 5.43, 5.55) - sseg(t, 5.78, 5.86));
    chips(ctx, t);
    drawGauge(ctx, t);
    drawCutter(ctx, t);

    cached(ctx, 'showpiece-front', frontLayer);

    // Light: the gauge's first contact, the bit while it cuts, the specimen's mate, the flush join.
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
    if (specAt) contactGlow(ctx, SUB_FACE + g(SPEC_H / 2), CUT0 + SPEC_H / 2, (t - 2.86) / 0.12);
    const ju = (t - 6.4) / 0.14;
    if (ju > 0 && ju < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.sin(ju * Math.PI) * 0.9;
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
