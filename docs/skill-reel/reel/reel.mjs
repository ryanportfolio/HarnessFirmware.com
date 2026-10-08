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
  target: 95,
  introMin: 4.5,     // the product line under the title needs about 4 s on screen
  introMax: 4.5,
  truck: 1.0,       // transition length; the incoming loop starts when the truck starts
  pullback: 1.8,    // camera pulls back to the nine stations at rest in one row: the bench it travelled
  rowHold: 0.3,     // the row holds
  fold: 1.1,        // the row folds into three bench rows of three, readable, with names
  slate: 3.4,       // end slate hold (the plate arrives 0.5 s before it, so the URL holds about 3.9 s)
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
  tag: '400 34px "Departure Mono", "Departure Mono fallback", monospace',
  introTitle: '781 168px "Lineal", "Lineal fallback", sans-serif',
  introSub: '400 26px "Departure Mono", "Departure Mono fallback", monospace',
  introLine: '500 42px "Harness Text", "Harness Text fallback", sans-serif',
  tileName: '781 34px "Lineal", "Lineal fallback", sans-serif',
  tileTag: '400 16px "Departure Mono", "Departure Mono fallback", monospace',
  slateUrl: '400 44px "Departure Mono", "Departure Mono fallback", monospace',
  slateLine: '781 68px "Lineal", "Lineal fallback", sans-serif',
  slateAccent: 'italic 600 68px "Fraunces", "Fraunces fallback", serif',
};

// What Harness Firmware is, in the site's own words: the homepage lede (site/index.html line 74,
// site/hero-pillars.mjs settleLine) without its closing period (display text carries none).
const PRODUCT_LINE = 'Memory, workflows and review for Claude Code and Codex, built into the repository';

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
  // normal (bilinear) smoothing: every bitmap the reel scales is drawn within 2x of its own size
  ctx.imageSmoothingQuality = 'low';
  ctx.fillStyle = P.ink;
  ctx.fillRect(0, 0, cv.width, cv.height);
}

