// Skills reel animatic shell: loads the nine scene modules, builds the reel timeline from their
// declared periods, and renders every mode as a pure function of t (motion-design web-engine pattern).
// Modes: ?mode=reel (default), ?mode=card&scene=<id>, ?mode=grid, ?mode=sheet. ?t=<seconds> seeks and pauses.
// Capture: window.renderAt(t) renders t synchronously and resolves after paint; window.__anim mirrors
// the motion-design stills.mjs contract (seek, pause, play, t, TOTAL).

import * as kit from './kit.js';

const { W, H, C, F, BENCH_Y, seg, lerp, easeOut, easeIn, easeInOut } = kit;

export const IDS = ['merge', 'deep-plan', 'long-horizon', 'smart-compact', 'why', 'wow-loop', 'perf-loop', 'arena', 'showpiece'];

// Reel timing, pitch A section 4. Each scene's loop length comes from the scene module itself.
export const TIMING = {
  intro: 4.0,          // bench rule, blank, key, title
  truck: 1.0,          // transition length; the incoming loop starts when the truck starts
  pullback: 2.0,       // camera pulls back to all nine at rest
  slate: 3.5,          // end slate hold
  capInDelay: 0.6,     // caption plate slides in this long after a loop starts
  capIn: 0.4,          // ease-out
  capOutLead: 0.4,     // caption starts leaving this long before the truck (or the pull back)
  capOut: 0.3,         // ease-in
  openerCapDelay: 1.0, // the /merge caption arrives this long into the opener (pitch: 5.0 s)
};

const FRAME = 1 / 60;
const DPR_CAP = 1.5;
const CARD_W = 480, CARD_H = 270;
const FACES = ['781 72px "Lineal"', '500 34px "Harness Text"', '400 26px "Departure Mono"', 'italic 600 34px "Fraunces"'];

const qt = (x) => Math.round(x * 1e6) / 1e6; // round the clock so >= tests do not land one step early after a seek
const mod = (x, m) => ((x % m) + m) % m;
const FONT = {
  title: F.title,
  line: F.line,
  introTitle: '781 168px "Lineal", "Lineal fallback", sans-serif',
  slateUrl: '400 44px "Departure Mono", "Departure Mono fallback", monospace',
  slateLine: '781 68px "Lineal", "Lineal fallback", sans-serif',
  slateAccent: 'italic 600 68px "Fraunces", "Fraunces fallback", serif',
};

// ---------------------------------------------------------------------------------------------
// Scene loading. A missing, malformed or throwing scene becomes a labelled placeholder.

function drawPlaceholder(ctx, id, reason, p) {
  kit.bench(ctx);
  ctx.save();
  ctx.strokeStyle = C.amber;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 12]);
  ctx.strokeRect(160, 250, W - 320, BENCH_Y - 310);
  ctx.setLineDash([]);
  ctx.fillStyle = C.amber;
  ctx.font = F.mono;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('placeholder: scene ' + id, W / 2, 430);
  ctx.fillStyle = C.sub;
  ctx.font = F.monoSmall;
  const text = String(reason || '');
  ctx.fillText(text.length > 120 ? text.slice(0, 117) + '...' : text, W / 2, 480);
  ctx.fillStyle = C.dim;
  ctx.fillRect(160, BENCH_Y - 40, (W - 320) * Math.max(0, Math.min(1, p)), 6);
  ctx.restore();
}

function placeholder(id, reason) {
  const period = 9.0;
  return {
    id, name: '/' + id, caption: 'scene file missing or broken', period, opener: null, placeholder: true, reason,
    draw: (ctx, t) => drawPlaceholder(ctx, id, reason, t / period),
  };
}

async function loadScene(id) {
  try {
    const m = await import(`./scenes/${id}.js`);
    const s = m.default;
    if (!s || typeof s.draw !== 'function') throw new Error('default export has no draw(ctx, t)');
    const period = Number(s.period);
    if (!(period > 0)) throw new Error('period must be a positive number of seconds');
    if (s.id && s.id !== id) console.warn(`[animatic] scenes/${id}.js declares id "${s.id}"`);
    let opener = null;
    if (s.opener && typeof s.opener.draw === 'function' && Number(s.opener.duration) > 0) {
      opener = { duration: Number(s.opener.duration), draw: s.opener.draw.bind(s.opener) };
    }
    return { id, name: String(s.name || '/' + id), kind: s.kind ? String(s.kind) : '', caption: String(s.caption || ''), period, opener, placeholder: false, draw: s.draw.bind(s) };
  } catch (err) {
    console.warn(`[animatic] scenes/${id}.js -> placeholder:`, err);
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
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, cv.width, cv.height);
}

const reported = new Set();
function reportOnce(key, err) {
  if (reported.has(key)) return;
  reported.add(key);
  console.error(`[animatic] ${key}:`, err);
}

