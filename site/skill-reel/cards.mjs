// Skills reel cards on /skills: one looping canvas per `[data-reel-scene]` card.
// Each card's media box holds a poster, the scene's t = 0 frame as a WebP (posters/<id>.webp, made
// by scripts/skill-reel-posters.mjs), so a visitor sees every card at once. The live canvas goes
// over the poster when its scene has painted that same t = 0 frame, so the swap does not show.
// Each scene module (./scenes/<id>.mjs) draws in a 1920x1080 logical stage; the canvas scales that
// stage to the card's content box at a device pixel ratio capped at 2 for cards narrower than
// 600 CSS px and 1.5 otherwise. A card plays only while at least half of it is on screen and the
// tab is visible; its clock is real time and draws scene.draw(ctx, t mod period). Up to three
// playing cards redraw every frame; with more, each redraws at 30 Hz, with phases spread evenly so
// the same share of them paints on every frame. A scene loads when its card comes within one
// viewport of the screen and goes live in short steps while the page is still (see Going live).
// The first paint waits for the site faces, so no frame is ever set in a fallback face.
// A missing or throwing scene keeps its poster; the card text is real HTML either way.
// No reduced-motion variant (owner decision, same as the homepage explainer).

const STAGE_W = 1920, STAGE_H = 1080;
const DPR_CAP = 1.5, DPR_CAP_SMALL = 2, SMALL_W = 600; // CSS px
// Widest backing store a card gets: 862 / 1920 = 0.449 device px per stage unit, under the kit's
// card line-weight threshold (0.45, kit.mjs setLod), so every card draws with the card weights its
// poster was rendered with (posters are 848 px wide), at any width and DPR.
const MAX_BACKING_W = 862;
const DT_CAP = 0.064; // seconds; a long frame (tab switch, GC) never jumps a loop forward
const RESIZE_SETTLE = 150; // ms the card size must hold before cards rebuild at the new size
const FULL_RATE_MAX = 3; // playing cards that still redraw every frame
const SLOW_MS = 1000 / 30; // redraw interval once more than FULL_RATE_MAX cards play
const NEAR = '100% 0px'; // a card within one viewport of the screen loads its scene
const PRIME_AT = [0.37, 0.71]; // loop points drawn offscreen after a card is live (fractions of its period)
const AFTER_LOAD = 1000; // ms after the load event before any card goes live
const STILL = 150; // ms with no scroll, wheel, touch, key or pointer input, and the smooth-scroll layer at rest
const WAIT = 100; // ms between checks while the page moves
const FACES = ['781 72px "Lineal"', '500 34px "Harness Text"', '400 26px "Departure Mono"', 'italic 600 34px "Fraunces"'];

const fontsReady = Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => null)));
// kit.mjs is the module the scenes import; cards.mjs uses its RENDER.buildsLeft and primitives.
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

