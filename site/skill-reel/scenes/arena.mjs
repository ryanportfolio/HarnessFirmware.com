// /arena at final fidelity (pitch A 3.8, same beats and timing as the animatic arena.js).
// Sealed booths, a badge grinder and a blind pegboard. One brief is copied into three lit booths;
// a fourth booth stands dim and empty, so the count reads as "some", not "three". Shutters close
// and a fresh builder works in each booth; three pieces come out with their own edge profile and
// angle mark. A collar grinds each mark off and punches a neutral letter (A, B, C: the only drawn
// words). A screen drops; a fresh judge behind it fills a pegboard with green pass and amber fail
// pegs and points to B. The screen lifts. The session's hatched parent touches A, B and C, keeps B,
// and inlays one small section from A and one from C into B's edge, each re-cut to B's hatching
// and set flush. Hold. Seam: B leaves right, A and C drop to scratch, shutters open, a brief arrives.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, lightShaft, activeMat,
} from '../kit.mjs';

const T = 10.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const BX = [330, 545, 760, 975]; // booth centres; the fourth stands empty and dim
const B_TOP = 292, B_BOT = 590, B_HALF = 98, B_DEP = 64;
const REC = { top: B_TOP + 16, bot: B_BOT - 14, half: B_HALF - 14 }; // booth recess
const PW = 100, PH = 150, P_TOP = FLOOR - PH, P_DEP = 12;
const IN_TOP = 404; // piece top while inside a booth
const COLLAR = 1165, SCREEN_X = 1282;
const SLOT = [1405, 1560, 1715]; // tray positions; booth i ends up in SLOT[i]
const LETTER = ['A', 'B', 'C'];
const HATCH = [Math.PI / 4, -Math.PI / 4, Math.PI / 2]; // each candidate's cut-face hatching
const ENTRY = 110;
const BEAM = { x: 1232, y: 230, w: 650, h: 18 };
const LETTER_FONT = '400 64px "Departure Mono", "Departure Mono fallback", monospace';
// Feed through the collar per booth: [leave bench spot, enter collar, leave collar, reach tray]
const FEEDT = [[2.75, 3.3, 3.45, 3.6], [2.55, 2.95, 3.1, 3.35], [2.4, 2.6, 2.75, 3.0]];
const PEGS = [[1, 0, 1], [1, 1, 1], [0, 1, 0]]; // [piece][criterion]: 1 pass (green), 0 fail (amber)
const BOARD = { x: 1326, y: 300, w: 474, h: 252 };
const ROWS = [362, 424, 486];
const PIVOT = { x: SLOT[1], y: 532 };
const STRIP = 30; // width of the hatched cut face along a piece's left edge
const CH_H = 38;
const INLAYS = [
  { from: 0, rel: 48, cut: 6.66, set: 7.0 },
  { from: 2, rel: 96, cut: 7.3, set: 7.63 },
];
const BOOM_Y = 540, HOV = 574, REST = { x: 1862, y: 574 };

// ---------------------------------------------------------------------------------------------
// Pieces.

function edge(i, s) {
  if (i === 0) return s < 0.5 ? 0 : 16; // step
  if (i === 1) return 8 + 8 * Math.sin(s * Math.PI * 4); // wave
  const f = (s * 4) % 1;
  return 16 * Math.abs(f * 2 - 1); // zigzag
}
const band = (n) => [n.rel / PH, (n.rel + CH_H) / PH];

// Left-edge offset of piece i at height fraction s, with notches cut and inlays set.
function edgeX(i, s, st) {
  for (const n of INLAYS) {
    const [a, b] = band(n);
    if (s < a || s > b) continue;
    if (i === n.from && st.cut[n.from]) return STRIP;
    if (i === 1 && st.set[n.from]) return edge(n.from, s);
  }
  return edge(i, s);
}

function piecePts(i, left, top, st) {
  const cut = 22;
  const ss = [];
  for (let k = 0; k <= 60; k++) ss.push(k / 60);
  for (const n of INLAYS) { const [a, b] = band(n); ss.push(a - 1e-4, a + 1e-4, b - 1e-4, b + 1e-4); }
  ss.sort((a, b) => b - a);
  const pts = [[left + PW - cut, top], [left + PW, top + cut], [left + PW, top + PH]];
  for (const s of ss) pts.push([left + edgeX(i, s, st), top + PH * s]);
  return pts;
}

