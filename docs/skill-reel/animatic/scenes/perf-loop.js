import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

// /perf-loop animatic: inclined-plane timing rig with a strip-chart recorder.
// Two rounds per loop. Candidate B beats the baseline and is kept; candidate C lands inside
// the baseline's spread and is reverted. The chart paper moves at constant speed the whole loop.

const T = 10.0;

// Track, drawn in a local frame rotated down the incline: x along the track, y perpendicular (down positive).
const P0 = { x: 230, y: 380 };
const ANG = Math.atan2(300, 800);
const CA = Math.cos(ANG), SA = Math.sin(ANG);
const L = 854;
const SEL0 = 330, SEL1 = 520, SEC_LEN = SEL1 - SEL0, SEC_H = 26;
const D = 110; // selector stroke: slot 1 sits D below slot 0
const PARK = D + 140; // hand park pose: top of the section it holds
const SLED_REST = 70, SLED_END = 800, GATE_TOP = 160, GATE_BOT = 760;
const RUN = 0.6, IDX = 0.14;
const ROUNDS = [0.4, 4.6];
const DROP = { base: 0.28, B: 0.22, C: 0.27 }; // B really runs faster
const ROW = { base: 430, B: 560, C: 445 }; // chart rows, relative to the current baseline
const SLOT_T = [0.0, 4.2];
const RELOAD = [[0.9, 2.5], [5.0, 6.6]];
const ENG_A = (0.4 - 0.2) / 1.75; // engage approach inside a 0.4 s beat

// Strip chart
const CH = { x: 1180, y: 290, w: 620, h: 410 };
const PAPER = { x: 1200, y: 310, w: 580, h: 370 };
const PEN_X = 1720, V = 52, GRID = 52; // V * T = 520 px: paper advances one loop width per loop

// Retired rack
const RACK_X = 150, RACK_TOP = 640, RACK_STEP = 44;

const toW = (lx, ly) => ({ x: P0.x + lx * CA - ly * SA, y: P0.y + lx * SA + ly * CA });

