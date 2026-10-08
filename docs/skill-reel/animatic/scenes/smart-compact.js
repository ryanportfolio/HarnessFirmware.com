// /smart-compact (pitch A 3.4): paper-tape reader, card punch and die press. Rough animatic.
// Pure function of t. The tape tiles, card rows and scrap layers are drawn from t alone.
import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

const T = 8.0;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// Feed with a constant-speed middle: accelerate over fraction a, decelerate over fraction d.
function trap(u, a, d) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  const v = 1 / (1 - a / 2 - d / 2);
  if (u < a) return (v * u * u) / (2 * a);
  if (u < 1 - d) return v * (a / 2 + (u - a));
  const r = 1 - u;
  return 1 - (v * r * r) / (2 * d);
}
// Index: 140 ms one-step click with 4% overshoot (caller passes (t - t0) / 0.14).
function idx(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return u < 0.6 ? 1.04 * easeOut(u / 0.6) : 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4);
}
// Engage: ease in-out approach a, dwell, ease-in withdrawal at 75% of a. c is the 120 ms contact clock.
function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, c: (t - t1) / 0.12 };
}

// Layout (logical px).
const KEY_X = 250;
const HEAD_X = 420;                 // dense blank left edge at rest (tape head)
const DB_W = 60, DB_H = 90;         // dense blank
const TW = 48, TH = 72, PITCH = 56; // tape tile
const N = 10;                       // dense blank + nine tape tiles
const restX = (k) => (k === 0 ? HEAD_X : HEAD_X + DB_W + 10 + (k - 1) * PITCH);
const FEED_D = 920;
const PRESS_X = 1420, STACK_W = 110, LAYER_H = 14;
const FOLD_X = PRESS_X - STACK_W / 2 - 40;
const RAM_W = 200, RAM_H = 70, RAM_REST = 600, RAM_LOW = BENCH_Y - DB_H;
const PUNCH_X = 1680, PUNCH_TOP = BENCH_Y - 140;
const CARD_W = 150, CARD_H = 260;
const BAR_REST = 372;
const BIN_X = 1300, BIN_Y = BENCH_Y + 40, BIN_W = 240, BIN_H = 190, SCRAP_H = 24, PILE = 4;
const CENTRE_X = 960 - DB_W / 2;
const EMIT_X = 1016;                // new tape fades in as it clears this edge
const PRESS_T0 = 4.5, PRESS_A = (0.8 - 0.2) / 1.75, PRESS_TC = PRESS_T0 + PRESS_A;
const ROW0 = 2.3, ROW_DT = 1 / 7;
const FALL = 0.45;
const BIN_INDEX = 7.45;

const rowAbs = (r) => PUNCH_TOP - CARD_H + 40 + r * 30 + 7;

function holePattern() {
  const r = rng(4021);
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const row = [];
    let any = false;
    for (let c = 0; c < 4; c++) {
      const on = r() < 0.55;
      row.push(on);
      any = any || on;
    }
    if (!any) row[i % 4] = true;
    rows.push(row);
  }
  return rows;
}

function scaled(ctx, cx, cy, s) {
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
}

function tapeTile(ctx, x, alpha = 1, s = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  scaled(ctx, x + TW / 2, BENCH_Y, s);
  blank(ctx, x, BENCH_Y - TH, TW, TH);
  ctx.fillStyle = C.benchTop;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + TW / 2, BENCH_Y - TH + 34 + i * 13, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function denseBlank(ctx, x) {
  blank(ctx, x, BENCH_Y - DB_H, DB_W, DB_H);
  ctx.save();
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const y = BENCH_Y - DB_H + 44 + i * 14;
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + DB_W - 8, y);
  }
  ctx.stroke();
  ctx.restore();
}

function card(ctx, x, y, rows, pat) {
  const c = 26;
  ctx.fillStyle = C.ivory;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + CARD_W - c, y);
  ctx.lineTo(x + CARD_W, y + c);
  ctx.lineTo(x + CARD_W, y + CARD_H);
  ctx.lineTo(x, y + CARD_H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.ground;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < 4; k++) if (pat[r][k]) ctx.fillRect(x + 20 + k * 30, y + 40 + r * 30, 22, 14);
  }
}

