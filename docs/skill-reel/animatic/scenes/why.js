// /why (pitch A 3.5): one fresh proving ring presses a bracket under a hood. Rough animatic.
// Pure function of t.
import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

const T = 8.0;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Engage: ease in-out approach a, dwell, ease-in withdrawal at 75% of a. c is the 120 ms contact clock.
function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, t3, c: (t - t1) / 0.12 };
}

// Bracket geometry, local origin at the bottom-left of the upright leg.
const LEG_X = 805, LEG_W = 50, LEG_H = 260, ARM_L = 460, ARM_T = 50;
const BASE_Y = BENCH_Y - 40;
const ARM_TOP = BASE_Y - LEG_H;
const shape = (lx) => {
  const u = clamp01((lx - LEG_W) / (ARM_L - LEG_W));
  return u * u;
};
const GUSSET = 120;

// Proving ring.
const P = [960, 1090, 1200];
const RING_R = 72, PLUNGER = 26, HOVER = 40;
const RY0 = ARM_TOP - HOVER - PLUNGER - RING_R;
const BOW = 60, ELASTIC = 10;
const NEEDLE_BAND = 0.7, AMBER_AT = 1.25, NEEDLE_OVER = 1.6;

// Hood and the session hand.
const WIN_X0 = 640, WIN_X1 = 1310, HOOD_TOP = 238;
const HAND_REST = 1480, HAND_FIT = LEG_X + LEG_W + GUSSET;
const HAND_A = (1.0 - 0.2) / 1.75;

function gusset(ctx, cornerX, cornerY, alpha = 1, s = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(cornerX + GUSSET / 2, cornerY + GUSSET / 2);
  ctx.scale(s, s);
  ctx.translate(-(cornerX + GUSSET / 2), -(cornerY + GUSSET / 2));
  ctx.fillStyle = C.ivory;
  ctx.beginPath();
  ctx.moveTo(cornerX, cornerY);
  ctx.lineTo(cornerX + GUSSET, cornerY);
  ctx.lineTo(cornerX, cornerY + GUSSET);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Bracket stood on edge: upright leg in the vice, cantilever arm with the clipped corner and the hole.
function bracket(ctx, dx, bow, withGusset, alpha = 1, s = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const ox = LEG_X + dx, oy = BASE_Y;
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  const top = -LEG_H, c = 22;
  const defl = (lx) => bow * shape(lx);
  ctx.fillStyle = C.ivory;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, top);
  for (let lx = 20; lx <= ARM_L - c; lx += 20) ctx.lineTo(lx, top + defl(lx));
  ctx.lineTo(ARM_L - c, top + defl(ARM_L - c));
  ctx.lineTo(ARM_L, top + c + defl(ARM_L));
  ctx.lineTo(ARM_L, top + ARM_T + defl(ARM_L));
  for (let lx = ARM_L - 20; lx >= LEG_W; lx -= 20) ctx.lineTo(lx, top + ARM_T + defl(lx));
  ctx.lineTo(LEG_W, top + ARM_T);
  ctx.lineTo(LEG_W, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.benchTop;
  ctx.beginPath();
  ctx.arc(ARM_L - 50, top + 25 + defl(ARM_L - 50), 11, 0, Math.PI * 2);
  ctx.fill();
  // The slip: the one user message, clipped to the leg.
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-22, top + 84);
  ctx.lineTo(8, top + 84);
  ctx.stroke();
  ctx.fillStyle = C.ivory;
  ctx.fillRect(-88, top + 64, 66, 46);
  ctx.restore();
  if (withGusset) gusset(ctx, LEG_X + LEG_W + dx, ARM_TOP + ARM_T, alpha, s);
}

function ring(ctx, x, y, needle) {
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineCap = 'round';
  // stem up into the hood housing
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x, y - RING_R);
  ctx.lineTo(x, y - RING_R - 700);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x, y, RING_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeRect(x - 13, y + RING_R, 26, PLUNGER);
  ctx.beginPath();
  ctx.arc(x, y, 42, 0, Math.PI * 2);
  ctx.stroke();
  // safe band
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(x, y, 32, -Math.PI / 2, -Math.PI / 2 + NEEDLE_BAND);
  ctx.stroke();
  // amber mark
  const am = -Math.PI / 2 + AMBER_AT;
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(am) * 26, y + Math.sin(am) * 26);
  ctx.lineTo(x + Math.cos(am) * 44, y + Math.sin(am) * 44);
  ctx.stroke();
  // needle
  const na = -Math.PI / 2 + needle;
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(na) * 38, y + Math.sin(na) * 38);
  ctx.stroke();
  ctx.restore();
}

function beat(t) {
  if (t < 0.7) return 'Hood';
  if (t < 1.4) return 'Fresh: one reviewer';
  if (t < 3.8) return 'Engage x3';
  if (t < 4.4) return 'Fresh: out, hood up';
  if (t < 5.4) return 'Engage: session hand fits the gusset';
  if (t < 7.0) return 'Hold';
  return 'Feed (seam): next bracket';
}

