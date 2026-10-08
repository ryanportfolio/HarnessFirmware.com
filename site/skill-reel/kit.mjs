// Final-fidelity kit for the skills reel: the shared look the nine scenes draw with.
// Engineering-plate instruments on one bench, seen in a shallow oblique view (cabinet projection:
// a point at depth z draws at (x + D.x * z, y + D.y * z)). Light comes from the upper left.
// Everything here is a pure function of its arguments; static layers are cached per device scale
// and render the same pixels every time, so a scene stays deterministic and seekable.

import { W, H, BENCH_Y, clamp01, lerp, seg, easeOut, easeIn, easeInOut, rng } from './base.mjs';

export { W, H, BENCH_Y, clamp01, lerp, seg, easeOut, easeIn, easeInOut, rng };

// ---------------------------------------------------------------------------------------------
// Palette. Site tokens first, then the shades the materials are built from (all mixes of them).

export const P = {
  ink: '#0f1210',
  paper: '#f3f3ec',
  green: '#53db76',
  bright: '#72f28c',
  amber: '#efc87e',
  dim: '#3e5a45',
  glow: '#a4f5ba',
};

// Oblique depth vector per unit of depth, and the bench planes.
export const D = { x: 0.42, y: -0.26 };
export const BACK_Y = BENCH_Y - 92; // back edge of the bench top
export const FLOOR = BENCH_Y - 27; // where instruments stand (their front plane)
const LIGHT = (() => { const l = Math.hypot(-0.5, -1); return { x: -0.5 / l, y: -1 / l }; })();

// Materials. front: vertical gradient on faces toward the viewer; top / side: lit and unlit
// extremes for faces seen through the depth; sil: silhouette stroke; hi: lit-edge stroke;
// line: fine interior edges; hatch: section hatching colour (session family only).
export const MAT = {
  ivory: { front: ['#f6f6ef', '#d6d7cb'], top: '#fdfdf7', side: '#a9aa9f', sil: null, hi: null, line: 'rgba(120,124,112,0.55)' },
  metal: { front: ['#1d2620', '#131915'], top: '#2e3d32', side: '#0d120f', sil: '#3e5a45', hi: '#5f8167', line: '#2b3a2f' },
  // the same dark metal under the lamp: the active station's fixtures (vice, clip)
  lit: { front: ['#2a362d', '#19211c'], top: '#43574a', side: '#111713', sil: '#4f6f57', hi: '#86a98e', line: '#34453a' },
  fresh: { front: ['#26503a', '#13281b'], top: '#3f7d52', side: '#0e1d14', sil: '#53db76', hi: '#a4f5ba', line: '#2f5c40' },
  session: { front: ['#173022', '#0e1d14'], top: '#24492f', side: '#0a150e', sil: '#53db76', hi: '#72f28c', line: '#2a4a33', hatch: '#3e5a45' },
  slat: { front: ['#18201a', '#111713'], top: '#26322a', side: '#0b0f0c', sil: '#2c3d31', hi: '#3f5a46', line: '#0a0e0b' },
};

// ---------------------------------------------------------------------------------------------
// Small maths: colour mixing, springs, eases with overshoot.

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}
export function mix(a, b, u) {
  const A = rgb(a), B = rgb(b), k = clamp01(u);
  const c = (i) => Math.round(A[i] + (B[i] - A[i]) * k).toString(16).padStart(2, '0');
  return '#' + c(0) + c(1) + c(2);
}
export function rgba(hex, a) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Step response of a damped spring (0 at tau <= 0, settles at 1). zeta < 1 overshoots once.
export function springStep(tau, zeta, omega) {
  if (tau <= 0) return 0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * tau);
  return 1 - e * (Math.cos(wd * tau) + ((zeta * omega) / wd) * Math.sin(wd * tau));
}

// Index move: a spring tuned to overshoot 4% once and settle by u = 1 (residual under 0.2%).
export function indexEase(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return springStep(u, 0.716, 9);
}