// Index: 140 ms click with 4% overshoot, then settle.
function idx(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < 0.6) return 1.04 * easeOut(u / 0.6);
  return 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4);
}

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, u) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], u))).join(',')})`;
}

function runList() {
  const r = rng(7);
  const out = [];
  ROUNDS.forEach((R, ri) => {
    for (let k = 0; k < 4; k++) {
      const cand = k % 2 === 1;
      const kind = cand ? (ri === 0 ? 'B' : 'C') : 'base';
      const t0 = R + RUN * k;
      const drop = DROP[kind];
      out.push({ t0, kind, cand, drop, tDot: t0 + IDX + drop, y: ROW[kind] + (r() - 0.5) * 28 });
    }
  });
  return out;
}

// Selector position: 0 = slot 0 (baseline) in the track, 1 = slot 1 (candidate) in the track.
function carriage(t, runs) {
  const ev = [];
  let prev = 0;
  runs.forEach((r, i) => {
    const target = r.cand ? 1 : 0;
    if (target !== prev) ev.push([r.t0, prev, target]);
    prev = target;
    if (i === 3) { ev.push([4.04, 1, 0]); prev = 0; }
    if (i === 7) { ev.push([7.6, 1, 0]); prev = 0; }
  });
  let c = 0;
  for (const [s, a, b] of ev) if (t >= s) c = lerp(a, b, idx(seg(t, s, s + IDX)));
  return c;
}

function sledPos(t, runs) {
  for (const r of runs) {
    if (t >= r.t0 + IDX && t < r.t0 + RUN) {
      const td = t - r.t0 - IDX;
      if (td < r.drop) { const u = td / r.drop; return SLED_REST + (SLED_END - SLED_REST) * u * u; }
      const ret = RUN - IDX - r.drop;
      return lerp(SLED_END, SLED_REST, easeInOut((td - r.drop) / ret));
    }
  }
  return SLED_REST;
}

function penY(t, runs) {
  let y = runs[runs.length - 1].y;
  for (const r of runs) {
    const a = r.t0 + IDX, b = r.tDot;
    if (t >= b) y = r.y;
    else { if (t >= a) y = lerp(y, r.y, easeInOut((t - a) / (b - a))); break; }
  }
  return y;
}

function hand(t) {
  for (let i = 0; i < 2; i++) {
    const s = SLOT_T[i];
    if (t >= s && t < s + 0.4) {
      const lt = t - s;
      if (lt < ENG_A) return { y: lerp(PARK, D, easeInOut(lt / ENG_A)), holding: true };
      if (lt < ENG_A + 0.2) return { y: D, holding: false };
      return { y: lerp(D, PARK, easeIn(Math.min(1, (lt - ENG_A - 0.2) / (0.75 * ENG_A)))), holding: false };
    }
    const [r0, r1] = RELOAD[i];
    if (t >= s + 0.4 && t < r0) return { y: PARK, holding: false };
    if (t >= r0 && t < r1) {
      const m = (r0 + r1) / 2;
      if (t < m) return { y: lerp(PARK, 1050, easeInOut(seg(t, r0, m))), holding: false };
      return { y: lerp(1050, PARK, easeInOut(seg(t, m, r1))), holding: true };
    }
  }
  return { y: PARK, holding: true };
}

// Hatched bar in the current transform.
function bar(ctx, x, y, len, stroke, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.rect(x, y, len, SEC_H);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let d = -SEC_H; d < len; d += 14) {
    ctx.moveTo(x + d, y + SEC_H);
    ctx.lineTo(x + d + SEC_H, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(x, y, len, SEC_H);
  ctx.restore();
}

function drawRack(ctx, t) {
  ctx.save();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(RACK_X - SEC_LEN / 2 - 16, RACK_TOP - 24);
  ctx.lineTo(RACK_X - SEC_LEN / 2 - 16, BENCH_Y);
  ctx.moveTo(RACK_X + SEC_LEN / 2 + 16, RACK_TOP - 24);
  ctx.lineTo(RACK_X + SEC_LEN / 2 + 16, BENCH_Y);
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(0, 0, W, BENCH_Y - 2);
  ctx.clip();
  const shift = RACK_STEP * idx(seg(t, 9.8, 9.94));
  const ks = t >= 4.0 ? [0, 1, 2, 3] : [1, 2, 3];
  for (const k of ks) {
    const y = RACK_TOP + k * RACK_STEP + shift;
    if (y < BENCH_Y) bar(ctx, RACK_X - SEC_LEN / 2, y, SEC_LEN, C.sub, 0.85); // below the bench line it has gone into the bench
  }
  ctx.restore();
}

function drawChart(ctx, t, runs) {
  ctx.save();
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 4;
  ctx.strokeRect(CH.x, CH.y, CH.w, CH.h);
  ctx.strokeStyle = C.dim;
  ctx.strokeRect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  ctx.beginPath();
  ctx.rect(PAPER.x, PAPER.y, PAPER.w, PAPER.h);
  ctx.clip();
  // Ruling moves with the paper.
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = PEN_X - ((V * t) % GRID) + GRID * 2; x > PAPER.x - GRID; x -= GRID) {
    if (x < PAPER.x || x > PAPER.x + PAPER.w) continue;
    ctx.moveTo(x, PAPER.y);
    ctx.lineTo(x, PAPER.y + PAPER.h);
  }
  ctx.stroke();
  // Dots: each run marks one; earlier loops' dots are still on the paper (replacement by loop offset m).
  for (const r of runs) {
    for (let m = 0; m < 3; m++) {
      const age = t - r.tDot + m * T;
      if (age < 0) continue;
      const x = PEN_X - V * age;
      if (x < PAPER.x - 20) continue;
      ctx.fillStyle = r.cand ? C.green : C.sub;
      ctx.beginPath();
      ctx.arc(x, r.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // Pen guide and pen.
  const py = penY(t, runs);
  ctx.save();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(PEN_X + 30, PAPER.y);
  ctx.lineTo(PEN_X + 30, PAPER.y + PAPER.h);
  ctx.stroke();
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(PEN_X + 8, py);
  ctx.lineTo(PEN_X + 44, py - 16);
  ctx.lineTo(PEN_X + 44, py + 16);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  for (const r of runs) contact(ctx, PEN_X, r.y, (t - r.tDot) / 0.12);
}

// Fresh caliper: clean green outline, appears, spans the two rows, leaves. Never returns in the loop.
function drawCaliper(ctx, t, t0, dur, yTop, yBot) {
  if (t < t0 || t >= t0 + dur) return;
  const dIn = dur * 0.4, act = dur * 0.3;
  const lt = t - t0;
  let alpha = 1, dy = 0;
  if (lt < dIn) { const u = easeOut(lt / dIn); alpha = u; dy = -120 * (1 - u); }
  else if (lt >= dIn + act) { const u = easeIn((lt - dIn - act) / (dur - dIn - act)); alpha = 1 - u; dy = -120 * u; }
  const open = easeInOut(seg(lt, dIn, dIn + act * 0.6));
  const mid = (yTop + yBot) / 2;
  const up = lerp(mid - 8, yTop, open) + dy, lo = lerp(mid + 8, yBot, open) + dy;
  const bx = 1530;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeRect(bx - 14, up - 44, 28, lo - up + 88);
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(bx + 14, up);
  ctx.lineTo(bx + 210, up);
  ctx.moveTo(bx + 14, lo);
  ctx.lineTo(bx + 210, lo);
  ctx.stroke();
  ctx.restore();
  const cu = (lt - dIn - act * 0.6) / 0.12;
  contact(ctx, bx + 120, up, cu);
  contact(ctx, bx + 120, lo, cu);
}

function drawRig(ctx, t, runs, c) {
  // Legs to the bench (world space).
  ctx.save();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (const lx of [60, 790]) {
    const p = toW(lx, SEC_H);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, BENCH_Y);
  }
  ctx.stroke();
  ctx.restore();

  const hs = hand(t);
  ctx.save();
  ctx.translate(P0.x, P0.y);
  ctx.rotate(ANG);

  // Rails and end buffer.
  bar(ctx, 0, 0, SEL0 - 6, C.sub);
  bar(ctx, SEL1 + 6, 0, L - SEL1 - 6, C.sub);
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 5;
  ctx.strokeRect(L, -40, 16, 40 + SEC_H);

  // Timing gates: sensor heads above the track, light beam down to it.
  for (const gx of [GATE_TOP, GATE_BOT]) {
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx, -92);
    ctx.lineTo(gx, 0);
    ctx.stroke();
    ctx.strokeStyle = C.sub;
    ctx.lineWidth = 5;
    ctx.strokeRect(gx - 14, -126, 28, 34);
  }

  // Selector carriage.
  const y0 = -D * c, y1 = D - D * c;
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 4;
  ctx.strokeRect(SEL0 - 12, y0 - 10, SEC_LEN + 24, y1 - y0 + SEC_H + 20);

  // Sections. Old baseline in slot 0 until it retires; B kept; C reverted.
  if (t < 3.62) bar(ctx, SEL0, y0, SEC_LEN, C.sub);
  if (t >= ENG_A && t < 3.6) bar(ctx, SEL0, y1, SEC_LEN, C.green);
  else if (t >= 3.6 && t < 4.18) bar(ctx, SEL0, 0, SEC_LEN, mix(C.green, C.sub, seg(t, 3.6, 4.2)));
  else if (t >= 4.18) bar(ctx, SEL0, y0, SEC_LEN, mix(C.green, C.sub, seg(t, 3.6, 4.2)));
  const cIn = SLOT_T[1] + ENG_A;
  if (t >= cIn && t < 7.8) bar(ctx, SEL0, y1, SEC_LEN, mix(C.green, C.amber, seg(t, 7.6, 7.7)));
  else if (t >= 7.8 && t < 8.2) {
    const u = easeIn(seg(t, 7.8, 8.2));
    ctx.save();
    const cx = SEL0 + SEC_LEN / 2 + 260 * u, cy = D + SEC_H / 2;
    ctx.translate(cx, cy);
    ctx.scale(1 - 0.1 * u, 1 - 0.1 * u);
    bar(ctx, -SEC_LEN / 2, -SEC_H / 2, SEC_LEN, C.amber, 1 - u);
    ctx.restore();
  }

  // Sled with its load (the blank).
  const sx = sledPos(t, runs);
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 5;
  ctx.strokeRect(sx - 55, -14, 110, 14);
  blank(ctx, sx - 17, -14 - 51, 34, 51);

  // The session's hand (hatched green) with the next candidate.
  if (hs.holding) bar(ctx, SEL0, hs.y, SEC_LEN, C.green);
  part(ctx, SEL0 + 65, hs.y + SEC_H + 4, 60, 46, 'session');
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(SEL0 + 80, hs.y + SEC_H + 50);
  ctx.lineTo(SEL0 + 80, hs.y + 1200);
  ctx.moveTo(SEL0 + 110, hs.y + SEC_H + 50);
  ctx.lineTo(SEL0 + 110, hs.y + 1200);
  ctx.stroke();
  ctx.restore();

  // Old baseline section retiring to the rack (world space).
  if (t >= 3.62 && t < 4.0) {
    const u = easeInOut(seg(t, 3.62, 4.0));
    const a = toW(SEL0 + SEC_LEN / 2, -D + SEC_H / 2);
    ctx.save();
    ctx.translate(lerp(a.x, RACK_X, u), lerp(a.y, RACK_TOP + SEC_H / 2, u));
    ctx.rotate(lerp(ANG, 0, u));
    bar(ctx, -SEC_LEN / 2, -SEC_H / 2, SEC_LEN, C.sub);
    ctx.restore();
  }

  // Contacts.
  for (const s of SLOT_T) { const p = toW(SEL0 + SEC_LEN / 2, D); contact(ctx, p.x, p.y, (t - s - ENG_A) / 0.12); }
  for (const lx of [SEL0, SEL1]) { const p = toW(lx, SEC_H / 2); contact(ctx, p.x, p.y, (t - 3.6) / 0.12); }
  for (const r of runs) {
    const span = SLED_END - SLED_REST;
    const tTop = r.t0 + IDX + r.drop * Math.sqrt((GATE_TOP - SLED_REST) / span);
    const tBot = r.t0 + IDX + r.drop * Math.sqrt((GATE_BOT - SLED_REST) / span);
    const gt = toW(GATE_TOP, -109), gb = toW(GATE_BOT, -109);
    contact(ctx, gt.x, gt.y, (t - tTop) / 0.12);
    contact(ctx, gb.x, gb.y, (t - tBot) / 0.12);
  }
}

const BEATS = [
  [0.4, 'engage: slot candidate B'],
  [2.8, 'four runs: baseline and B alternate'],
  [3.6, 'fresh: caliper spans a clear gap'],
  [4.2, 'engage: keep B, old section retires'],
  [4.6, 'engage: slot candidate C'],
  [7.0, 'four runs: baseline and C alternate'],
  [7.6, 'fresh: caliper finds no gap'],
  [8.2, 'engage: revert C, amber edge'],
  [9.7, 'hold'],
  [10.0, 'index: rack steps down (seam)'],
];
function beat(t) {
  for (const [end, name] of BEATS) if (t < end) return name;
  return BEATS[BEATS.length - 1][1];
}

function mean(a, b) { return (a + b) / 2; }

export default {
  id: 'perf-loop',
  name: '/perf-loop',
  caption: 'Run measured optimization rounds with independent review',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    const runs = runList();
    const c = carriage(t, runs);
    bench(ctx);
    drawRack(ctx, t);
    drawChart(ctx, t, runs);
    drawRig(ctx, t, runs, c);
    drawCaliper(ctx, t, 2.8, 0.8, mean(runs[0].y, runs[2].y), mean(runs[1].y, runs[3].y));
    drawCaliper(ctx, t, 7.0, 0.6, mean(runs[4].y, runs[6].y), mean(runs[5].y, runs[7].y));
    note(ctx, beat(t));
  },
};