export default {
  id: 'why',
  name: '/why',
  caption: 'Pressure-test a recommendation with one fresh reviewer',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    bench(ctx);

    // Ring presses: lateral move 0.15 s, then engage; press 3 dwells 300 ms past the amber mark.
    let rx = P[0], travel = 0, needle = 0, bow = 0;
    let flash = null;
    for (let i = 0; i < 3; i++) {
      const s = 1.4 + 0.8 * i;
      if (t >= s && i > 0) rx = lerp(P[i - 1], P[i], easeInOut(seg(t, s, s + 0.15)));
      const dwell = i === 2 ? 0.3 : 0.2;
      const e = engage(t, s + 0.15, (0.65 - dwell) / 1.75, dwell);
      const bmax = i < 2 ? ELASTIC : BOW;
      const sh = shape(P[i] - LEG_X);
      const total = HOVER + bmax * sh;
      if (t >= s && t < s + 0.8) {
        travel = e.d * total;
        needle = e.d * (i < 2 ? NEEDLE_BAND : NEEDLE_OVER);
        bow = bmax * clamp01((travel - HOVER) / (bmax * sh));
        if (i === 2 && t >= e.t1) bow = BOW;
      }
      if (e.c > 0 && e.c < 1) flash = [P[i], ARM_TOP + bow * sh, e.c];
    }
    if (t >= 3.8) rx = P[2];
    // Plastic bow after press 3 until the gusset straightens it.
    const he = engage(t, 4.4, HAND_A);
    const seated = t >= he.t1;
    if (t >= 3.8 && t < 4.4) bow = BOW;
    if (t >= 4.4) bow = seated ? 0 : BOW * (1 - he.d);

    // Vice jaws (seam opens and closes them).
    const jaw = 40 * (easeInOut(seg(t, 7.0, 7.2)) - easeInOut(seg(t, 7.8, 8.0)));
    part(ctx, 740, BENCH_Y - 30, 240, 30, 'dim');

    // Brackets: the current one, and in the seam the next one feeding in from the left.
    if (t < 7.7) {
      const u = seg(t, 7.15, 7.7);
      bracket(ctx, 420 * easeInOut(u), bow, seated, 1 - easeIn(u));
    }
    if (t >= 7.3) {
      const u = easeInOut(seg(t, 7.3, 7.85));
      bracket(ctx, -420 * (1 - u), 0, false, u, lerp(0.9, 1, u));
    }
    part(ctx, 760, BENCH_Y - 140, 45, 110, 'dim');
    part(ctx, 855 + jaw, BENCH_Y - 140, 45, 110, 'dim');
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(900 + jaw, BENCH_Y - 85);
    ctx.lineTo(980, BENCH_Y - 85);
    ctx.moveTo(980, BENCH_Y - 115);
    ctx.lineTo(980, BENCH_Y - 55);
    ctx.stroke();
    ctx.restore();

    // The session hand (hatched), parked right; carries the gusset in, leaves it, withdraws.
    const tip = lerp(HAND_REST, HAND_FIT, he.d);
    part(ctx, tip - 50, 590, 270, 40, 'session');
    if (!seated) gusset(ctx, tip - GUSSET, ARM_TOP + ARM_T);
    if (t >= 7.4) {
      const u = easeInOut(seg(t, 7.4, 7.9));
      gusset(ctx, HAND_REST - GUSSET + 120 * (1 - u), ARM_TOP + ARM_T, u, lerp(0.9, 1, u));
    }
    contact(ctx, LEG_X + LEG_W, ARM_TOP + ARM_T, he.c);

    // The fresh reviewer: drops in, three presses, lifts out. Clipped below the hood housing.
    if (t >= 0.7 && t < 4.2) {
      const y = RY0 + travel - 620 * (1 - easeOut(seg(t, 0.7, 1.2))) - 620 * easeIn(seg(t, 3.8, 4.2));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, HOOD_TOP + 4, W, H);
      ctx.clip();
      ring(ctx, rx, y, needle);
      ctx.restore();
    }
    if (flash) contact(ctx, flash[0], flash[1], flash[2]);

    // Hood: two curtains descend from the housing; the window over the bracket and slip stays open.
    const edge = HOOD_TOP + (BENCH_Y - HOOD_TOP) * (easeInOut(seg(t, 0, 0.7)) - easeInOut(seg(t, 3.8, 4.4)));
    if (edge > HOOD_TOP + 1) {
      ctx.save();
      for (const [x0, x1] of [[96, WIN_X0], [WIN_X1, 1824]]) {
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = C.ground;
        ctx.fillRect(x0, HOOD_TOP, x1 - x0, edge - HOOD_TOP);
        ctx.globalAlpha = 1;
        part(ctx, x0, HOOD_TOP, x1 - x0, edge - HOOD_TOP, 'dim');
      }
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(96, HOOD_TOP - 4);
    ctx.lineTo(1824, HOOD_TOP - 4);
    ctx.stroke();
    ctx.restore();

    note(ctx, beat(t));
  },
};
