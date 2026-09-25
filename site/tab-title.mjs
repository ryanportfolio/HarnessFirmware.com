/* Browser-tab title: after the visitor's first scroll, click, tap or key press, the tab cycles
   through the hero's pillar words ("Agent work, audited"), rests on the page's own <title>, and
   loops. It waits for a real input event so crawlers, which never interact, index the static
   <title>. Reduced motion keeps the static title. */
import {DEFAULT_PILLARS} from './hero-pillars.mjs';

const STEP = 2500; // ms each pillar title shows
const REST = 5000; // ms the page title shows between cycles
const INPUTS = ['wheel', 'touchmove', 'pointerdown', 'keydown'];

if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const titles = [...DEFAULT_PILLARS.map((p) => `Agent work, ${p.word}`), document.title];
  let i = 0;
  const show = () => {
    document.title = titles[i];
    setTimeout(show, i === titles.length - 1 ? REST : STEP);
    i = (i + 1) % titles.length;
  };
  const start = () => {
    for (const type of INPUTS) removeEventListener(type, start, true);
    setTimeout(show, STEP);
  };
  for (const type of INPUTS) addEventListener(type, start, {capture: true, passive: true});
}
