import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

// /long-horizon animatic (pitch A 3.3). Dividing engine: the gauge is set and sealed before the bit
// exists, the bit is discarded before the gauge measures, the carriage indexes one pitch only after
// the gauge reads in band, and the seam translates screw, rack, trail and carriage by exactly one pitch.

const T = 9.0;
const TOP = 220;

const P = 130; // one pitch = one step = one blank
const CX0 = 640; // carriage start (left third)
const BW = 100, BH = 150;
const SCREW_T = 505, SCREW_B = 535, THREAD = 26; // THREAD divides P, so the screw pattern repeats per pitch
const RACK_T = 470, RACK_B = 490;
const CAR_T = 495, CAR_B = 575;
const MARK_TOP = BENCH_Y - BH + 16, MARK_BOT = BENCH_Y - 14;
const POST_TIP = 640; // bit tip height when seated in the tool post
const G = { x: 860, y: 300 }; // gauge dial centre when set
const MARK_MID = (MARK_TOP + MARK_BOT) / 2;
const PROBE = Math.hypot(CX0 - G.x, MARK_MID - G.y);
const PHI_SET = 20;
const PHI_AUDIT = (Math.atan2(MARK_MID - G.y, CX0 - G.x) * 180) / Math.PI;
const BIN = { x: 1720, y: BENCH_Y + 40, w: 160, h: 160 };
const BIN_X = BIN.x + BIN.w / 2, BIN_Y0 = BIN.y + 21, BIN_P = 30;

// ---------- local helpers ----------

const idx = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.6 ? 1.04 * easeOut(u / 0.6) : 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4));
const rad = (d) => (d * Math.PI) / 180;

function stroke(ctx, pts, color, w = 4) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.stroke();
  ctx.restore();
}

// Cutting bit drawn about its centre; angle 0 = tip pointing down. Tip sits 45 below the centre.
function bit(ctx, cx, cy, angle, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeRect(-12, -45, 24, 70);
  ctx.beginPath();
  ctx.moveTo(-12, 25);
  ctx.lineTo(0, 45);
  ctx.lineTo(12, 25);
  ctx.stroke();
  ctx.restore();
}

// Seam offset: everything on the screw moves left by exactly one pitch in the last 0.8 s.
const seamOff = (t) => -P * easeInOut(seg(t, 8.2, 9.0));

function bitPose(t) {
  // returns [cx, cy, angle] or null
  const seatCy = POST_TIP - 45;
  if (t < 1.0 || t >= 3.5) return null;
  if (t < 1.5) return [CX0, lerp(seatCy - 700, seatCy, easeOut(seg(t, 1.0, 1.5))), 0];
  if (t < 1.75) return [CX0, lerp(seatCy, MARK_TOP - 45, easeInOut(seg(t, 1.5, 1.75))), 0];
  if (t < 2.75) return [CX0, lerp(MARK_TOP - 45, MARK_BOT - 45, easeInOut(seg(t, 1.75, 2.75))), 0];
  if (t < 3.0) return [CX0, lerp(MARK_BOT - 45, seatCy, easeIn(seg(t, 2.78, 3.0))), 0];
  const u = easeInOut(seg(t, 3.0, 3.5));
  return [lerp(CX0, BIN_X, u), lerp(seatCy, BIN_Y0, u) - 320 * Math.sin(Math.PI * u), lerp(0, -Math.PI / 2, u)];
}

function markLen(t) {
  if (t < 1.75) return 0;
  if (t >= 2.75) return MARK_BOT - MARK_TOP;
  return (MARK_BOT - MARK_TOP) * easeInOut(seg(t, 1.75, 2.75));
}

function drawBin(ctx, t) {
  ctx.save();
  ctx.fillStyle = C.ground;
  ctx.fillRect(BIN.x, BIN.y, BIN.w, BIN.h);
  ctx.restore();
  stroke(ctx, [BIN.x, BIN.y, BIN.x, BIN.y + BIN.h, BIN.x + BIN.w, BIN.y + BIN.h, BIN.x + BIN.w, BIN.y], C.dim, 4);
  const sink = BIN_P * idx(seg(t, 8.2, 8.34));
  ctx.save();
  ctx.beginPath();
  ctx.rect(BIN.x + 2, BIN.y + 2, BIN.w - 4, BIN.h - 4);
  ctx.clip();
  const first = t >= 3.5 ? -1 : 0;
  for (let k = first; k <= 6; k++) {
    const y = BIN_Y0 + (k + 1) * BIN_P + sink;
    if (y - 14 >= BIN.y + BIN.h) continue; // only what shows in the bin
    const col = k === -1 && t < 3.64 ? C.green : C.dim;
    bit(ctx, BIN_X, y, -Math.PI / 2, col);
  }
  ctx.restore();
}

