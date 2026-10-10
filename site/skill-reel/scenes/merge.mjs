// /merge at final fidelity (pitch A 3.1, BRIEF grafts 1 to 5, BUILD per-scene decisions).
// A transfer line. The person's key /merge is latched down for the whole loop. A PR (a stack of
// ivory commit sheets) rises out of the feed lift and moves to the review station. Round 1: a fresh
// steel gang head (Codex: several fresh sub-reviewers, each a different tip) drops from the Codex
// housing, runs its tips out and ripples them across the stack; each finding hangs an amber tag on
// the rail beside the stack at the height of its sheet. Codex never marks the work. Claude's hatched
// green arm (the session) reads each tag: one tag is refuted and drops off, dim amber; the arm fixes
// the sheet at the other two and they clear, then the arm lays the fix sheet, clamped across its
// thickness, on the stack. Rerun: one fresh steel tip swings in, touches the new head, and the rail
// stays empty. The stack feeds to the press (guide columns, a hydraulic cylinder shown in section,
// ram and platen), squashes into one sheet and settles into the main tray. Hold. Seam: the tray
// indexes down one sheet while the next PR rises. No CI anywhere.
// Reel-only opener (6.9 s): a PR rises and the single Codex tip reviews it with no key pressed, under
// the PR beat caption; then the gang head lowers, the shared Latest Sol plate shows, and the /merge
// key presses and latches. The opener ends on the loop's t = 0 pose.
// Pure function of t. No Math.random, no setTransform. Static layers are cached per device scale;
// rigid moving parts are cached as small sprites (one scale per part) and drawn translated.

import {
  W, H, P, D, MAT, FLOOR, LOD, clamp01, lerp, seg, easeOut, easeIn,
  mix, springStep, indexEase, setLod, lw, cached, grainOver, poly, prism, rect,
  rodV, rodH, ball, discPts, contactShadow, contactGlow, dust, centreLine,
  benchFinal, activeMat, hatchPath, lampFalloff,
} from '../kit.mjs';

// Smoothstep: every move in this scene eases with it (peak speed 1.5x the mean, so nothing snaps).
const ss = (u) => u * u * (3 - 2 * u);

const T = 10.0;
const OPENER = 6.9;

// ---------------------------------------------------------------------------------------------
// Geometry (stage units, 1920x1080).

const LINE_Y = FLOOR - 30; // conveyor top: the bottom sheet's front edge
const SW = 230, SDEP = 110, CLIP = 26; // sheet width, depth, clipped corner
const SH = 44; // one commit sheet
const SQ = 60; // the squashed sheet
const JIT = [0, 5, -4, 3]; // sheets in a stack sit a little off each other: separate commits
const X_ENTRY = 470, X_REVIEW = 760, X_TRAY = 1735;
const PRESS_DX = -30; // the press sits 30 left of its first layout so the bin fits the frame
const X_PRESS = 1470 + PRESS_DX;
const KEY_X = 165;
const BEAM_Y0 = 228, BEAM_Y1 = 258;
const HOUSE = { x0: 510, x1: 970, y0: BEAM_Y1, y1: 312 };
const BED_DEP = 120;
// A hatch in the bed top: what is below its rim is seen through it, darkening with depth, and gone at
// HATCH_DEEP. So a part that rises out of it brightens in, it never appears in one frame.
const HATCH_DEEP = 40;
function hatchPts(cx) {
  const hx0 = cx - SW / 2 - 6, hx1 = cx + SW / 2 + 8, z0 = 4, z1 = SDEP + 4;
  return [[hx0 + D.x * z0, LINE_Y + D.y * z0], [hx1 + D.x * z0, LINE_Y + D.y * z0], [hx1 + D.x * z1, LINE_Y + D.y * z1], [hx0 + D.x * z1, LINE_Y + D.y * z1]];
}
// Draw what rises out of the hatch at cx; below: how far the top of it still sits under the rim.
function fromHatch(ctx, cx, below, draw) {
  if (below >= HATCH_DEEP) return;
  ctx.save();
  const xr = cx + SW / 2 + 5;
  poly(ctx, [[0, 0], [W, 0], [W, LINE_Y + D.y * SDEP], [xr + D.x * SDEP, LINE_Y + D.y * SDEP], [xr, LINE_Y], [0, LINE_Y]]);
  ctx.clip();
  draw();
  ctx.restore();
  if (below > 0) {
    poly(ctx, hatchPts(cx));
    ctx.fillStyle = `rgba(12,17,13,${(below / HATCH_DEEP).toFixed(4)})`;
    ctx.fill();
  }
}

const ZM = 55; // mid-depth of a sheet's top face
const topPt = (cx, n) => [cx + D.x * ZM, LINE_Y - n * SH + D.y * ZM];
const sheetMid = (k) => LINE_Y - k * SH - SH / 2;

// Rerun / automatic review tip: one steel swing arm pivoted behind the beam. Stowed, it lies flat
// behind the beam and the housing (pointing right for the rerun, left for the opener) and swings
// down into view in the plane. Same radius reaches the entry stack (opener) and the four-sheet
// review stack (rerun); each is approached from above, so the tip never crosses the work.
const PIV_Y = 250;
const PA = topPt(X_ENTRY, 3), PB = topPt(X_REVIEW, 4);
const PIV_X = ((PB[0] ** 2 - PA[0] ** 2) + (PIV_Y - PB[1]) ** 2 - (PIV_Y - PA[1]) ** 2) / (2 * (PB[0] - PA[0]));
const PEND_L = Math.hypot(PA[0] - PIV_X, PA[1] - PIV_Y);
const TH_A = Math.atan2(PA[1] - PIV_Y, PA[0] - PIV_X);
const TH_B = Math.atan2(PB[1] - PIV_Y, PB[0] - PIV_X);
const TH_STOW_R = 0, TH_STOW_L = Math.PI; // flat behind the beam and housing, hidden by them

// Round 1 gang head: one bar, six different tips that run out of their carriers.
const GANG_CX = X_REVIEW + D.x * ZM, GANG_W = 300, BAR_H = 38;
const N_TIPS = 6;
const TIP_X = (i) => GANG_CX - 2.5 * 40 + 40 * i;
const HOVER = 22;
const TIP_REACH = BAR_H + 22 + 30 + 26;
const BAR_Y = topPt(X_REVIEW, 3)[1] - HOVER - TIP_REACH;
const GANG_LIFT = 560; // guide rod length in the sprite
const GANG_HIDE = 240; // raised this far, the bar and carriers are inside the housing
const TIP_STOW = 60; // a tip run fully back sits inside its carrier

// Tag rail: a post behind the line, a peg at every sheet height.
const RAIL_DZ = SDEP + 20; // behind the work, on the bench behind the bed: everything passes in front of it
// The post stands right of the fixing wrist; the pegs point right, so the tags hang clear of the
// wrist while it fixes and the arm reads each one from its right.
const POST_X = 902 + D.x * RAIL_DZ, PEG_X = POST_X + 38;
const RAIL_HIDE = LINE_Y + D.y * BED_DEP; // the bed hides the rail below its back edge
const pegY = (k) => sheetMid(k) - 16 + D.y * RAIL_DZ;
const tagMid = (k) => pegY(k) + 24; // where the arm's jaw meets a hanging tag

// Claude's arm (the session): column behind the line, two links, jaws pointing left.
const SHOULDER = [1240, 440];
const L1 = 222, L2 = 222, JAW = 46;
const ARM_REST = [1020, 490]; // parked high: the wrist clears every stack on the line
const READ_X = PEG_X + 22 + JAW; // jaw tip on the tag's right edge
const FIX_X = X_REVIEW + SW / 2 + 4 + JAW;
const JAW_CLOSED = 5, JAW_SHEET = SH / 2, JAW_FINGER = 8;
const FIX_SHEET_R = X_REVIEW + JIT[3] + SW / 2; // the fix sheet's right edge once laid
const LAY_X = FIX_SHEET_R; // the sheet's last 14 sit in the wrist block, the jaws clamp the 46 before them
const LAY_Y = LINE_Y - 3 * SH - SH / 2 - JAW_FINGER; // held one finger above the stack
const LAY_HOVER = LAY_Y - 34;


