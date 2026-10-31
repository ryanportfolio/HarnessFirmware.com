// Homepage motion boot. Reduced motion keeps the static sections; the spring scroll runs either way.
import {initializeMotion} from './effects.mjs';
initializeMotion(matchMedia('(prefers-reduced-motion: reduce)'));
