// /deep-plan at final fidelity (pitch A 3.2, same beats and timing as the animatic's deep-plan.js).
// A key-cutting jig. The loose idea is an uncut key blank; each decision cuts one bit of the key.
// For every cut the selector proposes: its detents light and a green tick marks the recommended one.
// Only the person's key decides: each press is held down, and a cable runs from a drum beside the
// key, up a post, across the top of the bench and down to the selector, so the key going down pays
// out the cable and lowers their ivory pin into a detent; then the cutter wheel plunges to that
// depth. The second cut overrides the recommendation. Round 1 opens three
// positions; the fourth is tied to the second and opens in round 2. Go is a separate key and a
// separate press: the selector stays dark, the clamp lifts, the cut key slides out to the holder.
// Nothing is built. Seam: the key leaves right, a fresh blank feeds in at the entry.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, rgba, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, contactShadow, contactGlow, softGlow, dust, centreLine, dimension,
  benchFinal, lampFalloff, activeMat,
} from '../kit.mjs';

const T = 9.0;
const PERSON_FONT = 'italic 600 40px "Fraunces", "Fraunces fallback", serif'; // as on /merge's key

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

// Key blank, local units from its bottom-left corner, y up. The blank's registration hole is the
// key's ring; its clipped corner is the blade tip.
const KL = 560, BOW_W = 150, BOW_H = 150, BLADE_H = 84, TIP_C = 22, KEY_T = 14, BOW_R = 40, SHOULDER = [16, 12];
const RING = { x: 72, y: 92, r: 22 };
const NOTCH = [228, 310, 392, 474];
const DEPTH = [12, 36, 60]; // 24 units apart: 6 px between answers on a 480 wide card
const flank = (d) => 4 + d * 0.5; // constant flank angle, flat root 8 wide (steep, so deep neighbours never meet)
const YB = 690; // key bottom (bed top)
const X_ENTRY = 440, X_JIG = 640, X_HOLD = 1330;
const BLADE_TOP = YB - BLADE_H;
const POS = NOTCH.map((n) => X_JIG + n);

// Cutter: carriage on the overhead rail, quill, gearbox on the left, V-edged wheel on an arbor along x.
const R_WHEEL = 64, WHEEL_T = 12, TEETH = 24;
const PARK_X = 1212, PARK_B = 500; // wheel bottom when parked or hovering
const RAIL_Y0 = 286, RAIL_Y1 = 316, CAR_Y0 = 272, CAR_Y1 = 330;

// Selector: a plate on its own post between the person's keys and the jig. Lower detent = deeper cut.
const SEL_X = 500, SEL_HOME = 346, DET_Y = [384, 429, 474], TICK_X = SEL_X + 50;
const PLATE = { x0: SEL_X - 38, x1: SEL_X + 84, y0: 329, y1: 524 };

// Clamp: toggle clamp on a post behind the bow.
const CL_PIV = [775, 480], CL_ARM = 62;

// The person's keys, the same object as /merge's key: an ivory cap set in a bezel on a green stem
// that rides in a guide sleeve. An answer key and a separate Go key.
const KEY_A = 150, KEY_GO = 320, CAP_W_A = 160, CAP_W_GO = 120, CAP_H = 56;
const CAP_UP = FLOOR - 88, KEY_TRAVEL = 24, SLEEVE_TOP = FLOOR - 60;
const KEYBASE_Y = FLOOR - 40, KEYBASE_X0 = 30, KEYBASE_X1 = 410;

// The answer key's cable: a drum on the key base pays out cable when the key goes down; the cable
// runs up a post, over a pulley, across the top of the bench, over a second pulley on the selector
// column and down to the person's pin, which hangs on it. Cable travel = pin travel.
const DRUM = { x: 58, y: 752, r: 14 };
const CAB_X = DRUM.x - DRUM.r; // the rising run, left of the answer key's cap
const PUL_L = { x: CAB_X + 16, y: 300, r: 16 };
const PUL_R = { x: SEL_X - 16, y: 300, r: 16 }; // its right tangent drops straight down the selector slot
const CAB_Y = PUL_L.y - PUL_L.r;
// length of the run from the drum to the top of the selector slot (the lit part grows along it)
const CAB_LEN = (DRUM.y - PUL_L.y) + Math.PI * PUL_L.r / 2 + (PUL_R.x - PUL_L.x) + Math.PI * PUL_R.r / 2 + (DET_Y[2] - PUL_R.y);

// ---------------------------------------------------------------------------------------------
// Timing (same contract as the animatic).

const CUTS = [
  { start: 1.2, dur: 0.9333, rec: 0, pick: 0 },
  { start: 2.1333, dur: 0.9333, rec: 0, pick: 2 }, // override
  { start: 3.0667, dur: 0.9333, rec: 1, pick: 1 },
  { start: 4.2, dur: 0.9, rec: 1, pick: 1 }, // round 2, tied to position 2
];
const LIGHT = [0.85, 0.95, 1.05, 4.1];
const TIE_ON = 4.0;
const PARK_AT = [5.1, 5.42]; // cutter returns to park after cut 4
const GO_PRESS = 5.5;
const CLAMP_SHUT = [0.55, 0.75], CLAMP_OPEN = [5.58, 5.86];
const TO_HOLD = [5.95, 6.55];
const RESET = [8.12, 8.32]; // the lamps fade out together as the key leaves

const cutT = (c, f) => c.start + f * c.dur;
const pressT = (c) => cutT(c, 0.1);
const TRAVERSE = [0.55, 0.66]; // the cutter moves only after the person's pin has landed
const PLUNGE = 0.66;
const contactT = (c) => cutT(c, 0.82);
const LIGHT_RUN = 0.16, PIN_LAG = 0.14, PIN_MOVE = 0.2; // light runs key to pin; the pin follows
const smooth = (u) => u * u * (3 - 2 * u);