// One vignette in screen space over the whole reel frame. Scenes draw theirs off in the reel
// (kit RENDER.vignette), so the ground runs on unbroken across a truck's panel joint.
function vignette(ctx, a = 0.58) {
  const g = ctx.createRadialGradient(W / 2, 580, 420, W / 2, 580, 1240);
  g.addColorStop(0, 'rgba(3,5,4,0)');
  g.addColorStop(1, `rgba(3,5,4,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
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
//   total = intro + opener + sum(periods) - (n - 1) * truck / 2 + pullback + rowHold + fold + slate

export function buildReel(scenes) {
  const T = TIMING;
  const merge = scenes[0];
  const openerDur = merge.opener ? merge.opener.duration : 0;
  const sum = scenes.reduce((s, sc) => s + sc.period, 0);
  const endMove = T.pullback + T.rowHold + T.fold;
  const rest = openerDur + sum - ((scenes.length - 1) * T.truck) / 2 + endMove + T.slate;
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
  // pullback spans the whole end move: the camera (cam), the row's hold, then the fold
  const pullback = { a: showEnd, b: showEnd + endMove };
  pullback.cam = { a: showEnd, b: showEnd + T.pullback };
  pullback.fold = { a: pullback.cam.b + T.rowHold, b: pullback.b };
  const slate = { a: pullback.b, b: pullback.b + T.slate };
  const total = slate.b;

  // Caption plates: { a: fade-in start, b: fade-out end, name, kind, lines: [{ text, a, b }] }.
  // An opener caption's [from, to] (declared by the scene) is the time it stays fully readable: the
  // plate fades in before `from` and out after `to`, so the shell never shortens a declared window.
  const plates = [];
  if (opener) {
    // Two captions closer than the two fades share the gap between them (in proportion), so they
    // play one after the other and never overlap in the band.
    for (const c of merge.opener.captions) {
      const from = opener.a + c.from, to = opener.a + c.to;
      const prev = plates[plates.length - 1];
      let fin = T.capIn;
      if (prev) {
        const gap = from - prev.to;
        if (gap < 0) console.warn(`[reel] opener captions overlap: "${c.line}" starts before the previous one ends`);
        if (gap < prev.fout + fin) {
          const k = Math.max(0, gap) / (prev.fout + fin);
          prev.fout *= k;
          fin *= k;
          prev.b = prev.to + prev.fout;
        }
      }
      plates.push({ a: from - fin, b: to + T.capOut, to, fin, fout: T.capOut, name: c.name, kind: c.name === merge.name ? merge.kind : '', lines: [{ text: c.line, a: -Infinity, b: Infinity }] });
    }
  }
  for (const L of loops) {
    const a = L.a + T.capInDelay, b = L.leave - T.capOutLead + T.capOut;
    const prev = plates[plates.length - 1];
    // The opener's last plate names /merge and runs to the opener's end: the loop keeps that plate
    // on screen (no exit and re-entry of the same name) and crossfades its line if the loop's differs,
    // starting the crossfade no earlier than the end of the opener line's declared window.
    if (L.i === 0 && opener && prev && prev.name === L.sc.name && prev.to >= opener.b - 0.05) {
      prev.b = Math.max(prev.b, b);
      const old = prev.lines[0];
      if (L.sc.caption && L.sc.caption !== old.text) {
        old.b = Math.max(L.a + T.lineSwap / 2, prev.to + T.lineSwap);
        prev.lines.push({ text: L.sc.caption, a: old.b - T.lineSwap, b: Infinity });
      }
      continue;
    }
    plates.push({ a, b, name: L.sc.name, kind: L.sc.kind, lines: [{ text: L.sc.caption, a: -Infinity, b: Infinity }] });
  }

  const chapters = [{ t: 0, name: 'intro' }];
  if (opener) chapters.push({ t: opener.a, name: merge.name + ' opener' });
  for (const L of loops) chapters.push({ t: L.a, name: L.sc.name });
  chapters.push({ t: pullback.a, name: 'pull back' }, { t: pullback.fold.a, name: 'fold' }, { t: slate.a, name: 'end slate' });
  const formula = `intro ${qt(intro)} + opener ${openerDur} + sum(periods) ${qt(sum)} - ${scenes.length - 1} x ${T.truck / 2} + pullback ${T.pullback} + row ${T.rowHold} + fold ${T.fold} + slate ${T.slate}`;
  return { intro, opener, loops, plates, pullback, slate, total, chapters, formula };
}

// Times where the camera moves fast enough to want sub-frame blur.
function inCameraMove(reel, t) {
  if (t >= reel.pullback.cam.a && t < reel.pullback.cam.b) return true;
  if (t >= reel.pullback.fold.a && t < reel.pullback.fold.b) return true;
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
  const [alpha, u, v] = plateAlpha(t, P0.a, P0.b, P0.fin ?? T.capIn, P0.fout ?? T.capOut);
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
    // A scene that is not a skill (smart-compact is a Claude Code mod) carries its kind as a boxed
    // mono label on the name's baseline, the same treatment as the .sr-mod tag on /skills.
    if (P0.kind) {
      ctx.font = FONT.tag;
      setTracking(ctx, 0.08 * 34);
      const text = P0.kind.toUpperCase();
      const m = ctx.measureText(text);
      const asc = m.actualBoundingBoxAscent || 24;
      const padX = 16, padY = 11;
      const tw = Math.round(m.width - 0.08 * 34 + padX * 2);
      const tx = Math.round(x + nameW + 28), ty = Math.round(140 - asc - padY), th = Math.round(asc + padY * 2);
      ctx.fillStyle = 'rgba(15,18,16,0.82)';
      ctx.fillRect(tx, ty, tw, th);
      ctx.strokeStyle = CAPTION;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(tx, ty, tw, th);
      ctx.fillStyle = CAPTION;
      ctx.fillText(text, tx + padX, 140);
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

// Intro: the title block stands over the bench while the merge opener's first frame waits under it,
// dimmed; the bench rule draws across, the title lifts away and the lamp comes up on the station.
// No wipe and no scale change: the opener's t = 0 frame is the intro's last frame.
function drawIntro(ctx, base, t, I, scenes) {
  const merge = scenes[0];
  const fn = merge.opener ? merge.opener.draw : merge.draw;
  drawPanel(ctx, base, 0, 0, 1, merge, fn, 0);
  onStage(ctx, base, () => {
    vignette(ctx);
    // the station waits in the dark, then the lamp comes up as the title leaves
    const dimIn = lerp(0.9, 0.74, easeOut(seg(t, 0, 0.4 * I)));
    const lampUp = easeInOut(seg(t, I - 1.0, I));
    const dim = dimIn * (1 - lampUp);
    if (dim > 0) {
      ctx.fillStyle = `rgba(15,18,16,${dim})`;
      ctx.fillRect(0, 0, W, H);
    }
    // the bench rule draws across ahead of the light, then hands over to the bench's own lit edge
    const lead = easeInOut(seg(t, 0.12, 0.12 + 0.36 * I)) * W;
    const ruleA = 1 - lampUp;
    if (lead > 0 && ruleA > 0) {
      ctx.globalAlpha = ruleA;
      ctx.fillStyle = '#6f957a';
      ctx.fillRect(0, BENCH_Y - 3, lead, 2.5);
      ctx.fillStyle = P.dim;
      ctx.fillRect(0, BENCH_Y - 0.5, lead, 3);
      ctx.globalAlpha = 1;
    }
    const out = easeIn(seg(t, I - 0.45, I - 0.1));
    const lift = out * -36;
    const r0 = easeOut(seg(t, 0.05, 0.45));
    const r1 = easeOut(seg(t, 0.1, 0.55));
    const r2 = easeOut(seg(t, 0.2, 0.6));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    if (r0 * (1 - out) > 0) {
      ctx.globalAlpha = r0 * (1 - out);
      ctx.fillStyle = SUB;
      ctx.font = FONT.introSub;
      setTracking(ctx, 6);
      ctx.fillText('HARNESS FIRMWARE', W / 2 + 3, 300 + (1 - r0) * 10 + lift);
      setTracking(ctx, 0);
    }
    if (r1 * (1 - out) > 0) {
      ctx.globalAlpha = r1 * (1 - out);
      ctx.fillStyle = CAPTION;
      ctx.font = FONT.introTitle;
      setTracking(ctx, -0.015 * 168);
      ctx.fillText('Skills', W / 2, 468 + (1 - r1) * 18 + lift);
      setTracking(ctx, 0);
    }
    if (r2 * (1 - out) > 0) {
      ctx.globalAlpha = r2 * (1 - out);
      ctx.fillStyle = SUB;
      ctx.font = FONT.introLine;
      const cut = PRODUCT_LINE.indexOf(', built');
      ctx.fillText(PRODUCT_LINE.slice(0, cut + 1), W / 2, 560 + (1 - r2) * 12 + lift);
      ctx.fillText(PRODUCT_LINE.slice(cut + 2), W / 2, 618 + (1 - r2) * 12 + lift);
    }
  });
}

// End: the camera pulls back from the last station until all nine stand side by side in one row,
// edge to edge, so their benches join into the one bench the trucks travelled. The row holds, then
// folds into three bench rows of three (448 x 252 per station at 1920, readable, with names) under
// the maker's plate. Reel order runs left to right, so the last scene (showpiece) is the row's
// right end, where the camera starts, and the bottom-right station once folded.
const GRID = { tw: 448, th: 252, gap: 14, top: 254 };
GRID.x0 = Math.round((W - 3 * GRID.tw) / 2);
const rowRect = (k, n) => ({ x: (k * W) / n, y: (H - H / n) / 2, w: W / n, h: H / n });
const gridRect = (k) => ({ x: GRID.x0 + (k % 3) * GRID.tw, y: GRID.top + Math.floor(k / 3) * (GRID.th + GRID.gap), w: GRID.tw, h: GRID.th });
const cubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

// Snapshots: each scene's t = 0 frame as the reel draws it (no per-scene vignette; the reel's one
// vignette goes over the whole frame), rendered once at the view's size, then halved with
// high-quality resampling down to the folded station's exact device size and on down to the row
// station's. Drawing picks the smallest level at least as wide as the station on screen, so every
// bitmap is drawn within 2x of its size with normal smoothing. Holds one canvas size only: a
// resize drops the old size's bitmaps.
const snapshots = new Map();
let snapshotSize = '';
function snapshot(scene, cw, ch, n) {
  const size = cw + 'x' + ch;
  if (size !== snapshotSize) {
    snapshots.clear();
    snapshotSize = size;
  }
  let levels = snapshots.get(scene.id);
  if (!levels) {
    const base = cw / W;
    const full = new OffscreenCanvas(cw, ch);
    const c = full.getContext('2d');
    c.fillStyle = P.ink;
    c.fillRect(0, 0, cw, ch);
    const was = kit.RENDER.vignette;
    kit.setVignette(false);
    drawPanel(c, base, 0, 0, 1, scene, scene.draw, 0);
    kit.setVignette(was);
    levels = [full];
    let src = full;
    for (const tw of [Math.round(GRID.tw * base), Math.round((W / n) * base)]) {
      while (src.width > tw) {
        const nw = src.width / 2 > tw ? Math.round(src.width / 2) : tw;
        const nh = nw === tw ? Math.round((tw * ch) / cw) : Math.round(src.height / 2);
        const lv = new OffscreenCanvas(nw, nh);
        const lc = lv.getContext('2d');
        lc.imageSmoothingEnabled = true;
        lc.imageSmoothingQuality = 'high';
        lc.drawImage(src, 0, 0, nw, nh);
        levels.push(lv);
        src = lv;
      }
    }
    snapshots.set(scene.id, levels);
  }
  return levels;
}

// Station rectangles (stage units) at reel time t in the end move.
function endRects(t, pb, n) {
  const rects = [];
  if (t < pb.fold.a) {
    // Camera: zoom Z from the one that fills the frame with the last station down to 1, exponential
    // so it reads as a steady pull; the focus point moves with 1 / Z so the last station stays put
    // on screen while the frame opens around it.
    const e = cubic(seg(t, pb.cam.a, pb.cam.b));
    const last = rowRect(n - 1, n);
    const Z0 = W / last.w, Z = Math.pow(Z0, 1 - e);
    const w = (1 / Z - 1 / Z0) / (1 - 1 / Z0);
    const fx = lerp(last.x + last.w / 2, W / 2, w), fy = lerp(last.y + last.h / 2, H / 2, w);
    for (let k = 0; k < n; k++) {
      const r = rowRect(k, n);
      rects.push({ x: (r.x - fx) * Z + W / 2, y: (r.y - fy) * Z + H / 2, w: r.w * Z, h: r.h * Z });
    }
    return rects;
  }
  // Fold, in two overlapping moves of the three runs of three (three parts moving, never crossing):
  // each run first slides straight up or down to its line, then widens about that line's centre
  // into its place. The lines' bands never overlap, so no run passes through another.
  const u = seg(t, pb.fold.a, pb.fold.b);
  const a = cubic(seg(u, 0, 0.5)), b = cubic(seg(u, 0.4, 1));
  const per = Math.ceil(n / 3);
  for (let k = 0; k < n; k++) {
    const s = Math.floor(k / per), j = k % per;
    const r = rowRect(k, n), g = gridRect(k);
    const runX0 = rowRect(s * per, n).x, runW = per * r.w;
    const cy = lerp(r.y + r.h / 2, g.y + g.h / 2, a);
    const x0 = lerp(runX0, GRID.x0, b), tw = lerp(runW, per * GRID.tw, b) / per;
    const th = lerp(r.h, g.h, b);
    rects.push({ x: x0 + j * tw, y: cy - th / 2, w: tw, h: th });
  }
  return rects;
}

function drawEnd(ctx, base, cv, scenes, t, reel) {
  const n = scenes.length, pb = reel.pullback;
  const rects = endRects(t, pb, n);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < n; k++) {
    const r = rects[k];
    // edges rounded one by one, so neighbours in a run share an edge with no hairline between
    const xa = Math.round(r.x * base), xb = Math.round((r.x + r.w) * base);
    const ya = Math.round(r.y * base), yb = Math.round((r.y + r.h) * base);
    if (xa > cv.width || ya > cv.height || xb < 0 || yb < 0) continue;
    const levels = snapshot(scenes[k], cv.width, cv.height, n);
    let lv = levels[0];
    for (const L of levels) if (L.width >= xb - xa - 0.5) lv = L;
    ctx.drawImage(lv, xa, ya, xb - xa, yb - ya);
  }
  ctx.restore();
  onStage(ctx, base, () => {
    // one vignette over the frame, lighter once the camera is out so the corner stations stay lit
    vignette(ctx, lerp(0.58, 0.3, cubic(seg(t, pb.cam.a, pb.cam.b))));
    const done = easeOut(seg(t, pb.fold.b - 0.25, pb.fold.b + 0.35));
    if (done <= 0) return;
    // a fine rule round each folded line, and the skill's name in each station's apron
    ctx.globalAlpha = done;
    ctx.strokeStyle = '#2f4436';
    ctx.lineWidth = 1.5;
    const per = Math.ceil(n / 3);
    for (let s = 0; s * per < n; s++) {
      const g = gridRect(s * per);
      ctx.strokeRect(g.x - 1, g.y - 1, Math.min(per, n - s * per) * GRID.tw + 2, GRID.th + 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let k = 0; k < n; k++) {
      const g = gridRect(k);
      const x = g.x + 16, y = g.y + GRID.th - 15;
      ctx.font = FONT.tileName;
      setTracking(ctx, -0.015 * 34);
      ctx.fillStyle = CAPTION;
      ctx.fillText(scenes[k].name, x, y);
      const nw = ctx.measureText(scenes[k].name).width;
      setTracking(ctx, 0);
      if (scenes[k].kind) {
        ctx.font = FONT.tileTag;
        setTracking(ctx, 0.08 * 16);
        const text = scenes[k].kind.toUpperCase();
        const m = ctx.measureText(text);
        const asc = m.actualBoundingBoxAscent || 11;
        const tx = Math.round(x + nw + 12), ty = Math.round(y - asc - 6);
        ctx.fillStyle = 'rgba(15,18,16,0.82)';
        ctx.fillRect(tx, ty, Math.round(m.width + 12), Math.round(asc + 12));
        ctx.strokeStyle = CAPTION;
        ctx.strokeRect(tx, ty, Math.round(m.width + 12), Math.round(asc + 12));
        ctx.fillStyle = CAPTION;
        ctx.fillText(text, tx + 7, y);
        setTracking(ctx, 0);
      }
    }
  });
}

// The maker's plate over the folded bench: arrives in the last half second of the fold and holds
// through the slate, so the URL is on screen for the slate's whole length.
function drawSlate(ctx, t, slate) {
  const u = easeOut(seg(t, slate.a - 0.5, slate.a));
  if (u <= 0) return;
  const dy = (1 - u) * -40;
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
  const pw = Math.round(Math.max(wl + wr, wu) + 170), ph = 188;
  const px = Math.round(W / 2 - pw / 2), py = 44 + dy;
  // a dark metal plate with a lit top edge, four screws, a soft shadow on the wall
  kit.contactShadow(ctx, px + pw / 2 + 10, py + ph + 14, pw * 0.52, 18, 0.45 * u);
  kit.prism(ctx, kit.rect(px, py, pw, ph), 12, MAT.metal, { sil: 3 });
  for (const [sx, sy] of [[px + 20, py + 20], [px + pw - 20, py + 20], [px + 20, py + ph - 20], [px + pw - 20, py + ph - 20]]) {
    kit.ball(ctx, sx, sy, 6.5, MAT.metal);
    ctx.strokeStyle = MAT.metal.side;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx - 4, sy + 2);
    ctx.lineTo(sx + 4, sy - 2);
    ctx.stroke();
  }
  ctx.textAlign = 'left';
  const lx = W / 2 - (wl + wr) / 2;
  ctx.fillStyle = CAPTION;
  ctx.font = FONT.slateLine;
  setTracking(ctx, -0.015 * 68);
  ctx.fillText(left, lx, py + 94);
  setTracking(ctx, 0);
  ctx.font = FONT.slateAccent;
  ctx.fillText(right, lx + wl, py + 94);
  ctx.textAlign = 'center';
  ctx.fillStyle = SUB;
  ctx.font = FONT.slateUrl;
  ctx.fillText('harnessfirmware.com', W / 2, py + 158);
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Frame renderers.

function drawReelFrame(ctx, cv, reel, scenes, t) {
  const base = cv.width / W;
  beginFrame(ctx, cv);
  kit.setVignette(false); // one vignette over the whole frame instead of one per panel
  let note = '';
  try {
    if (t < reel.intro) {
      drawIntro(ctx, base, t, reel.intro, scenes);
      note = 'intro';
    } else if (reel.opener && t < reel.opener.b) {
      drawPanel(ctx, base, 0, 0, 1, scenes[0], scenes[0].opener.draw, qt(t - reel.opener.a));
      onStage(ctx, base, () => vignette(ctx));
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
      onStage(ctx, base, () => vignette(ctx));
      if (L.sc.placeholder) note += '  PLACEHOLDER';
    } else {
      // the first frame equals the last scene's last frame: same still, same vignette
      drawEnd(ctx, base, cv, scenes, t, reel);
      note = t < reel.pullback.fold.a ? 'pull back  all nine at p = 0 in one row' : t < reel.slate.a ? 'fold  into three lines' : 'end slate';
    }
    onStage(ctx, base, () => {
      for (const p of reel.plates) drawPlate(ctx, p, t);
      if (t >= reel.slate.a - 0.5) drawSlate(ctx, t, reel.slate);
    });
  } finally {
    kit.setVignette(true);
  }
  return note;
}

// Warm-up for playback, one unit per frame: while scene j holds, build the snapshot of scene j + 1
// (it renders that scene's t = 0 frame at the view's scale, which also builds its cached static
// layers), so the first frame after a truck never builds a layer. Index -1 is the intro, which
// warms merge. Snapshots for every scene exist by the pull back.
// `warmed` holds the scenes warmed on this pass through the reel (the caller clears it when the
// clock goes back), because a snapshot built on an earlier pass says nothing about which layers
// the cache still holds now.
let warmScratch = null;
function warmStep(reel, scenes, cv, t, warmed) {
  if (t >= reel.pullback.a) return;
  let j = -1;
  for (let k = 0; k < reel.loops.length; k++) if (reel.loops[k].a <= t) j = k;
  const next = j + 1;
  if (next >= scenes.length || warmed.has(next)) return;
  const L = j >= 0 ? reel.loops[j] : null;
  // only during a hold: not in a truck, not in the second before the next truck
  if (L && (t < L.a + TIMING.truck + 0.3 || t > L.leave - 1.2)) return;
  const sc = scenes[next];
  if (!warmScratch || warmScratch.width !== cv.width || warmScratch.height !== cv.height) warmScratch = new OffscreenCanvas(cv.width, cv.height);
  // Draw the scene's t = 0 frame offscreen with a budget of one new kit layer, once per frame,
  // until a draw builds nothing: each frame builds at most one full-size layer, and a warm cache
  // (the reel holds every scene's layers, see setLayerBudget in start) finishes on the first call.
  kit.setVignette(false);
  kit.RENDER.buildsLeft = 1;
  try {
    drawPanel(warmScratch.getContext('2d'), cv.width / W, 0, 0, 1, sc, sc.draw, 0);
  } finally {
    const builtNothing = kit.RENDER.buildsLeft === 1;
    kit.RENDER.buildsLeft = Infinity;
    kit.setVignette(true);
    if (builtNothing) warmed.add(next);
  }
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
  let afterPaint = null; // reel only: idle warm-up work after a painted frame
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
    // The reel draws nine scenes' full-size layers in turn; hold them all (about 25 layers of 8 MB
    // at 1080p), so a second pass rebuilds nothing. The reel is not deployed; cards keep the default.
    kit.setLayerBudget(320 * 1024 * 1024);
    // Build the nine end-move snapshots before the first paint, last scene first, so a seek into
    // the pull back never stalls and the early scenes' static layers are built too. Then draw every
    // level once into a 1 x 1 canvas and read it back: that forces the GPU work behind them (the
    // full-size renders and the downscales) to finish now, before the page reports ready, instead
    // of on the first played frame.
    const t0 = performance.now();
    for (let k = scenes.length - 1; k >= 0; k--) snapshot(scenes[k], v.cv.width, v.cv.height, scenes.length);
    const sink = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
    for (const levels of snapshots.values()) for (const lv of levels) sink.drawImage(lv, 0, 0, 1, 1);
    sink.getImageData(0, 0, 1, 1);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    console.log(`[reel] snapshots built in ${Math.round(performance.now() - t0)} ms, layers ${JSON.stringify(kit.layerStats())}`);
    const warmed = new Set();
    let warmT = -1;
    afterPaint = () => {
      if (!playing) return;
      if (t < warmT) warmed.clear();
      warmT = t;
      warmStep(reel, scenes, v.cv, t, warmed);
    };
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
    if (dirty) {
      paint();
      if (afterPaint) afterPaint();
    }
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
