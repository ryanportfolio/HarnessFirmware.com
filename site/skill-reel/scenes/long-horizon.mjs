// /long-horizon at final fidelity (pitch A 3.3, same beats as the animatic's long-horizon.js).
// A dividing engine. A lead screw spans the bench; the carriage (the Manager, hatched: it persists)
// rides it. The work is a chain of blanks, one per step. Each round: a fresh go/no-go plug gauge
// comes down out of the beam on a cable and a lead seal is crimped onto it before anything else;
// it waits to one side. Then a fresh cutting bit drops into the tool post, rules one slot into the
// blank under the carriage, and is lobbed over the screw's end bearing into the discard bin. Only
// once the bit is gone does the sealed gauge run along the beam to the work: its GO pin slides into
// the slot, it lifts and turns end for end, and its NO-GO pin stops on the slot's mouth. Then the
// pawl lifts, the carriage indexes one pitch and the pawl drops into the next gap; the gauge reels
// back up into the beam. The ruled trail behind the station is verified progress. Seam: carriage,
// chain and screw thread shift left one pitch together; the bin's magazine sinks by one bit.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  rgba, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, activeMat,
} from '../kit.mjs';

const T = 9.0;
const smooth = (u) => u * u * (3 - 2 * u);

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const PITCH = 130; // one step = one blank = one pitch of the engine
const CX0 = 640; // the cutting station, left third
const BW = 100, BH = 150, B_T = 14;
const BED_TOP = 728, B_TOP = BED_TOP - BH;
const MARK_TOP = B_TOP, MARK_BOT = 690, MARK_W = 9; // the ruled slot opens at the blank's top edge
const LINK_Y = 711;

const SCREW_Y = 375, SCREW_D = 30, THREAD = 26, SCREW_END = 1300; // THREAD divides PITCH
const CAR_Y0 = 335, CAR_Y1 = 420, CAR_HW = 80;
const SEAT_TIP = 465, BIT_L = 100, BIT_W = 20; // bit tip when seated in the post
const RULE_DROP = MARK_BOT - SEAT_TIP; // post travel down to the foot of the slot

const BEAM_Y0 = 236, BEAM_Y1 = 258;

// The auditor: a double-ended go/no-go plug gauge. A bar hung at its middle on a cable from the
// beam slot; a long thin GO pin at one end, a short fat NO-GO pin at the other.
const GX_WAIT = 300, GX_TEST = CX0 - 100; // cable x while it waits, and at the work
const G_OFF = 100, G_HALF = 112, G_R = 13, G_SHANK = 13, G_GRIP = 36; // G_R: half the handle and collar diameter
const GO_L = 60, GO_W = 7, NOGO_L = 20, NOGO_W = 18;
const YB_WAIT = 470; // bar centre while waiting and running
const YB_GO = B_TOP - G_R; // GO all the way in: the bar sits on the blank tops
const YB_LIFT = 490; // GO clear of the slot
const YB_NOGO = B_TOP - NOGO_L - G_R; // NO-GO stopped on the slot's mouth

// Discard bin with a sinking magazine floor.
const BIN = { x0: 1648, x1: 1840, y0: 448, y1: 568, d: 64 };
const BIN_LAYER = 24, BIN_N = 4;
const binLayerY = (j) => BIN.y1 - 14 - j * BIN_LAYER;
const BIN_TIP_X = (BIN.x0 + BIN.x1) / 2 + 46; // a spent bit lies with its point here
const BIN_WIN = { x0: 1656, x1: 1832, y0: 368, y1: 560 }; // the magazine's visible window

// ---------------------------------------------------------------------------------------------
// Timing.

const GAUGE_IN = 0.0, SEAL = [0.62, 0.82], G_STOW = [0.95, 1.3]; // sealed, then reeled up out of the way
const BIT_IN = [1.0, 1.5], DESCEND = [1.5, 1.75], RULE = [1.75, 2.75], RETRACT = [2.78, 3.0];
const TOSS = [3.0, 3.74], LIFT_OUT = 3.12, LAND = 3.62; // pluck, fly, land nose first and topple
const G_DROP = 3.66, G_RUN = [4.02, 4.28], G_GO = [4.28, 4.56], G_LIFT = [4.6, 4.72], G_SPIN = [4.72, 5.0], G_NOGO = [5.0, 5.12];
const PAWL_UP = [5.28, 5.4], INDEX = [5.4, 5.78], PAWL_DOWN = [5.74, 5.86];
const G_OUT = [7.4, 7.8];
const SEAM = [8.2, 9.0], SINK = [8.2, 8.36];