function drawGauge(ctx, t) {
  const gy = G.y - 500 * (1 - easeOut(seg(t, 0, 0.5))) - 500 * easeIn(seg(t, 7.4, 7.8));
  if (gy < -150) return;
  const phi = PHI_SET + (PHI_AUDIT - PHI_SET) * (easeInOut(seg(t, 3.5, 3.9)) - easeIn(seg(t, 4.62, 4.92)));
  const a = rad(phi);
  // hanger: the gauge arrives from above and leaves the same way
  stroke(ctx, [G.x, gy - 56, G.x, gy - 500], C.green, 4);
  // probe
  const tx = G.x + PROBE * Math.cos(a), ty = gy + PROBE * Math.sin(a);
  stroke(ctx, [G.x + 56 * Math.cos(a), gy + 56 * Math.sin(a), tx, ty], C.green, 4);
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tx, ty, 8, 0, Math.PI * 2);
  ctx.stroke();
  // dial
  ctx.fillStyle = C.ground;
  ctx.beginPath();
  ctx.arc(G.x, gy, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // tolerance band
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(G.x, gy, 38, rad(-105), rad(-75));
  ctx.stroke();
  ctx.restore();
  // needle: rests left, swings after the probe touches, settles inside the band
  let n = -150;
  if (t >= 3.9) {
    const s = t - 3.9;
    n = -90 - 60 * Math.exp(-5 * s) * Math.cos(12 * s) * (1 - seg(t, 4.3, 4.6));
  }
  stroke(ctx, [G.x, gy, G.x + 44 * Math.cos(rad(n)), gy + 44 * Math.sin(rad(n))], C.green, 5);
  // seal tab: set and sealed before the bit exists
  if (t >= 0.6) {
    const off = lerp(-40, 0, idx(seg(t, 0.6, 0.74)));
    ctx.save();
    ctx.globalAlpha *= seg(t, 0.6, 0.66);
    ctx.fillStyle = C.ivory;
    ctx.fillRect(G.x - 18, gy - 56 - 20 + off, 36, 20);
    ctx.restore();
  }
  return [tx, ty];
}

function render(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP, W, H - TOP);
  ctx.clip();

  bench(ctx);
  drawBin(ctx, t);

  const off = seamOff(t);

  // chain of blanks, one per step; ruled behind the carriage, plain ahead of it
  const ml = markLen(t);
  for (let k = -7; k <= 11; k++) {
    const cx = CX0 + k * P + off;
    if (cx < -BW || cx > W + BW) continue;
    blank(ctx, cx - BW / 2, BENCH_Y - BH, BW, BH);
    const len = k < 0 ? MARK_BOT - MARK_TOP : k === 0 ? ml : 0;
    if (len > 0) stroke(ctx, [cx, MARK_TOP, cx, MARK_TOP + len], C.benchTop, 6);
  }

  // lead screw and ratchet rack (repeat exactly every pitch)
  stroke(ctx, [0, SCREW_T, W, SCREW_T], C.green, 4);
  stroke(ctx, [0, SCREW_B, W, SCREW_B], C.green, 4);
  const ph = ((off % THREAD) + THREAD) % THREAD;
  for (let x = ph - THREAD; x < W + THREAD; x += THREAD) stroke(ctx, [x, SCREW_B, x + 12, SCREW_T], C.dim, 4);
  const rp = ((off % P) + P) % P;
  const rack = [];
  for (let x = CX0 + P / 2 + rp - 6 * P; x < W + P; x += P) rack.push(x - P, RACK_B, x, RACK_T, x, RACK_B);
  stroke(ctx, rack, C.dim, 4);

  // carriage (the Manager: hatched), indexes one pitch after the gauge reads in band
  const cx = CX0 + P * idx(seg(t, 5.14, 5.5)) + off;
  ctx.save();
  ctx.fillStyle = C.ground;
  ctx.fillRect(cx - 70, CAR_T, 140, CAR_B - CAR_T);
  ctx.restore();
  part(ctx, cx - 70, CAR_T, 140, CAR_B - CAR_T, 'session');
  // pawl: up at rest, drops into the rack before the index
  const pd = idx(seg(t, 5.0, 5.14)) - easeInOut(seg(t, 5.46, 5.6));
  stroke(ctx, [cx + 30, CAR_T, lerp(cx + 70, cx + 62, pd), lerp(440, RACK_B - 8, pd)], C.green, 5);
  // tool post
  part(ctx, cx - 18, CAR_B, 36, 32, 'fresh');

  // fresh bit: in, one mark, out to the bin
  const bp = bitPose(t);
  if (bp) bit(ctx, bp[0], bp[1], bp[2], C.green);
  if (t >= 1.75 && t < 2.75) {
    ctx.save();
    ctx.fillStyle = C.bright;
    ctx.beginPath();
    ctx.arc(CX0, MARK_TOP + ml, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // sealed gauge
  const probeTip = drawGauge(ctx, t);
  if (probeTip) contact(ctx, probeTip[0], probeTip[1], seg(t, 3.9, 4.02));
  contact(ctx, CX0, MARK_TOP, seg(t, 1.75, 1.87));

  ctx.restore();
}

function beat(t) {
  if (t < 1.0) return 'plan: gauge set and sealed';
  if (t < 1.5) return 'fresh: bit drops into the tool post';
  if (t < 3.0) return 'execute: one mark';
  if (t < 3.5) return 'fresh: bit out to the bin';
  if (t < 5.0) return 'audit: sealed gauge reads in band';
  if (t < 5.6) return 'integrate: pawl drops, carriage indexes one pitch';
  if (t < 7.4) return 'hold';
  if (t < 8.2) return 'fresh: gauge lifts out';
  return 'feed (seam): screw, trail, carriage shift one pitch';
}

export default {
  id: 'long-horizon',
  name: '/long-horizon',
  caption: 'run big tasks in audited rounds',
  period: T,
  draw(ctx, t) {
    render(ctx, t);
    note(ctx, beat(t));
  },
};