// A second-order follower of target(t) integrated from t0 at a fixed step: a pure function of t.
// Used for needles and anything that should lag, overshoot and damp.
export function follow(target, t0, t, zeta, omega, dt = 1 / 480) {
  if (t <= t0) return target(t0);
  let x = target(t0), v = 0, s = t0;
  const n = Math.ceil((t - t0) / dt);
  const h = (t - t0) / n;
  for (let i = 0; i < n; i++) {
    s += h;
    const a = omega * omega * (target(s) - x) - 2 * zeta * omega * v;
    v += a * h;
    x += v * h;
  }
  return x;
}

// ---------------------------------------------------------------------------------------------
// Level of detail. Card frames (480x270) draw silhouettes heavier and drop fine texture.

export const LOD = { pxu: 1, card: false, k: 1 };
export function setLod(ctx) {
  const m = ctx.getTransform();
  LOD.pxu = Math.hypot(m.a, m.b) || 1;
  LOD.card = LOD.pxu < 0.45;
  LOD.k = LOD.card ? 1.7 : 1;
}
export const lw = (w) => w * LOD.k;

// ---------------------------------------------------------------------------------------------
// Static layer cache: an OffscreenCanvas at device resolution per (key, scale). The layer is
// drawn with exactly the same calls every time, so output does not depend on cache state.

// Least-recently-used, bounded by bytes: a reel-scale layer is ~18 MB, a card layer under 1 MB,
// so a count cap either thrashes a page of nine cards or holds hundreds of MB at reel scale.
const layers = new Map();
const LAYER_BUDGET = 160 * 1024 * 1024;
let layerBytes = 0;
export function cached(ctx, key, draw) {
  const m = ctx.getTransform();
  const s = Math.hypot(m.a, m.b) || 1;
  const id = key + '@' + s.toFixed(5);
  let L = layers.get(id);
  if (L) {
    layers.delete(id);
    layers.set(id, L);
  } else {
    const cw = Math.max(1, Math.round(W * s)), ch = Math.max(1, Math.round(H * s));
    const cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.scale(cw / W, ch / H);
    const saved = { ...LOD };
    setLod(c);
    draw(c);
    Object.assign(LOD, saved);
    L = { cv, cw, ch, s, bytes: cw * ch * 4 };
    layers.set(id, L);
    layerBytes += L.bytes;
    for (const [k, v] of layers) {
      if (layerBytes <= LAYER_BUDGET || k === id) break;
      layers.delete(k);
      layerBytes -= v.bytes;
    }
  }
  ctx.drawImage(L.cv, 0, 0, W, H);
}

