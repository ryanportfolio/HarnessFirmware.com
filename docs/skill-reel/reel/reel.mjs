// Skills reel dev player (not deployed). Hosts the renderer in /site/skill-reel/reel.mjs (the same
// module the /skills player loads) and adds the dev modes, the transport and the capture hooks.
// Modes: ?mode=reel (default), ?mode=card&scene=<id>, ?mode=grid, ?mode=sheet. ?t=<seconds> seeks and pauses.
// ?blur=<n> averages n sub-frames (180 degree shutter at ?fps, default 60) during trucks and the pull back.
// ?export=1 fixes the canvas at 1920x1080 device px with no page chrome, for export.mjs.
// Capture: window.renderAt(t) renders t synchronously and resolves after paint; window.grabFrame(t)
// renders t and returns the canvas as a PNG data URL; window.__anim mirrors the motion-design stills.mjs
// contract (seek, pause, play, t, TOTAL).

import * as kit from '/site/skill-reel/kit.mjs';
import { IDS, buildReel, loadReel, prepareReel, drawReel, drawScene, warmStep } from '/site/skill-reel/reel.mjs';

const { W, H } = kit;
const DPR_CAP = 1.5;
const CARD_W = 480, CARD_H = 270;
const qt = (x) => Math.round(x * 1e6) / 1e6; // round the clock so >= tests do not land one step early after a seek
const mod = (x, m) => ((x % m) + m) % m;

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

  const scenes = await loadReel(wanted);

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
    // Build the nine end-move snapshots and the truck layer before the first paint (see
    // prepareSteps), so a seek into the pull back never stalls and the GPU work is done before the
    // page reports ready, not on the first played frame.
    const t0 = performance.now();
    prepareReel(v.ctx, reel, scenes);
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
    render = (x) => drawReel(v.ctx, reel, scenes, x, { blur: BLUR, fps: FPS });
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
    render = (x) => { drawScene(v.ctx, sc, x); return ''; };
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
    render = (x) => { for (const v of views) drawScene(v.ctx, v.sc, x); return ''; };
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
    render = () => { for (const v of views) drawScene(v.ctx, v.sc, v.p * v.sc.period); return ''; };
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