// The fix sheet's lift: a slot in the bed right of the review station (like the PR's feed lift).
// The sheet rises on a pad narrower than itself, so its right end overhangs for the jaws.
const FS_CX = 1050, FS_R = FS_CX + SW / 2;
const FS_YB = LINE_Y - 14; // risen: the sheet stands one finger clear of the bed on its pad
const FS_YM = FS_YB - SH / 2;
const FS_DROP = SH + 14 + HATCH_DEEP; // fully down: the sheet's top deep in the hatch, unseen
const PAD_X0 = FS_CX - 70, PAD_X1 = FS_CX + 60;
const LIFT_Y = 500; // lifted clear of the line before it is carried
const FS_HOVER = FS_YM - 91; // the wrist waits above the rising sheet's end, finger drawn back

// Press: two guide columns, a crown under the beam, a hydraulic cylinder in section, ram and platen.
const CROWN = { x0: 1296 + PRESS_DX, x1: 1644 + PRESS_DX, y0: BEAM_Y1, y1: 312, dep: 130 };
const COL_Z = 60, COL_W = 26;
const COL_L = 1325 + PRESS_DX + D.x * COL_Z, COL_R = 1615 + PRESS_DX + D.x * COL_Z;
const COL_FOOT = LINE_Y + D.y * COL_Z; // where a column meets the bed top
const CYL_Z = 55, CYL_X = X_PRESS + D.x * CYL_Z;
const CYL_BOT = 470, GLAND_H = 16, BORE = 30, CWALL = 12;
const PIST_Y = 314, PIST_H = 12, RAM_W = 30;
const PLATEN_REST = 540, PLATEN_H = 36, PAD_H = 10;
const PL_X0 = 1305 + PRESS_DX, PL_X1 = 1635 + PRESS_DX, PL_DEP = 120;
const RAM_BOT = PLATEN_REST - PLATEN_H + D.y * CYL_Z + 2;

// Main tray: a bin sunk into the bench, shown in section.
const TRAY_X0 = X_TRAY - SW / 2 - 16, TRAY_X1 = X_TRAY + SW / 2 + 20, TRAY_WALL = 14, TRAY_BOT = 1046;

// ---------------------------------------------------------------------------------------------
// Materials local to this scene. Steel = Codex (merge only). Amber = a finding; a refuted finding
// stays amber, dimmed.

const STEEL = { front: ['#6a6f67', '#353933'], top: '#b4b8ad', side: '#22261f', sil: '#b2b5ab', hi: '#f1f3ea', line: '#4b5049' };
const STEEL_DARK = { ...STEEL, front: ['#4b504a', '#2a2e29'], top: '#868b81' };
const TAG = { front: ['#f6d9a0', '#cfa65c'], top: '#fde9bd', side: '#8f7136', sil: '#efc87e', hi: '#fff3d6', line: '#a8843f' };
const TAG_READ = { ...TAG, front: ['#fff6e2', '#f0d49c'] };
const TAG_DIM = { front: ['#8e7a54', '#5f4f33'], top: '#a08a62', side: '#3f3422', sil: '#8a7550', hi: '#b09a70', line: '#5c4b30' };
const PRESS_IDLE = activeMat(MAT.lit, 0, '#3a4d40');
const PRESS_LIT = activeMat(MAT.lit, 1, '#3a4d40');

// ---------------------------------------------------------------------------------------------
// Sprites: a rigid part drawn once per device scale into a small canvas and placed by translation.
// The part is drawn with the same calls every time, so the output does not depend on cache state.
// One scale per part: a resize replaces the bitmap instead of adding one.

const sprites = new Map();
let warming = false, warmScale = 0;
function sprite(ctx, key, box, draw, dx = 0, dy = 0, alpha = 1) {
  if (alpha <= 0 && !warming) return;
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  let S = sprites.get(key);
  // a tolerance: under rotate() the scale read back from the transform moves in its last bits
  if (!S || Math.abs(S.s - s) > 1e-6 * s) {
    const [x0, y0, x1, y1] = box;
    const cw = Math.max(1, Math.ceil((x1 - x0) * s)), ch = Math.max(1, Math.ceil((y1 - y0) * s));
    const cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.scale(s, s);
    c.translate(-x0, -y0);
    const saved = { ...LOD };
    setLod(c);
    draw(c);
    Object.assign(LOD, saved);
    S = { s, cv, x0, y0, w: cw / s, h: ch / s };
    sprites.set(key, S);
  }
  if (alpha <= 0) return;
  if (alpha < 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(S.cv, S.x0 + dx, S.y0 + dy, S.w, S.h);
    ctx.restore();
  } else ctx.drawImage(S.cv, S.x0 + dx, S.y0 + dy, S.w, S.h);
}

// ---------------------------------------------------------------------------------------------
// Helpers.

function track(t, keys) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const a = keys[i - 1], b = keys[i];
      const u = ss(seg(t, a[0], b[0]));
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

// A face cut by the section plane: dark fill, 45 degree hatching, outline.
function cutFace(ctx, x, y, w, h, hatch, edge, gap = 7) {
  ctx.fillStyle = '#18201a';
  ctx.fillRect(x, y, w, h);
  poly(ctx, rect(x, y, w, h));
  hatchPath(ctx, x, y, x + w, y + h, hatch, gap, 1.6);
  ctx.strokeStyle = edge;
  ctx.lineWidth = lw(1.6);
  ctx.strokeRect(x, y, w, h);
}

function hexHead(ctx, x, y, r, fill) {
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  poly(ctx, pts);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,10,8,0.7)';
  ctx.lineWidth = lw(1.2);
  ctx.stroke();
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
// top face, a registration hole through it. dim: a sheet down in the tray, edge-lit only.

function sheet(ctx, cx, yb, th, o = {}) {
  const { top = true, seam = true, dim = 0 } = o;
  const w = SW, dep = SDEP, c = CLIP;
  const x0 = cx - w / 2, x1 = cx + w / 2, yt = yb - th;
  const dxc = D.x * (dep - c), dyc = D.y * (dep - c), dx = D.x * dep, dy = D.y * dep;
  poly(ctx, [[x1, yt], [x1 + dxc, yt + dyc], [x1 + dxc, yb + dyc], [x1, yb]]);
  ctx.fillStyle = dim ? mix(MAT.ivory.side, '#1a1f1b', dim) : MAT.ivory.side;
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
    const hx = x0 + 36 + D.x * dep * 0.5, hy = yt + D.y * dep * 0.5;
    poly(ctx, discPts(hx, hy, 9.5, 20));
    ctx.fillStyle = '#8f9086';
    ctx.fill();
    poly(ctx, discPts(hx + 1.5, hy + 1.2, 7, 16));
    ctx.fillStyle = '#62645c';
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, yt, 0, yb);
  g.addColorStop(0, dim ? mix(MAT.ivory.front[0], '#1c221d', dim) : MAT.ivory.front[0]);
  g.addColorStop(1, dim ? mix(MAT.ivory.front[1], '#121713', dim) : MAT.ivory.front[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x0, yt, w, th);
  ctx.fillStyle = dim ? `rgba(220,226,212,${0.5 * (1 - dim) + 0.22})` : 'rgba(255,255,250,0.95)';
  ctx.fillRect(x0, yt, w, lw(1.6));
  if (seam) {
    ctx.fillStyle = 'rgba(62,66,57,0.6)';
    ctx.fillRect(x0, yb - lw(1.8), w, lw(1.8));
  }
}

