// /wow-loop at final fidelity (pitch A 3.6, same beats and timing as the animatic's
// scenes/wow-loop.js). The written bar is a row of sealed ring gauges bolted to the bench; they
// never move. The workpiece passes the scripted rings first (one index flag per ring). Then two
// fresh critics drop in from the gantry: a camera (experience) and a micrometer (engineering).
// Each works from its own capture and ejects an evidence card; the camera's close view comes out
// with an amber ring around the burred corner. The critics leave without touching the piece. The
// session's hatched builder files that corner. A new pair of critics drops in, captures and
// measures again, and its cards come out clean. The piece settles in the cradle; hold. Seam: the
// cradle gate opens, the piece leaves right, the next piece feeds in, the flags reset and the
// tray floor indexes down by this loop's cards. No scores, no numbers.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole, hatchPath,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, activeMat,
} from '../kit.mjs';

const T = 9.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const PW = 80, PH = 120, PD = 30, PC = Math.round(Math.min(PW, PH) * 0.22);
const P_BOT = 708;
const CY = P_BOT - PH / 2; // piece centre height on the rail; the ring axis
const ENTRY = 210, IX = 1270;
const RINGS = [400, 535, 670, 805, 940];
const RO = 96, RI = 74, RW = 18, RZ = PD / 2;
const WAIT = 0.6, FEED_T = 1.2, FEED_A = 0.45, FEED_D = 0.2; // the piece waits at the entry, then feeds
const SETTLE = 14, SEAT = P_BOT + SETTLE;
const RAIL_END = IX - 56;

// Gantry beam the critics drop from.
const BEAM_Y0 = 236, BEAM_Y1 = 258;

// Camera (experience critic): pivot at the foot of its stem; two views.
const CAM_V1 = { x: 1080, y: 600, a: 0.08 }, CAM_V2 = { x: 1084, y: 476, a: 0.6 };
// Micrometer (engineering critic): vertical head over the piece, spindle onto its top face.
const MX = IX, MIC_HEAD = 398, TIP_REST = P_BOT - PH - 30;

// Builder (the session, hatched): column right of the cradle, telescoping boom, file head.
const COL_X = 1540;
const CORNER = [IX + PW / 2 - PC / 2 + 2, P_BOT - PH + PC / 2 - 2]; // pad seats here
const M_REST = 1436;
const BOOM_Y = CORNER[1] - 30;
const FILE_T0 = 3.95, FILE_A = (0.9 - 0.2) / 1.75, FILE_TC = FILE_T0 + FILE_A;

// Evidence cards and tray.
const CW = 150, CH = 110;
const SHOW = [1735, 470];
const TRAY_X0 = 1640, TRAY_X1 = 1830, TRAY_TOP = 640, TRAY_FLOOR = 760, TRAY_D = 130, TWALL = 12;
const TRAY_CX = (TRAY_X0 + TRAY_X1) / 2;
const LAYER = 8, K0 = 9, PER_LOOP = 6;

// Critic rounds (fresh pairs). clicks: camera captures; move: camera from view 1 to view 2; mic: engage.
const ROUNDS = [
  { tin: 1.75, din: 0.45, tout: 3.55, clicks: [2.15, 2.7], move: [2.3, 2.6], mic: [2.55, 0.3] },
  { tin: 4.7, din: 0.4, tout: 6.1, clicks: [5.1, 5.45], move: [5.2, 5.4], mic: [5.15, 0.2] },
];
// [eject, arrive, holdEnd, dropEnd, source, view, burr, amber]
const CARDS = [
  [2.2, 2.75, 2.83, 3.13, 'cam', 1, true, false],
  [2.75, 3.3, 3.65, 3.95, 'cam', 2, true, true],
  [3.5, 3.95, 4.03, 4.33, 'mic', 0, true, false],
  [5.15, 5.7, 5.78, 6.08, 'cam', 1, false, false],
  [5.55, 6.1, 6.18, 6.48, 'cam', 2, false, false],
  [6.05, 6.5, 6.58, 6.88, 'mic', 0, false, false],
];

// ---------------------------------------------------------------------------------------------
// Helpers.

const pr = (x, y, z) => [x + D.x * z, y + D.y * z];
const shiftPts = (pts, z) => pts.map(([x, y]) => [x + D.x * z, y + D.y * z]);
const rotPts = (pts, cx, cy, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  return pts.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
};

function blankPts(x, y, w, h, c = Math.min(w, h) * 0.22) {
  return [[x, y], [x + w - c, y], [x + w, y + c], [x + w, y + h], [x, y + h]];
}

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

function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, t3, c: (t - t1) / 0.12 };
}

// Fresh: drop in from the gantry (ease-out over din), lift out (ease-in 0.4 s). y offset.
const freshDy = (t, r) => -600 * (1 - easeOut(seg(t, r.tin, r.tin + r.din))) - 600 * easeIn(seg(t, r.tout, r.tout + 0.4));

function tilt(ctx, x0, y0, h, th) {
  const c = Math.cos(th), s = Math.sin(th);
  ctx.transform(1, 0, -s * D.x, c - D.y * s, x0 + s * D.x * h, y0 + h * (D.y * s - c));
}

const feedX = (t) => ENTRY + (IX - ENTRY) * trap((t - WAIT) / FEED_T, FEED_A / FEED_T, FEED_D / FEED_T);
// When the piece's trailing edge clears each ring (solved once; the feed is monotonic).
const CLEAR = RINGS.map((rx) => {
  let lo = WAIT, hi = WAIT + FEED_T;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (feedX(m) - PW / 2 > rx + RW / 2 + 8) hi = m; else lo = m; }
  return hi;
});