// One scrap layer: two offcut strips lying flat, centres at PRESS_X -/+ 46.
function scrapLayer(ctx, yTop) {
  ctx.fillStyle = C.ivory;
  ctx.fillRect(PRESS_X - 90, yTop + 2, 88, 20);
  ctx.fillRect(PRESS_X + 2, yTop + 2, 88, 20);
}

function beat(t) {
  if (t < 0.5) return 'Key';
  if (t < 2.3) return 'Feed: whole tape through the reader';
  if (t < 3.3) return 'Index: punch seven rows';
  if (t < 3.9) return 'Show: card still';
  if (t < 4.5) return 'Feed: card into the press head';
  if (t < 5.3) return 'Engage: press, offcuts fall';
  if (t < 5.8) return 'Settle';
  if (t < 7.3) return 'Hold';
  return 'Feed (seam): new tape behind the dense blank';
}

export default {
  id: 'smart-compact',
  name: '/smart-compact',
  caption: 'Write custom /compact instructions from this session, then compact with them',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    const pat = holePattern();
    bench(ctx);

    // Scrap bin below the bench line, under the press. Its pile indexes down one layer at the seam.
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(BIN_X, BIN_Y);
    ctx.lineTo(BIN_X, BIN_Y + BIN_H);
    ctx.moveTo(BIN_X + BIN_W, BIN_Y);
    ctx.lineTo(BIN_X + BIN_W, BIN_Y + BIN_H);
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(BIN_X + 2, BIN_Y, BIN_W - 4, BIN_H);
    ctx.clip();
    const landed = t >= PRESS_TC + FALL;
    const shift = SCRAP_H * idx((t - BIN_INDEX) / 0.14);
    for (let j = 0; j <= (landed ? PILE : PILE - 1); j++) {
      const y = BIN_Y + BIN_H - (j + 1) * SCRAP_H + shift;
      if (y < BIN_Y + BIN_H - 0.5) scrapLayer(ctx, y);
    }
    ctx.restore();

    // Reader: a fork of the session (hatched), head over the tape, post behind it. It never moves.
    part(ctx, 1150, 610, 22, BENCH_Y - 610, 'session');
    part(ctx, 1030, 610, 120, 70, 'session');
    ctx.save();
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 4;
    for (const rx of [1062, 1118]) {
      ctx.beginPath();
      ctx.arc(rx, 694, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Press guide posts.
    ctx.save();
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (const px of [PRESS_X - 120, PRESS_X + 120]) {
      ctx.moveTo(px, 290);
      ctx.lineTo(px, BENCH_Y);
      ctx.moveTo(px - 14, 290);
      ctx.lineTo(px + 14, 290);
    }
    ctx.stroke();
    ctx.restore();

    // Ram (engage).
    const pe = engage(t, PRESS_T0, PRESS_A);
    const ramBottom = lerp(RAM_REST, RAM_LOW, pe.d);
    const ramTop = ramBottom - RAM_H;
    const q = Math.min(1, (BENCH_Y - ramBottom) / (N * LAYER_H));

    // Old tape: runs through the reader and folds into the stack, until the press contact.
    if (t < PRESS_TC) {
      const f = trap(seg(t, 0.5, 2.3), 0.12, 0.12);
      for (let k = N - 1; k >= 0; k--) {
        const w0 = k === 0 ? DB_W : TW, h0 = k === 0 ? DB_H : TH;
        const s = restX(k) + FEED_D * f;
        const u = clamp01((s - (FOLD_X - 60)) / 60);
        if (u <= 0) {
          if (k === 0) denseBlank(ctx, s);
          else tapeTile(ctx, s);
          continue;
        }
        const j = N - 1 - k;
        const lx = PRESS_X - STACK_W / 2, ly = BENCH_Y - (j + 1) * LAYER_H * q, lh = (LAYER_H - 2) * q;
        const e = easeInOut(u);
        ctx.fillStyle = C.ivory;
        ctx.fillRect(lerp(s, lx, e), lerp(BENCH_Y - h0, ly, e), lerp(w0, STACK_W, e), lerp(h0, lh, e));
      }
    }

    // Dense blank after the press, its settle, and the seam with new tape extruding behind it.
    if (t >= PRESS_TC) {
      let dbX = PRESS_X - DB_W / 2;
      if (t >= 5.3) dbX = lerp(dbX, CENTRE_X, easeOut(seg(t, 5.3, 5.8)));
      if (t >= 7.3) dbX = lerp(CENTRE_X, HEAD_X, easeInOut(seg(t, 7.3, 8.0)));
      if (t >= 7.3) {
        for (let k = N - 1; k >= 1; k--) {
          const x = dbX + (restX(k) - HEAD_X);
          const a = clamp01((EMIT_X - (x + TW)) / 30);
          if (a > 0) tapeTile(ctx, x, a, lerp(0.9, 1, a));
        }
      }
      denseBlank(ctx, dbX);
    }

    part(ctx, PRESS_X - RAM_W / 2, ramTop, RAM_W, RAM_H, 'fresh');
    ctx.save();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 4;
    ctx.strokeRect(PRESS_X - 80, ramTop + 8, 160, 10);
    ctx.restore();

    // Punch: hatched body and column (the fork writes the keep list).
    part(ctx, PUNCH_X - 80, PUNCH_TOP, 160, BENCH_Y - PUNCH_TOP, 'session');
    part(ctx, 1772, 340, 28, BENCH_Y - 340, 'session');

    // Control card.
    let rows = 0;
    for (let r = 0; r < 7; r++) if (t >= ROW0 + r * ROW_DT + 0.08) rows = r + 1;
    if (t >= 1.8 && t < 2.3) {
      const top = PUNCH_TOP - CARD_H * easeInOut(seg(t, 1.8, 2.3));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, PUNCH_TOP);
      ctx.clip();
      card(ctx, PUNCH_X - CARD_W / 2, top, 0, pat);
      ctx.restore();
    } else if (t >= 2.3 && t < 3.9) {
      card(ctx, PUNCH_X - CARD_W / 2, PUNCH_TOP - CARD_H, rows, pat);
    } else if (t >= 3.9 && t < 4.3) {
      const u = easeInOut(seg(t, 3.9, 4.3));
      const cx = lerp(PUNCH_X, PRESS_X, u);
      const bottom = lerp(PUNCH_TOP, RAM_REST - RAM_H, u);
      card(ctx, cx - CARD_W / 2, bottom - CARD_H, 7, pat);
    } else if (t >= 4.3 && t < PRESS_TC) {
      const bottom = ramTop + CARD_H * easeInOut(seg(t, 4.3, PRESS_TC));
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, ramTop);
      ctx.clip();
      card(ctx, PRESS_X - CARD_W / 2, bottom - CARD_H, 7, pat);
      ctx.restore();
    }

    // Punch bar: one index click per row, returns once the card has left.
    let by = BAR_REST, prev = BAR_REST;
    for (let r = 0; r < 7; r++) {
      const tg = rowAbs(r);
      by += (tg - prev) * idx((t - (ROW0 + r * ROW_DT)) / 0.14);
      prev = tg;
    }
    if (t >= 4.1) by = lerp(rowAbs(6), BAR_REST, easeInOut(seg(t, 4.1, 4.5)));
    part(ctx, PUNCH_X - 90, by - 11, 1772 - (PUNCH_X - 90), 22, 'session');
    for (let r = 0; r < 7; r++) contact(ctx, PUNCH_X, rowAbs(r), (t - (ROW0 + r * ROW_DT) - 0.05) / 0.12);

    // Offcuts falling into the bin; they land exactly as the new top scrap layer.
    if (t >= PRESS_TC && t < PRESS_TC + FALL) {
      const u = seg(t, PRESS_TC, PRESS_TC + FALL);
      const yEnd = BIN_Y + BIN_H - (PILE + 1) * SCRAP_H + 12;
      for (const side of [-1, 1]) {
        const x0 = PRESS_X + side * 45, x1 = PRESS_X + side * 46;
        ctx.save();
        ctx.translate(lerp(x0, x1, u), lerp(BENCH_Y - 44, yEnd, easeIn(u)));
        ctx.rotate(side * (Math.PI / 2) * u);
        ctx.fillStyle = C.ivory;
        ctx.fillRect(-10, -44, 20, 88);
        ctx.restore();
      }
    }
    contact(ctx, PRESS_X, RAM_LOW, pe.c);

    // The person's key starts it.
    let press = 0;
    if (t < 0.5) press = t < 0.18 ? easeInOut(t / 0.18) : t < 0.26 ? 1 : 1 - easeInOut((t - 0.26) / 0.24);
    key(ctx, KEY_X, BENCH_Y, press, '/smart-compact');

    note(ctx, beat(t));
  },
};