// Film grain: the site's tile (site/generate-grain.mjs: 256x256, mulberry32 seed 0x4a17c3d5,
// triangular noise around mid grey) regenerated here so no image has to load. Static, 1 device px.
let grainTile = null;
function makeGrainTile() {
  const size = 256;
  let seed = 0x4a17c3d5;
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cv = new OffscreenCanvas(size, size);
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(255, Math.round(128 + ((random() + random()) / 2 - 0.5) * 286)));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
}
export function grain(ctx, alpha = 0.06) {
  if (!grainTile) grainTile = makeGrainTile();
  cached(ctx, 'grain', (c) => {
    // undo the layer scale so the tile maps 1:1 to device pixels
    const m = c.getTransform();
    c.save();
    c.scale(1 / m.a, 1 / m.d);
    c.fillStyle = c.createPattern(grainTile, 'repeat');
    c.fillRect(0, 0, W * m.a, H * m.d);
    c.restore();
  });
  // drawn by cached() at full opacity; callers wrap with alpha, see grainOver
}
export function grainOver(ctx, alpha = 0.06, mode = 'soft-light') {
  ctx.save();
  // device-pixel grain is relatively coarser on a card, so it goes lighter there
  ctx.globalAlpha = LOD.card ? alpha * 0.45 : alpha;
  ctx.globalCompositeOperation = mode;
  grain(ctx);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Paths and texture strokes.

export function poly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

// 45 degree hatching inside the current path (call after building the path; it clips).
export function hatchPath(ctx, x0, y0, x1, y1, color, spacing = 12, width = 2) {
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw(width);
  ctx.beginPath();
  const h = y1 - y0;
  const sp = spacing * (LOD.card ? 1.6 : 1);
  for (let d = x0 - h; d < x1; d += sp) {
    ctx.moveTo(d, y1);
    ctx.lineTo(d + h, y0);
  }
  ctx.stroke();
  ctx.restore();
}

// Dash-dot centre line (drafting texture). Skipped on cards.
export function centreLine(ctx, x0, y0, x1, y1, alpha = 0.55) {
  if (LOD.card) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = 2;
  ctx.setLineDash([22, 6, 4, 6]);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

// Dimension line with slash terminators (no arrowheads) and extension lines; no figures.
export function dimension(ctx, ax, ay, bx, by, off, alpha = 0.6) {
  if (LOD.card) return;
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const pa = [ax + nx * off, ay + ny * off], pb = [bx + nx * off, by + ny * off];
  const s = Math.sign(off) || 1;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax + nx * 6 * s, ay + ny * 6 * s);
  ctx.lineTo(pa[0] + nx * 10 * s, pa[1] + ny * 10 * s);
  ctx.moveTo(bx + nx * 6 * s, by + ny * 6 * s);
  ctx.lineTo(pb[0] + nx * 10 * s, pb[1] + ny * 10 * s);
  ctx.moveTo(pa[0], pa[1]);
  ctx.lineTo(pb[0], pb[1]);
  for (const p of [pa, pb]) {
    ctx.moveTo(p[0] - 6, p[1] + 6);
    ctx.lineTo(p[0] + 6, p[1] - 6);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Solids.

// Shade for a side face with outward screen normal (nx, ny): lit when it faces the lamp.
function sideShade(mat, nx, ny) {
  const k = nx * LIGHT.x + ny * LIGHT.y; // -1..1
  return mix(mat.side, mat.top, (k + 0.45) / 1.34);
}

// Extruded polygon in the oblique view. pts: front face, any winding. depth in units.
// o.inner(): drawn after the side faces and before the front face (parts tucked into a corner).
// o.hatch: hatch the front face. o.front: override front fill. o.noLines: fills only.
export function prism(ctx, pts, depth, mat, o = {}) {
  const n = pts.length;
  const dx = D.x * depth, dy = D.y * depth;
  let A = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    A += p[0] * q[1] - q[0] * p[1];
  }
  const sg = A > 0 ? 1 : -1;
  const vis = new Array(n), nrm = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const ex = q[0] - p[0], ey = q[1] - p[1], L = Math.hypot(ex, ey) || 1;
    const nx = (sg * ey) / L, ny = (-sg * ex) / L;
    nrm[i] = [nx, ny];
    vis[i] = nx * D.x + ny * D.y > 1e-4;
  }
  // Group runs of visible edges with similar normals into strips (no seams between thin quads).
  let start = 0;
  while (start < n && vis[start]) start++;
  const groups = [];
  if (start === n) start = 0;
  let cur = null;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (!vis[i]) { cur = null; continue; }
    if (cur) {
      const a = nrm[cur.last];
      if (a[0] * nrm[i][0] + a[1] * nrm[i][1] > 0.94) { cur.edges.push(i); cur.last = i; continue; }
    }
    cur = { edges: [i], last: i };
    groups.push(cur);
  }
  const strips = groups.map((g) => {
    const idx = [g.edges[0]];
    for (const e of g.edges) idx.push((e + 1) % n);
    let nx = 0, ny = 0;
    for (const e of g.edges) { nx += nrm[e][0]; ny += nrm[e][1]; }
    const l = Math.hypot(nx, ny) || 1;
    return { idx, nx: nx / l, ny: ny / l };
  });
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const s of strips) {
    ctx.beginPath();
    s.idx.forEach((i, k) => (k ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1])));
    for (let k = s.idx.length - 1; k >= 0; k--) ctx.lineTo(pts[s.idx[k]][0] + dx, pts[s.idx[k]][1] + dy);
    ctx.closePath();
    ctx.fillStyle = sideShade(mat, s.nx, s.ny);
    ctx.fill();
    if (!o.noLines && mat.line) {
      ctx.strokeStyle = mat.line;
      ctx.lineWidth = lw(1.5);
      ctx.stroke();
    }
  }
  if (o.inner) o.inner();
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  poly(ctx, pts);
  if (o.front) ctx.fillStyle = o.front;
  else {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, mat.front[0]);
    g.addColorStop(1, mat.front[1]);
    ctx.fillStyle = g;
  }
  ctx.fill();
  if (o.hatch && mat.hatch) {
    let x0 = Infinity, x1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; }
    poly(ctx, pts);
    hatchPath(ctx, x0, y0, x1, y1, mat.hatch, o.hatchGap || 13, 2);
  }
  if (!o.noLines) {
    if (mat.sil) {
      ctx.strokeStyle = mat.sil;
      ctx.lineWidth = lw(o.sil || 3.5);
      poly(ctx, pts);
      ctx.stroke();
      ctx.beginPath();
      for (const s of strips) {
        const a = s.idx[0], b = s.idx[s.idx.length - 1];
        ctx.moveTo(pts[a][0], pts[a][1]);
        ctx.lineTo(pts[a][0] + dx, pts[a][1] + dy);
        for (let k = 1; k < s.idx.length; k++) ctx.lineTo(pts[s.idx[k]][0] + dx, pts[s.idx[k]][1] + dy);
        ctx.lineTo(pts[b][0], pts[b][1]);
      }
      ctx.stroke();
    }
    // lit edges: front edges whose visible neighbour face looks up
    if (mat.hi) {
      ctx.strokeStyle = mat.hi;
      ctx.lineWidth = lw(o.sil ? Math.min(2, o.sil * 0.6) : 2);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (!vis[i] || nrm[i][1] > -0.5) continue;
        const p = pts[i], q = pts[(i + 1) % n];
        ctx.moveTo(p[0], p[1]);
        ctx.lineTo(q[0], q[1]);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// A through hole in a plate of the given depth, on a face of material mat.
export function hole(ctx, x, y, r, depth, mat) {
  const L = Math.hypot(D.x, D.y);
  const ux = D.x / L, uy = D.y / L;
  const g = ctx.createLinearGradient(x - ux * r, y - uy * r, x + ux * r, y + uy * r);
  g.addColorStop(0, '#0a0d0b');
  g.addColorStop(0.55, '#1a201b');
  g.addColorStop(1, mix(mat.side, '#0a0d0b', 0.35));
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = mat.line || 'rgba(0,0,0,0.4)';
  ctx.lineWidth = lw(1.5);
  ctx.stroke();
  ctx.restore();
}

// Vertical cylinder (rod, stem, plunger) shaded across its width.
export function rodV(ctx, x, y0, y1, w, mat, sil = true) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, mix(mat.top, mat.front[0], 0.3));
  g.addColorStop(0.28, mat.top);
  g.addColorStop(0.62, mat.front[1]);
  g.addColorStop(1, mat.side);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, y0, w, y1 - y0);
  if (sil && mat.sil) {
    ctx.strokeStyle = mat.sil;
    ctx.lineWidth = lw(2.5);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y0);
    ctx.lineTo(x - w / 2, y1);
    ctx.moveTo(x + w / 2, y0);
    ctx.lineTo(x + w / 2, y1);
    ctx.stroke();
  }
  ctx.restore();
}

