import { W, H, BENCH_Y, C, F, seg, lerp, easeOut, easeIn, easeInOut, rng, bench, blank, part, key, contact, plate, note } from '../kit.js';

// /merge animatic (pitch A 3.1 with BRIEF grafts 1 to 3).
// Transfer line: entry, review station (steel gang head, tag rail, green session arm, single steel tip),
// CI gantry with four flags, squash press, main tray sunk into the bench.

const T = 10.0;
const TOP = 220; // caption band ends here; scene draws only below it

const KEY_X = 140;
const X_ENTRY = 360, X_REVIEW = 640, X_PRESS = 1380, X_TRAY = 1720;
const SW = 220, PITCH = 40, TH = 34; // PR sheets
const SQ = 52, SQ_P = 56; // squashed sheet and tray pitch
const RAIL_X = 790;
const ARM_PIVOT = [940, 340];
const PEND = [640, 200]; // rerun tip pivot, hidden above the band
const PEND_L = 445; // reaches the top of the four-sheet stack
const FLAG_X = [1070, 1110, 1150, 1190];
const PLATEN_REST = 600;

// ---------- local helpers ----------

// Index: 140 ms click with 4% overshoot, then settle.
const idx = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u < 0.6 ? 1.04 * easeOut(u / 0.6) : 1.04 - 0.04 * easeInOut((u - 0.6) / 0.4));
const rad = (d) => (d * Math.PI) / 180;

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