// ---------------------------------------------------------------------------------------------
// The workpiece.

const PIECE_MAT = { ...MAT.ivory, front: ['#f7f7f0', '#d4d5c9'] };

function burrPts(x, y) {
  // ragged sliver standing proud of the clipped corner's edge (x, y = the piece's top-left)
  const ax = x + PW - PC, ay = y, n = [0.7071, -0.7071];
  const pts = [];
  const prof = [[0, 0], [0.12, 4.5], [0.24, 1.5], [0.38, 7], [0.5, 2.5], [0.64, 6], [0.78, 1.8], [0.9, 4], [1, 0]];
  for (const [s, o] of prof) pts.push([ax + PC * s + n[0] * o, ay + PC * s + n[1] * o]);
  return pts;
}

// o: { burr, filed (0..1 fresh-edge glint), alpha, s, rot }
function piece(ctx, cx, bot, o = {}) {
  const { burr = false, filed = 0, alpha = 1, s = 1, rot = 0 } = o;
  if (alpha <= 0) return;
  const x = cx - PW / 2, y = bot - PH;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (s !== 1 || rot) {
    ctx.translate(cx, bot);
    if (rot) ctx.rotate(rot);
    if (s !== 1) ctx.scale(s, s);
    ctx.translate(-cx, -bot);
  }
  prism(ctx, blankPts(x, y, PW, PH, PC), PD, PIECE_MAT);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,250,0.85)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x + 1, y + 1);
  ctx.lineTo(x + PW - PC - 1, y + 1);
  ctx.stroke();
  ctx.restore();
  hole(ctx, x + PW * 0.35, y + PH * 0.16, 6.5, PD, MAT.ivory);
  if (burr) {
    const bp = burrPts(x, y);
    ctx.save();
    ctx.fillStyle = '#ecece2';
    poly(ctx, bp);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,114,100,0.8)';
    ctx.lineWidth = lw(1.3);
    ctx.stroke();
    ctx.restore();
  }
  if (filed > 0 && !LOD.card) {
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,248,${0.9 * filed})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + PW - PC + 1, y + 1);
    ctx.lineTo(x + PW - 1, y + PC - 1);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Ring gauges: plates in the plane across the line, so the piece passes through the bore.

const RING_MAT = MAT.lit;

function ringShape(ctx, rx, dx, a0) {
  const P2 = (a, R) => [rx + dx + D.x * (RZ + R * Math.cos(a)), CY - R * Math.sin(a) + D.y * (RZ + R * Math.cos(a))];
  const n = 26;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const p = P2(a0 + (i / n) * Math.PI, RO); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
  for (let i = n; i >= 0; i--) { const p = P2(a0 + (i / n) * Math.PI, RI); ctx.lineTo(p[0], p[1]); }
  ctx.closePath();
  return P2;
}

function ringHalf(ctx, rx, front) {
  const a0 = front ? Math.PI / 2 : -Math.PI / 2;
  ctx.save();
  const N = LOD.card ? 4 : 8;
  for (let k = 0; k < N; k++) {
    const dx = -RW / 2 + (RW * k) / N;
    ringShape(ctx, rx, dx, a0);
    ctx.fillStyle = mix('#111813', '#3a4c3f', k / N);
    ctx.fill();
  }
  const P2 = ringShape(ctx, rx, RW / 2, a0);
  const g = ctx.createLinearGradient(rx - 40, CY - RO, rx + 60, CY + RO);
  g.addColorStop(0, '#6f8f77');
  g.addColorStop(0.4, '#3a4c3f');
  g.addColorStop(1, '#1c261f');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = RING_MAT.sil;
  ctx.lineWidth = lw(3);
  ctx.stroke();
  // turned rings on the face and a lit arc on the upper left of the outer edge
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(164,200,172,0.12)';
    ctx.lineWidth = 1.5;
    for (const R of [64, 70, 75]) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const p = P2(a0 + (i / 20) * Math.PI, R); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke();
    }
  }
  if (front) {
    ctx.strokeStyle = RING_MAT.hi;
    ctx.lineWidth = lw(2.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) { const p = P2(Math.PI * 0.62 + (i / 10) * 0.55, RO - 3); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    ctx.stroke();
  }
  ctx.restore();
}

const SEAL_MAT = { front: ['#f6f6ef', '#cfd0c3'], top: '#fdfdf7', side: '#a9aa9f', hi: '#ffffff', sil: null };

