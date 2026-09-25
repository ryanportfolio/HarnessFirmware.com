import {createSplitReveal} from './split-reveal.mjs';
import {createPixelWipe, shuffledOrder} from './pixel-wipe.mjs';
import {createHoverGrid} from './hover-grid.mjs';

// Pinned statement (.statement-block). The homepage uses it twice: the problem statement and the
// /long-horizon statement. The static markup is the finished section: a panel with the statement,
// which is what reduced motion and no-JS visitors get. With motion this module adds:
//   - geometry: the block is the panel's height plus 150svh of scroll (250svh for a one-screen
//     panel). The panel pins once its bottom reaches the viewport bottom (at once for a panel no
//     taller than the viewport) and stays pinned while the next section scrolls in underneath,
//     then hides
//   - statement reveal: once the block's top reaches 18% below the viewport top the title plays
//     a split reveal. With [data-squares] a 5 x 5 block of light squares (covering part of the
//     second statement) vanishes square by square, shuffled, 25 ms apart
//   - hover grid: light variant, green light through the gaps around the pointer, plus a soft
//     green glow that trails the pointer over the panel
//   - pixel wipe: 17 x 9 cells in the block's data-wipe color fill in shuffled order over the last
//     stretch of the pin, from 71.4% of it (56% below 768 px) to its end, then the panel hides.
//     The color matches the section underneath, so the panel hands over without a seam.
// Pinning, the reveal trigger and the wipe follow the rendered spring offset
// (window.harnessScroll.y), so they line up with what is on screen. Without the engine the panel
// pins with position:sticky and all three follow native scroll.

const REVEAL_AT = 0.18; // viewport fraction
const SQUARE_STAGGER = 0.025; // s
const WIPE_FROM = {wide: 0.714, narrow: 0.56};
const SVG = 'http://www.w3.org/2000/svg';

function introSquares() {
  const wrap = document.createElement('div');
  wrap.className = 'statement-squares';
  wrap.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 515 515');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('focusable', 'false');
  const rank = [];
  shuffledOrder(25).forEach((index, position) => { rank[index] = position; });
  for (let index = 0; index < 25; index++) {
    const square = document.createElementNS(SVG, 'rect');
    square.setAttribute('x', (index % 5) * 103);
    square.setAttribute('y', Math.floor(index / 5) * 103);
    square.setAttribute('width', 103);
    square.setAttribute('height', 103);
    square.style.setProperty('--square-delay', `${(rank[index] * SQUARE_STAGGER).toFixed(3)}s`);
    svg.append(square);
  }
  wrap.append(svg);
  return wrap;
}

// Soft green glow that eases toward the pointer while it moves over the panel.
function pointerGlow(container, signal) {
  let frame = 0, x = 50, y = 50, targetX = 50, targetY = 50;
  const render = () => {
    x += (targetX - x) * .16; y += (targetY - y) * .16;
    container.style.setProperty('--statement-x', `${x}%`);
    container.style.setProperty('--statement-y', `${y}%`);
    frame = Math.abs(x - targetX) + Math.abs(y - targetY) > .1 ? requestAnimationFrame(render) : 0;
  };
  container.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    const rect = container.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width * 100;
    targetY = (event.clientY - rect.top) / rect.height * 100;
    container.classList.add('statement-hover');
    if (!frame) frame = requestAnimationFrame(render);
  }, {signal});
  container.addEventListener('pointerleave', () => {
    container.classList.remove('statement-hover');
    cancelAnimationFrame(frame);
    frame = 0;
  }, {signal});
  return () => {
    cancelAnimationFrame(frame);
    container.classList.remove('statement-hover');
    container.style.removeProperty('--statement-x');
    container.style.removeProperty('--statement-y');
  };
}

export function mountStatementBlock(root) {
  const container = root?.querySelector('.statement-container');
  const title = container?.querySelector('.statement-title');
  if (!container || !title || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const engine = window.harnessScroll;
  const layer = document.querySelector('[data-scroll-layer]');
  const narrow = matchMedia('(max-width: 767px)');
  const events = new AbortController();
  root.dataset.motion = engine ? 'spring' : 'native';

  const gridHost = document.createElement('div');
  gridHost.className = 'statement-grid';
  const wipeHost = document.createElement('div');
  wipeHost.className = 'statement-wipe';
  wipeHost.setAttribute('aria-hidden', 'true');
  const squares = root.hasAttribute('data-squares') ? introSquares() : null;
  container.prepend(gridHost);
  if (squares) title.after(squares);
  container.append(wipeHost);

  const grid = createHoverGrid(gridHost, {variant: 'light', pointerTarget: container});
  const reveal = createSplitReveal(title);
  const wipe = createPixelWipe(wipeHost, {cols: 17, rows: 9, color: root.dataset.wipe || '#11120D'});
  const unglow = pointerGlow(container, events.signal);

  // Document offsets of the block, measured against the layer so the spring lag cancels out.
  // start: the pin begins once the panel's bottom reaches the viewport bottom.
  let top = 0, length = 0, start = 0, pin = '';
  const measure = () => {
    const panel = container.offsetHeight;
    root.style.setProperty('--statement-h', `${panel}px`);
    const box = root.getBoundingClientRect();
    top = engine ? box.top - layer.getBoundingClientRect().top : box.top + scrollY;
    length = box.height;
    start = Math.max(0, panel - innerHeight);
    if (!engine) root.style.setProperty('--statement-top', `${-start}px`);
  };
  // scrolled: document offset currently shown at the viewport top.
  const update = scrolled => {
    if (!reveal.played && scrolled >= top - innerHeight * REVEAL_AT) {
      reveal.play();
      root.classList.add('is-revealed');
    }
    const span = Math.max(1, length - start);
    const offset = Math.min(span, Math.max(0, scrolled - top - start));
    if (engine) container.style.transform = offset ? `translate3d(0,${offset}px,0)` : '';
    const state = scrolled > top + length ? 'after' : offset > 0 ? 'pinned' : 'before';
    if (state !== pin) root.dataset.pin = pin = state;
    const from = narrow.matches ? WIPE_FROM.narrow : WIPE_FROM.wide;
    wipe.render((offset / span - from) / (1 - from));
  };

  let frame = 0;
  const refresh = () => {
    frame = 0;
    measure();
    update(engine ? -engine.y.get() : scrollY);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh); };
  measure();
  const unsubscribe = engine ? engine.y.on('change', y => update(-y)) : null;
  if (!engine) addEventListener('scroll', () => update(scrollY), {passive: true, signal: events.signal});
  addEventListener('resize', schedule, {signal: events.signal});
  addEventListener('harness:layout-change', schedule, {signal: events.signal});
  const resizeObserver = new ResizeObserver(schedule);
  resizeObserver.observe(layer || document.body);
  resizeObserver.observe(container);
  refresh();
  // The engine resizes its spacer from a ResizeObserver, one frame late. Size it now, so the
  // document has its full length from the first paint (index.html renders once app.mjs has run).
  const spacer = document.querySelector('[data-scroll-spacer]');
  if (engine && layer && spacer) spacer.style.height = `${layer.getBoundingClientRect().height}px`;

  return () => {
    events.abort();
    unsubscribe?.();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
    unglow();
    grid.destroy();
    reveal.destroy();
    wipe.destroy();
    gridHost.remove();
    wipeHost.remove();
    squares?.remove();
    container.style.transform = '';
    root.style.removeProperty('--statement-h');
    root.style.removeProperty('--statement-top');
    root.classList.remove('is-revealed');
    delete root.dataset.motion;
    delete root.dataset.pin;
  };
}
