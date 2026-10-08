// /arena at final fidelity (pitch A 3.8).
// Sealed booths, a badge grinder and a blind pegboard. One brief is copied into three lit booths;
// a fourth booth stands dim and empty, so the count reads as "some", not "three". A fresh builder
// drops into each booth, the shutters close, and three pieces come out with their own edge
// profile and angle mark. One after another they slide through the grinder's frame: behind its
// port a wheel grinds the mark off and a die punches a neutral letter (A, B, C: the only drawn
// words). A screen drops; a fresh judge behind it fills a pegboard row by row with green pass and
// amber fail pegs and points to B. The screen lifts. The graft: the session's hatched parent takes
// B as the base and cuts a seat into its edge, then cuts a large section carrying A's edge idea
// and one carrying C's, carries each across and seats it in B (hatch re-cut to B's). B stands
// under the lamp as the base plus two inlays; A and C are left notched. Hold. Seam, staggered:
// C and A drop to scratch, B leaves right, the shutters reopen together, a new brief arrives.
// Pure function of t. No Math.random, no setTransform. Static geometry lives in cached layers;
// rigid moving parts are drawn once into per-scale sprites and placed each frame.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, centreLine,
  benchFinal, lampFalloff, activeMat, BACK_Y, BENCH_Y,
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
const PEGS = [[1, 0, 1], [1, 1, 1], [0, 1, 0]]; // [piece][criterion]: 1 pass (green), 0 fail (amber)
const BOARD = { x: 1318, y: 296, w: 490, h: 262 };
const ROWS = [366, 428, 490];
const PIVOT = { x: SLOT[1], y: 536 };
const STRIP = 30; // width of the hatched cut face along a piece's left edge
// The graft: sections GW wide and GH tall; B's seat takes two of them, stacked.
const GW = 48, GH = 58, SEAT_H = 2 * GH;
const CARRY_Y = 560; // gripper height while carrying a section over the tray
const BOOM_Y = 540, HOV = 574, REST = { x: 1862, y: 574 };

// The grinder: a frame the pieces slide through, a port on the mark, a wheel guard and motor on top.
const CX = COLLAR + 14, CY = P_TOP + 92, RT = 44; // port centre (on the mark) and radius
const FX0 = 1099, FX1 = 1259, FY0 = P_TOP - 38;

// ---------------------------------------------------------------------------------------------
// Timing.

// Feed through the grinder per booth: [leave bench spot, enter port, leave port, reach tray].
// The pieces overlap: the next one is on its way while the previous one is in the port.
const FEEDT = [[3.0, 3.6, 4.05, 4.4], [2.45, 2.95, 3.4, 3.8], [1.95, 2.3, 2.75, 3.15]];
const G = { seat: 6.17, drop: 6.29, cutA: 6.49, setA: 6.89, cutC: 7.23, setC: 7.57, rest: 7.81 };
const SHUT_CLOSE = 0.9, SHUT_OPEN = 9.6;
const JUDGE = { in: 4.42, out: 5.75, pegs: 4.92, point: 5.45 };
// doors: [A, C] as [open, close]; the piece drops between them
const SEAM = { lift: 9.39, bOut: [9.58, 9.95], doors: [[9.5, 9.7], [9.4, 9.6]], brief: 9.7 };
const WASTE_X = SLOT[1] - PW / 2 + GW / 2 - 46; // B's seat waste is pulled left over this slot

// ---------------------------------------------------------------------------------------------
// Pieces.

function edge(i, s) {
  if (i === 0) return s > 0.14 && s < 0.36 ? 18 : 0; // a square step near the top
  if (i === 1) return 8 + 8 * Math.sin(s * Math.PI * 4); // wave
  const f = (s * 4) % 1;
  return 16 * Math.abs(f * 2 - 1); // zigzag
}

// Left-edge offset of piece i at height fraction s: B's seat once cut, A's and C's taken sections.
function edgeX(i, s, st) {
  const r = s * PH;
  if (i === 1 && st.seat && r < SEAT_H) return GW;
  if (((i === 0 && st.cutA) || (i === 2 && st.cutC)) && r < GH) return GW;
  return edge(i, s);
}