function ringStand(ctx, rx) {
  contactShadow(ctx, rx + 18, FLOOR - 4, 70, 12, 0.55);
  prism(ctx, shiftPts(rect(rx - 44, FLOOR - 10, 88, 10), -14), 52, RING_MAT, { sil: 2.5 });
  prism(ctx, shiftPts(rect(rx - 13, CY + RO - 6, 26 + RW / 2, FLOOR - 10 - (CY + RO - 6)), 0), RZ + 12, RING_MAT, { sil: 2.5 });
  // two bolts, each capped with an ivory seal, and the seal wire between them
  const sy = FLOOR - 10;
  const s1 = pr(rx - 30, sy, 12), s2 = pr(rx + 32, sy, 12);
  ctx.save();
  ctx.strokeStyle = 'rgba(194,201,186,0.55)';
  ctx.lineWidth = lw(1.5);
  ctx.beginPath();
  ctx.moveTo(s1[0], s1[1] - 4);
  ctx.quadraticCurveTo(rx + 4, sy - 22, s2[0], s2[1] - 4);
  ctx.stroke();
  ctx.restore();
  for (const s of [s1, s2]) {
    ctx.save();
    ctx.fillStyle = '#0b100c';
    ctx.beginPath();
    ctx.ellipse(s[0] + 1, s[1] + 1, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ball(ctx, s[0], s[1] - 4, 7, SEAL_MAT);
  }
}

function flag(ctx, rx, st) {
  if (st > 1e-4 && st < 0.9999) { flagBody(ctx, rx, st); return; }
  const k = st > 0.5 ? 1 : 0;
  ctx.save();
  ctx.translate(rx - RINGS[0], 0);
  sprite(ctx, 'wl-flag' + k, RINGS[0], FLOOR - 58, 72, 52, (c) => flagBody(c, RINGS[0], k));
  ctx.restore();
}
function flagBody(ctx, rx, st) {
  const px = rx + 13 + RW / 2 + 4, py = FLOOR - 22;
  const a = lerp(-2.25, -0.85, st);
  const len = 24;
  const ex = px + Math.cos(a) * len, ey = py + Math.sin(a) * len;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0b100c';
  ctx.lineWidth = lw(8);
  ctx.beginPath();
  ctx.moveTo(px + 1.5, py + 2);
  ctx.lineTo(ex + 1.5, ey + 2);
  ctx.stroke();
  ctx.strokeStyle = mix('#2f6141', P.green, 0.35 + 0.65 * st);
  ctx.lineWidth = lw(6);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.restore();
  ball(ctx, px, py, 4.5, RING_MAT);
}

// ---------------------------------------------------------------------------------------------
// The seam's exit: the gate drops, the piece slides forward off the cradle onto the front of the
// bench (tipping over the gate's edge) and runs out past the right edge of the frame.
const OUT_A = 8.45, OUT_B = 8.97, OUT_X1 = 2040, OUT_Z = -96; // the front lane, well in front of the tray
function outPose(t) {
  const u = seg(t, OUT_A, OUT_B);
  return {
    x: IX + (OUT_X1 - IX) * trap(u, 0.42, 0),
    bot: lerp(SEAT, FLOOR, easeIn(seg(u, 0.2, 0.42))),
    z: OUT_Z * easeInOut(seg(u, 0.06, 0.38)),
    rot: 0.2 * Math.sin(Math.PI * seg(u, 0.18, 0.46)),
  };
}

// Cradle with a gate jaw on the right that drops to let the piece out in the seam.

function cradle(ctx, gate, pins) {
  const top = SEAT;
  if (gate < 1e-4) sprite(ctx, 'wl-cradle', IX - 62, P_BOT - 24, 160, FLOOR - P_BOT + 34, (c) => cradleBody(c, 0));
  else cradleBody(ctx, gate);
  // spring pins hold the piece over the seat until it settles
  if (pins > 0.02) for (const dx of [-20, 20]) rodV(ctx, IX + dx + D.x * RZ, top - SETTLE * pins + D.y * RZ, top + D.y * RZ + 1, 6, MAT.lit, false);
}
function cradleBody(ctx, gate) {
  const top = SEAT;
  prism(ctx, rect(IX - 56, top, 112, FLOOR - top), 60, MAT.lit);
  prism(ctx, rect(IX - 56, P_BOT + 4, 12, top - P_BOT - 4), 60, MAT.lit, { sil: 2.5 });
  // gate jaw hinged at its bottom outer corner
  const gp = rotPts(rect(-12, -(top - P_BOT - 4), 12, top - P_BOT - 4), IX + 56, top, gate * 1.4);
  prism(ctx, gp, 60, MAT.lit, { sil: 2.5 });
}

// ---------------------------------------------------------------------------------------------
// Critics.

const CAM_BODY = [[-48, 12], [48, 12], [48, 72], [-48, 72]];
const CAM_BARREL = [[48, 24], [92, 24], [92, 60], [48, 60]];
const CAM_HOOD = [[92, 20], [104, 16], [104, 68], [92, 64]];

function camPose(t, r) {
  const u = easeInOut(seg(t, r.move[0], r.move[1]));
  return { x: lerp(CAM_V1.x, CAM_V2.x, u), y: lerp(CAM_V1.y, CAM_V2.y, u) + freshDy(t, r), a: lerp(CAM_V1.a, CAM_V2.a, u) };
}
const camLocal = (pose, x, y) => rotPts([[x, y]], pose.x, pose.y, pose.a)[0];

function camera(ctx, pose, btn) {
  const M = MAT.fresh;
  // stem from the gantry down to the yoke
  rodV(ctx, pose.x, BEAM_Y1 - 2, pose.y - 6, 12, M);
  const R = (pts) => rotPts(pts, pose.x, pose.y, pose.a);
  // yoke plate
  prism(ctx, R([[-10, -4], [10, -4], [10, 14], [-10, 14]]), 44, M, { sil: 2.5 });
  prism(ctx, R(CAM_BODY), 50, M, { sil: 3.5 });
  // shutter button and the card slot on top
  prism(ctx, R([[-34, 4 + btn], [-18, 4 + btn], [-18, 12], [-34, 12]]), 16, M, { sil: 2 });
  ctx.save();
  ctx.fillStyle = '#050806';
  poly(ctx, R([[2, 10], [34, 10], [34, 13], [2, 13]]));
  ctx.fill();
  ctx.restore();
  prism(ctx, R(CAM_BARREL), 40, M, { sil: 3 });
  prism(ctx, R(CAM_HOOD), 44, M, { sil: 2.5 });
  // grip ribs and a viewfinder window
  if (!LOD.card) {
    ctx.save();
    ctx.strokeStyle = M.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = camLocal(pose, -40 + k * 7, 24), b = camLocal(pose, -40 + k * 7, 64);
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
    ctx.restore();
  }
  // glass: dark disc seen nearly edge-on at the hood's mouth, with a green rim
  const g = camLocal(pose, 105, 42);
  ctx.save();
  ctx.fillStyle = '#071009';
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.ellipse(g[0] + 6, g[1] - 4, 9, 24, pose.a, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function micrometer(ctx, dy, ext, spin) {
  const M = MAT.fresh;
  ctx.save();
  ctx.translate(D.x * RZ, D.y * RZ + dy);
  rodV(ctx, MX, BEAM_Y1 - dy - D.y * RZ, MIC_HEAD + 2, 12, M);
  prism(ctx, rect(MX - 36, MIC_HEAD, 72, 40), 36, M, { sil: 3.5 });
  // sleeve with graduations and a datum line
  rodV(ctx, MX, MIC_HEAD + 40, MIC_HEAD + 84, 22, M);
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(164,245,186,0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(MX - 3, MIC_HEAD + 44);
    ctx.lineTo(MX - 3, MIC_HEAD + 80);
    for (let k = 0; k < 8; k++) { const y = MIC_HEAD + 46 + k * 4.4; ctx.moveTo(MX - 3, y); ctx.lineTo(MX - (k % 2 ? 7 : 10), y); }
    ctx.stroke();
  }
  // thimble: knurled, turning as the spindle feeds
  const t0 = MIC_HEAD + 70, t1 = MIC_HEAD + 116;
  rodV(ctx, MX, t0, t1, 34, M);
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(6,14,9,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const a = spin + (k * Math.PI * 2) / 14;
      if (Math.cos(a) < 0.1) continue;
      const lx = MX + 16 * Math.sin(a);
      ctx.moveTo(lx, t0 + 6);
      ctx.lineTo(lx, t1 - 4);
    }
    ctx.stroke();
  }
  // spindle down to the tip
  const tip = TIP_REST + ext;
  rodV(ctx, MX, t1, tip, 10, M);
  ctx.fillStyle = '#a4f5ba';
  ctx.fillRect(MX - 5, tip - 3, 10, 3);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Builder: the session's hand, parked at the right, filing the flagged corner.

function builderColumn(ctx, act) {
  spriteAct(ctx, 'wl-col', [COL_X - 50, BOOM_Y - 60, 150, FLOOR - BOOM_Y + 70], act, builderColumnBody);
}
function builderColumnBody(ctx, act) {
  const SM = activeMat(MAT.session, act);
  contactShadow(ctx, COL_X + 30, FLOOR - 6, 70, 14, 0.55);
  prism(ctx, rect(COL_X - 38, FLOOR - 14, 90, 14), 60, SM, { sil: 2.5 });
  prism(ctx, rect(COL_X - 22, BOOM_Y - 22, 44, FLOOR - 14 - BOOM_Y + 22), 40, SM, { hatch: true, sil: 3.5 });
  prism(ctx, rect(COL_X - 28, BOOM_Y - 34, 56, 14), 46, SM, { sil: 3 });
}

// The arm is drawn from sprites made at its parked pose (M_REST, CORNER[1]) and moved; the boom is
// drawn longer than it ever shows and cut off inside the sleeve.
const ARM_BOOM = 220;
function builderArm(ctx, act, mx, my) {
  const ox = mx - M_REST, oy = my - CORNER[1];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, COL_X - 26, H);
  ctx.clip();
  ctx.translate(ox, 0);
  spriteAct(ctx, 'wl-boom', [M_REST + 22, BOOM_Y - 24, ARM_BOOM + 30, 40], act, (c, a) => {
    const headR = M_REST + 34;
    prism(c, shiftPts(rect(headR - 6, BOOM_Y - 9, ARM_BOOM, 18), 8), 20, activeMat(MAT.session, a), { hatch: true, sil: 3 });
  });
  ctx.restore();
  spriteAct(ctx, 'wl-sleeve', [COL_X - 82, BOOM_Y - 34, 90, 56], act, (c, a) => {
    prism(c, rect(COL_X - 76, BOOM_Y - 16, 60, 32), 34, activeMat(MAT.session, a), { hatch: true, sil: 3.5 });
  });
  ctx.save();
  ctx.translate(ox, oy);
  spriteAct(ctx, 'wl-head', [M_REST - 24, CORNER[1] - 60, 80, 82], act, (c, a) => builderHead(c, a, M_REST, CORNER[1]));
  ctx.restore();
}
function builderHead(ctx, act, mx, my) {
  const SM = activeMat(MAT.session, act);
  const head = [[mx - 15, my - 15], [mx + 15, my + 15], [mx + 34, my + 15], [mx + 34, my - 40], [mx - 15, my - 40]];
  prism(ctx, head, 34, SM, { hatch: true, sil: 3.5 });
  // file: a dark toothed strip along the 45 degree pad
  const A = [mx - 16, my - 16], B = [mx + 16, my + 16];
  ctx.save();
  ctx.fillStyle = '#0c1a11';
  poly(ctx, [A, B, [B[0] + 5, B[1] - 5], [A[0] + 5, A[1] - 5]]);
  ctx.fill();
  ctx.strokeStyle = SM.sil;
  ctx.lineWidth = lw(2.2);
  ctx.stroke();
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(114,242,140,0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let k = 1; k < 8; k++) {
      const u = k / 8, x = lerp(A[0], B[0], u), y = lerp(A[1], B[1], u);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 5, y - 2);
    }
    ctx.stroke();
  }
  ctx.restore();
  ball(ctx, mx + 22, my - 26, 6, SM);
}

