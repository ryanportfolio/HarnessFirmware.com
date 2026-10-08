// /long-horizon at final fidelity (pitch A 3.3, same beats and timing as the animatic's long-horizon.js).
// A dividing engine. A lead screw spans the bench; the carriage (the Manager, hatched: it persists)
// rides it and carries the contract, the cut key /deep-plan hands over. The work is a chain of
// blanks, one per step. Each round: a fresh dial gauge comes down from the beam and is set and
// sealed before anything else; then a fresh cutting bit drops into the tool post, rules one mark,
// and is thrown into the discard bin; only then does the sealed gauge swing its probe onto the mark.
// When the needle settles in band the pawl lifts, the carriage indexes one pitch and the pawl drops
// into the next gap. The ruled trail behind the carriage is Verified progress. Seam: carriage, chain
// and screw thread shift left one pitch together; the bin's magazine sinks by one bit.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, follow, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, activeMat,
} from '../kit.mjs';

const T = 9.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const PITCH = 130; // one step = one blank = one pitch of the engine
const CX0 = 640; // carriage start, left third
const BW = 100, BH = 150, B_T = 14;
const BED_TOP = 728, B_TOP = BED_TOP - BH;
const MARK_TOP = 600, MARK_BOT = 690, MARK_W = 5;
const LINK_Y = 711;

const SCREW_Y = 470, SCREW_D = 30, THREAD = 26, SCREW_END = 1580; // THREAD divides PITCH: the thread repeats every pitch
const CAR_Y0 = 430, CAR_Y1 = 515, CAR_HW = 80;
const SEAT_TIP = 560, BIT_L = 100, BIT_W = 20; // bit tip when seated in the post
const RULE_DROP = MARK_BOT - SEAT_TIP; // post travel down to the foot of the mark

const BEAM_Y0 = 236, BEAM_Y1 = 258;

// Gauge: fixed station left of the cutting point, hung from the beam.
const G = { x: CX0 - 180, y: 470 }, G_R = 52;
const PIV = { x: G.x + 38, y: G.y + 46 };
const PROBE_TARGET = [CX0, (MARK_TOP + MARK_BOT) / 2];
const PROBE_L = Math.hypot(PROBE_TARGET[0] - PIV.x, PROBE_TARGET[1] - PIV.y);
const A_MEASURE = Math.atan2(PROBE_TARGET[1] - PIV.y, PROBE_TARGET[0] - PIV.x);
const A_REST = A_MEASURE + 0.43;
const N_REST = -2.55, N_BAND = -Math.PI / 2, BAND_HALF = 0.2;

// Discard bin with a sinking magazine floor.
const BIN = { x0: 1652, x1: 1838, y0: 452, y1: 568, d: 64 };
const BIN_LAYER = 21, BIN_N = 4;
const binLayerY = (j) => BIN.y1 - 14 - j * BIN_LAYER;
const BIN_CX = (BIN.x0 + BIN.x1) / 2 - 4;

// The contract: the cut key from /deep-plan (same outline, scaled), seated on the carriage.
// Off: /long-horizon takes any task, so its own loop must not imply it always follows /deep-plan.
const SHOW_CONTRACT = false;
const KEY = { L: 560, BOW_W: 150, BOW_H: 150, BLADE_H: 66, TIP_C: 22, BOW_R: 40, SH: [16, 12], RING: [72, 92, 22] };
const KEY_NOTCH = [228, 310, 392, 474], KEY_DEPTH = [22, 32, 32, 22];
const KEY_S = 0.26;

// ---------------------------------------------------------------------------------------------
// Timing (same contract as the animatic, with the probe kept on the mark through the hold).

const GAUGE_IN = 0.0, SET = [0.5, 0.64], SEAL = [0.64, 0.8];
const BIT_IN = [1.0, 1.5], DESCEND = [1.5, 1.75], RULE = [1.75, 2.75], RETRACT = [2.78, 3.0], TOSS = [3.0, 3.74], LIFT_OUT = 3.14;
const PROBE_ON = [3.8, 4.12], PROBE_OFF = [7.3, 7.5], GAUGE_OUT = [7.5, 7.9];
const PAWL_UP = [5.0, 5.12], INDEX = [5.12, 5.5], PAWL_DOWN = [5.46, 5.58];
const SEAM = [8.2, 9.0], SINK = [8.2, 8.36];

const seamOff = (t) => -PITCH * easeInOut(seg(t, SEAM[0], SEAM[1]));
const carriageX = (t) => CX0 + PITCH * indexEase(seg(t, INDEX[0], INDEX[1])) + seamOff(t);