function piecePts(i, left, top, st) {
  const cut = 22;
  const ss = [];
  for (let k = 0; k <= 60; k++) ss.push(k / 60);
  for (const r of [GH, SEAT_H, 0.14 * PH, 0.36 * PH]) ss.push(r / PH - 1e-4, r / PH + 1e-4);
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

function mark(ctx, i, x, y) {
  ctx.save();
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

function letter(ctx, i, x, y) {
  ctx.save();
  ctx.font = LETTER_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,250,0.85)';
  ctx.fillText(LETTER[i], x + 1.5, y + 2);
  ctx.fillStyle = '#3a3f37';
  ctx.fillText(LETTER[i], x, y);
  ctx.restore();
}

// A candidate piece: ivory, clipped corner, registration hole, own left-edge profile with a hatched
// cut face; withMark draws the angle mark. Drawn at centre x = cx, top = top.
function pieceVec(ctx, i, cx, top, st, withMark) {
  const left = cx - PW / 2;
  const pts = piecePts(i, left, top, st);
  prism(ctx, pts, P_DEP, MAT.ivory, { sil: 2 });
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
  if (i === 1 && st.setC) chunkVec(ctx, 2, left, top, 0, GH, HATCH[1], true);
  if (i === 1 && st.setA) chunkVec(ctx, 0, left, top + GH, 0, GH, HATCH[1], true);
  hole(ctx, left + 60, top + 24, 8.5, P_DEP, MAT.ivory);
  if (withMark) mark(ctx, i, left + 64, top + 92);
}
const NO_ST = { seat: false, cutA: false, cutC: false, setA: false, setC: false };
function pieceSprite(ctx, i, withMark, st) {
  const f = i === 0 ? (st.cutA ? 'c' : '') : i === 2 ? (st.cutC ? 'c' : '') : (st.seat ? 's' : '') + (st.setA ? 'a' : '') + (st.setC ? 'c' : '');
  const k = 'ar-p' + i + (withMark ? 'm' : 'n') + f;
  return sprite(ctx, k, [-PW / 2 - 8, P_TOP - 14, PW + 26, PH + 24], (c) => pieceVec(c, i, 0, P_TOP, st, withMark));
}
// o: { alpha, markA (0..1), letter (bool), st }
function piece(ctx, i, cx, top, o) {
  const a = o.alpha ?? 1;
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  const st = o.st || NO_ST;
  const mk = o.markA ?? 0;
  blit(ctx, pieceSprite(ctx, i, mk >= 1, st), cx, top - P_TOP);
  if (mk > 0 && mk < 1) {
    ctx.globalAlpha *= mk;
    blit(ctx, pieceSprite(ctx, i, true, st), cx, top - P_TOP);
  }
  ctx.restore();
  if (o.letter) {
    ctx.save();
    ctx.globalAlpha *= a;
    letter(ctx, i, cx + 14, top + 96);
    ctx.restore();
  }
}

// A section: rows r0..r1 of piece src's left edge, GW wide, drawn with its top-left at (left, top),
// hatched at angle ang. inlaid: outlined as a seated inlay.
function chunkVec(ctx, src, left, top, r0, r1, ang, inlaid = false) {
  const h = r1 - r0;
  const pts = [[left + GW, top], [left + GW, top + h]];
  for (let k = 24; k >= 0; k--) {
    const r = r0 + (k / 24) * h;
    pts.push([left + edge(src, r / PH), top + (k / 24) * h]);
  }
  prism(ctx, pts, P_DEP, MAT.ivory, { sil: 2 });
  ctx.save();
  poly(ctx, pts);
  ctx.clip();
  ctx.fillStyle = 'rgba(150,154,142,0.28)';
  ctx.fillRect(left - 2, top, STRIP + 2, h);
  hatchIn(ctx, left - 2, top, STRIP + 4, h, ang, 'rgba(62,90,69,0.95)');
  ctx.restore();
  if (inlaid) {
    // the seam round the inlay: a dark cut line
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3f463b';
    ctx.lineWidth = lw(3);
    ctx.beginPath();
    ctx.moveTo(left + edge(src, r0 / PH), top);
    ctx.lineTo(left + GW, top);
    ctx.lineTo(left + GW, top + h);
    ctx.lineTo(left + edge(src, r1 / PH), top + h);
    ctx.stroke();
    ctx.restore();
  }
}
const hatchTurn = (src, u) => lerp(HATCH[src], HATCH[1], easeInOut(u));

// ---------------------------------------------------------------------------------------------
// Motion.

function pieceX(t, i) {
  const [a, b, c, d] = FEEDT[i];
  if (t < a) return BX[i];
  if (t < b) return lerp(BX[i], COLLAR, sm(seg(t, a, b)));
  if (t < c) return COLLAR;
  if (t < d) return lerp(COLLAR, SLOT[i], sm(seg(t, c, d)));
  return SLOT[i];
}

const shutter = (t) => easeInOut(seg(t, SHUT_CLOSE, SHUT_CLOSE + 0.4)) - easeInOut(seg(t, SHUT_OPEN, SHUT_OPEN + 0.4));
const screenDown = (t) => easeInOut(seg(t, 4.3, 4.6)) - easeInOut(seg(t, 5.95, 6.35));

// Parent tip keyframes: [t, x, y]. Take B and cut its seat, pull the waste clear, then cut a section
// from A and one from C, carry each over the tray and seat it in B; rest on B.
const B_HOLD = SLOT[1] + 24; // the gripper holds B clear of its inlays
const xA = SLOT[0] - PW / 2 + GW / 2, xB = SLOT[1] - PW / 2 + GW / 2, xC = SLOT[2] - PW / 2 + GW / 2;
const KEYS = [
  [0, REST.x, REST.y], [5.95, REST.x, REST.y],
  [6.11, xB, HOV], [G.seat, xB, P_TOP], [6.27, WASTE_X, P_TOP], [G.drop, WASTE_X, P_TOP],
  [6.43, xA, HOV], [G.cutA, xA, P_TOP], [6.53, xA, P_TOP], [6.65, xA, CARRY_Y], [6.79, xB, CARRY_Y], [G.setA, xB, P_TOP + GH],
  [6.93, xB, P_TOP + GH], [7.03, xB, CARRY_Y], [7.15, xC, CARRY_Y], [G.cutC, xC, P_TOP],
  [7.27, xC, P_TOP], [7.37, xC, CARRY_Y], [7.49, xB, CARRY_Y], [G.setC, xB, P_TOP],
  [7.61, xB, P_TOP], [7.69, xB, HOV], [7.75, B_HOLD, HOV], [G.rest, B_HOLD, P_TOP],
  [SEAM.lift, B_HOLD, P_TOP], [SEAM.lift + 0.08, B_HOLD, HOV], [SEAM.lift + 0.26, REST.x, REST.y], [T, REST.x, REST.y],
];
function parentTip(t) {
  for (let k = 0; k < KEYS.length - 1; k++) {
    const [t0, x0, y0] = KEYS[k], [t1, x1, y1] = KEYS[k + 1];
    if (t >= t0 && t < t1) { const u = sm((t - t0) / (t1 - t0)); return { x: lerp(x0, x1, u), y: lerp(y0, y1, u) }; }
  }
  return { ...REST };
}
const parentActive = (t) => easeInOut(seg(t, 5.75, 5.95)) * (1 - easeInOut(seg(t, SEAM.lift + 0.08, SEAM.lift + 0.45)));

function graftState(t) {
  return { seat: t >= G.seat, cutA: t >= G.cutA, cutC: t >= G.cutC, setA: t >= G.setA, setC: t >= G.setC };
}

// The lamp follows the active station: booths, the grinder, the judging tray and the graft on B,
// back at the seam.
const lampX = (t) => 700 + 480 * easeInOut(seg(t, 1.8, 2.5)) + 260 * easeInOut(seg(t, 4.2, 4.8)) + 100 * easeInOut(seg(t, 5.9, 6.3)) - 840 * easeInOut(seg(t, 9.3, 10));
// The lamp's pool on the bench and wall, at the active station (the cached bench keeps a dim one).
function lampPool(ctx, x) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BACK_Y, W, BENCH_Y - BACK_Y);
  ctx.clip();
  ctx.translate(x, FLOOR - 6);
  ctx.scale(1, 0.13);
  let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 460);
  g.addColorStop(0, 'rgba(225,240,225,0.16)');
  g.addColorStop(1, 'rgba(225,240,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-460, -460, 920, 920);
  ctx.restore();
  g = ctx.createRadialGradient(x, 520, 0, x, 520, 520);
  g.addColorStop(0, 'rgba(150,215,170,0.07)');
  g.addColorStop(1, 'rgba(150,215,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 520, 0, 1040, BACK_Y);
}

// ---------------------------------------------------------------------------------------------
// Booths.

const BOOTH = { ...MAT.lit, front: ['#26322a', '#161d18'], sil: '#5a7c62', hi: '#9cbea3' };
function boothBody(ctx, i) {
  const x = BX[i], dim = i === 3;
  const M = dim ? MAT.slat : BOOTH;
  // legs, feet and foot rail
  for (const lx of [x - B_HALF + 10, x + B_HALF - 22]) {
    prism(ctx, rect(lx, B_BOT, 12, FLOOR - B_BOT - 8), 14, M, { sil: 2 });
    prism(ctx, rect(lx - 6, FLOOR - 8, 24, 8), 20, M, { sil: 1.5 });
  }
  // cabinet: top, sides, sill with the delivery slot
  prism(ctx, rect(x - B_HALF, B_TOP, B_HALF * 2, 16), B_DEP, M, { sil: 3 });
  prism(ctx, rect(x - B_HALF, B_TOP + 16, 14, B_BOT - B_TOP - 30), B_DEP, M, { sil: 2.5 });
  prism(ctx, rect(x + B_HALF - 14, B_TOP + 16, 14, B_BOT - B_TOP - 30), B_DEP, M, { sil: 2.5 });
  prism(ctx, rect(x - B_HALF, B_BOT - 14, 40, 14), B_DEP, M, { sil: 2.5 });
  prism(ctx, rect(x + B_HALF - 40, B_BOT - 14, 40, 14), B_DEP, M, { sil: 2.5 });
  if (!LOD.card) {
    ctx.fillStyle = '#0b100c';
    ctx.beginPath();
    for (const [sx, sy] of [[x - B_HALF + 7, B_TOP + 8], [x + B_HALF - 7, B_TOP + 8], [x - B_HALF + 7, B_BOT - 7], [x + B_HALF - 7, B_BOT - 7]]) { ctx.moveTo(sx + 3, sy); ctx.arc(sx, sy, 3, 0, Math.PI * 2); }
    ctx.fill();
  }
  // recess: dark back wall, lit from a lamp under the top for the three working booths
  const r = REC;
  ctx.fillStyle = dim ? '#0b0f0c' : '#0e140f';
  ctx.fillRect(x - r.half, r.top, r.half * 2, r.bot - r.top);
  if (!dim) {
    const g = ctx.createRadialGradient(x, r.top + 10, 4, x, r.top + 60, 240);
    g.addColorStop(0, 'rgba(236,240,226,0.24)');
    g.addColorStop(0.5, 'rgba(200,226,206,0.09)');
    g.addColorStop(1, 'rgba(200,226,206,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r.half, r.top, r.half * 2, r.bot - r.top);
    prism(ctx, rect(x - 40, r.top, 80, 8), 20, MAT.lit, { sil: 2 });
    ctx.fillStyle = 'rgba(244,246,236,0.9)';
    ctx.fillRect(x - 32, r.top + 8, 64, 3);
  } else {
    prism(ctx, rect(x - 40, r.top, 80, 8), 20, MAT.slat, { sil: 2 });
    const g = ctx.createLinearGradient(0, r.bot - 60, 0, r.bot);
    g.addColorStop(0, 'rgba(2,4,3,0)');
    g.addColorStop(1, 'rgba(2,4,3,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r.half, r.bot - 60, r.half * 2, 60);
  }
  // roll housing for the shutter, and the port in the top the builder drops through
  prism(ctx, rect(x - r.half - 2, r.top - 2, r.half * 2 + 4, 10), 10, M, { sil: 2 });
  if (!dim) {
    ctx.fillStyle = '#050806';
    poly(ctx, [[x - 30, B_TOP], [x + 30, B_TOP], [x + 30 + D.x * 40, B_TOP + D.y * 40], [x - 30 + D.x * 40, B_TOP + D.y * 40]]);
    ctx.fill();
  }
}

// Roller shutter: slats with narrow gaps, anchored to the moving bottom edge; the work shows
// through the gaps. Drawn once as a fully closed sheet and slid up under a clip.
function drawShutterSheet(ctx) {
  const r = REC, x = 0, bottom = r.bot;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - r.half, r.top + 8, r.half * 2, bottom - r.top - 8);
  ctx.clip();
  const SL = 30, GAP = 9;
  for (let y = bottom - SL; y + SL > r.top; y -= SL + GAP) {
    const g = ctx.createLinearGradient(0, y, 0, y + SL);
    g.addColorStop(0, '#3a4b3f');
    g.addColorStop(0.35, '#232d26');
    g.addColorStop(1, '#141a16');
    ctx.fillStyle = g;
    ctx.fillRect(x - r.half, y, r.half * 2, SL);
    ctx.fillStyle = '#7a9c82';
    ctx.fillRect(x - r.half, y, r.half * 2, lw(1.6));
  }
  ctx.restore();
  prism(ctx, rect(x - r.half, bottom - 12, r.half * 2, 12), 6, MAT.lit, { sil: 2 });
  ball(ctx, x, bottom - 6, 3.5, MAT.lit);
}
function shutterSlats(ctx, i, sh) {
  if (sh <= 0 || i === 3) return;
  const x = BX[i], r = REC;
  const bottom = r.top + 8 + (r.bot - r.top - 8) * sh;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - r.half, r.top + 8, r.half * 2 + 4, bottom - r.top - 8 + 1);
  ctx.clip();
  blit(ctx, sprite(ctx, 'ar-shutter', [-r.half - 4, r.top, 2 * r.half + 12, r.bot - r.top + 6], drawShutterSheet), x, bottom - r.bot);
  ctx.restore();
}

// Fresh builder: a clean green press head on a long rod, dropped through the booth top from above
// the frame (ease-out 0.5 s) before the shutters close, two strokes on the work, lifted out (0.4 s).
function drawBuilderHead(ctx) {
  const hx = 0, tipY = 0;
  prism(ctx, rect(hx - 27, tipY - 36, 54, 30), 16, MAT.fresh, { sil: 3 });
  prism(ctx, rect(hx - 10, tipY - 6, 20, 6), 10, MAT.fresh, { sil: 2 });
  ball(ctx, hx - 15, tipY - 21, 4, MAT.fresh);
  ball(ctx, hx + 15, tipY - 21, 4, MAT.fresh);
}
const B_IN = 0.45, B_WORK = 1.3, B_OUT = 1.92, B_GONE = 2.32;
const B_REST = IN_TOP - 26, B_HIGH = -60;
function builder(ctx, t, i) {
  if (t < B_IN || t >= B_GONE) return;
  const x = BX[i];
  let tipY = B_REST;
  if (t < B_IN + 0.5) tipY = lerp(B_HIGH, B_REST, easeOut(seg(t, B_IN, B_IN + 0.5)));
  else if (t >= B_OUT) tipY = lerp(B_REST, B_HIGH, easeIn(seg(t, B_OUT, B_GONE)));
  let off = 0;
  if (t >= B_WORK && t < B_WORK + 0.3) {
    const k = Math.min(1, Math.floor((t - B_WORK) / 0.15));
    const lt = t - B_WORK - k * 0.15;
    tipY += 26 * Math.sin(Math.PI * clamp01(lt / 0.12));
    off = [-20, 20][(k + i) % 2];
  }
  const hx = x + off;
  rodV(ctx, hx, -20, tipY - 34, 9, MAT.fresh);
  blit(ctx, sprite(ctx, 'ar-builder', [-34, -46, 76, 54], drawBuilderHead), hx, tipY);
}
function builderContacts(ctx, t) {
  for (let i = 0; i < 3; i++) {
    for (let k = 0; k < 2; k++) {
      const s = B_WORK + k * 0.15 + 0.06;
      const off = [-20, 20][(k + i) % 2];
      contactGlow(ctx, BX[i] + off, IN_TOP, (t - s) / 0.12, 22);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The grinder.

const FRAME = { ...MAT.lit, front: ['#334238', '#1d2620'], top: '#52695a', sil: '#668f70', hi: '#b3d6ba' };
function grinderBack(ctx) {
  // the frame's body behind the throat the pieces pass through, and a lit anvil under the port
  prism(ctx, rect(FX0 + 4, FY0 + 4, FX1 - FX0 - 8, FLOOR - FY0 - 4), 30, MAT.metal, { sil: 2.5 });
  const g = ctx.createLinearGradient(0, P_TOP - 6, 0, FLOOR);
  g.addColorStop(0, '#070a08');
  g.addColorStop(1, '#101612');
  ctx.fillStyle = g;
  ctx.fillRect(FX0 + 12, P_TOP - 6, FX1 - FX0 - 24, FLOOR - P_TOP + 6);
  prism(ctx, rect(CX - 34, CY + RT - 14, 68, 10), 20, MAT.lit, { sil: 1.5 });
}
function grinderFront(ctx) {
  // motor on a bracket left of the head, its shaft into the wheel guard over the port
  prism(ctx, rect(FX0 - 58, FY0 - 10, 100, 10), 26, MAT.metal, { sil: 2 });
  prism(ctx, rect(FX0 - 40, FY0 - 4, 10, 4 + 0), 8, MAT.metal, { sil: 1 });
  rodH(ctx, FX0 - 46, FX0 + 34, FY0 - 34, 46, MAT.lit);
  if (!LOD.card) {
    ctx.strokeStyle = '#0d120f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = FX0 - 34; x < FX0 + 30; x += 7) { ctx.moveTo(x, FY0 - 54); ctx.lineTo(x, FY0 - 14); }
    ctx.stroke();
  }
  prism(ctx, rect(FX0 - 14, FY0 - 70, 30, 14), 18, MAT.lit, { sil: 1.5 }); // terminal box
  ball(ctx, FX0 - 46, FY0 - 34, 15, MAT.lit);
  rodH(ctx, FX0 + 34, CX - 36, FY0 - 34, 12, MAT.metal);
  const gp = [];
  for (let k = 0; k <= 18; k++) { const a = Math.PI + (k / 18) * Math.PI; gp.push([CX + Math.cos(a) * 52, FY0 + Math.sin(a) * 52]); }
  prism(ctx, gp, 44, FRAME, { sil: 3 });
  ball(ctx, CX, FY0 - 26, 8, FRAME);
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(179,214,186,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(CX, FY0, 42, Math.PI * 1.06, Math.PI * 1.94);
    ctx.stroke();
  }
  // the die's cylinder: end caps, tie rods, piston rod out of the top
  const rx = FX1 - 30;
  rodV(ctx, rx, FY0 - 104, FY0 - 92, 8, MAT.lit);
  prism(ctx, rect(rx - 22, FY0 - 92, 44, 10), 30, FRAME, { sil: 2 });
  rodV(ctx, rx, FY0 - 82, FY0 - 12, 34, MAT.lit);
  prism(ctx, rect(rx - 22, FY0 - 12, 44, 12), 30, FRAME, { sil: 2 });
  if (!LOD.card) {
    ctx.strokeStyle = '#86a98e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const dx of [-19, 19]) { ctx.moveTo(rx + dx, FY0 - 82); ctx.lineTo(rx + dx, FY0 - 12); }
    ctx.stroke();
  }

  // the frame's front plate with the port: side faces from a prism, the face filled around the hole
  prism(ctx, rect(FX0, FY0, FX1 - FX0, FLOOR - FY0), 30, FRAME, { sil: 3, front: 'rgba(0,0,0,0)' });
  const g = ctx.createLinearGradient(0, FY0, 0, FLOOR);
  g.addColorStop(0, FRAME.front[0]);
  g.addColorStop(1, FRAME.front[1]);
  ctx.save();
  ctx.beginPath();
  ctx.rect(FX0, FY0, FX1 - FX0, FLOOR - FY0);
  ctx.moveTo(CX + RT + 8, CY);
  ctx.arc(CX, CY, RT + 8, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  // the port's chamfer: lit on the lower right, in shadow at the upper left
  const L = 0.71;
  const bg = ctx.createLinearGradient(CX - RT * L, CY - RT * L, CX + RT * L, CY + RT * L);
  bg.addColorStop(0, '#0f1511');
  bg.addColorStop(0.55, '#3c5143');
  bg.addColorStop(1, '#a9cdb1');
  ctx.beginPath();
  ctx.arc(CX, CY, RT + 8, 0, Math.PI * 2);
  ctx.moveTo(CX + RT, CY);
  ctx.arc(CX, CY, RT, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill('evenodd');
  ctx.strokeStyle = FRAME.sil;
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.arc(CX, CY, RT + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // edge outline over the face, screws, a bolted ring of rivets round the port
  ctx.save();
  ctx.strokeStyle = FRAME.sil;
  ctx.lineWidth = lw(3);
  ctx.strokeRect(FX0, FY0, FX1 - FX0, FLOOR - FY0);
  ctx.strokeStyle = FRAME.hi;
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(FX0, FY0);
  ctx.lineTo(FX1, FY0);
  ctx.stroke();
  ctx.restore();
  if (!LOD.card) {
    ctx.fillStyle = '#0b100c';
    ctx.beginPath();
    const pts = [[FX0 + 12, FY0 + 12], [FX1 - 12, FY0 + 12], [FX0 + 12, FLOOR - 12], [FX1 - 12, FLOOR - 12]];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; pts.push([CX + Math.cos(a) * (RT + 17), CY + Math.sin(a) * (RT + 17)]); }
    for (const [x, y] of pts) { ctx.moveTo(x + 3, y); ctx.arc(x, y, 3, 0, Math.PI * 2); }
    ctx.fill();
  }
  // entry and exit throat lips
  prism(ctx, rect(FX0 - 8, P_TOP - 10, 8, FLOOR - P_TOP + 10), 30, MAT.lit, { sil: 2 });
  prism(ctx, rect(FX1, P_TOP - 10, 8, FLOOR - P_TOP + 10), 30, MAT.lit, { sil: 2 });
}

// Per piece in the port: the wheel comes down, grinds the mark off, lifts; the die strikes the letter.
function portPhase(t) {
  for (let i = 0; i < 3; i++) {
    const b = FEEDT[i][1], c = FEEDT[i][2];
    if (t >= b && t < c) return { i, b, c };
  }
  return null;
}
const WHEEL_R = 22;
function drawWheel(ctx) {
  const wx = 0, wy = 0;
  rodV(ctx, wx, wy - 90, wy - 4, 10, MAT.lit);
  const g = ctx.createRadialGradient(wx - 6, wy - 7, 2, wx, wy, WHEEL_R + 2);
  g.addColorStop(0, '#8a9c8d');
  g.addColorStop(0.6, '#4a5a4d');
  g.addColorStop(1, '#1a221c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(wx, wy, WHEEL_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8d4bd';
  ctx.lineWidth = lw(2);
  ctx.stroke();
  ball(ctx, wx, wy, 5.5, MAT.lit);
}
function drawDie(ctx) {
  rodV(ctx, 0, -110, -30, 14, MAT.lit);
  prism(ctx, rect(-20, -32, 40, 30), 16, FRAME, { sil: 2.5 });
  prism(ctx, rect(-13, -2, 26, 6), 10, MAT.lit, { sil: 1.5 });
}
function grinderMoving(ctx, t) {
  const ph = portPhase(t);
  if (!ph) return;
  const { b } = ph;
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, RT + 1, 0, Math.PI * 2);
  ctx.clip();
  const wheel = easeOut(seg(t, b, b + 0.06)) - easeIn(seg(t, b + 0.2, b + 0.26));
  if (wheel > 0) {
    const wx = CX - 4, wy = lerp(CY - RT - WHEEL_R - 6, CY - 6, wheel);
    blit(ctx, sprite(ctx, 'ar-wheel', [-WHEEL_R - 6, -96, 2 * WHEEL_R + 14, 96 + WHEEL_R + 8], drawWheel), wx, wy);
    if (!LOD.card) {
      const spin = (t - b) * 60;
      ctx.strokeStyle = 'rgba(30,40,32,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = spin + (k * Math.PI) / 3;
        ctx.moveTo(wx + Math.cos(a) * 9, wy + Math.sin(a) * 9);
        ctx.lineTo(wx + Math.cos(a) * 18, wy + Math.sin(a) * 18);
      }
      ctx.stroke();
    }
  }
  const ram = easeIn(seg(t, b + 0.24, b + 0.32)) - easeOut(seg(t, b + 0.34, b + 0.44));
  if (ram > 0) blit(ctx, sprite(ctx, 'ar-die', [-26, -116, 60, 128], drawDie), CX, lerp(CY - RT - 10, CY + 18, ram));
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Screen and judge.

const SCR_TOP = BEAM.y + BEAM.h, SCR_H = FLOOR - 2 - SCR_TOP;
function drawScreen(ctx) {
  // full-height screen anchored at its bottom edge (y = SCR_TOP + SCR_H)
  prism(ctx, rect(SCREEN_X - 11, SCR_TOP, 22, SCR_H), 88, MAT.slat, { sil: 2.5 });
  if (!LOD.card) {
    ctx.strokeStyle = '#070a08';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = SCR_TOP + SCR_H - 18; y > SCR_TOP + 4; y -= 26) {
      ctx.moveTo(SCREEN_X + 11, y);
      ctx.lineTo(SCREEN_X + 11 + D.x * 88, y + D.y * 88);
    }
    ctx.stroke();
  }
  prism(ctx, rect(SCREEN_X - 13, SCR_TOP + SCR_H - 12, 26, 12), 90, MAT.lit, { sil: 2 });
}
function screen(ctx, t) {
  const d = screenDown(t);
  if (d <= 0) return;
  const h = SCR_H * d;
  ctx.save();
  ctx.beginPath();
  ctx.rect(SCREEN_X - 20, SCR_TOP - 24, 100, h + 25);
  ctx.clip();
  blit(ctx, sprite(ctx, 'ar-screen', [SCREEN_X - 16, SCR_TOP - 40, 70, SCR_H + 44], drawScreen), 0, h - SCR_H);
  ctx.restore();
}

// Fresh judge: a pegboard in a deep frame with a clipped-on criteria card, dropped from behind the beam.
const PEG_HOLE = 11;
function drawBoard(ctx) {
  const b = BOARD;
  for (const x of [b.x + 40, b.x + b.w - 40]) rodV(ctx, x, BEAM.y - 340, b.y + 6, 6, MAT.fresh);
  prism(ctx, rect(b.x, b.y, b.w, b.h), 22, MAT.fresh, { sil: 3.5 });
  // inset panel with a fine perforation
  const ix = b.x + 14, iy = b.y + 14, iw = b.w - 28, ih = b.h - 28;
  const g = ctx.createLinearGradient(0, iy, 0, iy + ih);
  g.addColorStop(0, '#0f1a13');
  g.addColorStop(1, '#09110c');
  ctx.fillStyle = g;
  ctx.fillRect(ix, iy, iw, ih);
  ctx.fillStyle = 'rgba(2,4,3,0.55)';
  ctx.fillRect(ix, iy, iw, 6);
  ctx.fillRect(ix, iy, 6, ih);
  if (!LOD.card) {
    ctx.fillStyle = '#050a07';
    ctx.beginPath();
    for (let y = iy + 18; y < iy + ih - 8; y += 20) for (let x = ix + 96; x < ix + iw - 8; x += 20) { ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, Math.PI * 2); }
    ctx.fill();
  }
  // criteria card in a holder: two clips at the top, ruled lines one per criterion row
  const cx = b.x + 20, cw = 50, cy0 = b.y + 30, cy1 = b.y + b.h - 30;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(cx + 3, cy0 + 4, cw, cy1 - cy0);
  prism(ctx, [[cx, cy0], [cx + cw - 10, cy0], [cx + cw, cy0 + 10], [cx + cw, cy1], [cx, cy1]], 3, MAT.ivory, { sil: 1.5 });
  ctx.strokeStyle = '#4c5248';
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  for (const y of ROWS) { ctx.moveTo(cx + 9, y); ctx.lineTo(cx + cw - 9, y); }
  ctx.stroke();
  for (const x of [cx + 10, cx + cw - 22]) prism(ctx, rect(x, cy0 - 8, 12, 16), 6, MAT.fresh, { sil: 2 });
  // row rules and the drilled peg holes with lit rims
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(83,219,118,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const y of ROWS) { ctx.moveTo(cx + cw + 14, y); ctx.lineTo(b.x + b.w - 22, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const x = SLOT[i], y = ROWS[j];
      ctx.fillStyle = '#020403';
      ctx.beginPath();
      ctx.arc(x, y, PEG_HOLE, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4fa36a';
      ctx.lineWidth = lw(2);
      ctx.beginPath();
      ctx.arc(x, y, PEG_HOLE, Math.PI * 0.05, Math.PI * 0.95);
      ctx.stroke();
    }
  }
  // the pointer's pivot boss
  ball(ctx, PIVOT.x, PIVOT.y, 12, MAT.fresh);
}
function drawPeg(ctx, pass) {
  const mat = pass
    ? { top: '#9ff2b7', side: '#1f6a37', hi: '#e9fff0', sil: '#2f8a4a' }
    : { top: '#ffe2a8', side: '#8a6a2e', hi: '#fff4dc', sil: '#a8843e' };
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(2, 4, 15, 0, Math.PI * 2);
  ctx.fill();
  ball(ctx, 0, 0, 15, mat);
}
function judge(ctx, t) {
  if (t < JUDGE.in || t >= JUDGE.out + 0.4) return null;
  let dy = 0;
  if (t < JUDGE.in + 0.5) dy = -340 * (1 - easeOut(seg(t, JUDGE.in, JUDGE.in + 0.5)));
  else if (t >= JUDGE.out) dy = -340 * easeIn(seg(t, JUDGE.out, JUDGE.out + 0.4));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BEAM.y + BEAM.h, W, H);
  ctx.clip();
  blit(ctx, sprite(ctx, 'ar-board', [BOARD.x - 8, BEAM.y - 346, BOARD.w + 30, BOARD.y + BOARD.h - BEAM.y + 360], drawBoard), 0, dy);
  const pegS = [sprite(ctx, 'ar-peg-0', [-18, -18, 38, 40], (c) => drawPeg(c, 0)), sprite(ctx, 'ar-peg-1', [-18, -18, 38, 40], (c) => drawPeg(c, 1))];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const tp = JUDGE.pegs + 0.2 * j; // one criterion row at a time
      if (t < tp) continue;
      const u = indexEase(seg(t, tp, tp + 0.14));
      blit(ctx, pegS[PEGS[i][j]], SLOT[i], ROWS[j] - 46 * (1 - u) + dy);
    }
  }
  // pointer: swings from rest to point down at the recommended base
  const ang = lerp(Math.PI, Math.PI / 2, indexEase(seg(t, JUDGE.point, JUDGE.point + 0.16)));
  const px = PIVOT.x, py = PIVOT.y + dy;
  const tip = [px + 80 * Math.cos(ang), py + 80 * Math.sin(ang)];
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0e1d14';
  ctx.lineWidth = lw(11);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(tip[0], tip[1]);
  ctx.stroke();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(5);
  ctx.stroke();
  ctx.fillStyle = '#a4f5ba';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return { tip };
}

// ---------------------------------------------------------------------------------------------
// The parent: the session's hatched arm on a boom from the right edge. Persistent: it stays in frame.

function drawBoom(ctx, SM) { prism(ctx, rect(0, BOOM_Y - 10, W + 40, 20), 30, SM, { hatch: true, sil: 3 }); }
function drawCarriage(ctx, SM) {
  const x = REST.x;
  prism(ctx, rect(x - 26, BOOM_Y - 16, 52, 30), 34, SM, { hatch: true, sil: 3 });
  ball(ctx, x - 14, BOOM_Y - 1, 3.5, SM);
  ball(ctx, x + 14, BOOM_Y - 1, 3.5, SM);
}
function drawHead(ctx, SM) {
  const x = REST.x, y = REST.y;
  prism(ctx, rect(x - 20, y - 42, 40, 32), 26, SM, { hatch: true, sil: 3 });
  prism(ctx, [[x - 12, y - 10], [x + 12, y - 10], [x + 6, y], [x - 6, y]], 14, SM, { sil: 2.5 });
}
function parent(ctx, t, tip) {
  const a = parentActive(t);
  const x = tip.x, y = tip.y;
  const layer = (key, box, fn, dx, dy) => {
    blit(ctx, sprite(ctx, key + '0', box, (c) => fn(c, activeMat(MAT.session, 0))), dx, dy);
    if (a > 0.004) {
      ctx.save();
      ctx.globalAlpha *= a;
      blit(ctx, sprite(ctx, key + '1', box, (c) => fn(c, activeMat(MAT.session, 1))), dx, dy);
      ctx.restore();
    }
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 10, 0, W, H);
  ctx.clip();
  layer('ar-boom', [-6, BOOM_Y - 30, W + 60, 44], drawBoom, 0, 0);
  ctx.restore();
  layer('ar-car', [REST.x - 34, BOOM_Y - 34, 90, 56], drawCarriage, x - REST.x, 0);
  if (y - 40 > BOOM_Y + 14) rodV(ctx, x, BOOM_Y + 14, y - 40, 12, activeMat(MAT.session, a));
  layer('ar-head', [REST.x - 28, REST.y - 56, 70, 64], drawHead, x - REST.x, y - REST.y);
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 1400, 560);
  for (let i = 0; i < 4; i++) contactShadow(ctx, BX[i] + 16, FLOOR - 6, 120, 14, i === 3 ? 0.35 : 0.5);
  contactShadow(ctx, CX + 10, FLOOR - 6, 120, 15, 0.6);
  contactShadow(ctx, 1560, FLOOR - 4, 260, 16, 0.45);
  // judging tray: a grated plate with trap doors under the outer two places
  prism(ctx, rect(1316, FLOOR - 4, 488, 4), 70, MAT.metal, { sil: 2 });
  if (!LOD.card) {
    ctx.strokeStyle = '#26332a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const x of [SLOT[0], SLOT[2]]) {
      for (const s of [-56, 56]) { ctx.moveTo(x + s, FLOOR - 4); ctx.lineTo(x + s + D.x * 60, FLOOR - 4 + D.y * 60); }
    }
    ctx.stroke();
  }
  for (let i = 0; i < 4; i++) boothBody(ctx, i);
  grinderBack(ctx);
  // drafting texture: a centre line down each judging column, peg row to tray place
  for (const x of SLOT) centreLine(ctx, x, BEAM.y + BEAM.h + 30, x, P_TOP - 10, 0.3);
  centreLine(ctx, FX0 - 60, CY, FX0 - 8, CY, 0.4);
  // the overhead beam's shadow line on the wall
  ctx.fillStyle = 'rgba(2,4,3,0.35)';
  ctx.fillRect(BEAM.x, BEAM.y + BEAM.h, BEAM.w, 10);
}

