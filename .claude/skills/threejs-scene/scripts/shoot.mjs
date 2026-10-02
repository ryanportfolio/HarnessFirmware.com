/* Render-and-check capture for one three.js scene (threejs-scene skill, step 4).

     node .claude/skills/threejs-scene/scripts/shoot.mjs <url> --times 0,4,9,14 --out <dir>
       [--labels <css>] [--overlay <css,css>] [--canvas <css>] [--poster] [--final]

   Every round: frozen frames at 1440x900 and 390x844 (DPR 2), each shot twice for repeatability;
   canvas-only crops for the blind read; contact sheets of at most 3 columns, 6 frames per sheet;
   renderer info and measured layout at every time; fallback, reduced-motion and off-screen checks;
   time to ready and capped frame intervals (390 under 4x CPU throttle, "JS cost only").
   --labels: CSS selector for DOM labels that track the scene (canvas-drawn labels come from
   __scene.labels()). --overlay: page text that sits over or near the scene; reported when a label
   overlaps it or when it ends below the fold.
   --canvas: CSS selector for the scene's canvas when the page has more than one (default: canvas,
   first match). Scene-only crops hide every other element, so page text never reaches the blind read.
   --poster: canvas crop at the last time, for the no-WebGL fallback image.
   --strip <step>: timing sheets at 1440, one scene-only frame every <step> seconds from 0 to
   __scene.duration, 24 per sheet; holds show as runs of near-identical frames, rushed beats as jumps.
   --final: forced context loss, memory across the timeline, video at 1440, and a second launch
   with vsync and the frame-rate limit off for uncapped frame times. Numbers are for this machine.

   The page follows the skill's build contract: ?t= freezes the clock, ?gl=0 forces the fallback,
   <html data-scene="ready|fallback"> after the first frame, window.__scene = { duration, frames,
   info(), labels() } with info() flat ({ calls, triangles, programs, geometries, textures,
   pixelRatio }), optionally lines(): screen polylines of light lines, failed when one passes under
   --overlay text, and the fallback image marked <img data-scene-fallback>. Headed Chrome through
   scripts/lib/launch-chrome.mjs, never headless. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['times', 'out', 'labels', 'overlay', 'strip', 'canvas'];
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i < 0 ? null : argv[i + 1]; };
const url = argv.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]?.slice(2)));
const times = (opt('times') || '0').split(',').map(Number);
const out = path.resolve(opt('out') || '.tmp/scene-shots');
const labelSel = opt('labels'), overlaySel = opt('overlay'), canvasSel = opt('canvas') || 'canvas';
const poster = argv.includes('--poster'), final = argv.includes('--final'), stripStep = opt('strip') ? Number(opt('strip')) : null;
if (!url) throw new Error('usage: shoot.mjs <url> --times 0,4,9 --out <dir> [--labels <css>] [--overlay <css,css>] [--canvas <css>] [--strip <step>] [--poster] [--final]');

const { launchPlacedChrome } = await import(pathToFileURL(path.resolve('scripts/lib/launch-chrome.mjs')).href);
const VIEWPORTS = [
  { name: '1440', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, throttle: 1 },
  { name: '390', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, throttle: 4 },
];
const EDGE_MIN = 8, DRAW_CALL_WARN = 100;

const at = (params) => { const u = new URL(url); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v); return u.href; };
// one decimal when that is exact, otherwise every digit given, so two close times never share a file
const tag = (t) => `t${(Number.isInteger(t * 10) ? t.toFixed(1) : String(t)).padStart(4, '0')}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// init scripts run before <html> exists, so observe the document; only a terminal state counts as ready
const READY_PROBE = `new MutationObserver(() => { if (['ready', 'fallback'].includes(document.documentElement?.dataset.scene)) window.__sceneAt ??= performance.now(); })
  .observe(document, { attributes: true, subtree: true, attributeFilter: ['data-scene'] });
  // capture-only: a phone's transient overlay scrollbar makes two shots of one frozen frame differ, so hide it
  // here rather than in the page's CSS (a real visitor keeps their scrollbar)
  addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = '@media (max-width: 820px) { html { scrollbar-width: none } }'; document.head.append(s); });`;
// is the scene's own fallback on screen: the img[data-scene-fallback], displayed, visible through
// every ancestor, decoded and not zero-sized (any other image on the page proves nothing)
const FALLBACK_IMAGE = () => [...document.querySelectorAll('img[data-scene-fallback]')].map((i) => {
  let shown = i.offsetParent !== null && i.getBoundingClientRect().width > 0 && getComputedStyle(i).visibility !== 'hidden';
  for (let e = i; shown && e; e = e.parentElement) if (+getComputedStyle(e).opacity === 0) shown = false;
  return { src: i.currentSrc.split('/').pop(), shown, loaded: shown && i.complete && i.naturalWidth > 0 };
});
const fallbackShown = (imgs) => imgs.some((i) => i.loaded);

async function open(context, href, log, throttle = 1) {
  const page = await context.newPage();
  if (throttle > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: throttle });
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) log.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (q) => log.push(`requestfailed: ${q.url()} ${q.failure()?.errorText ?? ''}`));
  page.on('response', (q) => { if (q.status() >= 400) log.push(`http ${q.status()}: ${q.url()}`); });
  await page.addInitScript(READY_PROBE);
  await page.goto(href, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => ['ready', 'fallback'].includes(document.documentElement.dataset.scene), null, { timeout: 15000 });
  } catch (err) {
    // a scene that never gets ready usually threw; say what the page said instead of only timing out
    throw new Error(`${href} never set data-scene within 15 s. Page console:\n${log.join('\n') || '(empty)'}`, { cause: err });
  }
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const frames = (page) => page.evaluate(() => window.__scene?.frames ?? null);
const info = (page) => page.evaluate(() => window.__scene?.info?.() ?? null);
// frames drawn over ms; a missing counter is blocked, never a pass-shaped zero
async function framesOver(page, ms) {
  const a = await frames(page); await wait(ms); const b = await frames(page);
  return Number.isFinite(a) && Number.isFinite(b) ? b - a : 'blocked: __scene.frames is missing or not a number';
}
// canvas pixels only: every other element hidden for the shot, so overlay text never reaches a scene crop
async function sceneShot(page, opts = {}) {
  const style = await page.addStyleTag({ content: `body * { visibility: hidden !important } ${canvasSel} { visibility: visible !important }` });
  try { return await page.locator(canvasSel).first().screenshot(opts); } finally { await style.evaluate((s) => s.remove()); }
}

async function intervals(page, ms) {
  return page.evaluate((ms) => new Promise((done) => {
    const d = [];
    requestAnimationFrame((start) => {
      let last = start;
      requestAnimationFrame(function tick(now) { d.push(now - last); last = now; if (now - start < ms) requestAnimationFrame(tick); else done(d); });
    });
  }), ms);
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return +s[Math.min(s.length - 1, Math.floor(p * s.length))].toFixed(2); };
const stats = (d) => ({ p50: pct(d, 0.5), p95: pct(d, 0.95), max: pct(d, 1), samples: d.length });

// labels (DOM via --labels, canvas-drawn via __scene.labels()) against the canvas edge, the
// overlay text and each other; overlay text against the fold
function measure([labelSel, overlaySel, edgeMin, canvasSel]) {
  const c = document.querySelector(canvasSel).getBoundingClientRect();
  const boxes = (window.__scene?.labels?.() ?? []).map((r) => ({ text: r.text, x: r.x, y: r.y, w: r.w, h: r.h }));
  if (labelSel) for (const el of document.querySelectorAll(labelSel)) {
    const b = el.getBoundingClientRect();
    if (!b.width || +getComputedStyle(el).opacity === 0) continue;
    boxes.push({ text: el.textContent.trim(), x: b.left, y: b.top, w: b.width, h: b.height });
  }
  const over = (overlaySel ? overlaySel.split(',') : []).flatMap((sel) => [...document.querySelectorAll(sel.trim())].map((el) => ({ sel: sel.trim(), b: el.getBoundingClientRect() })));
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const asBox = (b) => ({ x: b.left, y: b.top, w: b.width, h: b.height });
  const labels = boxes.map((r) => {
    const sides = { left: r.x - c.left, right: c.right - r.x - r.w, top: r.y - c.top, bottom: c.bottom - r.y - r.h };
    const [side, gap] = Object.entries(sides).sort((a, b) => a[1] - b[1])[0];
    return { text: r.text, edge: Math.round(gap), side,
    overlaps: over.filter((o) => o.b.width && hit(r, asBox(o.b))).map((o) => o.sel) };
  });
  const collisions = [];
  boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => { if (hit(a, b)) collisions.push([a.text, b.text]); }));
  // solid objects passing through each other, from the scene's own oriented-box test
  const intersections = window.__scene?.intersections?.() ?? [];
  // light lines (threads, glowing strokes) the scene reports as screen polylines must not pass under overlay text
  const lightLines = window.__scene?.lines?.() ?? [];
  const under = [];
  for (const o of over) {
    if (!o.b.width) continue;
    // Liang-Barsky clip: does any part of segment a-b fall inside the rectangle, however long the segment
    const r = o.b;
    const segHits = ([ax, ay], [bx, by]) => {
      const dx = bx - ax, dy = by - ay; let t0 = 0, t1 = 1;
      for (const [p, q] of [[-dx, ax - r.left], [dx, r.right - ax], [-dy, ay - r.top], [dy, r.bottom - ay]]) {
        if (p === 0) { if (q < 0) return false; continue; }
        const t = q / p;
        if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
      }
      return t0 <= t1;
    };
    const crosses = lightLines.some((l) => l.some((p, i) => i > 0 && segHits(l[i - 1], p)));
    if (crosses) under.push(o.sel);
  }
  const fold = over.filter((o) => o.b.bottom > innerHeight).map((o) => ({ sel: o.sel, bottom: Math.round(o.b.bottom), fold: innerHeight }));
  const fails = [
    ...labels.filter((l) => l.edge < edgeMin).map((l) => `edge ${l.edge}px (${l.side}): ${l.text}`),
    ...labels.filter((l) => l.overlaps.length).map((l) => `on overlay ${l.overlaps.join(' ')}: ${l.text}`),
    ...collisions.map(([a, b]) => `labels collide: ${a} / ${b}`),
    ...fold.map((f) => `below fold ${f.bottom}/${f.fold}px: ${f.sel}`),
    ...intersections.map(([a, b]) => `solids intersect: ${a} / ${b}`),
    ...[...new Set(under)].map((sel) => `light line under overlay ${sel}`),
  ];
  return { labels, collisions, fold, intersections, fails };
}

async function sheets(browser, files, prefix) {
  const made = [];
  for (let i = 0; i < files.length; i += 6) {
    const chunk = files.slice(i, i + 6);
    const cells = await Promise.all(chunk.map(async (f) => `<figure><img src="data:image/png;base64,${(await fs.readFile(path.join(out, f))).toString('base64')}"><figcaption>${f}</figcaption></figure>`));
    const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
    await page.setContent(`<style>body{margin:0;background:#222;font:14px monospace;color:#ddd;display:grid;grid-template-columns:repeat(${Math.min(3, chunk.length)},minmax(0,${prefix.includes('390') ? 420 : 620}px));gap:10px;padding:10px}figure{margin:0}img{width:100%;display:block}figcaption{padding:4px 0}</style>${cells.join('')}`);
    await page.waitForFunction(() => [...document.images].every((im) => im.complete));
    const file = `${prefix}-${i / 6 + 1}.png`;
    await page.screenshot({ path: path.join(out, file), fullPage: true });
    await page.close();
    made.push(file);
  }
  return made;
}

// timing strip: scene-only frames every stripStep seconds, small and labelled, 24 per sheet
async function strip(browser, ctx, log) {
  const first = await open(ctx, at({ t: 0 }), log);
  const duration = await first.evaluate(() => window.__scene?.duration ?? 10);
  await first.close();
  const frames = [];
  for (let t = 0; t <= duration + 1e-6; t += stripStep) {
    const page = await open(ctx, at({ t: +t.toFixed(3) }), log);
    frames.push({ t, png: (await sceneShot(page)).toString('base64') });
    await page.close();
  }
  const made = [];
  for (let i = 0; i < frames.length; i += 24) {
    const cells = frames.slice(i, i + 24).map((x) => `<figure><img src="data:image/png;base64,${x.png}"><figcaption>t ${x.t.toFixed(2)}</figcaption></figure>`);
    const page = await browser.newPage({ viewport: { width: 1920, height: 900 } });
    await page.setContent(`<style>body{margin:0;background:#222;font:13px monospace;color:#ddd;display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:8px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 0}</style>${cells.join('')}`);
    await page.waitForFunction(() => [...document.images].every((im) => im.complete));
    const file = `strip-${i / 24 + 1}.png`;
    await page.screenshot({ path: path.join(out, file), fullPage: true });
    await page.close();
    made.push(file);
  }
  return { step: stripStep, duration, frames: frames.length, sheets: made };
}

await fs.mkdir(out, { recursive: true });
const browser = await launchPlacedChrome();
const report = { url, times, final, when: new Date().toISOString(), widths: {}, warnings: [] };
try {
  for (const vp of VIEWPORTS) {
    const { name, throttle, ...ctxOpts } = vp;
    const r = (report.widths[name] = { console: [], repeatable: {}, layout: {}, infoByT: {} });

    // frozen frames, each shot twice; canvas crop, info and layout at every time
    const ctx = await browser.newContext(ctxOpts);
    const shots = [], crops = [];
    for (const t of times) {
      const page = await open(ctx, at({ t }), r.console);
      const file = `w${name}-${tag(t)}.png`, crop = `scene-w${name}-${tag(t)}.png`;
      const a = await page.screenshot({ path: path.join(out, file) });
      await sceneShot(page, { path: path.join(out, crop) });
      r.infoByT[t] = await info(page);
      r.layout[t] = await page.evaluate(measure, [labelSel, overlaySel, EDGE_MIN, canvasSel]);
      if (poster && t === times.at(-1)) await fs.copyFile(path.join(out, crop), path.join(out, `poster-${name}.png`));
      await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.scene === 'ready');
      r.repeatable[t] = a.equals(await page.screenshot());
      shots.push(file); crops.push(crop);
      await page.close();
    }
    r.sheets = [...await sheets(browser, shots, `sheet-${name}`), ...await sheets(browser, crops, `scene-sheet-${name}`)];
    if (stripStep && name === '1440') r.strip = await strip(browser, ctx, r.console);
    const peak = (k) => Math.max(...Object.values(r.infoByT).map((i) => i?.[k] ?? 0));
    r.peak = { calls: peak('calls'), triangles: peak('triangles'), programs: peak('programs') };
    const programs = new Set(Object.values(r.infoByT).map((i) => i?.programs));
    if (programs.size > 1) report.warnings.push(`${name}: program count changes across check times (${[...programs].join(', ')}): a material compiles mid-timeline`);
    if (r.peak.calls > DRAW_CALL_WARN) report.warnings.push(`${name}: ${r.peak.calls} draw calls`);
    r.layoutFails = Object.entries(r.layout).flatMap(([t, l]) => l.fails.map((f) => `t=${t} ${f}`));

    // fallback
    const fb = await open(ctx, at({ gl: 0 }), r.console);
    r.fallbackState = await fb.evaluate(() => document.documentElement.dataset.scene);
    r.fallbackImage = await fb.evaluate(FALLBACK_IMAGE);
    if (!fallbackShown(r.fallbackImage)) report.warnings.push(`${name}: ?gl=0 shows no loaded, visible img[data-scene-fallback]`);
    await fb.screenshot({ path: path.join(out, `w${name}-fallback.png`) });
    await fb.close();

    // live run: time to ready, capped intervals, off-screen pause
    const page = await open(ctx, url, r.console, throttle);
    r.readyMs = Math.round(await page.evaluate(() => window.__sceneAt ?? -1));
    if (name === '1440') { // gzipped size of every script the page loaded (the scene, its modules, vendored three.js)
      const urls = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /\.m?js(\?|$)/.test(u)));
      report.scriptSizes = {};
      for (const u of [...new Set(urls)]) { try { const b = Buffer.from(await (await fetch(u)).arrayBuffer()); report.scriptSizes[new URL(u).pathname] = { rawKB: +(b.length / 1024).toFixed(1), gzipKB: +(gzipSync(b).length / 1024).toFixed(1) }; } catch { /* not fetchable from node */ } }
    }
    const d = await intervals(page, 6000);
    r.cappedFrameMs = { ...stats(d), cpuThrottle: throttle, note: throttle > 1 ? 'JS cost only: CPU throttle does not slow the GPU' : 'capped at the display refresh; p50 is the refresh interval' };
    const below = await page.evaluate((sel) => {
      const b = document.querySelector(sel).getBoundingClientRect().bottom + scrollY + 50;
      scrollTo({ top: b, behavior: 'instant' }); // a page's scroll-behavior:smooth would leave scrollY behind
      return scrollY >= b - 1;
    }, canvasSel);
    if (below) {
      await wait(400);
      r.framesWhileOffscreen = await framesOver(page, 1500);
    } else r.framesWhileOffscreen = 'not testable: page too short to scroll the canvas away';
    await page.close();

    if (final) {
      // memory after a live run of the whole timeline against the most any frozen frame needed:
      // three uploads geometry when an object is first drawn, so counts rise as a scene reveals
      // objects; more than the frozen peak means the live run allocated what no frame shows
      const mp = await open(ctx, url, r.console);
      const dur = (await mp.evaluate(() => window.__scene?.duration ?? 10)) * 1000;
      await wait(dur + 1500);
      const m1 = await info(mp);
      // reported, not judged: a scene whose objects come and go draws more over a live run than in
      // any one frozen frame, so only a replay of the timeline in the same page can show a leak
      const frozenPeak = { geometries: peak('geometries'), textures: peak('textures') };
      r.memory = { frozenPeak, afterLiveTimeline: { geometries: m1?.geometries, textures: m1?.textures }, note: 'a leak needs a replay hook to judge' };
      // forced context loss must show the fallback
      r.contextLoss = await mp.evaluate(async (sel) => {
        const c = document.querySelector(sel), gl = c.getContext('webgl2') ?? c.getContext('webgl');
        const ext = gl?.getExtension('WEBGL_lose_context');
        if (!ext) return 'not testable: WEBGL_lose_context missing';
        ext.loseContext();
        await new Promise((r) => setTimeout(r, 500));
        return document.documentElement.dataset.scene;
      }, canvasSel);
      r.contextLossImage = await mp.evaluate(FALLBACK_IMAGE);
      if (r.contextLoss === 'fallback' && !fallbackShown(r.contextLossImage)) report.warnings.push(`${name}: context loss shows no loaded, visible img[data-scene-fallback]`);
      await mp.screenshot({ path: path.join(out, `w${name}-context-lost.png`) });
      await mp.close();
    }
    await ctx.close();

    // reduced motion: one frame, no loop
    const rctx = await browser.newContext({ ...ctxOpts, reducedMotion: 'reduce' });
    const rp = await open(rctx, url, r.console);
    r.reducedMotionFramesAfterReady = await framesOver(rp, 2000);
    await rp.screenshot({ path: path.join(out, `w${name}-reduced.png`) });
    await rctx.close();

    if (final && name === '1440') {
      const vctx = await browser.newContext({ ...ctxOpts, recordVideo: { dir: out, size: ctxOpts.viewport } });
      const vp2 = await open(vctx, url, []);
      await wait((await vp2.evaluate(() => window.__scene?.duration ?? 10)) * 1000 + 1500);
      const v = vp2.video();
      await vctx.close();
      await fs.rename(await v.path(), path.join(out, 'live-1440.webm'));
    }
    r.console = [...new Set(r.console)];
  }
} finally {
  await browser.close();
}