// Key press: eased down, held at the bottom, spring back with one small undershoot.
const KEY_DOWN = 0.07, KEY_HOLD = 0.35;
function press(t, t0, hold = KEY_HOLD) {
  if (t < t0) return 0;
  if (t < t0 + KEY_DOWN) return easeOut((t - t0) / KEY_DOWN);
  if (t < t0 + KEY_DOWN + hold) return 1;
  return 1 - springStep(t - t0 - KEY_DOWN - hold, 0.55, 42);
}

// The person's pin: home at the top; the cable lowers it into the chosen detent once the key is down,
// and draws it back up after the cut. Returns its y.
function pinY(t) {
  let py = SEL_HOME;
  for (const c of CUTS) {
    const t0 = pressT(c) + KEY_DOWN + PIN_LAG;
    if (t < t0) continue;
    const down = indexEase(seg(t, t0, t0 + PIN_MOVE));
    const up = easeInOut(seg(t, cutT(c, 0.88), cutT(c, 1)));
    py = lerp(SEL_HOME, DET_Y[c.pick], down * (1 - up));
  }
  return py;
}

// Wheel bottom (y) and x at time t.
function cutter(t) {
  let x = PARK_X, b = PARK_B;
  for (let i = 0; i < CUTS.length; i++) {
    const c = CUTS[i];
    if (t < (i === 0 ? c.start - 0.35 : c.start)) break;
    const prev = i === 0 ? PARK_X : POS[i - 1];
    // the first move to the work happens while the lamps light, before any question is asked
    const [m0, m1] = i === 0 ? [c.start - 0.35, c.start - 0.05] : [cutT(c, TRAVERSE[0]), cutT(c, TRAVERSE[1])];
    x = lerp(prev, POS[i], easeInOut(seg(t, m0, m1)));
    const down = easeInOut(seg(t, cutT(c, PLUNGE), contactT(c)));
    const up = easeIn(seg(t, cutT(c, 0.88), cutT(c, 1)));
    b = PARK_B + (BLADE_TOP + DEPTH[c.pick] - PARK_B) * (down - up);
  }
  if (t >= PARK_AT[0]) x = lerp(POS[3], PARK_X, easeInOut(seg(t, PARK_AT[0], PARK_AT[1])));
  return { x, b };
}

// Wheel angle: one full turn per cut, eased from rest to rest, so the seam angle is a whole turn.
function wheelSpin(t) {
  let a = 0, w = 0;
  for (const c of CUTS) {
    const t0 = cutT(c, 0.6), t1 = cutT(c, 0.98);
    const u = seg(t, t0, t1);
    a += Math.PI * 2 * smooth(u);
    if (u > 0 && u < 1) w += (Math.PI * 2 * 6 * u * (1 - u)) / (t1 - t0);
  }
  return { a, w };
}

function notchDepth(i, t) {
  const c = CUTS[i];
  if (t >= contactT(c)) return DEPTH[c.pick];
  if (t < cutT(c, PLUNGE)) return 0;
  const b = PARK_B + (BLADE_TOP + DEPTH[c.pick] - PARK_B) * easeInOut(seg(t, cutT(c, PLUNGE), contactT(c)));
  return clamp01((b - BLADE_TOP) / DEPTH[c.pick]) * DEPTH[c.pick];
}

// ---------------------------------------------------------------------------------------------
// The key blank.

function keyOutline(x0, depths) {
  const X = (u) => x0 + u, Y = (v) => YB - v;
  const pts = [[X(0), Y(0)]];
  // bow: rounded top corners
  for (const [cx, a0] of [[BOW_R, Math.PI], [BOW_W - BOW_R, Math.PI / 2]]) {
    for (let i = 0; i <= 6; i++) {
      const a = a0 - (i / 6) * (Math.PI / 2);
      pts.push([X(cx + BOW_R * Math.cos(a)), Y(BOW_H - BOW_R + BOW_R * Math.sin(a))]);
    }
  }
  // shoulder stop where the blade leaves the bow
  pts.push([X(BOW_W), Y(BLADE_H + SHOULDER[1])], [X(BOW_W + SHOULDER[0]), Y(BLADE_H + SHOULDER[1])], [X(BOW_W + SHOULDER[0]), Y(BLADE_H)]);
  for (let k = 0; k < 4; k++) {
    const d = depths ? depths[k] : 0;
    if (d < 0.25) continue;
    const n = NOTCH[k], h = flank(d);
    pts.push([X(n - h), Y(BLADE_H)], [X(n - 4), Y(BLADE_H - d)], [X(n + 4), Y(BLADE_H - d)], [X(n + h), Y(BLADE_H)]);
  }
  pts.push([X(KL - TIP_C), Y(BLADE_H)], [X(KL), Y(BLADE_H - TIP_C)], [X(KL), Y(0)]);
  return pts;
}

const KEY_MAT = { ...MAT.ivory, line: 'rgba(120,124,112,0.5)' };