function frontLayer(ctx) {
  grinderFront(ctx);
  // overhead beam over the judging area (the screen and the judge hang from it)
  prism(ctx, rect(BEAM.x, BEAM.y, BEAM.w, BEAM.h), 24, MAT.metal, { sil: 3 });
  prism(ctx, rect(SCREEN_X - 30, BEAM.y, 60, 22), 24, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (let x = BEAM.x + 60; x < BEAM.x + BEAM.w - 30; x += 150) ball(ctx, x, BEAM.y + BEAM.h / 2, 3.2, MAT.metal);
}

// ---------------------------------------------------------------------------------------------

function drawBrief(ctx) {
  const x = 0, y = 0, w = 60, h = 90, c = 13;
  prism(ctx, [[x, y], [x + w - c, y], [x + w, y + c], [x + w, y + h], [x, y + h]], 8, MAT.ivory, { sil: 2 });
  ctx.fillStyle = '#1c2620';
  ctx.beginPath();
  ctx.arc(x + w * 0.35, y + h * 0.16, 4.5, 0, Math.PI * 2);
  ctx.fill();
}
function brief(ctx, x, y, a = 1) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha *= a;
  blit(ctx, sprite(ctx, 'ar-brief', [-6, -10, 76, 106], drawBrief), x, y);
  ctx.restore();
}

