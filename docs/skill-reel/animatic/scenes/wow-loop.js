// /wow-loop (pitch A 3.6): sealed ring gauges, two fresh critics with their own instruments,
// evidence cards, the session builder files the flagged corner, a new pair re-checks. Rough animatic.
// Pure function of t.
import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

const T = 9.0;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

function trap(u, a, d) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const v = 1 / (1 - a / 2 - d / 2);
  if (u < a) return (v * u * u) / (2 * a);
  if (u < 1 - d) return v * (a / 2 + (u - a));
  const r = 1 - u;
  return 1 - (v * r * r) / (2 * d);
}
function idx(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u < 0.6 ? 1.04 * easeOut(u / 0.6) : 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4);
}
function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, c: (t - t1) / 0.12 };
}
// Fresh: drop in from above the frame (ease-out over din), lift out (ease-in 0.4 s). Returns y offset.
const fresh = (t, tin, din, tout) => -560 * (1 - easeOut(seg(t, tin, tin + din))) - 560 * easeIn(seg(t, tout, tout + 0.4));

// Workpiece and line.
const PW = 70, PH = 105, PY = BENCH_Y - 90;
const ENTRY = 200, INSPECT = 1360;
const RINGS = [560, 690, 820, 950, 1080], RR = 62;
const FEED_T = 1.3, FEED_A = 0.5, FEED_D = 0.2;
const V = (INSPECT - ENTRY) / (FEED_T - FEED_A / 2 - FEED_D / 2);
const X_A = ENTRY + (V * FEED_A) / 2;
const clearT = (cx) => FEED_A + (cx + RR + PW / 2 - X_A) / V;
const SETTLE_DY = 16;

// Critics.
const CAM1 = [1215, 520], CAM2 = [1290, 470];
const MIC_REST = 1425, MIC_TOUCH = INSPECT + PW / 2 + 2;

// Evidence tray and cards.
const TRAY_X0 = 1600, TRAY_X1 = 1820, TRAY_TOP = BENCH_Y - 80, TRAY_BOT = BENCH_Y + 150;
const LAYER = 10, K0 = 12, PER_LOOP = 6;
const SHOW = [1710, TRAY_TOP - 10 - 55];
const slotTop = (s, shift) => TRAY_BOT - (s + 1) * LAYER + shift;
// [eject, arrive, holdEnd, dropEnd, source, kind, burr, amber]
const CARDS = [
  [1.85, 2.15, 2.25, 2.40, [CAM1[0], CAM1[1] - 35], 'cam', true, false],
  [2.30, 2.60, 2.90, 3.05, [CAM2[0], CAM2[1] - 35], 'cam', true, true],
  [2.75, 3.05, 3.10, 3.20, [1530, 690], 'mic', true, false],
  [5.00, 5.25, 5.30, 5.42, [CAM1[0], CAM1[1] - 35], 'cam', false, false],
  [5.35, 5.60, 5.65, 5.77, [CAM2[0], CAM2[1] - 35], 'cam', false, false],
  [5.52, 5.77, 5.82, 5.90, [1530, 690], 'mic', false, false],
];

// Builder (session, hatched): column hanging over the inspection spot, file bar at its foot.
const FILE_DY = 226, FILE_A = (0.9 - 0.2) / 1.75, FILE_T0 = 3.6;
const FILE_TC = FILE_T0 + FILE_A;

function scaledAt(ctx, cx, cy, s) {
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
}

