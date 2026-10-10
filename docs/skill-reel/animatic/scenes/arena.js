import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

// /arena animatic: sealed booths, a badge grinder and a blind pegboard.
// Three lit booths and one dim empty booth build separate pieces; the collar grinds each angle
// mark off and punches a neutral letter; a fresh judge behind a screen fills a pegboard and points
// to B; the hatched parent touches A, B and C, keeps B and inlays one re-cut section from A and C.

const T = 10.0;

const BX = [320, 540, 760, 980]; // booth centres; the fourth stands empty and dim
const B_TOP = 290, B_BOT = 590, B_HALF = 100;
const PW = 100, PH = 150, P_TOP = BENCH_Y - PH;
const IN_TOP = 410; // piece top while inside a booth
const COLLAR = 1170, SCREEN_X = 1290;
const SLOT = [1400, 1560, 1720]; // tray centres; booth i ends up in SLOT[i]
const LETTER = ['A', 'B', 'C']; // the collar punches C first, then B, then A
const HATCH = [Math.PI / 4, -Math.PI / 4, Math.PI / 2]; // each candidate's cut-face hatching
const ENTRY = 110;
const LETTER_FONT = '400 60px "Departure Mono", "Departure Mono fallback", monospace';
// Feed through the collar per booth: [leave bench spot, enter collar, leave collar, reach tray]
const FEEDT = [[2.75, 3.3, 3.45, 3.6], [2.55, 2.95, 3.1, 3.35], [2.4, 2.6, 2.75, 3.0]];
const PEGS = [[1, 0, 1], [1, 1, 1], [0, 1, 0]]; // [piece][criterion]: 1 pass (green), 0 fail (amber)
const ROWS = [360, 430, 500];
const PIVOT = { x: 1560, y: 548 };
const REST = { x: 1860, y: 590 }; // parent head rest pose (tip of the head)
const CHUNK_W = 26, CHUNK_H = 38;
const INLAYS = [
  { from: 0, t0: 6.4, rel: 48 },
  { from: 2, t0: 7.15, rel: 96 },
];

function idx(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < 0.6) return 1.04 * easeOut(u / 0.6);
  return 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4);
}

function edge(i, s) {
  if (i === 0) return s < 0.5 ? 0 : 16; // step
  if (i === 1) return 9 + 9 * Math.sin(s * Math.PI * 4); // wave
  const f = (s * 4) % 1;
  return 16 * Math.abs(f * 2 - 1); // zigzag
}

function hatchRect(ctx, x, y, w, h, ang, color = C.dim, gap = 12) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const cx = x + w / 2, cy = y + h / 2, r = Math.hypot(w, h);
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let d = -r; d <= r; d += gap) {
    ctx.moveTo(cx + nx * d - dx * r, cy + ny * d - dy * r);
    ctx.lineTo(cx + nx * d + dx * r, cy + ny * d + dy * r);
  }
  ctx.stroke();
  ctx.restore();
}

function mark(ctx, i, x, y) {
  ctx.strokeStyle = C.ground;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (i === 0) { ctx.moveTo(x, y - 20); ctx.lineTo(x + 20, y + 16); ctx.lineTo(x - 20, y + 16); ctx.closePath(); }
  else if (i === 1) ctx.arc(x, y, 19, 0, Math.PI * 2);
  else ctx.rect(x - 17, y - 17, 34, 34);
  ctx.stroke();
}

