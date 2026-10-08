// /merge at final fidelity (pitch A 3.1, BRIEF grafts 1 to 5, BUILD per-scene decisions).
// A transfer line. The person's key /merge is latched down for the whole loop. A PR (a stack of
// ivory commit sheets) feeds to the review station. Round 1: a fresh steel gang head (Codex: several
// fresh sub-reviewers, each a different tip) drops from the Codex housing and ripples its tips across
// the stack; each finding hangs an amber tag on the rail beside the stack at the height of its sheet.
// Codex never marks the work. Claude's hatched green arm (the session) reads each tag: one tag drops
// off on its own (refuted), the arm fixes the sheet at the other two and they clear, then the arm
// lays the fix sheet on the stack. Rerun: one fresh steel tip swings in, touches the new head, and
// the rail stays empty. The stack feeds to the press, squashes into one sheet and settles into the
// main tray. Hold. Seam: the tray indexes down one sheet while the next PR feeds in. No CI anywhere.
// Reel-only opener (5.5 s): a PR arrives and the single Codex tip reviews it with no key pressed;
// then the gang head lowers, the shared Latest Sol plate shows, and the /merge key presses and
// latches. The opener ends on the loop's t = 0 pose.
// Pure function of t. No Math.random, no setTransform; static layers cached per device scale.

import {
  W, H, BENCH_Y, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn, easeInOut,
  mix, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect,
  rodV, rodH, ball, discPts, contactShadow, contactGlow, softGlow, dust, centreLine,
  benchFinal, lightShaft, activeMat, hatchPath,
} from '../kit.mjs';

const T = 10.0;
const OPENER = 5.5;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const LINE_Y = FLOOR - 30; // conveyor top: the bottom sheet's front edge
const SW = 230, SDEP = 110, CLIP = 26; // sheet width, depth, clipped corner
const SH = 44; // one commit sheet
const SQ = 60; // the squashed sheet
const JIT = [0, 5, -4, 3]; // sheets in a stack sit a little off each other: separate commits
const X_ENTRY = 470, X_REVIEW = 760, X_PRESS = 1470, X_TRAY = 1780;
const KEY_X = 165;
const BEAM_Y0 = 228, BEAM_Y1 = 258;
const HOUSE = { x0: 510, x1: 890, y0: BEAM_Y1, y1: 312 };

const ZM = 55; // mid-depth of a sheet's top face
const topPt = (cx, n) => [cx + D.x * ZM, LINE_Y - n * SH + D.y * ZM];
const sheetMid = (k) => LINE_Y - k * SH - SH / 2;

// Rerun / automatic review tip: one steel swing arm pivoted under the housing. Same radius reaches
// the entry stack (opener) and the four-sheet review stack (rerun).
const PIV_Y = 334;
const PA = topPt(X_ENTRY, 3), PB = topPt(X_REVIEW, 4);
const PIV_X = ((PB[0] ** 2 - PA[0] ** 2) + (PIV_Y - PB[1]) ** 2 - (PIV_Y - PA[1]) ** 2) / (2 * (PB[0] - PA[0]));
const PEND_L = Math.hypot(PA[0] - PIV_X, PA[1] - PIV_Y);
const TH_A = Math.atan2(PA[1] - PIV_Y, PA[0] - PIV_X);
const TH_B = Math.atan2(PB[1] - PIV_Y, PB[0] - PIV_X);
const TH_STOW_R = -0.2, TH_STOW_L = Math.PI + 0.2; // tucked up under the housing, clipped from view

// Round 1 gang head: one bar, six different tips.
const GANG_CX = X_REVIEW + D.x * ZM, GANG_W = 300, BAR_H = 38;
const N_TIPS = 6;
const TIP_X = (i) => GANG_CX - 2.5 * 40 + 40 * i;
const HOVER = 22;
const TIP_REACH = BAR_H + 22 + 30 + 26;
const BAR_Y = topPt(X_REVIEW, 3)[1] - HOVER - TIP_REACH;
const GANG_LIFT = 560;

// Tag rail: a post set a little back on the bench, a peg at every sheet height.
const RAIL_DZ = 36;
const POST_X = 1012 + D.x * RAIL_DZ, PEG_X = 980 + D.x * RAIL_DZ;
const pegY = (k) => sheetMid(k) - 16 + D.y * RAIL_DZ;

// Claude's arm (the session): column behind the line, two links, jaws pointing left.
const SHOULDER = [1240, 440];
const L1 = 222, L2 = 222, JAW = 46;
const ARM_REST = [1110, 560];
const READ_X = PEG_X + 22 + JAW; // jaw tip on the tag's right edge
const FIX_X = X_REVIEW + SW / 2 + 4 + JAW;
const GRIP = 14;
const LAY_X = X_REVIEW + JIT[3] + SW / 2 - GRIP + JAW;
const LAY_Y = LINE_Y - 3 * SH - SH / 2;

// Press.
const PRESS_L = 1335, PRESS_R = 1605, CROSS_Y = 318, PLATEN_REST = 512, PLATEN_H = 36, PLATEN_W = 236;

// Main tray: a bin sunk into the bench, shown in section.
const TRAY_X0 = X_TRAY - SW / 2 - 20, TRAY_X1 = X_TRAY + SW / 2 + 20, TRAY_WALL = 14, TRAY_BOT = 1046;

// ---------------------------------------------------------------------------------------------
// Materials local to this scene. Steel = Codex (merge only).

const STEEL = { front: ['#6a6f67', '#353933'], top: '#b4b8ad', side: '#22261f', sil: '#b2b5ab', hi: '#f1f3ea', line: '#4b5049' };
const STEEL_DARK = { ...STEEL, front: ['#4b504a', '#2a2e29'], top: '#868b81' };
const TAG = { front: ['#f6d9a0', '#cfa65c'], top: '#fde9bd', side: '#8f7136', sil: '#efc87e', hi: '#fff3d6', line: '#a8843f' };
const DEAD = { front: ['#4b5c4f', '#2c3a2f'], top: '#5d7363', side: '#1a231c', sil: '#3e5a45', hi: '#55705c', line: '#33443a' };
const mixMat = (a, b, u) => ({
  front: [mix(a.front[0], b.front[0], u), mix(a.front[1], b.front[1], u)],
  top: mix(a.top, b.top, u), side: mix(a.side, b.side, u), sil: mix(a.sil, b.sil, u), hi: mix(a.hi, b.hi, u), line: mix(a.line, b.line, u),
});

