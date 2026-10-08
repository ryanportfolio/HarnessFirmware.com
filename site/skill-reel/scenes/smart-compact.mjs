// /smart-compact at final fidelity (pitch A 3.4, same beats and timing as the animatic's
// scenes/smart-compact.js). A Claude Code mod, not a skill: kind 'mod'.
// The person presses the /smart-compact key. The whole session tape (last compaction's dense blank
// at its head, then perforated sections) runs through the reader, a fork of the session, and
// fan-folds onto the press anvil. The same fork punches a seven-row keep card, shows it still, and
// the card goes straight into the press head: no approval step. The press comes down, the folded
// tape becomes one dense blank, and the trimmed sides fall into the scrap chute below the bench
// (compaction is not lossless). The blank settles at the bench centre; in the seam it slides back
// to the head of the bench and new tape comes out of the reader behind it. No meter anywhere.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole, hatchPath,
  rodV, ball, contactShadow, contactGlow, softGlow, dust, centreLine, benchFinal, lightShaft,
  activeMat, rng,
} from '../kit.mjs';

const T = 8.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const KEY_X = 160;
const HEAD_X = 300; // dense blank left edge at rest (head of the tape)
const DB_W = 56, DB_H = 84, DB_D = 66; // dense blank: front face and depth (a folded tape is TH deep)
const L = 104, TH = 66, NOTCH = 12, NSEC = 6; // tape section: length, height, corner notch, count
const MOUTH = 1000; // the reader's entry guide; new tape comes out from behind it in the seam
const CENTRE_X = MOUTH - DB_W; // the blank's rest at the bench centre, flush with the guide
const X_F = 1300; // a section starts to fold once its right edge passes this
const FEED = X_F - HEAD_X;
const PRESS_X = 1440, PILE_L = PRESS_X - L / 2;
const AV = 736; // anvil top
const LAY = 9; // one folded section on the pile
const PILE_H = NSEC * LAY + DB_H;
const RAM_H = 76, PLATEN_H = 16, RAM_TOP0 = 470;
const YD0 = RAM_TOP0 + RAM_H + PLATEN_H; // platen face at rest
const YD1 = AV - DB_H; // platen face at contact
const K1 = DB_H / PILE_H; // pile compression at contact
const PRESS_T0 = 4.5, PRESS_A = (0.8 - 0.2) / 1.75, PRESS_TC = PRESS_T0 + PRESS_A;
const FALL = 0.45;
const OFF_W = (L - DB_W) / 2;

// Card punch (the fork writes the keep list). The card stands in a plane CZ deep.
const PUNCH_X = 1745, CAB_TOP = 600, CZ = 40;
const CW = 96, CH = 140, CCLIP = 18;
const ROWS = 7, COLS = 5, ROW_OFF = 28, ROW_P = 15;
const LINE = 540; // punch line, card-plane y
const CLICK = (r) => 2.3 + 0.125 * r;
const SHOW_TOP = 386;

// Scrap chute below the bench, seen in section.
const BIN_X0 = 1300, BIN_X1 = 1580, WALL = 18;
const ROW_H = 26, RT0 = 884;
const LAND_L = [PRESS_X - 22, RT0 - 2], LAND_R = [PRESS_X + 22, RT0 - 2]; // pivot of each landed offcut

// Reader.
const RD_X0 = 1000, RD_X1 = 1215, CAP_XS = [1040, 1192];

// ---------------------------------------------------------------------------------------------
// Helpers.

const pr = (x, y, z) => [x + D.x * z, y + D.y * z];
const shiftPts = (pts, z) => pts.map(([x, y]) => [x + D.x * z, y + D.y * z]);

function blankPts(x, y, w, h, c = Math.min(w, h) * 0.22) {
  return [[x, y], [x + w - c, y], [x + w, y + c], [x + w, y + h], [x, y + h]];
}

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

function engage(t, t0, a, dwell = 0.2) {
  const t1 = t0 + a, t2 = t1 + dwell, t3 = t2 + 0.75 * a;
  let d = 0;
  if (t > t0 && t < t3) d = t < t1 ? easeInOut((t - t0) / a) : t < t2 ? 1 : 1 - easeIn((t - t2) / (t3 - t2));
  return { d, t1, t3, c: (t - t1) / 0.12 };
}