// ---------------------------------------------------------------------------------------------
// The chain of blanks.

const BLANK_MAT = { ...MAT.ivory, line: 'rgba(120,124,112,0.5)' };

function blankPts(cx) {
  const x = cx - BW / 2, y = B_TOP, c = 22;
  return [[x, y], [x + BW - c, y], [x + BW, y + c], [x + BW, y + BH], [x, y + BH]];
}

function chain(ctx, t, off) {
  // links first, behind the blanks' front faces at the gaps
  for (let k = -7; k <= 11; k++) {
    const cx = CX0 + k * PITCH + off;
    if (cx < -PITCH || cx > W + PITCH) continue;
    const xa = cx + BW / 2 - 18, xb = cx + PITCH - BW / 2 + 18;
    prism(ctx, rect(xa, LINK_Y - 8, xb - xa, 16), 8, MAT.metal, { sil: 2 });
  }
  const ruled = markLen(t);
  for (let k = -7; k <= 11; k++) {
    const cx = CX0 + k * PITCH + off;
    if (cx < -BW || cx > W + BW) continue;
    const pts = blankPts(cx);
    prism(ctx, pts, B_T, BLANK_MAT);
    // lit top edge
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,250,0.85)';
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    ctx.moveTo(cx - BW / 2 + 1, B_TOP + 1.5);
    ctx.lineTo(cx + BW / 2 - 23, B_TOP + 1.5);
    ctx.stroke();
    ctx.restore();
    hole(ctx, cx - BW / 2 + BW * 0.3, B_TOP + 26, 8, B_T, MAT.ivory);
    // pins for the links
    for (const px of [cx - BW / 2 + 12, cx + BW / 2 - 12]) ball(ctx, px, LINK_Y, 5, MAT.lit);
    // the mark: ruled behind the carriage, being ruled on blank 0, none ahead
    let len = k < 0 ? MARK_BOT - MARK_TOP : k === 0 ? ruled : 0;
    if (len > 0.5) mark(ctx, cx, MARK_BOT - len, MARK_BOT);
  }
}

function mark(ctx, x, y0, y1) {
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#30362c';
  ctx.lineWidth = lw(MARK_W);
  ctx.beginPath();
  ctx.moveTo(x, y0);
  ctx.lineTo(x, y1);
  ctx.stroke();
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(255,255,250,0.75)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + MARK_W / 2 + 1, y0 + 1);
    ctx.lineTo(x + MARK_W / 2 + 1, y1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,74,64,0.8)';
    ctx.beginPath();
    ctx.moveTo(x - MARK_W / 2 - 0.5, y0);
    ctx.lineTo(x - MARK_W / 2 - 0.5, y1);
    ctx.stroke();
  }
  ctx.restore();
}

// Length of the mark on blank 0, ruled upward from the foot.
function markLen(t) {
  if (t < RULE[0]) return 0;
  return (MARK_BOT - MARK_TOP) * easeInOut(seg(t, RULE[0], RULE[1]));
}

// ---------------------------------------------------------------------------------------------
// Lead screw threads (the rod is static; the thread phase follows the carriage).

