import {createSplitReveal} from './split-reveal.mjs';
import {createPixelWipe} from './pixel-wipe.mjs';
import {createHoverGrid} from './hover-grid.mjs';

// Card row (.card-row): a pillar headline over three dashed command cards. The homepage uses it
// for Planned and Production-ready. The static markup is the finished section (headline and
// cards), which is what reduced motion and no-JS visitors get; card-art.mjs fills the media
// boxes. With motion this module adds:
//   - geometry: the section grows by 150svh of scroll. The headline stops 24 px below the fixed
//     header and stays there for the rest of the section. The content box pins once the headline
//     reaches that line, or later, once the content's bottom (the last card or line, plus 32 px)
//     reaches the viewport bottom, if it is not in view yet. In between, the headline block holds
//     under the header on a band of the section's color while the cards scroll up under it.
//     The box stays pinned until the section's bottom reaches the viewport top; the next section
//     slides up over it.
//   - pinned frame: while the box is pinned nothing sits half under the band. Every card and the
//     line under them is either clear below the band (corner pins included) or wholly under its
//     solid part, and the last one is in view. plan() picks the frame nearest the natural one:
//     it may pin up to 24 px early (the last line then ends 8 px above the viewport bottom), pin
//     later so a card passes wholly under the band, narrow the band's fade (32 px, down to 16)
//     and solid part (24 px, down to 8), or, for a single row of cards, close the gap above the
//     line under the cards down to 32 px and then lower the media boxes from 2:1 by up to a
//     third. When no card ever reaches the headline the band stops at it.
//   - short screens: a single row whose cards (top to name) do not fit between the held
//     headline's full band and the viewport bottom lowers its media boxes until they do (by up to
//     half); the last-card hold then keeps the whole row readable while the headline holds.
//   - tail: the box stays pinned for 150svh of scroll, unless the pinned frame has every card
//     under the band (one row that cannot fit with the line under it). Then it is pinned only
//     while the next section slides up over it, so the stage never holds with no card on it.
//   - lead block: a block above the headline (the /long-horizon pair) holds still once it is
//     wholly in view, so it stays readable for at least 0.65 viewport heights of scroll; the
//     section grows by the hold.
//   - last card: when the pinned frame has the last card wholly under the band (stacked cards on
//     phones, or a single row on a short screen), the box also holds still at the last moment
//     that card's frame sits clear below the band, so its media and name stay readable for at
//     least 0.65 viewport heights of scroll before it passes under; the section grows by that
//     hold too.
//   - reveal, once, when the headline's top reaches 75% of the viewport height: its words rise (0.5 s,
//     ease-out cubic) and 0.1 s later its characters fade in 10 ms apart; the cards fade and rise
//     from 30% of their height (1 s, ease-in-out quint), 0.1 s apart starting at 0.1 s
//   - hover grid: dark variant, green light through the gaps around the pointer
//   - card hover: the frame's arc fades in (0.3 s) and turns toward the pointer's angle around the
//     card center; every pointer move restarts a 0.6 s ease-out quad turn from where it is. The
//     target angle is shifted by whole turns to within 180 degrees of an anchor angle. The anchor
//     is 0 at first and goes back to 0 whenever the pointer leaves the card. A move over the card
//     that comes 0.3 s or more after the previous move over it moves the anchor to its shifted
//     target; moves outside the card do not count. So an entry from rest turns the arc to the
//     entry angle (-180 to 180; it may unwind several turns while it fades in), and a pointer
//     that pauses now and then carries the arc on round the card. Without a rest the anchor
//     holds: a sweep of more than 180 degrees sends the arc back the other way at the far side,
//     and a pointer that leaves and comes back within 0.3 s is held within 180 degrees of 0, not
//     of the angle it came back in at.
//   - pixel wipe: 17 x 9 cells in the block's data-wipe color (the next section's background)
//     fill in shuffled order over the end of the pin, from 71.4% of it (56% up to 1024 px wide)
//     to its end. The wipe covers the viewport while the box is pinned.
// Pinning, the held headline, the reveal and the wipe follow the rendered spring offset
// (window.harnessScroll.y), so they line up with what is on screen. Without the engine the box
// and the headline block hold with position:sticky and the rest follows native scroll.