// Horizontal cylinder shaded across its height.
export function rodH(ctx, x0, x1, y, h, mat, sil = true) {
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, mix(mat.top, mat.front[0], 0.2));
  g.addColorStop(0.3, mat.top);
  g.addColorStop(0.65, mat.front[1]);
  g.addColorStop(1, mat.side);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(x0, y - h / 2, x1 - x0, h);
  if (sil && mat.sil) {
    ctx.strokeStyle = mat.sil;
    ctx.lineWidth = lw(2.5);
    ctx.beginPath();
    ctx.moveTo(x0, y - h / 2);
    ctx.lineTo(x1, y - h / 2);
    ctx.moveTo(x0, y + h / 2);
    ctx.lineTo(x1, y + h / 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Shaded ball (handle knobs, hubs).
export function ball(ctx, x, y, r, mat) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
  g.addColorStop(0, mat.hi || mat.top);
  g.addColorStop(0.35, mat.top);
  g.addColorStop(1, mat.side);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (mat.sil) {
    ctx.strokeStyle = mat.sil;
    ctx.lineWidth = lw(2);
    ctx.stroke();
  }
  ctx.restore();
}

// Horizontal disc in the bench plane (radius r), as a polygon in the oblique view.
export function discPts(cx, cy, r, steps = 28) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const u = Math.cos(a) * r, v = Math.sin(a) * r;
    pts.push([cx + u + D.x * v, cy + D.y * v]);
  }
  return pts;
}