function hatchIn(ctx, x, y, w, h, ang, color, gap = 11, width = 2.2) {
  const cx = x + w / 2, cy = y + h / 2, r = Math.hypot(w, h);
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const g = gap * (LOD.card ? 1.4 : 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw(width);
  ctx.beginPath();
  for (let d = -r; d <= r; d += g) {
    ctx.moveTo(cx + nx * d - dx * r, cy + ny * d - dy * r);
    ctx.lineTo(cx + nx * d + dx * r, cy + ny * d + dy * r);
  }
  ctx.stroke();
}

function mark(ctx, i, x, y, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    if (i === 0) { ctx.moveTo(x, y - 19); ctx.lineTo(x + 19, y + 14); ctx.lineTo(x - 19, y + 14); ctx.closePath(); }
    else if (i === 1) ctx.arc(x, y, 17, 0, Math.PI * 2);
    else ctx.rect(x - 15, y - 15, 30, 30);
  };
  // engraved: dark groove with a lit lower lip
  ctx.translate(1.2, 1.6);
  path();
  ctx.strokeStyle = 'rgba(255,255,250,0.8)';
  ctx.lineWidth = lw(4);
  ctx.stroke();
  ctx.translate(-1.2, -1.6);
  path();
  ctx.strokeStyle = '#6d7268';
  ctx.lineWidth = lw(4);
  ctx.stroke();
  ctx.restore();
}

function letter(ctx, i, x, y, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = LETTER_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,250,0.85)';
  ctx.fillText(LETTER[i], x + 1.5, y + 2);
  ctx.fillStyle = '#3a3f37';
  ctx.fillText(LETTER[i], x, y);
  ctx.restore();
}

// A candidate piece: ivory, clipped corner, registration hole, own left-edge profile with a hatched cut face.
// o: { alpha, scale, mark, letter, st }
function piece(ctx, i, cx, top, o = {}) {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  const st = o.st || NO_ST;
  const left = cx - PW / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if ((o.scale ?? 1) !== 1) {
    ctx.translate(cx, top + PH / 2);
    ctx.scale(o.scale, o.scale);
    ctx.translate(-cx, -(top + PH / 2));
  }
  const pts = piecePts(i, left, top, st);
  prism(ctx, pts, P_DEP, MAT.ivory, { sil: 2 });
  // cut face: hatching in the strip along the profile, at this piece's angle (inlays re-cut to B's)
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  ctx.beginPath();
  ctx.rect(left - 2, top, STRIP + 2, PH);
  ctx.clip();
  ctx.fillStyle = 'rgba(150,154,142,0.28)';
  ctx.fillRect(left - 2, top, STRIP + 2, PH);
  hatchIn(ctx, left - 2, top, STRIP + 4, PH, HATCH[i], 'rgba(62,90,69,0.95)');
  ctx.restore();
  // the strip's inner boundary: a fine drawn edge
  if (!LOD.card) {
    ctx.save();
    poly(ctx, pts);
    ctx.clip();
    ctx.strokeStyle = 'rgba(120,124,112,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(left + STRIP, top);
    ctx.lineTo(left + STRIP, top + PH);
    ctx.stroke();
    ctx.restore();
  }
  hole(ctx, left + 60, top + 24, 8.5, P_DEP, MAT.ivory);
  mark(ctx, i, left + 64, top + 92, o.mark ?? 0);
  letter(ctx, i, left + 64, top + 96, o.letter ?? 0);
  ctx.restore();
}
const NO_ST = { cut: [false, false, false], set: [false, false, false] };