// Draws fn(ctx, localT) into a 1920x1080 panel placed at (x, y) with scale s, in logical stage units.
function drawPanel(ctx, base, x, y, s, scene, fn, localT) {
  const enter = () => {
    ctx.save();
    ctx.setTransform(base * s, 0, 0, base * s, base * x, base * y);
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    ctx.fillStyle = C.ground;
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
  const opener = merge.opener ? { a: T.intro, b: T.intro + merge.opener.duration } : null;
  let t = opener ? opener.b : T.intro;
  const loops = scenes.map((sc, i) => {
    const a = t, b = t + sc.period;
    const isLast = i === scenes.length - 1;
    t = isLast ? b : b - T.truck / 2;
    const capIn = i === 0 && opener ? opener.a + T.openerCapDelay : a + T.capInDelay;
    const leave = isLast ? b : b - T.truck / 2; // truck start, or pull back start
    return { sc, i, a, b, capIn, capOut: leave - T.capOutLead };
  });
  const showEnd = loops[loops.length - 1].b;
  const pullback = { a: showEnd, b: showEnd + T.pullback };
  const slate = { a: pullback.b, b: pullback.b + T.slate };
  const total = slate.b;
  const chapters = [{ t: 0, name: 'intro' }];
  if (opener) chapters.push({ t: opener.a, name: merge.name + ' opener' });
  for (const L of loops) chapters.push({ t: L.a, name: L.sc.name });
  chapters.push({ t: pullback.a, name: 'pull back' }, { t: slate.a, name: 'end slate' });
  const sum = scenes.reduce((s, sc) => s + sc.period, 0);
  const formula = `intro ${T.intro} + opener ${opener ? merge.opener.duration : 0} + sum(periods) ${qt(sum)} - ${scenes.length - 1} x ${T.truck / 2} + pullback ${T.pullback} + slate ${T.slate}`;
  return { opener, loops, pullback, slate, total, chapters, formula };
}

function captionPlate(ctx, L, t) {
  const T = TIMING;
  if (t < L.capIn || t >= L.capOut + T.capOut) return;
  const u = easeOut(seg(t, L.capIn, L.capIn + T.capIn));
  const v = easeIn(seg(t, L.capOut, L.capOut + T.capOut));
  const alpha = u * (1 - v);
  if (alpha <= 0) return;
  const dx = (1 - u) * -48 + v * -48;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.caption;
  ctx.font = FONT.title;
  setTracking(ctx, -0.015 * 72);
  ctx.fillText(L.sc.name, 120 + dx, 140);
  const nameW = ctx.measureText(L.sc.name).width;
  setTracking(ctx, 0);
  // A scene that is not a skill (smart-compact is a Claude Code mod) carries its kind as a mono tag after the name.
  if (L.sc.kind) {
    ctx.font = F.mono;
    const tw = ctx.measureText(L.sc.kind).width + 24;
    const tx = 120 + dx + nameW + 28;
    ctx.strokeStyle = C.sub;
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, 98, tw, 40);
    ctx.fillStyle = C.sub;
    ctx.fillText(L.sc.kind, tx + 12, 127);
  }
  if (L.sc.caption) {
    ctx.fillStyle = C.sub;
    ctx.font = FONT.line;
    ctx.fillText(L.sc.caption, 120 + dx, 196);
  }
  ctx.restore();
}

function drawIntro(ctx, t) {
  // Bench rule draws in left to right (1.2 s quart), blank feeds in to centre, key rises beside it, hold from 2.8.
  const draw = easeOut(seg(t, 0, 1.2));
  if (draw > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W * draw, H);
    ctx.clip();
    kit.bench(ctx);
    ctx.restore();
  }
  const feed = easeInOut(seg(t, 0.9, 2.3));
  if (feed > 0) kit.blank(ctx, lerp(-80, W / 2 - 30, feed), BENCH_Y - 90);
  const rise = easeOut(seg(t, 1.9, 2.7));
  if (rise > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, BENCH_Y);
    ctx.clip();
    kit.key(ctx, W / 2 + 140, BENCH_Y + (1 - rise) * 120);
    ctx.restore();
  }
  const out = 1 - easeIn(seg(t, 3.6, 4.0));
  const r1 = easeOut(seg(t, 1.2, 1.8));
  const a1 = r1 * out;
  const a2 = easeOut(seg(t, 1.6, 2.2)) * out;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (a1 > 0) {
    ctx.globalAlpha = a1;
    ctx.fillStyle = C.caption;
    ctx.font = FONT.introTitle;
    setTracking(ctx, -0.015 * 168);
    ctx.fillText('Skills', W / 2, 420 + (1 - r1) * 16);
    setTracking(ctx, 0);
  }
  if (a2 > 0) {
    ctx.globalAlpha = a2;
    ctx.fillStyle = C.sub;
    ctx.font = F.mono;
    setTracking(ctx, 3);
    ctx.fillText('HARNESS FIRMWARE · FOR CLAUDE CODE AND CODEX', W / 2, 500);
    setTracking(ctx, 0);
  }
  ctx.restore();
}

