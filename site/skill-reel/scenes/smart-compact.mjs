// /smart-compact at final fidelity (pitch A 3.4, same beats as the animatic's
// scenes/smart-compact.js). A Claude Code mod, not a skill: kind 'mod'.
// One line across the bench, left to right: the person's key, the session tape (last compaction's
// dense blank at its head, then perforated sections), the reader, the card punch it drives (the
// reader and punch are one fork of the session, joined by their arm), and a C-frame die press over
// the scrap chute. The key starts it. The whole tape runs through the reader and fan-folds onto the
// press anvil while the reader passes what it reads along the arm to the punch. The punch writes a
// seven-row keep card, shows it still, and the card goes straight into the press head: no approval
// step. The press comes down, the folded tape becomes one dense blank, and the trimmed sides fall
// into the scrap chute (compaction is not lossless). The new blank steps off the anvil, runs along
// the front of the bench past the reader and settles in open bench left of it. In the seam it slides
// to the head of the bench and new tape comes out of the reader behind it. No meter anywhere.
// The lamp follows the working station: key, reader, punch, press, result.
// Pure function of t. No Math.random, no setTransform; static layers and part sprites are cached
// per device scale and drawn the same way every time.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, indexEase, setLod, lw, cached, grainOver, poly, prism, rect, hole,
  rodV, ball, contactShadow, contactGlow, softGlow, dust, centreLine, benchFinal, lightShaft,
  lampFalloff, activeMat, rng,
} from '../kit.mjs';

const T = 8.0;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const KEY_X = 150;
const HEAD_X = 300; // dense blank left edge at rest (head of the tape)
const DB_W = 56, DB_H = 84, DB_D = 66; // dense blank: front face and depth
const L = 104, TH = 66, NOTCH = 12, NSEC = 6; // tape section: length, height, corner notch, count
const MOUTH = 1000; // the reader's entry guide; new tape comes out from behind it in the seam
const RES_X = 700; // the new blank's rest, in open bench left of the reader
const FRONT_Z = -64; // depth of the front lane the new blank uses to pass the reader
const PRESS_X = 1560, PILE_L = PRESS_X - L / 2;
const FOLD_X0 = PILE_L - 40; // a section starts to fold once its right edge passes this
const FOLD_D = 240; // feed travelled while a section folds onto the pile (about 0.25 s)
const FOLD_DB = 200; // the same for the old blank
const FEED = FOLD_X0 + FOLD_DB - DB_W - HEAD_X;
const AV = 736; // anvil top
const LAY = 9; // one folded section on the pile
const PILE_H = NSEC * LAY + DB_H;
const RAM_W = 100, RAM_H = 76, PLATEN_H = 16, RAM_TOP0 = 470;
const YD0 = RAM_TOP0 + RAM_H + PLATEN_H; // platen face at rest
const YD1 = AV - DB_H; // platen face at contact
const K1 = DB_H / PILE_H; // pile compression at contact
const PRESS_T0 = 3.72, PRESS_A = (0.8 - 0.2) / 1.75;
const PRESS_TC = PRESS_T0 + PRESS_A;
const FALL = 0.45;
const OFF_W = (L - DB_W) / 2;
const COL_X = PRESS_X + 132, COL_Z = 30; // the C-frame's column, back right of the ram

// Card punch: stands behind the tape lane (PZ deep); the card stands in a plane CZ deep in it.
const PUNCH_X = 1320, PZ = 70, CAB_TOP = 600, CZ = 40;
const CW = 96, CH = 140, CCLIP = 18;
const ROWS = 7, COLS = 5, ROW_OFF = 28, ROW_P = 15;
const LINE = 540; // punch line, card-plane y
const CLICK = (r) => 2.0 + 0.1 * r;
const SHOW_LIFT = 24;