// ---------------------------------------------------------------------------------------------
// Evidence cards: a dark card with the critic's own capture of the piece.

function cardFace(ctx, view, burr, amber) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, CH);
  g.addColorStop(0, '#18201a');
  g.addColorStop(1, '#0d120e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CW, CH);
  ctx.strokeStyle = 'rgba(194,201,186,0.75)';
  ctx.lineWidth = lw(2.5);
  ctx.strokeRect(1.5, 1.5, CW - 3, CH - 3);
  // frame corners of the capture
  ctx.strokeStyle = 'rgba(194,201,186,0.35)';
  ctx.lineWidth = lw(1.5);
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[12, 12, 1, 1], [CW - 12, 12, -1, 1], [12, CH - 12, 1, -1], [CW - 12, CH - 12, -1, -1]]) {
    ctx.moveTo(x, y + 10 * sy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 10 * sx, y);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(6, 6, CW - 12, CH - 12);
  ctx.clip();
  // the captured piece
  const k = view === 2 ? CARD_K2 : 0.52;
  const cx = view === 2 ? CARD_CX2 : CW / 2, top = view === 2 ? CARD_TOP2 : 22;
  const w = PW * k, h = PH * k, c = PC * k;
  const x = cx - w / 2;
  ctx.fillStyle = '#e9e9df';
  poly(ctx, blankPts(x, top, w, h, c));
  ctx.fill();
  ctx.fillStyle = '#0d120e';
  ctx.beginPath();
  ctx.arc(x + w * 0.35, top + h * 0.16, 4 * k + 1, 0, Math.PI * 2);
  ctx.fill();
  if (burr) {
    ctx.fillStyle = '#e9e9df';
    const bp = burrPts(0, 0).map(([px, py]) => [x + px * k, top + py * k]);
    poly(ctx, bp);
    ctx.fill();
  }
  if (view === 0) {
    // the micrometer's capture: a height between two contact marks
    ctx.strokeStyle = 'rgba(164,245,186,0.75)';
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    const dx = x + w + 14;
    ctx.moveTo(dx, top);
    ctx.lineTo(dx, top + h);
    ctx.moveTo(dx - 6, top + 6); ctx.lineTo(dx + 6, top - 6);
    ctx.moveTo(dx - 6, top + h + 6); ctx.lineTo(dx + 6, top + h - 6);
    ctx.moveTo(x + w + 2, top); ctx.lineTo(dx + 6, top);
    ctx.moveTo(x + w + 2, top + h); ctx.lineTo(dx + 6, top + h);
    ctx.stroke();
  }
  if (amber) {
    const [ax, ay] = AMBER_AT;
    ctx.strokeStyle = P.amber;
    ctx.lineWidth = lw(4);
    ctx.beginPath();
    ctx.arc(ax, ay, 19, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

const CARD_EDGE = { front: ['#18201a', '#0d120e'], top: '#c2c9ba', side: '#4f5a50' };

function cardFlat(ctx, x0, y0, th, view, burr, amber, s = 1) {
  ctx.save();
  tilt(ctx, x0, y0, CH * s, th);
  if (s !== 1) ctx.scale(s, s);
  cardFace(ctx, view, burr, amber);
  ctx.restore();
}

const CARD_K2 = 0.84, CARD_CX2 = 56, CARD_TOP2 = 30;
const AMBER_AT = [CARD_CX2 + (PW * CARD_K2) / 2 - (PC * CARD_K2) / 2 + 2, CARD_TOP2 + (PC * CARD_K2) / 2 - 2];
const cardOf = (s) => CARDS[(((s - K0) % PER_LOOP) + PER_LOOP) % PER_LOOP];

function trayLayers(ctx, t) {
  let shift = PER_LOOP * LAYER * indexEase(seg(t, 8.65, 8.79));
  let top = K0;
  for (let k = 0; k < CARDS.length; k++) if (t >= CARDS[k][3]) top = K0 + k + 1;
  // once the floor has indexed this loop's cards down, the stack is exactly the t = 0 stack
  if (t >= 8.79) { shift = 0; top = K0; }
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRAY_X0 + TWALL, 300, TRAY_X1 - TRAY_X0 + 80, TRAY_FLOOR - 300);
  ctx.clip();
  ctx.translate(0, shift);
  sprite(ctx, 'wl-tray' + top, TRAY_X0, 500, TRAY_X1 - TRAY_X0 + 80, TRAY_FLOOR - 500 + 4, (c) => trayStack(c, top));
  ctx.restore();
}
function trayStack(ctx, top) {
  const shift = 0;
  for (let s = 0; s < top; s++) {
    const yb = TRAY_FLOOR - s * LAYER + shift;
    if (yb - LAYER > TRAY_FLOOR) continue;
    const cd = cardOf(s);
    ctx.fillStyle = cd[7] ? P.amber : '#59625a';
    ctx.fillRect(TRAY_CX - CW / 2, yb - LAYER, CW, LAYER - 2.5);
    ctx.fillStyle = '#0a0e0b';
    ctx.fillRect(TRAY_CX - CW / 2, yb - 2.5, CW, 2.5);
  }
  const ts = top - 1;
  const cd = cardOf(ts);
  cardFlat(ctx, TRAY_CX - CW / 2, TRAY_FLOOR - ts * LAYER + shift - LAYER, Math.PI / 2, cd[5], cd[6], cd[7]);
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function trayBack(ctx) {
  const x0 = TRAY_X0 + TWALL, x1 = TRAY_X1 - TWALL;
  contactShadow(ctx, TRAY_CX + 40, FLOOR - 8, 140, 18, 0.55);
  // interior: back wall, left inner wall, floor
  ctx.save();
  let g = ctx.createLinearGradient(0, TRAY_TOP - 30, 0, TRAY_FLOOR);
  g.addColorStop(0, '#0b100c');
  g.addColorStop(1, '#060907');
  ctx.fillStyle = g;
  poly(ctx, [[x0, TRAY_TOP], pr(x0, TRAY_TOP, TRAY_D - TWALL), pr(x1, TRAY_TOP, TRAY_D - TWALL), pr(x1, TRAY_FLOOR, TRAY_D - TWALL), [x1, TRAY_FLOOR], [x0, TRAY_FLOOR]]);
  ctx.fill();
  ctx.fillStyle = '#1a231c';
  poly(ctx, [[x0, TRAY_TOP], pr(x0, TRAY_TOP, TRAY_D - TWALL), pr(x0, TRAY_FLOOR, TRAY_D - TWALL), [x0, TRAY_FLOOR]]);
  ctx.fill();
  ctx.fillStyle = '#121914';
  poly(ctx, [[x0, TRAY_FLOOR], [x1, TRAY_FLOOR], pr(x1, TRAY_FLOOR, TRAY_D - TWALL), pr(x0, TRAY_FLOOR, TRAY_D - TWALL)]);
  ctx.fill();
  // back wall top rim
  ctx.fillStyle = '#2b3a2f';
  poly(ctx, [pr(TRAY_X0, TRAY_TOP, TRAY_D - TWALL), pr(TRAY_X1, TRAY_TOP, TRAY_D - TWALL), pr(TRAY_X1, TRAY_TOP, TRAY_D), pr(TRAY_X0, TRAY_TOP, TRAY_D)]);
  ctx.fill();
  // left wall top
  ctx.fillStyle = '#43574a';
  poly(ctx, [[TRAY_X0, TRAY_TOP], [x0, TRAY_TOP], pr(x0, TRAY_TOP, TRAY_D), pr(TRAY_X0, TRAY_TOP, TRAY_D)]);
  ctx.fill();
  ctx.strokeStyle = '#4f6f57';
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.moveTo(TRAY_X0, TRAY_TOP);
  ctx.lineTo(...pr(TRAY_X0, TRAY_TOP, TRAY_D));
  ctx.lineTo(...pr(TRAY_X1, TRAY_TOP, TRAY_D));
  ctx.stroke();
  ctx.restore();
}

function trayFront(ctx) {
  const x1 = TRAY_X1 - TWALL;
  // right wall: top and outer face, in front of the cards inside
  ctx.save();
  ctx.fillStyle = '#43574a';
  poly(ctx, [[x1, TRAY_TOP], [TRAY_X1, TRAY_TOP], pr(TRAY_X1, TRAY_TOP, TRAY_D), pr(x1, TRAY_TOP, TRAY_D)]);
  ctx.fill();
  const g = ctx.createLinearGradient(TRAY_X1, 0, TRAY_X1 + 55, 0);
  g.addColorStop(0, '#1d2620');
  g.addColorStop(1, '#111713');
  ctx.fillStyle = g;
  poly(ctx, [[TRAY_X1, TRAY_TOP], pr(TRAY_X1, TRAY_TOP, TRAY_D), pr(TRAY_X1, FLOOR, TRAY_D), [TRAY_X1, FLOOR]]);
  ctx.fill();
  ctx.strokeStyle = '#4f6f57';
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  // cut faces of the front: hatched section
  for (const [x, y, w, h] of [[TRAY_X0, TRAY_TOP, TWALL, FLOOR - TRAY_TOP], [x1, TRAY_TOP, TWALL, FLOOR - TRAY_TOP], [TRAY_X0, TRAY_FLOOR, TRAY_X1 - TRAY_X0, FLOOR - TRAY_FLOOR]]) {
    ctx.fillStyle = '#1a231c';
    ctx.fillRect(x, y, w, h);
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    hatchPath(ctx, x, y, x + w, y + h, P.dim, 9, 2);
  }
  ctx.strokeStyle = '#4f6f57';
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.moveTo(TRAY_X0, FLOOR);
  ctx.lineTo(TRAY_X0, TRAY_TOP);
  ctx.lineTo(TRAY_X0 + TWALL, TRAY_TOP);
  ctx.lineTo(TRAY_X0 + TWALL, TRAY_FLOOR);
  ctx.lineTo(x1, TRAY_FLOOR);
  ctx.lineTo(x1, TRAY_TOP);
  ctx.lineTo(TRAY_X1, TRAY_TOP);
  ctx.lineTo(TRAY_X1, FLOOR);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// The board the evidence is clipped to for showing: an easel standing behind the tray (its legs go
// down behind the tray's back wall), drawn screen-aligned with the show spot.
const BOARD = [SHOW[0] - CW / 2 - 14, SHOW[1] - CH / 2 - 14, CW + 28, CH + 28];
function showBoard(ctx) {
  const feetY = FLOOR + D.y * 140;
  for (const dx of [-52, 52]) {
    contactShadow(ctx, SHOW[0] + dx + 8, feetY - 2, 22, 5, 0.5);
    rodV(ctx, SHOW[0] + dx, BOARD[1] + BOARD[3] - 4, feetY, 8, MAT.metal);
  }
  prism(ctx, rect(BOARD[0], BOARD[1], BOARD[2], BOARD[3]), 12, MAT.metal, { sil: 2.5 });
  // the board's face: a lit panel the print is held against
  const g = ctx.createLinearGradient(0, BOARD[1], 0, BOARD[1] + BOARD[3]);
  g.addColorStop(0, '#26332a');
  g.addColorStop(1, '#161d18');
  ctx.fillStyle = g;
  ctx.fillRect(BOARD[0] + 6, BOARD[1] + 6, BOARD[2] - 12, BOARD[3] - 12);
}
function boardClip(ctx) {
  const x = SHOW[0], y = SHOW[1] - CH / 2 - 8;
  prism(ctx, rect(x - 15, y, 30, 15), 8, MAT.lit, { sil: 2 });
  ctx.save();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 2);
  ctx.lineTo(x - 12, y - 12);
  ctx.lineTo(x + 12, y - 12);
  ctx.lineTo(x + 9, y + 2);
  ctx.stroke();
  ctx.restore();
}

// Where the lamp stands: on the piece while it waits and runs the rings, then on the inspection.
const LAMP_IN = 470, LAMP_INSPECT = 1230;
function lampX(t) {
  if (t >= 8.45) return lerp(LAMP_INSPECT, LAMP_IN, easeInOut(seg(t, 8.45, T)));
  return Math.min(LAMP_INSPECT, Math.max(LAMP_IN, feedX(t) + 40));
}
function lampPool(ctx, x) {
  let g = ctx.createRadialGradient(x, 600, 0, x, 600, 640);
  g.addColorStop(0, 'rgba(150,215,170,0.12)');
  g.addColorStop(0.5, 'rgba(150,215,170,0.045)');
  g.addColorStop(1, 'rgba(150,215,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.max(0, x - 640), 0, 1280, BENCH_Y - 92);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BENCH_Y - 92, W, 92);
  ctx.clip();
  ctx.translate(x, FLOOR - 6);
  ctx.scale(1, 0.12);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  g.addColorStop(0, 'rgba(225,240,225,0.10)');
  g.addColorStop(1, 'rgba(225,240,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-700, -700, 1400, 1400);
  ctx.restore();
}

function backLayer(ctx) {
  benchFinal(ctx, -6000, 600);
  showBoard(ctx);
  // rail and its posts
  for (const x of [118, RAIL_END - 26]) {
    contactShadow(ctx, x + 14, FLOOR - 4, 34, 7, 0.5);
    prism(ctx, rect(x - 8, P_BOT + 8, 16, FLOOR - P_BOT - 8), 24, MAT.metal, { sil: 2.5 });
  }
  for (const rx of RINGS) ringStand(ctx, rx);
  for (const rx of RINGS) ringHalf(ctx, rx, false);
  rodH(ctx, -20, RAIL_END, P_BOT + 4 + D.y * RZ, 9, MAT.metal);
  centreLine(ctx, 60, CY, RAIL_END + 40, CY, 0.35);
  trayBack(ctx);
}

function ringsFront(ctx) {
  for (const rx of RINGS) ringHalf(ctx, rx, true);
}

function frontLayer(ctx) {
  trayFront(ctx);
  // gantry beam and its end posts
  for (const x of [54, 1866]) prism(ctx, rect(x - 10, BEAM_Y1, 20, FLOOR - BEAM_Y1), 20, MAT.metal, { sil: 3 });
  prism(ctx, rect(36, BEAM_Y0, W - 72, BEAM_Y1 - BEAM_Y0), 30, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#060807';
  ctx.fillRect(900, BEAM_Y1 - 5, 700, 3);
  if (!LOD.card) for (let x = 120; x < W - 80; x += 160) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  boardClip(ctx);
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'wow-loop',
  name: '/wow-loop',
  caption: 'Evidence-gated review and repair loop',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'wow-loop-back', backLayer);
    const lx = lampX(t);
    lampPool(ctx, lx);

    // Builder column (behind the cradle and the piece).
    const act = easeInOut(seg(t, 3.7, 3.95)) - easeInOut(seg(t, 4.75, 5.1));
    builderColumn(ctx, act);

    // Cradle: pins drop at settle; gate opens in the seam and closes again.
    const gate = easeInOut(seg(t, 8.45, 8.57)) - easeInOut(seg(t, 8.8, 9.0));
    const pins = 1 - easeInOut(seg(t, 6.45, 6.95)) + easeInOut(seg(t, 8.65, 8.92));
    cradle(ctx, gate, pins);

    // The piece: feed through the rings, inspection, filing, settle, out through the gate.
    const fe = engage(t, FILE_T0, FILE_A);
    const burr = t < FILE_TC + 0.1;
    const filed = t >= FILE_TC + 0.1 ? 1 - easeInOut(seg(t, FILE_TC + 0.1, 6.0)) * 0.6 : 0;
    const px = feedX(t), pb = P_BOT + SETTLE * easeOut(seg(t, 6.45, 6.95));
    const leaving = t >= OUT_A;
    if (!leaving) {
      if (pb < SEAT - 1 || t < 6.45) contactShadow(ctx, px + 16, FLOOR - 6, 40, 7, 0.3);
      piece(ctx, px, pb, { burr, filed });
    }
    if (t >= 8.5) {
      const nx = lerp(-90, ENTRY, easeInOut(seg(t, 8.5, 9.0)));
      contactShadow(ctx, nx + 16, FLOOR - 6, 40, 7, 0.3);
      piece(ctx, nx, P_BOT, { burr: true });
    }

    cached(ctx, 'wow-loop-rings-front', ringsFront);
    const reset = indexEase(seg(t, 8.55, 8.69));
    RINGS.forEach((rx, i) => flag(ctx, rx, indexEase(seg(t, CLEAR[i], CLEAR[i] + 0.14)) * (1 - reset)));

    // Builder arm: telescopes in, files the corner (three strokes), withdraws.
    let st = 0;
    if (t >= fe.t1 && t < fe.t1 + 0.2) st = 5 * Math.sin(((t - fe.t1) / 0.2) * Math.PI * 3);
    builderArm(ctx, act, lerp(M_REST, CORNER[0], fe.d) + st * 0.707, CORNER[1] + st * 0.707);

    // Critics, round 1 then a new pair in round 2, clipped below the gantry beam.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, BEAM_Y1, W, H);
    ctx.clip();
    const flashes = [];
    for (const r of ROUNDS) {
      if (t < r.tin || t >= r.tout + 0.4) continue;
      const dy = freshDy(t, r);
      const me = engage(t, r.mic[0], r.mic[1]);
      const ext = 30 * me.d;
      micrometer(ctx, dy, ext, ext * 0.35);
      if (me.c > 0 && me.c < 1) flashes.push([MX + D.x * RZ, P_BOT - PH + D.y * RZ, me.c, 30]);
      const pose = camPose(t, r);
      let btn = 0;
      for (const c of r.clicks) {
        btn += 5 * (indexEase(seg(t, c, c + 0.14)) - indexEase(seg(t, c + 0.14, c + 0.28)));
        const gl = camLocal(pose, 108, 40);
        const u = (t - c - 0.05) / 0.12;
        if (u > 0 && u < 1) flashes.push([gl[0], gl[1], u, 24]);
      }
      camera(ctx, pose, btn);
    }
    ctx.restore();

    // Evidence tray, then cards in flight, on show and dropping in.
    trayLayers(ctx, t);
    for (let k = 0; k < CARDS.length; k++) {
      const [te, ta, th, td, src, view, cb, amber] = CARDS[k];
      if (t < te || t >= td) continue;
      if (t < th) {
        const r = te < 4 ? ROUNDS[0] : ROUNDS[1];
        let s0;
        if (src === 'cam') s0 = camLocal(camPose(te, r), 18, 4);
        else s0 = [MX + 40 + D.x * RZ, MIC_HEAD + 20 + D.y * RZ];
        const u0 = seg(t, te, ta);
        const u = u0 * u0 * (3 - 2 * u0);
        const s = 0.3 + 0.7 * u0 * u0;
        const c1 = src === 'cam' ? [s0[0] + 52, 250] : [s0[0] + 84, 330];
        const c2 = src === 'cam' ? [1450, 250] : [1600, 330];
        const cub = (a, b, c, d) => (1 - u) * (1 - u) * (1 - u) * a + 3 * (1 - u) * (1 - u) * u * b + 3 * (1 - u) * u * u * c + u * u * u * d;
        const cx = cub(s0[0], c1[0], c2[0], SHOW[0]), cy = cub(s0[1], c1[1], c2[1], SHOW[1]);
        ctx.save();
        ctx.fillStyle = 'rgba(2,4,3,0.35)';
        ctx.fillRect(cx - (CW / 2) * s + 6, cy - (CH / 2) * s + 9, CW * s, CH * s);
        ctx.restore();
        // the print's edge, lit along the top
        prism(ctx, rect(cx - (CW / 2) * s, cy - (CH / 2) * s, CW * s, CH * s), 4, CARD_EDGE, { noLines: true });
        cardFlat(ctx, cx - (CW / 2) * s, cy + (CH / 2) * s, 0, view, cb, amber, s);
      } else {
        const ud = seg(t, th, td);
        const u = ud * ud * (3 - 2 * ud);
        const slot = K0 + k;
        const yb = TRAY_FLOOR - slot * LAYER - LAYER;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, TRAY_FLOOR);
        ctx.clip();
        cardFlat(ctx, lerp(SHOW[0] - CW / 2, TRAY_CX - CW / 2, u), lerp(SHOW[1] + CH / 2, yb, u), (Math.PI / 2) * u, view, cb, amber);
        ctx.restore();
      }
    }

    cached(ctx, 'wow-loop-front', frontLayer);

    // The accepted piece leaving: in front of the builder column and the tray.
    if (leaving && t < OUT_B) {
      const q = outPose(t);
      ctx.save();
      ctx.translate(D.x * q.z, D.y * q.z);
      if (q.bot >= FLOOR - 1) contactShadow(ctx, q.x + 16, FLOOR - 6, 40, 7, 0.3);
      piece(ctx, q.x, q.bot, { rot: q.rot });
      ctx.restore();
    }

    lampFalloff(ctx, lx, 600, 420, 1250, 0.56);

    // Light on top of the lamp falloff.
    for (const [x, y, u, r] of flashes) contactGlow(ctx, x, y, u, r);
    contactGlow(ctx, CORNER[0], CORNER[1] + 2, fe.c, 34);
    if (t >= fe.t1 && t < fe.t1 + 0.5) {
      dust(ctx, CORNER[0] + 6, CORNER[1] + 6, t - fe.t1, 0x3f1, { ang: Math.PI * 0.3, spread: 1.4, n: 10, dur: 0.5 });
    }
    // the amber ring on the show card glows while it is held face up
    const amberCard = CARDS[1];
    if (t >= amberCard[1] && t < amberCard[2]) {
      softGlow(ctx, SHOW[0] - CW / 2 + AMBER_AT[0], SHOW[1] - CH / 2 + AMBER_AT[1], 34, P.amber, 0.28 * Math.sin(Math.PI * seg(t, amberCard[1], amberCard[2])));
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
