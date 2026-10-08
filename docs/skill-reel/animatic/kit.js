// Shared kit for the skills-reel animatic. Logical stage is 1920x1080; scenes draw in that space.
// Rough visuals only: final timing, blocked poses, no polish.

export const W = 1920, H = 1080;
export const BENCH_Y = Math.round(H * 0.74);

export const C = {
  ground: '#0f1210',
  benchTop: '#10150f',
  ivory: '#f3f3ec',
  green: '#53db76',
  bright: '#72f28c',
  steel: '#b2b5ab',
  amber: '#efc87e',
  dim: '#3e5a45',
  caption: '#f2efdf',
  sub: '#c2c9ba',
};

export const F = {
  title: '781 72px "Lineal", "Lineal fallback", sans-serif',
  line: '500 34px "Harness Text", "Harness Text fallback", sans-serif',
  mono: '400 26px "Departure Mono", "Departure Mono fallback", monospace',
  monoSmall: '400 20px "Departure Mono", "Departure Mono fallback", monospace',
  person: 'italic 600 34px "Fraunces", "Fraunces fallback", serif',
};

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a, b, u) => a + (b - a) * u;
// Local progress of p inside [a, b] (both in seconds when given period), clamped 0..1.
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const easeOut = (u) => 1 - Math.pow(1 - u, 4);
export const easeIn = (u) => u * u * u;
export const easeInOut = (u) => (u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2);

// Seeded PRNG (mulberry32); never Math.random in a scene.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The bench: top band plus the ruled front edge with millimetre ticks. Never moves.
export function bench(ctx, offsetX = 0) {
  ctx.fillStyle = C.benchTop;
  ctx.fillRect(0, BENCH_Y, W, H - BENCH_Y);
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, BENCH_Y + 0.5);
  ctx.lineTo(W, BENCH_Y + 0.5);
  ctx.stroke();
  ctx.lineWidth = 2;
  const step = 24;
  const start = -((offsetX % step) + step) % step;
  for (let x = start, i = Math.floor(offsetX / step); x < W; x += step, i++) {
    const h = i % 10 === 0 ? 22 : i % 5 === 0 ? 14 : 8;
    ctx.beginPath();
    ctx.moveTo(x, BENCH_Y + 6);
    ctx.lineTo(x, BENCH_Y + 6 + h);
    ctx.stroke();
  }
}

// The work unit: ivory tile, 2:3, clipped top-right corner, registration hole near the top.
export function blank(ctx, x, y, w = 60, h = 90, alpha = 1) {
  const c = Math.min(w, h) * 0.22;
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
  ctx.arc(x + w * 0.35, y + h * 0.16, Math.max(3, w * 0.07), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Outline box helper for rough instrument blocking. kind: 'fresh' (clean green), 'session' (green + hatch), 'steel', 'dim'.
export function part(ctx, x, y, w, h, kind = 'fresh', alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const stroke = kind === 'steel' ? C.steel : kind === 'dim' ? C.dim : C.green;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeRect(x, y, w, h);
  if (kind === 'session') {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 2;
    for (let d = -h; d < w; d += 14) {
      ctx.moveTo(x + d, y + h);
      ctx.lineTo(x + d + h, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// The person's key: ivory cap on a green stem. press 0..1 pushes it down 16 px. cap text in Fraunces Italic.
export function key(ctx, x, y, press = 0, text = '', alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const dy = press * 16;
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 40 + dy);
  ctx.stroke();
  ctx.fillStyle = C.ivory;
  const w = text ? Math.max(80, text.length * 19 + 32) : 80;
  ctx.fillRect(x - w / 2, y - 92 + dy, w, 52);
  if (text) {
    ctx.fillStyle = C.ground;
    ctx.font = F.person;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - 66 + dy);
  }
  ctx.restore();
}

// Bright contact flash at a point (120 ms in scene time; caller passes local 0..1).
export function contact(ctx, x, y, u) {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  ctx.globalAlpha = Math.sin(u * Math.PI);
  ctx.fillStyle = C.bright;
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Engraved maker's plate in Departure Mono (in-picture labels only).
export function plate(ctx, text, x, y, alpha = 1, font = F.monoSmall) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font;
  const w = ctx.measureText(text).width + 28;
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - w / 2, y - 18, w, 36);
  ctx.fillStyle = C.steel;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  ctx.restore();
}

// Animatic-only annotation: names the beat in small dim mono at the bottom of the stage.
export function note(ctx, text) {
  ctx.save();
  ctx.font = F.monoSmall;
  ctx.fillStyle = C.dim;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, 40, H - 30);
  ctx.restore();
}