// o: { x, depths, alpha, s }  s scales about the key's bottom centre.
function keyBlank(ctx, o) {
  const { x, depths = null, alpha = 1, s = 1 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (s !== 1) {
    const cx = x + KL / 2;
    ctx.translate(cx, YB);
    ctx.scale(s, s);
    ctx.translate(-cx, -YB);
  }
  contactShadow(ctx, x + KL / 2 + 14, YB - 6, KL * 0.56, 12, 0.55);
  const pts = keyOutline(x, depths);
  prism(ctx, pts, KEY_T, KEY_MAT);
  // lit top edges of the bow and the uncut blade
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,250,0.85)';
  ctx.lineWidth = lw(2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x + BOW_R, YB - BOW_H + BOW_R, BOW_R - 1.5, Math.PI * 1.15, Math.PI * 1.5);
  ctx.lineTo(x + BOW_W - BOW_R, YB - BOW_H + 1.5);
  ctx.arc(x + BOW_W - BOW_R, YB - BOW_H + BOW_R, BOW_R - 1.5, Math.PI * 1.5, Math.PI * 1.8);
  ctx.moveTo(x + BOW_W + 1, YB - BLADE_H - SHOULDER[1] + 1);
  ctx.lineTo(x + BOW_W + SHOULDER[0] - 1, YB - BLADE_H - SHOULDER[1] + 1);
  let px = x + BOW_W + SHOULDER[0];
  for (let k = 0; k < 4; k++) {
    const d = depths ? depths[k] : 0;
    if (d < 0.25) continue;
    const a = x + NOTCH[k] - flank(d);
    if (a > px + 2) { ctx.moveTo(px + 1, BLADE_TOP + 1); ctx.lineTo(a - 1, BLADE_TOP + 1); }
    px = x + NOTCH[k] + flank(d);
  }
  ctx.moveTo(px + 1, BLADE_TOP + 1);
  ctx.lineTo(x + KL - TIP_C - 1, BLADE_TOP + 1);
  ctx.stroke();
  ctx.restore();
  if (!LOD.card) {
    // raised rim on the bow, and the keyway milled along the blade
    ctx.save();
    ctx.strokeStyle = 'rgba(150,152,140,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x + 10, YB - BOW_H + 10, BOW_W - 20, BOW_H - 20, [BOW_R - 10, BOW_R - 10, 4, 4]);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,250,0.7)';
    ctx.beginPath();
    ctx.roundRect(x + 12, YB - BOW_H + 12, BOW_W - 24, BOW_H - 24, [BOW_R - 12, BOW_R - 12, 3, 3]);
    ctx.stroke();
    const ky = YB - 13;
    const g = ctx.createLinearGradient(0, ky - 7, 0, ky + 7);
    g.addColorStop(0, '#a2a397');
    g.addColorStop(0.6, '#c6c7bb');
    g.addColorStop(1, '#eeeee6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x + BOW_W + 26, ky - 6, KL - BOW_W - 70, 12, 6);
    ctx.fill();
    ctx.restore();
  }
  hole(ctx, x + RING.x, YB - RING.y, RING.r, KEY_T, MAT.ivory);
  // freshly cut flanks: fine section hatching on the visible notch faces
  if (depths && !LOD.card) {
    ctx.save();
    for (let k = 0; k < 4; k++) {
      const d = depths[k];
      if (d < 3) continue;
      const n = x + NOTCH[k], h = flank(d);
      const a = [n - h, BLADE_TOP], b = [n - 4, BLADE_TOP + d], c = [n + 4, BLADE_TOP + d];
      const face = [a, b, c, [c[0] + D.x * KEY_T, c[1] + D.y * KEY_T], [b[0] + D.x * KEY_T, b[1] + D.y * KEY_T], [a[0] + D.x * KEY_T, a[1] + D.y * KEY_T]];
      poly(ctx, face);
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(110,114,100,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let s2 = n - h - 40; s2 < n + 30; s2 += 5) { ctx.moveTo(s2, BLADE_TOP + d + 4); ctx.lineTo(s2 + 30, BLADE_TOP - 26); }
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Cutter: carriage on the rail, quill, gearbox, arbor and the V-edged wheel (axis along x).

function wheelPoint(hx, hy, fx, r, a) {
  // a = 0 at the bottom of the wheel; the disc lies in the y-z plane
  return [hx + fx + D.x * r * Math.sin(a), hy + r * Math.cos(a) + D.y * r * Math.sin(a)];
}

function wheel(ctx, hx, hy, ang, blur) {
  const R = R_WHEEL;
  // far face (left), seen as the crescent of rim to the left of the near face
  const far = [];
  for (let i = 0; i < 48; i++) far.push(wheelPoint(hx, hy, -WHEEL_T / 2, R, (i / 48) * Math.PI * 2));
  ctx.save();
  poly(ctx, far);
  ctx.fillStyle = '#121915';
  ctx.fill();
  // near face: toothed rim polygon
  const tb = clamp01(blur);
  const near = [];
  const N = TEETH * 2;
  for (let i = 0; i < N; i++) {
    const a = ang + (i / N) * Math.PI * 2;
    const r = i % 2 === 0 ? R : R - 6 * (1 - tb);
    near.push(wheelPoint(hx, hy, WHEEL_T / 2, r, a));
  }
  const g = ctx.createRadialGradient(hx - 10, hy - 26, 6, hx + 4, hy, R + 8);
  g.addColorStop(0, '#5b7563');
  g.addColorStop(0.45, '#33443a');
  g.addColorStop(1, '#151d18');
  poly(ctx, near);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2.4);
  ctx.lineJoin = 'round';
  ctx.stroke();
  // turned rings on the face (the disc's own ellipse), and a sharpened bevel near the rim
  if (!LOD.card) {
    ctx.lineWidth = 2;
    for (const [rs, col] of [[[R - 12], 'rgba(164,200,172,0.16)'], [[R - 22, R - 34], 'rgba(164,200,172,0.10)']]) {
      ctx.beginPath();
      for (const r of rs) {
        for (let i = 0; i < 40; i++) { const p = wheelPoint(hx, hy, WHEEL_T / 2, r, (i / 40) * Math.PI * 2); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.closePath();
      }
      ctx.strokeStyle = col;
      ctx.stroke();
    }
  }
  // three lightening holes and a hex nut: they carry the rotation when the teeth blur
  ctx.fillStyle = '#0a0e0b';
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = ang + (k / 3) * Math.PI * 2 + 0.5;
    const p = wheelPoint(hx, hy, WHEEL_T / 2, R * 0.52, a);
    ctx.moveTo(p[0] + 6.5 * Math.cos(-0.5), p[1] + 6.5 * Math.sin(-0.5));
    ctx.ellipse(p[0], p[1], 6.5, 8.5, -0.5, 0, Math.PI * 2);
  }
  ctx.fill();
  const hex = [];
  for (let k = 0; k < 6; k++) hex.push(wheelPoint(hx, hy, WHEEL_T / 2 + 3, 15, ang * 1 + (k / 6) * Math.PI * 2));
  poly(ctx, hex);
  ctx.fillStyle = '#43574a';
  ctx.fill();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(1.8);
  ctx.stroke();
  ctx.fillStyle = '#1a231d';
  ctx.beginPath();
  ctx.arc(hx + WHEEL_T / 2 + 3, hy, 5, 0, Math.PI * 2);
  ctx.fill();
  // motion blur band on the rim while it spins fast
  if (tb > 0.02) {
    const band = [];
    for (let i = 0; i < 48; i++) band.push(wheelPoint(hx, hy, WHEEL_T / 2, R - 3, (i / 48) * Math.PI * 2));
    poly(ctx, band);
    ctx.strokeStyle = `rgba(150,190,160,${0.35 * tb})`;
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  // specular arc, fixed to the light (does not turn with the wheel)
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const p = wheelPoint(hx, hy, WHEEL_T / 2, R - 4, Math.PI * (0.62 + 0.28 * (i / 12)));
    i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
  }
  ctx.strokeStyle = 'rgba(200,240,210,0.45)';
  ctx.lineWidth = lw(2.5);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

function cutterHead(ctx, x, b, spin, active) {
  const SM = activeMat(MAT.session, active);
  const hx = x, hy = b - R_WHEEL;
  const qx = hx - 52;
  const gy0 = hy - 46, gy1 = hy + 8;
  // carriage on the rail
  prism(ctx, rect(qx - 58, CAR_Y0, 116, CAR_Y1 - CAR_Y0), 52, SM, { hatch: true, sil: 3.5 });
  ctx.fillStyle = '#0b120d';
  ctx.fillRect(qx - 46, RAIL_Y0 + 4, 92, 6);
  // quill telescoping out of the carriage
  rodV(ctx, qx, CAR_Y1 - 2, gy0 + 2, 24, SM);
  if (!LOD.card) {
    ctx.save();
    ctx.strokeStyle = 'rgba(10,20,14,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = CAR_Y1 + 12; y < gy0 - 4; y += 18) { ctx.moveTo(qx - 11, y); ctx.lineTo(qx + 11, y); }
    ctx.stroke();
    ctx.restore();
  }
  // arbor from the gearbox into the hub
  rodH(ctx, qx + 24, hx - WHEEL_T / 2 + 2, hy, 14, MAT.lit);
  // gearbox
  prism(ctx, rect(qx - 30, gy0, 60, gy1 - gy0), 44, SM, { hatch: true, sil: 3.5 });
  ball(ctx, qx, hy - 20, 6, SM);
  wheel(ctx, hx, hy, spin.a, spin.w / 9);
  centreLine(ctx, hx, hy - R_WHEEL - 22, hx, hy - 30, 0.4);
}

// ---------------------------------------------------------------------------------------------
// Selector (dynamic parts), indicator lamps, clamp arm, the person's keys.

function selector(ctx, t) {
  // proposal: which cut is asking, how lit
  let q = null, a = 0;
  for (const c of CUTS) {
    if (t < c.start || t >= cutT(c, 1)) continue;
    q = c;
    a = indexEase(seg(t, c.start, c.start + 0.12)) * (1 - easeIn(seg(t, cutT(c, 0.88), cutT(c, 1))));
  }
  if (q && a > 0) {
    // the open options: each detent gets a faint green ring
    ctx.save();
    ctx.strokeStyle = rgba(P.green, 0.55 * Math.min(1, a));
    ctx.lineWidth = lw(3);
    for (const y of DET_Y) {
      ctx.beginPath();
      ctx.arc(SEL_X, y, 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    // the recommended tick, lit in its window
    const ry = DET_Y[q.rec];
    softGlow(ctx, TICK_X, ry, 34, P.green, 0.32 * Math.min(1, a));
    ctx.strokeStyle = mix('#1d3a27', P.bright, Math.min(1, a));
    ctx.lineWidth = lw(4.5);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(TICK_X - 9, ry + 1);
    ctx.lineTo(TICK_X - 2, ry + 8);
    ctx.lineTo(TICK_X + 10, ry - 9);
    ctx.stroke();
    ctx.restore();
  }
  // the person's pin, hanging on the cable from the answer key
  const py = pinY(t);
  cable(ctx, py - SEL_HOME, py, cableLight(t));
  contactShadow(ctx, SEL_X + 6, py + 10, 19, 8, 0.6);
  ball(ctx, SEL_X, py, 14, PIN_MAT);
}

const PIN_MAT = { ...MAT.ivory, top: '#fbfbf4', side: '#9fa095', hi: '#ffffff', sil: 'rgba(110,114,100,0.8)' };

// Spokes of a turning wheel (drum or pulley); the disc itself is in the static back layer.
function spokes(ctx, p, ang) {
  ctx.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = ang + (k / 3) * Math.PI * 2;
    ctx.moveTo(p.x + Math.cos(a) * 4, p.y + Math.sin(a) * 4);
    ctx.lineTo(p.x + Math.cos(a) * (p.r - 4), p.y + Math.sin(a) * (p.r - 4));
  }
  ctx.stroke();
}

// The cable, paid out by d (= pin travel): drum and pulleys turn by d / r, the crimped sleeves on
// the cable slide with it, and the end hangs the pin at py.
// The cable's light: [lit length from the key end, strength]. It runs from the key to the pin as
// the key bottoms, holds while the key is held, and fades after the release.
function cableLight(t) {
  let len = 0, a = 0;
  for (const c of CUTS) {
    const t0 = pressT(c) + KEY_DOWN;
    if (t < t0) continue;
    const fade = 1 - seg(t, pressT(c) + KEY_DOWN + KEY_HOLD, pressT(c) + KEY_DOWN + KEY_HOLD + 0.2);
    if (fade <= 0) continue;
    len = CAB_LEN * easeOut(seg(t, t0, t0 + LIGHT_RUN));
    a = fade;
  }
  return [len, a];
}

function cable(ctx, d, py, light) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#a4c4ab';
  ctx.lineWidth = lw(3);
  spokes(ctx, DRUM, d / DRUM.r);
  spokes(ctx, PUL_L, d / PUL_L.r);
  spokes(ctx, PUL_R, d / PUL_R.r);
  // the run: up from the drum, over the left pulley, across, over the right pulley, down to the pin
  ctx.beginPath();
  ctx.moveTo(CAB_X, DRUM.y);
  ctx.lineTo(CAB_X, PUL_L.y);
  ctx.arc(PUL_L.x, PUL_L.y, PUL_L.r, Math.PI, Math.PI * 1.5);
  ctx.lineTo(PUL_R.x, CAB_Y);
  ctx.arc(PUL_R.x, PUL_R.y, PUL_R.r, Math.PI * 1.5, 0);
  ctx.lineTo(SEL_X, py - 11);
  ctx.strokeStyle = '#060807';
  ctx.lineWidth = lw(6.5);
  ctx.stroke();
  ctx.strokeStyle = '#7f9c86';
  ctx.lineWidth = lw(3.5);
  ctx.stroke();
  // the person's press lights the cable from the key end along its whole run
  const [len, la] = light;
  if (la > 0 && len > 1) {
    ctx.setLineDash([len, 5000]);
    ctx.strokeStyle = rgba(P.bright, 0.22 * la);
    ctx.lineWidth = lw(12);
    ctx.stroke();
    ctx.strokeStyle = mix('#7f9c86', '#e6ffec', la);
    ctx.lineWidth = lw(3.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // crimped sleeves: they carry the cable's travel where the eye can see it
  ctx.fillStyle = '#d6d7cb';
  ctx.beginPath();
  for (let i = 0; i < 2; i++) ctx.rect(104 + i * 150 + d, CAB_Y - 4.5, 16, 9);
  ctx.rect(CAB_X - 4.5, 600 - d, 9, 16);
  ctx.fill();
  ctx.restore();
}

function lamps(ctx, t) {
  const fade = 1 - easeInOut(seg(t, RESET[0], RESET[1]));
  const off = (u) => u * fade;
  // tie channel from position 2 to position 4
  const tie = [[POS[1], 738], [POS[1], 754], [POS[3], 754], [POS[3], 738]];
  const tieA = off(indexEase(seg(t, TIE_ON, TIE_ON + 0.16)));
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (tieA > 0) {
    ctx.strokeStyle = rgba(P.green, Math.min(1, tieA));
    ctx.lineWidth = lw(4);
    ctx.beginPath();
    tie.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    softGlow(ctx, (POS[1] + POS[3]) / 2, 754, 90, P.green, 0.08 * Math.min(1, tieA));
  }
  ctx.restore();
  const r = LOD.card ? 15 : 12;
  for (let k = 0; k < 4; k++) {
    const lit = off(seg(t, LIGHT[k], LIGHT[k] + 0.06));
    if (lit <= 0) continue; // dark glass and its highlight are in the static layers
    const done = off(seg(t, contactT(CUTS[k]), contactT(CUTS[k]) + 0.08));
    const pulse = t >= RESET[0] ? 0 : Math.max(Math.sin(Math.PI * seg(t, LIGHT[k], LIGHT[k] + 0.16)), Math.sin(Math.PI * seg(t, contactT(CUTS[k]), contactT(CUTS[k]) + 0.16)));
    const x = POS[k], y = 724, rr = r * (1 + 0.1 * pulse);
    const g = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.4, 1, x, y, rr);
    // dark glass, then open (dim green), then done (lit): each stage mixes over the last, no pops
    const c0 = mix('#18221b', '#2f6141', lit), c1 = mix('#101712', '#183a24', lit), c2 = mix('#070a08', '#0f2416', lit);
    g.addColorStop(0, mix(c0, '#d8ffe2', done));
    g.addColorStop(0.5, mix(c1, P.bright, done));
    g.addColorStop(1, mix(c2, '#2f8a4a', done));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lit > 0 ? mix('#2f3d33', P.green, lit) : '#2f3d33';
    ctx.lineWidth = lw(2.5);
    ctx.stroke();
    if (done > 0) softGlow(ctx, x, y, 34, P.green, 0.28 * done);
  }
}

// A lamp's dark glass (static) and its highlight (static, laid over the lit glass too).
function lampGlass(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#18221b');
  g.addColorStop(0.5, '#101712');
  g.addColorStop(1, '#070a08');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f3d33';
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
}
function lampHighlight(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(243,243,236,0.22)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.32, r * 0.18, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

// Clamp arm rotates as one rigid lever about the pivot. u: 0 open, 1 shut.
function clampArm(ctx, u) {
  const [px, py] = CL_PIV;
  const lift = 0.72 * (1 - u);
  const a = Math.PI + lift; // arm pointing left, end raised when open
  const ex = px + CL_ARM * Math.cos(a), ey = py + CL_ARM * Math.sin(a);
  const ha = -1.92 + lift; // handle: up and a little left when shut
  const hx = px + 64 * Math.cos(ha), hy = py + 64 * Math.sin(ha);
  ctx.save();
  ctx.lineCap = 'round';
  // spindle and pad hang from the arm end
  const padB = ey + 60;
  rodV(ctx, ex, ey, padB - 12, 9, MAT.lit);
  if (!LOD.card) {
    ctx.strokeStyle = '#0c110d';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let y = ey + 10; y < padB - 18; y += 5) { ctx.moveTo(ex - 4.5, y + 2); ctx.lineTo(ex + 4.5, y - 1); }
    ctx.stroke();
  }
  prism(ctx, rect(ex - 9, ey + 22, 18, 9), 14, MAT.lit, { sil: 2 }); // lock nut
  const pg = ctx.createLinearGradient(0, padB - 12, 0, padB);
  pg.addColorStop(0, '#26302a');
  pg.addColorStop(1, '#0d120f');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.roundRect(ex - 15, padB - 12, 30, 12, 4);
  ctx.fill();
  // arm and handle
  for (const [x1, y1, w] of [[ex, ey, 14], [hx, hy, 11]]) {
    ctx.strokeStyle = '#0d120f';
    ctx.lineWidth = lw(w + 4);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = '#43574a';
    ctx.lineWidth = lw(w);
    ctx.stroke();
    ctx.strokeStyle = '#86a98e';
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    ctx.moveTo(px, py - w / 2 + 1);
    ctx.lineTo(x1, y1 - w / 2 + 1);
    ctx.stroke();
  }
  ball(ctx, hx, hy, 11, MAT.lit);
  ball(ctx, px, py, 9, MAT.lit);
  ctx.restore();
  return { padX: ex, padB };
}

// The person's keys are /merge's key object: an ivory cap set in a dark bezel on a green stem that
// rides in a guide sleeve, the legend in Fraunces Italic. The stem and sleeve never move (the cap
// slides down over the stem): they are in the back layer. The bezel and cap are a sprite at rest
// height that a press translates down.
function roundRectPts(x0, y0, x1, y1, r, inset = 0) {
  const pts = [];
  const corners = [[x1 - r - inset, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r + inset, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 4; k++) { const a = a0 + (k / 4) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}

function keyStem(ctx, x) {
  rodV(ctx, x + D.x * 22, CAP_UP - 8, SLEEVE_TOP + 4, 22, MAT.fresh);
  prism(ctx, rect(x - 26, SLEEVE_TOP, 52, KEYBASE_Y - SLEEVE_TOP), 44, MAT.lit, { sil: 2.6 });
}

function keyCap(ctx, x, w) {
  const cb = CAP_UP, ct = cb - CAP_H;
  const x0 = x - w / 2, x1 = x + w / 2;
  prism(ctx, roundRectPts(x0 - 7, ct - 6, x1 + 7, cb + 5, 14, 4), 46, MAT.lit, { sil: 2.8 });
  const pts = roundRectPts(x0, ct, x1, cb, 11, 5);
  prism(ctx, pts, 40, MAT.ivory, { noLines: true });
  const g = ctx.createRadialGradient(x - 30, ct + 10, 6, x, (ct + cb) / 2, w * 0.62);
  g.addColorStop(0, '#fbfbf5');
  g.addColorStop(0.6, '#ebebe1');
  g.addColorStop(1, '#cfd0c4');
  poly(ctx, pts);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(112,116,104,0.75)';
  ctx.lineWidth = lw(1.6);
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,250,0.95)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x0 + 18, ct + 1.5);
  ctx.lineTo(x1 - 18, ct + 1.5);
  ctx.stroke();
}

function personKey(ctx, x, w, p, legend) {
  const dy = p * KEY_TRAVEL;
  // the press darkens the gap under the cap as it seats on the sleeve
  contactShadow(ctx, x + 20, SLEEVE_TOP - 2, w * 0.34, 8, 0.2 + 0.35 * p);
  const x0 = Math.floor((x - w / 2 - 16) / 8) * 8;
  sprite(ctx, 'deep-plan-cap-' + x, x0, 592, w + 64, 112, (c) => keyCap(c, x, w), 0, dy);
  if (legend) {
    // the legend stays live text (the font may load after the first frame)
    ctx.save();
    ctx.font = PERSON_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#171c18';
    ctx.fillText(legend, x - 2, CAP_UP - CAP_H / 2 + dy + 2);
    ctx.restore();
  }
}

// Small static sprites cached per device scale (one scale per id), drawn translated. Like kit
// cached(), the sprite is drawn with the same calls every time, so output never depends on the cache.
const sprites = new Map();
function sprite(ctx, id, x0, y0, w, h, draw, dx = 0, dy = 0) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  let L = sprites.get(id);
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
    L = { cv, s };
    sprites.set(id, L);
  }
  ctx.drawImage(L.cv, x0 + dx, y0 + dy, w, h);
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 900, 600);
  // rail column, behind the out-rail
  contactShadow(ctx, 1400, FLOOR - 40, 80, 14, 0.5);
  prism(ctx, rect(1352, 300, 46, 380), 40, MAT.metal, { sil: 3 });
  // overhead rail and its gusset
  prism(ctx, rect(700, RAIL_Y0, 700, RAIL_Y1 - RAIL_Y0), 44, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#5f8167';
  ctx.fillRect(704, RAIL_Y0 + 1, 692, 2);
  ctx.fillStyle = '#080b09';
  ctx.fillRect(704, RAIL_Y0 + 13, 644, 4);
  prism(ctx, [[1352, RAIL_Y1], [1352, RAIL_Y1 + 70], [1282, RAIL_Y1]], 30, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (let x = 740; x < 1340; x += 90) ball(ctx, x, RAIL_Y1 - 6, 3, MAT.metal);
  centreLine(ctx, 700, (RAIL_Y0 + RAIL_Y1) / 2, 1400, (RAIL_Y0 + RAIL_Y1) / 2, 0.35);
  // selector plate on its own post, behind the entry shelf; the cable's pulley on a bracket above it
  contactShadow(ctx, SEL_X + 40, FLOOR - 30, 60, 12, 0.45);
  prism(ctx, rect(SEL_X + 22, PLATE.y1 - 4, 30, FLOOR - 40 - PLATE.y1 + 4), 36, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(PUL_R.x - 6, PUL_R.y, 12, PLATE.y0 - PUL_R.y + 2), 16, MAT.metal, { sil: 2 });
  prism(ctx, rect(PLATE.x0, PLATE.y0, PLATE.x1 - PLATE.x0, PLATE.y1 - PLATE.y0), 18, MAT.lit, { sil: 3 });
  ctx.fillStyle = '#070a08';
  ctx.beginPath();
  ctx.roundRect(SEL_X - 6, SEL_HOME - 10, 12, DET_Y[2] - SEL_HOME + 20, 6);
  ctx.fill();
  for (const y of DET_Y) {
    hole(ctx, SEL_X, y, 10, 18, MAT.lit);
    ctx.fillStyle = '#080c09';
    ctx.beginPath();
    ctx.roundRect(TICK_X - 16, y - 15, 32, 30, 5);
    ctx.fill();
    ctx.strokeStyle = '#34453a';
    ctx.lineWidth = lw(1.5);
    ctx.stroke();
  }
  for (const x of [PLATE.x0 + 8, PLATE.x1 - 8]) for (const y of [PLATE.y0 + 8, PLATE.y1 - 8]) ball(ctx, x, y, 3.2, MAT.lit);
  pulleyDisc(ctx, PUL_R);
  dimension(ctx, PLATE.x1, DET_Y[0], PLATE.x1, DET_Y[2], 22, 0.45);
  // clamp post behind the bow
  prism(ctx, rect(762, 478, 26, YB - 478), 30, MAT.metal, { sil: 2.5 });
  // entry shelf (left) and out rail (right): thin plates on legs
  for (const [x0, x1] of [[KEYBASE_X1 + 12, 628], [1282, 1990]]) {
    contactShadow(ctx, (x0 + x1) / 2, FLOOR - 6, (x1 - x0) / 2, 16, 0.45);
    for (const lx of [x0 + 28, x1 - 60]) if (lx < W) prism(ctx, rect(lx, YB + 16, 20, FLOOR - YB - 16), 40, MAT.metal, { sil: 2.5 });
    prism(ctx, rect(x0, YB, x1 - x0, 16), 64, MAT.metal, { sil: 3 });
  }
  // the jig: a solid bed under the active station
  contactShadow(ctx, 960, FLOOR - 6, 380, 22, 0.6);
  prism(ctx, rect(632, YB, 642, FLOOR - YB), 70, MAT.lit, { sil: 3.5 });
  ctx.fillStyle = '#5f8167';
  ctx.fillRect(634, YB + 1, 638, 2);
  // engraved tie channel and lamp bezels on the bed's front face
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#080b09';
  ctx.lineWidth = lw(7);
  ctx.beginPath();
  ctx.moveTo(POS[1], 738); ctx.lineTo(POS[1], 754); ctx.lineTo(POS[3], 754); ctx.lineTo(POS[3], 738);
  ctx.stroke();
  ctx.strokeStyle = '#34453a';
  ctx.lineWidth = lw(1.5);
  ctx.beginPath();
  ctx.moveTo(POS[1] + 4, 758); ctx.lineTo(POS[3] - 4, 758);
  ctx.stroke();
  ctx.restore();
  for (const x of POS) {
    ctx.fillStyle = '#0a0e0b';
    ctx.beginPath();
    ctx.arc(x, 724, LOD.card ? 19 : 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4f6f57';
    ctx.lineWidth = lw(2);
    ctx.stroke();
  }
  for (const x of [652, 1254]) { ball(ctx, x, YB + 18, 4, MAT.lit); ball(ctx, x, FLOOR - 14, 4, MAT.lit); }
  for (const x of POS) lampGlass(ctx, x, 724, LOD.card ? 15 : 12);
  // the cable post behind the key base, its pulley on top
  prism(ctx, rect(PUL_L.x - 7, PUL_L.y, 14, FLOOR - PUL_L.y), 24, MAT.metal, { sil: 2.5 });
  pulleyDisc(ctx, PUL_L);
  // the person's key base, the cable drum on its end, the key stems
  contactShadow(ctx, (KEYBASE_X0 + KEYBASE_X1) / 2, FLOOR - 6, 210, 16, 0.55);
  prism(ctx, rect(KEYBASE_X0, KEYBASE_Y, KEYBASE_X1 - KEYBASE_X0, FLOOR - KEYBASE_Y), 70, MAT.metal, { sil: 3 });
  ctx.fillStyle = '#4f6f57';
  ctx.fillRect(KEYBASE_X0 + 2, KEYBASE_Y + 1, KEYBASE_X1 - KEYBASE_X0 - 4, 2);
  pulleyDisc(ctx, DRUM);
  keyStem(ctx, KEY_A);
  keyStem(ctx, KEY_GO);
}

// A grooved pulley or drum face, seen end on; its spokes are drawn turning on top of it.
function pulleyDisc(ctx, p) {
  ctx.fillStyle = '#060807';
  ctx.beginPath();
  ctx.arc(p.x + 2, p.y + 3, p.r + 1, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(p.x - p.r * 0.4, p.y - p.r * 0.45, 1, p.x, p.y, p.r);
  g.addColorStop(0, '#5b7563');
  g.addColorStop(0.5, '#2a362d');
  g.addColorStop(1, '#131915');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2);
  ctx.stroke();
  ctx.strokeStyle = '#0b100d';
  ctx.lineWidth = lw(1.5);
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r - 3.5, 0, Math.PI * 2);
  ctx.stroke();
}

function frontLayer(ctx) {
  for (const x of POS) lampHighlight(ctx, x, 724, LOD.card ? 15 : 12);
  lampFalloff(ctx, 820, 560, 560, 1300, 0.5);
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'deep-plan',
  name: '/deep-plan',
  caption: 'Interview a loose idea into decisions the user made',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'deep-plan-final-back', backLayer);

    selector(ctx, t);
    lamps(ctx, t);

    // The work: the blank feeds in, is cut, slides to the holder; in the seam it leaves and a new one arrives.
    const depths = [0, 1, 2, 3].map((i) => notchDepth(i, t));
    if (t < 8.1) {
      let x = X_JIG;
      if (t < 0.55) x = lerp(X_ENTRY, X_JIG, easeInOut(seg(t, 0, 0.55)));
      else if (t >= TO_HOLD[0]) x = lerp(X_JIG, X_HOLD, easeInOut(seg(t, TO_HOLD[0], TO_HOLD[1])));
      keyBlank(ctx, { x, depths });
    } else {
      const u = seg(t, 8.1, 8.8);
      keyBlank(ctx, { x: X_HOLD + 420 * easeIn(u), depths, alpha: 1 - easeIn(seg(t, 8.3, 8.8)), s: lerp(1, 0.92, easeIn(u)) });
    }
    if (t >= 8.4) {
      const u = easeOut(seg(t, 8.4, 9.0));
      keyBlank(ctx, { x: lerp(X_ENTRY - 20, X_ENTRY, u), alpha: easeOut(seg(t, 8.4, 8.75)), s: lerp(0.92, 1, u) });
    }

    // Clamp: swings shut on the bow after the feed, lifts after Go.
    const shutU = easeInOut(seg(t, CLAMP_SHUT[0], CLAMP_SHUT[1])) - easeInOut(seg(t, CLAMP_OPEN[0], CLAMP_OPEN[1]));
    const settle = t > CLAMP_SHUT[1] && t < CLAMP_OPEN[0] ? 0.03 * Math.exp(-14 * (t - CLAMP_SHUT[1])) * Math.sin(40 * (t - CLAMP_SHUT[1])) : 0;
    const clamp = clampArm(ctx, clamp01(shutU) - settle);

    // Cutter: idle dim at park, lit while it works.
    const cut = cutter(t);
    const spin = wheelSpin(t);
    const active = easeInOut(seg(t, 1.0, 1.3)) - easeInOut(seg(t, 5.1, 5.6));
    // shadow of the wheel on the blade top as it closes in
    const gap = BLADE_TOP - cut.b;
    if (t > 1.2 && t < 5.1 && gap < 90) contactShadow(ctx, cut.x + 8, BLADE_TOP + 2, 22 + gap * 0.3, 5, 0.5 * clamp01(1 - gap / 90));
    cutterHead(ctx, cut.x, cut.b, spin, active);

    // The person's keys: the answer key presses for each cut; Go is its own key and its own press.
    let pa = 0;
    for (const c of CUTS) pa = Math.max(pa, press(t, pressT(c)));
    personKey(ctx, KEY_A, CAP_W_A, pa, '');
    personKey(ctx, KEY_GO, CAP_W_GO, press(t, GO_PRESS), 'Go');

    cached(ctx, 'deep-plan-final-front', frontLayer);

    // Light over the falloff: cut contacts and swarf, the clamp seating.
    for (let i = 0; i < CUTS.length; i++) {
      const c = CUTS[i];
      const ct = contactT(c);
      contactGlow(ctx, POS[i], BLADE_TOP + DEPTH[c.pick], (t - ct) / 0.12, 38);
      dust(ctx, POS[i] - 6, BLADE_TOP + DEPTH[c.pick] - 4, t - ct, 0xd0 + i, { ang: -Math.PI * 0.8, spread: 1.1, n: 7, dur: 0.5 });
      dust(ctx, POS[i] + 8, BLADE_TOP + DEPTH[c.pick] - 2, t - ct - 0.05, 0xe0 + i, { ang: -Math.PI * 0.2, spread: 0.9, n: 4, dur: 0.4 });
    }
    contactGlow(ctx, clamp.padX, YB - BOW_H, (t - CLAMP_SHUT[1]) / 0.12, 26);
    // the lamp pool comes onto the key while it is held, and its stem flashes as it seats
    const pg = press(t, GO_PRESS);
    for (const [kx, p] of [[KEY_A, pa], [KEY_GO, pg]]) if (p > 0.05) softGlow(ctx, kx, CAP_UP - 20, 150, P.paper, 0.13 * Math.min(1, p));
    for (const c of CUTS) contactGlow(ctx, KEY_A, SLEEVE_TOP, (t - pressT(c) - KEY_DOWN + 0.02) / 0.12, 30);
    contactGlow(ctx, KEY_GO, SLEEVE_TOP, (t - GO_PRESS - KEY_DOWN + 0.02) / 0.12, 30);

    grainOver(ctx, 0.3, 'soft-light');
  },
};
