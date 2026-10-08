// /smart-compact at final fidelity (pitch A 3.4, same beats as the animatic's
// scenes/smart-compact.js). A Claude Code mod, not a skill: kind 'mod'.
// One line across the bench, left to right: the person's key at the front, the session tape on its
// guide rail (the last compaction's dense blank leads it, newer sections behind), a paper-tape
// reader with pinch rollers and a read head, a card punch behind the tape lane (reader and punch are
// one fork of the session: their heads are the session's hatched green, joined by a cable), and a
// screw press with a flywheel over the scrap chute. The key starts it. The whole tape runs through
// the reader and stacks on the press anvil while what is read runs along the cable to the punch. The
// punch writes a seven-row keep card, shows it still, and the card goes straight into the press
// head: no approval step. The press comes down, the stack becomes one block, the die splits off its
// sides and they fall into the chute (compaction is not lossless). The new dense blank steps off
// the anvil, runs along the front of the bench past the reader and settles at the head of the tape
// lane. In the seam the session continues: new tape feeds in from the left behind it. No meter.
// The lamp follows the working station: key, reader, punch, press, result.
// Pure function of t. No Math.random, no setTransform; static layers and part sprites are cached
// per device scale and drawn the same way every time.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, rodH, ball, discPts, contactShadow, contactGlow, softGlow, dust, centreLine, benchFinal,
  lightShaft, lampFalloff, activeMat, rng,
} from '../kit.mjs';

const T = 8.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const KEY_X = 190, KEY_Z = -60; // the key stands on the front of the bench, in front of the lane
const HEAD_X = 596; // the dense blank's left edge at rest: the head of the tape lane
const DB_W = 56, DB_H = 84, DB_D = 66; // dense blank: front face and depth
const L = 104, TH = 66, NOTCH = 12, NSEC = 6; // tape section: length, height, corner notch, count
const MOUTH = 700, RD1 = 960; // the reader spans the lane from its entry guide to its exit guide
const ROLL_XS = [758, 902]; // the two pinch-roller pairs
const FRONT_Z = -64; // depth of the front lane the new blank uses to pass the reader
const IN_D = 700; // how far new tape travels in from the left in the seam
const PRESS_X = 1380, PILE_L = PRESS_X - L / 2;
const FOLD_X0 = PILE_L - 40; // a section starts onto the stack once its right edge passes this
const FOLD_D = 240; // feed travelled while a section folds onto the stack (about 0.25 s)
const FOLD_DB = 180; // the same for the blank riding up onto the anvil
const FEED = FOLD_X0 + FOLD_D - (HEAD_X - NSEC * L + L);
const AV = 736; // anvil top
const LAY = 9; // one folded section on the stack
const PILE_H = NSEC * LAY + DB_H;
const RAM_W = 100, RAM_H = 76, PLATEN_H = 16, RAM_TOP0 = 470;
const ARM_Y = 286, ARM_H = 40; // the press head (arm of the C-frame)
const YD0 = RAM_TOP0 + RAM_H + PLATEN_H; // platen face at rest
const YD1 = AV - DB_H; // platen face at contact
const K1 = DB_H / PILE_H; // stack compression at contact
const PRESS_T0 = 3.8, PRESS_A = (0.8 - 0.2) / 1.75;
const PRESS_TC = PRESS_T0 + PRESS_A;
const SPLIT = 0.12, SHEAR = 0.15, SHEAR_PX = 10, FALL = 0.45; // after contact: cut, push out, fall
const OFF_W = (L - DB_W) / 2;
const COL_X = PRESS_X + 132, COL_Z = 30; // the C-frame's column, back right of the ram

// Card punch: stands behind the tape lane (PZ deep); the card stands in a plane CZ deep in it.
const PUNCH_X = 1090, PZ = 70, CAB_TOP = 640, CZ = 40;
const CW = 96, CH = 140, CCLIP = 18;
const ROWS = 7, COLS = 5, ROW_OFF = 28, ROW_P = 15;
const LINE = 540; // punch line, card-plane y
const CLICK = (r) => 2.05 + 0.1 * r;
const SHOW_LIFT = 24;

// Scrap chute below the bench, seen in section.
const BIN_X0 = PRESS_X - 140, BIN_X1 = PRESS_X + 140, WALL = 18;
const ROW_H = 26, RT0 = 884;
const LAND_L = [PRESS_X - 22, RT0 - 2], LAND_R = [PRESS_X + 22, RT0 - 2]; // pivot of each landed offcut

// The read head, and the cable from it to the punch head.
const HEAD_GLOW_X = 830;
const CABLE = [[870, 628], [980, 628], [990, 560], [PUNCH_X - 64 + D.x * PZ, LINE + D.y * PZ]];

// Lamp stations.
const LAMP_KEY = 200, LAMP_READER = 830, LAMP_PUNCH = PUNCH_X + D.x * PZ, LAMP_PRESS = PRESS_X;
const LAMP_RES = HEAD_X + DB_W / 2;

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

const smooth = (u) => u * u * (3 - 2 * u);

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

// Part sprites: a part drawn once into an OffscreenCanvas that covers its box (bx, by, bw, bh in the
// caller's coordinates) at the current device scale, then blitted; moving parts are drawn by
// translating the context first. The sprite is drawn with the same calls every time, so the output
// depends only on (key, scale). At most two scales are held per key.
const sprites = new Map();
function sprite(ctx, key, bx, by, bw, bh, draw) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  let list = sprites.get(key);
  if (!list) sprites.set(key, (list = []));
  let S = list.find((e) => e.s === s);
  if (!S) {
    const cw = Math.max(1, Math.ceil(bw * s)), ch = Math.max(1, Math.ceil(bh * s));
    const cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.scale(cw / bw, ch / bh);
    c.translate(-bx, -by);
    const saved = { ...LOD };
    setLod(c);
    draw(c);
    Object.assign(LOD, saved);
    S = { s, cv };
    list.unshift(S);
    while (list.length > 2) { const old = list.pop(); old.cv.width = old.cv.height = 0; }
  }
  ctx.drawImage(S.cv, bx, by, bw, bh);
}

