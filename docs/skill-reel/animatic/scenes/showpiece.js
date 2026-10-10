import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

// /showpiece animatic: a contour gauge taken from the real subject.
// The gauge copies the subject casting, a small specimen is cut and test-fit first, then the full
// edge is cut past the scribe line; the piece leaves gaps against two other castings and mates
// flush with its own subject.

const T = 9.0;

const SUB_FACE = 520, BASE0 = 700, BW = 180, BH = 270, BTOP = BENCH_Y - BH; // blank y 529..799
const FOOT_Y = 740, FOOT = 70; // the subject's foot: the specimen comes out of this corner
// The subject's face profile, depth to the right of SUB_FACE, by world y.
const PROF = [[529, 0], [548, 0], [562, 34], [586, 44], [606, 6], [626, 6], [634, 52], [676, 52], [686, 18], [708, 26], [726, 0], [740, 0]];
const CUT0 = 548, CUT1 = FOOT_Y;
const SPEC_H = BENCH_Y - FOOT_Y; // specimen carries the profile of CUT0..CUT0+SPEC_H (the bump)
const PINS = 10, PIN0 = 550, PIN_STEP = 25, PIN_LEN = 150;
const PARK = { X: 540, dy: -270 };
const CUT_REST = { x: 960, y: 420 };
const D1 = { body: 980, face: 1140 }, D2 = { body: 1440, face: 1600 }, DTOP = 480;
const SCRIBE = 0.65; // the scribe line is a safe mark; the cut goes past it to the full profile

function idx(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < 0.6) return 1.04 * easeOut(u / 0.6);
  return 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4);
}

function f(y) {
  if (y >= FOOT_Y) return FOOT;
  if (y <= PROF[0][0]) return 0;
  for (let k = 1; k < PROF.length; k++) {
    const [y1, v1] = PROF[k];
    if (y <= y1) {
      const [y0, v0] = PROF[k - 1];
      return y1 === y0 ? v1 : lerp(v0, v1, (y - y0) / (y1 - y0));
    }
  }
  return 0;
}
const g = (ly) => f(CUT0 + ly); // specimen edge, local y 0..SPEC_H
const g1 = (y) => (y >= 500 && y <= 780 ? 50 * Math.sin((Math.PI * (y - 500)) / 280) : 0);
const g2 = (y) => (y >= 760 ? 36 : y >= 500 ? 26 * Math.abs((((y - 500) / 52) % 1) * 2 - 1) : 0);

// Where the piece's base sits when pressed against a casting face: first touching point.
function touchOffset(prof) {
  let m = -Infinity;
  for (let y = BTOP; y <= BENCH_Y; y += 1) m = Math.max(m, prof(y) - f(y));
  return m;
}

function casting(ctx, bodyX, top, faceX, prof, stroke) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(bodyX, BENCH_Y);
  ctx.lineTo(bodyX, top);
  for (let y = top; y <= BENCH_Y; y += 2) ctx.lineTo(faceX + prof(y), y);
  ctx.lineTo(faceX + prof(BENCH_Y), BENCH_Y);
  ctx.stroke();
  ctx.restore();
}

function drawSubject(ctx) {
  casting(ctx, 140, 440, SUB_FACE, f, C.sub);
  ctx.save();
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(300, 560, 34, 0, Math.PI * 2);
  ctx.moveTo(180, 660);
  ctx.lineTo(440, 660);
  ctx.stroke();
  ctx.restore();
  casting(ctx, D1.body, DTOP, D1.face, g1, C.dim);
  casting(ctx, D2.body, DTOP, D2.face, g2, C.dim);
  ctx.save();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(D1.body + 70, 580, 26, 0, Math.PI * 2);
  ctx.moveTo(D2.body + 30, 640);
  ctx.lineTo(D2.body + 130, 640);
  ctx.stroke();
  ctx.restore();
}