const HEAD_GAP = 24; // px between the fixed header and the held headline
const FOOT_GAP = 32; // px between the content's bottom and the viewport bottom
const FOOT_MIN = 8; // px, the least that gap may shrink to in the pinned frame
const BAND = {solid: [24, 16, 8], fade: [32, 24, 16]}; // px below the held headline, preferred first
const PIN_OUT = 8; // px a card's corner pins and their glow reach past its frame
const TRIM = 1 / 3; // most of a media box's height a single row may lose to fit its pinned frame
const MEDIA_FIT = 1 / 2; // most it may lose so a card shows whole under the held headline
const FOOT_TOP = 32; // px, the least gap above the line under a single row of cards
const LEAD_READ = 0.65; // viewport heights the lead block stays wholly readable
const LEAD_GAP = 16; // px between the lead block and the viewport bottom where it holds
const WIPE_FROM = {wide: 0.714, narrow: 0.56};
const REVEAL_AT = 0.75; // viewport fraction
const CARD_DELAY = 0.1; // s, first card, and the gap between cards
const TURN = 600; // ms
const REST = 300; // ms without a pointer move over the card before the next one re-anchors the arc
const quadOut = p => 1 - (1 - p) ** 2;

function createArc(card) {
  const sweep = card.querySelector('.cmd-card__sweep');
  const events = new AbortController();
  let value = 0, from = 0, to = 0, start = 0, frame = 0, anchor = 0, moved = -Infinity, stepped = 0;
  const tick = () => {
    frame = 0;
    stepped = performance.now();
    const p = Math.min(1, (stepped - start) / TURN);
    value = from + (to - from) * quadOut(p);
    sweep.style.transform = `rotate(${value.toFixed(3)}deg)`;
    if (p < 1) frame = requestAnimationFrame(tick);
  };
  const options = {passive: true, signal: events.signal};
  card.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    card.classList.add('is-hovered');
  }, options);
  card.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    // Whole-pixel coordinates, as mouse events report them: on a pointer level with the center
    // this sets whether the arc starts clockwise or counterclockwise.
    const box = card.getBoundingClientRect();
    let angle = Math.atan2(Math.floor(event.clientY) - box.top - box.height / 2, Math.floor(event.clientX) - box.left - box.width / 2) * 180 / Math.PI;
    // Exactly 180 degrees from the anchor stays where it is.
    while (angle - anchor > 180) angle -= 360;
    while (angle - anchor < -180) angle += 360;
    if (event.timeStamp - moved >= REST) anchor = angle;
    moved = event.timeStamp;
    // A retarget continues from the last painted frame, at that frame's time, so rapid moves lose
    // no progress; from rest the turn starts at the current frame.
    start = frame ? stepped : document.timeline?.currentTime ?? performance.now();
    from = value;
    to = angle;
    if (!frame) frame = requestAnimationFrame(tick);
  }, options);
  card.addEventListener('pointerleave', () => {
    anchor = 0;
    card.classList.remove('is-hovered');
  }, options);
  return () => {
    events.abort();
    cancelAnimationFrame(frame);
    card.classList.remove('is-hovered');
    sweep.style.transform = '';
  };
}

