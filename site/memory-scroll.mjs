import {mountSmoothScroll} from './smooth-scroll.mjs';

// Share the homepage spring; translate the sticky scene with the rendered scroll.
// Reduced motion keeps the page native and CSS sticky pins the scene.
export function mountMemoryScroll(onFrame) {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let teardown;
  function mount() {
    if (preference.matches || !mountSmoothScroll) return;
    const main = document.querySelector('main');
    const header = document.querySelector('body > header');
    const footer = document.querySelector('body > footer');
    const lifecycle = document.querySelector('.lifecycle');
    const sticky = document.querySelector('.life-sticky');
    const layer = document.createElement('div');
    const spacer = document.createElement('div');
    layer.dataset.scrollLayer = '';
    spacer.dataset.scrollSpacer = '';
    spacer.setAttribute('aria-hidden', 'true');
    header.before(layer);
    layer.append(main, footer);
    layer.after(spacer);
    const events = new AbortController();
    let controller, unsubscribe;
    function restore() {
      events.abort(); unsubscribe?.(); controller?.destroy();
      sticky.style.transform = ''; sticky.style.position = '';
      layer.before(main, footer); layer.remove(); spacer.remove();
      delete window.harnessScroll; delete document.documentElement.dataset.smoothScroll;
      teardown = undefined; onFrame();
    }
    teardown = restore;
    try {
      document.documentElement.dataset.smoothScroll = '';
      controller = mountSmoothScroll(layer, spacer);
      layer.style.width = '100%';
      window.harnessScroll = controller;
      sticky.style.position = 'relative';
      const update = () => {
        const start = lifecycle.getBoundingClientRect().top - layer.getBoundingClientRect().top;
        const travel = Math.max(0, lifecycle.offsetHeight - sticky.offsetHeight);
        sticky.style.transform = `translateY(${Math.max(0, Math.min(travel, -controller.y.get() - start))}px)`;
        onFrame();
      };
      unsubscribe = controller.y.on('change', update);
      const observer = new ResizeObserver(update);
      observer.observe(lifecycle); observer.observe(sticky);
      events.signal.addEventListener('abort', () => observer.disconnect());
      const reveal = (target, immediate = false) => {
        const top = Math.max(0, target.getBoundingClientRect().top - layer.getBoundingClientRect().top - 90);
        window.scrollTo({top, behavior: immediate ? 'instant' : 'smooth'});
        // An incoming #fragment lands in place instead of gliding in from the top.
        if (immediate) {controller.scrollY.set(scrollY); controller.y.jump(-scrollY);}
      };
      document.addEventListener('click', event => {
        const link = event.target.closest('a[href]');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.origin !== location.origin || link.pathname !== location.pathname || !link.hash) return;
        let target; try {target = document.getElementById(decodeURIComponent(link.hash.slice(1)));} catch {return;}
        if (!target) return;
        event.preventDefault(); history.pushState(null, '', link.hash);
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({preventScroll:true}); reveal(target);
      }, {signal:events.signal});
      let pointer = false;
      document.addEventListener('pointerdown', () => {pointer = true;}, {capture:true, signal:events.signal});
      document.addEventListener('keydown', () => {pointer = false;}, {capture:true, signal:events.signal});
      document.addEventListener('focusin', event => {
        if (pointer || !layer.contains(event.target) || !event.target.matches('a[href],button,summary,[tabindex]:not([tabindex="-1"])')) return;
        const bounds = event.target.getBoundingClientRect();
        if (bounds.top < 0 || bounds.bottom > innerHeight) reveal(event.target);
      }, {signal:events.signal});
      const fragment = () => {
        let target; try {target = document.getElementById(decodeURIComponent(location.hash.slice(1)));} catch {return;}
        if (target) reveal(target, true);
      };
      window.addEventListener('hashchange', fragment, {signal:events.signal});
      document.fonts.ready.then(() => {if (!events.signal.aborted) {fragment(); update();}});
      update();
    } catch (error) {
      restore(); console.warn('Memory motion unavailable; native scrolling restored.', error);
    }
  }
  mount();
  preference.addEventListener('change', () => {teardown?.(); mount();});
}