// A candidate piece: ivory, clipped top-right corner, registration hole, own left-edge profile with hatched cut face.
function drawPiece(ctx, i, cx, top, o = {}) {
  const left = cx - PW / 2;
  const alpha = o.alpha ?? 1, scale = o.scale ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (scale !== 1) {
    ctx.translate(cx, top + PH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -(top + PH / 2));
  }
  const cut = 22;
  ctx.beginPath();
  ctx.moveTo(left + edge(i, 0), top);
  ctx.lineTo(left + PW - cut, top);
  ctx.lineTo(left + PW, top + cut);
  ctx.lineTo(left + PW, top + PH);
  for (let k = 30; k >= 0; k--) ctx.lineTo(left + edge(i, k / 30), top + PH * (k / 30));
  ctx.closePath();
  ctx.fillStyle = C.ivory;
  ctx.fill();
  ctx.save();
  ctx.clip();
  hatchRect(ctx, left, top, 30, PH, HATCH[i]);
  ctx.restore();
  ctx.fillStyle = C.benchTop;
  ctx.beginPath();
  ctx.arc(left + 56, top + 24, 9, 0, Math.PI * 2);
  ctx.fill();
  if (o.notch != null) {
    ctx.fillStyle = C.ground;
    ctx.fillRect(left - 2, top + o.notch, CHUNK_W + 4, CHUNK_H);
  }
  for (const p of o.patches || []) {
    ctx.fillStyle = C.ivory;
    ctx.fillRect(left + PW - CHUNK_W, top + p, CHUNK_W, CHUNK_H);
    hatchRect(ctx, left + PW - CHUNK_W, top + p, CHUNK_W, CHUNK_H, HATCH[1]);
  }
  if ((o.mark ?? 0) > 0) {
    ctx.save();
    ctx.globalAlpha *= o.mark;
    mark(ctx, i, left + 64, top + 92);
    ctx.restore();
  }
  if ((o.letter ?? 0) > 0) {
    ctx.save();
    ctx.globalAlpha *= o.letter;
    ctx.fillStyle = C.ground;
    ctx.font = LETTER_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LETTER[i], left + 64, top + 94);
    ctx.restore();
  }
  ctx.restore();
}

function pieceX(t, i) {
  const [a, b, c, d] = FEEDT[i];
  if (t < a) return BX[i];
  if (t < b) return lerp(BX[i], COLLAR, easeInOut(seg(t, a, b)));
  if (t < c) return COLLAR;
  if (t < d) return lerp(COLLAR, SLOT[i], easeInOut(seg(t, c, d)));
  return SLOT[i];
}

function shutter(t) {
  if (t < 0.6) return 0;
  if (t < 0.9) return easeInOut(seg(t, 0.6, 0.9));
  if (t < 9.6) return 1;
  return 1 - easeInOut(seg(t, 9.6, 9.9));
}

function screenDown(t) {
  if (t < 3.6) return 0;
  if (t < 3.85) return easeInOut(seg(t, 3.6, 3.85));
  if (t < 5.6) return 1;
  if (t < 5.8) return 1 - easeInOut(seg(t, 5.6, 5.8));
  return 0;
}

function drawBooth(ctx, i, sh) {
  const x = BX[i], dim = i === 3;
  if (!dim && sh > 0) {
    // Roller shutter: slats lead from the panel's bottom edge; gaps show the clean hand at work.
    const bottom = B_TOP + (B_BOT - B_TOP) * sh;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - B_HALF, B_TOP, B_HALF * 2, bottom - B_TOP);
    ctx.clip();
    for (let k = 0; ; k++) {
      const y = bottom - 32 - k * 46;
      if (y + 32 < B_TOP) break;
      ctx.fillStyle = C.ground;
      ctx.fillRect(x - B_HALF + 4, y, B_HALF * 2 - 8, 32);
      ctx.strokeStyle = C.sub;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - B_HALF + 4, y, B_HALF * 2 - 8, 32);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = dim ? C.dim : C.sub;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 58, B_BOT);
  ctx.lineTo(x - B_HALF, B_BOT);
  ctx.lineTo(x - B_HALF, B_TOP);
  ctx.lineTo(x + B_HALF, B_TOP);
  ctx.lineTo(x + B_HALF, B_BOT);
  ctx.lineTo(x + 58, B_BOT);
  ctx.moveTo(x - B_HALF + 10, B_BOT);
  ctx.lineTo(x - B_HALF + 10, BENCH_Y);
  ctx.moveTo(x + B_HALF - 10, B_BOT);
  ctx.lineTo(x + B_HALF - 10, BENCH_Y);
  ctx.stroke();
  ctx.restore();
}