// Scrap chute below the bench, seen in section.
const BIN_X0 = PRESS_X - 140, BIN_X1 = PRESS_X + 140, WALL = 18;
const ROW_H = 26, RT0 = 884;
const LAND_L = [PRESS_X - 22, RT0 - 2], LAND_R = [PRESS_X + 22, RT0 - 2]; // pivot of each landed offcut

// Reader; its arm runs on to the punch cabinet.
const RD_X0 = 1000, RD_X1 = 1215, CAP_XS = [1040, 1192];
const ARM_X1 = PUNCH_X - 70 + D.x * PZ - 2; // the arm's back corner meets the punch cabinet
const HEAD_GLOW_X = 1120;

// Lamp stations.
const LAMP_KEY = 220, LAMP_READER = 1110, LAMP_PUNCH = PUNCH_X + D.x * PZ, LAMP_PRESS = PRESS_X;
const LAMP_RES = RES_X + DB_W / 2;

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

const feedAt = (t) => FEED * trap(seg(t, 0.4, 1.9), 0.12, 0.12);
const press = (t) => engage(t, PRESS_T0, PRESS_A);
const platenY = (t) => YD0 + (YD1 - YD0) * press(t).d;
const ramTopAt = (t) => platenY(t) - PLATEN_H - RAM_H;
const SETTLE_A = 4.55, SETTLE_B = 5.65, SEAM_A = 7.2;

// Where the lamp stands: on whichever station is working.
function lampX(t) {
  return LAMP_KEY
    + (LAMP_READER - LAMP_KEY) * easeInOut(seg(t, 0.3, 0.6))
    + (LAMP_PUNCH - LAMP_READER) * easeInOut(seg(t, 1.7, 2.0))
    + (LAMP_PRESS - LAMP_PUNCH) * easeInOut(seg(t, 3.3, 3.65))
    + (LAMP_RES - LAMP_PRESS) * easeInOut(seg(t, SETTLE_A, SETTLE_B))
    + (LAMP_KEY - LAMP_RES) * easeInOut(seg(t, SEAM_A, T));
}

// The new blank after the press: left edge x, base y and depth z.
function resultPose(t) {
  if (t < SETTLE_A) return { x: PRESS_X - DB_W / 2, y: AV, z: 0 };
  if (t < SEAM_A) {
    const u = seg(t, SETTLE_A, SETTLE_B);
    // step forward off the anvil, drop to the bench, run left along the front lane, step back in
    const zOut = easeInOut(seg(u, 0, 0.16)), zIn = easeInOut(seg(u, 0.82, 1));
    return {
      x: lerp(PRESS_X - DB_W / 2, RES_X, trap(seg(u, 0.1, 1), 0.3, 0.35)),
      y: lerp(AV, FLOOR, easeIn(seg(u, 0.1, 0.22))),
      z: FRONT_Z * (zOut - zIn),
    };
  }
  return { x: lerp(RES_X, HEAD_X, trap(seg(t, SEAM_A, T), 0.25, 0.4)), y: FLOOR, z: 0 };
}