// Maps a face drawn in its own coordinates (u right, v down from its top edge, height h) onto a
// plate standing on the edge (x0, y0) and tipped back by th about that edge (0 upright, pi/2 flat).
function tilt(ctx, x0, y0, h, th) {
  const c = Math.cos(th), s = Math.sin(th);
  ctx.transform(1, 0, -s * D.x, c - D.y * s, x0 + s * D.x * h, y0 + h * (D.y * s - c));
}

// Seeded hole patterns: tape data holes per section, and the keep card's seven rows.
const TAPE_COLS = 12, TAPE_VS = [12, 20, 38, 46, 54], SPROCKET_V = 29;
const TAPE_PAT = [];
for (let i = 0; i <= NSEC; i++) {
  const r = rng(0x51ca + i * 97);
  const cols = [];
  for (let c = 0; c < TAPE_COLS; c++) cols.push([0, 1, 2, 3, 4].map(() => r() < 0.42));
  TAPE_PAT.push(cols);
}
const CARD_PAT = (() => {
  const r = rng(4021);
  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const row = [];
    let any = false;
    for (let c = 0; c < COLS; c++) { const on = r() < 0.5; row.push(on); any = any || on; }
    if (!any) row[(i * 2) % COLS] = true;
    rows.push(row);
  }
  return rows;
})();

// ---------------------------------------------------------------------------------------------
// Timeline.

const feedAt = (t) => FEED * trap(seg(t, 0.5, 2.3), 0.12, 0.12);
const press = (t) => engage(t, PRESS_T0, PRESS_A);
const platenY = (t) => YD0 + (YD1 - YD0) * press(t).d;
const ramTopAt = (t) => platenY(t) - PLATEN_H - RAM_H;

// Card: top edge (card plane) and centre x, how many rows are punched, and whether it is clipped.
function cardState(t) {
  if (t < 1.8 || t >= PRESS_TC) return null;
  let cx = PUNCH_X, top, clipY = CAB_TOP;
  const rows = CARD_PAT.reduce((n, _, r) => (t >= CLICK(r) + 0.05 ? r + 1 : n), 0);
  if (t < 2.3) top = lerp(CAB_TOP + 2, LINE - ROW_OFF, easeInOut(seg(t, 1.8, 2.3)));
  else if (t < 3.9) {
    top = LINE - ROW_OFF;
    for (let r = 1; r < ROWS; r++) {
      const m = CLICK(r - 1) + 0.03;
      top -= ROW_P * indexEase(seg(t, m, m + 0.09));
    }
    top -= (LINE - ROW_OFF - ROW_P * (ROWS - 1) - SHOW_TOP) * easeOut(seg(t, 3.12, 3.3));
  } else if (t < 4.3) {
    const u = seg(t, 3.9, 4.3);
    top = lerp(SHOW_TOP, RAM_TOP0 - CH, easeInOut(seg(u, 0, 0.5)));
    cx = lerp(PUNCH_X, PRESS_X, easeInOut(seg(u, 0.2, 1)));
    clipY = H;
  } else {
    const rt = ramTopAt(t);
    cx = PRESS_X;
    top = rt - CH + CH * easeInOut(seg(t, 4.3, PRESS_TC));
    clipY = rt;
  }
  return { cx, top, rows, clipY };
}

// ---------------------------------------------------------------------------------------------
// Drawing: the tape.