// ---------------------------------------------------------------------------------------------
// Light, shadow, contact.

// Soft contact shadow on a horizontal surface: an ellipse stretched along x, pushed back in depth.
export function contactShadow(ctx, cx, cy, rx, ry, a = 0.5) {
  if (a <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(2,4,3,${a})`);
  g.addColorStop(0.55, `rgba(2,4,3,${a * 0.55})`);
  g.addColorStop(1, 'rgba(2,4,3,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
  ctx.restore();
}

// Bright contact at one point: 120 ms in scene time, caller passes local u 0..1.
// A small core and halo; the flashed area stays far under 1% of the frame.
export function contactGlow(ctx, x, y, u, r = 34, color = P.bright) {
  if (u <= 0 || u >= 1) return;
  const a = Math.sin(u * Math.PI);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, 0.95 * a));
  g.addColorStop(0.18, rgba(color, 0.55 * a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.fillStyle = `rgba(240,255,244,${0.9 * a})`;
  ctx.beginPath();
  ctx.arc(x, y, 4.5 * LOD.k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Steady glow (an amber mark lit, an indicator): radial, additive.
export function softGlow(ctx, x, y, r, color, a) {
  if (a <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();
}

// Dust puff: seeded motes thrown out of a joint along (dirx, diry), falling and fading over dur.
export function dust(ctx, x, y, tau, seed, o = {}) {
  const dur = o.dur || 0.5, n = o.n || 12;
  if (tau <= 0 || tau >= dur) return;
  const u = tau / dur;
  const r = rng(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ang = (o.ang || 0) + (r() - 0.5) * (o.spread || 2.4);
    const sp = 60 + r() * 140;
    const size = (1.6 + r() * 2.2) * (LOD.card ? 1.8 : 1);
    const life = 0.55 + r() * 0.45;
    const v = clamp01(u / life);
    if (v >= 1) continue;
    const d = sp * tau * (1 - 0.5 * v);
    const px = x + Math.cos(ang) * d + (r() - 0.5) * 6;
    const py = y + Math.sin(ang) * d + 90 * tau * tau;
    ctx.globalAlpha = 0.75 * (1 - v) * (1 - v);
    ctx.fillStyle = i % 3 === 0 ? P.glow : P.paper;
    ctx.beginPath();
    ctx.arc(px, py, size * (1 - 0.4 * v), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The bench: back wall, bench top receding in depth with T-slots, lit front edge, ruled apron.
// The apron ticks are the series motif (same pitch and heights as kit.bench) and never move.

export function benchFinal(ctx, lampX = 980, lampY = 600) {
  // wall
  let g = ctx.createLinearGradient(0, 0, 0, BACK_Y);
  g.addColorStop(0, '#0c0f0d');
  g.addColorStop(1, '#121813');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, BACK_Y);
  // lamp pool on the wall
  g = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 760);
  g.addColorStop(0, 'rgba(150,215,170,0.085)');
  g.addColorStop(0.5, 'rgba(150,215,170,0.035)');
  g.addColorStop(1, 'rgba(150,215,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, BACK_Y);
  // bench top
  g = ctx.createLinearGradient(0, BACK_Y, 0, BENCH_Y);
  g.addColorStop(0, '#151c16');
  g.addColorStop(1, '#1c261e');
  ctx.fillStyle = g;
  ctx.fillRect(0, BACK_Y, W, BENCH_Y - BACK_Y);
  // T-slots receding along the depth axis
  if (!LOD.card) {
    const run = (BENCH_Y - BACK_Y) / -D.y;
    ctx.lineWidth = 2;
    for (let x = -120; x < W; x += 192) {
      ctx.strokeStyle = '#0f1511';
      ctx.beginPath();
      ctx.moveTo(x, BENCH_Y);
      ctx.lineTo(x + D.x * run, BACK_Y);
      ctx.stroke();
      ctx.strokeStyle = '#243027';
      ctx.beginPath();
      ctx.moveTo(x + 4, BENCH_Y);
      ctx.lineTo(x + 4 + D.x * run, BACK_Y);
      ctx.stroke();
    }
  }
  // lamp pool on the bench top
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, BACK_Y, W, BENCH_Y - BACK_Y);
  ctx.clip();
  ctx.translate(lampX, FLOOR - 6);
  ctx.scale(1, 0.12);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 700);
  g.addColorStop(0, 'rgba(225,240,225,0.10)');
  g.addColorStop(1, 'rgba(225,240,225,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-700, -700, 1400, 1400);
  ctx.restore();
  // back edge
  ctx.strokeStyle = '#1f2a22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, BACK_Y);
  ctx.lineTo(W, BACK_Y);
  ctx.stroke();
  // apron
  g = ctx.createLinearGradient(0, BENCH_Y, 0, H);
  g.addColorStop(0, '#0d110e');
  g.addColorStop(1, '#090c0a');
  ctx.fillStyle = g;
  ctx.fillRect(0, BENCH_Y, W, H - BENCH_Y);
  // lit front edge and the ruled rule
  ctx.fillStyle = '#4f6f57';
  ctx.fillRect(0, BENCH_Y - 3, W, 2.5);
  ctx.strokeStyle = P.dim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, BENCH_Y + 0.5);
  ctx.lineTo(W, BENCH_Y + 0.5);
  ctx.stroke();
  ctx.lineWidth = lw(2);
  ctx.beginPath();
  for (let x = 0, i = 0; x < W; x += 24, i++) {
    const h = i % 10 === 0 ? 22 : i % 5 === 0 ? 14 : 8;
    ctx.moveTo(x, BENCH_Y + 6);
    ctx.lineTo(x, BENCH_Y + 6 + h);
  }
  ctx.stroke();
}

// Light falling from an overhead slot (x0..x1 at y0) and spreading to x2..x3 at the bench.
export function lightShaft(ctx, x0, x1, y0, x2, x3, y1, a = 0.05) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(205,240,214,${a})`);
  g.addColorStop(1, `rgba(205,240,214,${a * 0.25})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x3, y1);
  ctx.lineTo(x2, y1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// A variant of a material with its silhouette and lit edge eased toward the dim family
// (an idle actor) or full strength (the actor doing the scene's move). u: 0 idle .. 1 active.
export function activeMat(mat, u, idleSil = '#2f6141') {
  return { ...mat, sil: mix(idleSil, mat.sil, u), hi: mat.hi ? mix(idleSil, mat.hi, u) : null };
}

// Lamp falloff over the finished picture: the active station stays lit, idle parts go dim.
export function lampFalloff(ctx, x = 980, y = 600, r0 = 360, r1 = 1180, a = 0.62) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, 'rgba(3,5,4,0)');
  g.addColorStop(1, `rgba(3,5,4,${a})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