// A scene that fails to load or draw resolves to null: its card keeps the poster and the HTML text.
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
    const dpr = Math.min(window.devicePixelRatio || 1, r.width < SMALL_W ? DPR_CAP_SMALL : DPR_CAP, MAX_BACKING_W / Math.max(1, r.width));
    const bw = Math.max(1, Math.round(r.width * dpr)), bh = Math.max(1, Math.round(r.height * dpr));
    if (c.cv.width !== bw || c.cv.height !== bh) {
      c.cv.width = bw;
      c.cv.height = bh;
    }
    c.sized = true;
  };

  // Draws scene at time tt into ctx, whose canvas is w x h device px: ink, then the stage, clipped.
  const drawStage = (ctx, w, h, scene, tt) => {
    unwind(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0f1210';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.setTransform(w / STAGE_W, 0, 0, h / STAGE_H, 0, 0);
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_W, STAGE_H);
    ctx.clip();
    try {
      scene.draw(ctx, Math.round(tt * 1e6) / 1e6);
    } finally {
      unwind(ctx);
    }
  };

  const paint = (c) => {
    if (!c.sized) size(c);
    try {
      drawStage(c.ctx, c.cv.width, c.cv.height, c.scene, c.t % c.scene.period);
    } catch (err) {
      if (!reported.has(c.id)) {
        reported.add(c.id);
        console.error(`[skill-reel] scene ${c.id} threw; keeping its poster:`, err);
      }
      c.scene = null;
      c.el.classList.add('is-unavailable');
      return;
    }
    if (!c.painted) {
      c.painted = true;
      c.el.classList.add('is-live');
    }
  };

  const running = () => !document.hidden && cards.some((c) => c.visible && c.scene);

  // Going live. A scene's first draws build its cached layers and make the GPU compile the
  // programs its drawing needs: 70 to 110 ms of GPU time per scene in a fresh browser, which
  // lands as one long frame if it comes at once. So a card goes live in short steps, one per
  // frame, measured on this machine to keep each under about 50 ms:
  //   1. the scene into a 64 x 36 canvas with no cached layers (its moving parts only);
  //   2. the same with a budget of one new kit layer, repeated until a draw builds nothing (at
  //      most six: the shared grain layer is rebuilt at the small size while other cards play);
  //   3. the same at the card's own size into a scratch canvas, one new layer per draw;
  //   4. the card paints t = 0 over its poster and plays.
  // Before the first scene, the kit's primitives are drawn one or two per step into the 64 x 36
  // canvas, so the programs every scene shares compile in small pieces. Between steps the pacer
  // waits for two frames on time, so a step's GPU cost lands alone. Steps run only while the page
  // is still: AFTER_LOAD ms after load, STILL ms after the last scroll, wheel, touch, key or
  // pointer input, and with the site's smooth-scroll layer (window.harnessScroll) at rest. Cards
  // in view go first; once none is waiting, each live card also draws its PRIME_AT loop points
  // offscreen, so what its later beats build exists before the beat plays. Posters cover all this.
  let kit = null;
  let loadAt = Infinity, lastInput = -Infinity;
  const mark = () => { lastInput = performance.now(); };
  for (const ev of ['scroll', 'wheel', 'touchmove', 'keydown', 'pointerdown']) addEventListener(ev, mark, { passive: true, capture: true });
  const still = () => {
    const now = performance.now();
    if (now - loadAt < AFTER_LOAD || now - lastInput < STILL) return false;
    const h = window.harnessScroll;
    if (h && h.y && Math.abs(h.y.get() + window.scrollY) > 0.5) return false; // the layer still glides
    return true;
  };
  let scratch = null;
  const scratchFor = (c) => {
    if (!c.sized) size(c);
    if (!scratch || scratch.width !== c.cv.width || scratch.height !== c.cv.height) scratch = new OffscreenCanvas(c.cv.width, c.cv.height);
    return scratch.getContext('2d');
  };
  // Kit primitives, one or two per step.
  const kitSteps = [
    (x) => { x.fillStyle = '#0f1210'; x.fillRect(0, 0, STAGE_W, STAGE_H); },
    (x, k) => k.lampFalloff(x),
    (x) => { x.globalCompositeOperation = 'soft-light'; x.fillRect(0, 0, 400, 400); x.globalCompositeOperation = 'source-over'; },
    (x, k) => k.grainOver(x, 0.3, 'soft-light'), // the shared grain layer, before any card is live to share it
    (x) => { const o = new OffscreenCanvas(32, 18); const oc = o.getContext('2d'); oc.fillStyle = '#334'; oc.fillRect(0, 0, 32, 18); x.drawImage(o, 0, 0, 1920, 1080); },
    (x) => { const o = new OffscreenCanvas(8, 8); o.getContext('2d').fillRect(0, 0, 4, 4); x.fillStyle = x.createPattern(o, 'repeat'); x.globalAlpha = 0.3; x.globalCompositeOperation = 'soft-light'; x.fillRect(0, 0, 1920, 1080); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; },
    (x, k) => k.benchFinal(x),
    (x, k) => k.prism(x, k.rect(600, 500, 300, 200), 40, k.MAT.metal, { sil: 3 }),
    (x, k) => k.prism(x, k.rect(1000, 500, 300, 200), 40, k.MAT.session, { hatch: true }),
    (x, k) => k.prism(x, k.rect(200, 500, 200, 260), 30, k.MAT.ivory),
    (x, k) => { k.rodV(x, 300, 100, 600, 24, k.MAT.lit); k.rodH(x, 300, 900, 300, 20, k.MAT.fresh); },
    (x, k) => { k.ball(x, 500, 400, 20, k.MAT.metal); k.hole(x, 700, 400, 14, 20, k.MAT.ivory); },
    (x, k) => { k.contactShadow(x, 960, 760, 200, 12, 0.5); k.softGlow(x, 960, 500, 80, k.P.amber, 0.4); },
    (x, k) => { k.contactGlow(x, 960, 500, 0.5, 40); k.dust(x, 960, 600, 0.2, 7); },
    (x, k) => k.lightShaft(x, 800, 900, 100, 700, 1000, 780, 0.08),
    (x) => { x.font = 'italic 600 34px "Fraunces"'; x.fillText('Go', 100, 500); x.font = '400 26px "Departure Mono"'; x.fillText('mod', 100, 600); },
    (x) => { const g = x.createConicGradient(0, 960, 540); g.addColorStop(0, '#123'); g.addColorStop(1, '#9ab'); x.fillStyle = g; x.beginPath(); x.ellipse(960, 540, 300, 120, -0.5, 0, Math.PI * 2); x.fill(); },
    (x) => { x.beginPath(); x.moveTo(100, 900); x.bezierCurveTo(400, 600, 800, 1000, 1200, 700); x.quadraticCurveTo(1500, 500, 1800, 800); x.setLineDash([5, 5]); x.lineWidth = 4; x.stroke(); x.setLineDash([]); },
    (x) => { x.beginPath(); x.rect(200, 200, 600, 400); x.rect(300, 300, 200, 100); x.fill('evenodd'); x.globalCompositeOperation = 'source-atop'; x.fillRect(250, 250, 300, 300); x.globalCompositeOperation = 'source-over'; },
    (x) => { x.font = '781 72px "Lineal"'; x.fillText('/skill', 300, 300); x.font = '500 34px "Harness Text"'; x.fillText('skill', 300, 400); },
  ];
  // A scene drawn at time tt with a budget of new kit layers, into the 64 x 36 canvas or into a
  // scratch canvas of card c's size (the card's own scale, so the kit's one-scale-per-key cache
  // keeps what it builds for the card); each returns whether it built a layer.
  const tinyDraw = (scene, tt, budget) => {
    tiny ||= new OffscreenCanvas(64, 36).getContext('2d');
    if (kit) kit.RENDER.buildsLeft = budget;
    try { drawStage(tiny, 64, 36, scene, tt); } catch { /* the card's paint reports it */ }
    const built = kit ? budget > 0 && kit.RENDER.buildsLeft < budget : false;
    if (kit) kit.RENDER.buildsLeft = Infinity;
    return built;
  };
  const scratchDraw = (c, scene, tt, budget) => {
    const x = scratchFor(c);
    if (kit) kit.RENDER.buildsLeft = budget;
    try { drawStage(x, scratch.width, scratch.height, scene, tt); } catch { /* the card's paint reports it */ }
    const built = kit ? budget > 0 && kit.RENDER.buildsLeft < budget : false;
    if (kit) kit.RENDER.buildsLeft = Infinity;
    return built;
  };
  let tiny = null;
  const queue = []; // { c, scene, k } where k counts the card's steps
  // One step of the most urgent job; returns false when there was nothing to do.
  const step = () => {
    if (kit && kitSteps.length && queue.length) {
      tiny ||= new OffscreenCanvas(64, 36).getContext('2d');
      unwind(tiny);
      tiny.setTransform(64 / STAGE_W, 0, 0, 36 / STAGE_H, 0, 0);
      kit.setLod(tiny);
      try { kitSteps.shift()(tiny, kit); } catch { /* a primitive that fails only skips its warm-up */ }
      unwind(tiny);
      return true;
    }
    // cards in view not yet live, then other cards not yet live, then live cards' loop points
    let q = queue.find((j) => !j.c.scene && j.c.visible) || queue.find((j) => !j.c.scene) || queue.find((j) => j.c.visible) || queue[0];
    if (!q) return false;
    const { c, scene } = q;
    if (!c.scene) {
      // steps 1 to 4 above
      if (q.k === 0) {
        tinyDraw(scene, 0, 0);
        q.k = 1;
        q.n = 0;
        return true;
      }
      if (q.k === 1) {
        if (!tinyDraw(scene, 0, 1) || ++q.n >= 6) { q.k = 2; q.n = 0; }
        return true;
      }
      if (q.k === 2) {
        if (!scratchDraw(c, scene, 0, 1) || ++q.n >= 6) q.k = 3;
        return true;
      }
      c.scene = scene;
      size(c);
      c.stale = false;
      c.t = 0;
      paint(c);
      c.fresh = true;
      warmed = true;
      q.k = 0;
      if (!c.scene) queue.splice(queue.indexOf(q), 1); // it threw: keep the poster
      wake();
      return true;
    }
    // live: each loop point drawn offscreen (one new layer per draw, repeated), for what its beats
    // build or first ask of the GPU
    if (q.k < PRIME_AT.length && !scratchDraw(c, scene, PRIME_AT[q.k] * scene.period, 1)) q.k++;
    if (q.k >= PRIME_AT.length) queue.splice(queue.indexOf(q), 1);
    return true;
  };
  // Driver: wait until the page is still, run one step, wait for two frames on time (one, once a
  // card is live: the costly first-use work is behind), repeat.
  let driving = false, minDt = 1000 / 60, warmed = false;
  const drive = () => {
    if (driving || !queue.length) return;
    driving = true;
    const tick = () => {
      if (!queue.length) {
        driving = false;
        return;
      }
      if (!still()) {
        setTimeout(tick, WAIT);
        return;
      }
      step();
      let lastT = -1, good = 0;
      const f = (now) => {
        if (lastT >= 0) {
          const dt = now - lastT;
          if (dt > 4) minDt = Math.min(minDt * 1.02, dt); // drifts up slowly, snaps down
          good = dt < minDt * 1.5 ? good + 1 : 0;
        }
        lastT = now;
        if (good >= (warmed ? 1 : 2)) tick();
        else requestAnimationFrame(f);
      };
      requestAnimationFrame(f);
    };
    tick();
  };
  const load = (c) => {
    if (c.loading) return;
    c.loading = true;
    Promise.all([loadScene(c.id), fontsReady, kitReady()]).then(([scene, , k]) => {
      if (k) kit = k;
      if (!scene) {
        c.el.classList.add('is-unavailable');
        return;
      }
      queue.push({ c, scene, k: 0 });
      drive();
    });
  };
  const onLoad = () => { loadAt = performance.now(); };
  if (document.readyState === 'complete') onLoad();
  else addEventListener('load', onLoad, { once: true });

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
      // a scene that threw while painting this frame dropped itself and keeps its poster
      if (!c.scene) continue;
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

  // A card within NEAR of the viewport loads its scene, which then goes live while the page is still.
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