// ---------------------------------------------------------------------------------------------
// Helpers.

function track(t, keys) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      const u = easeInOut(seg(t, a[0], b[0]));
      return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    }
  }
  const k = keys[keys.length - 1];
  return [k[1], k[2]];
}

function link(ctx, ax, ay, bx, by, w, depth, mat, o = {}) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const nx = (-dy / L) * (w / 2), ny = (dx / L) * (w / 2);
  prism(ctx, [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], depth, mat, o);
}

function ik(wx, wy) {
  const [sx, sy] = SHOULDER;
  let dx = wx - sx, dy = wy - sy;
  let d = Math.hypot(dx, dy);
  const dmax = L1 + L2 - 0.5;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  const phi = Math.atan2(dy, dx);
  const a = Math.acos(clamp01((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const e1 = [sx + L1 * Math.cos(phi - a), sy + L1 * Math.sin(phi - a)];
  const e2 = [sx + L1 * Math.cos(phi + a), sy + L1 * Math.sin(phi + a)];
  return e1[1] < e2[1] ? e1 : e2;
}

// Maker's plate (opener only): engraved Departure Mono on a dark steel plate with four screws.
function makerPlate(ctx, text, x, y, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = '400 22px "Departure Mono", "Departure Mono fallback", monospace';
  const w = Math.ceil(ctx.measureText(text).width) + 46, h = 38;
  const x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  ctx.fillStyle = 'rgba(2,4,3,0.6)';
  ctx.fillRect(x0 + 3, y0 + 5, w, h);
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, '#30352f');
  g.addColorStop(1, '#191c18');
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = STEEL.sil;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
  ctx.fillStyle = 'rgba(241,243,234,0.35)';
  ctx.fillRect(x0 + 2, y0 + 2, w - 4, 1.5);
  ctx.fillStyle = '#868b81';
  for (const [sx, sy] of [[x0 + 8, y0 + 8], [x0 + w - 8, y0 + 8], [x0 + 8, y0 + h - 8], [x0 + w - 8, y0 + h - 8]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#060806';
  ctx.fillText(text, x + 1, y + 2.5);
  ctx.fillStyle = '#dfe2d8';
  ctx.fillText(text, x, y + 1.5);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The work: ivory sheets as plates in the oblique view. Clipped corner at the back right of the
// top face, a registration hole through it.

function sheet(ctx, cx, yb, th, o = {}) {
  const { alpha = 1, s = 1, top = true, seam = true, shade = 0 } = o;
  if (alpha <= 0) return;
  const w = SW * s, dep = SDEP * s, c = CLIP * s;
  const x0 = cx - w / 2, x1 = cx + w / 2, yt = yb - th;
  const dx = D.x * dep, dy = D.y * dep, dxc = D.x * (dep - c), dyc = D.y * (dep - c);
  ctx.save();
  ctx.globalAlpha *= alpha;
  poly(ctx, [[x1, yt], [x1 + dxc, yt + dyc], [x1 + dxc, yb + dyc], [x1, yb]]);
  ctx.fillStyle = MAT.ivory.side;
  ctx.fill();
  if (top) {
    poly(ctx, [[x0, yt], [x1, yt], [x1 + dxc, yt + dyc], [x1 - c + dx, yt + dy], [x0 + dx, yt + dy]]);
    const g = ctx.createLinearGradient(0, yt + dy, 0, yt);
    g.addColorStop(0, '#e6e7da');
    g.addColorStop(1, MAT.ivory.top);
    ctx.fillStyle = g;
    ctx.fill();
    // the clipped corner's cut edge catches the light
    ctx.strokeStyle = 'rgba(255,255,250,0.9)';
    ctx.lineWidth = lw(1.5);
    ctx.beginPath();
    ctx.moveTo(x1 + dxc, yt + dyc);
    ctx.lineTo(x1 - c + dx, yt + dy);
    ctx.stroke();
    const hx = x0 + 36 * s + D.x * dep * 0.5, hy = yt + D.y * dep * 0.5;
    poly(ctx, discPts(hx, hy, 9.5 * s, 20));
    ctx.fillStyle = '#8f9086';
    ctx.fill();
    poly(ctx, discPts(hx + 1.5, hy + 1.2, 7 * s, 16));
    ctx.fillStyle = '#62645c';
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, yt, 0, yb);
  g.addColorStop(0, MAT.ivory.front[0]);
  g.addColorStop(1, MAT.ivory.front[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x0, yt, w, th);
  ctx.fillStyle = 'rgba(255,255,250,0.95)';
  ctx.fillRect(x0, yt, w, lw(1.6));
  if (seam) {
    ctx.fillStyle = 'rgba(62,66,57,0.6)';
    ctx.fillRect(x0, yb - lw(1.8), w, lw(1.8));
  }
  if (shade > 0) {
    ctx.fillStyle = `rgba(4,6,5,${shade})`;
    ctx.fillRect(x0, yt, w, th);
  }
  ctx.restore();
}

function stack(ctx, cx, n, o = {}) {
  for (let k = 0; k < n; k++) sheet(ctx, cx + JIT[k], LINE_Y - k * SH, SH, { alpha: o.alpha, s: o.s });
}

// ---------------------------------------------------------------------------------------------
// Instruments.

// Six distinct tips: each fresh sub-reviewer is a different instrument. (x, y0) = top of the tip.
function tipShape(ctx, i, x, y0) {
  const L = 26;
  const fillSil = (pts) => {
    poly(ctx, pts);
    const g = ctx.createLinearGradient(x - 11, 0, x + 11, 0);
    g.addColorStop(0, STEEL.top);
    g.addColorStop(0.55, STEEL.front[0]);
    g.addColorStop(1, STEEL.side);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = STEEL.sil;
    ctx.lineWidth = lw(2.2);
    ctx.lineJoin = 'round';
    ctx.stroke();
  };
  if (i === 0) fillSil([[x - 10, y0], [x + 10, y0], [x, y0 + L]]);
  else if (i === 1) { fillSil([[x - 3, y0], [x + 3, y0], [x + 3, y0 + L - 14], [x - 3, y0 + L - 14]]); ball(ctx, x, y0 + L - 8, 8, STEEL); }
  else if (i === 2) fillSil([[x - 12, y0], [x + 12, y0], [x + 7, y0 + L], [x - 7, y0 + L]]);
  else if (i === 3) fillSil([[x - 4, y0], [x + 4, y0], [x + 1, y0 + L], [x - 1, y0 + L]]);
  else if (i === 4) fillSil([[x - 10, y0], [x + 10, y0], [x + 10, y0 + L], [x + 4, y0 + L], [x + 4, y0 + 10], [x - 4, y0 + 10], [x - 4, y0 + L], [x - 10, y0 + L]]);
  else fillSil([[x - 9, y0], [x + 9, y0], [x + 9, y0 + L], [x - 9, y0 + L]]);
}

function gangHead(ctx, yOff, ext) {
  const by = BAR_Y + yOff;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOUSE.y1 - 4, W, H);
  ctx.clip();
  rodV(ctx, GANG_CX + D.x * 22, HOUSE.y1 - 10, by + 4, 20, STEEL);
  rodV(ctx, GANG_CX + D.x * 22, by - 64, by + 4, 30, STEEL_DARK);
  for (let i = 0; i < N_TIPS; i++) {
    const x = TIP_X(i), e = ext ? ext[i] : 0;
    const hy = by + BAR_H;
    prism(ctx, rect(x - 11, hy - 2, 22, 24), 18, STEEL_DARK, { sil: 2.4 });
    const sy1 = hy + 22 + 30 + e;
    rodV(ctx, x, hy + 20, sy1, 8, STEEL);
    tipShape(ctx, i, x, sy1);
  }
  prism(ctx, rect(GANG_CX - GANG_W / 2, by, GANG_W, BAR_H), 46, STEEL, { sil: 3.5 });
  ctx.fillStyle = '#1b1e1a';
  for (let i = 0; i < N_TIPS; i++) {
    ctx.beginPath();
    ctx.arc(TIP_X(i), by + BAR_H / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function swingArm(ctx, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const tx = PIV_X + PEND_L * c, ty = PIV_Y + PEND_L * s;
  const bx = tx - 36 * c, by = ty - 36 * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOUSE.y1 + 6, W, H);
  ctx.clip();
  link(ctx, PIV_X, PIV_Y, bx, by, 15, 14, STEEL, { sil: 3 });
  link(ctx, bx - 12 * c, by - 12 * s, bx + 4 * c, by + 4 * s, 24, 18, STEEL_DARK, { sil: 2.5 });
  const nx = -s, ny = c;
  poly(ctx, [[bx + nx * 10, by + ny * 10], [tx, ty], [bx - nx * 10, by - ny * 10]]);
  const g = ctx.createLinearGradient(bx + nx * 10, by + ny * 10, bx - nx * 10, by - ny * 10);
  g.addColorStop(0, STEEL.top);
  g.addColorStop(1, STEEL.side);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = STEEL.sil;
  ctx.lineWidth = lw(2.4);
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
  return [tx, ty];
}

function housing(ctx) {
  // the Codex housing: both Codex tools come out of it
  prism(ctx, rect(HOUSE.x0, HOUSE.y0, HOUSE.x1 - HOUSE.x0, HOUSE.y1 - HOUSE.y0), 44, STEEL, { sil: 3.5 });
  ctx.fillStyle = '#121512';
  ctx.fillRect(GANG_CX - 24, HOUSE.y1 - 5, 58, 5);
  // clevis for the swing arm under the housing
  poly(ctx, [[PIV_X - 26, HOUSE.y1], [PIV_X + 26, HOUSE.y1], [PIV_X + 12, PIV_Y + 12], [PIV_X - 12, PIV_Y + 12]]);
  prism(ctx, [[PIV_X - 26, HOUSE.y1], [PIV_X + 26, HOUSE.y1], [PIV_X + 13, PIV_Y + 13], [PIV_X - 13, PIV_Y + 13]], 30, STEEL_DARK, { sil: 2.6 });
  ctx.fillStyle = '#121512';
  ctx.fillRect(PIV_X - 4, PIV_Y - 10, 8, 24); // the slot the arm swings in
  ball(ctx, PIV_X, PIV_Y, 5.5, STEEL);
  if (!LOD.card) {
    ctx.fillStyle = '#868b81';
    for (const x of [HOUSE.x0 + 14, HOUSE.x1 - 14]) {
      for (const y of [HOUSE.y0 + 13, HOUSE.y1 - 13]) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

// A finding: an amber tag hanging from a peg. ang swings it; deadU turns it into a refuted dim tag.
function tagShape(ctx, px, py, ang, alpha, deadU, readU) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(px, py);
  ctx.rotate(ang);
  const m = deadU > 0 ? mixMat(TAG, DEAD, deadU) : TAG;
  ctx.strokeStyle = mix('#e1cc9c', '#55705c', deadU);
  ctx.lineWidth = lw(2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.lineTo(-6, 9);
  ctx.moveTo(1, 0);
  ctx.lineTo(6, 9);
  ctx.stroke();
  const w = 40, h = 32, c = 9, y0 = 8;
  const pts = [[-w / 2 + c, y0], [w / 2 - c, y0], [w / 2, y0 + c], [w / 2, y0 + h], [-w / 2, y0 + h], [-w / 2, y0 + c]];
  prism(ctx, pts, 6, m, { sil: 2.4, front: readU > 0 ? mix('#f6d9a0', '#fff6e2', readU) : undefined });
  ctx.fillStyle = '#141914';
  ctx.beginPath();
  ctx.arc(0, y0 + 8, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function armDraw(ctx, wrist, active, jawOpen) {
  const SM = activeMat(MAT.session, active);
  const [sx, sy] = SHOULDER;
  const e = ik(wrist[0], wrist[1]);
  const [wx, wy] = wrist;
  link(ctx, sx, sy, e[0], e[1], 32, 26, SM, { hatch: true, sil: 3.2 });
  link(ctx, e[0], e[1], wx + 8, wy, 26, 22, SM, { hatch: true, sil: 3 });
  ball(ctx, e[0], e[1], 11, SM);
  const o = 5 + jawOpen * 6;
  const J = activeMat(MAT.lit, active, '#34453a');
  prism(ctx, [[wx - JAW, wy - o - 5], [wx - 10, wy - o - 8], [wx - 10, wy - o], [wx - JAW + 3, wy - o]], 18, J, { sil: 2.2 });
  prism(ctx, [[wx - JAW + 3, wy + o], [wx - 10, wy + o], [wx - 10, wy + o + 8], [wx - JAW, wy + o + 5]], 18, J, { sil: 2.2 });
  prism(ctx, rect(wx - 14, wy - 21, 40, 42), 30, SM, { hatch: true, sil: 3.2, hatchGap: 10 });
  ball(ctx, wx + 6, wy, 6.5, SM);
  ball(ctx, sx, sy, 15, SM);
}

// The person's key: an ivory cap in a dark bezel on a green stem that rides in a guide sleeve,
// /merge in Fraunces Italic. press pushes it down; latch swings the pawl onto the cap's shoulder.
const CAP_W = 160, CAP_H = 56, CAP_UP = FLOOR - 88, KEY_TRAVEL = 24, SLEEVE_TOP = FLOOR - 60;
function roundRectPts(x0, y0, x1, y1, r, inset = 0) {
  const pts = [];
  const corners = [[x1 - r - inset, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r + inset, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 4; k++) { const a = a0 + (k / 4) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
function keyDraw(ctx, press, latch) {
  const dy = press * KEY_TRAVEL;
  const cb = CAP_UP + dy, ct = cb - CAP_H;
  const x0 = KEY_X - CAP_W / 2, x1 = KEY_X + CAP_W / 2;
  // stem out of the guide sleeve
  rodV(ctx, KEY_X + D.x * 22, cb - 8, SLEEVE_TOP + 4, 22, MAT.fresh);
  prism(ctx, rect(KEY_X - 26, SLEEVE_TOP, 52, FLOOR - 40 - SLEEVE_TOP), 44, MAT.lit, { sil: 2.6 });
  contactShadow(ctx, KEY_X + 20, SLEEVE_TOP - 2, 50, 8, 0.2 + 0.35 * press);
  // bezel, then the sculpted ivory cap set in it (slightly narrower at the top)
  prism(ctx, roundRectPts(x0 - 7, ct - 6, x1 + 7, cb + 5, 14, 4), 46, MAT.lit, { sil: 2.8 });
  const pts = roundRectPts(x0, ct, x1, cb, 11, 5);
  prism(ctx, pts, 40, MAT.ivory, { noLines: true });
  ctx.save();
  const g = ctx.createRadialGradient(KEY_X - 30, ct + 10, 6, KEY_X, (ct + cb) / 2, CAP_W * 0.62);
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
  ctx.font = 'italic 600 34px "Fraunces", "Fraunces fallback", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#171c18';
  ctx.fillText('/merge', KEY_X - 2, (ct + cb) / 2 + 2);
  ctx.restore();
  // latch pawl on a post right of the key; latched, its hook sits on the cap's shoulder
  const PXp = x1 + 36, PYp = CAP_UP + KEY_TRAVEL - CAP_H - 20;
  const ang = lerp(-1.25, 0, latch);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (u, v) => [PXp - u * ca - v * sa, PYp - u * sa + v * ca];
  const pawl = [R(-8, -7), R(48, -7), R(54, 0), R(54, 22), R(42, 22), R(42, 7), R(-8, 7)];
  prism(ctx, pawl, 16, MAT.lit, { sil: 2.4 });
  ball(ctx, PXp, PYp, 7, MAT.lit);
}

function pressDraw(ctx, pb, lit) {
  const M = activeMat(MAT.lit, lit, '#3a4d40');
  rodV(ctx, X_PRESS + D.x * 30, CROSS_Y + 46, pb - PLATEN_H - 24, 30, M);
  prism(ctx, rect(X_PRESS - 28, pb - PLATEN_H - 28, 56, 30), 44, M, { sil: 2.8 });
  prism(ctx, rect(X_PRESS - PLATEN_W / 2, pb - PLATEN_H, PLATEN_W, PLATEN_H), 116, M, { sil: 3.2 });
  ctx.fillStyle = '#0d120f';
  ctx.fillRect(X_PRESS - PLATEN_W / 2 + 8, pb - 6, PLATEN_W - 16, 3);
}

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 900, 600);
  lightShaft(ctx, HOUSE.x0 + 80, HOUSE.x1 - 40, HOUSE.y1, HOUSE.x0 + 10, HOUSE.x1 + 130, BENCH_Y, 0.04);
  centreLine(ctx, GANG_CX + D.x * 22, HOUSE.y1 + 14, GANG_CX + D.x * 22, LINE_Y - 4 * SH - 40, 0.4);
  centreLine(ctx, X_PRESS + D.x * 30, CROSS_Y + 60, X_PRESS + D.x * 30, PLATEN_REST - PLATEN_H - 60, 0.4);
  contactShadow(ctx, 900, FLOOR - 6, 760, 26, 0.55);
  contactShadow(ctx, SHOULDER[0] + 30, FLOOR - 8, 90, 14, 0.45);
  // press frame
  for (const x of [PRESS_L, PRESS_R]) {
    prism(ctx, rect(x - 16, CROSS_Y + 20, 32, FLOOR - 14 - CROSS_Y - 20), 34, MAT.metal, { sil: 3 });
    prism(ctx, rect(x - 24, FLOOR - 16, 48, 16), 50, MAT.metal, { sil: 2.5 });
  }
  prism(ctx, rect(PRESS_L - 30, CROSS_Y, PRESS_R - PRESS_L + 60, 48), 60, MAT.metal, { sil: 3.2 });
  if (!LOD.card) for (const x of [PRESS_L, PRESS_R]) ball(ctx, x, CROSS_Y + 24, 5, MAT.metal);
  // session column
  const idle = activeMat(MAT.session, 0);
  prism(ctx, rect(SHOULDER[0] - 50, FLOOR - 14, 100, 14), 60, idle, { sil: 3 });
  prism(ctx, rect(SHOULDER[0] - 22, SHOULDER[1] + 20, 44, FLOOR - 14 - SHOULDER[1] - 20), 36, idle, { hatch: true, sil: 3.2 });
  prism(ctx, rect(SHOULDER[0] - 46, SHOULDER[1] - 28, 92, 56), 48, idle, { hatch: true, sil: 3.2 });
  // tag rail
  const pz = D.y * RAIL_DZ;
  prism(ctx, rect(POST_X - 9, pegY(3) - 30, 18, FLOOR - 12 + pz - (pegY(3) - 30)), 20, MAT.lit, { sil: 2.8 });
  prism(ctx, rect(POST_X - 28, FLOOR - 12 + pz, 56, 12), 30, MAT.lit, { sil: 2.4 });
  for (let k = 0; k < 4; k++) {
    rodH(ctx, PEG_X, POST_X - 6, pegY(k), 6, MAT.lit);
    ball(ctx, PEG_X, pegY(k), 4.4, MAT.lit);
  }
  // conveyor bed
  prism(ctx, rect(330, LINE_Y, TRAY_X0 - 330, FLOOR - LINE_Y), 120, MAT.metal, { sil: 3 });
  if (!LOD.card) {
    for (let x = 362; x < TRAY_X0 - 10; x += 48) {
      ball(ctx, x, LINE_Y + 14, 7, MAT.metal);
      ctx.fillStyle = '#0b0f0c';
      ctx.beginPath();
      ctx.arc(x, LINE_Y + 14, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // key base and the pawl's post
  contactShadow(ctx, KEY_X + 50, FLOOR - 8, 160, 16, 0.5);
  prism(ctx, rect(KEY_X - 92, FLOOR - 40, 250, 40), 80, MAT.metal, { sil: 3 });
  rodV(ctx, KEY_X + CAP_W / 2 + 36, CAP_UP + KEY_TRAVEL - CAP_H - 20, FLOOR - 40, 12, MAT.lit);
  // tray well
  const tx0 = TRAY_X0, tx1 = TRAY_X1;
  ctx.fillStyle = '#060807';
  ctx.fillRect(tx0, LINE_Y, tx1 - tx0, TRAY_BOT - LINE_Y);
  poly(ctx, [[tx0, LINE_Y], [tx1, LINE_Y], [tx1 + D.x * 124, LINE_Y + D.y * 124], [tx0 + D.x * 124, LINE_Y + D.y * 124]]);
  ctx.fillStyle = '#0a0d0b';
  ctx.fill();
  ctx.strokeStyle = '#2c3d31';
  ctx.lineWidth = lw(2);
  ctx.stroke();
}

// sheets further down the well sit in shadow; a function of depth only, so the seam index matches
const trayShade = (yb) => clamp01((0.12 * (yb - LINE_Y)) / SQ);

function trayFront(ctx) {
  const tx0 = TRAY_X0, tx1 = TRAY_X1;
  // depth: the pile darkens as it goes down the well
  const g = ctx.createLinearGradient(0, LINE_Y + 20, 0, TRAY_BOT);
  g.addColorStop(0, 'rgba(4,6,5,0)');
  g.addColorStop(0.55, 'rgba(4,6,5,0.6)');
  g.addColorStop(1, 'rgba(4,6,5,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(tx0, LINE_Y, tx1 - tx0, TRAY_BOT - LINE_Y);
  // section: cut walls and floor, hatched, and the bench cut either side
  const cut = (x, y, w, h) => {
    ctx.fillStyle = '#18201a';
    ctx.fillRect(x, y, w, h);
    poly(ctx, rect(x, y, w, h));
    hatchPath(ctx, x, y, x + w, y + h, P.dim, 9, 2);
  };
  cut(tx0, LINE_Y, TRAY_WALL, TRAY_BOT - LINE_Y);
  cut(tx1 - TRAY_WALL, LINE_Y, TRAY_WALL, TRAY_BOT - LINE_Y);
  cut(tx0, TRAY_BOT - TRAY_WALL, tx1 - tx0, TRAY_WALL);
  ctx.fillStyle = '#4f6f57';
  ctx.fillRect(tx0, LINE_Y - 1, TRAY_WALL, 2.5);
  ctx.fillRect(tx1 - TRAY_WALL, LINE_Y - 1, TRAY_WALL, 2.5);
}

function frontLayer(ctx) {
  prism(ctx, rect(40, BEAM_Y0, W - 80, BEAM_Y1 - BEAM_Y0), 26, MAT.metal, { sil: 3 });
  if (!LOD.card) for (let x = 120; x < W - 80; x += 172) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  housing(ctx);
}

// Lamp falloff over the picture: the active station stays lit, idle parts go dim. Moves only with the work.
function falloff(ctx, x) {
  const g = ctx.createRadialGradient(x, 600, 400, x, 600, 1260);
  g.addColorStop(0, 'rgba(3,5,4,0)');
  g.addColorStop(1, 'rgba(3,5,4,0.58)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------------------------
// Loop timing (s). Round 1 and the arm's verify-and-fix get the second the CI beat used to have.

const FEED_IN = [0.05, 0.6];
const GANG_IN = 0.6, GANG_OUT = [2.15, 2.5];
const RIPPLE0 = 1.15, RIPPLE_DT = 0.15;
const tipT = (i) => RIPPLE0 + i * RIPPLE_DT; // tip starts down; contact 0.07 later
const FINDINGS = [
  { tip: 1, sheet: 2, read: 2.78, drop: 2.98 },
  { tip: 3, sheet: 0, read: 3.22, fix: 3.44, clear: 3.52 },
  { tip: 4, sheet: 1, read: 3.7, fix: 3.92, clear: 4.0 },
];
const EXTRUDE = [4.24, 4.52], LAY = 4.62, RELEASE = 4.68;
const ARM_KEYS = [
  [2.5, ARM_REST[0], ARM_REST[1]],
  [2.78, READ_X, sheetMid(2)],
  [2.98, READ_X, sheetMid(2)],
  [3.22, READ_X, sheetMid(0)],
  [3.28, READ_X, sheetMid(0)],
  [3.44, FIX_X, sheetMid(0)],
  [3.52, FIX_X, sheetMid(0)],
  [3.7, READ_X, sheetMid(1)],
  [3.76, READ_X, sheetMid(1)],
  [3.92, FIX_X, sheetMid(1)],
  [4.0, FIX_X, sheetMid(1)],
  [4.24, LAY_X, LAY_Y - 16],
  [4.52, LAY_X, LAY_Y - 16],
  [LAY, LAY_X, LAY_Y],
  [RELEASE + 0.04, LAY_X, LAY_Y],
  [4.98, ARM_REST[0], ARM_REST[1]],
];
const RERUN = { in: 5.0, touch: 5.42, out: 5.7, gone: 6.0 };
const FEED_PRESS = [6.0, 6.75];
const PRESS_T = { down: 6.75, contact: 7.0, flat: 7.2, lift: 7.3, up: 7.62 };
const SLIDE = [7.36, 7.92];
const SEAM = 9.5;
const LAMP_REVIEW = 840, LAMP_PRESS = 1450, LAMP_TRAY = 1560;

function platenBottom(t) {
  const top4 = LINE_Y - 4 * SH;
  if (t < PRESS_T.down || t >= PRESS_T.up) return PLATEN_REST;
  if (t < PRESS_T.contact) return lerp(PLATEN_REST, top4, easeInOut(seg(t, PRESS_T.down, PRESS_T.contact)));
  if (t < PRESS_T.flat) return lerp(top4, LINE_Y - SQ, easeInOut(seg(t, PRESS_T.contact, PRESS_T.flat)));
  if (t < PRESS_T.lift) return LINE_Y - SQ;
  return lerp(LINE_Y - SQ, PLATEN_REST, easeIn(seg(t, PRESS_T.lift, PRESS_T.up)));
}

function loopState(t) {
  const s = {
    key: { press: 1, latch: 1 },
    gang: null, theta: null, arm: { wrist: ARM_REST, active: 0, jaw: 0 }, carry: null,
    stack: null, squash: null, flat: null, incoming: null,
    tags: [], pb: platenBottom(t), pressLit: 0, trayOff: 0, newest: t >= SLIDE[1],
    glows: [], dusts: [], plates: null, lamp: LAMP_REVIEW,
  };

  // the work
  if (t < FEED_PRESS[0]) {
    const x = lerp(X_ENTRY, X_REVIEW, easeInOut(seg(t, FEED_IN[0], FEED_IN[1])));
    s.stack = { x, n: t >= LAY ? 4 : 3 };
  } else if (t < PRESS_T.contact) {
    s.stack = { x: lerp(X_REVIEW, X_PRESS, easeInOut(seg(t, FEED_PRESS[0], FEED_PRESS[1]))), n: 4 };
  } else if (t < PRESS_T.flat) {
    s.squash = easeInOut(seg(t, PRESS_T.contact, PRESS_T.flat));
  } else if (t < SLIDE[1]) {
    s.flat = lerp(X_PRESS, X_TRAY, easeInOut(seg(t, SLIDE[0], SLIDE[1])));
  }
  if (t >= SEAM) {
    s.trayOff = SQ * indexEase(seg(t, SEAM, SEAM + 0.18));
    const u = easeOut(seg(t, SEAM, T));
    s.incoming = { x: lerp(X_ENTRY - 130, X_ENTRY, u), alpha: easeOut(seg(t, SEAM, SEAM + 0.35)), s: lerp(0.9, 1, u) };
  }
  s.lamp = LAMP_REVIEW + (LAMP_PRESS - LAMP_REVIEW) * easeInOut(seg(t, FEED_PRESS[0], FEED_PRESS[1]))
    + (LAMP_TRAY - LAMP_PRESS) * easeInOut(seg(t, SLIDE[0], SLIDE[1]))
    - (LAMP_TRAY - LAMP_REVIEW) * easeInOut(seg(t, SEAM, T));
  s.pressLit = easeInOut(seg(t, 6.3, 6.75)) - easeInOut(seg(t, 7.6, 8.2));

  // round 1: the gang head drops on a stiff spring, ripples its tips across the stack, lifts out
  if (t >= GANG_IN && t < GANG_OUT[1]) {
    const yOff = -GANG_LIFT * (1 - springStep(t - GANG_IN, 0.78, 13)) - GANG_LIFT * easeIn(seg(t, GANG_OUT[0], GANG_OUT[1]));
    const ext = [];
    for (let i = 0; i < N_TIPS; i++) {
      const a = tipT(i);
      ext.push(HOVER * (easeInOut(seg(t, a, a + 0.07)) - easeIn(seg(t, a + 0.13, a + 0.19))));
    }
    s.gang = { yOff, ext };
  }
  const top3 = topPt(X_REVIEW, 3)[1];
  for (let i = 0; i < N_TIPS; i++) s.glows.push({ x: TIP_X(i), y: top3, u: (t - tipT(i) - 0.07) / 0.12, r: 20, color: P.paper });

  // findings: a tag springs onto its peg just after its tip touches
  for (const f of FINDINGS) {
    const c = tipT(f.tip) + 0.1;
    if (t < c) continue;
    const tau = t - c;
    let ang = -1.2 * (1 - springStep(tau, 0.3, 22));
    let alpha = clamp01(tau / 0.05), deadU = 0, dy = 0;
    const readU = Math.max(0, 1 - Math.abs(t - f.read) / 0.16);
    if (f.drop !== undefined && t >= f.drop) {
      const v = t - f.drop;
      deadU = clamp01(v / 0.12);
      // lifts off the peg, then falls clear of the rail to the bench (refuted: nothing to fix)
      dy = v < 0.1 ? -10 * Math.sin((v / 0.1) * Math.PI) : Math.min(0.5 * 3600 * (v - 0.1) * (v - 0.1), FLOOR - 40 - pegY(f.sheet));
      ang += 2.4 * Math.max(0, v - 0.08);
      alpha *= 1 - clamp01((v - 0.3) / 0.16);
    }
    if (f.clear !== undefined && t >= f.clear) {
      const v = seg(t, f.clear, f.clear + 0.18);
      ang -= 1.3 * easeIn(v);
      alpha *= 1 - easeIn(v);
    }
    if (alpha > 0) s.tags.push({ k: f.sheet, ang, alpha, deadU, dy, readU });
    if (f.drop !== undefined) s.dusts.push({ x: PEG_X, y: pegY(f.sheet) + 4, tau: t - f.drop, seed: 0x2d1, o: { ang: Math.PI * 0.6, spread: 1.2, n: 6, dur: 0.35 } });
  }

  // Claude's arm
  if (t >= ARM_KEYS[0][0] && t < ARM_KEYS[ARM_KEYS.length - 1][0]) s.arm.wrist = track(t, ARM_KEYS);
  s.arm.active = easeInOut(seg(t, 2.25, 2.55)) - easeInOut(seg(t, 4.9, 5.4));
  s.arm.jaw = easeOut(seg(t, RELEASE, RELEASE + 0.08)) - easeIn(seg(t, 4.84, 4.98));
  for (const f of FINDINGS) {
    s.glows.push({ x: READ_X - JAW, y: sheetMid(f.sheet), u: (t - f.read) / 0.12, r: 18, color: P.bright });
    if (f.fix) {
      s.glows.push({ x: X_REVIEW + JIT[f.sheet] + SW / 2 + 2, y: sheetMid(f.sheet), u: (t - f.fix) / 0.12, r: 34, color: P.bright });
      s.dusts.push({ x: X_REVIEW + JIT[f.sheet] + SW / 2 + 4, y: sheetMid(f.sheet), tau: t - f.fix, seed: 0x3a0 + f.sheet, o: { ang: -0.25, spread: 1.6, n: 7, dur: 0.4 } });
    }
  }
  if (t >= EXTRUDE[0] && t < LAY) s.carry = { reveal: easeInOut(seg(t, EXTRUDE[0], EXTRUDE[1])) };
  s.glows.push({ x: X_REVIEW + JIT[3] + SW / 2 - 8, y: LINE_Y - 3 * SH, u: (t - LAY) / 0.12, r: 30, color: P.bright });
  s.dusts.push({ x: X_REVIEW - SW / 2 + 6, y: LINE_Y - 3 * SH - 2, tau: t - LAY, seed: 0x5e1, o: { ang: Math.PI * 1.1, spread: 1.0, n: 8, dur: 0.45 } });

  // rerun: one fresh steel tip swings in, touches the new head, the rail stays empty
  if (t >= RERUN.in && t < RERUN.gone) {
    s.theta = lerp(TH_STOW_R, TH_B, easeOut(seg(t, RERUN.in, RERUN.touch))) + (TH_STOW_R - TH_B) * easeIn(seg(t, RERUN.out, RERUN.gone));
  }
  s.glows.push({ x: PB[0], y: PB[1], u: (t - RERUN.touch) / 0.12, r: 24, color: P.paper });

  // squash
  const fl = t - PRESS_T.flat + 0.04;
  s.dusts.push({ x: X_PRESS - SW / 2 - 2, y: LINE_Y - 12, tau: fl, seed: 0x7a1, o: { ang: Math.PI * 1.05, spread: 0.9, n: 12, dur: 0.5 } });
  s.dusts.push({ x: X_PRESS + SW / 2 + 2, y: LINE_Y - 12, tau: fl, seed: 0x7a2, o: { ang: -0.05, spread: 0.9, n: 12, dur: 0.5 } });
  return s;
}

// Opener (reel only). Ends exactly on loopState(0).
function openerState(t) {
  const s = loopState(0);
  s.glows = [];
  s.dusts = [];
  // (a) a PR arrives and gets a Codex review on its own: the key stays up
  s.key = { press: indexEase(seg(t, 3.45, 3.6)), latch: t >= 3.56 ? springStep(t - 3.56, 0.6, 24) : 0 };
  s.stack = null;
  if (t < 1.0) {
    const u = easeOut(seg(t, 0.1, 1.0));
    s.incoming = { x: lerp(X_ENTRY - 130, X_ENTRY, u), alpha: easeOut(seg(t, 0.1, 0.45)), s: lerp(0.9, 1, u) };
  } else s.stack = { x: X_ENTRY, n: 3 };
  const pIn = 1.0, pTouch = 1.42, pOut = 1.78, pGone = 2.1;
  let reviewPlate = 0;
  if (t >= pIn && t < pGone) {
    s.theta = lerp(TH_STOW_L, TH_A, easeOut(seg(t, pIn, pTouch))) + (TH_STOW_L - TH_A) * easeIn(seg(t, pOut, pGone));
    reviewPlate = easeOut(seg(t, pIn, pIn + 0.25)) * (1 - easeIn(seg(t, pOut, pOut + 0.2)));
  }
  s.glows.push({ x: PA[0], y: PA[1], u: (t - pTouch) / 0.12, r: 24, color: P.paper });
  // (b) the review layers, then the person's key
  const gIn = 2.5, gOut = [4.6, 5.0];
  if (t >= gIn && t < gOut[1]) {
    s.gang = { yOff: -GANG_LIFT * (1 - springStep(t - gIn, 0.78, 11)) - GANG_LIFT * easeIn(seg(t, gOut[0], gOut[1])), ext: null };
  }
  s.plates = {
    review: reviewPlate,
    full: easeOut(seg(t, gIn + 0.2, gIn + 0.45)) * (1 - easeIn(seg(t, gOut[0] - 0.1, gOut[0] + 0.1))),
    sol: easeOut(seg(t, 2.85, 3.15)) * (1 - easeIn(seg(t, 4.75, 5.05))),
  };
  s.lamp = lerp(640, LAMP_REVIEW, easeInOut(seg(t, 2.1, 2.9)));
  return s;
}

// ---------------------------------------------------------------------------------------------
// Frame.

function frame(ctx, s) {
  setLod(ctx);
  cached(ctx, 'merge-back', backLayer);

  // tray pile, clipped to the well
  ctx.save();
  ctx.beginPath();
  ctx.rect(TRAY_X0 + TRAY_WALL, LINE_Y - 200, TRAY_X1 - TRAY_X0 - 2 * TRAY_WALL, TRAY_BOT - TRAY_WALL - LINE_Y + 200);
  ctx.clip();
  for (let k = 5; k >= 1; k--) {
    const yb = LINE_Y + k * SQ + s.trayOff;
    if (yb - SQ < TRAY_BOT) sheet(ctx, X_TRAY, yb, SQ, { top: k === 1 && !s.newest, shade: trayShade(yb) });
  }
  if (s.newest) sheet(ctx, X_TRAY, LINE_Y + s.trayOff, SQ, { shade: trayShade(LINE_Y + s.trayOff) });
  ctx.restore();
  trayFront(ctx);
  if (s.flat !== null) {
    contactShadow(ctx, s.flat + 30, LINE_Y - 6, 150, 12, 0.35);
    sheet(ctx, s.flat, LINE_Y, SQ, {});
  }

  // tags hang behind the stack's end
  for (const g of s.tags) tagShape(ctx, PEG_X, pegY(g.k) + g.dy, g.ang, g.alpha, g.deadU, g.readU);

  if (s.stack) {
    contactShadow(ctx, s.stack.x + 30, LINE_Y - 8, 150, 12, 0.4);
    stack(ctx, s.stack.x, s.stack.n);
  }
  if (s.squash !== null) {
    const q = s.squash;
    const th = lerp(SH, SQ / 4, q);
    contactShadow(ctx, X_PRESS + 30, LINE_Y - 8, 150, 12, 0.4);
    for (let k = 0; k < 4; k++) sheet(ctx, X_PRESS + JIT[k] * (1 - q), LINE_Y - k * th, th, { seam: q < 0.97 });
  }
  if (s.incoming) {
    contactShadow(ctx, s.incoming.x + 30, LINE_Y - 8, 150, 12, 0.4 * s.incoming.alpha);
    stack(ctx, s.incoming.x, 3, { alpha: s.incoming.alpha, s: s.incoming.s });
  }

  // Codex tools come out of the housing
  if (s.gang) gangHead(ctx, s.gang.yOff, s.gang.ext);
  let tipPos = null;
  if (s.theta !== null) tipPos = swingArm(ctx, s.theta);
  cached(ctx, 'merge-front', frontLayer);

  pressDraw(ctx, s.pb, s.pressLit);

  // the fix sheet slides out of the arm's jaws over the stack, then is laid
  const w = s.arm.wrist;
  if (s.carry) {
    const tipX = w[0] - JAW;
    const cx = tipX + GRIP - SW / 2 + (1 - s.carry.reveal) * (SW - GRIP);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, tipX + GRIP, H);
    ctx.clip();
    contactShadow(ctx, cx + 30, LINE_Y - 3 * SH - 8, 140 * s.carry.reveal + 10, 10, 0.35);
    sheet(ctx, cx, w[1] + SH / 2, SH, {});
    ctx.restore();
  }
  armDraw(ctx, w, s.arm.active, s.arm.jaw);

  keyDraw(ctx, s.key.press, s.key.latch);

  falloff(ctx, s.lamp);

  for (const g of s.glows) contactGlow(ctx, g.x, g.y, g.u, g.r, g.color);
  for (const d of s.dusts) dust(ctx, d.x, d.y, d.tau, d.seed, d.o);

  if (s.plates) {
    const p = s.plates;
    if (p.review > 0 && tipPos) {
      const mx = lerp(PIV_X, tipPos[0], 0.42), my = lerp(PIV_Y, tipPos[1], 0.42);
      makerPlate(ctx, '/codex-review', mx - 130, my, p.review);
    }
    if (p.full > 0 && s.gang) makerPlate(ctx, '/codex-fullreview', GANG_CX, BAR_Y + s.gang.yOff + BAR_H / 2, p.full);
    makerPlate(ctx, 'Latest Sol', (HOUSE.x0 + HOUSE.x1) / 2 - 40, (HOUSE.y0 + HOUSE.y1) / 2 + 2, p.sol);
  }

  grainOver(ctx, 0.3, 'soft-light');
}

export default {
  id: 'merge',
  name: '/merge',
  caption: 'every PR goes through the Codex loop and merges when clean',
  period: T,
  draw(ctx, t) {
    t = ((t % T) + T) % T;
    frame(ctx, loopState(t));
  },
  opener: {
    duration: OPENER,
    draw(ctx, t) {
      frame(ctx, openerState(Math.min(Math.max(t, 0), OPENER)));
    },
    captions: [
      { from: 0.4, to: 2.4, name: '', line: 'Every PR from Claude Code gets a Codex review' },
      { from: 3.0, to: 5.5, name: '/merge', line: 'every PR goes through the Codex loop and merges when clean' },
    ],
  },
};