function screwThreads(ctx, phase) {
  if (LOD.card) {
    ctx.save();
    ctx.strokeStyle = '#0b100c';
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    const ph = ((phase % THREAD) + THREAD) % THREAD;
    for (let x = ph - THREAD; x < SCREW_END - 12; x += THREAD) { ctx.moveTo(x, SCREW_Y + SCREW_D / 2); ctx.lineTo(x + 10, SCREW_Y - SCREW_D / 2); }
    ctx.stroke();
    ctx.restore();
    return;
  }
  const ph = ((phase % THREAD) + THREAD) % THREAD;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, SCREW_Y - SCREW_D / 2, SCREW_END, SCREW_D);
  ctx.clip();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#080c09';
  ctx.beginPath();
  for (let x = ph - THREAD; x < SCREW_END - 12; x += THREAD) { ctx.moveTo(x, SCREW_Y + SCREW_D / 2); ctx.lineTo(x + 11, SCREW_Y - SCREW_D / 2); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(134,169,142,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = ph - THREAD + 5; x < SCREW_END - 12; x += THREAD) { ctx.moveTo(x, SCREW_Y + SCREW_D / 2); ctx.lineTo(x + 11, SCREW_Y - SCREW_D / 2); }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The contract key, the carriage, the pawl, the post and the bit.

function keyOutline(x0, yb, s) {
  const X = (u) => x0 + u * s, Y = (v) => yb - v * s;
  const { L, BOW_W, BOW_H, BLADE_H, TIP_C, BOW_R, SH } = KEY;
  const pts = [[X(0), Y(0)]];
  for (const [cx, a0] of [[BOW_R, Math.PI], [BOW_W - BOW_R, Math.PI / 2]]) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 - (i / 6) * (Math.PI / 2);
      pts.push([X(cx + BOW_R * Math.cos(a)), Y(BOW_H - BOW_R + BOW_R * Math.sin(a))]);
    }
  }
  pts.push([X(BOW_W), Y(BLADE_H + SH[1])], [X(BOW_W + SH[0]), Y(BLADE_H + SH[1])], [X(BOW_W + SH[0]), Y(BLADE_H)]);
  for (let k = 0; k < 4; k++) {
    const n = KEY_NOTCH[k], d = KEY_DEPTH[k], h = 4 + d * 0.9;
    pts.push([X(n - h), Y(BLADE_H)], [X(n - 4), Y(BLADE_H - d)], [X(n + 4), Y(BLADE_H - d)], [X(n + h), Y(BLADE_H)]);
  }
  pts.push([X(L - TIP_C), Y(BLADE_H)], [X(L), Y(BLADE_H - TIP_C)], [X(L), Y(0)]);
  return pts;
}

function contractKey(ctx, x0, yb, s) {
  prism(ctx, keyOutline(x0, yb, s), 14 * s * 1.6, BLANK_MAT);
  hole(ctx, x0 + KEY.RING[0] * s, yb - KEY.RING[1] * s, KEY.RING[2] * s, 6, MAT.ivory);
}

