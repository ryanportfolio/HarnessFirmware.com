// Spring smooth scroll. Every page reaches it through effects.mjs (/), memory-scroll.mjs
// (/memory) or skill-scroll.mjs (/skills, /new, arena, long-horizon); those modules skip it under
// prefers-reduced-motion, leaving the document on native scroll.
//
// Native scrolling stays in charge: wheel, touch, keyboard, scrollbar and window.scrollTo all
// move the document as usual. The content sits in one fixed layer that trails -scrollY through
// a spring, and a static spacer keeps the document as long as the layer so the scroll range is
// unchanged. Only the layer's transform changes per frame; frames are requested only while the
// spring is moving.
//
//   mountSmoothScroll(layer, spacer, width = '100vw') -> controller
//     layer   element wrapping everything but the fixed header; fixed to the viewport at
//             width (100vw by default; pages that keep a scrollbar gutter pass 100%), translated
//             by controller.y
//     spacer  static sibling kept at the layer's height
//   controller.y        get(), on('change', fn) -> unsubscribe, jump(v): rendered offset (<= 0)
//   controller.scrollY  get(), set(v): native scroll position; the target follows it
//   controller.targetY  get(), set(v): spring target (-scrollY)
//   controller.destroy() restores the inline styles the engine replaced
// Callers set html[data-smooth-scroll] and window.harnessScroll once it mounts.

// Spring constants: stiffness 55, damping 15, mass 0.27. As x'' + a x' + b x = 0 that is
// overdamped (damping ratio ~1.95), so the offset decays through two real roots, about
// -3.95/s and -51.6/s: no overshoot, 900 px of lag falls under 0.5 px in ~1.9 s.
const STIFFNESS = 55;
const DAMPING = 15;
const MASS = 0.27;
const a = DAMPING / MASS;
const b = STIFFNESS / MASS;
const spread = Math.sqrt(a * a / 4 - b);
const slow = -a / 2 + spread;
const fast = -a / 2 - spread;
// Rest: snap once the offset is below 0.001 px, well under anything visible. The speed gate
// is ten times what the slow mode carries at that offset, so it only holds the snap while a
// retarget is still moving the layer.
const REST_OFFSET = 0.001; // px
const REST_SPEED = -slow * REST_OFFSET * 10; // px/s

// Exact state after dt seconds for offset x (px from target) and velocity v (px/s). Exact for
// any dt, so a long frame or a background tab cannot destabilise it.
function advance(x, v, dt) {
  const cFast = (v - slow * x) / (fast - slow);
  const cSlow = x - cFast;
  const eSlow = Math.exp(slow * dt);
  const eFast = Math.exp(fast * dt);
  return [cSlow * eSlow + cFast * eFast, slow * cSlow * eSlow + fast * cFast * eFast];
}

export function mountSmoothScroll(layer, spacer, width = '100vw') {
  if (!layer || !spacer) throw new TypeError('mountSmoothScroll needs a layer and a spacer');
  const savedLayerStyle = layer.getAttribute('style');
  const savedSpacerStyle = spacer.getAttribute('style');
  const listeners = new Set();
  const events = new AbortController();
  let position = 0; // rendered offset, px
  let velocity = 0; // px/s
  let target = 0;
  let native = 0;
  let maxScroll = 0;
  let frame = 0;
  let lastTime = 0;
  let pointerDown = false;

  const clampTarget = value => Math.min(0, Math.max(-maxScroll, value));
  // Scroll range for clamping overscroll (elastic scrolling reports positions past either end).
  // The smaller viewport height errs long, so a collapsing mobile toolbar never cuts the bottom off.
  const updateRange = () => {
    const root = document.documentElement;
    maxScroll = Math.max(0, root.scrollHeight - Math.min(innerHeight, root.clientHeight));
  };
  const render = () => {
    layer.style.transform = `translateY(${position}px) translateZ(0)`;
    for (const listener of listeners) listener(position);
  };
  const tick = now => {
    frame = 0;
    const dt = lastTime ? (now - lastTime) / 1000 : 0;
    lastTime = now;
    let offset;
    [offset, velocity] = advance(position - target, velocity, dt);
    if (Math.abs(offset) < REST_OFFSET && Math.abs(velocity) < REST_SPEED) {
      offset = 0;
      velocity = 0;
      lastTime = 0;
    } else {
      frame = requestAnimationFrame(tick);
    }
    const next = target + offset;
    if (next !== position) {
      position = next;
      render();
    }
  };
  const retarget = value => {
    target = clampTarget(value);
    if (!frame && (target !== position || velocity)) frame = requestAnimationFrame(tick);
  };
  const follow = value => {
    native = value;
    retarget(-value);
  };
  // Document length and scroll range follow the layer's height (fonts, images, sections
  // mounting, width changes). ResizeObserver delivers before paint, so the spacer never lags.
  const measure = () => {
    spacer.style.height = `${layer.getBoundingClientRect().height}px`;
    updateRange();
  };

  // Hold the document length while the layer leaves the flow, so the browser has no reason to
  // clamp the current scroll position; then size the spacer to the fixed layer.
  const start = scrollY;
  spacer.style.height = `${layer.getBoundingClientRect().height}px`;
  Object.assign(layer.style, {position: 'fixed', top: '0', left: '0', width, display: 'flex', flexDirection: 'column'});
  measure();
  // Mounting mid-page (reload, restored history) starts at rest on the current position.
  native = scrollY;
  target = position = clampTarget(-native);
  if (position || start) render();

  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(layer);
  addEventListener('scroll', () => follow(scrollY), {passive: true, signal: events.signal});
  addEventListener('resize', () => {
    updateRange();
    follow(scrollY);
  }, {passive: true, signal: events.signal});

  // Find in page cannot scroll to matches inside a fixed layer. window.find(), and a find
  // session closed on a match, leave that match selected: bring an offscreen one to mid-screen.
  // Drag selections are skipped (the pointer keeps them on screen), as are large selections
  // such as select-all.
  addEventListener('pointerdown', () => { pointerDown = true; }, {capture: true, signal: events.signal});
  addEventListener('pointerup', () => { pointerDown = false; }, {capture: true, signal: events.signal});
  addEventListener('pointercancel', () => { pointerDown = false; }, {capture: true, signal: events.signal});
  document.addEventListener('selectionchange', () => {
    const selection = getSelection();
    if (pointerDown || !selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!layer.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    if (!rect.height || rect.height > innerHeight / 2) return;
    const documentTop = rect.top - layer.getBoundingClientRect().top;
    if (documentTop >= native && documentTop + rect.height <= native + innerHeight) return;
    window.scrollTo({top: Math.max(0, documentTop - (innerHeight - rect.height) / 2), behavior: 'instant'});
  }, {signal: events.signal});

  const y = {
    get: () => position,
    on(event, listener) {
      if (event !== 'change') throw new TypeError(`unsupported event: ${event}`);
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Place the layer without animating; the spring resumes from rest if the target differs.
    jump(value) {
      velocity = 0;
      lastTime = 0;
      position = value;
      render();
      retarget(target);
    },
  };
  return {
    y,
    scrollY: {get: () => native, set: follow},
    targetY: {get: () => target, set: retarget},
    destroy() {
      events.abort();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      frame = 0;
      listeners.clear();
      if (savedLayerStyle === null) layer.removeAttribute('style'); else layer.setAttribute('style', savedLayerStyle);
      if (savedSpacerStyle === null) spacer.removeAttribute('style'); else spacer.setAttribute('style', savedSpacerStyle);
    },
  };
}