function briefs(ctx, t, inBooth) {
  // the brief slides to the booth row, then three copies rise into the lit booths (inside only)
  if (!inBooth) {
    if (t < 0.25) {
      const x = lerp(ENTRY, BX[1], easeInOut(seg(t, 0, 0.25)));
      contactShadow(ctx, x + 6, FLOOR - 4, 40, 6, 0.5);
      brief(ctx, x - 30, FLOOR - 90);
    } else if (t < 0.45) {
      const u = easeInOut(seg(t, 0.25, 0.45));
      for (let i = 0; i < 3; i++) brief(ctx, lerp(BX[1], BX[i], u) - 30, lerp(FLOOR - 90, IN_TOP + 30, u), i === 1 ? 1 : seg(t, 0.25, 0.33));
    }
    if (t >= SEAM.brief) {
      const x = lerp(-60, ENTRY, easeOut(seg(t, SEAM.brief, T)));
      contactShadow(ctx, x + 6, FLOOR - 4, 40, 6, 0.5);
      brief(ctx, x - 30, FLOOR - 90);
    }
    return;
  }
  if (t >= 0.45 && t < 1.55) {
    const a = 1 - seg(t, 1.3, 1.55);
    for (let i = 0; i < 3; i++) brief(ctx, BX[i] - 30, IN_TOP + 30, a);
  }
}