function sectionFace(ctx, i, flat) {
  const pts = [[0, 0], [L - NOTCH, 0], [L, NOTCH], [L, TH], [0, TH]];
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, TH);
  g.addColorStop(0, mix('#f6f6ee', '#fdfdf7', flat));
  g.addColorStop(1, mix('#d8d9cd', '#efefe7', flat));
  poly(ctx, pts);
  ctx.fillStyle = g;
  ctx.fill();
  // the fold crease at the section's left edge
  const cg = ctx.createLinearGradient(0, 0, 11, 0);
  cg.addColorStop(0, 'rgba(105,110,96,0.32)');
  cg.addColorStop(1, 'rgba(105,110,96,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(0, 0, 11, TH);
  // sprocket track and data holes
  ctx.fillStyle = '#0d110e';
  ctx.beginPath();
  for (let c = 0; c < TAPE_COLS; c++) { const u = 8 + c * 8; ctx.moveTo(u + 1.5, SPROCKET_V); ctx.arc(u, SPROCKET_V, 1.5, 0, Math.PI * 2); }
  const pat = TAPE_PAT[i];
  for (let c = 0; c < TAPE_COLS; c++) {
    for (let k = 0; k < 5; k++) {
      if (!pat[c][k]) continue;
      const u = 8 + c * 8, v = TAPE_VS[k];
      if (u > L - NOTCH - 3 && v < NOTCH + 3) continue;
      ctx.moveTo(u + 2.6, v);
      ctx.arc(u, v, 2.6, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.strokeStyle = 'rgba(118,122,108,0.7)';
  ctx.lineWidth = lw(1.6);
  ctx.lineJoin = 'round';
  poly(ctx, pts);
  ctx.stroke();
  if (flat < 0.5 && !LOD.card) {
    ctx.strokeStyle = 'rgba(255,255,250,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(L - NOTCH - 1, 1);
    ctx.stroke();
  }
  ctx.restore();
}

// A section standing on (x0, yb) and tipped back by th; when it is tipped it rests on a layer of
// thickness `thick` (its folded paper) whose front edge shows below the face.
function section(ctx, i, x0, yb, th, thick = LAY) {
  const s = Math.sin(th), c = Math.cos(th);
  const tk = thick * s;
  if (tk > 0.3) {
    ctx.save();
    const g = ctx.createLinearGradient(0, yb - tk, 0, yb);
    g.addColorStop(0, '#e2e3d7');
    g.addColorStop(1, '#b9baae');
    ctx.fillStyle = g;
    ctx.fillRect(x0, yb - tk, L, tk);
    ctx.fillStyle = 'rgba(70,74,64,0.55)';
    ctx.fillRect(x0, yb - 1, L, 1);
    ctx.restore();
  }
  if (c > 0.6) contactShadow(ctx, x0 + L / 2 + 12, FLOOR - 4, L * 0.62, 7, 0.42 * c);
  ctx.save();
  tilt(ctx, x0, yb - tk, TH, th);
  sectionFace(ctx, i, s);
  ctx.restore();
}

// The pile on the anvil: layers 0..n-1, squashed by k.
function pile(ctx, n, k) {
  for (let j = 0; j < n; j++) section(ctx, NSEC - j, PILE_L, AV - j * LAY * k, Math.PI / 2, LAY * k);
}

// ---------------------------------------------------------------------------------------------
// Drawing: the dense blank and the offcuts.

const BLANK_MAT = { ...MAT.ivory, front: ['#f8f8f1', '#d2d3c6'] };

function denseBlank(ctx, x, yb, w = DB_W, h = DB_H) {
  const sy = h / DB_H;
  const pts = blankPts(x, yb - h, w, h, 12.5 * Math.min(1, sy * 1.2));
  if (yb >= FLOOR - 1) contactShadow(ctx, x + w / 2 + 22, FLOOR - 8, w + 16, 12, 0.5);
  prism(ctx, pts, DB_D, BLANK_MAT);
  ctx.save();
  ctx.lineWidth = lw(1.4);
  // compressed layers along the right side face
  ctx.strokeStyle = 'rgba(96,100,88,0.55)';
  ctx.beginPath();
  const top = yb - h + 12.5 * sy;
  for (let m = 1; m <= 8; m++) {
    const y = yb - (h * m) / 9;
    if (y < top + 2) continue;
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w + D.x * DB_D, y + D.y * DB_D);
  }
  ctx.stroke();
  // the keep rows pressed into the face: the card's pattern, small
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(110,114,100,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let r = 0; r < ROWS; r++) {
      const y = yb - h * 0.62 + r * h * 0.075;
      for (let c = 0; c < COLS; c++) {
        if (!CARD_PAT[r][c]) continue;
        const xx = x + w * (0.17 + c * 0.14);
        ctx.moveTo(xx, y);
        ctx.lineTo(xx + w * 0.08, y);
      }
    }
    ctx.stroke();
  }
  // lit top edge
  ctx.strokeStyle = 'rgba(255,255,250,0.85)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x + 1, yb - h + 1);
  ctx.lineTo(x + w - 12.5 * sy, yb - h + 1);
  ctx.stroke();
  ctx.restore();
  hole(ctx, x + w * 0.35, yb - h + h * 0.18, 6.2 * Math.min(1, sy * 1.3), DB_D, MAT.ivory);
}

// An offcut: one trimmed side of the pressed pile, pivoting on its outer bottom corner.
// side -1: left piece (pivot bottom-left), +1: right piece (pivot bottom-right).
function offcut(ctx, side, px, py, ang) {
  const x0 = side < 0 ? 0 : -OFF_W, x1 = x0 + OFF_W;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const rot = ([x, y]) => [px + x * ca - y * sa, py + x * sa + y * ca];
  const pts = [[x0, -DB_H], [x1, -DB_H], [x1, 0], [x0, 0]].map(rot);
  prism(ctx, pts, DB_D, BLANK_MAT, { sil: 2 });
  ctx.save();
  ctx.strokeStyle = 'rgba(96,100,88,0.6)';
  ctx.lineWidth = lw(1.3);
  ctx.beginPath();
  for (let m = 1; m <= 9; m++) {
    const y = m <= NSEC ? -m * LAY * K1 : -NSEC * LAY * K1 - (m - NSEC) * 14;
    const a = rot([x0, y]), b = rot([x1, y]);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Drawing: the keep card.

const CARD_MAT = { ...MAT.ivory, front: ['#f4f3e6', '#dcdccd'] };

function cardFace(ctx, x, y, rows) {
  const pts = blankPts(x, y, CW, CH, CCLIP);
  prism(ctx, pts, 3, CARD_MAT);
  ctx.save();
  ctx.strokeStyle = 'rgba(118,122,108,0.6)';
  ctx.lineWidth = lw(1.4);
  poly(ctx, pts);
  ctx.stroke();
  // row register marks in the margin
  ctx.fillStyle = 'rgba(62,90,69,0.55)';
  for (let r = 0; r < ROWS; r++) ctx.fillRect(x + 4, y + ROW_OFF + r * ROW_P - 1, 5, 2.5);
  ctx.fillStyle = '#0c100d';
  ctx.beginPath();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!CARD_PAT[r][c]) continue;
      ctx.roundRect(x + 15 + c * 15, y + ROW_OFF + r * ROW_P - 5, 9, 10, 1.5);
    }
  }
  ctx.fill();
  ctx.restore();
}

