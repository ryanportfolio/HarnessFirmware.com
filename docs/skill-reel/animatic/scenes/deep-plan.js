import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

// /deep-plan animatic (pitch A 3.2). Key-cutting jig: every cut waits for the person's key,
// one cut overrides the recommended detent, Go is a separate press, the cut key leaves and nothing is built.

const T = 9.0;
const TOP = 220;

const KEY_X = 130;
const L = 560, BOW = 130, YT = 559, YB = 659; // key blank: bow rises 40 above the blade
const X_ENTRY = 230, X_JIG = 640, X_HOLD = 1320;
const POS = [880, 970, 1060, 1150]; // bit positions while the blank sits in the jig
const DEPTH = [20, 40, 60];
const DET_Y = [380, 430, 480];
const PARK_X = 1200, PARK_Y = 480;
const JAW_OPEN = 500, JAW_SHUT = YT;

const CUTS = [
  { start: 1.2, dur: 0.9333, pos: 0, rec: 1, pick: 1 },
  { start: 2.1333, dur: 0.9333, pos: 1, rec: 0, pick: 2 }, // override
  { start: 3.0667, dur: 0.9333, pos: 2, rec: 2, pick: 2 },
  { start: 4.2, dur: 0.9, pos: 3, rec: 1, pick: 1 }, // round 2, tied to position 2
];
const LIGHT = [0.85, 0.95, 1.05, 4.1];
const GO_PRESS = 5.25;

// ---------- local helpers ----------

const idx = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.6 ? 1.04 * easeOut(u / 0.6) : 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4));

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

const cutT = (c, f) => c.start + f * c.dur;
const contactT = (c) => cutT(c, 0.68);
const pressT = (c) => cutT(c, 0.2);
const snapT = (c) => pressT(c) + 0.08;

// Notch depth of cut c on the blank currently in the jig at time t.
function notchDepth(c, t) {
  const full = DEPTH[c.pick];
  if (t >= contactT(c)) return full;
  if (t < cutT(c, 0.45)) return 0;
  const ty = lerp(PARK_Y, YT + full, easeInOut(seg(t, cutT(c, 0.45), contactT(c))));
  return Math.max(0, Math.min(full, ty - YT));
}