const stackBox = (n) => [X_REVIEW - SW / 2 - 10, LINE_Y - n * SH - 42, X_REVIEW + SW / 2 + 6 + D.x * SDEP + 10, LINE_Y + 6];
function stackSprite(ctx, n, x, dy = 0) {
  sprite(ctx, 'merge-stack' + n, stackBox(n), (c) => {
    for (let k = 0; k < n; k++) sheet(c, X_REVIEW + JIT[k], LINE_Y - k * SH, SH);
  }, x - X_REVIEW, dy);
}
const SHEET_BOX = [X_REVIEW - SW / 2 - 6, LINE_Y - SH - 36, X_REVIEW + SW / 2 + D.x * SDEP + 8, LINE_Y + 4];
function oneSheet(ctx, x, yb) {
  sprite(ctx, 'merge-sheet', SHEET_BOX, (c) => sheet(c, X_REVIEW, LINE_Y, SH), x - X_REVIEW, yb - LINE_Y);
}
const FLAT_BOX = [X_TRAY - SW / 2 - 6, LINE_Y - SQ - 36, X_TRAY + SW / 2 + D.x * SDEP + 8, LINE_Y + 4];
function flatSheet(ctx, x, yb, alpha = 1, dark = 0) {
  sprite(ctx, 'merge-flat', FLAT_BOX, (c) => sheet(c, X_TRAY, LINE_Y, SQ), x - X_TRAY, yb - LINE_Y, alpha);
  // the same sheet as a dark silhouette: laid over it, it puts the sheet in shadow
  sprite(ctx, 'merge-flat-dark', FLAT_BOX, (c) => {
    sheet(c, X_TRAY, LINE_Y, SQ);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#040605';
    c.fillRect(FLAT_BOX[0], FLAT_BOX[1], FLAT_BOX[2] - FLAT_BOX[0], FLAT_BOX[3] - FLAT_BOX[1]);
  }, x - X_TRAY, yb - LINE_Y, alpha * dark);
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

// The gang head: the bar with its six carriers, and six tips that run out of the carriers (ext) or
// back into them (stow). The bar and carriers slide up into the housing throat as one piece.
function gangHead(ctx, yOff, ext, stow) {
  const by = BAR_Y + yOff, hy0 = BAR_Y + BAR_H;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HOUSE.y1 - 4, W, H);
  ctx.clip();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, Math.max(HOUSE.y1 - 4, by), W, H);
  ctx.clip();
  for (let i = 0; i < N_TIPS; i++) {
    const x = TIP_X(i);
    sprite(ctx, 'merge-tip' + i, [x - 16, hy0 - TIP_STOW - 4, x + 16, hy0 + 22 + 30 + 26 + 8], (c) => {
      rodV(c, x, hy0 + 20 - TIP_STOW, hy0 + 52, 8, STEEL);
      tipShape(c, i, x, hy0 + 52);
    }, 0, yOff + (ext ? ext[i] : 0) - stow);
  }
  ctx.restore();
  sprite(ctx, 'merge-gangbar', [GANG_CX - GANG_W / 2 - 10, BAR_Y - GANG_LIFT - 80, GANG_CX + GANG_W / 2 + D.x * 46 + 12, hy0 + 30], (c) => {
    rodV(c, GANG_CX + D.x * 22, BAR_Y - GANG_LIFT - 70, BAR_Y + 4, 20, STEEL);
    rodV(c, GANG_CX + D.x * 22, BAR_Y - 64, BAR_Y + 4, 30, STEEL_DARK);
    for (let i = 0; i < N_TIPS; i++) prism(c, rect(TIP_X(i) - 13, hy0 - 2, 26, 24), 18, STEEL_DARK, { sil: 2.4 });
    prism(c, rect(GANG_CX - GANG_W / 2, BAR_Y, GANG_W, BAR_H), 46, STEEL, { sil: 3.5 });
    c.fillStyle = '#1b1e1a';
    for (let i = 0; i < N_TIPS; i++) {
      c.beginPath();
      c.arc(TIP_X(i), BAR_Y + BAR_H / 2, 4, 0, Math.PI * 2);
      c.fill();
    }
  }, 0, yOff);
  ctx.restore();
}

function swingArm(ctx, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const tx = PIV_X + PEND_L * c, ty = PIV_Y + PEND_L * s;
  const bx = tx - 36 * c, by = ty - 36 * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BEAM_Y0, W, H);
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

// The Codex housing: a chamfered steel body with a recessed front panel, cap screws, a brushed
// finish and a throat along its underside that the gang head runs out of.
function housing(ctx) {
  const { x0, x1, y0, y1 } = HOUSE;
  prism(ctx, [[x0, y0], [x1, y0], [x1, y1 - 10], [x1 - 10, y1], [x0 + 10, y1], [x0, y1 - 10]], 60, STEEL, { sil: 3.5 });
  // lit chamfer along the top front edge
  ctx.fillStyle = 'rgba(241,243,234,0.2)';
  ctx.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, 3);
  if (!LOD.card) {
    // brushed finish
    ctx.strokeStyle = 'rgba(241,243,234,0.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = y0 + 9; y < y1 - 9; y += 4) { ctx.moveTo(x0 + 6, y); ctx.lineTo(x1 - 6, y); }
    ctx.stroke();
  }
  // recessed front panel: shadowed top and left, lit bottom and right
  const px0 = x0 + 20, px1 = x1 - 20, py0 = y0 + 9, py1 = y1 - 17;
  ctx.lineWidth = lw(2);
  ctx.strokeStyle = 'rgba(12,14,12,0.6)';
  ctx.beginPath();
  ctx.moveTo(px0, py1);
  ctx.lineTo(px0, py0);
  ctx.lineTo(px1, py0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(241,243,234,0.4)';
  ctx.beginPath();
  ctx.moveTo(px1, py0);
  ctx.lineTo(px1, py1);
  ctx.lineTo(px0, py1);
  ctx.stroke();
  // the throat: where the gang head runs out, a dark slot with a lit lip
  const tx0 = GANG_CX - GANG_W / 2 - 8, tx1 = GANG_CX + GANG_W / 2 + D.x * 46 + 4;
  ctx.fillStyle = '#0b0d0b';
  ctx.fillRect(tx0, y1 - 8, tx1 - tx0, 8);
  ctx.fillStyle = 'rgba(241,243,234,0.55)';
  ctx.fillRect(tx0, y1 - 9.5, tx1 - tx0, lw(1.5));
  // cap screws
  if (!LOD.card) {
    for (const x of [x0 + 10, x1 - 10]) for (const y of [y0 + 11, y1 - 21]) hexHead(ctx, x, y, 4.2, '#9a9e94');
  }
  // the swing arm's slot runs on from the throat to the housing's left end
  ctx.fillStyle = '#0b0d0b';
  ctx.fillRect(x0 + 14, y1 - 5, tx0 - x0 - 14, 5);
}

// A finding: an amber tag hanging from a peg, drawn about the peg (the caller places and swings it).
const TAG_BOX = [-24, -4, 30, 46];
function tagDraw(ctx, m, cord) {
  ctx.strokeStyle = cord;
  ctx.lineWidth = lw(2);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.lineTo(-6, 9);
  ctx.moveTo(1, 0);
  ctx.lineTo(6, 9);
  ctx.stroke();
  const w = 40, h = 32, c = 9, y0 = 8;
  prism(ctx, [[-w / 2 + c, y0], [w / 2 - c, y0], [w / 2, y0 + c], [w / 2, y0 + h], [-w / 2, y0 + h], [-w / 2, y0 + c]], 6, m, { sil: 2.4 });
  ctx.fillStyle = '#141914';
  ctx.beginPath();
  ctx.arc(0, y0 + 8, 3.4, 0, Math.PI * 2);
  ctx.fill();
}
function tagShape(ctx, px, py, ang, alpha, deadU, readU) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  if (deadU < 1) sprite(ctx, 'merge-tag', TAG_BOX, (c) => tagDraw(c, TAG, '#e1cc9c'), 0, 0, alpha);
  if (readU > 0) sprite(ctx, 'merge-tag-read', TAG_BOX, (c) => tagDraw(c, TAG_READ, '#efdcb0'), 0, 0, alpha * readU);
  if (deadU > 0) sprite(ctx, 'merge-tag-dim', TAG_BOX, (c) => tagDraw(c, TAG_DIM, '#8a7a58'), 0, 0, alpha * deadU);
  ctx.restore();
}

// Claude's arm. o: half the jaw gap; slide: the lower finger drawn back into the wrist block.
function armDraw(ctx, wrist, active, o, slide) {
  const SM = activeMat(MAT.session, active);
  const [sx, sy] = SHOULDER;
  const e = ik(wrist[0], wrist[1]);
  const [wx, wy] = wrist;
  link(ctx, sx, sy, e[0], e[1], 32, 26, SM, { hatch: true, sil: 3.2 });
  link(ctx, e[0], e[1], wx + 8, wy, 26, 22, SM, { hatch: true, sil: 3 });
  ball(ctx, e[0], e[1], 11, SM);
  const J = activeMat(MAT.lit, active, '#34453a');
  prism(ctx, [[wx - JAW, wy - o - 5], [wx - 10, wy - o - 8], [wx - 10, wy - o], [wx - JAW + 3, wy - o]], 18, J, { sil: 2.2 });
  const sl = slide * (JAW - 12);
  prism(ctx, [[wx - JAW + 3 + sl, wy + o], [wx - 10 + sl, wy + o], [wx - 10 + sl, wy + o + 8], [wx - JAW + sl, wy + o + 5]], 18, J, { sil: 2.2 });
  // wrist block: tall enough to take a sheet between its jaws
  prism(ctx, rect(wx - 14, wy - 34, 40, 68), 30, SM, { hatch: true, sil: 3.2, hatchGap: 10 });
  ball(ctx, wx + 6, wy, 6.5, SM);
  ball(ctx, sx, sy, 15, SM);
}
const ARM_BOX = [940, 250, 1300, 560];