if (final) {
  // second launch, uncapped: frame intervals now show what a frame costs on this machine's GPU
  const ub = await launchPlacedChrome({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
  try {
    for (const { name, throttle, ...ctxOpts } of VIEWPORTS) {
      const ctx = await ub.newContext(ctxOpts);
      const page = await open(ctx, url, []);
      const d = await intervals(page, 4000);
      const gpu = await page.evaluate((sel) => {
        const c = document.querySelector(sel), gl = c.getContext('webgl2') ?? c.getContext('webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        return { renderer: gl && gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER), timerQuery: !!gl?.getExtension('EXT_disjoint_timer_query_webgl2'), gpuMs: window.__scene?.gpuMs?.() ?? null };
      }, canvasSel);
      report.widths[name].uncappedFrameMs = { ...stats(d), ...gpu, pixelRatio: (await info(page))?.pixelRatio ?? null, note: 'this machine only; says nothing about a phone GPU' };
      await ctx.close();
    }
  } finally {
    await ub.close();
  }
}

await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const brief = Object.fromEntries(Object.entries(report.widths).map(([k, w]) => [k, {
  console: w.console.length, repeatable: Object.values(w.repeatable).every(Boolean), readyMs: w.readyMs, peak: w.peak,
  layoutFails: w.layoutFails.length, offscreen: w.framesWhileOffscreen, reduced: w.reducedMotionFramesAfterReady, fallback: w.fallbackState,
  capped: w.cappedFrameMs.p95, ...(final && { uncapped: w.uncappedFrameMs?.p95, contextLoss: w.contextLoss, memory: w.memory }),
}]));
console.log(JSON.stringify({ widths: brief, scriptSizes: report.scriptSizes, warnings: report.warnings }, null, 2));