// Fresh builder hand inside a booth: clean green outline, three strokes on the work, then gone.
function boothHand(ctx, t, x, k0) {
  if (t < 0.9 || t >= 2.05) return;
  let alpha = 1, dy = 0;
  if (t < 1.1) { const u = easeOut(seg(t, 0.9, 1.1)); alpha = u; dy = -30 * (1 - u); }
  else if (t >= 1.9) { const u = easeIn(seg(t, 1.9, 2.05)); alpha = 1 - u; dy = -30 * u; }
  let press = 0, off = 0;
  if (t >= 1.1 && t < 1.85) {
    const k = Math.min(2, Math.floor((t - 1.1) / 0.25));
    const lt = t - 1.1 - k * 0.25;
    press = Math.sin(Math.PI * Math.min(1, lt / 0.2));
    off = [-22, 8, 30][(k + k0) % 3];
    contact(ctx, x + off, IN_TOP, (lt - 0.07) / 0.12);
  }
  const y = 324 + dy + 20 * press;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(x + off - 18, y, 36, 50);
  ctx.beginPath();
  ctx.moveTo(x + off - 10, y + 50);
  ctx.lineTo(x + off - 10, y + 70);
  ctx.moveTo(x + off + 10, y + 50);
  ctx.lineTo(x + off + 10, y + 70);
  ctx.stroke();
  ctx.restore();
}