const seamOff = (t) => -PITCH * easeInOut(seg(t, SEAM[0], SEAM[1]));
const carriageX = (t) => CX0 + PITCH * indexEase(seg(t, INDEX[0], INDEX[1])) + seamOff(t);

// ---------------------------------------------------------------------------------------------
// Layers cached per device scale (one scale per id), drawn translated or cropped. Like kit cached(),
// a layer is drawn with the same calls every time, so the output never depends on the cache.

const bands = new Map();
function band(ctx, id, x0, y0, w, h, draw) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  let L = bands.get(id);
  if (!L || L.s !== s) {
    if (L) L.cv.width = L.cv.height = 0;
    const cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
    const cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.scale(cw / w, ch / h);
    c.translate(-x0, -y0);
    const saved = { ...LOD };
    setLod(c);
    draw(c);
    Object.assign(LOD, saved);
    L = { cv, s, kx: cw / w, ky: ch / h, x0, y0, w, h };
    bands.set(id, L);
  }
  return L;
}
// Whole layer at an offset.
const put = (ctx, L, dx = 0, dy = 0) => ctx.drawImage(L.cv, L.x0 + dx, L.y0 + dy, L.w, L.h);
// The stage rect (sx, sy, sw, sh) of the layer, drawn at (dx, dy).
const blit = (ctx, L, sx, sy, sw, sh, dx, dy) =>
  ctx.drawImage(L.cv, (sx - L.x0) * L.kx, (sy - L.y0) * L.ky, sw * L.kx, sh * L.ky, dx, dy, sw, sh);

// ---------------------------------------------------------------------------------------------
// The chain of blanks: one static strip, ruled behind the station and blank ahead of it. The
// strip repeats every pitch, so the seam slide is the strip translated; the slot being ruled on
// the station's blank is drawn live on top.

const BLANK_MAT = { ...MAT.ivory, line: 'rgba(120,124,112,0.5)' };
const CHAIN = { x0: -304, y0: 552, w: 2576, h: 192 };

function blankPts(cx) {
  const x = cx - BW / 2, y = B_TOP, c = 22;
  return [[x, y], [x + BW - c, y], [x + BW, y + c], [x + BW, y + BH], [x, y + BH]];
}

function chainStrip(ctx) {
  for (let k = -7; k <= 12; k++) {
    const cx = CX0 + k * PITCH;
    const xa = cx + BW / 2 - 18, xb = cx + PITCH - BW / 2 + 18;
    prism(ctx, rect(xa, LINK_Y - 8, xb - xa, 16), 8, MAT.metal, { sil: 2 });
  }
  for (let k = -7; k <= 12; k++) {
    const cx = CX0 + k * PITCH;
    prism(ctx, blankPts(cx), B_T, BLANK_MAT);
    ctx.strokeStyle = 'rgba(255,255,250,0.85)';
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    ctx.moveTo(cx - BW / 2 + 1, B_TOP + 1.5);
    ctx.lineTo(cx + BW / 2 - 23, B_TOP + 1.5);
    ctx.stroke();
    hole(ctx, cx - BW / 2 + BW * 0.3, B_TOP + 26, 8, B_T, MAT.ivory);
    for (const px of [cx - BW / 2 + 12, cx + BW / 2 - 12]) ball(ctx, px, LINK_Y, 5, MAT.lit);
    if (k < 0) slot(ctx, cx, MARK_TOP, MARK_BOT);
  }
}

// The ruled slot: dark groove, its lit far wall and shaded near wall.
function slot(ctx, x, y0, y1) {
  const w = lw(MARK_W);
  ctx.fillStyle = '#1b2019';
  ctx.fillRect(x - w / 2, y0, w, y1 - y0);
  if (!LOD.card) {
    ctx.fillStyle = 'rgba(255,255,250,0.7)';
    ctx.fillRect(x + w / 2, y0 + 1, 1.6, y1 - y0 - 1);
    ctx.fillStyle = 'rgba(70,74,64,0.85)';
    ctx.fillRect(x - w / 2 - 1.5, y0, 1.5, y1 - y0);
  }
}

// Length of the slot on the station's blank, ruled upward from the foot.
function markLen(t) {
  if (t < RULE[0]) return 0;
  return (MARK_BOT - MARK_TOP) * easeInOut(seg(t, RULE[0], RULE[1]));
}