// The section carried between pieces: a short strip of the source's profile, hatch turning to B's.
function chunk(ctx, n, x, y, u) {
  const left = x - STRIP / 2, top = y - CH_H / 2;
  const [a] = band(n);
  const pts = [[left + STRIP, top], [left + STRIP, top + CH_H]];
  for (let k = 12; k >= 0; k--) {
    const s = a + (k / 12) * (CH_H / PH);
    pts.push([left + edge(n.from, s), top + (k / 12) * CH_H]);
  }
  prism(ctx, pts, P_DEP, MAT.ivory, { sil: 2 });
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  ctx.fillStyle = 'rgba(150,154,142,0.28)';
  ctx.fillRect(left, top, STRIP, CH_H);
  hatchIn(ctx, left - 2, top, STRIP + 4, CH_H, lerp(HATCH[n.from], HATCH[1], easeInOut(u)), 'rgba(62,90,69,0.95)');
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Timing.

function pieceX(t, i) {
  const [a, b, c, d] = FEEDT[i];
  if (t < a) return BX[i];
  if (t < b) return lerp(BX[i], COLLAR, easeInOut(seg(t, a, b)));
  if (t < c) return COLLAR;
  if (t < d) return lerp(COLLAR, SLOT[i], easeInOut(seg(t, c, d)));
  return SLOT[i];
}

function shutter(t) {
  if (t < 0.6) return 0;
  if (t < 0.9) return easeInOut(seg(t, 0.6, 0.9));
  if (t < 9.6) return 1;
  return 1 - easeInOut(seg(t, 9.6, 9.9));
}

function screenDown(t) {
  return easeInOut(seg(t, 3.6, 3.85)) - easeInOut(seg(t, 5.6, 5.8));
}

// Parent tip keyframes: [t, x, y]. Hover moves between pieces, dips to touch, cut and set.
const cyOf = (n) => P_TOP + n.rel; // the gripper takes the section by its top edge
const xA = SLOT[0] - PW / 2 + STRIP / 2, xB = SLOT[1] - PW / 2 + STRIP / 2, xC = SLOT[2] - PW / 2 + STRIP / 2;
const KEYS = [
  [0, REST.x, REST.y], [5.8, REST.x, REST.y],
  [5.96, SLOT[0], HOV], [6.0, SLOT[0], P_TOP], [6.04, SLOT[0], HOV],
  [6.1, SLOT[1], HOV], [6.14, SLOT[1], P_TOP], [6.18, SLOT[1], HOV],
  [6.24, SLOT[2], HOV], [6.28, SLOT[2], P_TOP], [6.32, SLOT[2], HOV],
  [6.38, SLOT[1], HOV], [6.42, SLOT[1], P_TOP],
  [6.48, SLOT[1], HOV], [6.58, xA, HOV], [6.66, xA, cyOf(INLAYS[0])], [6.72, xA, cyOf(INLAYS[0])],
  [6.8, xA, HOV], [6.92, xB, HOV], [7.0, xB, cyOf(INLAYS[0])], [7.05, xB, cyOf(INLAYS[0])],
  [7.12, xB, HOV], [7.22, xC, HOV], [7.3, xC, cyOf(INLAYS[1])], [7.35, xC, cyOf(INLAYS[1])],
  [7.43, xC, HOV], [7.55, xB, HOV], [7.63, xB, cyOf(INLAYS[1])], [7.68, xB, cyOf(INLAYS[1])],
  [7.75, xB, HOV], [7.82, SLOT[1], HOV], [7.88, SLOT[1], P_TOP],
  [9.4, SLOT[1], P_TOP], [9.5, SLOT[1], HOV], [9.85, REST.x, REST.y], [T, REST.x, REST.y],
];
function parentTip(t) {
  for (let k = 0; k < KEYS.length - 1; k++) {
    const [t0, x0, y0] = KEYS[k], [t1, x1, y1] = KEYS[k + 1];
    if (t >= t0 && t < t1) { const u = easeInOut((t - t0) / (t1 - t0)); return { x: lerp(x0, x1, u), y: lerp(y0, y1, u) }; }
  }
  return { ...REST };
}
const TOUCH = [6.0, 6.14, 6.28, 6.42, 7.88];
const parentActive = (t) => easeInOut(seg(t, 5.6, 5.8)) * (1 - easeInOut(seg(t, 9.5, 9.9)));

function inlayState(t) {
  return {
    cut: [t >= INLAYS[0].cut, false, t >= INLAYS[1].cut],
    set: [t >= INLAYS[0].set, false, t >= INLAYS[1].set],
  };
}

// ---------------------------------------------------------------------------------------------
// Booths.

function boothBody(ctx, i) {
  const x = BX[i], dim = i === 3;
  const M = dim ? MAT.slat : MAT.metal;
  // legs and foot rail
  for (const lx of [x - B_HALF + 10, x + B_HALF - 22]) prism(ctx, rect(lx, B_BOT, 12, FLOOR - B_BOT), 14, M, { sil: 2 });
  // cabinet: top, sides, sill with the delivery slot
  prism(ctx, rect(x - B_HALF, B_TOP, B_HALF * 2, 16), B_DEP, M, { sil: 3 });
  prism(ctx, rect(x - B_HALF, B_TOP + 16, 14, B_BOT - B_TOP - 30), B_DEP, M, { sil: 2.5 });
  prism(ctx, rect(x + B_HALF - 14, B_TOP + 16, 14, B_BOT - B_TOP - 30), B_DEP, M, { sil: 2.5 });
  prism(ctx, rect(x - B_HALF, B_BOT - 14, 40, 14), B_DEP, M, { sil: 2.5 });
  prism(ctx, rect(x + B_HALF - 40, B_BOT - 14, 40, 14), B_DEP, M, { sil: 2.5 });
  // recess: dark back wall, lit from a lamp under the top for the three working booths
  const r = REC;
  ctx.fillStyle = dim ? '#0b0f0c' : '#0d120f';
  ctx.fillRect(x - r.half, r.top, r.half * 2, r.bot - r.top);
  if (!dim) {
    const g = ctx.createRadialGradient(x, r.top + 10, 4, x, r.top + 60, 230);
    g.addColorStop(0, 'rgba(236,240,226,0.20)');
    g.addColorStop(0.5, 'rgba(200,226,206,0.07)');
    g.addColorStop(1, 'rgba(200,226,206,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r.half, r.top, r.half * 2, r.bot - r.top);
    // the lamp: a small hooded tube under the top
    prism(ctx, rect(x - 40, r.top, 80, 8), 20, MAT.lit, { sil: 2 });
    ctx.fillStyle = 'rgba(244,246,236,0.9)';
    ctx.fillRect(x - 32, r.top + 8, 64, 3);
  } else {
    // the empty booth's lamp is off
    prism(ctx, rect(x - 40, r.top, 80, 8), 20, MAT.slat, { sil: 2 });
    const g = ctx.createLinearGradient(0, r.bot - 60, 0, r.bot);
    g.addColorStop(0, 'rgba(2,4,3,0)');
    g.addColorStop(1, 'rgba(2,4,3,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r.half, r.bot - 60, r.half * 2, 60);
  }
  // roll housing for the shutter
  prism(ctx, rect(x - r.half - 2, r.top - 2, r.half * 2 + 4, 10), 10, M, { sil: 2 });
}

// Roller shutter: slats with narrow gaps, anchored to the moving bottom edge; the work shows through the gaps.
function shutterSlats(ctx, i, sh) {
  if (sh <= 0 || i === 3) return;
  const x = BX[i], r = REC;
  const bottom = r.top + 8 + (r.bot - r.top - 8) * sh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - r.half, r.top + 8, r.half * 2, bottom - r.top - 8);
  ctx.clip();
  const SL = 30, GAP = 9;
  for (let y = bottom - SL; y + SL > r.top; y -= SL + GAP) {
    const g = ctx.createLinearGradient(0, y, 0, y + SL);
    g.addColorStop(0, '#2c3a30');
    g.addColorStop(0.4, '#1c251f');
    g.addColorStop(1, '#121814');
    ctx.fillStyle = g;
    ctx.fillRect(x - r.half, y, r.half * 2, SL);
    ctx.fillStyle = '#4f6f57';
    ctx.fillRect(x - r.half, y, r.half * 2, lw(1.6));
  }
  ctx.restore();
  // bottom bar with a pull
  const by = bottom - 12;
  prism(ctx, rect(x - r.half, by, r.half * 2, 12), 6, MAT.lit, { sil: 2 });
}

// Fresh builder inside a booth: clean green press head on a rod from the booth top; three strokes, then gone.
function builder(ctx, t, i) {
  if (t < 0.9 || t >= 2.05) return;
  const x = BX[i];
  let up = 0;
  if (t < 1.1) up = 1 - easeOut(seg(t, 0.9, 1.1));
  else if (t >= 1.9) up = easeIn(seg(t, 1.9, 2.05));
  let press = 0, off = 0;
  if (t >= 1.1 && t < 1.85) {
    const k = Math.min(2, Math.floor((t - 1.1) / 0.25));
    const lt = t - 1.1 - k * 0.25;
    press = Math.sin(Math.PI * clamp01(lt / 0.2));
    off = [-24, 6, 28][(k + i) % 3];
  }
  const tipY = IN_TOP - 26 + 26 * press - 120 * up;
  const hx = x + off;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - REC.half, REC.top + 8, REC.half * 2, REC.bot - REC.top - 8);
  ctx.clip();
  rodV(ctx, hx, REC.top, tipY - 30, 8, MAT.fresh);
  prism(ctx, rect(hx - 18, tipY - 30, 36, 26), 14, MAT.fresh, { sil: 2.5 });
  prism(ctx, [[hx - 8, tipY - 4], [hx + 8, tipY - 4], [hx + 3, tipY + 4], [hx - 3, tipY + 4]], 8, MAT.fresh, { sil: 2 });
  ctx.restore();
}
function builderContacts(ctx, t) {
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 3; k++) {
      const s = 1.1 + k * 0.25 + 0.1;
      const off = [-24, 6, 28][(k + i) % 3];
      contactGlow(ctx, BX[i] + off, IN_TOP, (t - s + 0.03) / 0.12, 22);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Collar, screen, judge.

function collarBack(ctx) {
  // frame behind the passing piece: back plate and the machine head above
  prism(ctx, rect(COLLAR - 74, P_TOP - 18, 148, FLOOR - P_TOP + 18), 70, MAT.metal, { sil: 2.5 });
  ctx.fillStyle = '#070a08';
  ctx.fillRect(COLLAR - 64, P_TOP - 10, 128, FLOOR - P_TOP + 10);
}
const WIN_C = { x0: COLLAR - 44, x1: COLLAR + 52, y0: P_TOP + 50, y1: P_TOP + 128 };
function collarFront(ctx) {
  // the collar: a heavy frame the piece slides behind, with a window onto the mark
  const w = WIN_C, x0 = COLLAR - 80, x1 = COLLAR + 80, y0 = P_TOP - 30;
  prism(ctx, rect(x0, y0, x1 - x0, w.y0 - y0), 20, MAT.lit, { sil: 3 });
  prism(ctx, rect(x0, w.y1, x1 - x0, FLOOR - w.y1), 20, MAT.lit, { sil: 3 });
  prism(ctx, rect(x0, w.y0, w.x0 - x0, w.y1 - w.y0), 20, MAT.lit, { sil: 2.5 });
  prism(ctx, rect(w.x1, w.y0, x1 - w.x1, w.y1 - w.y0), 20, MAT.lit, { sil: 2.5 });
  // shadow the frame throws into the window
  const g = ctx.createLinearGradient(0, w.y0, 0, w.y0 + 22);
  g.addColorStop(0, 'rgba(2,4,3,0.55)');
  g.addColorStop(1, 'rgba(2,4,3,0)');
  ctx.fillStyle = g;
  ctx.fillRect(w.x0, w.y0, w.x1 - w.x0, 22);
  for (const [x, y] of [[x0 + 14, y0 + 14], [x1 - 14, y0 + 14], [x0 + 14, FLOOR - 16], [x1 - 14, FLOOR - 16]]) ball(ctx, x, y, 4.5, MAT.lit);
  // machine head: punch housing and the grinder's motor
  prism(ctx, rect(COLLAR - 58, P_TOP - 140, 116, 110), 50, MAT.metal, { sil: 3 });
  prism(ctx, rect(COLLAR + 60, P_TOP - 116, 34, 64), 36, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (let y = P_TOP - 108; y < P_TOP - 58; y += 8) { ctx.fillStyle = '#0a0e0b'; ctx.fillRect(COLLAR + 66, y, 22, 3); }
}
// Per piece in the collar: the wheel comes down into the window, grinds the mark off, lifts; the punch strikes.
function collarPhase(t) {
  for (let i = 0; i < 3; i++) {
    const b = FEEDT[i][1], c = FEEDT[i][2];
    if (t >= b - 0.04 && t < c + 0.02) return { i, b, c };
  }
  return null;
}
function collarMoving(ctx, t) {
  const ph = collarPhase(t);
  let punch = 0, wheel = 0, spin = 0;
  if (ph) {
    const { b, c } = ph;
    wheel = easeOut(seg(t, b - 0.04, b + 0.02)) - easeIn(seg(t, b + 0.08, b + 0.11));
    spin = (t - b) * 70;
    if (t >= b + 0.09) punch = Math.sin(Math.PI * seg(t, b + 0.09, c));
  }
  // grinding wheel on an arm out of the top rail of the frame (hidden behind it when up)
  if (wheel > 0) {
    const wx = COLLAR + 14, wy = lerp(P_TOP + 20, P_TOP + 92, wheel);
    rodV(ctx, wx, P_TOP + 10, wy, 8, MAT.lit);
    const g = ctx.createRadialGradient(wx - 5, wy - 6, 2, wx, wy, 22);
    g.addColorStop(0, '#6c7f70');
    g.addColorStop(1, '#1a221c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(wx, wy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#86a98e';
    ctx.lineWidth = lw(2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(194,201,186,0.55)';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = spin + (k * Math.PI) / 3;
      ctx.moveTo(wx + Math.cos(a) * 8, wy + Math.sin(a) * 8);
      ctx.lineTo(wx + Math.cos(a) * 17, wy + Math.sin(a) * 17);
    }
    ctx.stroke();
    ball(ctx, wx, wy, 5, MAT.lit);
  }
  // punch ram rising out of the head
  rodV(ctx, COLLAR - 10, P_TOP - 176 + 30 * punch, P_TOP - 136, 18, MAT.lit);
  prism(ctx, rect(COLLAR - 26, P_TOP - 186 + 30 * punch, 32, 14), 18, MAT.lit, { sil: 2 });
}

function screen(ctx, t) {
  const d = screenDown(t);
  if (d <= 0) return;
  const top = BEAM.y + BEAM.h, h = (FLOOR - 2 - top) * d;
  const pts = rect(SCREEN_X - 11, top, 22, h);
  prism(ctx, pts, 88, MAT.slat, { sil: 2.5 });
  // slat lines on the receding face
  if (!LOD.card) {
    ctx.save();
    ctx.strokeStyle = '#070a08';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = top + h - 18; y > top; y -= 26) {
      ctx.moveTo(SCREEN_X + 11, y);
      ctx.lineTo(SCREEN_X + 11 + D.x * 88, y + D.y * 88);
    }
    ctx.stroke();
    ctx.restore();
  }
  prism(ctx, rect(SCREEN_X - 13, top + h - 12, 26, 12), 90, MAT.lit, { sil: 2 });
}

// Fresh judge: a clean green pegboard with a criteria card, dropped from behind the beam.
function judge(ctx, t) {
  if (t < 3.85 || t >= 5.6) return;
  let dy = 0;
  if (t < 4.15) dy = -330 * (1 - springStep(seg(t, 3.85, 4.15), 0.8, 8));
  else if (t >= 5.3) dy = -330 * easeIn(seg(t, 5.3, 5.6));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BEAM.y + BEAM.h, W, H);
  ctx.clip();
  ctx.translate(0, dy);
  const b = BOARD;
  // hangers to the beam
  for (const x of [b.x + 40, b.x + b.w - 40]) rodV(ctx, x, BEAM.y, b.y + 6, 6, MAT.fresh);
  prism(ctx, rect(b.x, b.y, b.w, b.h), 16, MAT.fresh, { sil: 3.5 });
  ctx.fillStyle = '#0b130e';
  ctx.fillRect(b.x + 12, b.y + 12, b.w - 24, b.h - 24);
  // criteria card: ruled lines only, one per criterion row
  const cx = b.x + 24, cw = 52;
  ctx.fillStyle = '#c2c9ba';
  ctx.beginPath();
  ctx.moveTo(cx, b.y + 30);
  ctx.lineTo(cx + cw - 10, b.y + 30);
  ctx.lineTo(cx + cw, b.y + 40);
  ctx.lineTo(cx + cw, b.y + b.h - 34);
  ctx.lineTo(cx, b.y + b.h - 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#4c5248';
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  for (const y of ROWS) { ctx.moveTo(cx + 9, y); ctx.lineTo(cx + cw - 9, y); }
  ctx.stroke();
  // row rules across the board
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(83,219,118,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const y of ROWS) { ctx.moveTo(cx + cw + 12, y); ctx.lineTo(b.x + b.w - 20, y); }
    ctx.stroke();
  }
  // peg holes and pegs, row by row
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = SLOT[i], y = ROWS[j];
      ctx.fillStyle = '#030504';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
      const tp = 4.2 + 0.3 * j + 0.08 * i;
      if (t < tp) continue;
      const u = indexEase(seg(t, tp, tp + 0.14));
      const py = y - 46 * (1 - u);
      const pass = PEGS[i][j];
      const mat = pass
        ? { top: '#9ff2b7', side: '#1f6a37', hi: '#e9fff0', sil: '#2f8a4a' }
        : { top: '#ffe2a8', side: '#8a6a2e', hi: '#fff4dc', sil: '#a8843e' };
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(x + 2, py + 4, 15, 0, Math.PI * 2);
      ctx.fill();
      ball(ctx, x, py, 15, mat);
    }
  }
  // pointer: swings from rest to point down at the recommended base
  const ang = lerp(Math.PI, Math.PI / 2, indexEase(seg(t, 5.08, 5.24)));
  const tip = [PIVOT.x + 78 * Math.cos(ang), PIVOT.y + 78 * Math.sin(ang)];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0e1d14';
  ctx.lineWidth = lw(11);
  ctx.beginPath();
  ctx.moveTo(PIVOT.x, PIVOT.y);
  ctx.lineTo(tip[0], tip[1]);
  ctx.stroke();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(5);
  ctx.stroke();
  ctx.restore();
  ball(ctx, PIVOT.x, PIVOT.y, 10, MAT.fresh);
  ctx.restore();
  return { tip, dy };
}