// Inverse of easeInOut by bisection (monotone), for flag flip timing.
function invEase(v) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 28; i++) {
    const m = (lo + hi) / 2;
    if (easeInOut(m) < v) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

// One thin sheet (commit): ivory, clipped top-right corner, registration hole.
function sheet(ctx, cx, yb, th, alpha = 1, sc = 1) {
  if (alpha <= 0) return;
  const w = SW * sc, h = th * sc, x = cx - w / 2, y = yb - h;
  const c = Math.min(14, h * 0.45);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = C.ivory;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.benchTop;
  ctx.beginPath();
  ctx.arc(x + w * 0.14, y + h / 2, Math.max(2, Math.min(8, h * 0.3)), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function stack(ctx, cx, n, alpha = 1, sc = 1) {
  for (let i = 0; i < n; i++) sheet(ctx, cx, BENCH_Y - i * PITCH * sc, TH, alpha, sc);
}

const sheetMidY = (i) => BENCH_Y - i * PITCH - TH / 2;

// ---------- timing tables ----------

// Round 1 gang head: drop 0.70 to 1.15, tip ripple 120 ms apart, lift 1.85 to 2.20.
const RIPPLE0 = 1.15, RIPPLE_DT = 0.12;
const tipStart = (i) => RIPPLE0 + i * RIPPLE_DT;
const tipContact = (i) => tipStart(i) + 0.06;
const TIP_X = (i) => 548 + i * 36.8;
// Tips 1, 3, 4 find something; tags hang at the height of the sheet the finding is in.
const FINDINGS = [
  { tip: 1, sheet: 2, read: 2.40, fate: 'refuted', go: 2.56 },
  { tip: 3, sheet: 0, read: 2.72, fix: 2.92, go: 2.96 },
  { tip: 4, sheet: 1, read: 3.18, fix: 3.36, go: 3.40 },
];

const ARM_REST = [940, 470];
const ARM_KEYS = [
  [2.20, 940, 470],
  [2.40, 850, sheetMidY(2)],
  [2.56, 850, sheetMidY(2)],
  [2.72, 850, sheetMidY(0)],
  [2.80, 850, sheetMidY(0)],
  [2.92, 754, sheetMidY(0)],
  [3.04, 754, sheetMidY(0)],
  [3.18, 850, sheetMidY(1)],
  [3.24, 850, sheetMidY(1)],
  [3.36, 754, sheetMidY(1)],
  [3.46, 754, sheetMidY(1)],
  [3.62, 750, 590],
  [3.72, 750, BENCH_Y - 3 * PITCH - TH],
  [3.80, 750, BENCH_Y - 3 * PITCH - TH],
  [4.00, 940, 470],
];
const LAY = 3.72;

// CI flags flip as the stack centre passes each mast during the 5.0 to 6.0 feed.
const FLAG_T = FLAG_X.map((fx) => 5.0 + invEase((fx - X_REVIEW) / (X_PRESS - X_REVIEW)));

// ---------- instruments ----------

function drawGang(ctx, yOff, ext, plateAlpha) {
  if (yOff <= -480) return;
  ctx.save();
  ctx.translate(0, yOff);
  // hanger up into the band (clipped)
  stroke(ctx, [640, 575, 640, 100], C.steel, 4);
  part(ctx, 510, 575, 260, 40, 'steel');
  for (let i = 0; i < 6; i++) {
    const x = TIP_X(i), e = ext ? ext[i] : 0;
    const end = 665 + e;
    stroke(ctx, [x, 615, x, end - 16], C.steel, 4);
    const kind = i % 3;
    ctx.save();
    ctx.strokeStyle = C.steel;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (kind === 0) {
      ctx.moveTo(x - 10, end - 16); ctx.lineTo(x, end); ctx.lineTo(x + 10, end - 16); ctx.closePath();
    } else if (kind === 1) {
      ctx.rect(x - 10, end - 16, 20, 16);
    } else {
      ctx.arc(x, end - 8, 9, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }
  if (plateAlpha > 0) plate(ctx, '/codex-fullreview', 640, 538, plateAlpha);
  ctx.restore();
}

function drawPendulum(ctx, thetaDeg, plateAlpha) {
  const a = rad(thetaDeg);
  const tx = PEND[0] + PEND_L * Math.cos(a), ty = PEND[1] + PEND_L * Math.sin(a);
  stroke(ctx, [PEND[0], PEND[1], tx, ty], C.steel, 6);
  // tip: a pointed cone along the rod
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  ctx.save();
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(tx - ux * 26 + nx * 12, ty - uy * 26 + ny * 12);
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx - ux * 26 - nx * 12, ty - uy * 26 - ny * 12);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  if (plateAlpha > 0) plate(ctx, '/codex-review', tx, ty + 56, plateAlpha);
}

function drawArm(ctx, tip) {
  // housing (session: hatched) on a dim column behind the line
  stroke(ctx, [ARM_PIVOT[0], ARM_PIVOT[1], ARM_PIVOT[0], BENCH_Y], C.dim, 4);
  part(ctx, 900, 280, 80, 60, 'session');
  const dx = tip[0] - ARM_PIVOT[0], dy = tip[1] - ARM_PIVOT[1];
  const len = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(ARM_PIVOT[0], ARM_PIVOT[1]);
  ctx.rotate(Math.atan2(dy, dx));
  part(ctx, 0, -12, len, 24, 'session');
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(tip[0], tip[1], 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTag(ctx, yc, appear, dropY, alpha, dimmed) {
  if (appear <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  const col = dimmed ? C.dim : C.amber;
  if (dropY === 0) stroke(ctx, [RAIL_X, yc - 14, RAIL_X + 22, yc - 14], col, 4);
  const h = 28 * appear;
  const x = RAIL_X + 12, y = yc - 14 + dropY;
  ctx.fillStyle = col;
  ctx.globalAlpha *= 0.35;
  ctx.fillRect(x, y, 44, h);
  ctx.globalAlpha /= 0.35;
  ctx.strokeStyle = col;
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, 44, h);
  ctx.restore();
}

function drawFlags(ctx, t) {
  // gantry
  stroke(ctx, [1030, BENCH_Y, 1030, 520, 1230, 520, 1230, BENCH_Y], C.dim, 4);
  const reset = idx(seg(t, 9.2, 9.34));
  for (let j = 0; j < 4; j++) {
    let f = lerp(-1, 1, idx(seg(t, FLAG_T[j], FLAG_T[j] + 0.14)));
    if (t >= 9.2) f = lerp(1, -1, reset);
    const mx = FLAG_X[j];
    stroke(ctx, [mx, 520, mx, 466], C.dim, 4);
    const w = 28 * f;
    ctx.save();
    if (f >= 0) {
      ctx.fillStyle = C.green;
      ctx.fillRect(mx, 466, w, 24);
    } else {
      ctx.strokeStyle = C.dim;
      ctx.lineWidth = 4;
      ctx.strokeRect(mx + w, 466, -w, 24);
    }
    ctx.restore();
  }
}

function platenBottom(t) {
  const top4 = BENCH_Y - 3 * PITCH - TH;
  if (t < 6.0 || t >= 6.95) return PLATEN_REST;
  if (t < 6.3) return lerp(PLATEN_REST, top4, easeInOut(seg(t, 6.0, 6.3)));
  if (t < 6.5) return lerp(top4, BENCH_Y - SQ, easeInOut(seg(t, 6.3, 6.5)));
  if (t < 6.62) return BENCH_Y - SQ;
  return lerp(BENCH_Y - SQ, PLATEN_REST, easeIn(seg(t, 6.62, 6.95)));
}

function drawPress(ctx, t) {
  stroke(ctx, [1250, BENCH_Y, 1250, 300], C.dim, 4);
  stroke(ctx, [1510, BENCH_Y, 1510, 300], C.dim, 4);
  part(ctx, 1250, 290, 260, 60, 'fresh');
  const pb = platenBottom(t);
  stroke(ctx, [X_PRESS, 350, X_PRESS, pb - 30], C.green, 6);
  part(ctx, 1260, pb - 30, 240, 30, 'fresh');
}

function drawTray(ctx, t) {
  const x0 = 1600, x1 = 1840, depth = 230;
  ctx.save();
  ctx.fillStyle = C.ground;
  ctx.fillRect(x0, BENCH_Y + 2, x1 - x0, depth);
  ctx.restore();
  stroke(ctx, [x0, BENCH_Y, x0, BENCH_Y + depth, x1, BENCH_Y + depth, x1, BENCH_Y], C.dim, 4);
  // pile, clipped to the well (and the slot just above it for the newest sheet)
  const d = SQ_P * idx(seg(t, 9.2, 9.34));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 + 2, BENCH_Y - SQ_P, x1 - x0 - 4, depth + SQ_P - 2);
  ctx.clip();
  const first = t >= 7.6 ? -1 : 0;
  for (let k = first; k <= 5; k++) {
    const yb = BENCH_Y + (k + 1) * SQ_P + d;
    if (yb - SQ < BENCH_Y + depth) sheet(ctx, X_TRAY, yb, SQ); // only what shows in the well
  }
  ctx.restore();
}

// ---------- the frame ----------

function render(ctx, t, ov) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, TOP, W, H - TOP);
  ctx.clip();

  bench(ctx);
  drawTray(ctx, t);

  // fixtures behind the line
  stroke(ctx, [RAIL_X, BENCH_Y, RAIL_X, 640], C.dim, 4);
  drawFlags(ctx, t);
  drawPress(ctx, t);

  // arm (drawn before the work so the sheet it carries sits in front of the bar)
  const arm = t >= 2.2 && t < 4.0 ? track(t, ARM_KEYS) : ARM_REST;
  drawArm(ctx, arm);

  // ---- the work ----
  if (t < 6.0) {
    let x = X_REVIEW;
    if (t < 0.7) x = lerp(X_ENTRY, X_REVIEW, easeInOut(seg(t, 0, 0.7)));
    else if (t >= 5.0) x = lerp(X_REVIEW, X_PRESS, easeInOut(seg(t, 5.0, 6.0)));
    stack(ctx, x, t >= LAY ? 4 : 3);
  } else if (t < 6.5) {
    const q = t < 6.3 ? 0 : easeInOut(seg(t, 6.3, 6.5));
    const Hc = lerp(3 * PITCH + TH, SQ, q);
    const r = lerp(TH / PITCH, 1, q);
    const p = Hc / (3 + r);
    for (let i = 0; i < 4; i++) sheet(ctx, X_PRESS, BENCH_Y - i * p, p * r);
  } else if (t < 7.6) {
    const x = t < 7.0 ? X_PRESS : lerp(X_PRESS, X_TRAY, easeOut(seg(t, 7.0, 7.6)));
    sheet(ctx, x, BENCH_Y, SQ);
  }
  // next PR feeds in at the seam (replacement: it becomes the t = 0 stack)
  if (t >= 9.2) {
    const u = easeInOut(seg(t, 9.2, 10.0));
    stack(ctx, lerp(-240, X_ENTRY, u), 3, u, lerp(0.9, 1, u));
  }
  // fix sheet carried by the arm
  if (t >= 3.56 && t < LAY) {
    const a = seg(t, 3.56, 3.66);
    sheet(ctx, arm[0] - SW / 2, arm[1] + TH, TH, a, lerp(0.9, 1, a));
  }

  // tags on the rail
  for (const f of FINDINGS) {
    const yc = sheetMidY(f.sheet);
    const tc = tipContact(f.tip);
    const appear = idx(seg(t, tc, tc + 0.14));
    if (t < tc) continue;
    if (f.fate === 'refuted') {
      const u = seg(t, f.go, f.go + 0.36);
      drawTag(ctx, yc, appear, (BENCH_Y - 30 - yc) * easeIn(u), 1 - u, u > 0);
    } else {
      const u = seg(t, f.go, f.go + 0.2);
      drawTag(ctx, yc, appear, 0, 1 - u, u > 0);
    }
  }

  // round 1 gang head (or opener override)
  let gangY = -500, ext = null, gangPlate = 0;
  if (ov) {
    gangY = ov.gangY; gangPlate = 1;
  } else if (t >= 0.7 && t < 2.2) {
    gangY = lerp(-500, 0, easeOut(seg(t, 0.7, 1.15))) - 500 * easeIn(seg(t, 1.85, 2.2));
    ext = [];
    for (let i = 0; i < 6; i++) {
      const s = tipStart(i);
      ext.push(20 * (easeInOut(seg(t, s, s + 0.06)) - easeIn(seg(t, s + 0.14, s + 0.2))));
    }
  }
  drawGang(ctx, gangY, ext, gangPlate);

  // rerun: one steel tip swings in, touches once, leaves no tag
  let theta = 200, tipPlate = 0;
  if (ov) {
    theta = ov.theta; tipPlate = 1;
  } else if (t >= 4.0 && t < 5.0) {
    theta = lerp(200, 90, easeOut(seg(t, 4.0, 4.45))) + 110 * easeIn(seg(t, 4.65, 5.0));
  }
  if (theta < 199.5) drawPendulum(ctx, theta, tipPlate);

  // the person's key: latched for the whole loop
  key(ctx, KEY_X, BENCH_Y, ov ? ov.keyPress : 1, '/merge');

  // contacts
  if (!ov) {
    for (let i = 0; i < 6; i++) contact(ctx, TIP_X(i), BENCH_Y - 2 * PITCH - TH, seg(t, tipContact(i), tipContact(i) + 0.12));
    for (const f of FINDINGS) {
      contact(ctx, 850, sheetMidY(f.sheet), seg(t, f.read, f.read + 0.12));
      if (f.fix) contact(ctx, 754, sheetMidY(f.sheet), seg(t, f.fix, f.fix + 0.12));
    }
    contact(ctx, 750, BENCH_Y - 3 * PITCH - TH, seg(t, LAY, LAY + 0.12));
    contact(ctx, X_REVIEW, BENCH_Y - 3 * PITCH - TH, seg(t, 4.45, 4.57));
    contact(ctx, X_PRESS, BENCH_Y - 3 * PITCH - TH, seg(t, 6.3, 6.42));
  }

  ctx.restore();
}

function beat(t) {
  if (t < 0.7) return 'feed: stack to review';
  if (t < 2.2) return 'fresh: round 1 gang head, findings hang as tags';
  if (t < 4.0) return 'engage: arm verifies, one tag refuted, two fixed, fix sheet laid';
  if (t < 5.0) return 'fresh: rerun, single tip, no tag';
  if (t < 6.0) return 'feed and index: CI flags';
  if (t < 7.0) return 'engage: squash';
  if (t < 7.6) return 'settle: into tray';
  if (t < 9.2) return 'hold';
  return 'feed (seam): tray indexes, next PR in';
}

export default {
  id: 'merge',
  name: '/merge',
  caption: 'every PR goes through the Codex loop and merges when clean',
  period: T,
  draw(ctx, t) {
    render(ctx, t, null);
    note(ctx, beat(t));
  },
  opener: {
    duration: 3.0,
    draw(ctx, t) {
      // Gang head lowers with its plate, the single tip swings in with its plate,
      // the key presses and latches, then both Codex tools leave so the loop starts at its t = 0 pose.
      const gangY = lerp(-500, 0, easeOut(seg(t, 0.0, 0.5))) - 500 * easeIn(seg(t, 2.3, 2.7));
      const theta = lerp(200, 55, easeOut(seg(t, 0.6, 1.05))) + 145 * easeIn(seg(t, 2.3, 2.65));
      const keyPress = idx(seg(t, 1.4, 1.54));
      render(ctx, 0, { gangY, theta, keyPress });
      note(ctx, t < 0.6 ? 'opener: /codex-fullreview' : t < 1.4 ? 'opener: /codex-review' : t < 2.3 ? 'opener: /merge latches' : 'opener: tools leave, loop t = 0 pose');
    },
  },
};
