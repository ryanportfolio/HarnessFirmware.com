import {mountSmoothScroll} from './smooth-scroll.mjs';
import {mountCardArt} from './card-art.mjs';
import {mountCardRow} from './card-row.mjs';
import {mountStatementBlock} from './statement-block.mjs';
import {mountConverge} from './converge.mjs';
import {bindScramble} from './text-effects.mjs';

// Homepage motion boot: film grain, the hooks for the scroll-driven sections (.statement-block,
// #converge-block, .card-row), and anchor/focus handling that keeps targets clear of the fixed header.
// Reduced motion keeps native scroll; otherwise smooth-scroll.mjs drives the layer.
export function initializeMotion(preference) {
  const fragments=restoreIncomingFragments();
  // Reduced motion keeps the static sections; the command cards still get their art as a still frame.
  if (preference.matches) {mountCardArt(document.querySelector('main'));fragments.layout();return;}
  const layer=document.querySelector('[data-scroll-layer]');
  const spacer=document.querySelector('[data-scroll-spacer]');
  const events=new AbortController();
  const disposers=[];

  // Full-viewport grain at .05, faded in after the first frame.
  const grain=document.createElement('div');
  grain.className='grain-overlay';
  grain.setAttribute('aria-hidden','true');
  document.body.append(grain);
  requestAnimationFrame(()=>{grain.style.opacity='.05';});
  disposers.push(()=>grain.remove());

  if (mountSmoothScroll) {
    try {
      const controller=mountSmoothScroll(layer,spacer);
      document.documentElement.dataset.smoothScroll='';
      window.harnessScroll=controller;
      disposers.push(()=>{
        controller.destroy();
        layer.removeAttribute('style');spacer.removeAttribute('style');
        delete document.documentElement.dataset.smoothScroll;delete window.harnessScroll;
      });
    } catch(error) {
      console.warn('Smooth scroll unavailable; native scrolling kept.',error);
    }
  }

  // Scroll-driven sections render into these roots; each helper attaches once its DOM exists.
  for (const root of document.querySelectorAll('.statement-block')) disposers.push(mountStatementBlock(root));
  disposers.push(mountConverge(document.querySelector('#converge-block')));
  disposers.push(mountCardArt(document.querySelector('main')));
  for (const root of document.querySelectorAll('.card-row')) disposers.push(mountCardRow(root));
  // Calls to action outside the convergence scene scramble their label on hover and focus too.
  for (const cta of document.querySelectorAll('.cv-cta:not(#converge-block .cv-cta)')) disposers.push(bindScramble(cta, cta.querySelector('.cv-cta-label')));

  window.addEventListener('harness:layout-change',()=>requestAnimationFrame(()=>fragments.layout()),{signal:events.signal});
  window.dispatchEvent(new Event('harness:motion-ready'));
  fragments.layout();

  const anchorTop=element=>element.getBoundingClientRect().top-layer.getBoundingClientRect().top-anchorGap(element);
  const pagePath=path=>path.replace(/index\.html$/, '') || '/';
  document.addEventListener('click',event=>{
    const link=event.target.closest('a');
    if(!link || link.origin!==location.origin || pagePath(link.pathname)!==pagePath(location.pathname) || !link.hash && link.getAttribute('href')!=='#')return;
    const target=link.hash?document.getElementById(decodeURIComponent(link.hash.slice(1))):document.querySelector('#main');
    if(!target)return;
    event.preventDefault();
    fragments.cancel();
    history.pushState(null,'',link.hash||location.pathname);
    window.scrollTo({top:Math.max(0,anchorTop(target)),behavior:'smooth'});
    if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  },{signal:events.signal});
  // Pointer focus on empty space may land on the main/section anchor container.
  // Only reveal keyboard-focused controls; anchor clicks already scroll explicitly.
  let pointerFocus=false;
  document.addEventListener('pointerdown',()=>{pointerFocus=true;},{capture:true,signal:events.signal});
  document.addEventListener('keydown',()=>{pointerFocus=false;},{capture:true,signal:events.signal});
  document.addEventListener('focusin',event=>{
    if(pointerFocus || !layer.contains(event.target) || !event.target.matches('a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])'))return;
    const rect=event.target.getBoundingClientRect();
    if(rect.top<105 || rect.bottom>innerHeight) window.scrollTo({top:Math.max(0,anchorTop(event.target)),behavior:'smooth'});
  },{signal:events.signal});
  preference.addEventListener('change',()=>{
    // Re-enter through the readable native document when the OS preference changes.
    events.abort();
    for(const dispose of disposers.reverse())try{dispose();}catch{}
    location.reload();
  },{once:true});
}

// Space kept above an anchor target: the fixed header's 110px, unless the target sets its own
// scroll-margin-top (a pinned scene can move its landing point into the scene that way).
const anchorGap=element=>parseFloat(getComputedStyle(element).scrollMarginTop)||110;

// Retry only a pending incoming fragment while async fonts and sections settle.
// Wheel, touch, pointer, or navigation keys immediately hand position back to the visitor.
function restoreIncomingFragments(){
 const layer=document.querySelector('[data-scroll-layer]');
 let pending='',deadline=0,lastTop=NaN,queued=0,expiry;
 const target=()=>{try{return pending?document.getElementById(decodeURIComponent(pending.slice(1))):null;}catch{return null;}};
 const cancel=()=>{pending='';clearTimeout(expiry);observer.disconnect();};
 const layout=()=>{
   if(!pending||performance.now()>deadline)return;
   if(queued)return;
   queued=requestAnimationFrame(()=>{
     queued=0;if(!pending||performance.now()>deadline)return;
     const element=target();if(!element)return;
     const controller=window.harnessScroll;
     const top=Math.max(0,element.getBoundingClientRect().top-(controller?layer.getBoundingClientRect().top:-scrollY)-anchorGap(element));
     if(Math.abs(top-lastTop)>2||Math.abs(scrollY-top)>2){
       lastTop=top;window.scrollTo({top,behavior:'instant'});
       if(controller){controller.scrollY.set(top);controller.targetY.set(-top);controller.y.jump(-top);layer.style.transform='translateY('+(-top)+'px) translateZ(0)';}
     }
   });
 };
 const observer=new ResizeObserver(layout);
 const begin=()=>{pending=location.hash;if(!pending){cancel();return;}lastTop=NaN;deadline=performance.now()+6500;clearTimeout(expiry);observer.observe(layer);expiry=setTimeout(cancel,6500);layout();};
 for(const type of ['wheel','touchstart','pointerdown'])window.addEventListener(type,cancel,{passive:true});
 window.addEventListener('keydown',event=>{if(['Tab','ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))cancel();});
 window.addEventListener('hashchange',begin);window.addEventListener('popstate',begin);
 window.addEventListener('load',layout,{once:true});document.fonts.ready.then(layout);
 begin();return {layout,cancel};
}