// ---------------------------------------------------------------------------------------------
// The parent: the session's hatched arm on a boom from the right edge. Persistent: it stays in frame.

function parent(ctx, t, tip) {
  const SM = activeMat(MAT.session, parentActive(t));
  const x = tip.x, y = tip.y;
  // boom from the carriage to the right edge, carriage, telescoping arm, head
  prism(ctx, rect(x + 20, BOOM_Y - 10, W + 40 - x, 20), 30, SM, { hatch: true, sil: 3 });
  prism(ctx, rect(x - 26, BOOM_Y - 16, 52, 30), 34, SM, { hatch: true, sil: 3 });
  if (y - 40 > BOOM_Y + 14) rodV(ctx, x, BOOM_Y + 14, y - 40, 12, SM);
  prism(ctx, rect(x - 20, y - 42, 40, 32), 26, SM, { hatch: true, sil: 3 });
  prism(ctx, [[x - 12, y - 10], [x + 12, y - 10], [x + 6, y], [x - 6, y]], 14, SM, { sil: 2.5 });
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 1000, 560);
  for (let i = 0; i < 4; i++) contactShadow(ctx, BX[i] + 16, FLOOR - 6, 120, 14, i === 3 ? 0.35 : 0.5);
  contactShadow(ctx, COLLAR + 14, FLOOR - 6, 110, 14, 0.55);
  contactShadow(ctx, 1560, FLOOR - 4, 260, 16, 0.45);
  // judging tray: a grated plate with trap doors under the outer two places
  prism(ctx, rect(1316, FLOOR - 4, 488, 4), 70, MAT.metal, { sil: 2 });
  for (let i = 0; i < 4; i++) boothBody(ctx, i);
  collarBack(ctx);
  // drafting texture: a centre line down each judging column, peg row to tray place
  for (const x of SLOT) centreLine(ctx, x, BEAM.y + BEAM.h + 30, x, P_TOP - 10, 0.3);
  centreLine(ctx, COLLAR - 120, P_TOP + 92, COLLAR + 120, P_TOP + 92, 0.4);
  // the overhead beam's shadow line on the wall
  ctx.fillStyle = 'rgba(2,4,3,0.35)';
  ctx.fillRect(BEAM.x, BEAM.y + BEAM.h, BEAM.w, 10);
}