// Row of all nine at rest. e: 0 = last scene full frame, 1 = nine thumbnails in a row.
const ROW = { tw: 192, th: 108, gap: 18, top: 600 };
function drawRow(ctx, base, scenes, e) {
  const n = scenes.length, last = n - 1;
  const x0 = (W - (n * ROW.tw + (n - 1) * ROW.gap)) / 2;
  const s1 = ROW.tw / W;
  const s = Math.pow(s1, e); // exponential zoom reads as a steady pull back
  const cx = lerp(W / 2, x0 + last * (ROW.tw + ROW.gap) + ROW.tw / 2, e);
  const cy = lerp(H / 2, ROW.top + ROW.th / 2, e);
  const pitch = (ROW.tw + ROW.gap) / s1;
  for (let k = 0; k < n; k++) {
    const pcx = cx + (k - last) * pitch * s;
    const x = pcx - (W * s) / 2, y = cy - (H * s) / 2;
    if (x > W || x + W * s < 0) continue;
    drawPanel(ctx, base, x, y, s, scenes[k], scenes[k].draw, 0);
    if (e > 0) {
      onStage(ctx, base, () => {
        ctx.globalAlpha = e;
        ctx.strokeStyle = C.dim;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, W * s, H * s);
      });
    }
  }
}

function drawSlate(ctx, t, slate) {
  const u = easeOut(seg(t, slate.a, slate.a + 0.4));
  if (u <= 0) return;
  const dy = (1 - u) * 40;
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
  const pw = Math.max(wl + wr, wu) + 160, ph = 230;
  const px = W / 2 - pw / 2, py = 250 + dy;
  ctx.strokeStyle = C.steel;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  ctx.fillStyle = C.steel;
  for (const [sx, sy] of [[px + 18, py + 18], [px + pw - 18, py + 18], [px + 18, py + ph - 18], [px + pw - 18, py + ph - 18]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  const lx = W / 2 - (wl + wr) / 2;
  ctx.fillStyle = C.caption;
  ctx.font = FONT.slateLine;
  setTracking(ctx, -0.015 * 68);
  ctx.fillText(left, lx, py + 110);
  setTracking(ctx, 0);
  ctx.font = FONT.slateAccent;
  ctx.fillText(right, lx + wl, py + 110);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.sub;
  ctx.font = FONT.slateUrl;
  ctx.fillText('harnessfirmware.com', W / 2, py + 180);
  ctx.restore();
}

export function renderReel(view, reel, scenes, t) {
  const { ctx, cv } = view;
  const base = cv.width / W;
  beginFrame(ctx, cv);
  let note = '';
  if (t < TIMING.intro) {
    onStage(ctx, base, () => drawIntro(ctx, t));
    note = 'INTRO  bench rule, blank feeds in, key rises';
  } else if (reel.opener && t < reel.opener.b) {
    drawPanel(ctx, base, 0, 0, 1, scenes[0], scenes[0].opener.draw, qt(t - reel.opener.a));
    note = `OPENER  ${scenes[0].name} review layers  ${(t - reel.opener.a).toFixed(2)} / ${scenes[0].opener.duration}s`;
  } else if (t < reel.pullback.a) {
    let j = 0;
    for (let k = 0; k < reel.loops.length; k++) if (reel.loops[k].a <= t) j = k;
    const L = reel.loops[j];
    const local = qt(t - L.a);
    if (j > 0 && t < L.a + TIMING.truck) {
      const P = reel.loops[j - 1];
      const e = easeInOut(seg(t, L.a, L.a + TIMING.truck));
      drawPanel(ctx, base, -W * e, 0, 1, P.sc, P.sc.draw, qt(mod(t - P.a, P.sc.period)));
      drawPanel(ctx, base, W * (1 - e), 0, 1, L.sc, L.sc.draw, local);
      note = `TRUCK  ${P.sc.name} -> ${L.sc.name}`;
    } else {
      drawPanel(ctx, base, 0, 0, 1, L.sc, L.sc.draw, qt(mod(local, L.sc.period)));
      note = `${j + 1}/${scenes.length} ${L.sc.name}  loop ${local.toFixed(2)} / ${L.sc.period}s  p ${(local / L.sc.period).toFixed(3)}`;
    }
    if (L.sc.placeholder) note += '  PLACEHOLDER';
  } else {
    const e = easeInOut(seg(t, reel.pullback.a, reel.pullback.b));
    drawRow(ctx, base, scenes, e);
    note = t < reel.slate.a ? 'PULL BACK  all nine at p = 0' : 'END SLATE';
  }
  onStage(ctx, base, () => {
    for (const L of reel.loops) captionPlate(ctx, L, t);
    if (t >= reel.slate.a) drawSlate(ctx, t, reel.slate);
    // Reel segment note sits one line above the scenes' own beat notes so the two never overlap.
    ctx.save();
    ctx.translate(0, -30);
    kit.note(ctx, 'ANIMATIC  ' + note);
    ctx.restore();
  });
}

function renderScene(view, scene, localT) {
  const { ctx, cv } = view;
  beginFrame(ctx, cv);
  drawPanel(ctx, cv.width / W, 0, 0, 1, scene, scene.draw, qt(mod(localT, scene.period)));
}

// ---------------------------------------------------------------------------------------------
// Page

// Until the scenes and fonts are in, renderAt waits for them; start() then replaces it with the synchronous one.
let markReady;
const ready = new Promise((res) => { markReady = res; });
window.renderAt = (x) => ready.then(() => window.renderAt(x));

const params = new URLSearchParams(location.search);
const MODE = ['reel', 'card', 'grid', 'sheet'].includes(params.get('mode')) ? params.get('mode') : 'reel';
const $ = (id) => document.getElementById(id);
const main = $('main');

function makeView(parent, cssW, cssH) {
  const cv = document.createElement('canvas');
  parent.appendChild(cv);
  const view = { cv, ctx: cv.getContext('2d'), cssW, cssH };
  sizeView(view, cssW, cssH);
  return view;
}

function sizeView(view, cssW, cssH) {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
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
      if (!list.length) console.warn(`[animatic] font ${f} did not load; fallback face in use`);
    }, (err) => console.warn(`[animatic] font ${f} failed:`, err)),
  );
  const [scenes] = await Promise.all([Promise.all(wanted.map(loadScene)), Promise.all(fontJobs)]);

  // Transport state. Single source of truth: t. Rendering reads nothing else.
  let t = 0, playing = MODE !== 'sheet', last = null, dirty = true;
  let TOTAL = 1;
  let chapters = [];
  let views = [];
  let render = () => {};
  let fullView = params.get('view') === 'full';

  if (MODE === 'reel') {
    const reel = buildReel(scenes);
    TOTAL = reel.total;
    chapters = reel.chapters;
    console.log(`[animatic] reel total ${TOTAL.toFixed(2)} s = ${reel.formula}`);
    const missing = scenes.filter((s) => s.placeholder).map((s) => s.id);
    if (missing.length) console.warn('[animatic] placeholders:', missing.join(', '));
    $('title').textContent = `Skills reel animatic, ${TOTAL.toFixed(1)} s`;
    const v = makeView(main, ...fitStage());
    views = [v];
    window.__reel = reel;
    render = (t) => renderReel(v, reel, scenes, t);
    addEventListener('resize', () => { sizeView(v, ...fitStage()); dirty = true; });
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
    render = (t) => renderScene(v, sc, t);
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
    render = (t) => { for (const v of views) renderScene(v, v.sc, t); };
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
    render = () => { for (const v of views) renderScene(v, v.sc, v.p * v.sc.period); };
  }

  const range = $('range'), play = $('play'), time = $('time');
  const wrapT = (x) => (MODE === 'reel' ? Math.max(0, Math.min(TOTAL - 1e-3, x)) : mod(x, TOTAL));
  const seek = (x) => { t = qt(wrapT(Number(x) || 0)); dirty = true; };
  const setPlaying = (on) => { playing = on; play.textContent = on ? 'Pause' : 'Play'; last = null; };
  const step = (dir) => { setPlaying(false); seek(t + dir * FRAME); };
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
    render(t);
    dirty = false;
    time.textContent = `${t.toFixed(2)} / ${TOTAL.toFixed(2)} s  ${chapterAt(t)}`;
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
  window.__anim = {
    seek: (x) => { seek(x); paint(); },
    pause: () => setPlaying(false),
    play: () => setPlaying(true),
    get t() { return t; },
    TOTAL,
    chapters,
    mode: MODE,
  };

  if (params.has('t')) {
    setPlaying(false);
    seek(parseFloat(params.get('t')));
  } else if (!playing) {
    play.textContent = 'Play';
  }
  paint();
  requestAnimationFrame(frame);
  window.animaticReady = true;
  markReady();
  dispatchEvent(new Event('animatic-ready'));
}

start().catch((err) => {
  console.error('[animatic] failed to start:', err);
  const p = document.createElement('pre');
  p.className = 'err';
  p.textContent = 'animatic failed to start: ' + (err && err.stack ? err.stack : err);
  main.appendChild(p);
});
