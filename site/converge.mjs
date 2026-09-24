import {bindScramble, clamp01, ease, flicker, randomStagger, splitText} from './text-effects.mjs';

// Convergence section (#converge-block). Four labelled strands wave in from the left (from the
// top below 768 px), fuse into one beam ending on the TASK node, and the headline block
// appears beside the node. The section is min(10000px, 750svh) tall; its stage stays pinned
// while the section scrolls past, and the pinned distance scrubs one timeline.
//
//   mountConverge(root) -> dispose
//
// Scroll: inside the smooth-scroll layer (smooth-scroll.mjs) CSS sticky cannot pin, so the
// stage is translated by the layer offset from window.harnessScroll.y. Without the engine the
// stage is CSS sticky and progress comes from scrollY. Reduced motion never mounts: the markup
// already holds a static composition (inline SVG beam, visible headline block and lead).
//
// Drawing: Canvas2D. The camera sees 7.6732 world units of stage height (a 75 degree vertical
// field of view at distance 5), so one unit is stageHeight / 7.6732 CSS px. In the wide layout the
// camera also sits off centre by .5 units per unit of stage aspect ratio away from 1.6 (none at
// 1440 x 900): narrower stages move the scene left, beside the headline block, which converge.css
// moves from 50% to 45% of the width below 1280 px. The offset is capped so the TASK node's
// halo stays at least one node radius clear of the headline text; the static SVG applies the
// same rule. Glow is drawn with
// canvas shadows on the dots and labels, plus a radial halo around the TASK node. Frames run
// only while the stage is on screen and the strands still move; once fused the picture is static
// and redraws only when progress changes.

const TOTAL = 1.16; // timeline length; progress 0..1 maps onto 0..TOTAL
const VIEW_UNITS = 7.6732; // world units across the stage height
const SPACING = .76; // world units between strand vertices
const POINTS = 100;
const WAVE_NUMBER = .37; // radians per world unit along the strand
const LABEL_LIFT = .26; // label centre above its dot, world units
// Per strand: head offset along the strand before the fuse, lateral wave amplitude, sway and
// wave phases (radians), and the fan it keeps after the fuse (lateral units per unit^2.15
// behind the fan anchor).
const STRANDS = [
  {label: 'MEMORY', shift: -3, amp: 2, sway: .42, wave: 4.142, fan: .02038},
  {label: 'SKILLS', shift: -2, amp: 1.5, sway: 3.99, wave: 3.902, fan: -.03513},
  {label: 'CHECKS', shift: -4, amp: 1.25, sway: 4.68, wave: .818, fan: -.00991},
  {label: 'TASK', shift: 2, amp: 1, sway: 4.658, wave: .818, fan: 0, main: true},
];
const FAN_ANCHOR = .5;
const LINE = 'rgb(72 250 108)';
const DOT = 'rgb(74 228 104)';
const NODE = [133, 255, 173]; // TASK dot before the tint
const NODE_TINT = [234, 252, 234];
const NODE_RADIUS = .098;
const NODE_END = -.018; // TASK node's axial position once fused, wide layout (the SVG's circle)
// TASK node halo: a radial fade in the node's current color from 0.9 to 1.33 node radii.
// Its opacity rises with the tint, so the glow brightens and spreads as the node turns white.
const HALO = {inner: .9, outer: 1.33, from: .25, to: .35};
const DOT_RADIUS = .025;
const LABEL = '#f7f7f7';
const LABEL_SIZE = .16; // world units, about 19 px on a 900 px stage
const LABEL_FONT = '"Departure Mono", ui-monospace, monospace'; // fonts.css; one weight, drawn at 400
const LABEL_ORDER = ['TASK', 'MEMORY', 'SKILLS', 'CHECKS']; // who keeps the spot where two meet
const DPR_MIN = .5;

const toLinear = c => (c /= 255) <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const toSrgb = c => Math.round(255 * (c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055));
const mixColor = (a, b, u) => a.map((c, i) => toSrgb(toLinear(c) + (toLinear(b[i]) - toLinear(c)) * u));