// Pinned frame. items: the cards and the line under them, top to bottom, as section offsets;
// cards: how many of them are cards; headBottom: the headline block's bottom; s0: how far the
// content would pass under the held headline in the natural frame (content bottom FOOT_GAP above
// the viewport bottom); low: the least it may pass (the last item's bottom FOOT_MIN above the
// viewport bottom); trimCap: how far each media box may shrink (single row only; the line under
// the cards moves up with it); footCap: how far the line under the cards may move up first, by
// closing the gap above it; mediaMin: how far the media boxes must shrink whatever the frame (so
// a card shows whole under the held headline on a short screen; may exceed trimCap). Returns the
// shift s, the band below the headline (solid, fade), close (px the gap above the line closes)
// and media (px the media boxes lose): the trim closes the gap first, then lowers the boxes.
function plan(items, cards, headBottom, s0, low, trimCap, footCap, mediaMin = 0) {
  let best = null;
  const offer = (cost, s, solid, fade, close, media) => { if (!best || cost < best.cost - 1e-6) best = {cost, s, solid, fade, close, media}; };
  const full = BAND.solid[0] + BAND.fade[0];
  const cap = Math.max(trimCap, mediaMin) + footCap, step = Math.max(1, cap / 24);
  for (let trim = 0; trim <= cap; trim += step) {
    const close = Math.min(trim, footCap), media = Math.max(mediaMin, trim - footCap), shift = close + media;
    const at = items.map((item, i) => ({
      top: item.top - headBottom - (i >= cards ? shift : 0),
      bottom: item.bottom - headBottom - (i >= cards ? shift : media),
    }));
    const n0 = Math.max(0, s0 - shift), l0 = Math.max(0, low - shift);
    const cost = s => (s < n0 ? 2 * (n0 - s) : s - n0) + shift;
    // Nothing reaches the headline: the band below it only fills the room left.
    const room = at[0].top - PIN_OUT;
    if (room >= l0) {
      const s = Math.min(n0, room);
      const band = Math.max(0, Math.min(full, room - s));
      offer(cost(s), s, band * BAND.solid[0] / full, band * BAND.fade[0] / full, close, media);
    }
    for (const solid of BAND.solid) for (const fade of BAND.fade) {
      const reach = solid + fade + PIN_OUT;
      const clear = (item, s) => item.top - s >= reach;
      const buried = (item, s) => item.bottom - s + PIN_OUT <= solid;
      const penalty = 2 * (full - solid - fade);
      for (const s of [n0, l0, ...at.flatMap(item => [item.top - reach, item.bottom + PIN_OUT - solid])]) {
        if (s < l0 || !clear(at.at(-1), s) || !at.every(item => clear(item, s) || buried(item, s))) continue;
        offer(cost(s) + penalty, s, solid, fade, close, media);
      }
    }
  }
  return best;
}