// Two sprites of one part, idle and active, crossfaded by u (0 idle, 1 active).
function spriteAct(ctx, key, box, u, draw) {
  if (u < 0.999) sprite(ctx, key + ':0', box[0], box[1], box[2], box[3], (c) => draw(c, 0));
  if (u > 0.001) {
    ctx.save();
    ctx.globalAlpha *= Math.min(1, u);
    sprite(ctx, key + ':1', box[0], box[1], box[2], box[3], (c) => draw(c, 1));
    ctx.restore();
  }
}

function mixMat(a, b, u) {
  return {
    front: [mix(a.front[0], b.front[0], u), mix(a.front[1], b.front[1], u)],
    top: mix(a.top, b.top, u), side: mix(a.side, b.side, u), sil: null, hi: null, line: a.line,
  };
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

const feedAt = (t) => FEED * trap(seg(t, 0.4, 2.05), 0.12, 0.12);
const press = (t) => engage(t, PRESS_T0, PRESS_A);
const platenY = (t) => YD0 + (YD1 - YD0) * press(t).d;
const ramTopAt = (t) => platenY(t) - PLATEN_H - RAM_H;
const CONTACT = PRESS_T0 + PRESS_A;
const FALL_A = CONTACT + SPLIT + SHEAR, LANDED = FALL_A + FALL;
const SETTLE_A = 4.62, SETTLE_B = 5.65, SEAM_A = 7.2;

// Where the lamp stands: on whichever station is working.
function lampX(t) {
  return LAMP_KEY
    + (LAMP_READER - LAMP_KEY) * easeInOut(seg(t, 0.3, 0.6))
    + (LAMP_PUNCH - LAMP_READER) * easeInOut(seg(t, 1.75, 2.05))
    + (LAMP_PRESS - LAMP_PUNCH) * easeInOut(seg(t, 3.35, 3.7))
    + (LAMP_RES - LAMP_PRESS) * easeInOut(seg(t, SETTLE_A, SETTLE_B))
    + (LAMP_KEY - LAMP_RES) * easeInOut(seg(t, SEAM_A, T));
}

// The new blank after the press: left edge x, base y and depth z.
function resultPose(t) {
  if (t < SETTLE_A) return { x: PRESS_X - DB_W / 2, y: AV, z: 0 };
  const u = seg(t, SETTLE_A, SETTLE_B);
  // step forward off the anvil, drop to the bench, run left along the front lane, step back in
  const zOut = easeInOut(seg(u, 0, 0.16)), zIn = easeInOut(seg(u, 0.82, 1));
  return {
    x: lerp(PRESS_X - DB_W / 2, HEAD_X, trap(seg(u, 0.1, 1), 0.3, 0.35)),
    y: lerp(AV, FLOOR, easeIn(seg(u, 0.1, 0.22))),
    z: FRONT_Z * (zOut - zIn),
  };
}

// Card: centre x, top edge and plane depth, how many rows are punched, and where it is clipped.
function cardState(t) {
  if (t < 1.8 || t >= PRESS_TC) return null;
  let cx = PUNCH_X, top, clipY = CAB_TOP, z = PZ + CZ;
  const rows = CARD_PAT.reduce((n, _, r) => (t >= CLICK(r) + 0.05 ? r + 1 : n), 0);
  if (t < 2.05) top = lerp(CAB_TOP + 2, LINE - ROW_OFF, easeInOut(seg(t, 1.8, 2.05)));
  else if (t < 3.4) {
    top = LINE - ROW_OFF;
    for (let r = 1; r < ROWS; r++) {
      const m = CLICK(r - 1) + 0.03;
      top -= ROW_P * indexEase(seg(t, m, m + 0.09));
    }
    top -= SHOW_LIFT * easeOut(seg(t, 2.68, 2.8));
  } else if (t < PRESS_T0) {
    // lift clear of the punch head first, then across and down into the ram's slot
    const u = seg(t, 3.4, PRESS_T0);
    const top0 = LINE - ROW_OFF - ROW_P * (ROWS - 1) - SHOW_LIFT;
    top = lerp(top0, RAM_TOP0 - CH, easeInOut(seg(u, 0, 0.45)));
    const e = easeInOut(seg(u, 0.28, 1));
    cx = lerp(PUNCH_X, PRESS_X, e);
    z = lerp(PZ + CZ, CZ, e);
    clipY = H;
  } else {
    const rt = ramTopAt(t);
    cx = PRESS_X;
    z = CZ;
    top = rt - CH + CH * easeInOut(seg(t, PRESS_T0, PRESS_TC));
    clipY = rt;
  }
  return { cx, top, rows, clipY, z };
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

// The face as a sprite, upright (flat 0) or lying (flat 1), drawn at (0, 0) in face coordinates.
function faceSprite(ctx, i, flat) {
  sprite(ctx, `sc-face${i}-${flat}`, -3, -3, L + 6, TH + 6, (c) => sectionFace(c, i, flat));
}

// A section standing on (x0, yb) and tipped back by th; when it is tipped it rests on a layer of
// thickness `thick` (its folded paper) whose front edge shows below the face.
function section(ctx, i, x0, yb, th, thick = LAY) {
  const s = Math.sin(th);
  const tk = thick * s;
  if (tk > 0.3) {
    ctx.fillStyle = '#cfd0c4';
    ctx.fillRect(x0, yb - tk, L, tk);
  }
  ctx.save();
  tilt(ctx, x0, yb - tk, TH, th);
  if (s < 0.999) faceSprite(ctx, i, 0);
  if (s > 0.001) {
    ctx.globalAlpha *= s;
    faceSprite(ctx, i, 1);
  }
  ctx.restore();
}

// The stack on the anvil: the old blank at the bottom, then n folded sections, squashed by k.
function stackDirect(ctx, n, k, withBlank = true) {
  const spread = clamp01((1 - k) / (1 - K1));
  const w = DB_W + (L - DB_W) * spread;
  if (withBlank) denseBlankBody(ctx, PRESS_X - w / 2, AV, w, DB_H * k);
  for (let j = 0; j < n; j++) section(ctx, j + 1, PILE_L, AV - DB_H * k - j * LAY * k, Math.PI / 2, LAY * k);
}
function stack(ctx, n, k) {
  if (k < 0.9999) { stackDirect(ctx, n, k); return; }
  sprite(ctx, 'sc-stack' + n, PILE_L - 6, AV - PILE_H - 30, L + 44, PILE_H + 36, (c) => stackDirect(c, n, 1));
}

// ---------------------------------------------------------------------------------------------
// Drawing: the dense blank, the pressed block and the offcuts.

const BLANK_MAT = { ...MAT.ivory, front: ['#f8f8f1', '#d2d3c6'] };
// Landed scrap is idle material: dull, under the bench, out of the light.
const SCRAP_MAT = { front: ['#4b4d46', '#34362f'], top: '#57594f', side: '#272924', sil: null, hi: null, line: 'rgba(16,18,15,0.6)' };

function denseBlankBody(ctx, x, yb, w = DB_W, h = DB_H) {
  const sy = h / DB_H;
  const pts = blankPts(x, yb - h, w, h, 12.5 * Math.min(1, sy * 1.2));
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

// The dense blank at full size with its left edge at x, base at yb, depth z (sprite).
function denseBlank(ctx, x, yb, z = 0) {
  const [sx, sy] = pr(x, yb, z);
  ctx.save();
  ctx.translate(sx, sy);
  sprite(ctx, 'sc-blank', -4, -DB_H - 24, DB_W + 36, DB_H + 28, (c) => denseBlankBody(c, 0, 0));
  ctx.restore();
}

function blankShadow(ctx, x, z) {
  const [sx, sy] = pr(x, FLOOR, z);
  contactShadow(ctx, sx + DB_W / 2 + 22, sy - 8, DB_W + 16, 12, 0.5);
}

// An offcut: one trimmed side of the pressed block, pivoting on its outer bottom corner.
// side -1: left piece (pivot bottom-left), +1: right piece (pivot bottom-right).
// Its face carries the block's layers: the folded sections above, the old blank below.
function offcut(ctx, side, px, py, ang, mat = BLANK_MAT) {
  const x0 = side < 0 ? 0 : -OFF_W, x1 = x0 + OFF_W;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const rot = ([x, y]) => [px + x * ca - y * sa, py + x * sa + y * ca];
  const pts = [[x0, -DB_H], [x1, -DB_H], [x1, 0], [x0, 0]].map(rot);
  prism(ctx, pts, DB_D, mat, { sil: 2 });
  ctx.save();
  ctx.strokeStyle = mat === BLANK_MAT ? 'rgba(96,100,88,0.6)' : 'rgba(20,22,18,0.55)';
  ctx.lineWidth = lw(1.3);
  ctx.beginPath();
  const blankH = DB_H * K1;
  for (let m = 1; m <= NSEC + 3; m++) {
    const y = m <= NSEC ? -blankH - (m - 1) * LAY * K1 : -blankH + (m - NSEC) * (blankH / 4);
    if (y <= -DB_H + 1 || y >= -1) continue;
    const a = rot([x0, y]), b = rot([x1, y]);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
  ctx.restore();
}

// One landed row of scrap (both offcuts lying flat), its bottom at yb.
function scrapRow(ctx, yb, mat) {
  offcut(ctx, -1, LAND_L[0], yb, -Math.PI / 2, mat);
  offcut(ctx, 1, LAND_R[0], yb, Math.PI / 2, mat);
}

// Right after contact: the compressed stack, then the same block cut in three. The stack drawing
// fades over the cut block (same outline, so only the face changes), two cut lines darken in, then
// the sides are pushed out before they fall.
function pressedBlock(ctx, t) {
  const u = seg(t, CONTACT, CONTACT + SPLIT);
  const sh = SHEAR_PX * easeInOut(seg(t, CONTACT + SPLIT, FALL_A));
  if (t < FALL_A) offcut(ctx, -1, PILE_L - sh, AV, 0);
  denseBlank(ctx, PRESS_X - DB_W / 2, AV);
  if (t < FALL_A) offcut(ctx, 1, PILE_L + L + sh, AV, 0);
  if (u < 1) {
    ctx.save();
    ctx.globalAlpha *= 1 - u;
    stackDirect(ctx, NSEC, K1);
    ctx.restore();
    // the cut lines the die makes
    ctx.save();
    ctx.strokeStyle = `rgba(40,44,36,${0.8 * Math.sin(Math.PI * u)})`;
    ctx.lineWidth = lw(2);
    ctx.beginPath();
    for (const x of [PILE_L + OFF_W, PILE_L + L - OFF_W]) { ctx.moveTo(x, AV - DB_H + 2); ctx.lineTo(x, AV); }
    ctx.stroke();
    ctx.restore();
  }
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
  ctx.translate(D.x * st.z, D.y * st.z);
  if (st.clipY < H) {
    ctx.beginPath();
    ctx.rect(0, 0, W, st.clipY);
    ctx.clip();
  }
  ctx.translate(st.cx - CW / 2, st.top);
  sprite(ctx, 'sc-card' + st.rows, -4, -6, CW + 10, CH + 10, (c) => cardFace(c, 0, 0, st.rows));
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Drawing: the key.

const KEY_FONT = 'italic 600 30px "Fraunces", "Fraunces fallback", serif';
const KEY_MAT = { ...MAT.ivory, front: ['#f7f7f0', '#dadbcf'] };
// the cap at rest while other stations work: the same ivory out of the light
const KEY_IDLE = { ...MAT.ivory, front: ['#a3a49b', '#85867e'], top: '#b4b5ac', side: '#64655e' };
const CAP_W = 236, CAP_H = 48, CAP_R = 9;

function capBody(ctx, M) {
  const x0 = KEY_X - CAP_W / 2, y0 = -CAP_H, x1 = KEY_X + CAP_W / 2, r = CAP_R;
  const cap = [];
  for (const [cx, cy, a0] of [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, -r, 0], [x0 + r, -r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]]) {
    for (let k = 0; k <= 3; k++) { const a = a0 + (k / 3) * (Math.PI / 2); cap.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  }
  prism(ctx, cap, 30, M);
  ctx.save();
  ctx.strokeStyle = M === KEY_MAT ? 'rgba(255,255,250,0.9)' : 'rgba(220,221,212,0.55)';
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.moveTo(x0 + r, y0 + 1);
  ctx.lineTo(x1 - r, y0 + 1);
  ctx.stroke();
  ctx.restore();
}

function keyBase(ctx) {
  contactShadow(ctx, KEY_X + 20, FLOOR - 6, 120, 14, 0.55);
  prism(ctx, rect(KEY_X - 70, FLOOR - 24, 140, 24), 40, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (const dx of [-56, 56]) ball(ctx, KEY_X + dx, FLOOR - 12, 3.4, MAT.metal);
  // the stem's spring collar
  prism(ctx, rect(KEY_X - 9, FLOOR - 36, 30, 12), 30, MAT.fresh, { sil: 2.5 });
}

function key(ctx, p, act) {
  const base = FLOOR - 24;
  const capB = base - 96 + 16 * p;
  ctx.save();
  ctx.translate(D.x * KEY_Z, D.y * KEY_Z);
  sprite(ctx, 'sc-keybase', KEY_X - 110, FLOOR - 70, 280, 90, keyBase);
  rodV(ctx, KEY_X + 6, capB - 4, base - 12, 14, MAT.fresh);
  contactShadow(ctx, KEY_X + 18, base - 4, 120, 10, 0.25 + 0.2 * p);
  ctx.translate(0, capB);
  spriteAct(ctx, 'sc-cap', [KEY_X - CAP_W / 2 - 6, -CAP_H - 16, CAP_W + 30, CAP_H + 22], act, (c, a) => capBody(c, a ? KEY_MAT : KEY_IDLE));
  // the words stay live text (a sprite would keep a fallback face if it were made before the font loaded)
  ctx.font = KEY_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = mix('#3a3d37', '#0f1210', act);
  ctx.fillText('/smart-compact', KEY_X, -CAP_H / 2 + 1);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Drawing: the reader (back frame in the fixtures layer; head and front parts here).

// Back frame plate behind the lane, with the roller bearings and a foot.
function readerFrame(ctx) {
  const [fx, fy] = pr(MOUTH + 10, FLOOR, 50);
  contactShadow(ctx, fx + 140, fy - 2, 170, 16, 0.55);
  prism(ctx, shiftPts(rect(MOUTH - 4, FLOOR - 12, RD1 - MOUTH + 8, 12), 36), 90, MAT.metal, { sil: 2.5 });
  prism(ctx, shiftPts(rect(MOUTH + 16, 596, RD1 - MOUTH - 32, FLOOR - 12 - 596), 44), 20, MAT.lit, { sil: 3 });
  // the plate's recessed window behind the read head, and its bolts
  ctx.save();
  const w0 = pr(MOUTH + 70, 616, 44), w1 = pr(RD1 - 70, 676, 44);
  ctx.fillStyle = '#0a0e0b';
  ctx.fillRect(w0[0], w0[1], w1[0] - w0[0], w1[1] - w0[1]);
  ctx.restore();
  if (!LOD.card) for (const [x, y] of [[MOUTH + 32, 612], [RD1 - 32, 612], [MOUTH + 32, 740], [RD1 - 32, 740]]) { const q = pr(x, y, 44); ball(ctx, q[0], q[1], 3.4, MAT.lit); }
  // back rollers (behind the tape; their tops show above it)
  for (const x of ROLL_XS) {
    const q = pr(x, 0, 16);
    rodV(ctx, q[0], 690 + D.y * 16, FLOOR + D.y * 16, 20, MAT.lit);
    rollerCap(ctx, q[0], 690 + D.y * 16, 12);
  }
  // the head's mounting bracket off the plate
  prism(ctx, shiftPts(rect(HEAD_GLOW_X - 34, 592, 68, 18), 4), 40, MAT.lit, { sil: 2.5 });
}

function rollerCap(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = MAT.lit.top;
  ctx.strokeStyle = MAT.lit.hi;
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  ctx.ellipse(x, y, r + 2, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ball(ctx, x, y - 2, 3.6, MAT.lit);
}

// Front parts: the entry and exit guides (flanged posts the tape runs behind), the front pinch
// rollers (in front of the tape), and the yokes that hold each roller pair.
function readerFront(ctx) {
  for (const x of [MOUTH, RD1]) {
    const pts = shiftPts([[x - 7, 704], [x + 7, 704], [x + 7, FLOOR], [x - 7, FLOOR]], -16);
    prism(ctx, pts, 10, MAT.lit, { sil: 2.5 });
    prism(ctx, shiftPts(rect(x - 12, 696, 24, 8), -18), 40, MAT.lit, { sil: 2 });
  }
  for (const x of ROLL_XS) {
    const q = pr(x, 0, -16);
    contactShadow(ctx, q[0] + 6, FLOOR + D.y * -16 - 2, 22, 5, 0.5);
    rodV(ctx, q[0], 690 - D.y * 16, FLOOR - D.y * 16, 22, MAT.lit);
    rollerCap(ctx, q[0], 690 - D.y * 16, 13);
    prism(ctx, shiftPts(rect(x - 12, 670, 24, 14), -22), 66, MAT.metal, { sil: 2.5 });
  }
}

function rollerRibs(ctx, phi) {
  if (LOD.card) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(6,10,8,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const x of ROLL_XS) {
    const xx = x + D.x * -16, y0 = 690 - D.y * 16, y1 = FLOOR - D.y * 16;
    for (let k = 0; k < 12; k++) {
      const a = phi + (k * Math.PI * 2) / 12;
      if (Math.cos(a) < 0.12) continue;
      const lx = xx + 10 * Math.sin(a);
      ctx.moveTo(lx, y0 + 8);
      ctx.lineTo(lx, y1 - 6);
    }
  }
  ctx.stroke();
  ctx.restore();
}

// The read head (the fork's eye, session green, hatched) and the cable to the punch head.
function readHead(ctx, act) {
  const M = activeMat(MAT.session, act);
  const x = HEAD_GLOW_X;
  prism(ctx, shiftPts(rect(x - 38, 610, 76, 50), -6), 40, M, { hatch: true, sil: 3.5 });
  // pickup shoe that rides just over the tape
  prism(ctx, shiftPts(rect(x - 20, 660, 40, 30), 4), 16, MAT.metal, { sil: 2.5 });
  ctx.save();
  ctx.fillStyle = '#070b08';
  const s0 = pr(x - 16, 684, 4);
  ctx.fillRect(s0[0], s0[1], 32, 5);
  // cable: a hatched-green sheathed run from the head to the punch head
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  CABLE.forEach(([cx, cy], i) => (i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy)));
  ctx.strokeStyle = '#08120c';
  ctx.lineWidth = lw(9);
  ctx.stroke();
  ctx.strokeStyle = M.front[0];
  ctx.lineWidth = lw(6);
  ctx.stroke();
  ctx.strokeStyle = M.sil;
  ctx.lineWidth = lw(1.5);
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.restore();
  if (!LOD.card) for (const [bx, by] of [[x - 26, 622], [x + 26, 622]]) ball(ctx, bx, by, 3.2, M);
}

// ---------------------------------------------------------------------------------------------
// Drawing: the punch (metal frame in the fixtures layer; the session's punch head here).

function punchFrame(ctx) {
  // die block / cabinet, with the card slot and a hand wheel
  contactShadow(ctx, PUNCH_X + 30, FLOOR - 6, 110, 16, 0.55);
  prism(ctx, rect(PUNCH_X - 70, CAB_TOP, 140, FLOOR - CAB_TOP), 90, MAT.lit);
  ctx.save();
  ctx.fillStyle = '#050806';
  poly(ctx, [pr(PUNCH_X - 52, CAB_TOP, 34), pr(PUNCH_X + 52, CAB_TOP, 34), pr(PUNCH_X + 52, CAB_TOP, 46), pr(PUNCH_X - 52, CAB_TOP, 46)]);
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  ctx.arc(PUNCH_X + 30, 712, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = lw(2.5);
  ctx.beginPath();
  for (let k = 0; k < 3; k++) { const a = 0.4 + (k * Math.PI * 2) / 3; ctx.moveTo(PUNCH_X + 30, 712); ctx.lineTo(PUNCH_X + 30 + Math.cos(a) * 19, 712 + Math.sin(a) * 19); }
  ctx.stroke();
  ctx.restore();
  ball(ctx, PUNCH_X + 30, 712, 6, MAT.lit);
  if (!LOD.card) {
    ctx.fillStyle = '#1b231d';
    ctx.strokeStyle = '#4f6f57';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(PUNCH_X - 54, 664, 46, 22);
    ctx.fill();
    ctx.stroke();
  }
  // card guides: two bars behind the card plane, from the die block up to the crown
  for (const x of [PUNCH_X - 60, PUNCH_X + 50]) prism(ctx, shiftPts(rect(x, 380, 10, CAB_TOP - 380), CZ + 10), 10, MAT.lit, { sil: 2 });
  prism(ctx, shiftPts(rect(PUNCH_X - 70, 362, 140, 18), CZ + 6), 34, MAT.lit, { sil: 2.5 });
  if (!LOD.card) for (const x of [PUNCH_X - 55, PUNCH_X + 55]) { const q = pr(x, 371, CZ + 6); ball(ctx, q[0], q[1], 3, MAT.lit); }
  // the die bar behind the card at the punch line
  prism(ctx, shiftPts(rect(PUNCH_X - 56, LINE - 9, 112, 18), CZ + 8), 10, MAT.metal, { sil: 2 });
}

function punchHead(ctx, act) {
  const M = activeMat(MAT.session, act);
  prism(ctx, rect(PUNCH_X - 62, LINE - 15, 124, 30), 22, M, { hatch: true, sil: 3 });
  // two slide shoes that ride the guide bars
  for (const x of [PUNCH_X - 66, PUNCH_X + 52]) prism(ctx, rect(x, LINE - 9, 14, 18), CZ + 10, MAT.lit, { sil: 2 });
}

// ---------------------------------------------------------------------------------------------
// Drawing: the screw press (C-frame in the fixtures layer; flywheel, screw and ram here).

function pressFrame(ctx) {
  const [cx, cy] = pr(COL_X, FLOOR, COL_Z);
  contactShadow(ctx, cx + 40, cy - 2, 90, 12, 0.6);
  // bed plate behind the anvil, the column with its front rib, the head arm
  prism(ctx, shiftPts(rect(PRESS_X - 70, FLOOR - 12, COL_X + 90 - PRESS_X, 12), 12), 100, MAT.metal, { sil: 2.5 });
  prism(ctx, shiftPts(rect(COL_X, ARM_Y, 52, FLOOR - 12 - ARM_Y), COL_Z), 80, MAT.lit);
  prism(ctx, shiftPts(rect(COL_X + 16, ARM_Y + ARM_H, 20, FLOOR - 12 - ARM_Y - ARM_H), COL_Z - 8), 8, MAT.lit, { sil: 2 });
  prism(ctx, shiftPts(rect(PRESS_X - 118, ARM_Y, COL_X + 52 - PRESS_X + 118, ARM_H), COL_Z), 80, MAT.lit);
  if (!LOD.card) for (let x = PRESS_X - 96; x <= COL_X + 30; x += 64) { const q = pr(x, ARM_Y + 20, COL_Z); ball(ctx, q[0], q[1], 3.4, MAT.lit); }
  // nut boss under the head where the screw leaves it
  prism(ctx, shiftPts(rect(PRESS_X - 22, ARM_Y + ARM_H, 44, 14), 44), 30, MAT.lit, { sil: 2 });
  // anvil on a bolster
  contactShadow(ctx, PRESS_X + 22, FLOOR - 8, 70, 12, 0.6);
  prism(ctx, rect(PRESS_X - 44, FLOOR - 14, 88, 14), 100, MAT.metal, { sil: 2.5 });
  prism(ctx, rect(PRESS_X - 32, AV, 64, FLOOR - 14 - AV), 92, MAT.lit);
}

// The flywheel on top of the screw, turning as the ram travels.
function flywheel(ctx, phi) {
  const cx = PRESS_X + D.x * 60, cy = ARM_Y - 18 + D.y * 60;
  ctx.save();
  const outer = discPts(cx, cy, 110, 40), inner = discPts(cx, cy, 94, 40);
  // rim thickness (its underside)
  ctx.fillStyle = '#0d120f';
  poly(ctx, outer.map(([x, y]) => [x, y + 9]));
  ctx.fill();
  ctx.beginPath();
  outer.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  for (let i = inner.length - 1; i >= 0; i--) (i === inner.length - 1 ? ctx.moveTo(inner[i][0], inner[i][1]) : ctx.lineTo(inner[i][0], inner[i][1]));
  ctx.closePath();
  const g = ctx.createLinearGradient(cx - 110, cy - 30, cx + 110, cy + 30);
  g.addColorStop(0, '#5f8167');
  g.addColorStop(0.45, '#2e3d32');
  g.addColorStop(1, '#141b16');
  ctx.fillStyle = g;
  ctx.fill('evenodd');
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(2.5);
  ctx.stroke();
  // spokes
  ctx.strokeStyle = '#34453a';
  ctx.lineWidth = lw(7);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = phi + (k * Math.PI) / 2;
    const u = Math.cos(a) * 92, v = Math.sin(a) * 92;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + u + D.x * v, cy + D.y * v);
  }
  ctx.stroke();
  ctx.strokeStyle = MAT.lit.hi;
  ctx.lineWidth = lw(1.5);
  ctx.stroke();
  ctx.restore();
  ball(ctx, cx, cy - 3, 12, MAT.lit);
  // the screw from the hub down into the head
  rodV(ctx, cx, cy + 4, ARM_Y + D.y * 60 + 4, 16, MAT.lit);
}

function screwRod(ctx, top) {
  const x = PRESS_X + D.x * 60, y0 = ARM_Y + ARM_H + 14 + D.y * 60, y1 = top + D.y * 60 + 2;
  rodV(ctx, x, y0, y1, 20, MAT.lit);
  if (LOD.card) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 10, y0, 20, y1 - y0);
  ctx.clip();
  ctx.strokeStyle = 'rgba(6,10,8,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let y = y0 - 10 + ((top - RAM_TOP0) % 9 + 9) % 9; y < y1 + 10; y += 9) { ctx.moveTo(x - 10, y + 4); ctx.lineTo(x + 10, y - 4); }
  ctx.stroke();
  ctx.restore();
}

function ramBody(ctx) {
  // the ram drawn with its top at y 0: slide shoe on the column, body, maker's plate, platen
  prism(ctx, shiftPts(rect(PRESS_X + RAM_W - 4, 12, COL_X - PRESS_X - RAM_W + 12, 52), 22), 40, MAT.lit, { sil: 2.5 });
  prism(ctx, rect(PRESS_X - RAM_W, 0, 2 * RAM_W, RAM_H), 96, MAT.lit);
  ctx.save();
  ctx.fillStyle = '#050806';
  poly(ctx, [pr(PRESS_X - 52, 0, 34), pr(PRESS_X + 52, 0, 34), pr(PRESS_X + 52, 0, 46), pr(PRESS_X - 52, 0, 46)]);
  ctx.fill();
  if (!LOD.card) {
    ctx.fillStyle = '#1b231d';
    ctx.strokeStyle = '#4f6f57';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(PRESS_X - 46, 22, 92, 30);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5f8167';
    for (const [sx, sy] of [[-40, 28], [40, 28], [-40, 46], [40, 46]]) { ctx.beginPath(); ctx.arc(PRESS_X + sx, sy, 2.4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
  prism(ctx, rect(PRESS_X - 54, RAM_H, 108, PLATEN_H), 90, MAT.lit, { sil: 2.5 });
}

function ram(ctx, t, cs) {
  const top = ramTopAt(t);
  screwRod(ctx, top);
  if (cs) card(ctx, cs);
  ctx.save();
  ctx.translate(0, top);
  sprite(ctx, 'sc-ram', PRESS_X - RAM_W - 6, -36, COL_X - PRESS_X + RAM_W + 60, RAM_H + PLATEN_H + 44, ramBody);
  ctx.restore();
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
  ctx.strokeStyle = '#121915';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const x of [BIN_X0 + WALL, BIN_X1 - WALL]) { ctx.moveTo(x, FLOOR); ctx.lineTo(x + D.x * 100, FLOOR + D.y * 100); }
  ctx.stroke();
  // cut faces of the walls, hatched (a section through the bench)
  for (const x of [BIN_X0, BIN_X1 - WALL]) {
    ctx.fillStyle = '#141b16';
    ctx.beginPath();
    ctx.rect(x, FLOOR, WALL, H - FLOOR);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(x, FLOOR, WALL, H - FLOOR);
    hatchCut(ctx, x, FLOOR, x + WALL, H);
    ctx.strokeStyle = '#4f6f57';
    ctx.lineWidth = lw(2.5);
    ctx.strokeRect(x, FLOOR, WALL, H - FLOOR + 4);
  }
}

function hatchCut(ctx, x0, y0, x1, y1) {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  const h = y1 - y0, sp = 10 * (LOD.card ? 1.6 : 1);
  for (let d = x0 - h; d < x1; d += sp) { ctx.moveTo(d, y1); ctx.lineTo(d + h, y0); }
  ctx.stroke();
  ctx.restore();
}

// The tape lane's back rail and its guide rollers, behind the tape, from the left edge to the reader.
function laneRail(ctx) {
  const z = 34;
  const q0 = pr(-20, FLOOR - 16, z), q1 = pr(MOUTH - 4, FLOOR - 16, z);
  rodH(ctx, q0[0], q1[0], q0[1], 10, MAT.metal);
  for (const x of [150, 380, 560]) {
    const q = pr(x, 0, 22);
    contactShadow(ctx, q[0] + 6, FLOOR + D.y * 22 - 2, 16, 4, 0.45);
    rodV(ctx, q[0], 694 + D.y * 22, FLOOR + D.y * 22, 12, MAT.metal);
    ctx.save();
    ctx.fillStyle = MAT.metal.top;
    ctx.strokeStyle = MAT.metal.hi;
    ctx.lineWidth = lw(1.5);
    ctx.beginPath();
    ctx.ellipse(q[0], 694 + D.y * 22, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// The bench with no lamp of its own (the lamp moves; it is drawn per frame) and the chute.
function benchLayer(ctx) {
  benchFinal(ctx, -6000, 600);
  binWindow(ctx);
}

// Fixed machinery behind the tape lane and the press frame.
function fixturesLayer(ctx) {
  centreLine(ctx, PRESS_X, ARM_Y + 60, PRESS_X, AV - 6, 0.5);
  laneRail(ctx);
  readerFrame(ctx);
  ctx.save();
  ctx.translate(D.x * PZ, D.y * PZ);
  punchFrame(ctx);
  ctx.restore();
  pressFrame(ctx);
}

// The bench rule runs on across the chute's opening, in front of anything falling into it.
function chuteRule(ctx) {
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
}

// The stack of earlier scrap rows (k = 0, 1, ...) from RT0 down, dim.
function scrapStack(ctx) {
  for (let y = RT0; y < H + ROW_H + 4; y += ROW_H) scrapRow(ctx, y + ROW_H - 2, SCRAP_MAT);
}

// The lamp on the wall and the bench top, centred on the working station.
function lampPool(ctx, x) {
  let g = ctx.createRadialGradient(x, 600, 0, x, 600, 620);
  g.addColorStop(0, 'rgba(150,215,170,0.16)');
  g.addColorStop(0.5, 'rgba(150,215,170,0.05)');
  g.addColorStop(1, 'rgba(150,215,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(Math.max(0, x - 620), 0, 1240, BENCH_Y - 92);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BENCH_Y - 92, W, 92);
  ctx.clip();
  ctx.translate(x, FLOOR - 6);
  ctx.scale(1, 0.12);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 640);
  g.addColorStop(0, 'rgba(225,240,225,0.12)');
  g.addColorStop(1, 'rgba(225,240,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-640, -640, 1280, 1280);
  ctx.restore();
}

// One soft shadow under a straight run of tape on the bench.
function runShadow(ctx, x0, x1) {
  if (x1 <= x0) return;
  ctx.save();
  ctx.fillStyle = 'rgba(2,4,3,0.32)';
  ctx.beginPath();
  ctx.ellipse((x0 + x1) / 2 + 10, FLOOR - 3, (x1 - x0) / 2 + 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Sprite boxes.
const READ_HEAD_BOX = [HEAD_GLOW_X - 50, 500, PUNCH_X - HEAD_GLOW_X + 110, 200];
const READER_FRONT_BOX = [MOUTH - 40, 640, RD1 - MOUTH + 80, 150];
const PUNCH_HEAD_BOX = [PUNCH_X - 76, LINE - 36, 180, 60];

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
    cached(ctx, 'smart-compact-bench', benchLayer);
    const lx = lampX(t);
    lampPool(ctx, lx);
    cached(ctx, 'smart-compact-fixtures', fixturesLayer);

    const f = feedAt(t);
    const pe = press(t);
    const yd = platenY(t);
    const contact = t >= CONTACT;

    // Scrap rows in the chute: one row lands per loop, the floor indexes down one row in the seam.
    const landed = t >= LANDED;
    const sink = ROW_H * indexEase(seg(t, 7.45, 7.59));
    // once the floor has indexed a whole row the chute is drawn exactly as at t = 0
    const settled = t >= 7.59;
    ctx.save();
    ctx.beginPath();
    ctx.rect(BIN_X0 + WALL, FLOOR, BIN_X1 - BIN_X0 - 2 * WALL, H - FLOOR);
    ctx.clip();
    ctx.save();
    if (!settled) ctx.translate(0, sink);
    sprite(ctx, 'sc-scrap', BIN_X0, RT0 - 24, BIN_X1 - BIN_X0, H - RT0 + 60, scrapStack);
    if (landed && !settled) {
      const u = seg(t, LANDED, LANDED + 0.4);
      if (u < 1) scrapRow(ctx, RT0 - 2, mixMat(BLANK_MAT, SCRAP_MAT, easeInOut(u)));
      else sprite(ctx, 'sc-scrap-row', BIN_X0, RT0 - 50, BIN_X1 - BIN_X0, 56, (c) => scrapRow(c, RT0 - 2, SCRAP_MAT));
    }
    ctx.restore();
    const sg = ctx.createLinearGradient(0, RT0 - 30, 0, H);
    sg.addColorStop(0, 'rgba(4,6,5,0.2)');
    sg.addColorStop(0.45, 'rgba(4,6,5,0.72)');
    sg.addColorStop(1, 'rgba(4,6,5,0.94)');
    ctx.fillStyle = sg;
    ctx.fillRect(BIN_X0, RT0 - 30, BIN_X1 - BIN_X0, H - RT0 + 30);
    ctx.restore();

    // The flywheel turns as the ram travels.
    flywheel(ctx, ((ramTopAt(t) - RAM_TOP0) / (YD1 - YD0)) * Math.PI * 1.5);

    // The keep card while it is in the punch, then the punch head (the session's), which jolts
    // toward the card on each click.
    const punchAct = easeInOut(seg(t, 1.55, 1.8)) - easeInOut(seg(t, 3.4, 3.8));
    let jolt = 0;
    for (let r = 0; r < ROWS; r++) jolt += Math.sin(Math.PI * seg(t, CLICK(r), CLICK(r) + 0.07));
    const cs = cardState(t);
    const cardInPunch = cs && t < 3.4;
    if (cardInPunch) card(ctx, cs);
    ctx.save();
    ctx.translate(D.x * (PZ + 6 * jolt), D.y * (PZ + 6 * jolt));
    spriteAct(ctx, 'sc-phead', PUNCH_HEAD_BOX, punchAct, punchHead);
    ctx.restore();

    // The read head and its cable to the punch: the fork, brightening while it reads and writes.
    const readAct = Math.max(easeInOut(seg(t, 0.25, 0.5)) - easeInOut(seg(t, 2.0, 2.4)), punchAct * 0.6);
    spriteAct(ctx, 'sc-rhead', READ_HEAD_BOX, readAct, readHead);

    // The blank's contact shadow goes down before the tape, so it never darkens a section.
    const q = contact ? resultPose(t) : null;
    const bx0 = HEAD_X + f;
    if (q ? q.y >= FLOOR - 1 : bx0 + DB_W <= FOLD_X0) blankShadow(ctx, q ? q.x : bx0, q ? q.z : 0);

    // The tape and the stack. Sections run left of the blank: section i starts i lengths behind it.
    if (!contact) {
      let onStack = 0;
      const folding = [];
      const upright = [];
      for (let i = 1; i <= NSEC; i++) {
        const left = HEAD_X - i * L + f;
        const u = (left + L - FOLD_X0) / FOLD_D;
        if (u >= 1) onStack++;
        else if (u > 0) folding.push({ i, left, u });
        else upright.push({ i, left });
      }
      const ub = clamp01((bx0 + DB_W - FOLD_X0) / FOLD_DB);
      const k = yd > AV - PILE_H ? (AV - yd) / PILE_H : 1;
      if (ub >= 1) stack(ctx, onStack, k);
      else {
        // the old blank leads: it rises before it moves over, so it lands on the anvil, not into it
        const x = lerp(FOLD_X0 - DB_W, PRESS_X - DB_W / 2, easeInOut(seg(ub, 0.25, 1)));
        const yb = lerp(FLOOR, AV, easeOut(seg(ub, 0, 0.6))) - 10 * Math.sin(Math.PI * ub);
        if (ub > 0) denseBlank(ctx, x, yb);
      }
      // a section tips back about its bottom edge and lifts onto the stack
      for (const s of folding) {
        const j = s.i - 1;
        const x = lerp(FOLD_X0 - L, PILE_L, easeInOut(seg(s.u, 0.1, 1)));
        const yb = lerp(FLOOR, AV - DB_H - j * LAY, easeOut(seg(s.u, 0, 0.6))) - 14 * Math.sin(Math.PI * s.u);
        section(ctx, s.i, x, yb, (Math.PI / 2) * smooth(s.u));
      }
      // the sections and the blank still on the bench, one shadow under the run
      if (upright.length) runShadow(ctx, upright[upright.length - 1].left + 8, upright[0].left + L);
      for (const s of upright) section(ctx, s.i, s.left, FLOOR, 0);
      if (ub <= 0) denseBlank(ctx, bx0, FLOOR);
    } else {
      if (t < FALL_A + 0.0001) pressedBlock(ctx, t);
      else if (t < SETTLE_A) denseBlank(ctx, q.x, q.y, q.z);
      // offcuts falling into the chute (behind the blank as it steps forward)
      if (t >= FALL_A && !landed) {
        const u = seg(t, FALL_A, LANDED);
        const a = (Math.PI / 2) * easeInOut(u);
        const ug = u * u;
        offcut(ctx, -1, lerp(PILE_L - SHEAR_PX, LAND_L[0], u), lerp(AV, LAND_L[1], ug), -a);
        offcut(ctx, 1, lerp(PILE_L + L + SHEAR_PX, LAND_R[0], u), lerp(AV, LAND_R[1], ug), a);
      }
      if (t >= SEAM_A) {
        // seam: the session continues, new tape feeds in from the left behind the blank
        const g = -IN_D * (1 - trap(seg(t, SEAM_A, T), 0.25, 0.4));
        const xs = [];
        for (let i = 1; i <= NSEC; i++) { const left = HEAD_X - i * L + g; if (left + L > -10) xs.push({ i, left }); }
        if (xs.length) runShadow(ctx, xs[xs.length - 1].left + 8, xs[0].left + L);
        for (const s of xs) section(ctx, s.i, s.left, FLOOR, 0);
      }
      // back in the tape plane, the blank is drawn with the tape (behind the reader's guide)
      if (t >= SETTLE_A && q.z >= -16) denseBlank(ctx, q.x, q.y, q.z);
    }

    // Reader front parts: guides, front rollers (turning only while the tape feeds), yokes.
    sprite(ctx, 'sc-rfront', READER_FRONT_BOX[0], READER_FRONT_BOX[1], READER_FRONT_BOX[2], READER_FRONT_BOX[3], readerFront);
    const phi = (f / FEED) * 200 * ((Math.PI * 2) / 12);
    const speed = clamp01((feedAt(t + 0.02) - feedAt(t - 0.02)) / 0.04 / 640);
    rollerRibs(ctx, phi);
    { const s0 = pr(HEAD_GLOW_X - 14, 686, 4); ctx.fillStyle = mix('#1d3a27', P.bright, speed); ctx.fillRect(s0[0], s0[1], 28, 3); }
    if (speed > 0.01) lightShaft(ctx, HEAD_GLOW_X - 16, HEAD_GLOW_X + 16, 690, HEAD_GLOW_X - 30, HEAD_GLOW_X + 30, FLOOR - TH, 0.08 * speed);

    // Press screw and ram (in front of the stack), with the card once it has left the punch.
    ram(ctx, t, cs && !cardInPunch ? cs : null);

    // The new dense blank once it steps off the anvil: in front of the press, the punch and the reader.
    if (q && t >= SETTLE_A && q.z < -16) denseBlank(ctx, q.x, q.y, q.z);

    // The person's key: lit when it is the working station.
    let kp = 0;
    if (t < 0.45) kp = t < 0.14 ? easeInOut(t / 0.14) : t < 0.22 ? 1 : 1 - easeOut(seg(t, 0.22, 0.45));
    const keyAct = 1 - easeInOut(seg(t, 0.45, 0.9)) + easeInOut(seg(t, 7.5, T));
    key(ctx, kp, keyAct);

    sprite(ctx, 'sc-chute-rule', BIN_X0 - 4, BENCH_Y - 4, BIN_X1 - BIN_X0 + 8, 40, chuteRule);

    // Idle stations fall off into the dark around the lamp (the reel draws its own vignette).
    lampFalloff(ctx, lx, 620, 380, 1300, 0.52);

    // Light on top of the lamp falloff.
    { const [kx, ky] = pr(KEY_X + 6, FLOOR - 64, KEY_Z); contactGlow(ctx, kx, ky, (t - 0.14) / 0.12, 26); }
    if (speed > 0.01) softGlow(ctx, HEAD_GLOW_X, 690, 40, P.green, 0.25 * speed);
    // what the reader reads runs along the cable into the punch head
    for (let k = 0; k < 16; k++) {
      const p0 = k < 8 ? 0.6 + 0.17 * k : CLICK(k - 8) - 0.14;
      const u = (t - p0) / 0.14;
      if (u <= 0 || u >= 1) continue;
      const seglen = CABLE.length - 1, pos = u * seglen, si = Math.min(seglen - 1, Math.floor(pos)), fr = pos - si;
      const a = CABLE[si], b = CABLE[si + 1];
      softGlow(ctx, lerp(a[0], b[0], fr), lerp(a[1], b[1], fr), 16, P.bright, 0.55 * Math.sin(Math.PI * u));
    }
    for (let r = 0; r < ROWS; r++) {
      const u = (t - CLICK(r)) / 0.12;
      if (u > 0 && u < 1) softGlow(ctx, PUNCH_X + D.x * (PZ + CZ), LINE + D.y * (PZ + CZ), 46, P.bright, 0.32 * Math.sin(u * Math.PI));
    }
    contactGlow(ctx, PRESS_X, YD1 + 2, pe.c, 40);
    if (contact) {
      const tau = t - CONTACT;
      dust(ctx, PILE_L + 4, AV - 30, tau, 0x5c1, { ang: Math.PI * 1.1, spread: 1.2, n: 6, dur: 0.5 });
      dust(ctx, PILE_L + L - 4, AV - 30, tau, 0x5c2, { ang: -Math.PI * 0.1, spread: 1.2, n: 6, dur: 0.5 });
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};