// The work: ivory blank, clipped top-right corner, registration hole; left edge offset e(y) by rest-frame y.
function drawPiece(ctx, base, dy, e, alpha = 1, scale = 1) {
  if (alpha <= 0) return;
  const top = BTOP + dy;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (scale !== 1) {
    const cx = base + BW / 2, cy = top + BH / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  const c = BW * 0.22;
  ctx.beginPath();
  ctx.moveTo(base + e(BTOP), top);
  ctx.lineTo(base + BW - c, top);
  ctx.lineTo(base + BW, top + c);
  ctx.lineTo(base + BW, top + BH);
  for (let ly = BH; ly >= 0; ly -= 2) ctx.lineTo(base + e(BTOP + ly), top + ly);
  ctx.closePath();
  ctx.fillStyle = C.ivory;
  ctx.fill();
  ctx.fillStyle = C.benchTop;
  ctx.beginPath();
  ctx.arc(base + BW * 0.35, top + BH * 0.16, BW * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cutY(t) {
  if (t < 3.2) return CUT0;
  if (t < 4.75) return lerp(CUT0, CUT1, easeInOut(seg(t, 3.2, 4.75)));
  return CUT1;
}

function edgeAt(t) {
  const cy = cutY(t), notch = t >= 2.35;
  return (y) => (y >= FOOT_Y ? (notch ? FOOT : 0) : y < cy ? f(y) : 0);
}

function drawSpecimen(ctx, sx, sy, alpha = 1, scale = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (scale !== 1) {
    const cx = sx + FOOT / 2, cy = sy + SPEC_H / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }
  ctx.beginPath();
  ctx.moveTo(sx + g(0), sy);
  ctx.lineTo(sx + FOOT, sy);
  ctx.lineTo(sx + FOOT, sy + SPEC_H);
  for (let ly = SPEC_H; ly >= 0; ly -= 2) ctx.lineTo(sx + g(ly), sy + ly);
  ctx.closePath();
  ctx.fillStyle = C.ivory;
  ctx.fill();
  ctx.restore();
}

const PIN_Y = Array.from({ length: PINS }, (_, i) => PIN0 + PIN_STEP * i);

function gaugeState(t) {
  const fi = PIN_Y.map(f);
  if (t < 0.3) {
    const u = easeInOut(seg(t, 0, 0.3));
    return { X: lerp(PARK.X, 600, u), dy: lerp(PARK.dy, 0, u), p: fi.map(() => 0) };
  }
  if (t < 0.5) {
    const X = lerp(600, SUB_FACE, easeInOut(seg(t, 0.3, 0.5)));
    return { X, dy: 0, p: fi.map((v) => Math.max(0, SUB_FACE + v - X)) };
  }
  if (t < 1.05) {
    // Index ripple top to bottom: each pin seats with a small click.
    return { X: SUB_FACE, dy: 0, p: fi.map((v, i) => { const u = seg(t, 0.5 + 0.05 * i, 0.64 + 0.05 * i); return v + 6 * (u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0); }) };
  }
  if (t < 1.4) return { X: lerp(SUB_FACE, 560, easeIn(seg(t, 1.05, 1.4))), dy: 0, p: fi };
  if (t < 1.7) return { X: lerp(560, BASE0, easeInOut(seg(t, 1.4, 1.7))), dy: 0, p: fi };
  if (t < 2.0) return { X: BASE0, dy: 0, p: fi };
  if (t < 2.3) return { X: BASE0, dy: lerp(0, PARK.dy, easeInOut(seg(t, 2.0, 2.3))), p: fi };
  if (t < 2.6) return { X: lerp(BASE0, PARK.X, easeInOut(seg(t, 2.3, 2.6))), dy: PARK.dy, p: fi };
  if (t < 7.9) return { X: PARK.X, dy: PARK.dy, p: fi };
  return { X: PARK.X, dy: PARK.dy, p: fi.map((v, i) => v * (1 - idx(seg(t, 7.9 + 0.03 * i, 8.04 + 0.03 * i)))) };
}

// The session's own gauge: hatched green body, a comb of sliding pins.
function drawGauge(ctx, t) {
  const { X, dy, p } = gaugeState(t);
  part(ctx, X + 110, PIN0 - 15 + dy, 30, PIN_STEP * (PINS - 1) + 30, 'session');
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < PINS; i++) {
    ctx.moveTo(X + p[i], PIN_Y[i] + dy);
    ctx.lineTo(X + p[i] + PIN_LEN, PIN_Y[i] + dy);
  }
  ctx.stroke();
  ctx.restore();
  contact(ctx, SUB_FACE + f(PIN_Y[4]), PIN_Y[4], (t - 0.5) / 0.12);
}

function drawScribe(ctx, t) {
  if (t < 1.7 || t >= 4.75) return;
  const end = lerp(CUT0, CUT1, seg(t, 1.7, 1.98));
  const start = Math.max(CUT0, cutY(t));
  if (end <= start) return;
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(BASE0 + SCRIBE * f(start), start);
  for (let y = start; y <= end; y += 2) ctx.lineTo(BASE0 + SCRIBE * f(y), y);
  ctx.stroke();
  ctx.restore();
}

function specPath() {
  const pts = [{ x: BASE0 + FOOT, y: BENCH_Y }, { x: BASE0 + FOOT, y: FOOT_Y }];
  for (let ly = 0; ly <= SPEC_H; ly += 3) pts.push({ x: BASE0 + g(ly), y: FOOT_Y + ly });
  return pts;
}
function along(pts, u) {
  const segs = [];
  let total = 0;
  for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y); segs.push(d); total += d; }
  let s = u * total;
  for (let k = 0; k < segs.length; k++) {
    if (s <= segs[k] || k === segs.length - 1) {
      const v = segs[k] ? Math.min(1, s / segs[k]) : 0;
      return { x: lerp(pts[k].x, pts[k + 1].x, v), y: lerp(pts[k].y, pts[k + 1].y, v) };
    }
    s -= segs[k];
  }
  return pts[pts.length - 1];
}
const lerpPt = (a, b, u) => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });

function cutterTip(t) {
  const sp = specPath();
  if (t >= 2.0 && t < 2.15) return lerpPt(CUT_REST, sp[0], easeInOut(seg(t, 2.0, 2.15)));
  if (t >= 2.15 && t < 2.35) return along(sp, easeInOut(seg(t, 2.15, 2.35)));
  if (t >= 2.35 && t < 2.47) return lerpPt(sp[sp.length - 1], CUT_REST, easeIn(seg(t, 2.35, 2.47)));
  const top = { x: BASE0 + f(CUT0), y: CUT0 };
  if (t >= 3.0 && t < 3.2) return lerpPt(CUT_REST, top, easeInOut(seg(t, 3.0, 3.2)));
  if (t >= 3.2 && t < 4.75) { const y = cutY(t); return { x: BASE0 + f(y), y }; }
  if (t >= 4.75 && t < 4.9) return lerpPt({ x: BASE0 + f(CUT1 - 0.01), y: CUT1 }, CUT_REST, easeIn(seg(t, 4.75, 4.9)));
  return { ...CUT_REST };
}

// The cutter: the session's tool, hatched green, tip pointing down.
function drawCutter(ctx, t) {
  const p = cutterTip(t);
  part(ctx, p.x - 22, p.y - 134, 44, 110, 'session');
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - 16, p.y - 24);
  ctx.lineTo(p.x + 16, p.y - 24);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  if (t >= 3.2 && t < 4.75) {
    ctx.save();
    ctx.fillStyle = C.bright;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  contact(ctx, specPath()[0].x, specPath()[0].y, (t - 2.15) / 0.12);
}

function piecePos(t, P1, P2) {
  if (t < 5.0) return { base: BASE0, dy: 0 };
  if (t < 5.3) return { base: lerp(BASE0, P1, easeInOut(seg(t, 5.0, 5.3))), dy: 0 };
  if (t < 5.4) return { base: P1, dy: 0 };
  if (t < 5.6) return { base: lerp(P1, P2, easeInOut(seg(t, 5.4, 5.6))), dy: 0 };
  if (t < 5.7) return { base: P2, dy: 0 };
  if (t < 6.4) return { base: lerp(P2, SUB_FACE, easeInOut(seg(t, 5.7, 6.4))), dy: 0 };
  if (t < 7.9) return { base: SUB_FACE, dy: 0 };
  if (t < 8.7) { const u = easeIn(seg(t, 7.9, 8.7)); return { base: lerp(SUB_FACE, 2000, u), dy: -80 * u }; }
  return null;
}

function drawJoinFlash(ctx, t) {
  const u = (t - 6.4) / 0.12;
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.globalAlpha = Math.sin(u * Math.PI);
  ctx.strokeStyle = C.bright;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(SUB_FACE + f(BTOP), BTOP);
  for (let y = BTOP; y <= BENCH_Y; y += 2) ctx.lineTo(SUB_FACE + f(y), y);
  ctx.stroke();
  ctx.restore();
}

const BEATS = [
  [1.4, 'engage: gauge copies the subject'],
  [2.0, 'feed: gauge scribes the blank'],
  [3.0, 'engage: specimen cut and test-fit'],
  [5.0, 'engage: full cut past the scribe line'],
  [6.0, 'swap test: gaps against other castings'],
  [6.4, 'settle: mates flush with its subject'],
  [7.9, 'hold'],
  [9.0, 'feed (seam): piece leaves, pins spring flat, new blank'],
];
function beat(t) {
  for (const [end, name] of BEATS) if (t < end) return name;
  return BEATS[BEATS.length - 1][1];
}

export default {
  id: 'showpiece',
  name: '/showpiece',
  caption: 'Push an artifact past what people expect from its kind',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    bench(ctx);
    drawSubject(ctx);

    // Specimen: cut free at 2.35, offered to the subject's bump, mates, then cleared.
    if (t >= 2.35 && t < 3.0) {
      if (t < 2.38) drawSpecimen(ctx, BASE0, FOOT_Y);
      else if (t < 2.72) {
        const u = easeInOut(seg(t, 2.38, 2.72));
        drawSpecimen(ctx, lerp(BASE0, SUB_FACE, u), lerp(FOOT_Y, CUT0, u));
      } else if (t < 2.8) drawSpecimen(ctx, SUB_FACE, CUT0);
      else { const u = seg(t, 2.8, 3.0); drawSpecimen(ctx, SUB_FACE, CUT0, 1 - u, 1 - 0.1 * u); }
    }
    contact(ctx, SUB_FACE + g(SPEC_H / 2), CUT0 + SPEC_H / 2, (t - 2.72) / 0.12);

    const pos = piecePos(t, D1.face + touchOffset(g1), D2.face + touchOffset(g2));
    if (pos) drawPiece(ctx, pos.base, pos.dy, edgeAt(t));
    if (t >= 8.4) { const u = easeOut(seg(t, 8.4, 9.0)); drawPiece(ctx, BASE0, 0, () => 0, u, lerp(0.9, 1, u)); }
    drawScribe(ctx, t);
    drawJoinFlash(ctx, t);
    drawGauge(ctx, t);
    drawCutter(ctx, t);
    note(ctx, beat(t));
  },
};
