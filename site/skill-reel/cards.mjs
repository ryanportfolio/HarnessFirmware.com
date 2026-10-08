// Skills reel cards on /skills: one looping canvas per `[data-reel-scene]` card.
// Each scene module (./scenes/<id>.mjs) draws in a 1920x1080 logical stage; the canvas scales that
// stage to the card box at a device pixel ratio capped at 1.5. Every card keeps its own clock,
// which advances only while the card is on screen and the tab is visible, and draws scene.draw(ctx,
// t mod period). Scene modules load lazily when their card nears the viewport. The first paint waits
// for the site faces, so no frame is ever set in a fallback face that a late font then replaces.
// A missing or throwing scene hides its canvas box; the card text is real HTML either way.
// No reduced-motion variant (owner decision, same as the homepage explainer).

const STAGE_W = 1920, STAGE_H = 1080;
const DPR_CAP = 1.5;
const DT_CAP = 0.064; // seconds; a long frame (tab switch, GC) never jumps a loop forward
const NEAR = '600px 0px'; // start loading a scene this far before its card scrolls in
const FACES = ['781 72px "Lineal"', '500 34px "Harness Text"', '400 26px "Departure Mono"', 'italic 600 34px "Fraunces"'];

const fontsReady = Promise.all(FACES.map((f) => document.fonts.load(f).catch(() => null)));

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
    return { el, box, cv, ctx: cv.getContext('2d'), id: el.dataset.reelScene, scene: null, t: 0, visible: false, sized: false, painted: false };
  });
  if (!cards.length) return;
  const byEl = new Map(cards.map((c) => [c.box, c]));
  let raf = 0, last = null;

  const size = (c) => {
    const r = c.box.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
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

  const frame = (now) => {
    raf = 0;
    const dt = last === null ? 0 : Math.min(DT_CAP, (now - last) / 1000);
    last = now;
    for (const c of cards) {
      if (!c.visible || !c.scene) continue;
      c.t = (c.t + dt) % c.scene.period;
      paint(c);
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

  // Load a scene when its card comes within NEAR of the viewport, then paint its t = 0 frame once
  // so the card is already drawn when it scrolls in.
  const near = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const c = byEl.get(e.target);
      near.unobserve(e.target);
      Promise.all([loadScene(c.id), fontsReady]).then(([scene]) => {
        if (!scene) {
          c.el.classList.add('is-unavailable');
          return;
        }
        c.scene = scene;
        paint(c);
        wake();
      });
    }
  }, { rootMargin: NEAR });

  // Play only while on screen.
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = byEl.get(e.target);
      c.visible = e.isIntersecting;
    }
    wake();
  });

  const resize = new ResizeObserver((entries) => {
    for (const e of entries) {
      const c = byEl.get(e.target);
      size(c);
      if (c.scene) paint(c);
    }
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