// Card: centre x, top edge and plane depth, how many rows are punched, and where it is clipped.
function cardState(t) {
  if (t < 1.75 || t >= PRESS_TC) return null;
  let cx = PUNCH_X, top, clipY = CAB_TOP, z = PZ + CZ;
  const rows = CARD_PAT.reduce((n, _, r) => (t >= CLICK(r) + 0.05 ? r + 1 : n), 0);
  if (t < 2.0) top = lerp(CAB_TOP + 2, LINE - ROW_OFF, easeInOut(seg(t, 1.75, 2.0)));
  else if (t < 3.38) {
    top = LINE - ROW_OFF;
    for (let r = 1; r < ROWS; r++) {
      const m = CLICK(r - 1) + 0.03;
      top -= ROW_P * indexEase(seg(t, m, m + 0.09));
    }
    top -= SHOW_LIFT * easeOut(seg(t, 2.66, 2.78));
  } else if (t < PRESS_T0) {
    const u = seg(t, 3.38, PRESS_T0);
    const top0 = LINE - ROW_OFF - ROW_P * (ROWS - 1) - SHOW_LIFT;
    top = lerp(top0, RAM_TOP0 - CH, easeInOut(seg(u, 0, 0.55)));
    const e = easeInOut(seg(u, 0.12, 1));
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

// The pile on the anvil: layers 0..n-1, squashed by k.
function pileDirect(ctx, n, k) {
  for (let j = 0; j < n; j++) section(ctx, NSEC - j, PILE_L, AV - j * LAY * k, Math.PI / 2, LAY * k);
}
function pile(ctx, n, k) {
  if (n <= 0) return;
  if (k < 0.9999) { pileDirect(ctx, n, k); return; }
  sprite(ctx, 'sc-pile' + n, PILE_L - 4, AV - PILE_H - 30, L + 40, PILE_H + 36, (c) => pileDirect(c, n, 1));
}

// ---------------------------------------------------------------------------------------------
// Drawing: the dense blank and the offcuts.

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

// An offcut: one trimmed side of the pressed pile, pivoting on its outer bottom corner.
// side -1: left piece (pivot bottom-left), +1: right piece (pivot bottom-right).
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
  for (let m = 1; m <= 9; m++) {
    const y = m <= NSEC ? -m * LAY * K1 : -NSEC * LAY * K1 - (m - NSEC) * 14;
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
// Drawing: instruments.

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

function key(ctx, p, act) {
  const base = FLOOR - 24;
  const capB = base - 38 + 16 * p;
  rodV(ctx, KEY_X + 6, capB - 4, base - 12, 14, MAT.fresh);
  contactShadow(ctx, KEY_X + 18, base - 4, 120, 10, 0.25 + 0.2 * p);
  ctx.save();
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

function keyBase(ctx) {
  contactShadow(ctx, KEY_X + 20, FLOOR - 6, 120, 14, 0.55);
  prism(ctx, rect(KEY_X - 70, FLOOR - 24, 140, 24), 60, MAT.metal, { sil: 2.5 });
  if (!LOD.card) for (const dx of [-56, 56]) ball(ctx, KEY_X + dx, FLOOR - 12, 3.4, MAT.metal);
  // the stem's spring collar
  prism(ctx, rect(KEY_X - 9, FLOOR - 36, 30, 12), 30, MAT.fresh, { sil: 2.5 });
}

function readerBack(ctx, act) {
  const M = activeMat(MAT.session, act);
  // low bed behind the tape, and the column the arm hangs from
  prism(ctx, shiftPts(rect(RD_X0, 704, RD_X1 - RD_X0, FLOOR - 704), 60), 30, M, { hatch: true, sil: 3 });
  prism(ctx, shiftPts(rect(RD_X1 - 40, 594, 40, FLOOR - 594), 60), 30, M, { hatch: true, sil: 3.5 });
}
const READER_BACK_BOX = [RD_X0 + 10, 555, 280, 230];

function capstanStatic(ctx, x, M) {
  const xx = x + D.x * -12, y0 = 690 - D.y * 12, y1 = FLOOR - D.y * 12;
  contactShadow(ctx, xx + 6, y1 - 2, 22, 5, 0.5);
  rodV(ctx, xx, y0, y1, 22, M);
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

function capstanRibs(ctx, phi) {
  if (LOD.card) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(6,14,9,0.6)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const x of CAP_XS) {
    const xx = x + D.x * -12, y0 = 690 - D.y * 12, y1 = FLOOR - D.y * 12;
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

function readerFront(ctx, act) {
  const M = activeMat(MAT.session, act);
  // entry guide (the tape passes behind it)
  prism(ctx, shiftPts(rect(MOUTH - 10, 706, 20, FLOOR - 706), -14), 12, M, { sil: 2.5 });
  for (const x of CAP_XS) capstanStatic(ctx, x, M);
  // the arm: from the column over the tape and on to the punch cabinet (one fork, two tools)
  prism(ctx, rect(1066, 596, ARM_X1 - D.x * 60 - 1066, 24), 60, M, { hatch: true, sil: 3 });
  // the read head hanging from it
  prism(ctx, rect(1074, 620, 92, 60), 50, M, { hatch: true, sil: 3.5 });
  ctx.fillStyle = '#070b08';
  ctx.fillRect(1094, 662, 52, 12);
  if (!LOD.card) for (const x of [1084, 1156]) ball(ctx, x, 632, 3.2, M);
}
const READER_FRONT_BOX = [970, 560, 340, 230];

function punchBody(ctx, act) {
  const M = activeMat(MAT.session, act);
  contactShadow(ctx, PUNCH_X + 30, FLOOR - 6, 120, 16, 0.55);
  prism(ctx, rect(PUNCH_X - 70, CAB_TOP, 140, FLOOR - CAB_TOP), 90, M, { hatch: true, sil: 3.5 });
  ctx.save();
  ctx.fillStyle = '#050806';
  poly(ctx, [pr(PUNCH_X - 52, CAB_TOP, 34), pr(PUNCH_X + 52, CAB_TOP, 34), pr(PUNCH_X + 52, CAB_TOP, 46), pr(PUNCH_X - 52, CAB_TOP, 46)]);
  ctx.fill();
  // hand wheel on the cabinet front
  ctx.strokeStyle = M.sil;
  ctx.lineWidth = lw(3);
  ctx.beginPath();
  ctx.arc(PUNCH_X + 34, 690, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ball(ctx, PUNCH_X + 34, 690, 6, M);
  // the head frame the card is punched in
  for (const x of [PUNCH_X - 58, PUNCH_X + 66]) rodV(ctx, x, 532, CAB_TOP + 2, 9, M);
}
const PUNCH_BOX = [PUNCH_X - 96, 505, 256, 290];

function striker(ctx, act) {
  const M = activeMat(MAT.session, act);
  prism(ctx, rect(PUNCH_X - 66, 522, 142, 16), 22, M, { hatch: true, sil: 3 });
}
const STRIKER_BOX = [PUNCH_X - 72, 505, 170, 40];

function ramBody(ctx) {
  // the ram drawn with its top at y 0
  prism(ctx, rect(PRESS_X - RAM_W, 0, 2 * RAM_W, RAM_H), 96, MAT.lit);
  ctx.save();
  // card slot
  ctx.fillStyle = '#050806';
  poly(ctx, [pr(PRESS_X - 52, 0, 34), pr(PRESS_X + 52, 0, 34), pr(PRESS_X + 52, 0, 46), pr(PRESS_X - 52, 0, 46)]);
  ctx.fill();
  // blank maker's plate with four screws (no words)
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
  prism(ctx, rect(PRESS_X - 50, RAM_H, 100, PLATEN_H), 90, MAT.metal, { sil: 2.5 });
}

function ram(ctx, t, cs) {
  const top = ramTopAt(t);
  rodV(ctx, PRESS_X + D.x * 60, 306 + D.y * 60, top + D.y * 60 + 2, 20, MAT.lit);
  if (cs) card(ctx, cs);
  ctx.save();
  ctx.translate(0, top);
  sprite(ctx, 'sc-ram', PRESS_X - RAM_W - 6, -36, 2 * RAM_W + 56, RAM_H + PLATEN_H + 44, ramBody);
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

// The bench with no lamp of its own (the lamp moves; it is drawn per frame) and the chute.
function benchLayer(ctx) {
  benchFinal(ctx, -6000, 600);
  binWindow(ctx);
}

// Fixed instruments: key base, reader shadow, the C-frame press and its anvil.
function fixturesLayer(ctx) {
  centreLine(ctx, PRESS_X, 318, PRESS_X, AV - 6, 0.5);
  centreLine(ctx, PUNCH_X + D.x * (PZ + CZ), 330, PUNCH_X + D.x * (PZ + CZ), CAB_TOP - 30, 0.4);
  keyBase(ctx);
  contactShadow(ctx, 1120, FLOOR - 10, 150, 16, 0.5);
  // C-frame: column at the back right, the head arm over the ram, open on the card's side
  const [cx, cy] = pr(COL_X, FLOOR, COL_Z);
  contactShadow(ctx, cx + 40, cy - 2, 80, 12, 0.6);
  prism(ctx, shiftPts(rect(COL_X, 262, 52, FLOOR - 262), COL_Z), 80, MAT.lit);
  prism(ctx, shiftPts(rect(COL_X - 18, FLOOR - 18, 88, 18), COL_Z - 10), 96, MAT.lit, { sil: 2.5 });
  prism(ctx, shiftPts(rect(PRESS_X - 118, 262, COL_X + 52 - PRESS_X + 118, 44), COL_Z), 80, MAT.lit);
  if (!LOD.card) for (let x = PRESS_X - 96; x <= COL_X + 30; x += 64) ball(ctx, x + D.x * COL_Z, 284 + D.y * COL_Z, 3.4, MAT.lit);
  // guide boss under the head where the screw leaves it
  prism(ctx, rect(PRESS_X - 16 + D.x * 44, 306 + D.y * 44, 32, 12), 30, MAT.lit, { sil: 2 });
  contactShadow(ctx, PRESS_X + 22, FLOOR - 8, 70, 12, 0.6);
  prism(ctx, rect(PRESS_X - 32, AV, 64, FLOOR - AV), 92, MAT.lit);
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
    const contact = t >= pe.t1;

    // Scrap rows in the chute: one row lands per loop, the floor indexes down one row in the seam.
    const landed = t >= pe.t1 + FALL;
    const sink = ROW_H * indexEase(seg(t, 7.45, 7.59));
    ctx.save();
    ctx.beginPath();
    ctx.rect(BIN_X0 + WALL, FLOOR, BIN_X1 - BIN_X0 - 2 * WALL, H - FLOOR);
    ctx.clip();
    // once the floor has indexed a whole row the chute is drawn exactly as at t = 0
    const settled = t >= 7.59;
    ctx.save();
    if (!settled) ctx.translate(0, sink);
    sprite(ctx, 'sc-scrap', BIN_X0, RT0 - 24, BIN_X1 - BIN_X0, H - RT0 + 60, scrapStack);
    if (landed && !settled) {
      const u = seg(t, pe.t1 + FALL, pe.t1 + FALL + 0.3);
      if (u < 1) scrapRow(ctx, RT0 - 2, mixMat(BLANK_MAT, SCRAP_MAT, easeOut(u)));
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

    // The punch (behind the tape lane) and the keep card.
    const punchAct = easeInOut(seg(t, 1.55, 1.8)) - easeInOut(seg(t, 3.4, 3.8));
    let jolt = 0;
    for (let r = 0; r < ROWS; r++) jolt += 3 * Math.sin(Math.PI * seg(t, CLICK(r), CLICK(r) + 0.07));
    ctx.save();
    ctx.translate(D.x * PZ, D.y * PZ);
    spriteAct(ctx, 'sc-punch', PUNCH_BOX, punchAct, punchBody);
    ctx.restore();
    // while it is in the punch the card stands behind the striker; once it leaves for the press it
    // travels in front of the press screw and drops into the ram's slot
    const cs = cardState(t);
    const cardInPunch = cs && t < 3.38;
    if (cardInPunch) card(ctx, cs);
    ctx.save();
    ctx.translate(D.x * PZ, D.y * PZ + jolt);
    spriteAct(ctx, 'sc-striker', STRIKER_BOX, punchAct, striker);
    ctx.restore();

    // Reader backplate (the fork), brightening while it reads.
    const readAct = easeInOut(seg(t, 0.25, 0.5)) - easeInOut(seg(t, 1.9, 2.3));
    spriteAct(ctx, 'sc-rback', READER_BACK_BOX, readAct, readerBack);

    // The blank's contact shadow goes down before the tape, so it never darkens a section.
    const q = contact ? resultPose(t) : null;
    const bx0 = HEAD_X + f;
    if (q ? q.y >= FLOOR - 1 : bx0 + DB_W <= FOLD_X0) blankShadow(ctx, q ? q.x : bx0, q ? q.z : 0);

    // The tape, the pile and the old blank.
    if (!contact) {
      let onPile = 0;
      const folding = [];
      const upright = [];
      for (let i = 1; i <= NSEC; i++) {
        const left = HEAD_X + DB_W + (i - 1) * L + f;
        const u = (left + L - FOLD_X0) / FOLD_D;
        if (u >= 1) onPile++;
        else if (u > 0) folding.push({ i, left, u });
        else upright.push({ i, left });
      }
      const k = yd > AV - PILE_H ? (AV - yd) / PILE_H : 1;
      pile(ctx, onPile, k);
      // a section tips back about its bottom edge and lifts onto the pile; it rises before it
      // moves over, so it never cuts into the pile's side
      for (const s of folding) {
        const j = NSEC - s.i;
        const x = lerp(FOLD_X0 - L, PILE_L, easeInOut(seg(s.u, 0.1, 1)));
        const yb = lerp(FLOOR, AV - j * LAY, easeOut(seg(s.u, 0, 0.6))) - 14 * Math.sin(Math.PI * s.u);
        section(ctx, s.i, x, yb, (Math.PI / 2) * smooth(s.u));
      }
      // the sections still on the bench, one shadow under the run
      const bx = HEAD_X + f;
      if (upright.length) runShadow(ctx, upright[0].left + 8, upright[upright.length - 1].left + L);
      for (let n = upright.length - 1; n >= 0; n--) section(ctx, upright[n].i, upright[n].left, FLOOR, 0);
      // the old blank: along the bench, then lifted onto the pile, then squashed by the ram
      const ub = clamp01((bx + DB_W - FOLD_X0) / FOLD_DB);
      if (ub <= 0) denseBlank(ctx, bx, FLOOR);
      else {
        const yTop = AV - NSEC * LAY * k;
        const spread = clamp01((1 - k) / (1 - K1));
        const w = DB_W + (L - DB_W) * spread;
        const x = lerp(FOLD_X0 - DB_W, PRESS_X - DB_W / 2, easeInOut(seg(ub, 0.25, 1))) - (w - DB_W) / 2;
        const yb = lerp(FLOOR, yTop, easeOut(seg(ub, 0, 0.6))) - 12 * Math.sin(Math.PI * ub);
        if (ub >= 1 && k < 0.9999) denseBlankBody(ctx, x, yb, w, DB_H * k);
        else denseBlank(ctx, x, yb);
      }
    } else if (t >= SEAM_A) {
      // seam: new tape comes out of the reader behind the blank as it slides to the head
      const e = trap(seg(t, SEAM_A, T), 0.25, 0.4);
      const front = lerp(MOUTH, HEAD_X + DB_W, e);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, MOUTH, H);
      ctx.clip();
      runShadow(ctx, front + 8, Math.min(front + NSEC * L, MOUTH));
      for (let i = NSEC; i >= 1; i--) {
        const left = front + (i - 1) * L;
        if (left < MOUTH) section(ctx, i, left, FLOOR, 0);
      }
      ctx.restore();
    }

    // Reader front parts: guide, capstans, arm, head. Capstans turn only while the tape feeds.
    spriteAct(ctx, 'sc-rfront', READER_FRONT_BOX, readAct, readerFront);
    const phi = (f / FEED) * 200 * ((Math.PI * 2) / 12);
    const speed = clamp01((feedAt(t + 0.02) - feedAt(t - 0.02)) / 0.04 / 640);
    capstanRibs(ctx, phi);
    ctx.fillStyle = mix('#1d3a27', P.bright, speed);
    ctx.fillRect(1098, 666, 44, 4);
    if (speed > 0.01) lightShaft(ctx, 1100, 1140, 680, 1088, 1152, FLOOR - TH, 0.08 * speed);

    // Press ram (in front of the pile).
    ram(ctx, t, cs && !cardInPunch ? cs : null);

    // The new dense blank: under the press, then along the front lane to its rest, then (seam)
    // to the head.
    if (q) denseBlank(ctx, q.x, q.y, q.z);

    // Offcuts falling into the chute.
    if (contact && !landed) {
      const u = seg(t, pe.t1, pe.t1 + FALL);
      const a = (Math.PI / 2) * easeInOut(u);
      const ug = u * u;
      offcut(ctx, -1, lerp(PILE_L, LAND_L[0], u), lerp(AV, LAND_L[1], ug), -a);
      offcut(ctx, 1, lerp(PILE_L + L, LAND_R[0], u), lerp(AV, LAND_R[1], ug), a);
    }

    // The person's key: lit when it is the working station.
    let kp = 0;
    if (t < 0.45) kp = t < 0.14 ? easeInOut(t / 0.14) : t < 0.22 ? 1 : 1 - easeOut(seg(t, 0.22, 0.45));
    const keyAct = 1 - easeInOut(seg(t, 0.45, 0.9)) + easeInOut(seg(t, 7.5, T));
    key(ctx, kp, keyAct);

    sprite(ctx, 'sc-chute-rule', BIN_X0 - 4, BENCH_Y - 4, BIN_X1 - BIN_X0 + 8, 40, chuteRule);

    // Idle stations fall off into the dark around the lamp (the reel draws its own vignette).
    lampFalloff(ctx, lx, 620, 380, 1300, 0.52);

    // Light on top of the lamp falloff.
    contactGlow(ctx, KEY_X + 6, FLOOR - 64, (t - 0.14) / 0.12, 26);
    if (speed > 0.01) softGlow(ctx, HEAD_GLOW_X, 668, 40, P.green, 0.25 * speed);
    // what the reader reads runs along the arm into the punch
    const ax0 = 1150, ax1 = ARM_X1 - 6, ay = 608 + D.y * 30;
    for (let k = 0; k < 16; k++) {
      const p0 = k < 8 ? 0.62 + 0.16 * k : CLICK(k - 8) - 0.12;
      const u = (t - p0) / 0.14;
      if (u <= 0 || u >= 1) continue;
      softGlow(ctx, lerp(ax0, ax1, u) + D.x * 30, ay, 16, P.bright, 0.55 * Math.sin(Math.PI * u));
    }
    for (let r = 0; r < ROWS; r++) {
      const u = (t - CLICK(r)) / 0.12;
      if (u > 0 && u < 1) softGlow(ctx, PUNCH_X + 9 + D.x * (PZ + CZ), 530 + D.y * (PZ + CZ), 46, P.bright, 0.32 * Math.sin(u * Math.PI));
    }
    contactGlow(ctx, PRESS_X, YD1 + 2, pe.c, 40);
    if (contact) {
      const tau = t - pe.t1;
      dust(ctx, PILE_L + 4, AV - 30, tau, 0x5c1, { ang: Math.PI * 1.1, spread: 1.2, n: 6, dur: 0.5 });
      dust(ctx, PILE_L + L - 4, AV - 30, tau, 0x5c2, { ang: -Math.PI * 0.1, spread: 1.2, n: 6, dur: 0.5 });
    }

    grainOver(ctx, 0.3, 'soft-light');
  },
};

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