function drawCollar(ctx, t) {
  let punch = 0;
  for (let i = 0; i < 3; i++) {
    const b = FEEDT[i][1];
    if (t >= b + 0.08 && t < b + 0.15) punch = Math.sin(Math.PI * seg(t, b + 0.08, b + 0.15));
  }
  ctx.save();
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(COLLAR - 70, P_TOP - 40, 140, BENCH_Y - P_TOP + 40);
  ctx.beginPath();
  ctx.arc(COLLAR - 30, P_TOP - 72, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(COLLAR + 16, P_TOP - 104 + 34 * punch, 34, 50);
  ctx.restore();
}

function drawScreen(ctx, t) {
  const d = screenDown(t);
  ctx.save();
  ctx.strokeStyle = C.sub;
  ctx.lineWidth = 5;
  ctx.strokeRect(SCREEN_X - 34, 238, 68, 24);
  if (d > 0) {
    const h = (BENCH_Y - 262) * d;
    ctx.fillStyle = C.ground;
    ctx.fillRect(SCREEN_X - 14, 262, 28, h);
    ctx.strokeRect(SCREEN_X - 14, 262, 28, h);
  }
  ctx.restore();
}

// Fresh judge: pegboard with its criteria card. Arrives behind the screen, fills pegs, points to B, leaves.
function drawJudge(ctx, t) {
  if (t < 3.85 || t >= 5.6) return;
  let alpha = 1, dy = 0;
  if (t < 4.15) { const u = easeOut(seg(t, 3.85, 4.15)); alpha = u; dy = -80 * (1 - u); }
  else if (t >= 5.3) { const u = easeIn(seg(t, 5.3, 5.6)); alpha = 1 - u; dy = -80 * u; }
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(0, dy);
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(1320, 300, 470, 260);
  ctx.lineWidth = 4;
  ctx.strokeRect(1332, 316, 44, 228);
  ctx.beginPath();
  for (const y of ROWS) { ctx.moveTo(1342, y); ctx.lineTo(1366, y); }
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = C.dim;
      ctx.beginPath();
      ctx.arc(SLOT[i], ROWS[j], 7, 0, Math.PI * 2);
      ctx.fill();
      const tp = 4.2 + 0.3 * j + 0.08 * i;
      if (t < tp) continue;
      const u = seg(t, tp, tp + 0.14);
      ctx.fillStyle = PEGS[i][j] ? C.green : C.amber;
      ctx.beginPath();
      ctx.arc(SLOT[i], ROWS[j] - 40 * (1 - idx(u)), 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const ang = lerp(Math.PI, Math.PI / 2, idx(seg(t, 5.1, 5.24)));
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(PIVOT.x, PIVOT.y);
  ctx.lineTo(PIVOT.x + 80 * Math.cos(ang), PIVOT.y + 80 * Math.sin(ang));
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(PIVOT.x, PIVOT.y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

const TOUCH = [5.98, 6.12, 6.26];
function parentTip(t) {
  if (t < 5.8 || t >= 9.8) return { ...REST };
  if (t >= 9.4) {
    const u = easeInOut(seg(t, 9.4, 9.8));
    return { x: lerp(SLOT[1], REST.x, u), y: lerp(P_TOP, REST.y, u) };
  }
  const stops = [[5.8, REST.x], [5.98, SLOT[0]], [6.12, SLOT[1]], [6.26, SLOT[2]], [6.4, SLOT[1]]];
  let x = SLOT[1];
  for (let k = 0; k < stops.length - 1; k++) {
    if (t < stops[k + 1][0]) { x = lerp(stops[k][1], stops[k + 1][1], easeInOut(seg(t, stops[k][0], stops[k + 1][0]))); break; }
  }
  let dip = 0;
  for (const tk of TOUCH) dip = Math.max(dip, Math.pow(Math.max(0, 1 - Math.abs(t - tk) / 0.06), 2));
  if (t >= 6.32) dip = Math.max(dip, easeOut(seg(t, 6.32, 6.4)));
  return { x, y: lerp(REST.y, P_TOP, dip) };
}

// Parent: hatched green head on a beam from the right edge. Persistent, so it stays in frame.
function drawParent(ctx, t) {
  const p = parentTip(t);
  part(ctx, p.x - 22, p.y - 60, 44, 60, 'session');
  part(ctx, p.x + 22, p.y - 60, W + 40 - p.x, 20, 'session');
  for (const tk of TOUCH) {
    const k = TOUCH.indexOf(tk);
    contact(ctx, SLOT[k], P_TOP, (t - tk + 0.03) / 0.12);
  }
  contact(ctx, SLOT[1], P_TOP, (t - 6.4) / 0.12);
}

function chunk(ctx, x, y, ang) {
  ctx.fillStyle = C.ivory;
  ctx.fillRect(x, y, CHUNK_W, CHUNK_H);
  hatchRect(ctx, x, y, CHUNK_W, CHUNK_H, ang);
}

function drawInlays(ctx, t) {
  for (const n of INLAYS) {
    const lt = t - n.t0;
    if (lt < 0.05 || lt >= 0.65) continue;
    const sx = SLOT[n.from] - PW / 2, sy = P_TOP + n.rel;
    const dx = SLOT[1] + PW / 2 - CHUNK_W, dy = P_TOP + n.rel;
    let x, y;
    if (lt < 0.2) { x = sx; y = sy - 50 * easeOut(seg(lt, 0.05, 0.2)); }
    else if (lt < 0.5) { const u = easeInOut(seg(lt, 0.2, 0.5)); x = lerp(sx, dx, u); y = sy - 50 - 40 * Math.sin(Math.PI * u); }
    else { x = dx; y = dy - 50 * (1 - easeOut(seg(lt, 0.5, 0.65))); }
    chunk(ctx, x, y, lt < 0.5 ? HATCH[n.from] : HATCH[1]);
  }
  for (const n of INLAYS) {
    contact(ctx, SLOT[n.from] - PW / 2 + CHUNK_W / 2, P_TOP + n.rel + CHUNK_H / 2, (t - n.t0) / 0.12);
    contact(ctx, SLOT[1] + PW / 2 - CHUNK_W / 2, P_TOP + n.rel - 50 + CHUNK_H / 2, (t - n.t0 - 0.5) / 0.12);
    contact(ctx, SLOT[1] + PW / 2 - CHUNK_W, P_TOP + n.rel + CHUNK_H / 2, (t - n.t0 - 0.65) / 0.12);
  }
}

function drawPieces(ctx, t) {
  if (t < 1.2) return;
  for (let i = 0; i < 3; i++) {
    const [, b] = FEEDT[i];
    const o = {
      mark: 1 - seg(t, b, b + 0.08),
      letter: t >= b + 0.08 ? idx(seg(t, b + 0.08, b + 0.12)) : 0,
    };
    let x, top;
    if (t < 2.0) { x = BX[i]; top = IN_TOP; o.alpha = seg(t, 1.2, 1.8); }
    else if (t < 2.4) { x = BX[i]; top = lerp(IN_TOP, P_TOP, easeInOut(seg(t, 2.0, 2.4))); }
    else { x = pieceX(t, i); top = P_TOP; }
    if (i !== 1) {
      const n = INLAYS.find((q) => q.from === i);
      if (t >= n.t0 + 0.05) o.notch = n.rel;
    } else {
      o.patches = INLAYS.filter((q) => t >= q.t0 + 0.65).map((q) => q.rel);
    }
    if (t >= 9.4) {
      if (i === 1) x = lerp(SLOT[1], 2000, easeIn(seg(t, 9.4, 9.9)));
      else {
        const u = easeIn(seg(t, 9.4, 9.8));
        top += 160 * u;
        o.alpha = 1 - u;
        o.scale = 1 - 0.1 * u;
      }
    }
    if (x - PW / 2 < W) drawPiece(ctx, i, x, top, o);
    contact(ctx, COLLAR + 14, P_TOP + 92, (t - b) / 0.12);
    contact(ctx, COLLAR + 14, P_TOP + 92, (t - b - 0.08) / 0.12);
  }
}

function drawBriefs(ctx, t) {
  // The brief at the entry, its three copies rising into the lit booths, and the next brief arriving at the seam.
  if (t < 0.3) {
    const x = lerp(ENTRY, BX[1], easeInOut(seg(t, 0, 0.3)));
    blank(ctx, x - 30, BENCH_Y - 90, 60, 90);
  } else if (t < 1.8) {
    const u = easeInOut(seg(t, 0.3, 0.6));
    const a = 1 - seg(t, 1.2, 1.8);
    for (let i = 0; i < 3; i++) {
      blank(ctx, lerp(BX[1], BX[i], u) - 30, lerp(BENCH_Y - 90, IN_TOP + 20, u), 60, 90, a);
    }
  }
  if (t >= 9.4) blank(ctx, lerp(-60, ENTRY, easeOut(seg(t, 9.4, 10.0))) - 30, BENCH_Y - 90, 60, 90);
}

const BEATS = [
  [0.6, 'feed: brief copied into three booths'],
  [2.4, 'fresh: shutters closed, builders work'],
  [3.6, 'feed and index: marks ground off, letters punched'],
  [5.6, 'fresh: blind judge fills the pegboard, points to B'],
  [6.4, 'engage: parent reads A, B and C, holds B'],
  [7.9, 'engage x2: re-cut inlays from A and C into B'],
  [9.4, 'hold'],
  [10.0, 'feed (seam): B leaves, remains to scratch, shutters open'],
];
function beat(t) {
  for (const [end, name] of BEATS) if (t < end) return name;
  return BEATS[BEATS.length - 1][1];
}

export default {
  id: 'arena',
  name: '/arena',
  caption: 'Builds parallel attempts at one task, judges them blind',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    bench(ctx);
    // Scratch bin below the bench line.
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(1340, BENCH_Y + 50);
    ctx.lineTo(1360, BENCH_Y + 190);
    ctx.lineTo(1760, BENCH_Y + 190);
    ctx.lineTo(1780, BENCH_Y + 50);
    ctx.stroke();
    ctx.restore();

    drawBriefs(ctx, t);
    for (let i = 0; i < 3; i++) boothHand(ctx, t, BX[i], i);
    drawPieces(ctx, t);
    const sh = shutter(t);
    for (let i = 0; i < 4; i++) drawBooth(ctx, i, sh);
    drawCollar(ctx, t);
    drawScreen(ctx, t);
    drawJudge(ctx, t);
    drawParent(ctx, t);
    drawInlays(ctx, t);
    note(ctx, beat(t));
  },
};