function carriage(ctx, cx, t, active) {
  const SM = activeMat(MAT.session, active);
  // nut collars where the screw enters
  for (const x of [cx - CAR_HW - 12, cx + CAR_HW]) prism(ctx, rect(x, SCREW_Y - 24, 12, 48), 40, SM, { sil: 2.5 });
  prism(ctx, rect(cx - CAR_HW, CAR_Y0, CAR_HW * 2, CAR_Y1 - CAR_Y0), 56, SM, { hatch: true, sil: 3.5 });
  // gib screws
  if (!LOD.card) for (const x of [cx - CAR_HW + 12, cx + CAR_HW - 12]) for (const y of [CAR_Y0 + 12, CAR_Y1 - 12]) ball(ctx, x, y, 3.5, SM);
  // contract cradle on top, the key standing in it
  if (SHOW_CONTRACT) {
    const kx = cx - (KEY.L * KEY_S) / 2;
    for (const x of [cx - 52, cx + 40]) prism(ctx, rect(x, CAR_Y0 - 10, 14, 10), 30, SM, { sil: 2 });
    contractKey(ctx, kx, CAR_Y0 - 3, KEY_S);
    for (const x of [cx - 52, cx + 40]) prism(ctx, rect(x - 2, CAR_Y0 - 14, 18, 8), 12, SM, { sil: 2 });
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
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(2.2);
  ctx.beginPath();
  ctx.moveTo(px - 4, py);
  ctx.lineTo(ex - 4, ey);
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
  ctx.restore();
  ball(ctx, px, py, 7, MAT.session);
  return [ex, ey + 10];
}

// The fresh cutting bit: square shank, ground graver point. Drawn about its tip, angle 0 = point down.
function bit(ctx, x, y, ang, alpha = 1, mat = MAT.fresh) {
  ctx.save();
  ctx.globalAlpha *= alpha;
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

// Post travel below the seated position (0 at rest) and the bit's place in the post.
function postDrop(t) {
  if (t < DESCEND[0] || t >= RETRACT[1]) return 0;
  if (t < DESCEND[1]) return RULE_DROP * easeInOut(seg(t, DESCEND[0], DESCEND[1]));
  if (t < RULE[1]) return RULE_DROP - (MARK_BOT - MARK_TOP) * easeInOut(seg(t, RULE[0], RULE[1]));
  return (MARK_TOP - SEAT_TIP) * (1 - easeIn(seg(t, RETRACT[0], RETRACT[1])));
}

// Bit pose: [x, tipY, angle] or null.
function bitPose(t, cx) {
  if (t < BIT_IN[0] || t >= TOSS[1]) return null;
  if (t < BIT_IN[1]) return [cx, SEAT_TIP - 560 * (1 - springStep(t - BIT_IN[0], 0.86, 12.5)), 0];
  if (t < TOSS[0]) return [cx, SEAT_TIP + postDrop(t), 0];
  // pulled up out of the post, then thrown: a ballistic arc over the chain onto the magazine's top layer
  const yLift = SEAT_TIP - 70;
  if (t < LIFT_OUT) return [cx, lerp(SEAT_TIP, yLift, easeOut(seg(t, TOSS[0], LIFT_OUT))), 0];
  const u = seg(t, LIFT_OUT, TOSS[1]);
  const x = lerp(cx, BIN_CX + 50, u);
  const y = lerp(yLift, binLayerY(BIN_N) + 10, u) - 4 * 120 * u * (1 - u);
  return [x, y, (-Math.PI / 2) * u];
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

function dial(ctx, x, y, needle, band, sealU) {
  // bezel (fresh: clean outline, no hatching)
  let g = ctx.createRadialGradient(x - 18, y - 20, 4, x, y, G_R + 4);
  g.addColorStop(0, '#3f7d52');
  g.addColorStop(1, '#0e1d14');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, G_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(3.5);
  ctx.stroke();
  // face
  g = ctx.createRadialGradient(x, y - 8, 2, x, y, G_R - 8);
  g.addColorStop(0, '#141d16');
  g.addColorStop(1, '#090d0a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, G_R - 8, 0, Math.PI * 2);
  ctx.fill();
  // tolerance band, carried by the bezel: it turns into place when the gauge is set
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(83,219,118,0.55)';
  ctx.lineWidth = lw(7);
  ctx.beginPath();
  ctx.arc(x, y, G_R - 17, band - BAND_HALF, band + BAND_HALF);
  ctx.stroke();
  // ticks (turn with the bezel)
  ctx.strokeStyle = 'rgba(194,201,186,0.75)';
  ctx.beginPath();
  const N = 40;
  for (let i = 0; i < N; i++) {
    const major = i % 5 === 0;
    if (LOD.card && !major) continue;
    const a = band + (i / N) * Math.PI * 2;
    const r1 = G_R - 9, r0 = major ? G_R - 18 : G_R - 13;
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  }
  ctx.lineWidth = lw(LOD.card ? 2 : 1.6);
  ctx.stroke();
  // needle with counterweight and shadow
  const c = Math.cos(needle), s = Math.sin(needle);
  const path = (ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(x + ox + c * (G_R - 12), y + oy + s * (G_R - 12));
    ctx.lineTo(x + ox - s * 3, y + oy + c * 3);
    ctx.lineTo(x + ox - c * 11, y + oy - s * 11);
    ctx.lineTo(x + ox + s * 3, y + oy - c * 3);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  path(2, 3);
  ctx.fill();
  ctx.fillStyle = P.bright;
  path(0, 0);
  ctx.fill();
  ball(ctx, x, y, 6, MAT.fresh);
  if (!LOD.card) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, G_R - 9, 0, Math.PI * 2);
    ctx.clip();
    g = ctx.createLinearGradient(x - 40, y - 40, x + 8, y + 8);
    g.addColorStop(0, 'rgba(243,243,236,0.10)');
    g.addColorStop(0.5, 'rgba(243,243,236,0.03)');
    g.addColorStop(0.51, 'rgba(243,243,236,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - G_R, y - G_R, G_R * 2, G_R * 2);
    ctx.restore();
  }
  // bezel lock screw and the ivory seal on its wire
  const la = -0.72;
  const lx = x + Math.cos(la) * (G_R - 1), ly = y + Math.sin(la) * (G_R - 1);
  ball(ctx, lx, ly, 6, MAT.fresh);
  if (sealU > 0) {
    const drop = (1 - indexEase(sealU)) * -34;
    ctx.save();
    ctx.globalAlpha *= clamp01(sealU * 4);
    const sx = lx + 16, sy = ly + 20 + drop;
    ctx.strokeStyle = '#a3c2aa';
    ctx.lineWidth = lw(1.8);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + 12, ly + 2 + drop * 0.5, sx, sy - 9);
    ctx.stroke();
    ctx.translate(sx, sy);
    ctx.rotate(0.18);
    ctx.fillStyle = 'rgba(2,4,3,0.4)';
    ctx.fillRect(-8, -9, 20, 24);
    const sg = ctx.createLinearGradient(0, -11, 0, 13);
    sg.addColorStop(0, '#fbfbf4');
    sg.addColorStop(1, '#d4d5c9');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.roundRect(-10, -11, 20, 24, 3);
    ctx.fill();
    ctx.fillStyle = '#7d8a7f';
    ctx.beginPath();
    ctx.arc(0, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function gauge(ctx, t, needle, probeA) {
  const yIn = 560 * (1 - springStep(t - GAUGE_IN, 0.82, 11));
  const yOut = 620 * easeIn(seg(t, GAUGE_OUT[0], GAUGE_OUT[1]));
  const dy = -yIn - yOut;
  const gy = G.y + dy;
  if (gy < -G_R) return null;
  // hanger telescoping from the beam
  rodV(ctx, G.x, BEAM_Y1 - 6, gy - G_R - 10, 12, MAT.fresh);
  prism(ctx, rect(G.x - 12, gy - G_R - 16, 24, 16), 18, MAT.fresh, { sil: 2.5 });
  // probe lever on its boss
  const px = PIV.x, py = PIV.y + dy;
  const tx = px + PROBE_L * Math.cos(probeA), ty = py + PROBE_L * Math.sin(probeA);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0e1d14';
  ctx.lineWidth = lw(9);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.strokeStyle = '#3f7d52';
  ctx.lineWidth = lw(5);
  ctx.stroke();
  ctx.strokeStyle = P.green;
  ctx.lineWidth = lw(1.8);
  ctx.beginPath();
  ctx.moveTo(px, py - 3);
  ctx.lineTo(tx, ty - 3);
  ctx.stroke();
  ctx.restore();
  ball(ctx, tx, ty, 7, MAT.fresh);
  const sealU = seg(t, SEAL[0], SEAL[1]);
  const band = N_BAND + 1.1 * (1 - indexEase(seg(t, SET[0], SET[1])));
  dial(ctx, G.x, gy, needle, band, sealU);
  prism(ctx, rect(px - 10, py - 10, 20, 20), 14, MAT.fresh, { sil: 2.5 });
  ball(ctx, px, py, 4, MAT.fresh);
  centreLine(ctx, G.x - G_R - 18, gy, G.x + G_R + 18, gy, 0.4);
  return [tx, ty];
}

const probeAngle = (t) => A_REST - (A_REST - A_MEASURE) * (easeInOut(seg(t, PROBE_ON[0], PROBE_ON[1])) - easeIn(seg(t, PROBE_OFF[0], PROBE_OFF[1])));
const onMark = (s) => s >= PROBE_ON[1] && s < PROBE_OFF[0];
const needleTarget = (s) => (onMark(s) ? N_BAND - N_REST : 0);
// The needle lags, overshoots and damps; integrated from rest at a fixed step, so it is a pure function of t.
const needleAt = (t) => N_REST + (t < PROBE_ON[1] - 0.02 ? 0 : follow(needleTarget, PROBE_ON[1] - 0.02, Math.min(t, GAUGE_OUT[1]), 0.32, 30));

// ---------------------------------------------------------------------------------------------
// Bin contents (the magazine sinks by one bit at the seam).

function binContents(ctx, t) {
  const sink = BIN_LAYER * indexEase(seg(t, SINK[0], SINK[1]));
  ctx.save();
  ctx.beginPath();
  ctx.rect(BIN.x0 + 4, BIN.y0 - 80, BIN.x1 - BIN.x0 - 8, BIN.y1 - 4 - (BIN.y0 - 80));
  ctx.clip();
  const DM = { ...MAT.fresh, front: ['#1b3325', '#10201a'], top: '#2a5038', sil: '#3a7a50', hi: '#4f8a62', line: '#24412f' };
  const n = t >= TOSS[1] ? BIN_N + 1 : BIN_N;
  for (let j = 0; j < n; j++) {
    const y = binLayerY(j) + sink;
    bit(ctx, BIN_CX + 50, y + 10, -Math.PI / 2, 1, DM);
  }
  ctx.restore();
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
  prism(ctx, rect(BIN_CX - 10, BIN.y1, 20, FLOOR - 20 - BIN.y1), 30, MAT.metal, { sil: 2.5 });
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

function binFront(ctx) {
  // wire front so the spent bits show through
  const x0 = BIN.x0, x1 = BIN.x1, y0 = BIN.y0, y1 = BIN.y1;
  ctx.save();
  ctx.strokeStyle = '#2c3d31';
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  for (let x = x0 + 20; x < x1 - 8; x += 22) { ctx.moveTo(x, y0 + 4); ctx.lineTo(x, y1 - 4); }
  ctx.stroke();
  ctx.restore();
  prism(ctx, rect(x0, y1 - 14, x1 - x0, 14), BIN.d, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(x0, y0, 10, y1 - y0), BIN.d, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(x1 - 10, y0, 10, y1 - y0), BIN.d, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(x0, y0, x1 - x0, 8), BIN.d, MAT.metal, { sil: 2.5 });
}

function frontLayer(ctx) {
  // the overhead beam fresh tools come down from, on two end posts
  for (const x of [26, 1872]) {
    prism(ctx, rect(x, BEAM_Y1, 22, BED_TOP - BEAM_Y1), 24, MAT.metal, { sil: 3 });
  }
  prism(ctx, rect(14, BEAM_Y0, W - 28, BEAM_Y1 - BEAM_Y0), 30, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#060807';
  ctx.fillRect(300, BEAM_Y1 - 5, 1300, 3);
  if (!LOD.card) for (let x = 120; x < W - 80; x += 180) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  lampFalloff(ctx, 690, 560, 400, 1250, 0.58);
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'long-horizon',
  name: '/long-horizon',
  caption: 'run big tasks in audited rounds',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'long-horizon-final-back', backLayer);

    const off = seamOff(t);
    const cx = carriageX(t);
    screwThreads(ctx, cx - CX0);

    chain(ctx, t, off);

    // bin: contents, then the flying bit once it is over the bin, then the wire front
    binContents(ctx, t);
    const bp = bitPose(t, CX0);
    const overBin = bp && bp[0] > BIN.x0 - 40;
    if (overBin) bit(ctx, bp[0], bp[1], bp[2]);
    cached(ctx, 'long-horizon-final-binfront', binFront);

    // carriage: lit while the round works, dims through the hold
    const active = easeInOut(seg(t, 0.9, 1.2)) - easeInOut(seg(t, 5.6, 6.2));
    const pl = indexEase(seg(t, PAWL_UP[0], PAWL_UP[1])) - indexEase(seg(t, PAWL_DOWN[0], PAWL_DOWN[1]));
    contactShadow(ctx, cx + 20, B_TOP - 4, 90, 7, 0.35);
    const nose = pawl(ctx, cx, clamp01(pl));
    carriage(ctx, cx, t, active);
    const drop = postDrop(t);
    if (bp && !overBin) belowBeam(ctx, () => bit(ctx, bp[0], bp[1], bp[2]));
    postAndClamp(ctx, cx, drop, active);

    // the sealed gauge
    const needle = needleAt(t);
    let tip = null;
    belowBeam(ctx, () => { tip = gauge(ctx, t, needle, probeAngle(t)); });

    cached(ctx, 'long-horizon-final-front', frontLayer);

    // light: seat, ruling contact along the cut only, probe contact, pawl click, landing
    contactGlow(ctx, G.x, G.y - G_R - 16, (t - 0.42) / 0.12, 24);
    contactGlow(ctx, CX0, SEAT_TIP - BIT_L + 30, (t - BIT_IN[1] + 0.06) / 0.12, 24);
    if (t >= RULE[0] && t < RULE[1] + 0.06) {
      const y = MARK_BOT - markLen(t);
      const a = Math.min(1, (t - RULE[0]) / 0.06) * (1 - seg(t, RULE[1] - 0.02, RULE[1] + 0.06));
      softGlow(ctx, CX0, y, 30, P.bright, 0.55 * a);
      ctx.save();
      ctx.fillStyle = `rgba(240,255,244,${0.9 * a})`;
      ctx.beginPath();
      ctx.arc(CX0, y, 4.5 * LOD.k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 8; i++) {
        const ti = RULE[0] + i * 0.12;
        const yi = MARK_BOT - markLen(ti);
        dust(ctx, CX0 + 4, yi, t - ti, 0x1a0 + i, { ang: -Math.PI * 0.15, spread: 1.0, n: 5, dur: 0.4 });
      }
    }
    if (tip) contactGlow(ctx, tip[0], tip[1], (t - PROBE_ON[1]) / 0.12, 28);
    contactGlow(ctx, nose[0], nose[1] - 4, (t - PAWL_DOWN[1] + 0.04) / 0.12, 22);
    dust(ctx, BIN_CX + 30, binLayerY(BIN_N) + 4, t - TOSS[1], 0x2b1, { ang: -Math.PI / 2, spread: 2.2, n: 8, dur: 0.45 });

    grainOver(ctx, 0.3, 'soft-light');
  },
};
