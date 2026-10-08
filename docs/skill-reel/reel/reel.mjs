// Skills reel player (not deployed). Port of the animatic shell onto the final scene modules in
// /site/skill-reel/scenes/. Builds the reel timeline from the scenes' declared periods and the merge
// opener's duration, and renders every mode as a pure function of t.
// Modes: ?mode=reel (default), ?mode=card&scene=<id>, ?mode=grid, ?mode=sheet. ?t=<seconds> seeks and pauses.
// ?blur=<n> averages n sub-frames (180 degree shutter at ?fps, default 60) during trucks and the pull back.
// ?export=1 fixes the canvas at 1920x1080 device px with no page chrome, for export.mjs.
// Capture: window.renderAt(t) renders t synchronously and resolves after paint; window.grabFrame(t)
// renders t and returns the canvas as a PNG data URL; window.__anim mirrors the motion-design stills.mjs
// contract (seek, pause, play, t, TOTAL).

import * as kit from '/site/skill-reel/kit.mjs';
import { F } from '/site/skill-reel/base.mjs';

const { W, H, BENCH_Y, P, MAT, seg, lerp, easeOut, easeIn, easeInOut } = kit;

export const IDS = ['merge', 'deep-plan', 'long-horizon', 'smart-compact', 'why', 'wow-loop', 'perf-loop', 'arena', 'showpiece'];

// Periods the approved animatic uses; a placeholder keeps its scene's slot length so the timeline holds.
const FALLBACK_PERIOD = { merge: 10, 'deep-plan': 9, 'long-horizon': 9, 'smart-compact': 8, why: 8, 'wow-loop': 9, 'perf-loop': 10, arena: 10, showpiece: 9 };
const FALLBACK_OPENER = 5.5;

// Reel timing, pitch A section 4 with BRIEF.md changes. The intro absorbs the difference to TARGET,
// within [introMin, introMax], so the reel lands near 90 s whatever the scene periods add up to.
export const TIMING = {
  target: 90,
  introMin: 2.5,
  introMax: 4.0,
  truck: 1.0,       // transition length; the incoming loop starts when the truck starts
  pullback: 2.0,    // camera pulls back to all nine at rest
  slate: 3.5,       // end slate hold
  capInDelay: 0.6,  // caption plate slides in this long after a loop starts
  capIn: 0.4,       // ease-out
  capOutLead: 0.4,  // caption starts leaving this long before the truck (or the pull back)
  capOut: 0.3,      // ease-in
  lineSwap: 0.35,   // crossfade when one plate's line changes (opener caption to loop caption)
};

const DPR_CAP = 1.5;
const CARD_W = 480, CARD_H = 270;
const FACES = ['781 72px "Lineal"', '500 34px "Harness Text"', '400 26px "Departure Mono"', 'italic 600 34px "Fraunces"'];
const CAPTION = '#f2efdf', SUB = '#c2c9ba';
const FONT = {
  name: '781 72px "Lineal", "Lineal fallback", sans-serif',
  line: '500 34px "Harness Text", "Harness Text fallback", sans-serif',
  tag: '400 24px "Departure Mono", "Departure Mono fallback", monospace',
  introTitle: '781 168px "Lineal", "Lineal fallback", sans-serif',
  introSub: '400 26px "Departure Mono", "Departure Mono fallback", monospace',
  slateUrl: '400 44px "Departure Mono", "Departure Mono fallback", monospace',
  slateLine: '781 68px "Lineal", "Lineal fallback", sans-serif',
  slateAccent: 'italic 600 68px "Fraunces", "Fraunces fallback", serif',
};

const qt = (x) => Math.round(x * 1e6) / 1e6; // round the clock so >= tests do not land one step early after a seek
const mod = (x, m) => ((x % m) + m) % m;

// ---------------------------------------------------------------------------------------------
// Scene loading. A missing, malformed or throwing scene becomes a labelled placeholder.

function drawPlaceholder(ctx, id, reason, p) {
  kit.benchFinal(ctx);
  ctx.save();
  ctx.strokeStyle = P.amber;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(160, 260, W - 320, BENCH_Y - 320);
  ctx.setLineDash([]);
  ctx.fillStyle = P.amber;
  ctx.font = F.mono;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('placeholder: scene ' + id, W / 2, 440);
  ctx.fillStyle = SUB;
  ctx.font = F.monoSmall;
  const text = String(reason || '');
  ctx.fillText(text.length > 120 ? text.slice(0, 117) + '...' : text, W / 2, 490);
  ctx.fillStyle = P.dim;
  ctx.fillRect(160, BENCH_Y - 50, (W - 320) * Math.max(0, Math.min(1, p)), 6);
  ctx.restore();
}