// Scene values at timeline time t (0..TOTAL).
function scene(t, narrow) {
  const fuse = ease.power1InOut(clamp01((t - .6) / .4));
  const enterEnd = narrow ? -1 : -1.5;
  return {
    fuse,
    enter: t < .6 ? 12 - 12.5 * ease.power1Out(clamp01(t / .6)) : -.5 + (enterEnd + .5) * fuse,
    base: narrow ? -.5 : -.75,
    shift: narrow ? 0 : -.5 * ease.power1InOut(clamp01((t - .9) / .2)),
    tint: ease.power1InOut(clamp01((t - .92) / .08)),
    mainLabel: 1 - ease.power1InOut(clamp01((t - .96) / .04)),
  };
}

export function mountConverge(root) {
  if (!root || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const stage = root.querySelector('.cv-stage');
  const canvas = root.querySelector('.cv-canvas');
  const context = canvas?.getContext('2d');
  if (!stage || !context) return () => {};

  const engine = window.harnessScroll;
  const layer = document.querySelector('[data-scroll-layer]');
  const pinned = !!(engine && layer);
  const events = new AbortController();
  const narrowQuery = matchMedia('(max-width: 767px)');
  const header = document.querySelector('.site-header');

  const leadEl = root.querySelector('.cv-lead');
  const titleEl = root.querySelector('.cv-title');
  const bodyEl = root.querySelector('.cv-body');
  const cta = root.querySelector('.cv-cta');
  const center = root.querySelector('.cv-center');
  const lead = splitText(leadEl);
  const title = splitText(titleEl, {chars: true});
  const body = splitText(bodyEl);
  const leadIn = randomStagger(lead.words.length, .1);
  const leadOut = randomStagger(lead.words.length, .1);
  const bodyIn = randomStagger(body.words.length, .05);
  // The timeline length fits a 21-letter headline with letters 0.008 apart; longer copy
  // tightens the step so the last letter still lands at the end of the timeline.
  const charStep = Math.min(.008, .16 / Math.max(1, title.chars.length - 1));
  const unscramble = bindScramble(cta, root.querySelector('.cv-cta-label'));

  root.dataset.live = '';
  root.dataset.pin = pinned ? 'transform' : 'sticky';

  let top = 0; // section top: layer px (pinned) or document px (sticky)
  let height = 0;
  let width = 0;
  let seen = 0; // stage px left of the viewport's right edge: a classic scrollbar covers the rest
  let viewHeight = 0;
  let narrow = narrowQuery.matches;
  let progress = -1;
  let inView = false;
  let focusReveal = false;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  let dprCap = dpr;
  let camera = 0; // camera offset along the strands, world units (wide layout only)
  let headerLine = 0; // fixed header's bottom edge, px below the viewport top
  let stageTop = 0; // stage's top edge, px below the viewport top
  let frame = 0;
  let needsDraw = true;

  // Opacity/transform writes are skipped when the value has not changed.
  const written = new WeakMap();
  const write = (element, property, value) => {
    const key = written.get(element) || {};
    if (key[property] === value) return;
    key[property] = value;
    written.set(element, key);
    element.style[property] = value;
  };
  const opacity = (element, value) => write(element, 'opacity', String(Math.round(value * 1000) / 1000));

  const measure = () => {
    narrow = narrowQuery.matches;
    const cap = Math.min(devicePixelRatio || 1, 2);
    if (cap !== dprCap) dpr = dprCap = cap;
    const rect = root.getBoundingClientRect();
    top = pinned ? rect.top - layer.getBoundingClientRect().top : rect.top + scrollY;
    height = root.offsetHeight;
    viewHeight = stage.offsetHeight;
    width = stage.offsetWidth;
    seen = Math.min(width, document.documentElement.clientWidth - stage.getBoundingClientRect().left);
    headerLine = header ? header.getBoundingClientRect().bottom : 0;
    const k = viewHeight / VIEW_UNITS;
    const textLeft = center.offsetLeft + parseFloat(getComputedStyle(center).paddingLeft);
    camera = narrow || !k ? 0
      : Math.min(.5 * (width / viewHeight - 1.6), (textLeft - width / 2) / k - NODE_END - NODE_RADIUS * (HALO.outer + 1));
    resizeCanvas();
    needsDraw = true;
  };
  const resizeCanvas = () => {
    const w = Math.max(1, Math.round(width * dpr));
    const h = Math.max(1, Math.round(viewHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };

  // Text timeline. t is timeline time; the headline block is forced to its end state while
  // keyboard focus is inside it, so a focused call to action is never invisible. Meanwhile
  // data-focus-reveal hides the lead (converge.css), which would otherwise overlap the block.
  const renderText = t => {
    const leadIn01 = ease.power4Out(clamp01(t / .3));
    const leadOut01 = ease.power4In(clamp01((t - .6) / .4));
    write(leadEl, 'transform', `translate3d(0, ${((t < .6 ? 1 - leadIn01 : leadOut01) * 100).toFixed(3)}%, 0)`);
    lead.words.forEach((word, i) => opacity(word, t < .6 ? flicker((t - leadIn[i]) / .2) : 1 - flicker((t - .6 - leadOut[i]) / .2)));

    const c = focusReveal ? TOTAL : t;
    const slide = (1 - ease.power1InOut(clamp01((c - .9) / .2))) * 50;
    const move = narrow ? `translate3d(0, ${slide.toFixed(2)}px, 0)` : `translate3d(${slide.toFixed(2)}px, 0, 0)`;
    write(titleEl, 'transform', move);
    write(bodyEl, 'transform', move);
    title.chars.forEach((char, i) => opacity(char, ease.power4InOut(clamp01((c - .9 - i * charStep) / .1))));
    body.words.forEach((word, i) => opacity(word, flicker((c - .9 - bodyIn[i]) / .2)));
    const ctaIn = ease.power2InOut(clamp01((c - .95) / .1));
    opacity(cta, ctaIn);
    write(cta, 'transform', narrow
      ? `translate3d(0, calc(${slide.toFixed(2)}px + ${((1 - ctaIn) * 25).toFixed(2)}%), 0)`
      : `translate3d(${slide.toFixed(2)}px, ${((1 - ctaIn) * 25).toFixed(2)}%, 0)`);
    write(cta, 'pointerEvents', ctaIn > .5 ? '' : 'none');
  };

  const draw = now => {
    const t = Math.max(0, progress) * TOTAL;
    const s = scene(t, narrow);
    const time = now / 1000;
    const k = viewHeight / VIEW_UNITS;
    const cx = width / 2;
    const cy = viewHeight / 2;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, viewHeight);
    // Axial coordinate a runs along the strands (screen right, or down when narrow); lateral l
    // is perpendicular (screen up, or right when narrow).
    const shift = s.shift + camera;
    const px = narrow ? (a, l) => cx + l * k : a => cx + (a + shift) * k;
    const py = narrow ? a => cy + (a + shift) * k : (a, l) => cy - l * k;
    const reach = (narrow ? cy : cx) / k + SPACING;
    const flat = 1 - s.fuse ** 3.5;
    const sway = 1 - s.fuse;
    const heads = STRANDS.map(strand => {
      const head = strand.shift * sway + s.base - s.enter - .268 * s.fuse ** 2.2 + sway * Math.sin(.8 * time + strand.sway);
      const lateral = d => strand.amp * flat * Math.sin(1.6 * time + strand.wave - WAVE_NUMBER * d)
        + (strand.fan && s.fuse ? strand.fan * s.fuse * Math.max(0, FAN_ANCHOR - (head - d)) ** 2.15 : 0);
      return {strand, head, lateral};
    });

    context.lineWidth = .01 * k;
    context.lineJoin = 'round';
    context.strokeStyle = LINE;
    for (const {head, lateral} of heads) {
      if (head + shift < -reach) continue;
      context.beginPath();
      for (let j = 0; j < POINTS; j++) {
        const d = j * SPACING;
        const a = head - d;
        const l = lateral(d);
        if (j) context.lineTo(px(a, l), py(a, l)); else context.moveTo(px(a, l), py(a, l));
        if (a + shift < -reach) break;
      }
      context.stroke();
    }

    for (const {strand, head, lateral} of heads) {
      const l = lateral(0);
      const x = px(head, l);
      const y = py(head, l);
      const radius = (strand.main ? NODE_RADIUS : DOT_RADIUS) * k;
      if (x < -radius * 4 || y < -radius * 4) continue;
      const rgb = strand.main ? mixColor(NODE, NODE_TINT, s.tint).join(' ') : '';
      const color = strand.main ? `rgb(${rgb})` : DOT;
      if (strand.main) {
        const halo = context.createRadialGradient(x, y, radius * HALO.inner, x, y, radius * HALO.outer);
        halo.addColorStop(0, `rgb(${rgb} / ${HALO.from + (HALO.to - HALO.from) * s.tint})`);
        halo.addColorStop(1, `rgb(${rgb} / 0)`);
        context.shadowBlur = 0;
        context.fillStyle = halo;
        context.beginPath();
        context.arc(x, y, radius * HALO.outer, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowColor = color;
      context.shadowBlur = (strand.main ? 3 : 2) * dpr;
      context.fillStyle = color;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }

    const size = LABEL_SIZE * k;
    context.font = `400 ${size.toFixed(2)}px ${LABEL_FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = LABEL;
    // Labels stay whole and on their dots: each fades out over one label height as its box nears
    // a side edge of the stage (on the right, where a classic scrollbar starts) or its top nears
    // the fixed header's bottom edge, so no edge ever cuts one. Where two would touch, the later
    // one in LABEL_ORDER fades out over half a label height of the gap between them (a quarter
    // height of padding each side), and while the earlier one fades in or out it gives way by the
    // time that one reaches 0.2% opacity (the least that is drawn), so the letters never overlap.
    const headerY = headerLine - stageTop;
    const labels = [];
    for (const {strand, head, lateral} of heads) {
      const l = lateral(0);
      const y = py(head, l) - LABEL_LIFT * k;
      const x = px(head, l);
      const half = context.measureText(strand.label).width / 2;
      const alpha = (strand.main ? s.mainLabel : 1 - s.fuse) * clamp01((y - size / 2 - headerY) / size)
        * clamp01(Math.min(x - half, seen - x - half) / size);
      if (alpha <= .002) continue;
      labels.push({text: strand.label, x, y, half, alpha, rank: LABEL_ORDER.indexOf(strand.label)});
    }
    labels.sort((a, b) => a.rank - b.rank);
    labels.forEach((label, i) => {
      for (const other of labels.slice(0, i)) {
        const gap = Math.max(Math.abs(label.x - other.x) - label.half - other.half, Math.abs(label.y - other.y) - size) - size / 2;
        label.alpha *= 1 - (1 - clamp01(gap / (size / 2))) * clamp01(other.alpha / .002);
      }
    });
    // Two passes: a wide soft halo, then the letters with a tight one (the bloom around them).
    for (const [blur, glow] of [[7, 'rgb(247 247 247 / .5)'], [2, 'rgb(247 247 247 / .8)']]) {
      context.shadowColor = glow;
      context.shadowBlur = blur * dpr;
      for (const {text, x, y, alpha} of labels) {
        if (alpha <= .002) continue;
        context.globalAlpha = alpha;
        context.fillText(text, x, y);
      }
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    needsDraw = false;
  };

  // Frame loop: runs while the stage is on screen and either the strands move (not yet fused)
  // or a redraw is pending. While moving, the backing-store scale adapts in 500 ms windows: a
  // median frame over 20 ms (under 50 fps) drops it a step, three calm windows in a row raise it
  // again. Isolated stalls (tab switches, screenshots) do not move the median. The static fused
  // picture is always drawn at full scale.
  let lastFrame = 0;
  let windowStart = 0;
  let calmWindows = 0;
  const deltas = [];
  const setScale = value => { if (value !== dpr) { dpr = value; resizeCanvas(); needsDraw = true; } };
  const adapt = now => {
    if (lastFrame) deltas.push(now - lastFrame);
    else windowStart = now;
    lastFrame = now;
    if (now - windowStart < 500 || deltas.length < 10) return;
    deltas.sort((a, b) => a - b);
    const median = deltas[deltas.length >> 1];
    deltas.length = 0;
    windowStart = now;
    if (median > 20) { calmWindows = 0; setScale(Math.max(DPR_MIN, dpr - .25)); }
    else if (median < 14 && ++calmWindows >= 3) { calmWindows = 0; setScale(Math.min(dprCap, dpr + .25)); }
  };
  const settleLoop = () => { lastFrame = 0; deltas.length = 0; calmWindows = 0; };
  const loop = now => {
    frame = 0;
    if (!inView) return;
    const moving = progress * TOTAL < 1;
    if (moving) adapt(now);
    else { settleLoop(); setScale(dprCap); }
    if (moving || needsDraw) draw(now);
    if (moving) frame = requestAnimationFrame(loop);
  };
  const wake = () => { if (inView && !frame) frame = requestAnimationFrame(loop); };

  // offset: px the viewport top has travelled past the section top.
  // Off screen the progress sits at 0 or 1, so nothing is rewritten there.
  const update = offset => {
    const range = Math.max(0, height - viewHeight);
    const pin = Math.min(range, Math.max(0, offset));
    stageTop = pin - offset;
    if (pinned) write(stage, 'transform', `translate3d(0, ${pin.toFixed(2)}px, 0)`);
    const visible = offset > -viewHeight && offset < height;
    const next = range ? pin / range : 0;
    if (next !== progress) {
      progress = next;
      renderText(progress * TOTAL);
      needsDraw = true;
    }
    if (visible !== inView) { inView = visible; if (!visible) { cancelAnimationFrame(frame); frame = 0; settleLoop(); } }
    wake();
  };
  const refresh = () => update(pinned ? -engine.y.get() - top : scrollY - top);

  measure();
  if (pinned) events.signal.addEventListener('abort', engine.y.on('change', y => update(-y - top)));
  else addEventListener('scroll', refresh, {passive: true, signal: events.signal});
  const relayout = () => { measure(); progress = -1; refresh(); };
  addEventListener('resize', relayout, {passive: true, signal: events.signal});
  addEventListener('harness:layout-change', relayout, {signal: events.signal});
  narrowQuery.addEventListener('change', relayout, {signal: events.signal});
  const observer = new ResizeObserver(() => { const before = top; measure(); if (before !== top) progress = -1; refresh(); });
  observer.observe(pinned ? layer : document.body);
  observer.observe(root);
  // Warm the glyph and shadow paths once, so the first labelled frame on screen does not stall.
  const warm = () => {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalAlpha = .01;
    context.shadowColor = LABEL;
    context.shadowBlur = 4;
    context.font = `400 12px ${LABEL_FONT}`;
    context.fillStyle = LABEL;
    context.fillText(STRANDS.map(strand => strand.label).join(' '), 20, 20);
    context.beginPath();
    context.arc(20, 40, 6, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };
  document.fonts?.load(`400 12px ${LABEL_FONT}`).then(() => { warm(); needsDraw = true; wake(); }, () => {});
  const setFocusReveal = on => {
    focusReveal = on;
    root.toggleAttribute('data-focus-reveal', on);
    renderText(progress * TOTAL);
  };
  center.addEventListener('focusin', () => setFocusReveal(true), {signal: events.signal});
  center.addEventListener('focusout', event => {
    if (!center.contains(event.relatedTarget)) setFocusReveal(false);
  }, {signal: events.signal});
  refresh();

  return () => {
    events.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    unscramble();
    lead.restore();
    title.restore();
    body.restore();
    for (const element of [stage, leadEl, titleEl, bodyEl, cta]) element.removeAttribute('style');
    delete root.dataset.live;
    delete root.dataset.pin;
    root.removeAttribute('data-focus-reveal');
  };
}