function card(ctx, st) {
  if (!st) return;
  ctx.save();
  ctx.translate(D.x * CZ, D.y * CZ);
  ctx.beginPath();
  ctx.rect(0, 0, W, st.clipY);
  ctx.clip();
  cardFace(ctx, st.cx - CW / 2, st.top, st.rows);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Drawing: instruments.

const KEY_FONT = 'italic 600 30px "Fraunces", "Fraunces fallback", serif';
const KEY_MAT = { ...MAT.ivory, front: ['#f7f7f0', '#dadbcf'] };
const CAP_W = 236, CAP_H = 48;

function key(ctx, p) {
  const x = KEY_X, base = FLOOR - 24;
  const dy = 16 * p;
  const capB = base - 38 + dy;
  rodV(ctx, x + 6, capB - 4, base + 2, 14, MAT.fresh);
  // the stem's spring collar
  prism(ctx, rect(x - 9, base - 12, 30, 12), 30, MAT.fresh, { sil: 2.5 });
  const r = 9, x0 = x - CAP_W / 2, y0 = capB - CAP_H, x1 = x + CAP_W / 2;
  const cap = [];
  for (const [cx, cy, a0] of [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, capB - r, 0], [x0 + r, capB - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]]) {
    for (let k = 0; k <= 3; k++) { const a = a0 + (k / 3) * (Math.PI / 2); cap.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  contactShadow(ctx, x + 18, base - 4, 120, 10, 0.25 + 0.2 * p);
  prism(ctx, cap, 30, KEY_MAT);
  ctx.save();
  ctx.font = KEY_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0f1210';
  ctx.fillText('/smart-compact', x, y0 + CAP_H / 2 + 1);
  ctx.strokeStyle = 'rgba(255,255,250,0.9)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0 + 1);
  ctx.lineTo(x1 - r, y0 + 1);
  ctx.stroke();
  ctx.restore();
}

function keyBase(ctx) {
  contactShadow(ctx, KEY_X + 20, FLOOR - 6, 120, 14, 0.55);
  prism(ctx, rect(KEY_X - 70, FLOOR - 24, 140, 24), 60, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (const dx of [-56, 56]) ball(ctx, KEY_X + dx, FLOOR - 12, 3.4, MAT.metal);
}

function readerBack(ctx, act) {
  const M = activeMat(MAT.session, act);
  // low bed behind the tape, and the column the head hangs from
  prism(ctx, shiftPts(rect(RD_X0, 704, RD_X1 - RD_X0, FLOOR - 704), 60), 30, M, { hatch: true, sil: 3 });
  prism(ctx, shiftPts(rect(RD_X1 - 40, 594, 40, FLOOR - 594), 60), 30, M, { hatch: true, sil: 3.5 });
}

function capstan(ctx, x, phi, M) {
  const xx = x + D.x * -12, y0 = 690 - D.y * 12, y1 = FLOOR - D.y * 12;
  contactShadow(ctx, xx + 6, y1 - 2, 22, 5, 0.5);
  rodV(ctx, xx, y0, y1, 22, M);
  if (!LOD.card) {
    ctx.save();
    ctx.strokeStyle = 'rgba(6,14,9,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = phi + (k * Math.PI * 2) / 12;
      if (Math.cos(a) < 0.12) continue;
      const lx = xx + 10 * Math.sin(a);
      ctx.moveTo(lx, y0 + 8);
      ctx.lineTo(lx, y1 - 6);
    }
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = M.top;
  ctx.strokeStyle = M.sil;
  ctx.lineWidth = lw(2.2);
  ctx.beginPath();
  ctx.ellipse(xx, y0, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ball(ctx, xx, y0 - 3, 4, M);
}

function readerFront(ctx, act, phi, glowA) {
  const M = activeMat(MAT.session, act);
  // entry guide (the tape passes behind it)
  prism(ctx, shiftPts(rect(MOUTH - 10, 706, 20, FLOOR - 706), -14), 12, M, { sil: 2.5 });
  for (const x of CAP_XS) capstan(ctx, x, phi, M);
  // arm from the column over the tape, and the read head hanging from it
  prism(ctx, rect(1066, 596, RD_X1 - 1066, 24), 60, M, { sil: 3 });
  prism(ctx, rect(1074, 620, 92, 60), 50, M, { hatch: true, sil: 3.5 });
  ctx.save();
  ctx.fillStyle = '#070b08';
  ctx.fillRect(1094, 662, 52, 12);
  ctx.fillStyle = mix('#1d3a27', P.bright, glowA);
  ctx.fillRect(1098, 666, 44, 4);
  ctx.restore();
  if (!LOD.card) for (const x of [1084, 1156]) ball(ctx, x, 632, 3.2, M);
}

function punchBody(ctx, act) {
  const M = activeMat(MAT.session, act);
  contactShadow(ctx, PUNCH_X + 30, FLOOR - 6, 130, 18, 0.55);
  prism(ctx, rect(PUNCH_X - 77, CAB_TOP, 154, FLOOR - CAB_TOP), 90, M, { hatch: true, sil: 3.5 });
  ctx.save();
  ctx.fillStyle = '#050806';
  poly(ctx, [pr(PUNCH_X - 52, CAB_TOP, 34), pr(PUNCH_X + 52, CAB_TOP, 34), pr(PUNCH_X + 52, CAB_TOP, 46), pr(PUNCH_X - 52, CAB_TOP, 46)]);
  ctx.fill();
  ctx.restore();
  // hand wheel on the cabinet front
  ctx.save();
  ctx.strokeStyle = M.sil;
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  ctx.arc(PUNCH_X + 40, 690, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ball(ctx, PUNCH_X + 40, 690, 6, M);
}

function striker(ctx, act, jolt) {
  const M = activeMat(MAT.session, act);
  for (const x of [PUNCH_X - 58, PUNCH_X + 74]) rodV(ctx, x, 532, CAB_TOP + 2, 9, M);
  prism(ctx, rect(PUNCH_X - 66, 522 + jolt, 150, 16), 22, M, { hatch: true, sil: 3 });
}

function ram(ctx, t) {
  const top = ramTopAt(t);
  rodV(ctx, PRESS_X + D.x * 60, 306 + D.y * 60, top + D.y * 60 + 2, 20, MAT.lit);
  prism(ctx, rect(PRESS_X - 112, top, 224, RAM_H), 96, MAT.lit);
  ctx.save();
  // bushings where the rear posts pass through the ram's top face
  ctx.strokeStyle = '#86a98e';
  ctx.lineWidth = lw(2);
  for (const dx of [-128, 128]) {
    const [bx, by] = pr(PRESS_X + dx, top, 70);
    ctx.beginPath();
    ctx.ellipse(bx, by, 17, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // card slot
  ctx.fillStyle = '#050806';
  poly(ctx, [pr(PRESS_X - 52, top, 34), pr(PRESS_X + 52, top, 34), pr(PRESS_X + 52, top, 46), pr(PRESS_X - 52, top, 46)]);
  ctx.fill();
  // blank maker's plate with four screws (no words)
  if (!LOD.card) {
    ctx.fillStyle = '#1b231d';
    ctx.strokeStyle = '#4f6f57';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(PRESS_X - 46, top + 22, 92, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5f8167';
    for (const [sx, sy] of [[-40, 28], [40, 28], [-40, 46], [40, 46]]) { ctx.beginPath(); ctx.arc(PRESS_X + sx, top + sy, 2.4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  prism(ctx, rect(PRESS_X - 50, top + RAM_H, 100, PLATEN_H), 90, MAT.metal, { sil: 2.5 });
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function binWindow(ctx) {
  // interior of the chute, cut open in front
  const g = ctx.createLinearGradient(0, FLOOR, 0, H);
  g.addColorStop(0, '#050806');
  g.addColorStop(1, '#0a0e0b');
  ctx.fillStyle = g;
  ctx.fillRect(BIN_X0 + WALL, FLOOR, BIN_X1 - BIN_X0 - 2 * WALL, H - FLOOR);
  // back wall lines receding
  ctx.strokeStyle = '#121915';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const x of [BIN_X0 + WALL, BIN_X1 - WALL]) { ctx.moveTo(x, FLOOR); ctx.lineTo(x + D.x * 100, FLOOR + D.y * 100); }
  ctx.stroke();
  // cut faces of the walls, hatched
  for (const x of [BIN_X0, BIN_X1 - WALL]) {
    ctx.fillStyle = '#141b16';
    ctx.beginPath();
    ctx.rect(x, FLOOR, WALL, H - FLOOR);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(x, FLOOR, WALL, H - FLOOR);
    hatchPath(ctx, x, FLOOR, x + WALL, H, P.dim, 10, 2);
    ctx.strokeStyle = '#4f6f57';
    ctx.lineWidth = lw(2.5);
    ctx.strokeRect(x, FLOOR, WALL, H - FLOOR + 4);
  }
}

function backLayer(ctx) {
  benchFinal(ctx, 1150, 600);
  binWindow(ctx);
  centreLine(ctx, PRESS_X, 318, PRESS_X, AV - 6, 0.5);
  centreLine(ctx, PUNCH_X + D.x * CZ, 330, PUNCH_X + D.x * CZ, CAB_TOP - 12, 0.4);
  keyBase(ctx);
  // reader shadow
  contactShadow(ctx, 1120, FLOOR - 10, 150, 16, 0.5);
  // press: rear posts, crown, anvil
  for (const dx of [-128, 128]) {
    const [px, py] = pr(PRESS_X + dx, FLOOR, 70);
    contactShadow(ctx, px + 10, py - 2, 50, 9, 0.6);
    prism(ctx, rect(px - 24, py - 14, 48, 14), 24, MAT.lit, { sil: 2.5 });
    rodV(ctx, px, 306 + D.y * 70, py - 12, 24, MAT.lit);
  }
  contactShadow(ctx, PRESS_X + 22, FLOOR - 8, 70, 12, 0.6);
  prism(ctx, rect(PRESS_X - 150, 262, 300, 44), 100, MAT.lit);
  if (!LOD.card) for (let x = PRESS_X - 126; x <= PRESS_X + 126; x += 63) ball(ctx, x, 284, 3.4, MAT.lit);
  prism(ctx, rect(PRESS_X - 32, AV, 64, FLOOR - AV), 92, MAT.lit);
}

function frontLayer(ctx) {
  // the bench rule runs on across the chute's opening, in front of anything falling into it
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(BIN_X0, BENCH_Y + 0.5);
  ctx.lineTo(BIN_X1, BENCH_Y + 0.5);
  ctx.stroke();
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  for (let x = 0, i = 0; x < W; x += 24, i++) {
    if (x < BIN_X0 || x > BIN_X1) continue;
    const h = i % 10 === 0 ? 22 : i % 5 === 0 ? 14 : 8;
    ctx.moveTo(x, BENCH_Y + 6);
    ctx.lineTo(x, BENCH_Y + 6 + h);
  }
  ctx.stroke();
  // lamp: a wide pool over the reader and press, the ends of the bench dimmer
  ctx.save();
  ctx.translate(1120, 640);
  ctx.scale(1.55, 1);
  const g = ctx.createRadialGradient(0, 0, 330, 0, 0, 840);
  g.addColorStop(0, 'rgba(3,5,4,0)');
  g.addColorStop(1, 'rgba(3,5,4,0.56)');
  ctx.fillStyle = g;
  ctx.fillRect(-1300, -900, 2600, 1800);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------

export default {
  id: 'smart-compact',
  name: '/smart-compact',
  kind: 'mod', // a Claude Code mod (plugin), not a skill; the reel tags it as such
  caption: 'Write custom /compact instructions from this session, then compact with them',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    setLod(ctx);
    cached(ctx, 'smart-compact-back', backLayer);

    const f = feedAt(t);
    const pe = press(t);
    const yd = platenY(t);
    const contact = t >= pe.t1;

    // Scrap rows in the chute: one row lands per loop, the floor indexes down one row in the seam.
    const landed = t >= pe.t1 + FALL;
    const sink = ROW_H * indexEase(seg(t, 7.45, 7.59));
    ctx.save();
    ctx.beginPath();
    ctx.rect(BIN_X0 + WALL, FLOOR, BIN_X1 - BIN_X0 - 2 * WALL, H - FLOOR);
    ctx.clip();
    const firstY = RT0 - (landed ? ROW_H : 0) + sink;
    const rowYs = [];
    for (let y = firstY; y < H + 4; y += ROW_H) rowYs.push(y);
    for (let k = rowYs.length - 1; k >= 0; k--) {
      const yb = rowYs[k] + ROW_H - 2;
      offcut(ctx, -1, LAND_L[0], yb - (RT0 - 2) + LAND_L[1], -Math.PI / 2);
      offcut(ctx, 1, LAND_R[0], yb - (RT0 - 2) + LAND_R[1], Math.PI / 2);
    }
    const bg = ctx.createLinearGradient(0, RT0 - 30, 0, H);
    bg.addColorStop(0, 'rgba(4,6,5,0.2)');
    bg.addColorStop(0.45, 'rgba(4,6,5,0.72)');
    bg.addColorStop(1, 'rgba(4,6,5,0.94)');
    ctx.fillStyle = bg;
    ctx.fillRect(BIN_X0, RT0 - 30, BIN_X1 - BIN_X0, H - RT0 + 30);
    ctx.restore();

    // Reader backplate (the fork), brightening while it reads.
    const readAct = easeInOut(seg(t, 0.25, 0.5)) - easeInOut(seg(t, 2.3, 2.7));
    readerBack(ctx, readAct);

    // The tape, the pile and the blanks.
    if (!contact) {
      // sections from the leftmost (next to the blank) to the rightmost, upright or folding
      let onPile = 0;
      const folding = [];
      for (let i = 1; i <= NSEC; i++) {
        const left = HEAD_X + DB_W + (i - 1) * L + f;
        const u = (left - (X_F - L)) / L;
        if (u >= 1) onPile++;
        else if (u > 0) folding.push({ i, left, u });
      }
      const k = yd > AV - PILE_H ? (AV - yd) / PILE_H : 1;
      pile(ctx, onPile, k);
      for (const s of folding) {
        const j = NSEC - s.i;
        const e = easeInOut(s.u);
        const yb = lerp(FLOOR, AV - j * LAY, e) - 26 * Math.sin(Math.PI * s.u);
        section(ctx, s.i, lerp(s.left, PILE_L, e), yb, (Math.PI / 2) * e);
      }
      for (let i = NSEC; i >= 1; i--) {
        const left = HEAD_X + DB_W + (i - 1) * L + f;
        if (left < X_F - L) section(ctx, i, left, FLOOR, 0);
      }
      // the old blank: along the bench, then a short hop onto the pile, then squashed by the ram
      const bx = HEAD_X + f;
      const ub = clamp01((bx + DB_W - X_F) / DB_W);
      if (ub <= 0) denseBlank(ctx, bx, FLOOR);
      else {
        const e = easeInOut(ub);
        const yTop = AV - NSEC * LAY * k;
        const spread = clamp01((1 - k) / (1 - K1));
        const w = DB_W + (L - DB_W) * spread;
        const x = lerp(bx, PRESS_X - DB_W / 2, e) - (w - DB_W) / 2;
        denseBlank(ctx, x, lerp(FLOOR, yTop, e) - 34 * Math.sin(Math.PI * ub), w, DB_H * (ub >= 1 ? k : 1));
      }
    } else {
      // the new dense blank: under the press, then to the bench centre, then (seam) to the head
      let bx = PRESS_X - DB_W / 2, by = AV;
      if (t >= 5.3) {
        const u = seg(t, 5.3, 5.8);
        bx = lerp(bx, CENTRE_X, easeInOut(u));
        by = lerp(AV, FLOOR, easeInOut(seg(u, 0.12, 0.4)));
      }
      if (t >= 7.3) bx = lerp(CENTRE_X, HEAD_X, easeInOut(seg(t, 7.3, 8.0)));
      if (t >= 7.3) {
        // new tape comes out of the reader behind the blank
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, MOUTH, H);
        ctx.clip();
        for (let i = NSEC; i >= 1; i--) {
          const left = bx + DB_W + (i - 1) * L;
          if (left < MOUTH) section(ctx, i, left, FLOOR, 0);
        }
        ctx.restore();
      }
      denseBlank(ctx, bx, by);
    }

    // Reader front parts: guide, capstans, head. Capstans turn only while the tape feeds.
    const phi = (f / FEED) * 174 * ((Math.PI * 2) / 12);
    const speed = clamp01((feedAt(t + 0.02) - feedAt(t - 0.02)) / 0.04 / 560);
    readerFront(ctx, readAct, phi, speed);
    if (speed > 0.01) lightShaft(ctx, 1100, 1140, 680, 1088, 1152, FLOOR - TH, 0.08 * speed);

    // Press ram (in front of the pile).
    ram(ctx, t);

    // Card punch and the keep card.
    const punchAct = easeInOut(seg(t, 1.55, 1.8)) - easeInOut(seg(t, 3.9, 4.3));
    punchBody(ctx, punchAct);
    const cs = cardState(t);
    card(ctx, cs);
    let jolt = 0;
    for (let r = 0; r < ROWS; r++) jolt += 3 * Math.sin(Math.PI * seg(t, CLICK(r), CLICK(r) + 0.07));
    striker(ctx, punchAct, jolt);

    // Offcuts falling into the chute.
    if (contact && !landed) {
      const u = seg(t, pe.t1, pe.t1 + FALL);
      const a = (Math.PI / 2) * easeInOut(u);
      const ug = u * u;
      offcut(ctx, -1, lerp(PILE_L, LAND_L[0], u), lerp(AV, LAND_L[1], ug), -a);
      offcut(ctx, 1, lerp(PILE_L + L, LAND_R[0], u), lerp(AV, LAND_R[1], ug), a);
    }

    // The person's key.
    let kp = 0;
    if (t < 0.5) kp = t < 0.16 ? easeInOut(t / 0.16) : t < 0.24 ? 1 : 1 - easeOut(seg(t, 0.24, 0.5));
    key(ctx, kp);

    cached(ctx, 'smart-compact-front', frontLayer);

    // Light on top of the lamp falloff.
    contactGlow(ctx, KEY_X + 6, FLOOR - 64, (t - 0.16) / 0.12, 26);
    if (speed > 0.01) softGlow(ctx, 1120, 668, 40, P.green, 0.25 * speed);
    for (let r = 0; r < ROWS; r++) {
      const u = (t - CLICK(r)) / 0.12;
      if (u > 0 && u < 1) softGlow(ctx, PUNCH_X + 9 + D.x * CZ, 530, 46, P.bright, 0.32 * Math.sin(u * Math.PI));
    }
    contactGlow(ctx, PRESS_X, YD1 + 2, pe.c, 40);
    if (contact) {
      const tau = t - pe.t1;
      dust(ctx, PILE_L + 4, AV - 30, tau, 0x5c1, { ang: Math.PI * 1.1, spread: 1.2, n: 10, dur: 0.5 });
      dust(ctx, PILE_L + L - 4, AV - 30, tau, 0x5c2, { ang: -Math.PI * 0.1, spread: 1.2, n: 10, dur: 0.5 });
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