export function mountCardRow(root) {
  const section = root?.querySelector('.card-row__section');
  const pin = section?.querySelector('.card-row__pin');
  const inner = pin?.querySelector('.card-row__inner');
  const head = inner?.querySelector('.card-row__head');
  const title = head?.querySelector('.card-row__title');
  const cardList = inner?.querySelector('.card-row__cards');
  if (!title || !cardList || matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const engine = window.harnessScroll;
  const layer = document.querySelector('[data-scroll-layer]');
  const header = document.querySelector('.site-header');
  const wide = matchMedia('(min-width: 1025px)');
  const events = new AbortController();
  root.dataset.motion = engine ? 'spring' : 'native';

  const gridHost = document.createElement('div');
  gridHost.className = 'card-row__grid';
  const wipeHost = document.createElement('div');
  wipeHost.className = 'card-row__wipe';
  wipeHost.setAttribute('aria-hidden', 'true');
  pin.prepend(gridHost);
  pin.append(wipeHost);

  const grid = createHoverGrid(gridHost, {variant: 'dark', pointerTarget: pin});
  const reveal = createSplitReveal(title, {charDelay: CARD_DELAY});
  const wipe = createPixelWipe(wipeHost, {cols: 17, rows: 9, color: root.dataset.wipe || '#F3F3EC'});
  const cards = [...section.querySelectorAll('.cmd-card')];
  cards.forEach((card, index) => card.style.setProperty('--card-delay', `${(CARD_DELAY * (index + 1)).toFixed(2)}s`));
  const arcs = cards.map(createArc);

  // Document offsets, measured against the layer so the spring lag cancels out. The pin runs
  // between whole-pixel scroll positions and the section is the rounded content height plus
  // 150svh long. Offsets inside the box come from layout (offsetTop), so the held headline's
  // shift and the cards' reveal offset do not move them. hold: how far past the section top the
  // headline reaches its line under the header; lead: how far the pin starts past the section
  // top (negative: before it), never before hold.
  // Holds (lead block, last card): at, how far past the section top the box holds still, in the
  // scroll it would show without the holds; len, for how long. intro: all of them together.
  const leadBlock = head.previousElementSibling;
  let top = 0, length = 0, height = 0, lead = 0, hold = 0, titleAt = 0, pinState = '', held = false;
  let trim = 0, footTrim = 0, intro = 0, holds = [];
  const measure = () => {
    const headAt = inner.offsetTop + cardList.offsetTop - parseFloat(getComputedStyle(head).marginBottom) - head.offsetHeight;
    titleAt = headAt + title.offsetTop;
    const last = inner.lastElementChild;
    const line = (header ? header.offsetHeight : 0) + HEAD_GAP;
    hold = titleAt - line;
    // The layout as it is without the trim now applied (a single row only, so each card's bottom
    // sits `trim` lower untrimmed and everything below the cards `trim + footTrim` lower).
    const listAt = inner.offsetTop + cardList.offsetTop;
    const items = cards.map(card => ({top: listAt + card.offsetTop, bottom: listAt + card.offsetTop + card.offsetHeight + trim}));
    const below = trim + footTrim;
    if (last !== cardList) items.push({top: inner.offsetTop + last.offsetTop + below, bottom: inner.offsetTop + last.offsetTop + last.offsetHeight + below});
    const lastBottom = items.at(-1).bottom;
    const media = cards[0].querySelector('.cmd-card__media');
    const oneRow = cards.every(card => card.offsetTop === cards[0].offsetTop);
    const trimCap = oneRow && media ? Math.floor(media.offsetWidth / 2 * TRIM) : 0;
    const footCap = oneRow && last !== cardList ? Math.max(0, Math.floor(parseFloat(getComputedStyle(last).marginTop) + footTrim - FOOT_TOP)) : 0;
    // Short screens: while the headline is held, a card shows whole only in the room between the
    // full band (plus the corner pins' reach) and the viewport bottom. A single row whose card,
    // from its top to its name, is taller than that room lowers its media boxes to fit, by up to
    // half; the last-card hold below then keeps the row there.
    let mediaMin = 0;
    const name = cards[0].querySelector('.cmd-card__title');
    if (oneRow && media && name) {
      const clearFrom = line - title.offsetTop + head.offsetHeight + BAND.solid[0] + BAND.fade[0] + PIN_OUT;
      const span = name.getBoundingClientRect().bottom - cards[0].getBoundingClientRect().top + trim;
      mediaMin = Math.min(Math.floor((media.offsetWidth / 2) * MEDIA_FIT), Math.max(0, Math.ceil(span - (innerHeight - clearFrom))));
    }
    const s0 = Math.max(0, lastBottom + FOOT_GAP - innerHeight - hold);
    const low = Math.max(0, lastBottom + FOOT_MIN - innerHeight - hold);
    const frame = plan(items, cards.length, headAt + head.offsetHeight, s0, low, trimCap, footCap, mediaMin)
      || {s: s0, solid: BAND.solid[0], fade: BAND.fade[0], close: 0, media: mediaMin};
    lead = hold + Math.round(frame.s);
    root.style.setProperty('--card-band', `${(frame.solid + frame.fade).toFixed(2)}px`);
    root.style.setProperty('--card-fade', `${frame.fade.toFixed(2)}px`);
    const nextFoot = Math.round(frame.close), nextTrim = Math.round(frame.media);
    if (nextTrim !== trim || nextFoot !== footTrim) {
      trim = nextTrim;
      footTrim = nextFoot;
      if (trim) root.style.setProperty('--card-media-h', `${Math.round(media.offsetWidth / 2) - trim}px`);
      else root.style.removeProperty('--card-media-h');
      if (footTrim) root.style.setProperty('--card-foot-trim', `${footTrim}px`);
      else root.style.removeProperty('--card-foot-trim');
      root.toggleAttribute('data-trim', trim > 0);
    }
    // Tail: with every card under the band in the pinned frame, the box is pinned only while the
    // next section slides over it.
    const headBottom = headAt + head.offsetHeight, reachAll = frame.solid + frame.fade + PIN_OUT;
    const anyClear = items.slice(0, cards.length).some(item => item.top - headBottom - frame.s >= reachAll);
    if (anyClear) root.style.removeProperty('--card-tail');
    else root.style.setProperty('--card-tail', '0px');
    // Lead block: holds once wholly in view (LEAD_GAP above the viewport bottom) for as long as
    // it takes to stay readable for LEAD_READ viewport heights before its top reaches the header.
    // The spring engine carries the hold; native sticky scroll goes without it.
    holds = [];
    if (engine && leadBlock) {
      const blockTop = inner.offsetTop + leadBlock.offsetTop;
      const at = Math.max(0, blockTop + leadBlock.offsetHeight + LEAD_GAP - innerHeight);
      const clearance = header ? header.getBoundingClientRect().bottom : 0;
      holds.push({at, len: Math.round(Math.max(0, LEAD_READ * innerHeight - (blockTop - at - clearance)))});
    }
    // Last card: buried in the pinned frame, it holds where its frame (corner pins included) last
    // sits clear below the band, if its media and name are then in view. It is readable from its
    // name's bottom reaching the viewport bottom to that point, and for the hold on top.
    const lastCard = cards.at(-1), cardTop = items[cards.length - 1].top;
    const reach = frame.solid + frame.fade + PIN_OUT;
    if (engine && cardTop - headAt - head.offsetHeight - frame.s < reach) {
      const name = lastCard.querySelector('.cmd-card__title');
      const nameBottom = name ? name.getBoundingClientRect().bottom - lastCard.getBoundingClientRect().top : lastCard.offsetHeight;
      const clearFrom = line - title.offsetTop + head.offsetHeight + reach; // viewport y
      const at = cardTop - clearFrom;
      const run = innerHeight - clearFrom - nameBottom;
      // A single row reaches that point up to PIN_OUT before the headline holds (the gap under
      // the headline block can be that much narrower than the band); it then holds as the
      // headline does, with only the corner pins' glow in the band's fade.
      const from = oneRow && at > hold - PIN_OUT - 1 ? Math.max(at, hold + 1) : at;
      if (run >= 0 && from > hold) holds.push({at: from, len: Math.round(Math.max(0, LEAD_READ * innerHeight - run))});
    }
    holds = holds.filter(h => h.len > 0).sort((a, b) => a.at - b.at);
    intro = holds.reduce((sum, h) => sum + h.len, 0);
    root.style.setProperty('--card-intro', `${intro}px`);
    height = pin.getBoundingClientRect().height;
    root.style.setProperty('--card-round', `${(Math.round(height) - height).toFixed(3)}px`);
    root.style.setProperty('--card-wipe-top', `${lead.toFixed(3)}px`);
    root.style.setProperty('--card-head-top', `${(line - title.offsetTop).toFixed(3)}px`);
    if (!engine) {
      root.style.setProperty('--card-pin-top', `${-lead}px`);
      root.style.setProperty('--card-pin-h', `${height.toFixed(3)}px`);
    }
    const box = section.getBoundingClientRect();
    top = engine ? box.top - layer.getBoundingClientRect().top : box.top + scrollY;
    length = box.height - (engine ? 0 : height);
  };
  // scrolled: document offset currently shown at the viewport top.
  const update = shown => {
    // Holds: the box rides with the scroll for each hold's length from where it starts, and the
    // rest of the section runs that much later.
    let still = 0;
    for (const h of holds) still += Math.min(h.len, Math.max(0, shown - still - Math.round(top + h.at)));
    const scrolled = shown - still;
    const start = Math.round(top + lead);
    const end = Math.round(top + length - intro);
    if (!reveal.played && scrolled > top + titleAt - innerHeight * REVEAL_AT) {
      reveal.play();
      root.classList.add('is-revealed');
    }
    // From hold to the pin's start the headline block moves down with the scroll, so it stays on
    // its line while the cards pass under it; from the start on it rides with the pinned box.
    const shift = Math.max(0, Math.min(scrolled, start) - Math.round(top + hold));
    if (engine) head.style.transform = shift ? `translate3d(0,${shift}px,0)` : '';
    if (shift > 0 !== held) root.classList.toggle('is-held', held = shift > 0);
    const span = Math.max(1, end - start);
    const offset = Math.min(span, Math.max(0, scrolled - start));
    if (engine) pin.style.transform = offset + still ? `translate3d(0,${offset + still}px,0)` : '';
    const state = scrolled >= end ? 'after' : offset > 0 ? 'pinned' : 'before';
    if (state !== pinState) root.dataset.pin = pinState = state;
    const from = wide.matches ? WIPE_FROM.wide : WIPE_FROM.narrow;
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
  resizeObserver.observe(pin);
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
    arcs.forEach(dispose => dispose());
    grid.destroy();
    reveal.destroy();
    wipe.destroy();
    gridHost.remove();
    wipeHost.remove();
    pin.style.transform = '';
    head.style.transform = '';
    cards.forEach(card => card.style.removeProperty('--card-delay'));
    for (const name of ['--card-pin-top', '--card-round', '--card-pin-h', '--card-wipe-top', '--card-head-top', '--card-band', '--card-fade', '--card-media-h', '--card-foot-trim', '--card-tail', '--card-intro']) root.style.removeProperty(name);
    root.removeAttribute('data-trim');
    root.classList.remove('is-revealed', 'is-held');
    delete root.dataset.motion;
    delete root.dataset.pin;
  };
}
