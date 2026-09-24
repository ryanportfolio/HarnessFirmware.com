// Hover grid: rows of square cells separated by 1 px gaps, alternate rows offset like brickwork.
// Cells and gaps share one color, so the grid is invisible until a soft green light, parked under
// the cells, follows the pointer and shows through the gaps near it.
//
//   const grid = createHoverGrid(host, {variant: 'light', pointerTarget: section})
//   grid.destroy()
//
// Options
//   variant        'light' (#F7F7F7) or 'dark' (#11120D); both set --hover-grid-color
//   pointerTarget  element whose pointer moves drive the light (default: host.parentElement)
//   cell, gap      cell size and gap in px (225, 1)
//   divisor        rows = round(height / divisor) + 2, columns likewise from width; 255 px,
//                  150 px below 768 px viewport width
// Motion: the light's center eases to the pointer over .3 s (ease-out quart) and fades in over
// .4 s with a bouncing ease; 750 ms after the last move it fades out the same way. Every pointer
// move restarts both tweens from where they are, so steady movement brightens the light gradually.
// Frames run only while a tween is live and never while the grid is offscreen. Touch input and
// prefers-reduced-motion leave the grid static.

const FOLLOW = 0.3; // s
const FADE = 0.4; // s
const IDLE = 750; // ms
const quartOut = p => 1 - (1 - p) ** 4;
function bounceOut(p) {
  const n = 7.5625, d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
  if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
  return n * (p -= 2.625 / d) * p + 0.984375;
}

// One animated number: retargeting starts a new tween from the current value.
function tween(value, duration, ease) {
  let from = value, to = value, start = 0;
  return {
    get value() { return value; },
    get active() { return value !== to; },
    to(target, now) { from = value; to = target; start = now; },
    jump(target) { from = to = value = target; },
    step(now) {
      const p = Math.min(1, Math.max(0, (now - start) / 1000 / duration));
      value = p >= 1 ? to : from + (to - from) * ease(p);
      return value;
    },
  };
}

export function createHoverGrid(host, {variant = 'light', pointerTarget = host.parentElement, cell = 225, gap = 1} = {}) {
  const narrow = matchMedia('(max-width: 767px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  host.classList.add('hover-grid', `hover-grid--${variant}`);
  host.setAttribute('aria-hidden', 'true');
  host.style.setProperty('--hover-grid-cell', `${cell}px`);
  host.style.setProperty('--hover-grid-gap', `${gap}px`);
  const inner = document.createElement('div');
  inner.className = 'hover-grid__inner';
  const light = document.createElement('div');
  light.className = 'hover-grid__light';
  host.append(inner);

  let rows = 0, cols = 0;
  const layout = () => {
    const divisor = narrow.matches ? 150 : 255;
    const nextRows = Math.round(host.clientHeight / divisor) + 2;
    const nextCols = Math.round(host.clientWidth / divisor) + 2;
    if (nextRows === rows && nextCols === cols) return;
    rows = nextRows; cols = nextCols;
    const row = document.createElement('div');
    row.className = 'hover-grid__row';
    for (let c = 0; c < cols; c++) row.append(Object.assign(document.createElement('div'), {className: 'hover-grid__cell'}));
    inner.replaceChildren(...Array.from({length: rows}, () => row.cloneNode(true)), light);
  };
  layout();
  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(host);

  const x = tween(0, FOLLOW, quartOut);
  const y = tween(0, FOLLOW, quartOut);
  const alpha = tween(0, FADE, bounceOut);
  let frame = 0, idle = 0, visible = true, stepped = 0;
  const paint = () => {
    light.style.transform = `translate3d(${x.value}px,${y.value}px,0)`;
    light.style.opacity = alpha.value;
  };
  // Tweens run on performance.now(); rAF timestamps can trail it by a frame or more.
  const tick = () => {
    frame = 0;
    const now = stepped = performance.now();
    x.step(now); y.step(now); alpha.step(now);
    paint();
    if (x.active || y.active || alpha.active) frame = requestAnimationFrame(tick);
  };
  const run = () => { if (!frame) frame = requestAnimationFrame(tick); };
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    clearTimeout(idle);
    alpha.jump(0);
    x.jump(x.value); y.jump(y.value);
    paint();
  };

  // A retarget continues from the last painted frame, at that frame's time, so rapid moves lose
  // no progress; from rest it starts at the current frame.
  const clock = () => frame ? stepped : document.timeline?.currentTime ?? performance.now();
  pointerTarget?.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduced.matches || !visible) return;
    const box = inner.getBoundingClientRect();
    const now = clock();
    // Center the light (half the grid wide and tall) on the pointer.
    x.to(event.clientX - box.left - box.width / 4, now);
    y.to(event.clientY - box.top - box.height / 4, now);
    alpha.to(1, now);
    clearTimeout(idle);
    idle = setTimeout(() => { alpha.to(0, clock()); run(); }, IDLE);
    run();
  }, {passive: true, signal: events.signal});

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
  });
  intersection.observe(host);

  return {
    destroy() {
      events.abort();
      resizeObserver.disconnect();
      intersection.disconnect();
      stop();
      inner.remove();
      host.classList.remove('hover-grid', `hover-grid--${variant}`);
      host.style.removeProperty('--hover-grid-cell');
      host.style.removeProperty('--hover-grid-gap');
    },
  };
}