function placeholder(id, reason) {
  const period = FALLBACK_PERIOD[id] || 9;
  const sc = {
    id, name: '/' + id, kind: id === 'smart-compact' ? 'mod' : '', caption: '', period, placeholder: true, reason,
    draw: (ctx, t) => drawPlaceholder(ctx, id, reason, t / period),
    opener: null,
  };
  if (id === 'merge') {
    sc.opener = {
      duration: FALLBACK_OPENER,
      draw: (ctx, t) => drawPlaceholder(ctx, 'merge opener', reason, t / FALLBACK_OPENER),
      captions: [],
    };
  }
  return sc;
}

async function loadScene(id) {
  try {
    const m = await import(`/site/skill-reel/scenes/${id}.mjs`);
    const s = m.default;
    if (!s || typeof s.draw !== 'function') throw new Error('default export has no draw(ctx, t)');
    const period = Number(s.period);
    if (!(period > 0)) throw new Error('period must be a positive number of seconds');
    if (s.id && s.id !== id) console.warn(`[reel] scenes/${id}.mjs declares id "${s.id}"`);
    let opener = null;
    if (s.opener && typeof s.opener.draw === 'function' && Number(s.opener.duration) > 0) {
      const captions = Array.isArray(s.opener.captions) ? s.opener.captions : [];
      opener = {
        duration: Number(s.opener.duration),
        draw: s.opener.draw.bind(s.opener),
        captions: captions
          .map((c) => ({ from: Number(c.from), to: Number(c.to), name: String(c.name || ''), line: String(c.line || '') }))
          .filter((c) => c.to > c.from),
      };
    } else if (id === 'merge') {
      console.warn('[reel] scenes/merge.mjs has no opener; the reel goes from the intro straight into the loop');
    }
    return { id, name: String(s.name || '/' + id), kind: s.kind ? String(s.kind) : '', caption: String(s.caption || ''), period, opener, placeholder: false, draw: s.draw.bind(s) };
  } catch (err) {
    console.warn(`[reel] scenes/${id}.mjs -> placeholder:`, err);
    return placeholder(id, err && err.message ? err.message : String(err));
  }
}

// ---------------------------------------------------------------------------------------------
// Drawing primitives. Every panel draw starts and ends at save-stack depth 0, and unwind() pops
// anything a scene left pushed, so one scene can never leak state into the next or the next frame.

function unwind(ctx) {
  for (let i = 0; i < 64; i++) ctx.restore();
}