// The key blank, anchored at its bottom-left (x, YB), scaled about that point.
function keyBlank(ctx, x, depths, alpha = 1, sc = 1) {
  if (alpha <= 0) return;
  const X = (dx) => x + dx * sc, Y = (dy) => YB - dy * sc;
  const c = 22;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = C.ivory;
  ctx.beginPath();
  ctx.moveTo(X(0), Y(140));
  ctx.lineTo(X(BOW), Y(140));
  ctx.lineTo(X(BOW), Y(100));
  for (let k = 0; k < 4; k++) {
    const off = POS[k] - X_JIG, d = depths ? depths[k] : 0;
    ctx.lineTo(X(off - 30), Y(100));
    ctx.lineTo(X(off), Y(100 - d));
    ctx.lineTo(X(off + 30), Y(100));
  }
  ctx.lineTo(X(L - c), Y(100));
  ctx.lineTo(X(L), Y(100 - c));
  ctx.lineTo(X(L), Y(0));
  ctx.lineTo(X(0), Y(0));
  ctx.closePath();
  ctx.fill();
  // the registration hole becomes the key's ring
  ctx.fillStyle = C.benchTop;
  ctx.beginPath();
  ctx.arc(X(65), Y(80), 20 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cutter(t) {
  let cx = PARK_X, ty = PARK_Y;
  for (let i = 0; i < CUTS.length; i++) {
    const c = CUTS[i];
    if (t < c.start) break;
    const prevX = i === 0 ? PARK_X : POS[CUTS[i - 1].pos];
    cx = lerp(prevX, POS[c.pos], easeInOut(seg(t, c.start, cutT(c, 0.3))));
    const down = easeInOut(seg(t, cutT(c, 0.45), contactT(c)));
    const up = easeIn(seg(t, cutT(c, 0.82), cutT(c, 1)));
    ty = PARK_Y + (YT + DEPTH[c.pick] - PARK_Y) * (down - up);
  }
  if (t >= 5.3) cx = lerp(POS[3], PARK_X, easeInOut(seg(t, 5.3, 5.7)));
  return [cx, ty];
}

function personPress(t) {
  let p = 0;
  for (const c of CUTS) p = Math.max(p, Math.sin(Math.PI * seg(t, pressT(c), pressT(c) + 0.16)));
  p = Math.max(p, Math.sin(Math.PI * seg(t, GO_PRESS, GO_PRESS + 0.16)));
  return p;
}

function drawSelector(ctx, t) {
  // housing on a post behind the line
  stroke(ctx, [1320, 505, 1320, YB], C.dim, 4);
  part(ctx, 1290, 330, 60, 175, 'fresh');
  for (const c of CUTS) {
    if (t < c.start || t >= cutT(c, 1)) continue;
    const a = idx(seg(t, c.start, c.start + 0.14)) * (1 - seg(t, cutT(c, 0.86), cutT(c, 1)));
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= Math.min(1, a);
    for (const y of DET_Y) stroke(ctx, [1350, y, 1350 + 44 * a, y], C.green, 4);
    // recommended tick
    const ry = DET_Y[c.rec];
    stroke(ctx, [1404, ry - 2, 1414, ry + 8, 1434, ry - 14], C.green, 5);
    // pointer: proposed (dim) at the recommendation, snaps to the person's pick after the press
    const decided = t >= snapT(c);
    const py = lerp(DET_Y[c.rec], DET_Y[c.pick], idx(seg(t, snapT(c), snapT(c) + 0.14)));
    ctx.beginPath();
    ctx.moveTo(1248, py - 13);
    ctx.lineTo(1248, py + 13);
    ctx.lineTo(1280, py);
    ctx.closePath();
    if (decided) {
      ctx.fillStyle = C.green;
      ctx.fill();
    } else {
      ctx.strokeStyle = C.dim;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawIndicators(ctx, t) {
  const reset = t >= 8.17; // unison index back to dim at the seam
  const pulseReset = Math.sin(Math.PI * seg(t, 8.1, 8.24));
  // tie line from position 2 to position 4 (frontier dependency)
  const tie = [POS[1], 714, POS[1], 742, POS[3], 742, POS[3], 714];
  stroke(ctx, tie, C.dim, 4);
  const tieA = idx(seg(t, 4.0, 4.14)) * (1 - seg(t, 8.1, 8.24));
  if (tieA > 0) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, tieA);
    stroke(ctx, tie, C.green, 5);
    ctx.restore();
  }
  for (let k = 0; k < 4; k++) {
    const lit = t >= LIGHT[k] && !reset;
    const done = t >= contactT(CUTS[k]) && !reset;
    const pulse = Math.max(Math.sin(Math.PI * seg(t, LIGHT[k], LIGHT[k] + 0.14)), Math.sin(Math.PI * seg(t, contactT(CUTS[k]), contactT(CUTS[k]) + 0.14)), pulseReset);
    const s = 28 * (1 + 0.12 * pulse);
    const x = POS[k] - s / 2, y = 700 - s / 2;
    ctx.save();
    if (done) {
      ctx.fillStyle = C.green;
      ctx.fillRect(x, y, s, s);
    } else {
      ctx.strokeStyle = lit ? C.green : C.dim;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, s, s);
    }
    ctx.restore();
  }
}

function render(ctx, t) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP, W, H - TOP);
  ctx.clip();

  bench(ctx);

  // rests: entry shelf, jig base, holder
  part(ctx, 200, YB, 410, BENCH_Y - YB, 'dim');
  part(ctx, 620, YB, 600, BENCH_Y - YB, 'fresh');
  part(ctx, 1300, YB, 590, BENCH_Y - YB, 'dim');
  drawIndicators(ctx, t);

  // cutter rail and selector
  stroke(ctx, [760, 360, 1240, 360], C.dim, 4);
  drawSelector(ctx, t);

  // ---- the work ----
  const depths = CUTS.map((c) => notchDepth(c, t));
  if (t < 8.1) {
    let x = X_JIG;
    if (t < 0.55) x = lerp(X_ENTRY, X_JIG, easeInOut(seg(t, 0, 0.55)));
    else if (t >= 5.9) x = lerp(X_JIG, X_HOLD, easeInOut(seg(t, 5.9, 6.5)));
    keyBlank(ctx, x, depths);
  } else {
    const u = easeInOut(seg(t, 8.1, 9.0));
    keyBlank(ctx, lerp(X_HOLD, 2100, u), depths, 1 - u, lerp(1, 0.9, u)); // cut key leaves
    keyBlank(ctx, lerp(-700, X_ENTRY, u), null, u, lerp(0.9, 1, u)); // next loose idea arrives
  }

  // clamp jaw
  const shut = easeInOut(seg(t, 0.55, 0.75)) - easeInOut(seg(t, 5.45, 5.8));
  const jb = lerp(JAW_OPEN, JAW_SHUT, shut);
  stroke(ctx, [800, 360, 800, jb - 80], C.green, 4);
  part(ctx, 768, jb - 80, 64, 80, 'fresh');

  // cutter
  const [cx, ty] = cutter(t);
  part(ctx, cx - 25, 340, 50, 40, 'fresh');
  part(ctx, cx - 12, 380, 24, Math.max(4, ty - 30 - 380), 'fresh');
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 16, ty - 30);
  ctx.lineTo(cx, ty);
  ctx.lineTo(cx + 16, ty - 30);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // the person's key: one press per cut, then a separate Go
  const press = personPress(t);
  key(ctx, KEY_X, BENCH_Y, press, '');
  const goA = seg(t, 5.05, 5.2) * (1 - seg(t, 6.0, 6.3));
  if (goA > 0) key(ctx, KEY_X, BENCH_Y, press, 'Go', goA);

  // contacts
  contact(ctx, 800, YT, seg(t, 0.75, 0.87));
  for (const c of CUTS) contact(ctx, POS[c.pos], YT + DEPTH[c.pick], seg(t, contactT(c), contactT(c) + 0.12));

  ctx.restore();
}

function beat(t) {
  if (t < 0.8) return 'feed and engage: blank into clamp';
  if (t < 1.2) return 'index: open frontier, position 4 tied to 2';
  if (t < 4.0) {
    const i = t < CUTS[1].start ? 0 : t < CUTS[2].start ? 1 : 2;
    return ['cut 1: recommended', 'cut 2: override', 'cut 3: recommended'][i];
  }
  if (t < 5.1) return 'round 2: tie resolves, cut 4';
  if (t < 5.9) return 'go: separate press, no detents, clamp opens';
  if (t < 6.5) return 'settle: cut key to holder';
  if (t < 8.1) return 'hold';
  return 'feed (seam): key leaves, nothing built, new blank in';
}

export default {
  id: 'deep-plan',
  name: '/deep-plan',
  caption: 'interview a loose idea into decisions the user made',
  period: T,
  draw(ctx, t) {
    render(ctx, t);
    note(ctx, beat(t));
  },
};
