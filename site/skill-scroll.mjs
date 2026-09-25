import {mountSmoothScroll} from './smooth-scroll.mjs';

// Skill pages share the homepage's smooth scroll without its homepage-only scenes.
// Reduced motion keeps these pages on native scroll.
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('.site-header');
const main = document.querySelector('main');
const footer = document.querySelector('body > footer');
let teardown;

function mount() {
  if (preference.matches || !mountSmoothScroll || teardown || !main || !header) return;
  const layer = document.createElement('div');
  const spacer = document.createElement('div');
  const headerSpace = document.createElement('div');
  layer.dataset.scrollLayer = '';
  spacer.dataset.scrollSpacer = '';
  spacer.setAttribute('aria-hidden', 'true');
  headerSpace.setAttribute('aria-hidden', 'true');
  // A fixed header overlays the layer, so the layer reserves its height. A header in the
  // normal flow (arena, long-horizon) moves into the layer instead; leaving it outside would
  // count its height twice in the document length.
  const headerInFlow = ['static', 'relative'].includes(getComputedStyle(header).position);
  main.before(layer);
  layer.append(headerInFlow ? header : headerSpace, main);
  if (footer) layer.append(footer);
  layer.after(spacer);
  document.documentElement.dataset.smoothScroll = '';
  const events = new AbortController();
  let controller;
  const resizeHeader = () => { headerSpace.style.height = `${header.getBoundingClientRect().height}px`; };
  const observer = new ResizeObserver(resizeHeader);
  const restore = () => {
    events.abort();
    observer.disconnect();
    controller?.destroy();
    if (headerInFlow) layer.before(header);
    layer.before(main);
    if (footer) layer.before(footer);
    layer.remove();
    spacer.remove();
    delete document.documentElement.dataset.smoothScroll;
    delete window.harnessScroll;
    teardown = undefined;
  };
  teardown = restore;
  try {
    resizeHeader();
    observer.observe(header);
    controller = mountSmoothScroll(layer, spacer, '100%');
    window.harnessScroll = controller;
    const reveal = (element, immediate = false) => {
      const top = Math.max(0, element.getBoundingClientRect().top - layer.getBoundingClientRect().top - header.getBoundingClientRect().height - 20);
      window.scrollTo({top, behavior: immediate ? 'instant' : 'smooth'});
      // An incoming #fragment lands in place instead of gliding in from the top.
      if (immediate) {controller.scrollY.set(scrollY); controller.y.jump(-scrollY);}
    };
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.origin !== location.origin || link.pathname !== location.pathname || !link.hash) return;
      let target;
      try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch { return; }
      if (!target) return;
      event.preventDefault();
      history.pushState(null, '', link.hash);
      target.setAttribute('tabindex', '-1');
      target.focus({preventScroll:true});
      reveal(target);
    }, {signal:events.signal});
    let pointerFocus = false;
    document.addEventListener('pointerdown', () => {pointerFocus = true;}, {capture:true, signal:events.signal});
    document.addEventListener('keydown', () => {pointerFocus = false;}, {capture:true, signal:events.signal});
    document.addEventListener('focusin', event => {
      if (pointerFocus || !layer.contains(event.target) || !event.target.matches('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])')) return;
      const bounds = event.target.getBoundingClientRect();
      if (bounds.top < header.getBoundingClientRect().height || bounds.bottom > innerHeight) reveal(event.target);
    }, {signal:events.signal});
    const fragment = () => {
      let target;
      try {target = document.getElementById(decodeURIComponent(location.hash.slice(1)));} catch {return;}
      if (target) reveal(target, true);
    };
    window.addEventListener('hashchange', fragment, {signal:events.signal});
    document.fonts.ready.then(() => {if (!events.signal.aborted) fragment();});
  } catch (error) {
    restore();
    console.warn('Skill page motion unavailable; native scrolling restored.', error);
  }
}

mount();
preference.addEventListener('change', () => {teardown?.();mount();});