// The person's key: an ivory cap in a dark bezel on a green stem that rides in a guide sleeve,
// /merge in Fraunces Italic. press pushes it down; latch swings the pawl onto the cap's shoulder.
const CAP_W = 160, CAP_H = 56, CAP_UP = FLOOR - 88, KEY_TRAVEL = 24, SLEEVE_TOP = FLOOR - 60;
function roundRectPts(x0, y0, x1, y1, r, inset = 0) {
  const pts = [];
  const corners = [[x1 - r - inset, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r + inset, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of corners) for (let k = 0; k <= 4; k++) { const a = a0 + (k / 4) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return pts;
}
function keyDraw(ctx, press, latch, legend = true) {
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
  ctx.restore();
  if (legend) keyLegend(ctx, press);
  // latch pawl on a post right of the key; latched, its hook sits on the cap's shoulder
  const PXp = x1 + 36, PYp = CAP_UP + KEY_TRAVEL - CAP_H - 20;
  const ang = lerp(-1.25, 0, latch);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (u, v) => [PXp - u * ca - v * sa, PYp - u * sa + v * ca];
  const pawl = [R(-8, -7), R(48, -7), R(54, 0), R(54, 22), R(42, 22), R(42, 7), R(-8, 7)];
  prism(ctx, pawl, 16, MAT.lit, { sil: 2.4 });
  ball(ctx, PXp, PYp, 7, MAT.lit);
}
const KEY_BOX = [40, 580, 340, 742];
// The person's words, set live (never baked into a cached bitmap, so a late font load cannot stick).
function keyLegend(ctx, press) {
  const cb = CAP_UP + press * KEY_TRAVEL, ct = cb - CAP_H;
  ctx.save();
  ctx.font = 'italic 600 34px "Fraunces", "Fraunces fallback", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#171c18';
  ctx.fillText('/merge', KEY_X - 2, (ct + cb) / 2 + 2);
  ctx.restore();
}

// The press frame: guide columns, the cylinder cut through its axis (hatched walls, flange and
// gland), and the crown bolted under the beam. feet: the column flanges on the bed top.
function pressFrame(ctx, M, hatch, part) {
  if (part !== 'feet') {
    for (const cx of [COL_L, COL_R]) rodV(ctx, cx, CROWN.y1 - 16, COL_FOOT, COL_W, M);
    // inside of the bore, seen through the cut
    const g = ctx.createLinearGradient(CYL_X - BORE, 0, CYL_X + BORE, 0);
    g.addColorStop(0, '#060907');
    g.addColorStop(0.62, '#18211b');
    g.addColorStop(1, '#0a0e0b');
    ctx.fillStyle = g;
    ctx.fillRect(CYL_X - BORE, CROWN.y1, 2 * BORE, CYL_BOT - CROWN.y1);
    const wl = CYL_X - BORE - CWALL, wr = CYL_X + BORE;
    cutFace(ctx, wl, CROWN.y1, CWALL, CYL_BOT - CROWN.y1, hatch, M.sil);
    cutFace(ctx, wr, CROWN.y1, CWALL, CYL_BOT - CROWN.y1, hatch, M.sil);
    cutFace(ctx, wl - 14, CROWN.y1, 14, 12, hatch, M.sil);
    cutFace(ctx, wr + CWALL, CROWN.y1, 14, 12, hatch, M.sil);
    cutFace(ctx, CYL_X - BORE - 10, CYL_BOT, BORE + 10 - RAM_W / 2, GLAND_H, hatch, M.sil);
    cutFace(ctx, CYL_X + RAM_W / 2, CYL_BOT, BORE + 10 - RAM_W / 2, GLAND_H, hatch, M.sil);
    // the outer skin catches the lamp on the left
    ctx.fillStyle = M.hi;
    ctx.fillRect(wl - 1, CROWN.y1 + 12, lw(1.6), CYL_BOT - CROWN.y1 - 12);
    // hydraulic port and line into the crown
    prism(ctx, rect(wr + CWALL, 338, 12, 18), 12, M, { sil: 2 });
    rodH(ctx, wr + CWALL + 12, wr + CWALL + 34, 347, 8, M);
    rodV(ctx, wr + CWALL + 34, CROWN.y1 - 4, 351, 8, M);
    // crown: chamfered underside corners, a sunk web line, cap screws over the columns
    const { x0, x1, y0, y1, dep } = CROWN;
    prism(ctx, [[x0, y0], [x1, y0], [x1, y1 - 9], [x1 - 9, y1], [x0 + 9, y1], [x0, y1 - 9]], dep, M, { sil: 3.2 });
    ctx.lineWidth = lw(2);
    ctx.strokeStyle = 'rgba(6,9,7,0.7)';
    ctx.beginPath();
    ctx.moveTo(x0 + 16, y1 - 14);
    ctx.lineTo(x0 + 16, y0 + 10);
    ctx.lineTo(x1 - 16, y0 + 10);
    ctx.stroke();
    ctx.strokeStyle = M.hi;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(x1 - 16, y0 + 10);
    ctx.lineTo(x1 - 16, y1 - 14);
    ctx.lineTo(x0 + 16, y1 - 14);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const x of [x0 + 30, COL_L - D.x * COL_Z + 4, COL_R - D.x * COL_Z - 4, x1 - 30]) hexHead(ctx, x, (y0 + y1) / 2 + 1, 5, M.top);
  }
  if (part !== 'upper') {
    for (const cx of [COL_L, COL_R]) {
      poly(ctx, discPts(cx, COL_FOOT, 18, 22));
      ctx.fillStyle = M.front[0];
      ctx.fill();
      ctx.strokeStyle = M.sil;
      ctx.lineWidth = lw(2);
      ctx.stroke();
      prism(ctx, rect(cx - 17, COL_FOOT - 13, 34, 13), 12, M, { sil: 2.2 });
    }
  }
}
const PRESS_BOX = [1270 + PRESS_DX, BEAM_Y1 - 40, 1720 + PRESS_DX, COL_FOOT + 12];

// Ram and piston (moving with the platen). The piston is cut too.
function ramDraw(ctx, M, hatch) {
  rodV(ctx, CYL_X, PIST_Y + PIST_H, RAM_BOT, RAM_W, M);
  cutFace(ctx, CYL_X - BORE, PIST_Y, 2 * BORE, PIST_H, hatch, M.sil, 6);
  ctx.fillStyle = 'rgba(6,9,7,0.8)';
  ctx.fillRect(CYL_X - BORE, PIST_Y + 4, 2 * BORE, lw(1.5));
}
const RAM_BOX = [CYL_X - BORE - 6, PIST_Y - 4, CYL_X + BORE + 6, RAM_BOT + 4];

// Platen at rest: a pressing pad the width of a sheet, the chamfered platen, guide bushings
// riding the columns, and the clevis where the ram meets it.
function platenDraw(ctx, M) {
  const yb = PLATEN_REST, yt = yb - PLATEN_H;
  prism(ctx, rect(X_PRESS - SW / 2 + 2, yb - PAD_H, SW - 4, PAD_H), 106, M, { sil: 2.4 });
  prism(ctx, [[PL_X0 + 7, yt], [PL_X1 - 7, yt], [PL_X1, yt + 7], [PL_X1, yb - PAD_H], [PL_X0, yb - PAD_H], [PL_X0, yt + 7]], PL_DEP, M, { sil: 3 });
  // two machined grooves on the front face
  ctx.fillStyle = 'rgba(6,9,7,0.75)';
  ctx.fillRect(PL_X0 + 14, yt + 11, PL_X1 - PL_X0 - 28, lw(1.6));
  ctx.fillStyle = M.hi;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(PL_X0 + 14, yt + 13, PL_X1 - PL_X0 - 28, lw(1.2));
  ctx.globalAlpha = 1;
  for (const cx of [COL_L, COL_R]) {
    const ty = yt + D.y * COL_Z;
    rodV(ctx, cx, ty - 20, ty, 42, M);
    poly(ctx, discPts(cx, ty - 20, 21, 22));
    ctx.fillStyle = M.top;
    ctx.fill();
    ctx.strokeStyle = M.sil;
    ctx.lineWidth = lw(2);
    ctx.stroke();
    poly(ctx, discPts(cx, ty - 20, COL_W / 2 + 1, 18));
    ctx.fillStyle = M.front[1];
    ctx.fill();
  }
  const ry = yt + D.y * CYL_Z;
  prism(ctx, rect(CYL_X - 25, ry - 15, 50, 17), 18, M, { sil: 2.4 });
  ball(ctx, CYL_X + 3, ry - 6, 5, M);
}
const PLATEN_BOX = [PL_X0 - 8, PLATEN_REST - PLATEN_H + D.y * COL_Z - 34, PL_X1 + D.x * PL_DEP + 10, PLATEN_REST + 6];

// ---------------------------------------------------------------------------------------------
// Static layers.

function backLayer(ctx) {
  benchFinal(ctx, 900, 600);
  centreLine(ctx, GANG_CX + D.x * 22, HOUSE.y1 + 14, GANG_CX + D.x * 22, LINE_Y - 4 * SH - 40, 0.4);
  contactShadow(ctx, 900, FLOOR - 6, 760, 26, 0.55);
  contactShadow(ctx, SHOULDER[0] + 30, FLOOR - 8, 90, 14, 0.45);
  pressFrame(ctx, PRESS_IDLE, P.dim, 'upper');
  // session column
  const idle = activeMat(MAT.session, 0);
  prism(ctx, rect(SHOULDER[0] - 50, FLOOR - 14, 100, 14), 60, idle, { sil: 3 });
  prism(ctx, rect(SHOULDER[0] - 22, SHOULDER[1] + 20, 44, FLOOR - 14 - SHOULDER[1] - 20), 36, idle, { hatch: true, sil: 3.2 });
  prism(ctx, rect(SHOULDER[0] - 46, SHOULDER[1] - 28, 92, 56), 48, idle, { hatch: true, sil: 3.2 });
  rail(ctx);
  // conveyor bed
  prism(ctx, rect(330, LINE_Y, TRAY_X0 - 330, FLOOR - LINE_Y), BED_DEP, MAT.metal, { sil: 3 });
  if (!LOD.card) {
    for (let x = 362; x < TRAY_X0 - 10; x += 48) {
      ball(ctx, x, LINE_Y + 14, 7, MAT.metal);
      ctx.fillStyle = '#0b0f0c';
      ctx.beginPath();
      ctx.arc(x, LINE_Y + 14, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // the feed lift: a hatch in the bed top where each PR rises
  const hx0 = X_ENTRY - SW / 2 - 6, hx1 = X_ENTRY + SW / 2 + 8, z0 = 4, z1 = SDEP + 4;
  poly(ctx, hatchPts(X_ENTRY));
  ctx.fillStyle = '#0c110d';
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(1.6);
  ctx.stroke();
  // lift platform seams: the lift stands flush with the bed top
  if (!LOD.card) {
    ctx.strokeStyle = 'rgba(79,111,87,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const u of [0.34, 0.67]) {
      const x = lerp(hx0, hx1, u);
      ctx.moveTo(x + D.x * z0, LINE_Y + D.y * z0);
      ctx.lineTo(x + D.x * z1, LINE_Y + D.y * z1);
    }
    ctx.stroke();
  }
  // the fix-sheet lift's slot beside the review station
  poly(ctx, hatchPts(FS_CX));
  ctx.fillStyle = '#0c110d';
  ctx.fill();
  ctx.strokeStyle = MAT.lit.sil;
  ctx.lineWidth = lw(1.6);
  ctx.stroke();
  pressFrame(ctx, PRESS_IDLE, P.dim, 'feet');
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



// The tag rail, behind the line: post and a peg at every sheet height (the bed hides its foot).
function rail(ctx) {
  prism(ctx, rect(POST_X - 9, pegY(3) - 30, 18, RAIL_HIDE + 10 - (pegY(3) - 30)), 20, MAT.lit, { sil: 2.8 });
  for (let k = 0; k < 4; k++) {
    rodH(ctx, POST_X + 6, PEG_X, pegY(k), 6, MAT.lit);
    ball(ctx, PEG_X, pegY(k), 4.4, MAT.lit);
  }
}

// The fix sheet on its lift (u: 0 down in the slot, 1 risen), and the pad under it.
function fixLift(ctx, u, sheetOn, padU) {
  const dy = (1 - u) * FS_DROP, pdy = (1 - padU) * FS_DROP;
  // the highest thing in the hatch sets how deep the view into it is
  const top = sheetOn ? FS_YB - SH + dy : FS_YB + pdy;
  fromHatch(ctx, FS_CX, top - LINE_Y, () => {
    if (padU > 0) {
      sprite(ctx, 'merge-fix-pad', [PAD_X0 - 6, FS_YB - 40, PAD_X1 + D.x * 100 + 8, FS_YB + 30], (c) => {
        rodV(c, (PAD_X0 + PAD_X1) / 2 + D.x * 50, FS_YB + 8, FS_YB + 30, 16, MAT.lit);
        prism(c, rect(PAD_X0, FS_YB, PAD_X1 - PAD_X0, 8), 100, MAT.lit, { sil: 2.2 });
      }, 0, pdy);
    }
    if (sheetOn) oneSheet(ctx, FS_CX, FS_YB + dy);
  });
}

function trayFront(ctx) {
  const tx0 = TRAY_X0, tx1 = TRAY_X1;
  // depth: the pile darkens as it goes down the well
  const g = ctx.createLinearGradient(0, LINE_Y + 20, 0, TRAY_BOT);
  g.addColorStop(0, 'rgba(4,6,5,0)');
  g.addColorStop(0.55, 'rgba(4,6,5,0.6)');
  g.addColorStop(1, 'rgba(4,6,5,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(tx0, LINE_Y + 1, tx1 - tx0, TRAY_BOT - LINE_Y - 1);
  // section: cut walls and floor, hatched
  const cut = (x, y, w, h) => {
    ctx.fillStyle = '#18201a';
    ctx.fillRect(x, y, w, h);
    poly(ctx, rect(x, y, w, h));
    hatchPath(ctx, x, y, x + w, y + h, P.dim, 9, 2);
  };
  cut(tx0, LINE_Y + 1, TRAY_WALL, TRAY_BOT - LINE_Y - 1);
  cut(tx1 - TRAY_WALL, LINE_Y + 1, TRAY_WALL, TRAY_BOT - LINE_Y - 1);
  cut(tx0, TRAY_BOT - TRAY_WALL, tx1 - tx0, TRAY_WALL);
  ctx.fillStyle = '#4f6f57';
  ctx.fillRect(tx0, LINE_Y + 0.5, TRAY_WALL, 2.5);
  ctx.fillRect(tx1 - TRAY_WALL, LINE_Y + 0.5, TRAY_WALL, 2.5);
}

function frontLayer(ctx) {
  prism(ctx, rect(40, BEAM_Y0, W - 80, BEAM_Y1 - BEAM_Y0), 26, MAT.metal, { sil: 3 });
  if (!LOD.card) for (let x = 120; x < W - 80; x += 172) ball(ctx, x, (BEAM_Y0 + BEAM_Y1) / 2, 3.2, MAT.metal);
  housing(ctx);
  trayFront(ctx);
}

// Lamp: a shaft of light and a pool on the bench that follow the active station, then the falloff
// that darkens idle parts (skipped when the host draws one vignette over several scenes).
function lamp(ctx, x) {
  const top = HOUSE.y1 + 4, bot = LINE_Y;
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, 'rgba(205,240,214,0.05)');
  g.addColorStop(1, 'rgba(205,240,214,0.012)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 120, top);
  ctx.lineTo(x + 110, top);
  ctx.lineTo(x + 250, bot);
  ctx.lineTo(x - 230, bot);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// Loop timing (s). The verify-and-fix beat holds each arm dwell about 200 ms.

const FEED_IN = [0.05, 0.6];
const GANG_IN = 0.6, TIPS_OUT = [0.85, 1.08], TIPS_IN = [1.98, 2.16], GANG_OUT = [2.16, 2.48];
const RIPPLE0 = 1.12, RIPPLE_DT = 0.13;
const tipT = (i) => RIPPLE0 + i * RIPPLE_DT; // tip starts down; contact 0.07 later
const FINDINGS = [
  { tip: 1, sheet: 2, read: 2.55, drop: 2.78 },
  { tip: 3, sheet: 0, read: 3.0, fix: 3.38, clear: 3.46 },
  { tip: 4, sheet: 1, read: 3.78, fix: 4.16, clear: 4.24 },
];
// the fix sheet: it rises on its lift while the arm comes over with the jaws open and the lower
// finger drawn back; the arm slides onto its overhanging edge, the finger closes under it, the arm
// lifts it off the pad (the pad sinks back), carries it to the stack, lowers it, slips the finger
// out, and it sits on the stack
const FS_RISE = [4.5, 4.72], OPEN_JAW = [4.36, 4.6], SLIDE_ON = [4.72, 4.8], FINGER_IN = [4.78, 4.86];
const PICK_T = 4.88, LIFT_OFF = [4.88, 5.08], PAD_DOWN = [4.98, 5.2];
const CARRY = [5.08, 5.32], LOWER = [5.32, 5.42], SLIP = [5.42, 5.52];
const LAY = 5.52; // the fix sheet sits on the stack
const ARM_HOME = [5.58, 5.86];
const ARM_KEYS = [
  [2.3, ARM_REST[0], ARM_REST[1]],
  [2.55, READ_X, tagMid(2)],
  [2.78, READ_X, tagMid(2)],
  [3.0, READ_X, tagMid(0)],
  [3.2, READ_X, tagMid(0)],
  [3.38, FIX_X, sheetMid(0)],
  [3.58, FIX_X, sheetMid(0)],
  [3.78, READ_X, tagMid(1)],
  [3.98, READ_X, tagMid(1)],
  [4.16, FIX_X, sheetMid(1)],
  [4.36, FIX_X, sheetMid(1)],
  [OPEN_JAW[1], FS_R, FS_HOVER],
  [SLIDE_ON[0], FS_R, FS_HOVER],
  [SLIDE_ON[1], FS_R, FS_YM],
  [PICK_T, FS_R, FS_YM],
  [LIFT_OFF[1], FS_R, LIFT_Y],
  [CARRY[1], LAY_X, LAY_HOVER],
  [LOWER[1], LAY_X, LAY_Y],
  [ARM_HOME[0], LAY_X, LAY_Y],
  [ARM_HOME[1], ARM_REST[0], ARM_REST[1]],
];
const RERUN = { in: 5.66, touch: 6.08, out: 6.26, gone: 6.6 };
const FEED_PRESS = [6.58, 7.14]; // 710 px, smoothstep: peak about 1,900 px/s
const PRESS_T = { down: 7.14, contact: 7.3, flat: 7.43, lift: 7.5, up: 7.74 };
const SLIDE = [7.54, 7.92]; // the payoff holds still from SLIDE[1] to SEAM
const SEAM = 9.5;
const RISE = 3 * SH + HATCH_DEEP; // fully down: the PR's top deep in the hatch, unseen
const LAMP_REVIEW = 840, LAMP_PRESS = 1450 + PRESS_DX, LAMP_TRAY = X_TRAY - 90;

function platenBottom(t) {
  const top4 = LINE_Y - 4 * SH;
  if (t < PRESS_T.down || t >= PRESS_T.up) return PLATEN_REST;
  if (t < PRESS_T.contact) return lerp(PLATEN_REST, top4, ss(seg(t, PRESS_T.down, PRESS_T.contact)));
  if (t < PRESS_T.flat) return lerp(top4, LINE_Y - SQ, ss(seg(t, PRESS_T.contact, PRESS_T.flat)));
  if (t < PRESS_T.lift) return LINE_Y - SQ;
  return lerp(LINE_Y - SQ, PLATEN_REST, ss(seg(t, PRESS_T.lift, PRESS_T.up)));
}

function loopState(t) {
  const s = {
    key: { press: 1, latch: 1 },
    gang: null, theta: null, arm: { wrist: ARM_REST, active: 0, o: JAW_CLOSED, slide: 0 }, carry: null,
    stack: null, squash: null, flat: null, incoming: null,
    tags: [], pb: platenBottom(t), pressLit: 0, trayOff: 0, newest: t >= SLIDE[1], oldTop: 0,
    glows: [], dusts: [], plates: null, lamp: LAMP_REVIEW,
  };

  // the work
  if (t < FEED_PRESS[0]) {
    const x = lerp(X_ENTRY, X_REVIEW, ss(seg(t, FEED_IN[0], FEED_IN[1])));
    s.stack = { x, n: t >= LAY ? 4 : 3 };
  } else if (t < PRESS_T.contact) {
    s.stack = { x: lerp(X_REVIEW, X_PRESS, ss(seg(t, FEED_PRESS[0], FEED_PRESS[1]))), n: 4 };
  } else if (t < PRESS_T.flat) {
    s.squash = ss(seg(t, PRESS_T.contact, PRESS_T.flat));
  } else if (t < SLIDE[1]) {
    s.flat = lerp(X_PRESS, X_TRAY, ss(seg(t, SLIDE[0], SLIDE[1])));
  }
  // the last result goes dim while the new one slides over to it, so the hold stays still
  s.oldTop = 1 - ss(seg(t, SLIDE[0], SLIDE[1]));
  if (t >= SEAM) {
    s.trayOff = SQ * indexEase(seg(t, SEAM, SEAM + 0.18));
    s.incoming = { rise: easeOut(seg(t, SEAM, T)) };
  }
  s.lamp = LAMP_REVIEW + (LAMP_PRESS - LAMP_REVIEW) * ss(seg(t, FEED_PRESS[0], FEED_PRESS[1]))
    + (LAMP_TRAY - LAMP_PRESS) * ss(seg(t, SLIDE[0], SLIDE[1]))
    - (LAMP_TRAY - LAMP_REVIEW) * ss(seg(t, SEAM, T));
  // the bin's share of the lamp: some while the press works, full at the payoff, eased out over the
  // whole seam (a smoothstep, so it never snaps)
  s.trayLight = 0.3 * ss(seg(t, FEED_PRESS[0], FEED_PRESS[1])) + 0.7 * ss(seg(t, SLIDE[0], SLIDE[1])) - ss(seg(t, SEAM, T));
  s.pressLit = ss(seg(t, FEED_PRESS[0] + 0.1, PRESS_T.down)) - ss(seg(t, PRESS_T.up - 0.12, SLIDE[1]));

  // round 1: the gang head drops on a stiff spring, runs its tips out, ripples them across the
  // stack, runs them back in, then lifts out as one piece
  if (t >= GANG_IN && t < GANG_OUT[1]) {
    const yOff = -GANG_HIDE * (1 - springStep(t - GANG_IN, 0.78, 13)) - GANG_HIDE * ss(seg(t, GANG_OUT[0], GANG_OUT[1]));
    const ext = [];
    for (let i = 0; i < N_TIPS; i++) {
      const a = tipT(i);
      ext.push(HOVER * (ss(seg(t, a, a + 0.07)) - easeIn(seg(t, a + 0.13, a + 0.19))));
    }
    const stow = TIP_STOW * (1 - easeOut(seg(t, TIPS_OUT[0], TIPS_OUT[1])) + easeIn(seg(t, TIPS_IN[0], TIPS_IN[1])));
    s.gang = { yOff, ext, stow };
  }
  const top3 = topPt(X_REVIEW, 3)[1];
  for (let i = 0; i < N_TIPS; i++) s.glows.push({ x: TIP_X(i), y: top3, u: (t - tipT(i) - 0.07) / 0.12, r: 20, color: P.paper });

  // findings: a tag springs onto its peg just after its tip touches
  for (const f of FINDINGS) {
    const c = tipT(f.tip) + 0.1;
    if (t < c) continue;
    const tau = t - c;
    let ang = -1.2 * (1 - springStep(tau, 0.3, 22));
    let alpha = clamp01(tau / 0.05), deadU = 0, dy = 0, dx = 0;
    const readU = Math.max(0, 1 - Math.abs(t - f.read - 0.08) / 0.18);
    if (f.drop !== undefined && t >= f.drop) {
      const v = t - f.drop;
      deadU = clamp01(v / 0.12);
      // lifts off the peg, then falls clear of the rail to the bench (refuted: nothing to fix)
      dy = v < 0.1 ? -10 * Math.sin((v / 0.1) * Math.PI) : Math.min(0.5 * 3600 * (v - 0.1) * (v - 0.1), RAIL_HIDE + 60 - pegY(f.sheet));
      ang += 2.4 * Math.max(0, v - 0.08);
      // it swings backward off the peg (deeper, so up and right on screen), behind the tags below it
      const back = 60 * easeOut(seg(v, 0.04, 0.3));
      dx = D.x * back;
      dy += D.y * back;
      alpha *= 1 - clamp01((v - 0.32) / 0.2);
    }
    if (f.clear !== undefined && t >= f.clear) {
      const v = seg(t, f.clear, f.clear + 0.18);
      ang -= 1.3 * easeIn(v);
      alpha *= 1 - easeIn(v);
    }
    if (alpha > 0) s.tags.push({ k: f.sheet, ang, alpha, deadU, dy, dx, readU });
    if (f.drop !== undefined) s.dusts.push({ x: PEG_X, y: pegY(f.sheet) + 4, tau: t - f.drop, seed: 0x2d1, o: { ang: Math.PI * 0.6, spread: 1.2, n: 6, dur: 0.35 } });
  }

  // Claude's arm
  if (t >= ARM_KEYS[0][0] && t < ARM_KEYS[ARM_KEYS.length - 1][0]) s.arm.wrist = track(t, ARM_KEYS);
  s.arm.active = ss(seg(t, 2.1, 2.4)) - ss(seg(t, ARM_HOME[0], ARM_HOME[1] + 0.12));
  // jaws open to the sheet's thickness for the fix sheet, the lower finger slips out from under it
  // on the stack, then the jaws close on the way home
  const home = ss(seg(t, ARM_HOME[0] + 0.04, ARM_HOME[1] - 0.04));
  s.arm.o = JAW_CLOSED + (JAW_SHEET - JAW_CLOSED) * ss(seg(t, OPEN_JAW[0], OPEN_JAW[1]))
    + 8 * easeOut(seg(t, SLIP[1], SLIP[1] + 0.06)) - (JAW_SHEET + 8 - JAW_CLOSED) * home;
  s.arm.slide = ss(seg(t, OPEN_JAW[0] + 0.04, OPEN_JAW[1] - 0.02)) - ss(seg(t, FINGER_IN[0], FINGER_IN[1]))
    + easeIn(seg(t, SLIP[0], SLIP[1])) - home;
  for (const f of FINDINGS) {
    s.glows.push({ x: READ_X - JAW, y: tagMid(f.sheet), u: (t - f.read) / 0.12, r: 18, color: P.bright });
    if (f.fix) {
      s.glows.push({ x: X_REVIEW + JIT[f.sheet] + SW / 2 + 2, y: sheetMid(f.sheet), u: (t - f.fix) / 0.12, r: 34, color: P.bright });
      s.dusts.push({ x: X_REVIEW + JIT[f.sheet] + SW / 2 + 4, y: sheetMid(f.sheet), tau: t - f.fix, seed: 0x3a0 + f.sheet, o: { ang: -0.25, spread: 1.6, n: 7, dur: 0.4 } });
    }
  }
  // the fix sheet on its lift, then in the arm
  s.fix = { rise: ss(seg(t, FS_RISE[0], FS_RISE[1])), pad: ss(seg(t, FS_RISE[0], FS_RISE[1])) - ss(seg(t, PAD_DOWN[0], PAD_DOWN[1])), on: t < PICK_T };
  if (t >= PICK_T && t < LAY) s.carry = { drop: JAW_FINGER * easeIn(seg(t, SLIP[0], SLIP[1])) };
  s.glows.push({ x: X_REVIEW + JIT[3] + SW / 2 - 8, y: LINE_Y - 3 * SH, u: (t - LAY) / 0.12, r: 30, color: P.bright });
  s.dusts.push({ x: X_REVIEW - SW / 2 + 6, y: LINE_Y - 3 * SH - 2, tau: t - LAY, seed: 0x5e1, o: { ang: Math.PI * 1.1, spread: 1.0, n: 8, dur: 0.45 } });

  // rerun: one fresh steel tip swings in, touches the new head, the rail stays empty
  if (t >= RERUN.in && t < RERUN.gone) {
    // swings down out of the housing from flat behind it, and back up to stow
    s.theta = lerp(TH_STOW_R, TH_B, ss(seg(t, RERUN.in, RERUN.touch))) + (TH_STOW_R - TH_B) * ss(seg(t, RERUN.out, RERUN.gone));
  }
  s.glows.push({ x: PB[0], y: PB[1], u: (t - RERUN.touch) / 0.12, r: 24, color: P.paper });

  // squash
  const fl = t - PRESS_T.flat + 0.04;
  s.dusts.push({ x: X_PRESS - SW / 2 - 2, y: LINE_Y - 12, tau: fl, seed: 0x7a1, o: { ang: Math.PI * 1.05, spread: 0.9, n: 12, dur: 0.5 } });
  s.dusts.push({ x: X_PRESS + SW / 2 + 2, y: LINE_Y - 12, tau: fl, seed: 0x7a2, o: { ang: -0.05, spread: 0.9, n: 12, dur: 0.5 } });
  return s;
}

// Opener (reel only). Ends exactly on loopState(0).
const OP = {
  rise: [0.1, 0.9],
  review: { in: 1.1, touch: 1.62, out: 2.02, gone: 2.42 },
  gIn: 3.95, tipsOut: [4.3, 4.52], press: [4.95, 5.1], latch: 5.06, tipsIn: [5.95, 6.13], gOut: [6.13, 6.5],
};
function openerState(t) {
  const s = loopState(0);
  s.glows = [];
  s.dusts = [];
  // (a) a PR rises and gets a Codex review on its own: the key stays up
  s.key = { press: indexEase(seg(t, OP.press[0], OP.press[1])), latch: t >= OP.latch ? springStep(t - OP.latch, 0.6, 24) : 0 };
  s.stack = null;
  if (t < OP.rise[1]) s.incoming = { rise: easeOut(seg(t, OP.rise[0], OP.rise[1])) };
  else s.stack = { x: X_ENTRY, n: 3 };
  const R = OP.review;
  let reviewPlate = 0;
  if (t >= R.in && t < R.gone) {
    s.theta = lerp(TH_STOW_L, TH_A, ss(seg(t, R.in, R.touch))) + (TH_STOW_L - TH_A) * ss(seg(t, R.out, R.gone));
    reviewPlate = easeOut(seg(t, R.in + 0.15, R.in + 0.4)) * (1 - easeIn(seg(t, R.out, R.out + 0.2)));
  }
  s.glows.push({ x: PA[0], y: PA[1], u: (t - R.touch) / 0.12, r: 24, color: P.paper });
  // (b) the review layers, then the person's key
  if (t >= OP.gIn && t < OP.gOut[1]) {
    s.gang = {
      yOff: -GANG_HIDE * (1 - springStep(t - OP.gIn, 0.78, 11)) - GANG_HIDE * ss(seg(t, OP.gOut[0], OP.gOut[1])),
      ext: null,
      stow: TIP_STOW * (1 - easeOut(seg(t, OP.tipsOut[0], OP.tipsOut[1])) + easeIn(seg(t, OP.tipsIn[0], OP.tipsIn[1]))),
    };
  }
  s.plates = {
    review: reviewPlate,
    full: easeOut(seg(t, OP.gIn + 0.2, OP.gIn + 0.45)) * (1 - easeIn(seg(t, OP.tipsIn[0] - 0.1, OP.tipsIn[0] + 0.1))),
    sol: easeOut(seg(t, OP.gIn + 0.35, OP.gIn + 0.65)) * (1 - easeIn(seg(t, OP.gOut[0] + 0.05, OP.gOut[0] + 0.35))),
  };
  s.lamp = lerp(640, LAMP_REVIEW, ss(seg(t, OP.gIn - 0.3, OP.gIn + 0.5)));
  s.trayLight = 0;
  return s;
}

// ---------------------------------------------------------------------------------------------
// Frame.

// Build every sprite the first time a scale is seen, so no part costs a hitch when it first enters.
function warm(ctx) {
  const m = ctx.getTransform();
  const sc = Math.hypot(m.a, m.b) || 1;
  if (sc === warmScale) return;
  warmScale = sc;
  warming = true;
  const s = loopState(0);
  s.pressLit = 0;
  s.gang = { yOff: 0, ext: null, stow: 0 };
  s.newest = true;
  s.oldTop = 0;
  s.flat = X_TRAY;
  s.tags = [{ k: 0, ang: 0, alpha: 1, deadU: 0.5, dy: 0, dx: 0, readU: 0.5 }];
  s.key = { press: 1, latch: 1 };
  // drawn into a 1 px scratch canvas at the same scale: only the caches are touched
  const c = new OffscreenCanvas(1, 1).getContext('2d');
  c.scale(sc, sc);
  frameParts(c, s);
  for (let n = 3; n <= 4; n++) stackSprite(c, n, X_REVIEW);
  oneSheet(c, X_REVIEW, LINE_Y);
  fixLift(c, 1, true, 1);
  warming = false;
  setLod(ctx);
}

function frame(ctx, s) {
  setLod(ctx);
  warm(ctx);
  frameParts(ctx, s);
}

function frameParts(ctx, s) {
  cached(ctx, 'merge-back', backLayer);
  // the press lights up while it works
  sprite(ctx, 'merge-press-lit', PRESS_BOX, (c) => pressFrame(c, PRESS_LIT, '#4f6f57'), 0, 0, s.pressLit);
  lamp(ctx, s.lamp);

  // the tags hang on the rail behind the work; a refuted one drops off backward, behind the others
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, RAIL_HIDE);
  ctx.clip();
  for (const g of s.tags) if (g.deadU) tagShape(ctx, PEG_X + g.dx, pegY(g.k) + g.dy, g.ang, g.alpha, g.deadU, g.readU);
  for (const g of s.tags) if (!g.deadU) tagShape(ctx, PEG_X, pegY(g.k), g.ang, g.alpha, 0, g.readU);
  ctx.restore();

  // tray: dim pile, the last result on top, then the whole bin dims with distance from the lamp
  ctx.save();
  // the well clips the pile; above the well the arriving sheet is not cut
  poly(ctx, [[TRAY_X0 + TRAY_WALL, LINE_Y - 200], [W, LINE_Y - 200], [W, LINE_Y], [TRAY_X1 - TRAY_WALL, LINE_Y], [TRAY_X1 - TRAY_WALL, TRAY_BOT - TRAY_WALL], [TRAY_X0 + TRAY_WALL, TRAY_BOT - TRAY_WALL]]);
  ctx.clip();
  sprite(ctx, 'merge-pile', [X_TRAY - SW / 2 - 4, LINE_Y - 36, X_TRAY + SW / 2 + D.x * SDEP + 6, LINE_Y + 7 * SQ + 4], (c) => {
    for (let k = 1; k <= 7; k++) sheet(c, X_TRAY, LINE_Y + k * SQ, SQ, { top: false, dim: 0.72 });
  }, 0, s.trayOff % SQ);
  const dark = 0.62 * (1 - s.trayLight);
  if (dark > 0) {
    ctx.fillStyle = `rgba(4,6,5,${dark.toFixed(4)})`;
    ctx.fillRect(TRAY_X0, LINE_Y, TRAY_X1 - TRAY_X0, TRAY_BOT - LINE_Y);
  }
  // the previous result fades into the dim pile while the new one slides over (continuous)
  flatSheet(ctx, X_TRAY, LINE_Y + SQ + s.trayOff, s.oldTop, dark);
  if (s.newest) flatSheet(ctx, X_TRAY, LINE_Y + s.trayOff, 1, dark);
  ctx.restore();
  if (s.flat !== null) {
    // its shadow fades as it leaves the bed for the well, gone when it lands
    contactShadow(ctx, s.flat + 30, LINE_Y - 6, 150, 12, 0.35 * (1 - ss(seg(s.flat, X_TRAY - 170, X_TRAY))));
    flatSheet(ctx, s.flat, LINE_Y);
  }

  if (s.stack) {
    contactShadow(ctx, s.stack.x + 30, LINE_Y - 8, 150, 12, 0.4);
    stackSprite(ctx, s.stack.n, s.stack.x);
  }
  if (s.squash !== null) {
    const q = s.squash;
    const th = lerp(SH, SQ / 4, q);
    contactShadow(ctx, X_PRESS + 30, LINE_Y - 8, 150, 12, 0.4);
    for (let k = 0; k < 4; k++) sheet(ctx, X_PRESS + JIT[k] * (1 - q), LINE_Y - k * th, th, { seam: q < 0.97 });
  }
  if (s.incoming && s.incoming.rise > 0) {
    // the next PR rises out of the feed lift; the bed top hides what is still below it
    const dy = (1 - s.incoming.rise) * RISE;
    contactShadow(ctx, X_ENTRY + 30, LINE_Y - 8, 150, 12, 0.4 * s.incoming.rise);
    if (dy > 0.25) fromHatch(ctx, X_ENTRY, dy - 3 * SH, () => stackSprite(ctx, 3, X_ENTRY, dy));
    else stackSprite(ctx, 3, X_ENTRY, dy);
  }

  // the fix sheet's lift
  if (s.fix.rise > 0 || s.fix.pad > 0) fixLift(ctx, s.fix.rise, s.fix.on, s.fix.pad);

  // Codex tools come out of the housing
  if (s.gang) gangHead(ctx, s.gang.yOff, s.gang.ext, s.gang.stow);
  let tipPos = null;
  if (s.theta !== null) tipPos = swingArm(ctx, s.theta);
  cached(ctx, 'merge-front', frontLayer);

  // press: ram, then the platen; the platen's shadow falls on the work as it closes
  const dP = s.pb - PLATEN_REST;
  sprite(ctx, 'merge-ram', RAM_BOX, (c) => ramDraw(c, PRESS_IDLE, P.dim), 0, dP);
  sprite(ctx, 'merge-ram-lit', RAM_BOX, (c) => ramDraw(c, PRESS_LIT, '#4f6f57'), 0, dP, s.pressLit);
  let workTop = null;
  if (s.stack && s.stack.x > X_PRESS - 60) workTop = LINE_Y - 4 * SH;
  else if (s.squash !== null) workTop = s.pb;
  else if (s.flat !== null && s.flat < X_PRESS + 60) workTop = LINE_Y - SQ;
  if (workTop !== null) contactShadow(ctx, X_PRESS + 26, workTop - 14, 125, 13, 0.5 * clamp01(1 - (workTop - s.pb) / 70));
  sprite(ctx, 'merge-platen', PLATEN_BOX, (c) => platenDraw(c, PRESS_IDLE), 0, dP);
  sprite(ctx, 'merge-platen-lit', PLATEN_BOX, (c) => platenDraw(c, PRESS_LIT), 0, dP, s.pressLit);

  // the fix sheet, carried by its edge, then laid
  const w = s.arm.wrist;
  if (s.carry) oneSheet(ctx, w[0] - SW / 2, w[1] + SH / 2 + s.carry.drop);
  const a = s.arm;
  if (a.active <= 0 && a.slide <= 0 && a.o === JAW_CLOSED && w === ARM_REST) {
    sprite(ctx, 'merge-arm-rest', ARM_BOX, (c) => armDraw(c, ARM_REST, 0, JAW_CLOSED, 0));
  } else armDraw(ctx, w, a.active, a.o, a.slide);

  // the cached key only at rest, so the latch's designed overshoot still plays
  if (Math.abs(s.key.press - 1) < 1e-6 && Math.abs(s.key.latch - 1) < 1e-6) {
    sprite(ctx, 'merge-key', KEY_BOX, (c) => keyDraw(c, 1, 1, false));
    keyLegend(ctx, 1);
  } else keyDraw(ctx, s.key.press, s.key.latch);

  lampFalloff(ctx, s.lamp, 600, 400, 1260, 0.58);

  for (const g of s.glows) contactGlow(ctx, g.x, g.y, g.u, g.r, g.color);
  for (const d of s.dusts) dust(ctx, d.x, d.y, d.tau, d.seed, d.o);

  if (s.plates) {
    const p = s.plates;
    if (p.review > 0 && tipPos) {
      const mx = lerp(PIV_X, tipPos[0], 0.42), my = lerp(PIV_Y, tipPos[1], 0.42);
      makerPlate(ctx, '/codex-review', mx - 130, my, p.review);
    }
    if (p.full > 0 && s.gang) makerPlate(ctx, '/codex-fullreview', GANG_CX, BAR_Y + s.gang.yOff + BAR_H / 2, p.full);
    makerPlate(ctx, 'Latest Sol', (HOUSE.x0 + HOUSE.x1) / 2 - 40, (HOUSE.y0 + HOUSE.y1) / 2 - 2, p.sol);
  }

  grainOver(ctx, 0.3, 'soft-light');
}

const CAPTION = 'Every PR goes through the Codex loop and merges when clean';

export default {
  id: 'merge',
  name: '/merge',
  caption: CAPTION,
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
    // [from, to] is the time each line stays fully readable; the reel fades it in before and out after
    captions: [
      { from: 0.45, to: 4.1, name: '', line: 'Every PR from Claude Code gets a Codex review' },
      { from: 4.5, to: OPENER, name: '/merge', line: CAPTION },
    ],
  },
};