function beginFrame(ctx, cv) {
  unwind(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = P.ink;
  ctx.fillRect(0, 0, cv.width, cv.height);
}

const reported = new Set();
function reportOnce(key, err) {
  if (reported.has(key)) return;
  reported.add(key);
  console.error(`[reel] ${key}:`, err);
}

// Draws fn(ctx, localT) into a 1920x1080 panel placed at (x, y) with scale s, in logical stage units.
// clipW (panel units) narrows the panel from its left edge (the intro's reveal).
function drawPanel(ctx, base, x, y, s, scene, fn, localT, clipW = W) {
  const enter = () => {
    ctx.save();
    ctx.setTransform(base * s, 0, 0, base * s, base * x, base * y);
    ctx.beginPath();
    ctx.rect(0, 0, clipW, H);
    ctx.clip();
    ctx.fillStyle = P.ink;
    ctx.fillRect(0, 0, W, H);
  };
  enter();
  let err = null;
  try {
    fn(ctx, localT);
  } catch (e) {
    err = e;
  }
  unwind(ctx);
  if (err) {
    reportOnce(`${scene.id} threw`, err);
    enter();
    drawPlaceholder(ctx, scene.id, `draw threw at t=${localT.toFixed(3)}: ${err && err.message ? err.message : err}`, localT / scene.period);
    unwind(ctx);
  }
}

// Runs fn with the stage transform (logical 1920x1080 over the whole canvas).
function onStage(ctx, base, fn) {
  ctx.save();
  ctx.setTransform(base, 0, 0, base, 0, 0);
  fn();
  unwind(ctx);
}

function setTracking(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
}

// ---------------------------------------------------------------------------------------------
// Reel timeline, built from the scenes' periods.
//   merge loop starts at intro + opener; loop i+1 starts truck/2 before loop i ends;
//   the truck between them runs [start(i+1), start(i+1) + truck]; the last loop ends, then pull back and slate.
//   total = intro + opener + sum(periods) - (n - 1) * truck / 2 + pullback + slate

export function buildReel(scenes) {
  const T = TIMING;
  const merge = scenes[0];
  const openerDur = merge.opener ? merge.opener.duration : 0;
  const sum = scenes.reduce((s, sc) => s + sc.period, 0);
  const rest = openerDur + sum - ((scenes.length - 1) * T.truck) / 2 + T.pullback + T.slate;
  const intro = Math.min(T.introMax, Math.max(T.introMin, T.target - rest));
  const opener = merge.opener ? { a: intro, b: intro + openerDur } : null;
  let t = opener ? opener.b : intro;
  const loops = scenes.map((sc, i) => {
    const a = t, b = t + sc.period;
    const isLast = i === scenes.length - 1;
    t = isLast ? b : b - T.truck / 2;
    const leave = isLast ? b : b - T.truck / 2; // truck start, or pull back start
    return { sc, i, a, b, leave };
  });
  const showEnd = loops[loops.length - 1].b;
  const pullback = { a: showEnd, b: showEnd + T.pullback };
  const slate = { a: pullback.b, b: pullback.b + T.slate };
  const total = slate.b;

  // Caption plates: { a: fade-in start, b: fade-out end, name, kind, lines: [{ text, a, b }] }.
  const plates = [];
  if (opener) {
    for (const c of merge.opener.captions) {
      plates.push({ a: opener.a + c.from, b: opener.a + c.to, name: c.name, kind: c.name === merge.name ? merge.kind : '', lines: [{ text: c.line, a: -Infinity, b: Infinity }] });
    }
  }
  for (const L of loops) {
    const a = L.a + T.capInDelay, b = L.leave - T.capOutLead + T.capOut;
    const prev = plates[plates.length - 1];
    // The opener's last plate names /merge and runs to the opener's end: the loop keeps that plate
    // on screen (no exit and re-entry of the same name) and crossfades its line if the loop's differs.
    if (L.i === 0 && opener && prev && prev.name === L.sc.name && prev.b >= opener.b - 0.05) {
      prev.b = b;
      const old = prev.lines[0];
      if (L.sc.caption && L.sc.caption !== old.text) {
        old.b = L.a + T.lineSwap / 2;
        prev.lines.push({ text: L.sc.caption, a: L.a - T.lineSwap / 2, b: Infinity });
      }
      continue;
    }
    plates.push({ a, b, name: L.sc.name, kind: L.sc.kind, lines: [{ text: L.sc.caption, a: -Infinity, b: Infinity }] });
  }

  const chapters = [{ t: 0, name: 'intro' }];
  if (opener) chapters.push({ t: opener.a, name: merge.name + ' opener' });
  for (const L of loops) chapters.push({ t: L.a, name: L.sc.name });
  chapters.push({ t: pullback.a, name: 'pull back' }, { t: slate.a, name: 'end slate' });
  const formula = `intro ${qt(intro)} + opener ${openerDur} + sum(periods) ${qt(sum)} - ${scenes.length - 1} x ${T.truck / 2} + pullback ${T.pullback} + slate ${T.slate}`;
  return { intro, opener, loops, plates, pullback, slate, total, chapters, formula };
}

// Times where the camera moves fast enough to want sub-frame blur.
function inCameraMove(reel, t) {
  if (t >= reel.pullback.a && t < reel.pullback.b) return true;
  for (let k = 1; k < reel.loops.length; k++) {
    const a = reel.loops[k].a;
    if (t >= a && t < a + TIMING.truck) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
// Caption plates, intro, row and slate: drawn in canvas so they reach the MP4.

function plateAlpha(t, a, b, fin, fout) {
  if (t < a || t >= b) return [0, 0, 0];
  const u = easeOut(seg(t, a, a + fin));
  const v = easeIn(seg(t, b - fout, b));
  return [u * (1 - v), u, v];
}

function drawPlate(ctx, P0, t) {
  const T = TIMING;
  const [alpha, u, v] = plateAlpha(t, P0.a, P0.b, T.capIn, T.capOut);
  if (alpha <= 0) return;
  const dx = (1 - u) * -48 + v * -48;
  const x = 120 + dx;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const hasName = !!P0.name;
  if (hasName) {
    ctx.fillStyle = CAPTION;
    ctx.font = FONT.name;
    setTracking(ctx, -0.015 * 72);
    ctx.fillText(P0.name, x, 140);
    const nameW = ctx.measureText(P0.name).width;
    setTracking(ctx, 0);
    // A scene that is not a skill (smart-compact is a Claude Code mod) carries its kind as a mono tag.
    if (P0.kind) {
      ctx.font = FONT.tag;
      setTracking(ctx, 0.08 * 24);
      const text = P0.kind.toUpperCase();
      const tw = ctx.measureText(text).width + 30;
      const tx = x + nameW + 26, ty = 96, th = 44;
      ctx.strokeStyle = SUB;
      ctx.lineWidth = 2;
      ctx.strokeRect(tx, ty, tw, th);
      ctx.fillStyle = SUB;
      ctx.textBaseline = 'middle';
      ctx.fillText(text, tx + 15 + 1, ty + th / 2 + 1);
      ctx.textBaseline = 'alphabetic';
      setTracking(ctx, 0);
    }
  }
  ctx.font = FONT.line;
  ctx.fillStyle = hasName ? SUB : CAPTION;
  for (const L of P0.lines) {
    if (!L.text) continue;
    const fin = L.a === -Infinity ? 1 : seg(t, L.a, L.a + T.lineSwap);
    const fout = L.b === Infinity ? 1 : 1 - seg(t, L.b - T.lineSwap, L.b);
    const k = fin * fout;
    if (k <= 0) continue;
    ctx.globalAlpha = alpha * k;
    ctx.fillText(L.text, x, hasName ? 196 : 152);
  }
  ctx.restore();
}

// Intro: the title, then the opener's first frame wipes in left to right behind the bench rule.
function drawIntro(ctx, base, t, I, scenes) {
  const merge = scenes[0];
  const reveal = easeInOut(seg(t, 0.55 * I, I));
  if (reveal > 0) {
    const fn = merge.opener ? merge.opener.draw : merge.draw;
    drawPanel(ctx, base, 0, 0, 1, merge, fn, 0, Math.min(W, Math.ceil(W * reveal * base) / base));
  }
  onStage(ctx, base, () => {
    // the bench rule runs ahead of the reveal
    const lead = Math.min(W, easeOut(seg(t, 0.4 * I, 0.9 * I)) * W);
    if (lead > 0) {
      ctx.fillStyle = '#4f6f57';
      ctx.fillRect(0, BENCH_Y - 3, lead, 2.5);
      ctx.fillStyle = P.dim;
      ctx.fillRect(0, BENCH_Y - 1, lead, 3);
    }
    const r1 = easeOut(seg(t, 0.12 * I, 0.34 * I));
    const r2 = easeOut(seg(t, 0.22 * I, 0.44 * I));
    const out = easeIn(seg(t, 0.6 * I, 0.74 * I));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const a1 = r1 * (1 - out), a2 = r2 * (1 - out);
    if (a1 > 0) {
      ctx.globalAlpha = a1;
      ctx.fillStyle = CAPTION;
      ctx.font = FONT.introTitle;
      setTracking(ctx, -0.015 * 168);
      ctx.fillText('Skills', W / 2, 430 + (1 - r1) * 18 - out * 24);
      setTracking(ctx, 0);
    }
    if (a2 > 0) {
      ctx.globalAlpha = a2;
      ctx.fillStyle = SUB;
      ctx.font = FONT.introSub;
      setTracking(ctx, 3);
      ctx.fillText('HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX', W / 2, 510 + (1 - r2) * 12 - out * 24);
      setTracking(ctx, 0);
    }
  });
}

// All nine at rest, side by side with no gap, so their benches join into one long bench.
// Each scene's p = 0 frame is a still: render it once per canvas size, then scale the bitmap.
const ROW = { w: 1872, top: 604 };
const snapshots = new Map();
function snapshot(scene, cw, ch) {
  const key = scene.id + '@' + cw + 'x' + ch;
  let cv = snapshots.get(key);
  if (!cv) {
    cv = new OffscreenCanvas(cw, ch);
    const c = cv.getContext('2d');
    c.fillStyle = P.ink;
    c.fillRect(0, 0, cw, ch);
    drawPanel(c, cw / W, 0, 0, 1, scene, scene.draw, 0);
    snapshots.set(key, cv);
  }
  return cv;
}

function drawRow(ctx, base, cv, scenes, e) {
  const n = scenes.length, last = n - 1;
  const s1 = ROW.w / n / W;
  const tw = W * s1, th = H * s1;
  const x0 = (W - ROW.w) / 2;
  const s = Math.pow(s1, e); // exponential zoom reads as a steady pull back
  const cx = lerp(W / 2, x0 + last * tw + tw / 2, e);
  const cy = lerp(H / 2, ROW.top + th / 2, e);
  onStage(ctx, base, () => {
    for (let k = 0; k < n; k++) {
      const pcx = cx + (k - last) * W * s;
      // snap panel edges to device pixels so neighbouring panels meet without a hairline
      const xa = Math.round((pcx - (W * s) / 2) * base) / base;
      const xb = Math.round((pcx + (W * s) / 2) * base) / base;
      const ya = Math.round((cy - (H * s) / 2) * base) / base;
      const yb = Math.round((cy + (H * s) / 2) * base) / base;
      if (xa > W || xb < 0) continue;
      ctx.drawImage(snapshot(scenes[k], cv.width, cv.height), xa, ya, xb - xa, yb - ya);
    }
    if (e > 0) {
      ctx.globalAlpha = e;
      ctx.strokeStyle = P.dim;
      ctx.lineWidth = 2;
      const L = cx - last * W * s - (W * s) / 2;
      ctx.strokeRect(L - 1, cy - (H * s) / 2 - 1, n * W * s + 2, H * s + 2);
    }
  });
}

function drawSlate(ctx, t, slate) {
  const u = easeOut(seg(t, slate.a, slate.a + 0.5));
  if (u <= 0) return;
  const dy = (1 - u) * -60;
  kit.setLod(ctx); // full-size line weights for the kit solids, whatever the last scene left
  ctx.save();
  ctx.globalAlpha = u;
  ctx.textBaseline = 'alphabetic';
  ctx.font = FONT.slateLine;
  setTracking(ctx, -0.015 * 68);
  const left = 'Better outcomes, ';
  const wl = ctx.measureText(left).width;
  setTracking(ctx, 0);
  ctx.font = FONT.slateAccent;
  const right = 'every round';
  const wr = ctx.measureText(right).width;
  ctx.font = FONT.slateUrl;
  const wu = ctx.measureText('harnessfirmware.com').width;
  const pw = Math.round(Math.max(wl + wr, wu) + 180), ph = 236;
  const px = Math.round(W / 2 - pw / 2), py = 258 + dy;
  // the maker's plate: a dark metal plate with a lit top edge, four screws, a soft shadow on the wall
  kit.contactShadow(ctx, px + pw / 2 + 10, py + ph + 18, pw * 0.52, 26, 0.45 * u);
  kit.prism(ctx, kit.rect(px, py, pw, ph), 14, MAT.metal, { sil: 3 });
  for (const [sx, sy] of [[px + 22, py + 22], [px + pw - 22, py + 22], [px + 22, py + ph - 22], [px + pw - 22, py + ph - 22]]) {
    kit.ball(ctx, sx, sy, 7, MAT.metal);
    ctx.strokeStyle = MAT.metal.side;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4.5, sy + 2);
    ctx.lineTo(sx + 4.5, sy - 2);
    ctx.stroke();
  }
  ctx.textAlign = 'left';
  const lx = W / 2 - (wl + wr) / 2;
  ctx.fillStyle = CAPTION;
  ctx.font = FONT.slateLine;
  setTracking(ctx, -0.015 * 68);
  ctx.fillText(left, lx, py + 118);
  setTracking(ctx, 0);
  ctx.font = FONT.slateAccent;
  ctx.fillText(right, lx + wl, py + 118);
  ctx.textAlign = 'center';
  ctx.fillStyle = SUB;
  ctx.font = FONT.slateUrl;
  ctx.fillText('harnessfirmware.com', W / 2, py + 188);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Frame renderers.

function drawReelFrame(ctx, cv, reel, scenes, t) {
  const base = cv.width / W;
  beginFrame(ctx, cv);
  let note = '';
  if (t < reel.intro) {
    drawIntro(ctx, base, t, reel.intro, scenes);
    note = 'intro';
  } else if (reel.opener && t < reel.opener.b) {
    drawPanel(ctx, base, 0, 0, 1, scenes[0], scenes[0].opener.draw, qt(t - reel.opener.a));
    note = `${scenes[0].name} opener  ${(t - reel.opener.a).toFixed(2)} / ${scenes[0].opener.duration} s`;
  } else if (t < reel.pullback.a) {
    let j = 0;
    for (let k = 0; k < reel.loops.length; k++) if (reel.loops[k].a <= t) j = k;
    const L = reel.loops[j];
    const local = qt(t - L.a);
    if (j > 0 && t < L.a + TIMING.truck) {
      // Camera truck right along the bench: both stations move together at one speed, the incoming
      // panel's left edge locked to the outgoing panel's right edge (whole device pixels), so the
      // bench, its apron ticks and T-slots run on unbroken across the join.
      const Pv = reel.loops[j - 1];
      const e = easeInOut(seg(t, L.a, L.a + TIMING.truck));
      const xa = -Math.round(W * e * base) / base;
      drawPanel(ctx, base, xa, 0, 1, Pv.sc, Pv.sc.draw, qt(mod(t - Pv.a, Pv.sc.period)));
      drawPanel(ctx, base, xa + W, 0, 1, L.sc, L.sc.draw, local);
      note = `truck  ${Pv.sc.name} -> ${L.sc.name}`;
    } else {
      drawPanel(ctx, base, 0, 0, 1, L.sc, L.sc.draw, qt(mod(local, L.sc.period)));
      note = `${j + 1}/${scenes.length} ${L.sc.name}  loop ${local.toFixed(2)} / ${L.sc.period} s  p ${(local / L.sc.period).toFixed(3)}`;
    }
    if (L.sc.placeholder) note += '  PLACEHOLDER';
  } else {
    const e = easeInOut(seg(t, reel.pullback.a, reel.pullback.b));
    drawRow(ctx, base, cv, scenes, e);
    note = t < reel.slate.a ? 'pull back  all nine at p = 0' : 'end slate';
  }
  onStage(ctx, base, () => {
    for (const p of reel.plates) drawPlate(ctx, p, t);
    if (t >= reel.slate.a) drawSlate(ctx, t, reel.slate);
  });
  return note;
}

function drawScene(view, scene, localT) {
  const { ctx, cv } = view;
  beginFrame(ctx, cv);
  drawPanel(ctx, cv.width / W, 0, 0, 1, scene, scene.draw, qt(mod(localT, scene.period)));
}

// ---------------------------------------------------------------------------------------------
// Page

let markReady;
const ready = new Promise((res) => { markReady = res; });
window.renderAt = (x) => ready.then(() => window.renderAt(x));
window.grabFrame = (x) => ready.then(() => window.grabFrame(x));

const params = new URLSearchParams(location.search);
const MODE = ['reel', 'card', 'grid', 'sheet'].includes(params.get('mode')) ? params.get('mode') : 'reel';
const EXPORT = params.get('export') === '1';
const FPS = Number(params.get('fps')) || 60;
const BLUR = Math.max(1, Math.min(32, Math.round(Number(params.get('blur')) || 1)));
if (EXPORT) document.documentElement.classList.add('export');
const $ = (id) => document.getElementById(id);
const main = $('main');

function makeView(parent, cssW, cssH, dprOverride) {
  const cv = document.createElement('canvas');
  parent.appendChild(cv);
  const view = { cv, ctx: cv.getContext('2d'), cssW, cssH, dprOverride };
  sizeView(view, cssW, cssH);
  return view;
}

function sizeView(view, cssW, cssH) {
  const dpr = view.dprOverride || Math.min(window.devicePixelRatio || 1, DPR_CAP);
  view.cssW = cssW;
  view.cssH = cssH;
  view.cv.style.width = cssW + 'px';
  view.cv.style.height = cssH + 'px';
  const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
  if (view.cv.width !== bw || view.cv.height !== bh) {
    view.cv.width = bw;
    view.cv.height = bh;
  }
}

function fitStage() {
  const r = main.getBoundingClientRect();
  const w = Math.max(160, Math.floor(Math.min(r.width - 4, ((r.height - 4) * 16) / 9)));
  return [w, Math.round((w * 9) / 16)];
}

function buildNav() {
  const links = [['reel', '?mode=reel'], ['grid', '?mode=grid'], ['sheet', '?mode=sheet'], ...IDS.map((id) => [id, `?mode=card&scene=${id}`])];
  for (const [label, href] of links) {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = href;
    $('nav').appendChild(a);
  }
}

function lcmPeriods(periods) {
  const ms = periods.map((p) => Math.max(1, Math.round(p * 1000)));
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let l = ms[0];
  for (const m of ms.slice(1)) {
    l = (l / gcd(l, m)) * m;
    if (l > 600000) return Math.max(...periods); // not worth a long common cycle; scrubber covers the longest loop
  }
  return l / 1000;
}

async function start() {
  buildNav();
  const cardId = IDS.includes(params.get('scene')) ? params.get('scene') : 'merge';
  const wanted = MODE === 'card' ? [cardId] : IDS;

  const fontJobs = FACES.map((f) =>
    document.fonts.load(f).then((list) => {
      if (!list.length) console.warn(`[reel] font ${f} did not load; fallback face in use`);
    }, (err) => console.warn(`[reel] font ${f} failed:`, err)),
  );
  const [scenes] = await Promise.all([Promise.all(wanted.map(loadScene)), Promise.all(fontJobs)]);

  // Transport state. Single source of truth: t. Rendering reads nothing else.
  let t = 0, playing = MODE !== 'sheet' && !EXPORT, last = null, dirty = true;
  let TOTAL = 1;
  let chapters = [];
  let views = [];
  let render = () => '';
  let fullView = params.get('view') === 'full';

  if (MODE === 'reel') {
    const reel = buildReel(scenes);
    TOTAL = reel.total;
    chapters = reel.chapters;
    console.log(`[reel] total ${TOTAL.toFixed(2)} s = ${reel.formula}`);
    const missing = scenes.filter((s) => s.placeholder).map((s) => s.id);
    if (missing.length) console.warn('[reel] placeholders:', missing.join(', '));
    $('title').textContent = `Skills reel, ${TOTAL.toFixed(1)} s${missing.length ? `, placeholders: ${missing.join(', ')}` : ''}`;
    const v = EXPORT ? makeView(main, W, H, 1) : makeView(main, ...fitStage());
    views = [v];
    window.__reel = reel;
    let scratch = null;
    render = (x) => {
      if (BLUR > 1 && inCameraMove(reel, x)) {
        // 180 degree shutter: BLUR sub-frames spread over half a frame, centred on x, averaged in sRGB.
        if (!scratch || scratch.width !== v.cv.width || scratch.height !== v.cv.height) scratch = new OffscreenCanvas(v.cv.width, v.cv.height);
        const sc = scratch.getContext('2d');
        const span = 0.5 / FPS;
        let note = '';
        for (let k = 0; k < BLUR; k++) {
          const tk = qt(x + ((k + 0.5) / BLUR - 0.5) * span);
          note = drawReelFrame(sc, scratch, reel, scenes, Math.max(0, Math.min(TOTAL - 1e-6, tk)));
          const { ctx } = v;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = k === 0 ? 1 : 1 / (k + 1);
          ctx.drawImage(scratch, 0, 0);
        }
        v.ctx.globalAlpha = 1;
        return note + `  blur ${BLUR}`;
      }
      return drawReelFrame(v.ctx, v.cv, reel, scenes, x);
    };
    if (!EXPORT) addEventListener('resize', () => { sizeView(v, ...fitStage()); dirty = true; });
  } else if (MODE === 'card') {
    const sc = scenes[0];
    TOTAL = sc.period;
    chapters = [0, 0.25, 0.5, 0.75].map((p) => ({ t: p * sc.period, name: 'p ' + p }));
    $('title').textContent = `${sc.name}  card loop ${sc.period}s${sc.placeholder ? '  (placeholder)' : ''}  ${sc.caption}`;
    const v = makeView(main, CARD_W, CARD_H);
    views = [v];
    const applyView = () => {
      if (fullView) sizeView(v, ...fitStage());
      else sizeView(v, CARD_W, CARD_H);
      $('view').textContent = fullView ? 'Card size' : 'Full size';
      dirty = true;
    };
    $('view').hidden = false;
    $('view').onclick = () => { fullView = !fullView; applyView(); };
    addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') $('view').click(); });
    addEventListener('resize', () => { if (fullView) applyView(); });
    applyView();
    render = (x) => { drawScene(v, sc, x); return ''; };
  } else if (MODE === 'grid') {
    TOTAL = lcmPeriods(scenes.map((s) => s.period));
    const grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.gridTemplateColumns = `repeat(3, ${CARD_W}px)`;
    main.appendChild(grid);
    main.style.placeItems = 'start center';
    views = scenes.map((sc) => {
      const fig = document.createElement('figure');
      grid.appendChild(fig);
      const v = makeView(fig, CARD_W, CARD_H);
      const capt = document.createElement('figcaption');
      capt.textContent = `${sc.name}  ${sc.period}s${sc.placeholder ? '  placeholder' : ''}`;
      fig.appendChild(capt);
      v.sc = sc;
      return v;
    });
    $('title').textContent = `Series grid, common cycle ${TOTAL}s`;
    render = (x) => { for (const v of views) drawScene(v, v.sc, x); return ''; };
  } else {
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    main.appendChild(sheet);
    main.style.placeItems = 'start center';
    const PS = [0, 0.25, 0.5, 0.75];
    sheet.appendChild(document.createElement('div'));
    for (const p of PS) {
      const h = document.createElement('div');
      h.className = 'colhead';
      h.textContent = 'p = ' + p;
      sheet.appendChild(h);
    }
    for (const sc of scenes) {
      const rh = document.createElement('div');
      rh.className = 'rowhead';
      rh.textContent = sc.name + (sc.placeholder ? ' (placeholder)' : '');
      sheet.appendChild(rh);
      for (const p of PS) {
        const v = makeView(sheet, CARD_W, CARD_H);
        v.sc = sc;
        v.p = p;
        views.push(v);
      }
    }
    $('transport').hidden = true;
    $('title').textContent = 'Contact sheet, all nine at p = 0, .25, .5, .75';
    render = () => { for (const v of views) drawScene(v, v.sc, v.p * v.sc.period); return ''; };
  }

  const range = $('range'), play = $('play'), time = $('time'), noteEl = $('note');
  const wrapT = (x) => (MODE === 'reel' ? Math.max(0, Math.min(TOTAL - 1e-3, x)) : mod(x, TOTAL));
  const seek = (x) => { t = qt(wrapT(Number(x) || 0)); dirty = true; };
  const setPlaying = (on) => { playing = on; play.textContent = on ? 'Pause' : 'Play'; last = null; };
  const step = (dir) => { setPlaying(false); seek(t + dir / FPS); };
  const chapterAt = (x) => { let c = ''; for (const ch of chapters) if (ch.t <= x + 1e-9) c = ch.name; return c; };

  range.max = String(TOTAL);
  range.oninput = () => seek(range.value);
  play.onclick = () => setPlaying(!playing);
  $('prev').onclick = () => step(-1);
  $('next').onclick = () => step(1);
  // Drop focus after a click so Space never toggles twice (button activation plus the key handler).
  for (const b of document.querySelectorAll('#transport button')) b.addEventListener('click', () => b.blur());
  const ticks = $('ticks');
  chapters.forEach((ch, i) => {
    const d = document.createElement('div');
    d.className = 'tick ' + (i % 2 ? 'hi' : 'lo');
    d.style.left = (ch.t / TOTAL) * 100 + '%';
    const s = document.createElement('span');
    s.textContent = ch.name;
    d.appendChild(s);
    ticks.appendChild(d);
  });
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === ',') step(-1);
    else if (e.key === '.') step(1);
    else if (e.key === '[' || e.key === ']') {
      const list = chapters.map((c) => c.t);
      const next = e.key === ']' ? list.find((x) => x > t + 1e-6) : [...list].reverse().find((x) => x < t - 1e-6);
      if (next !== undefined) seek(next);
    }
  });

  const paint = () => {
    const note = render(t);
    dirty = false;
    if (EXPORT) return;
    time.textContent = `${t.toFixed(2)} / ${TOTAL.toFixed(2)} s  ${chapterAt(t)}`;
    noteEl.textContent = note || '';
    if (document.activeElement !== range) range.value = String(t);
  };
  const frame = (now) => {
    if (playing) {
      if (last !== null) {
        const nt = t + Math.min(0.1, (now - last) / 1000);
        t = qt(MODE === 'reel' ? (nt >= TOTAL ? 0 : nt) : mod(nt, TOTAL));
        dirty = true;
      }
      last = now;
    }
    if (dirty) paint();
    requestAnimationFrame(frame);
  };

  window.renderAt = (x) => {
    setPlaying(false);
    seek(x);
    paint();
    return new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));
  };
  window.grabFrame = (x) => {
    setPlaying(false);
    t = qt(Math.max(0, Math.min(TOTAL - 1e-6, Number(x) || 0)));
    paint();
    return views[0].cv.toDataURL('image/png');
  };
  window.__anim = {
    seek: (x) => { seek(x); paint(); },
    pause: () => setPlaying(false),
    play: () => setPlaying(true),
    get t() { return t; },
    TOTAL,
    chapters,
    mode: MODE,
  };
  window.reelInfo = {
    total: TOTAL,
    chapters,
    formula: window.__reel ? window.__reel.formula : '',
    placeholders: scenes.filter((s) => s.placeholder).map((s) => s.id),
    fps: FPS,
    blur: BLUR,
  };

  if (params.has('t')) {
    setPlaying(false);
    seek(parseFloat(params.get('t')));
  } else if (!playing) {
    play.textContent = 'Play';
  }
  paint();
  if (!EXPORT) requestAnimationFrame(frame);
  window.reelReady = true;
  markReady();
  dispatchEvent(new Event('reel-ready'));
}

start().catch((err) => {
  console.error('[reel] failed to start:', err);
  const p = document.createElement('pre');
  p.className = 'err';
  p.textContent = 'reel failed to start: ' + (err && err.stack ? err.stack : err);
  main.appendChild(p);
});
