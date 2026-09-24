// Homepage motion boot. Reduced motion keeps native scroll and the static sections.
import {initializeMotion} from './effects.mjs';
initializeMotion(matchMedia('(prefers-reduced-motion: reduce)'));