const P_FORM = [1.3, 1.55], P_LOWER = [1.62, 1.92];
function pieceDraw(ctx, t, inBooth) {
  if (t < P_FORM[0]) return;
  const st = graftState(t);
  for (let i = 0; i < 3; i++) {
    const b = FEEDT[i][1];
    const o = { markA: 1 - seg(t, b + 0.07, b + 0.19), letter: t >= b + 0.32, st };
    // inside pass: forming in the booth and lowering out through the sill slot; outside pass: on the bench
    if (inBooth !== t < P_LOWER[1]) continue;
    let x, top;
    if (t < P_LOWER[0]) { x = BX[i]; top = IN_TOP; o.alpha = seg(t, P_FORM[0], P_FORM[1]); }
    else if (t < P_LOWER[1]) { x = BX[i]; top = lerp(IN_TOP, P_TOP, easeInOut(seg(t, P_LOWER[0], P_LOWER[1]))); }
    else { x = pieceX(t, i); top = P_TOP; }
    let clipped = false;
    if (t >= SEAM.bOut[0]) {
      if (i === 1) {
        const u = seg(t, SEAM.bOut[0], SEAM.bOut[1]);
        x = SLOT[1] + 450 * u * u;
      } else {
        const [d0, d1] = SEAM.doors[i === 0 ? 0 : 1];
        top += 180 * easeIn(seg(t, d0 + 0.02, d1));
        clipped = true;
      }
    }
    if (x - PW / 2 > W) continue;
    ctx.save();
    if (clipped) {
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

    lampPool(ctx, lampX(t));

    // inside the booths: copies of the brief, the builders, the pieces forming; then shutters
    for (let i = 0; i < 3; i++) builder(ctx, t, i);
    briefs(ctx, t, true);
    pieceDraw(ctx, t, true);
    const sh = shutter(t);
    for (let i = 0; i < 3; i++) shutterSlats(ctx, i, sh);

    // trap doors in the tray: B's seat waste early in the graft; C, then A at the seam
    for (const [x, d0, d1] of [[WASTE_X, G.drop - 0.04, G.drop + 0.23], [SLOT[0], ...SEAM.doors[0]], [SLOT[2], ...SEAM.doors[1]]]) {
      const door = easeInOut(seg(t, d0, d0 + 0.06)) - easeInOut(seg(t, d1, d1 + 0.06));
      if (door <= 0) continue;
      const hw = x === WASTE_X ? 28 : 56;
      ctx.fillStyle = '#030504';
      poly(ctx, [[x - hw, FLOOR - 3], [x + hw, FLOOR - 3], [x + hw + D.x * 60 * door, FLOOR - 3 + D.y * 60 * door], [x - hw + D.x * 60 * door, FLOOR - 3 + D.y * 60 * door]]);
      ctx.fill();
    }

    briefs(ctx, t, false);
    pieceDraw(ctx, t, false);
    grinderMoving(ctx, t);
    screen(ctx, t);
    const jd = judge(ctx, t);

    // the graft: B's seat waste, then the sections of A and C, carried under the parent's gripper
    const tip = parentTip(t);
    if (t >= G.seat && t < G.drop) chunkVec(ctx, 1, tip.x - GW / 2, tip.y, 0, SEAT_H, HATCH[1]);
    else if (t >= G.drop && t < G.drop + 0.26) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, FLOOR);
      ctx.clip();
      chunkVec(ctx, 1, WASTE_X - GW / 2, P_TOP + 200 * easeIn(seg(t, G.drop + 0.02, G.drop + 0.24)), 0, SEAT_H, HATCH[1]);
      ctx.restore();
    }
    if (t >= G.cutA && t < G.setA) chunkVec(ctx, 0, tip.x - GW / 2, tip.y, 0, GH, hatchTurn(0, seg(t, G.cutA + 0.06, G.setA - 0.06)));
    if (t >= G.cutC && t < G.setC) chunkVec(ctx, 2, tip.x - GW / 2, tip.y, 0, GH, hatchTurn(2, seg(t, G.cutC + 0.06, G.setC - 0.06)));
    parent(ctx, t, tip);

    cached(ctx, 'arena-final-front', frontLayer);
    lampFalloff(ctx, lampX(t), 560, 520, 1350, 0.56);

    // light: builder strokes, the grinder's sparks and strike, the pointer, the graft's cuts and seats
    builderContacts(ctx, t);
    for (let i = 0; i < 3; i++) {
      const b = FEEDT[i][1];
      dust(ctx, CX - 18, CY + 12, t - b - 0.07, 0x51 + i, { ang: Math.PI * 0.8, spread: 0.9, n: 10, dur: 0.24 });
      contactGlow(ctx, CX, CY + 4, (t - b - 0.32) / 0.12, 30);
    }
    if (jd) contactGlow(ctx, jd.tip[0], jd.tip[1], (t - JUDGE.point - 0.16) / 0.12, 30);
    const seamX = (k) => SLOT[k] - PW / 2 + GW;
    contactGlow(ctx, seamX(1), P_TOP + SEAT_H / 2, (t - G.seat) / 0.12, 30);
    dust(ctx, seamX(1) - 4, P_TOP + SEAT_H / 2, t - G.seat, 0xa1, { ang: Math.PI * 0.9, spread: 1.2, n: 7, dur: 0.4 });
    contactGlow(ctx, seamX(0), P_TOP + GH / 2, (t - G.cutA) / 0.12, 30);
    contactGlow(ctx, seamX(2), P_TOP + GH / 2, (t - G.cutC) / 0.12, 30);
    contactGlow(ctx, seamX(1), P_TOP + GH * 1.5, (t - G.setA) / 0.12, 40);
    contactGlow(ctx, seamX(1), P_TOP + GH / 2, (t - G.setC) / 0.12, 40);
    contactGlow(ctx, B_HOLD, P_TOP, (t - G.rest) / 0.12, 30);

    grainOver(ctx, 0.3, 'soft-light');
  },
};