function frontLayer(ctx) {
  collarFront(ctx);
  // overhead beam over the judging area (the screen and the judge hang from it)
  prism(ctx, rect(BEAM.x, BEAM.y, BEAM.w, BEAM.h), 24, MAT.metal, { sil: 3 });
  prism(ctx, rect(SCREEN_X - 30, BEAM.y, 60, 22), 24, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (let x = BEAM.x + 60; x < BEAM.x + BEAM.w - 30; x += 150) ball(ctx, x, BEAM.y + BEAM.h / 2, 3.2, MAT.metal);
}
// The lamp follows the active station: booths, then the collar and the judging tray, back at the seam.
const lampX = (t) => 700 + 760 * (easeInOut(seg(t, 2.2, 3.9)) - easeInOut(seg(t, 9.3, 10)));

// ---------------------------------------------------------------------------------------------

function brief(ctx, x, y, a = 1, s = 1) {
  if (a <= 0) return;
  const w = 60 * s, h = 90 * s, c = 13 * s;
  ctx.save();
  ctx.globalAlpha *= a;
  prism(ctx, [[x, y], [x + w - c, y], [x + w, y + c], [x + w, y + h], [x, y + h]], 8, MAT.ivory, { sil: 2 });
  ctx.fillStyle = '#1c2620';
  ctx.beginPath();
  ctx.arc(x + w * 0.35, y + h * 0.16, 4.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function briefs(ctx, t, inBooth) {
  // the brief slides to the booth row, then three copies rise into the lit booths (inside only)
  if (!inBooth) {
    if (t < 0.3) {
      const x = lerp(ENTRY, BX[1], easeInOut(seg(t, 0, 0.3)));
      contactShadow(ctx, x + 6, FLOOR - 4, 40, 6, 0.5);
      brief(ctx, x - 30, FLOOR - 90);
    } else if (t < 0.6) {
      const u = easeInOut(seg(t, 0.3, 0.6));
      for (let i = 0; i < 3; i++) brief(ctx, lerp(BX[1], BX[i], u) - 30, lerp(FLOOR - 90, IN_TOP + 30, u), i === 1 ? 1 : seg(t, 0.3, 0.42));
    }
    if (t >= 9.4) {
      const x = lerp(-60, ENTRY, easeOut(seg(t, 9.4, 10.0)));
      contactShadow(ctx, x + 6, FLOOR - 4, 40, 6, 0.5);
      brief(ctx, x - 30, FLOOR - 90);
    }
    return;
  }
  if (t >= 0.6 && t < 1.8) {
    const a = 1 - seg(t, 1.2, 1.8);
    for (let i = 0; i < 3; i++) brief(ctx, BX[i] - 30, IN_TOP + 30, a);
  }
}

function pieceDraw(ctx, t, inBooth) {
  if (t < 1.2) return;
  const st = inlayState(t);
  for (let i = 0; i < 3; i++) {
    const b = FEEDT[i][1];
    const o = { mark: 1 - seg(t, b + 0.02, b + 0.08), letter: t >= b + 0.1 ? 1 : 0, st };
    // inside pass: forming in the booth and lowering out through the sill slot; outside pass: on the bench
    if (inBooth !== t < 2.4) continue;
    let x, top;
    if (t < 2.0) { x = BX[i]; top = IN_TOP; o.alpha = seg(t, 1.2, 1.8); }
    else if (t < 2.4) { x = BX[i]; top = lerp(IN_TOP, P_TOP, easeInOut(seg(t, 2.0, 2.4))); }
    else { x = pieceX(t, i); top = P_TOP; }
    if (t >= 9.4) {
      if (i === 1) x = lerp(SLOT[1], 2010, easeIn(seg(t, 9.45, 9.95)));
      else top += 170 * easeIn(seg(t, 9.42, 9.78));
    }
    if (x - PW / 2 > W) continue;
    ctx.save();
    if (t >= 9.4 && i !== 1) {
      ctx.beginPath();
      ctx.rect(0, 0, W, FLOOR);
      ctx.clip();
    }
    if (!inBooth && top <= P_TOP + 1) contactShadow(ctx, x + 10, FLOOR - 3, 62, 7, 0.55);
    piece(ctx, i, x, top, o);
    ctx.restore();
  }
}

export default {
  id: 'arena',
  name: '/arena',
  caption: 'Builds parallel attempts at one task, judges them blind',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'arena-final-back', backLayer);

    // inside the booths: copies of the brief, the builders, the pieces forming; then shutters
    for (let i = 0; i < 3; i++) builder(ctx, t, i);
    briefs(ctx, t, true);
    pieceDraw(ctx, t, true);
    const sh = shutter(t);
    for (let i = 0; i < 4; i++) shutterSlats(ctx, i, sh);

    // trap doors open under A and C at the seam
    const door = easeInOut(seg(t, 9.4, 9.5)) - easeInOut(seg(t, 9.8, 9.95));
    if (door > 0) {
      for (const x of [SLOT[0], SLOT[2]]) {
        ctx.fillStyle = '#030504';
        poly(ctx, [[x - 56, FLOOR - 3], [x + 56, FLOOR - 3], [x + 56 + D.x * 60 * door, FLOOR - 3 + D.y * 60 * door], [x - 56 + D.x * 60 * door, FLOOR - 3 + D.y * 60 * door]]);
        ctx.fill();
      }
    }

    briefs(ctx, t, false);
    pieceDraw(ctx, t, false);
    collarMoving(ctx, t);
    screen(ctx, t);
    const jd = judge(ctx, t);

    // the parent and the section it carries
    const tip = parentTip(t);
    for (const n of INLAYS) {
      if (t >= n.cut && t < n.set) chunk(ctx, n, tip.x, tip.y + CH_H / 2, seg(t, n.cut + 0.08, n.set - 0.06));
    }
    parent(ctx, t, tip);

    cached(ctx, 'arena-final-front', frontLayer);
    lampFalloff(ctx, lampX(t), 560, 520, 1350, 0.56);

    // light: builder strokes, the collar's sparks and punch, the pegs landing, the parent's contacts
    builderContacts(ctx, t);
    for (let i = 0; i < 3; i++) {
      const b = FEEDT[i][1];
      dust(ctx, COLLAR + 2, P_TOP + 104, t - b - 0.02, 0x51 + i, { ang: Math.PI * 0.8, spread: 0.9, n: 12, dur: 0.3 });
      contactGlow(ctx, COLLAR + 14, P_TOP + 96, (t - b - 0.1) / 0.12, 28);
    }
    if (jd) {
      contactGlow(ctx, jd.tip[0], jd.tip[1] + jd.dy, (t - 5.24) / 0.12, 30);
    }
    for (const tk of TOUCH) {
      const k = TOUCH.indexOf(tk);
      const x = k < 3 ? SLOT[k] : SLOT[1];
      contactGlow(ctx, x, P_TOP, (t - tk) / 0.12, 30);
    }
    for (const n of INLAYS) {
      const cy = cyOf(n) + CH_H / 2;
      contactGlow(ctx, SLOT[n.from] - PW / 2 + STRIP, cy, (t - n.cut) / 0.12, 30);
      contactGlow(ctx, SLOT[1] - PW / 2 + STRIP, cy, (t - n.set) / 0.12, 34);
      dust(ctx, SLOT[1] - PW / 2 + 4, cy, t - n.set, 0xa0 + n.from, { ang: Math.PI * 0.9, spread: 1.2, n: 7, dur: 0.4 });
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