function piece(ctx, cx, cy, burr, alpha = 1, s = 1) {
  const x = cx - PW / 2, y = cy - PH / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  scaledAt(ctx, cx, cy, s);
  blank(ctx, x, y, PW, PH);
  if (burr) {
    const c = Math.min(PW, PH) * 0.22;
    const mx = x + PW - c / 2, my = y + c / 2, k = Math.SQRT1_2;
    ctx.fillStyle = C.ivory;
    ctx.beginPath();
    ctx.moveTo(mx - 10 * k, my - 10 * k);
    ctx.lineTo(mx + 18 * k, my - 18 * k);
    ctx.lineTo(mx + 10 * k, my + 10 * k);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function evidenceCard(ctx, cx, cy, s, kind, burr, amber) {
  const w = 150 * s, h = 110 * s;
  ctx.save();
  ctx.fillStyle = C.ground;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 4;
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  const m = 0.55 * s;
  const py = cy - 6 * s;
  piece(ctx, cx, py, burr, 1, m);
  if (kind === 'mic') {
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 40 * s, cy + 40 * s);
    ctx.lineTo(cx + 40 * s, cy + 40 * s);
    ctx.moveTo(cx - 40 * s, cy + 32 * s);
    ctx.lineTo(cx - 40 * s, cy + 48 * s);
    ctx.moveTo(cx + 40 * s, cy + 32 * s);
    ctx.lineTo(cx + 40 * s, cy + 48 * s);
    ctx.stroke();
  }
  if (amber) {
    const c = Math.min(PW, PH) * 0.22;
    const ax = cx + m * (PW / 2 - c / 2), ay = py + m * (-PH / 2 + c / 2);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(ax, ay, 24 * s, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function camera(ctx, x, y, btn) {
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y - 47);
  ctx.lineTo(x, y - 800);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 40, y + 38, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  part(ctx, x - 55, y - 35, 110, 70, 'fresh');
  part(ctx, x - 40, y - 47 + btn, 26, 12, 'fresh');
}

function micrometer(ctx, dy, tipX) {
  ctx.save();
  ctx.translate(0, dy);
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(1500, 600);
  ctx.lineTo(1500, 600 - 800);
  ctx.moveTo(1314, 695);
  ctx.lineTo(1314, 600);
  ctx.lineTo(1500, 600);
  ctx.lineTo(1500, 690);
  ctx.stroke();
  ctx.strokeRect(1305, 695, 18, 28);
  ctx.strokeRect(tipX, 702, 1480 - tipX, 14);
  ctx.restore();
  part(ctx, 1480, 690 + dy, 100, 38, 'fresh');
}

function beat(t) {
  if (t < 0.5) return 'Feed';
  if (t < 1.3) return 'Feed and index: scripted pass through sealed rings';
  if (t < 1.8) return 'Fresh: camera and micrometer';
  if (t < 3.2) return 'Engage: capture and measure';
  if (t < 3.6) return 'Fresh: out';
  if (t < 4.5) return 'Engage: builder files the flagged corner';
  if (t < 4.9) return 'Fresh: a new pair';
  if (t < 5.9) return 'Engage: capture and measure again';
  if (t < 6.3) return 'Fresh: out';
  if (t < 6.8) return 'Settle';
  if (t < 8.3) return 'Hold';
  return 'Feed (seam): next piece, tray indexes down';
}

export default {
  id: 'wow-loop',
  name: '/wow-loop',
  caption: 'Evidence-gated review and repair loop',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    bench(ctx);

    // Rail.
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(110, PY + PH / 2 + 3);
    ctx.lineTo(INSPECT - 40, PY + PH / 2 + 3);
    ctx.stroke();
    ctx.restore();

    // Sealed ring gauges: fixed, never drawn anywhere else. Index flags sit in the bench band.
    const reset = idx((t - 8.4) / 0.14);
    for (const cx of RINGS) {
      ctx.save();
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, PY, RR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      part(ctx, cx - 24, PY + RR, 48, BENCH_Y - PY - RR, 'dim');
      ctx.save();
      ctx.fillStyle = C.ivory;
      ctx.beginPath();
      ctx.arc(cx, PY + RR + (BENCH_Y - PY - RR) / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      const st = idx((t - clearT(cx)) / 0.14) * (1 - reset);
      const ang = -Math.PI / 2 - 0.6 + 1.2 * st;
      const fx = cx, fy = BENCH_Y + 62;
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(ang) * 30, fy + Math.sin(ang) * 30);
      ctx.stroke();
      ctx.fillStyle = C.dim;
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Accepted cradle; tips right in the seam.
    const tilt = 0.22 * (easeInOut(seg(t, 8.3, 8.5)) - easeInOut(seg(t, 8.75, 9.0)));
    ctx.save();
    ctx.translate(INSPECT, 790);
    ctx.rotate(tilt);
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-40, -22);
    ctx.lineTo(-22, 0);
    ctx.lineTo(22, 0);
    ctx.lineTo(40, -22);
    ctx.stroke();
    ctx.restore();

    // Evidence tray: earlier cards below, this loop's six on top, floor indexes down at the seam.
    const shift = PER_LOOP * LAYER * idx((t - 8.5) / 0.14);
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(TRAY_X0, TRAY_TOP);
    ctx.lineTo(TRAY_X0, TRAY_BOT);
    ctx.moveTo(TRAY_X1, TRAY_TOP);
    ctx.lineTo(TRAY_X1, TRAY_BOT);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(TRAY_X0 + 2, TRAY_TOP, TRAY_X1 - TRAY_X0 - 4, TRAY_BOT - TRAY_TOP);
    ctx.clip();
    let top = K0;
    for (let k = 0; k < CARDS.length; k++) if (t >= CARDS[k][3]) top = K0 + k + 1;
    for (let s = 0; s < top; s++) {
      if (slotTop(s, shift) >= TRAY_BOT - 0.5) continue;
      ctx.fillStyle = s % PER_LOOP === 1 ? C.amber : C.sub;
      ctx.fillRect(TRAY_X0 + 10, slotTop(s, shift), TRAY_X1 - TRAY_X0 - 20, LAYER - 2);
    }
    ctx.restore();

    // Workpiece: feed through the rings, inspection, filing, settle, tipped off in the seam.
    const burr = t < FILE_TC + 0.1;
    let px = ENTRY + (INSPECT - ENTRY) * trap(t / FEED_T, FEED_A / FEED_T, FEED_D / FEED_T);
    let py = PY + SETTLE_DY * easeOut(seg(t, 6.3, 6.8));
    let pa = 1, ps = 1;
    if (t >= 8.35) {
      const u = seg(t, 8.35, 8.85);
      px = lerp(INSPECT, 1660, easeIn(u));
      py = PY + SETTLE_DY - 40 * easeInOut(u);
      pa = 1 - u;
      ps = lerp(1, 0.9, u);
    }
    if (pa > 0) piece(ctx, px, py, burr, pa, ps);
    if (t >= 8.4) {
      const u = easeInOut(seg(t, 8.4, 9.0));
      const a = clamp01(seg(t, 8.4, 8.8));
      piece(ctx, lerp(20, ENTRY, u), PY, true, a, lerp(0.9, 1, a));
    }

    // Builder: the session (hatched) files the corner the amber card flagged.
    const fe = engage(t, FILE_T0, FILE_A);
    const fdy = FILE_DY * fe.d;
    const strokeX = t >= FILE_TC && t < FILE_TC + 0.2 ? 10 * Math.sin(((t - FILE_TC) / 0.2) * Math.PI * 4) : 0;
    part(ctx, 1375, 232, 40, 168 + fdy, 'session');
    part(ctx, 1345 + strokeX, 400 + fdy, 90, 24, 'session');
    contact(ctx, INSPECT + PW / 2 - 4, PY - PH / 2, fe.c);

    // Critics, round 1 then a new pair in round 2 (clipped below the caption band).
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 232, W, H);
    ctx.clip();
    const rounds = [
      { tin: 1.3, din: 0.5, tout: 3.2, clicks: [1.80, 2.25], move: [1.95, 2.20], mic: [2.2, 0.3] },
      { tin: 4.5, din: 0.4, tout: 5.9, clicks: [4.95, 5.30], move: [5.05, 5.25], mic: [5.0, 0.2] },
    ];
    for (const r of rounds) {
      if (t < r.tin || t >= r.tout + 0.4) continue;
      const dy = fresh(t, r.tin, r.din, r.tout);
      const mv = easeInOut(seg(t, r.move[0], r.move[1]));
      const cx = lerp(CAM1[0], CAM2[0], mv), cy = lerp(CAM1[1], CAM2[1], mv);
      let btn = 0;
      for (const c of r.clicks) btn += 8 * (idx((t - c) / 0.14) - idx((t - c - 0.14) / 0.14));
      camera(ctx, cx, cy + dy, btn);
      const me = engage(t, r.mic[0], r.mic[1]);
      micrometer(ctx, dy, lerp(MIC_REST, MIC_TOUCH, me.d));
      contact(ctx, MIC_TOUCH - 1, 709, me.c);
    }
    ctx.restore();

    // Evidence cards: eject from the instrument, show face up, drop flat into the tray.
    for (let k = 0; k < CARDS.length; k++) {
      const [te, ta, th, td, src, kind, cb, amber] = CARDS[k];
      if (t < te || t >= td) continue;
      if (t < th) {
        const u = easeInOut(seg(t, te, ta));
        evidenceCard(ctx, lerp(src[0], SHOW[0], u), lerp(src[1], SHOW[1], u), lerp(0.45, 1, u), kind, cb, amber);
      } else {
        const u = easeIn(seg(t, th, td));
        const lx = TRAY_X0 + 10, lw = TRAY_X1 - TRAY_X0 - 20, ly = slotTop(K0 + k, 0);
        ctx.fillStyle = amber ? C.amber : C.sub;
        ctx.fillRect(lerp(SHOW[0] - 75, lx, u), lerp(SHOW[1] - 55, ly, u), lerp(150, lw, u), lerp(110, LAYER - 2, u));
      }
    }

    note(ctx, beat(t));
  },
};
