// Skills reel cards on /skills: one looping canvas per `[data-reel-scene]` card.
// Each scene module (./scenes/<id>.mjs) draws in a 1920x1080 logical stage; the canvas scales that
// stage to the card's content box at a device pixel ratio capped at 2 for cards narrower than
// 600 CSS px and 1.5 otherwise. A card plays only while at least half of it is on screen and the
// tab is visible; its clock is real time and draws scene.draw(ctx, t mod period). Up to three
// playing cards redraw every frame; with more, each redraws at 30 Hz, with phases spread evenly so
// the same share of them paints on every frame. A scene loads when its card comes within one
// viewport of the screen and primes in small steps while the page is quiet (see Priming below), so
// its cold GPU work lands when nothing is scrolling. The first paint waits for the site faces, so
// no frame is ever set in a fallback face that a late font replaces.
// A missing or throwing scene hides its canvas box; the card text is real HTML either way.
// No reduced-motion variant (owner decision, same as the homepage explainer).

const STAGE_W = 1920, STAGE_H = 1080;
const DPR_CAP = 1.5, DPR_CAP_SMALL = 2, SMALL_W = 600; // CSS px
const DT_CAP = 0.064; // seconds; a long frame (tab switch, GC) never jumps a loop forward
const RESIZE_SETTLE = 150; // ms the card size must hold before cards rebuild at the new size
const FULL_RATE_MAX = 3; // playing cards that still redraw every frame
const SLOW_MS = 1000 / 30; // redraw interval once more than FULL_RATE_MAX cards play
const NEAR = '100% 0px'; // a card within one viewport of the screen loads its scene
const PRIME_AT = [0.37, 0.71]; // extra loop points drawn offscreen when a scene primes (fractions of its period)
const PRIME_AFTER_LOAD = 1000; // ms after the load event before any scene primes
const QUIET = 400; // ms with no scroll, wheel, touch, key or pointer input before a priming step
const RETRY = 250; // ms between checks while the page is busy
const IDLE_MIN = 8; // ms an idle slice must have left for a priming step
const FACES = ['781 72px "Lineal"', '500 34px "Harness Text"', '400 26px "Departure Mono"', 'italic 600 34px "Fraunces"'];

const fontsReady = Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => null)));
// kit.mjs is the module the scenes import; cards.mjs uses its RENDER.buildsLeft to prime in steps.
let kitJob = null;
const kitReady = () => (kitJob ||= import('./kit.mjs').catch(() => null));

const sceneJobs = new Map();
function loadScene(id) {
  let job = sceneJobs.get(id);
  if (!job) {
    job = import(`./scenes/${id}.mjs`)
      .then((m) => {
        const s = m.default;
        if (!s || typeof s.draw !== 'function') throw new Error('default export has no draw(ctx, t)');
        const period = Number(s.period);
        if (!(period > 0)) throw new Error('period must be a positive number of seconds');
        return { id, period, draw: s.draw.bind(s) };
      })
      .catch((err) => placeholder(id, err));
    sceneJobs.set(id, job);
  }
  return job;
}

// A scene that fails to load or draw resolves to null: its card drops the canvas box and keeps
// the HTML text, so a visitor never sees a broken or labelled frame.
function placeholder(id, err) {
  console.warn(`[skill-reel] scene ${id} unavailable:`, err);
  return Promise.resolve(null);
}

// Pops anything a scene left on the save stack, so one card can never leak state into the next frame.
function unwind(ctx) {
  for (let i = 0; i < 64; i++) ctx.restore();
}

const reported = new Set();