// Depth falloff on the chain: the blank at the station keeps full light, the verified trail
// recedes, the blanks still to do recede further. Fixed to the station, so the seam slide carries
// the ruled blank into the trail's shade and the next blank into the light.
function shade(ctx) {
  const x = CX0, a0 = 0.36, a1 = 0.6;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  const at = (v) => clamp01(v / W);
  g.addColorStop(0, `rgba(10,13,11,${a0})`);
  g.addColorStop(at(x - 96), `rgba(10,13,11,${a0})`);
  g.addColorStop(at(x - 58), 'rgba(10,13,11,0)');
  g.addColorStop(at(x + 58), 'rgba(10,13,11,0)');
  g.addColorStop(at(x + 96), `rgba(10,13,11,${a1})`);
  g.addColorStop(1, `rgba(10,13,11,${a1})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, B_TOP - 6, W, BED_TOP - B_TOP + 6);
}

// ---------------------------------------------------------------------------------------------
// Lead screw threads: a static strip, slid by the thread phase and cropped at the end bearing.

const THR = { x0: -32, y0: 352, w: SCREW_END + 32 + 4, h: 48 };

function threadStrip(ctx) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(THR.x0, SCREW_Y - SCREW_D / 2, THR.w, SCREW_D);
  ctx.clip();
  if (LOD.card) {
    ctx.strokeStyle = '#0b100c';
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    for (let x = -THREAD; x < SCREW_END; x += THREAD) { ctx.moveTo(x, SCREW_Y + SCREW_D / 2); ctx.lineTo(x + 10, SCREW_Y - SCREW_D / 2); }
    ctx.stroke();
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#080c09';
    ctx.beginPath();
    for (let x = -THREAD; x < SCREW_END; x += THREAD) { ctx.moveTo(x, SCREW_Y + SCREW_D / 2); ctx.lineTo(x + 11, SCREW_Y - SCREW_D / 2); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(134,169,142,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -THREAD + 5; x < SCREW_END; x += THREAD) { ctx.moveTo(x, SCREW_Y + SCREW_D / 2); ctx.lineTo(x + 11, SCREW_Y - SCREW_D / 2); }
    ctx.stroke();
  }
  ctx.restore();
}

function threads(ctx, phase) {
  let ph = ((phase % THREAD) + THREAD) % THREAD;
  if (ph < 1e-4 || ph > THREAD - 1e-4) ph = 0;
  const L = band(ctx, 'long-horizon-threads', THR.x0, THR.y0, THR.w, THR.h, threadStrip);
  const x1 = SCREW_END - 14; // the bearing block's face
  blit(ctx, L, -ph, THR.y0, x1, THR.h, 0, THR.y0);
}

// ---------------------------------------------------------------------------------------------
// The carriage, the pawl, the post and the bit.

function carriage(ctx, cx, active) {
  const SM = activeMat(MAT.session, active);
  // nut collars where the screw enters
  for (const x of [cx - CAR_HW - 12, cx + CAR_HW]) prism(ctx, rect(x, SCREW_Y - 24, 12, 48), 40, SM, { sil: 2.5 });
  prism(ctx, rect(cx - CAR_HW, CAR_Y0, CAR_HW * 2, CAR_Y1 - CAR_Y0), 56, SM, { hatch: true, sil: 3.5 });
  if (!LOD.card) {
    // gib screws
    ctx.fillStyle = '#3f7d52';
    ctx.beginPath();
    for (const x of [cx - CAR_HW + 12, cx + CAR_HW - 12]) for (const y of [CAR_Y0 + 12, CAR_Y1 - 12]) { ctx.moveTo(x + 3.5, y); ctx.arc(x, y, 3.5, 0, Math.PI * 2); }
    ctx.fill();
  }
}

function pawl(ctx, cx, lift) {
  // hangs from a bracket under the carriage's right end; the nose sits in the gap between this
  // blank and the next, and swings up and right, clear of the blank tops, to release
  const px = cx + PITCH / 2, py = 550;
  const a = Math.PI / 2 - 1.2 * lift;
  const L = 50;
  const ex = px + L * Math.cos(a), ey = py + L * Math.sin(a);
  prism(ctx, rect(px - 11, CAR_Y1 - 4, 22, py - CAR_Y1 + 8), 24, MAT.session, { hatch: true, sil: 2.5 });
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0a150e';
  ctx.lineWidth = lw(14);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.strokeStyle = '#24492f';
  ctx.lineWidth = lw(10);
  ctx.stroke();
  // square tooth that seats between the blanks, turned with the lever
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const q = (s, w) => [ex + ux * s + vx * w, ey + uy * s + vy * w];
  ctx.fillStyle = '#3f7d52';
  ctx.beginPath();
  for (const [s, w] of [[-6, -9], [-6, 9], [10, 7], [10, -7]]) { const p = q(s, w); ctx.lineTo(p[0], p[1]); }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(px - 4, py);
  ctx.lineTo(ex - 4, ey);
  ctx.lineWidth = lw(2.2);
  ctx.stroke();
  ctx.restore();
  ball(ctx, px, py, 7, MAT.session);
  return [ex, ey + 10];
}

// The fresh cutting bit: square shank, ground graver point. Drawn about its tip, angle 0 = point down.
function bit(ctx, x, y, ang, mat = MAT.fresh) {
  ctx.save();
  ctx.translate(x, y);
  if (ang) ctx.rotate(ang);
  const w = BIT_W, L = BIT_L;
  prism(ctx, [[-w / 2, -L], [w / 2, -L], [w / 2, -26], [0, 0], [-w / 2, -26]], 10, mat, { sil: 2.6 });
  if (!LOD.card) {
    ctx.strokeStyle = rgba(P.glow, 0.5 * (mat === MAT.fresh ? 1 : 0.35));
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -L + 6);
    ctx.lineTo(-w / 2 + 4, -30);
    ctx.lineTo(-1, -4);
    ctx.stroke();
  }
  ctx.restore();
}

// Post travel below the seated position (0 at rest).
function postDrop(t) {
  if (t < DESCEND[0] || t >= RETRACT[1]) return 0;
  if (t < DESCEND[1]) return RULE_DROP * easeInOut(seg(t, DESCEND[0], DESCEND[1]));
  if (t < RULE[1]) return RULE_DROP - (MARK_BOT - MARK_TOP) * easeInOut(seg(t, RULE[0], RULE[1]));
  return (MARK_TOP - SEAT_TIP) * (1 - easeIn(seg(t, RETRACT[0], RETRACT[1])));
}

// Bit pose: [x, tipY, angle] or null. After ruling it is plucked out of the post, tipping as it
// rises, then thrown: one ballistic arc (constant run, gravity on the rise) high over the end
// bearing and down into the bin's opening point first; it lands on the stack and topples flat.
// Angle 0 = point down; in flight the point turns to lead along the path.
const Y_PLUCK = SEAT_TIP - 45, A_PLUCK = -0.6, LOB_H = 160;
const LAND_Y = binLayerY(BIN_N) + 10;
const flightY = (u) => lerp(Y_PLUCK, LAND_Y, u) - 4 * LOB_H * u * (1 - u);
const flightA = (u) => { const vy = (LAND_Y - Y_PLUCK) - 4 * LOB_H * (1 - 2 * u), vx = BIN_TIP_X - CX0; return Math.atan2(-vx, vy); };
function bitPose(t, cx) {
  if (t < BIT_IN[0] || t >= TOSS[1]) return null;
  if (t < BIT_IN[1]) return [cx, SEAT_TIP - 560 * (1 - springStep(t - BIT_IN[0], 0.86, 12.5)), 0];
  if (t < TOSS[0]) return [cx, SEAT_TIP + postDrop(t), 0];
  if (t < LIFT_OUT) { const u = easeOut(seg(t, TOSS[0], LIFT_OUT)); return [cx, lerp(SEAT_TIP, Y_PLUCK, u), A_PLUCK * u]; }
  if (t < LAND) {
    const u = seg(t, LIFT_OUT, LAND);
    return [lerp(cx, BIN_TIP_X, u), flightY(u), lerp(A_PLUCK, flightA(u), smooth(Math.min(1, u / 0.35)))];
  }
  // toppling flat about its point
  return [BIN_TIP_X, LAND_Y, lerp(flightA(1), -Math.PI / 2, easeIn(seg(t, LAND, TOSS[1])))];
}

function postAndClamp(ctx, cx, drop, active) {
  const SM = activeMat(MAT.session, active);
  const cy = SEAT_TIP - BIT_L + 14 + drop; // clamp top
  if (drop > 2) rodV(ctx, cx, CAR_Y1 - 6, cy + 2, 14, SM);
  prism(ctx, rect(cx - 22, cy, 44, 32), 30, SM, { hatch: true, sil: 3 });
  ball(ctx, cx + 14, cy + 16, 4.5, MAT.lit);
}

// ---------------------------------------------------------------------------------------------
// The gauge.

// Bar centre y, cable x and turn angle at t; null when it is up inside the beam.
function gaugePose(t) {
  let gx = GX_WAIT, yb, th = 0;
  if (t < G_DROP) {
    // comes down fresh, is sealed, and reels back up before the bit exists
    yb = YB_WAIT - 640 * (1 - springStep(t - GAUGE_IN, 0.82, 11)) - 700 * easeIn(seg(t, G_STOW[0], G_STOW[1]));
  } else {
    // comes back down, seal on, only once the bit is gone, and runs along the beam to the work
    yb = YB_WAIT - 640 * (1 - springStep(t - G_DROP, 0.82, 11));
    gx = lerp(GX_WAIT, GX_TEST, easeInOut(seg(t, G_RUN[0], G_RUN[1])));
    if (t >= G_GO[0]) yb = lerp(yb, YB_GO, easeInOut(seg(t, G_GO[0], G_GO[1])));
    if (t >= G_LIFT[0]) yb = lerp(YB_GO, YB_LIFT, easeInOut(seg(t, G_LIFT[0], G_LIFT[1])));
    th = Math.PI * easeInOut(seg(t, G_SPIN[0], G_SPIN[1]));
    if (t >= G_NOGO[0]) {
      // drops onto the slot's mouth and stops dead: a hard landing with one small rebound
      const u = seg(t, G_NOGO[0], G_NOGO[1]);
      yb = lerp(YB_LIFT, YB_NOGO, easeIn(u));
      const tau = t - G_NOGO[1];
      if (tau > 0) yb -= 3.2 * Math.exp(-18 * tau) * Math.sin(Math.min(Math.PI, 30 * tau));
    }
    if (t >= G_OUT[0]) yb -= 700 * easeIn(seg(t, G_OUT[0], G_OUT[1]));
  }
  if (yb < BEAM_Y0 - 140) return null;
  return { gx, yb, th };
}

// Time the GO pin's tip reaches the slot's mouth (for the contact light).
const T_GO_IN = (() => {
  const target = (B_TOP - G_R - GO_L - YB_WAIT) / (YB_GO - YB_WAIT);
  let a = 0, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (easeInOut(m) < target) a = m; else b = m; }
  return lerp(G_GO[0], G_GO[1], a);
})();

const PIN_LIT = { ...MAT.fresh, top: '#5fae78' };

function gauge(ctx, g, sealU) {
  const { gx, yb, th } = g;
  const c = Math.cos(th), s = Math.sin(th);
  const at = (u) => [gx + u * c + D.x * u * s, yb + D.y * u * s];
  const by = G_R;
  ctx.save();
  // cable from the beam slot to the eye
  ctx.strokeStyle = '#060807';
  ctx.lineWidth = lw(5);
  ctx.beginPath();
  ctx.moveTo(gx, BEAM_Y1 - 3);
  ctx.lineTo(gx, yb - by - 12);
  ctx.stroke();
  ctx.strokeStyle = '#7f9c86';
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  // GO pin (at +G_OFF), always the far one while it turns; then the bar; then the NO-GO pin
  const k = LOD.card ? 1.5 : 1;
  const go = at(G_OFF), ng = at(-G_OFF);
  rodV(ctx, go[0], go[1] + by - 2, go[1] + by + GO_L - 4, GO_W * k, PIN_LIT);
  ctx.fillStyle = P.green;
  poly(ctx, [[go[0] - GO_W * k / 2, go[1] + by + GO_L - 4], [go[0] + GO_W * k / 2, go[1] + by + GO_L - 4], [go[0] + 1.5, go[1] + by + GO_L], [go[0] - 1.5, go[1] + by + GO_L]]);
  ctx.fill();
  // the bar, turned from one piece: thin shanks out to a collar at each end, a fat grip in the
  // middle. Each section is a stroke along the bar's axis, shaded as a cylinder lit from above.
  const seg2 = (u0, u1) => { const p = at(u0), q = at(u1); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
  const shanks = () => { ctx.beginPath(); seg2(-G_HALF, -G_GRIP); seg2(G_GRIP, G_HALF); };
  const fats = () => { ctx.beginPath(); seg2(-G_GRIP, G_GRIP); seg2(-G_OFF - 9, -G_OFF + 9); seg2(G_OFF - 9, G_OFF + 9); };
  const cyl = (r) => { const gr = ctx.createLinearGradient(0, yb - r, 0, yb + r); gr.addColorStop(0, '#5fae78'); gr.addColorStop(0.35, '#2f6a45'); gr.addColorStop(1, '#0e1d14'); return gr; };
  ctx.lineCap = 'butt';
  ctx.strokeStyle = P.green;
  shanks(); ctx.lineWidth = G_SHANK + lw(4.5); ctx.stroke();
  fats(); ctx.lineWidth = 2 * G_R + lw(4.5); ctx.stroke();
  shanks(); ctx.strokeStyle = cyl(G_SHANK / 2); ctx.lineWidth = G_SHANK; ctx.stroke();
  fats(); ctx.strokeStyle = cyl(G_R); ctx.lineWidth = 2 * G_R; ctx.stroke();
  if (!LOD.card) {
    // lit line along the top of the grip, and the grip's turned grooves
    ctx.beginPath();
    const p0 = at(-G_GRIP + 2), p1 = at(G_GRIP - 2);
    ctx.moveTo(p0[0], p0[1] - by + 4);
    ctx.lineTo(p1[0], p1[1] - by + 4);
    ctx.strokeStyle = 'rgba(200,250,214,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (Math.abs(c) > 0.3) {
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) { if (!i) continue; const p = at(i * 9.5 * Math.sign(c)); ctx.moveTo(p[0], p[1] - by + 3); ctx.lineTo(p[0], p[1] + by - 3); }
      ctx.strokeStyle = 'rgba(8,14,10,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  // NO-GO pin: short, two slots wide, with a turned ring that marks it
  rodV(ctx, ng[0], ng[1] + by - 2, ng[1] + by + NOGO_L, NOGO_W * k, PIN_LIT);
  ctx.fillStyle = '#0e1d14';
  ctx.fillRect(ng[0] - NOGO_W * k / 2, ng[1] + by + 6, NOGO_W * k, 3 * k);
  // the eye on top, and the lead seal crimped on its wire
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  ctx.arc(gx, yb - by - 7, 5.5, 0, Math.PI * 2);
  ctx.stroke();
  if (sealU > 0) {
    const dy = (1 - indexEase(sealU)) * -38;
    const sx = gx, sy = yb + dy;
    ctx.globalAlpha *= clamp01(sealU * 4);
    ctx.strokeStyle = '#a3c2aa';
    ctx.lineWidth = lw(1.8);
    ctx.beginPath();
    ctx.moveTo(gx - 3, yb - by - 6);
    ctx.quadraticCurveTo(gx - 16, sy - 12, sx - 4, sy - 8);
    ctx.stroke();
    const r = LOD.card ? 13 : 12; // 24 units across: 6 px on a card
    const sg = ctx.createRadialGradient(sx - 3, sy - 3, 1, sx, sy, r);
    sg.addColorStop(0, '#fdfdf7');
    sg.addColorStop(1, '#bfc0b4');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7d8a7f';
    ctx.fillRect(sx - r * 0.45, sy - 1.5, r * 0.9, 3);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The bin: spent bits stacked on a magazine floor that sinks one bit per round.

const SPENT = { ...MAT.fresh, front: ['#1b3325', '#10201a'], top: '#2a5038', sil: '#3a7a50', hi: '#4f8a62', line: '#24412f' };

function magazine(ctx) {
  for (let j = 0; j < BIN_N; j++) bit(ctx, BIN_TIP_X, binLayerY(j) + 10, -Math.PI / 2, SPENT);
}

function binContents(ctx, t) {
  const L = band(ctx, 'long-horizon-magazine', BIN_WIN.x0, BIN_WIN.y0 - BIN_LAYER, BIN_WIN.x1 - BIN_WIN.x0, BIN_WIN.y1 - BIN_WIN.y0 + BIN_LAYER, magazine);
  // after the sink the stack looks exactly as it did at the start of the round
  const sinking = t >= TOSS[1] && t < SINK[1];
  const sink = sinking ? BIN_LAYER * indexEase(seg(t, SINK[0], SINK[1])) : 0;
  const w = BIN_WIN.x1 - BIN_WIN.x0, h = BIN_WIN.y1 - BIN_WIN.y0;
  blit(ctx, L, BIN_WIN.x0, BIN_WIN.y0 - sink, w, h, BIN_WIN.x0, BIN_WIN.y0);
  if (sinking) bit(ctx, BIN_TIP_X, binLayerY(BIN_N) + 10 + sink, -Math.PI / 2, SPENT);
}

// Fresh tools come out of the beam: nothing of theirs shows above it (the caption band stays empty).
function belowBeam(ctx, fn) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BEAM_Y0 + 6, W, H);
  ctx.clip();
  fn();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 700, 600);
  // bin on its bracket, behind the chain
  const bcx = (BIN.x0 + BIN.x1) / 2;
  prism(ctx, rect(bcx - 14, BIN.y1, 20, FLOOR - 20 - BIN.y1), 30, MAT.metal, { sil: 2.5 });
  const dx = D.x * BIN.d, dy = D.y * BIN.d;
  ctx.fillStyle = '#0a0e0b';
  poly(ctx, [[BIN.x0, BIN.y0], [BIN.x1, BIN.y0], [BIN.x1 + dx, BIN.y0 + dy], [BIN.x0 + dx, BIN.y0 + dy]]);
  ctx.fill();
  prism(ctx, rect(BIN.x0 + dx, BIN.y0 + dy, BIN.x1 - BIN.x0, BIN.y1 - BIN.y0), 4, MAT.metal, { sil: 2.5 });
  ctx.fillStyle = '#0d120f';
  ctx.fillRect(BIN.x0 + 4, BIN.y0, BIN.x1 - BIN.x0 - 8, BIN.y1 - BIN.y0);
  // the bed the chain slides on
  contactShadow(ctx, W / 2, FLOOR - 8, W * 0.6, 18, 0.55);
  prism(ctx, rect(-20, BED_TOP, W + 40, FLOOR - BED_TOP), 80, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#4f6f57';
  ctx.fillRect(0, BED_TOP + 1, W, 2);
  ctx.fillStyle = '#080b09';
  ctx.fillRect(0, BED_TOP + 20, W, 4);
  if (!LOD.card) for (let x = 60; x < W; x += 240) { ball(ctx, x, BED_TOP + 34, 3.5, MAT.metal); }
  contactShadow(ctx, W / 2, BED_TOP - 2, W * 0.7, 6, 0.5);
  // one pitch: the distance the carriage indexes each round
  dimension(ctx, CX0, BED_TOP + 26, CX0 + PITCH, BED_TOP + 26, 12, 0.55);
  // the lead screw rod (threads are drawn on top, moving)
  rodH(ctx, -10, SCREW_END, SCREW_Y, SCREW_D, MAT.lit);
  centreLine(ctx, 0, SCREW_Y, SCREW_END + 60, SCREW_Y, 0.25);
  // end bearing on its stand
  prism(ctx, rect(SCREW_END - 2, SCREW_Y + 26, 28, BED_TOP - SCREW_Y - 26), 40, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(SCREW_END - 14, SCREW_Y - 32, 52, 64), 50, MAT.lit, { sil: 3 });
  hole(ctx, SCREW_END + 12, SCREW_Y, 10, 50, MAT.lit);
  for (const y of [SCREW_Y - 22, SCREW_Y + 22]) ball(ctx, SCREW_END + 30, y, 3.5, MAT.lit);
}

const BINF = { x0: 1640, y0: 424, w: 272, h: 152 };
function binFront(ctx) {
  // wire front so the spent bits show through
  const x0 = BIN.x0, x1 = BIN.x1, y0 = BIN.y0, y1 = BIN.y1;
  ctx.strokeStyle = '#2c3d31';
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  for (let x = x0 + 20; x < x1 - 8; x += 22) { ctx.moveTo(x, y0 + 4); ctx.lineTo(x, y1 - 4); }
  ctx.stroke();
  prism(ctx, rect(x0, y1 - 14, x1 - x0, 14), BIN.d, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(x0, y0, 10, y1 - y0), BIN.d, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(x1 - 10, y0, 10, y1 - y0), BIN.d, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(x0, y0, x1 - x0, 8), BIN.d, MAT.metal, { sil: 2.5 });
}

function frontLayer(ctx) {
  // the overhead beam fresh tools come down from, on two end posts, with the slot they run in
  for (const x of [26, 1872]) {
    prism(ctx, rect(x, BEAM_Y1, 22, BED_TOP - BEAM_Y1), 24, MAT.metal, { sil: 3 });
  }
  prism(ctx, rect(14, BEAM_Y0, W - 28, BEAM_Y1 - BEAM_Y0), 30, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#060807';
  ctx.fillRect(240, BEAM_Y1 - 5, 1360, 3);
  if (!LOD.card) for (let x = 120; x < W - 80; x += 180) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  lampFalloff(ctx, 690, 560, 400, 1250, 0.58);
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'long-horizon',
  name: '/long-horizon',
  caption: 'Run big tasks in audited rounds',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'long-horizon-final-back', backLayer);

    const off = seamOff(t);
    const cx = carriageX(t);
    threads(ctx, cx - CX0);

    // the chain: past the seam's midpoint the strip is drawn one pitch on, where the station's
    // blank is already a ruled one, so the last frame is drawn exactly like the first
    const second = off <= -PITCH / 2;
    let o = second ? off + PITCH : off;
    if (Math.abs(o) < 1e-3) o = 0;
    put(ctx, band(ctx, 'long-horizon-chain', CHAIN.x0, CHAIN.y0, CHAIN.w, CHAIN.h, chainStrip), o, 0);
    const len = markLen(t);
    if (!second && len > 0.5) slot(ctx, CX0 + off, MARK_BOT - len, MARK_BOT);
    put(ctx, band(ctx, 'long-horizon-shade', 0, B_TOP - 10, W, BED_TOP - B_TOP + 18, shade));

    // bin: contents, then the falling bit once it is over the bin, then the wire front
    binContents(ctx, t);
    const bp = bitPose(t, CX0);
    const overBin = bp && bp[0] > BIN.x0 - 40;
    if (overBin) bit(ctx, bp[0], bp[1], bp[2]);
    put(ctx, band(ctx, 'long-horizon-binfront', BINF.x0, BINF.y0, BINF.w, BINF.h, binFront));

    // carriage: lit while the round works, dims through the hold
    const active = easeInOut(seg(t, 0.9, 1.2)) - easeInOut(seg(t, 5.9, 6.5));
    const pl = indexEase(seg(t, PAWL_UP[0], PAWL_UP[1])) - indexEase(seg(t, PAWL_DOWN[0], PAWL_DOWN[1]));
    contactShadow(ctx, cx + 20, B_TOP - 4, 90, 7, 0.35);
    const nose = pawl(ctx, cx, clamp01(pl));
    carriage(ctx, cx, active);
    if (bp && !overBin) belowBeam(ctx, () => bit(ctx, bp[0], bp[1], bp[2]));
    postAndClamp(ctx, cx, postDrop(t), active);

    // the sealed gauge
    const gp = gaugePose(t);
    if (gp) belowBeam(ctx, () => gauge(ctx, gp, seg(t, SEAL[0], SEAL[1])));

    cached(ctx, 'long-horizon-final-front', frontLayer);

    // light: seat, ruling contact along the cut only, GO entering, NO-GO stopping, pawl click
    contactGlow(ctx, CX0, SEAT_TIP - BIT_L + 30, (t - BIT_IN[1] + 0.06) / 0.12, 24);
    if (t >= RULE[0] && t < RULE[1] + 0.06) {
      const y = MARK_BOT - markLen(t);
      const a = Math.min(1, (t - RULE[0]) / 0.06) * (1 - seg(t, RULE[1] - 0.02, RULE[1] + 0.06));
      softGlow(ctx, CX0, y, 30, P.bright, 0.55 * a);
      ctx.fillStyle = `rgba(240,255,244,${0.9 * a})`;
      ctx.beginPath();
      ctx.arc(CX0, y, 4.5 * LOD.k, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const ti = RULE[0] + i * 0.2;
        dust(ctx, CX0 + 6, MARK_BOT - markLen(ti), t - ti, 0x1a0 + i, { ang: -Math.PI * 0.15, spread: 1.0, n: 4, dur: 0.4 });
      }
    }
    contactGlow(ctx, CX0, B_TOP, (t - T_GO_IN) / 0.12, 26);
    contactGlow(ctx, CX0, B_TOP - 2, (t - G_NOGO[1]) / 0.14, 36);
    contactGlow(ctx, nose[0], nose[1] - 4, (t - PAWL_DOWN[1] + 0.04) / 0.12, 22);
    dust(ctx, BIN_TIP_X - 20, binLayerY(BIN_N) + 4, t - TOSS[1], 0x2b1, { ang: -Math.PI / 2, spread: 2.2, n: 6, dur: 0.45 });

    grainOver(ctx, 0.3, 'soft-light');
  },
};