function mount(root) {
  const cards = [...root.querySelectorAll('[data-reel-scene]')].map((el) => {
    const box = el.querySelector('.sr-media') || el;
    const cv = document.createElement('canvas');
    box.appendChild(cv);
    return { el, box, cv, ctx: cv.getContext('2d'), id: el.dataset.reelScene, scene: null, t: 0, visible: false, sized: false, painted: false, due: 0, loading: false, stale: false, fresh: false };
  });
  if (!cards.length) return;
  const byEl = new Map(cards.map((c) => [c.box, c]));
  let raf = 0, last = null;

  // The canvas fills the box inside its border (inset: 0), so its own rect is the content box.
  const size = (c) => {
    const r = c.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, r.width < SMALL_W ? DPR_CAP_SMALL : DPR_CAP);
    const bw = Math.max(1, Math.round(r.width * dpr)), bh = Math.max(1, Math.round(r.height * dpr));
    if (c.cv.width !== bw || c.cv.height !== bh) {
      c.cv.width = bw;
      c.cv.height = bh;
    }
    c.sized = true;
  };

  const paint = (c) => {
    if (!c.sized) size(c);
    const { ctx, cv, scene } = c;
    unwind(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0f1210';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.setTransform(cv.width / STAGE_W, 0, 0, cv.height / STAGE_H, 0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_W, STAGE_H);
    ctx.clip();
    try {
      scene.draw(ctx, Math.round((c.t % scene.period) * 1e6) / 1e6);
    } catch (err) {
      if (!reported.has(c.id)) {
        reported.add(c.id);
        console.error(`[skill-reel] scene ${c.id} threw; hiding its canvas:`, err);
      }
      unwind(ctx);
      c.scene = null;
      c.el.classList.add('is-unavailable');
      return;
    }
    unwind(ctx);
    if (!c.painted) {
      c.painted = true;
      c.el.classList.add('is-live');
    }
  };

  const running = () => !document.hidden && cards.some((c) => c.visible && c.scene);

  // Priming: a scene's first draws build its cached layers and sprites and make the GPU compile
  // the programs its drawing needs. On this machine that cold work costs a scene 70 to 110 ms of
  // GPU time, and nine scenes primed together made one 200+ ms frame. Mostly it is program
  // compiles, which the GPU primer below does at 64 x 36 in short paced steps; card priming then
  // only rasters, one step per frame (see step()), with the pacer between steps.
  // Card steps run only on a quiet page: at least PRIME_AFTER_LOAD ms after load and QUIET ms after the
  // last scroll, wheel, touch, key or pointer input, in an idle slice. A card already in view uses
  // the same steps and quiet gate (it shows its empty box a moment longer rather than stalling a
  // scroll). Scenes load only when their card comes within one viewport of the screen.
  let kitRender = null; // kit.mjs RENDER (buildsLeft), loaded with the first scene
  let scratch = null;
  let loadAt = Infinity, lastInput = -Infinity;
  const mark = () => { lastInput = performance.now(); };
  for (const ev of ['scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown']) addEventListener(ev, mark, { passive: true, capture: true });
  const quiet = () => {
    const now = performance.now();
    return now - loadAt >= PRIME_AFTER_LOAD && now - lastInput >= QUIET;
  };
  const scratchFor = (c) => {
    if (!scratch || scratch.width !== c.cv.width || scratch.height !== c.cv.height) scratch = new OffscreenCanvas(c.cv.width, c.cv.height);
    return scratch.getContext('2d');
  };
  // One step for job q; returns true when the scene is fully primed. Step 0 paints the card's
  // t = 0 frame (the card goes live and plays), building its card-size layers at once: the GPU
  // programs were compiled by the primer, so this is raster only. Steps 1 .. n draw the PRIME_AT
  // loop points into a scratch canvas, so sprites a beat builds exist before the beat plays.
  const step = (q) => {
    const { c, scene } = q;
    if (q.k === 0) {
      c.scene = scene;
      size(c);
      c.stale = false;
      paint(c);
      c.fresh = true;
      wake();
    } else if (c.scene) {
      const x = scratchFor(c);
      unwind(x);
      x.setTransform(scratch.width / STAGE_W, 0, 0, scratch.height / STAGE_H, 0, 0);
      try {
        scene.draw(x, Math.round(PRIME_AT[q.k - 1] * scene.period * 1e6) / 1e6);
      } catch { /* the card's own paint reports a throwing scene */ }
      unwind(x);
    }
    q.k++;
    return q.k > PRIME_AT.length || !c.scene;
  };
  const jobs = []; // { c, scene, k } loaded, not yet primed
  let timer = 0, pacing = false;
  // Pacer: wait for consecutive frames on time (under 1.5x the shortest recent interval): two
  // after a primer step (GPU compiles), one after a card step (raster only).
  let minDt = 1000 / 60;
  const pace = (done, primer) => {
    if (!primer) pacing = true;
    const need = primer ? 2 : 1;
    let last = -1, good = 0;
    const f = (now) => {
      if (last >= 0) {
        const dt = now - last;
        if (dt > 4) minDt = Math.min(minDt * 1.02, Math.max(dt, 4)); // drifts up slowly, snaps down
        good = dt < minDt * 1.5 ? good + 1 : 0;
      }
      last = now;
      if (good >= need) {
        if (!primer) pacing = false;
        done();
      } else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };
  const schedule = (delay = 0) => {
    if (timer || pacing || primerBusy || !jobs.length) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!quiet()) return schedule(RETRY);
      if ('requestIdleCallback' in window) {
        requestIdleCallback((dl) => {
          if (!quiet() || dl.timeRemaining() < IDLE_MIN) return schedule(RETRY);
          run();
        }, { timeout: 1000 });
      } else run();
    }, delay);
  };
  const run = () => {
    if (!jobs.length) return;
    // cards in view first, then the nearest below or above
    const dist = (q) => (q.c.visible ? -1 : Math.abs(q.c.box.getBoundingClientRect().top));
    let i = 0;
    for (let k = 1; k < jobs.length; k++) if (dist(jobs[k]) < dist(jobs[i])) i = k;
    if (step(jobs[i])) jobs.splice(i, 1);
    pace(() => schedule());
  };
  const load = (c) => {
    if (c.loading) return;
    c.loading = true;
    Promise.all([loadScene(c.id), fontsReady, kitReady()]).then(([scene, , kit]) => {
      if (kit) kitRender = kit.RENDER;
      if (!scene) {
        c.el.classList.add('is-unavailable');
        return;
      }
      jobs.push({ c, scene, k: 0 });
      schedule();
    });
  };
  // GPU primer, right after the page loads: every scene draws its t = 0 frame and its PRIME_AT
  // points into a 64 x 36 canvas, one draw per paced step. The GPU compiles the programs a scene's
  // drawing needs on its first use in a browser session, whatever the size: that compile was most of
  // a scene's 70 to 110 ms cold cost, and at 64 x 36 there is almost nothing to raster, so each
  // step stays a short frame. Card-size priming later only rasters. Tiny layers cost no memory
  // (a card-size layer replaces each one). The modules load for this whatever the scroll position;
  // their card-size layers still wait until a card comes within one viewport.
  let primerBusy = true;
  Promise.all([fontsReady, kitReady(), ...cards.map((c) => loadScene(c.id))]).then(([, kit, ...scenes]) => {
    if (kit) kitRender = kit.RENDER;
    const tiny = new OffscreenCanvas(64, 36).getContext('2d');
    const todo = [];
    // The kit's drawing primitives first, one per step: what every scene shares compiles in small
    // pieces, before any scene draws. Each step draws in the 1920 x 1080 stage of the tiny canvas.
    const g = (fn) => todo.push([{ id: 'kit', period: 1, draw: (x) => { if (kit) { kit.setLod(x); fn(x, kit); } } }, 0]);
    g((x) => { x.fillStyle = '#0f1210'; x.fillRect(0, 0, 1920, 1080); });
    g((x, k) => k.lampFalloff(x));
    g((x, k) => k.grainOver(x, 0.3, 'soft-light'));
    g((x, k) => k.benchFinal(x));
    g((x, k) => k.prism(x, k.rect(600, 500, 300, 200), 40, k.MAT.metal, { sil: 3 }));
    g((x, k) => k.prism(x, k.rect(1000, 500, 300, 200), 40, k.MAT.session, { hatch: true }));
    g((x, k) => k.prism(x, k.rect(200, 500, 200, 260), 30, k.MAT.ivory));
    g((x, k) => { k.rodV(x, 300, 100, 600, 24, k.MAT.lit); k.rodH(x, 300, 900, 300, 20, k.MAT.fresh); });
    g((x, k) => { k.ball(x, 500, 400, 20, k.MAT.metal); k.hole(x, 700, 400, 14, 20, k.MAT.ivory); });
    g((x, k) => { k.contactShadow(x, 960, 760, 200, 12, 0.5); k.softGlow(x, 960, 500, 80, k.P.amber, 0.4); });
    g((x, k) => { k.contactGlow(x, 960, 500, 0.5, 40); k.dust(x, 960, 600, 0.2, 7); });
    g((x, k) => k.lightShaft(x, 800, 900, 100, 700, 1000, 780, 0.08));
    g((x) => { x.font = 'italic 600 34px "Fraunces"'; x.fillText('Go', 100, 500); x.font = '400 26px "Departure Mono"'; x.fillText('mod', 100, 600); });
    for (const scene of scenes) if (scene) { todo.push([scene, 0, 'nolayers']); for (const p of [0, ...PRIME_AT]) todo.push([scene, p]); }
    const next = () => {
      // like card priming, a step waits for QUIET ms without input: a step on a scrolling page
      // adds its GPU work to the scroll's own repaint
      if (performance.now() - lastInput < QUIET) return setTimeout(next, RETRY);
      const item = todo.shift();
      if (!item) {
        primerBusy = false;
        schedule();
        return;
      }
      const [scene, p, mode] = item;
      if (kitRender) kitRender.buildsLeft = mode === 'nolayers' ? 0 : 1;
      unwind(tiny);
      tiny.setTransform(64 / STAGE_W, 0, 0, 36 / STAGE_H, 0, 0);
      try { scene.draw(tiny, Math.round(p * scene.period * 1e6) / 1e6); } catch { /* reported by the card */ }
      unwind(tiny);
      // one new kit layer per step: a step that built one repeats the same draw
      if (kitRender && kitRender.buildsLeft < 1 && mode !== 'nolayers') todo.unshift(item);
      if (kitRender) kitRender.buildsLeft = Infinity;
      pace(next, true);
    };
    requestAnimationFrame(next);
  });
  const loaded0 = () => { loadAt = performance.now(); schedule(); };
  if (document.readyState === 'complete') loaded0();
  else addEventListener('load', loaded0, { once: true });

  let playingKey = '';
  const frame = (now) => {
    raf = 0;
    const dt = last === null ? 0 : Math.min(DT_CAP, (now - last) / 1000);
    last = now;
    const playing = cards.filter((c) => c.visible && c.scene);
    const slow = playing.length > FULL_RATE_MAX;
    // Stagger: whenever the set of playing cards changes, spread all their phases evenly over the
    // interval, so the same share of them paints on every frame.
    const key = playing.map((c) => c.id).join();
    if (slow && key !== playingKey) playing.forEach((c, k) => { c.due = now + (k / playing.length) * SLOW_MS; });
    playingKey = slow ? key : '';
    // After a resize has settled, one card in view rebuilds at its new size per frame.
    if (settled) {
      const st = playing.find((c) => c.stale);
      if (st) {
        st.stale = false;
        size(st);
        paint(st);
        st.fresh = true;
      }
    }
    for (const c of playing) {
      c.t = (c.t + dt) % c.scene.period;
      // a card whose first frame was painted this frame starts playing on the next one
      if (c.fresh) {
        c.fresh = false;
        continue;
      }
      if (!slow) {
        paint(c);
        continue;
      }
      // Paint on the frame nearest the due time (half a frame of slack), then keep the phase.
      if (now >= c.due - 5) {
        paint(c);
        c.due += SLOW_MS * Math.max(1, Math.ceil((now - c.due + 5) / SLOW_MS));
      }
    }
    if (running()) raf = requestAnimationFrame(frame);
    else last = null;
  };

  const wake = () => {
    if (!raf && running()) {
      last = null;
      raf = requestAnimationFrame(frame);
    }
  };

  // A card within NEAR of the viewport loads its scene, which then primes on a quiet page.
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      near.unobserve(e.target);
      load(byEl.get(e.target));
    }
  }, { rootMargin: NEAR });

  // Play only while at least half the card is on screen; a card below that holds its last frame.
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = byEl.get(e.target);
      c.visible = e.isIntersecting && e.intersectionRatio >= 0.5;
      if (!c.visible) c.due = 0;
    }
    wake();
  }, { threshold: [0, 0.5] });

  // A resize only marks cards stale: CSS keeps scaling the old bitmap until the size has held for
  // RESIZE_SETTLE ms, then cards in view rebuild one per frame and the rest when they come into view.
  let settled = true, resizeTimer = 0;
  const resize = new ResizeObserver((entries) => {
    let any = false;
    for (const e of entries) {
      const c = byEl.get(e.target);
      if (c.sized) c.stale = any = true;
    }
    if (!any) return;
    settled = false;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      settled = true;
      wake();
    }, RESIZE_SETTLE);
  });

  for (const c of cards) {
    near.observe(c.box);
    seen.observe(c.box);
    resize.observe(c.box);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = null;
    } else wake();
  });
}

const root = document.getElementById('skills-at-work');
if (root) mount(root);
