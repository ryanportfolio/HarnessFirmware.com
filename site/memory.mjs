import {mountMemoryScroll} from './memory-scroll.mjs';
const stages=[["Find the cause","Find the cause. Verify the fix."],["Save with evidence","Save lasting lessons with permission and evidence."],["Reuse in context","Read the relevant lesson before starting the next task."],["Amend what changed","Update the lesson when the code or evidence changes."]];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
// Routing: a task tab marks the topic files its route reads. The file tree, its count and the
// route line are static markup for the default task (Fix a bug); CSS animates the row states.
const routes={bug:['architecture','pitfalls'],feature:['architecture','commands','tech-stack'],deploy:['deployment','commands','secrets']};
const taskButtons=$$('[data-task]'),topicRows=$$('.tree-sub [data-file]'),routeCount=$('.mp-count b'),routeNote=$('.route-note');
taskButtons.forEach(b=>b.addEventListener('click',()=>{
  taskButtons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  const set=routes[b.dataset.task];
  topicRows.forEach(r=>r.classList.toggle('is-read',set.includes(r.dataset.file)));
  routeCount.textContent=set.length;
  routeNote.textContent=b.textContent.trim()+' → '+set.map(f=>f+'.md').join(' + ');
}));
let restoringFocus=false;
function restoreFocus(el){if(!el)return;restoringFocus=true;el.focus({preventScroll:true});restoringFocus=false;}
// Lesson lifecycle. A clock, not the scroll position, steps the stages while the pinned scene is
// in view, so scroll speed cannot skip one. Until stage 04 has had its dwell, wheel, arrow,
// PageDown, Space and touch scrolling stop at the end of the pinned travel. The scrollbar, End,
// anchor links, find in page and focus moves are never held. Picking a stage stops autoplay for
// the rest of the page view. Reduced motion has no clock and no hold: the stages are picked.
const lp=$('.life-detail'),stageButtons=$$('[data-stage]'),life=$('.lifecycle'),lifeSticky=$('.life-sticky');
const lifeCaption=$('.life-caption'),lifeProgress=$('.progress'),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
// 4 s a stage: the title and line are about 10 new words (2.5 s at 240 wpm), plus the 0.7 s panel
// slide and a moment to find the panel again. The shared example stays put for all 16 s.
const DWELL=4000;
let stage=0,autoIndex=0,autoElapsed=0,autoDone=false,pinnedIndex=null,previewIndex=null,lifeTimer;
let scrollSettling=false,scrollSettleTimer,lastSceneTop=null,clockFrame=0,clockLast=0;
const autoplay=()=>!autoDone&&!reduceMotion.matches;
function setFill(){
  const timed=autoplay()&&pinnedIndex===null&&previewIndex===null;
  lifeProgress.style.setProperty('--fill',Math.min(1,(stage+(timed?autoElapsed/DWELL:0))/3).toFixed(4));
}
function renderStage(){
  const n=pinnedIndex??previewIndex??autoIndex;stage=n;
  document.documentElement.style.setProperty('--stage',n);
  lp.querySelector('h3').textContent=stages[n][0];lp.querySelector(':scope > p').textContent=stages[n][1];
  lp.querySelector('.pin-state').textContent=pinnedIndex!==null?'PINNED':previewIndex!==null?'PREVIEW':autoplay()?'AUTOPLAY':'STAGE 0'+(n+1)+' OF 04';
  lifeCaption.textContent=autoplay()?'STAGE 0'+(autoIndex+1)+' OF 04 · PICK A STAGE TO STOP AUTOPLAY':'PICK A STAGE TO READ IT';
  lp.querySelector('.close').hidden=pinnedIndex===null;
  stageButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===n));b.setAttribute('aria-expanded',String(i===n));});
  $$('[data-art]').forEach((a,i)=>a.classList.toggle('selected',i===n));
  $$('.progress i').forEach((p,i)=>p.classList.toggle('active',i===n));
  setFill();panLife();
}
function sceneInView(){
  const r=lifeSticky.getBoundingClientRect(),seen=Math.min(r.bottom,innerHeight)-Math.max(r.top,0);
  return seen>=Math.min(r.height,innerHeight)*.6;
}
const clockRuns=()=>autoplay()&&pinnedIndex===null&&previewIndex===null&&!document.hidden&&sceneInView();
function tickClock(now){
  if(!clockRuns()){clockFrame=0;clockLast=0;setFill();return;}
  if(clockLast)autoElapsed+=Math.min(100,now-clockLast);// a stalled frame never skips a stage
  clockLast=now;
  if(autoElapsed>=DWELL){
    autoElapsed=0;
    if(autoIndex<3)autoIndex++;else{autoDone=true;releaseHold();clockFrame=0;clockLast=0;renderStage();return;}
    renderStage();
  }
  clockFrame=requestAnimationFrame(tickClock);setFill();
}
function kickClock(){if(!clockFrame&&clockRuns())clockFrame=requestAnimationFrame(tickClock);}
// Hold point: the end of the pinned travel, in document coordinates (the smooth-scroll layer or the page).
function holdY(){
  const layer=document.querySelector('[data-scroll-layer]');
  return life.getBoundingClientRect().top-(layer?layer.getBoundingClientRect().top:-scrollY)+life.offsetHeight-lifeSticky.offsetHeight;
}
let lastInput=0,inputSpan=800,touchY=null,lastScrollY=scrollY;
// A preview (pointer or focus on a stage) pauses the clock, so it releases the hold too: otherwise a
// pointer resting on the stage row would hold the page with no clock running to end it.
const hold=new AbortController(),holding=()=>autoplay()&&pinnedIndex===null&&previewIndex===null;
function releaseHold(){hold.abort();}
function heldAt(dy){
  if(dy<=0||!holding())return null;
  const h=holdY(),y=scrollY;
  return y<=h+1&&y+dy>h+1?h:null;
}
const stopAt=h=>{if(scrollY<h)scrollTo({top:h,behavior:'instant'});};
const noteInput=span=>{lastInput=performance.now();inputSpan=span;};
addEventListener('wheel',e=>{
  if(e.ctrlKey||e.defaultPrevented)return;
  const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);
  if(dy>0)noteInput(800);
  const h=heldAt(dy);if(h===null)return;
  e.preventDefault();stopAt(h);
},{passive:false,signal:hold.signal});
const keySteps={ArrowDown:40,PageDown:.875,' ':.875};
addEventListener('keydown',e=>{
  const step=keySteps[e.key];
  if(!step||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||(e.key===' '&&e.shiftKey))return;
  const t=e.target instanceof Element?e.target:document.body;
  if(t.closest('input,textarea,select,[contenteditable]')||(e.key===' '&&t.closest('button,a,summary')))return;
  noteInput(800);
  const h=heldAt(step<1?innerHeight*step:step);if(h===null)return;
  e.preventDefault();stopAt(h);
},{signal:hold.signal});
addEventListener('touchstart',e=>{touchY=e.touches.length===1?e.touches[0].clientY:null;},{passive:true,signal:hold.signal});
addEventListener('touchmove',e=>{
  if(touchY===null||e.touches.length!==1)return;
  const y=e.touches[0].clientY,dy=touchY-y;touchY=y;noteInput(2500);
  if(dy<=0||!holding()||!e.cancelable)return;
  const h=holdY();if(Math.abs(scrollY-h)<=1)e.preventDefault();
},{passive:false,signal:hold.signal});
addEventListener('touchend',()=>{touchY=null;noteInput(2500);},{passive:true,signal:hold.signal});
// Explicit navigation ends the recent-input window at once, so the scroll it starts is never
// mistaken for momentum: End and Home, a press on the scrollbar, a focus move, a link click.
const clearInput=()=>{lastInput=0;};
addEventListener('keydown',e=>{if(e.key==='End'||e.key==='Home')clearInput();},{capture:true,signal:hold.signal});
addEventListener('mousedown',e=>{if(e.clientX>=document.documentElement.clientWidth||e.clientY>=document.documentElement.clientHeight)clearInput();},{capture:true,signal:hold.signal});
addEventListener('focusin',clearInput,{signal:hold.signal});
addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('a[href]'))clearInput();},{capture:true,signal:hold.signal});
// Momentum and queued smooth scrolls can still carry past the hold; pull back only when wheel,
// key or touch input was recent, so scrollbar drags and scripted jumps pass.
addEventListener('scroll',()=>{
  const y=scrollY,prev=lastScrollY;lastScrollY=y;
  if(!holding()||performance.now()-lastInput>inputSpan)return;
  const h=holdY();if(prev<=h+1&&y>h+1)scrollTo({top:h,behavior:'instant'});
},{passive:true,signal:hold.signal});
function previewStage(n){clearTimeout(lifeTimer);if(restoringFocus||pinnedIndex!==null)return;previewIndex=n;renderStage();}
function scheduleLifeRestore(){
  clearTimeout(lifeTimer);lifeTimer=setTimeout(()=>{
    if(pinnedIndex!==null||lp.matches(':hover')||lp.contains(document.activeElement)||stageButtons.some(b=>b===document.activeElement||b.matches(':hover')))return;
    previewIndex=null;renderStage();kickClock();
  },180);
}
function unpinLife(returnFocus=false){
  clearTimeout(lifeTimer);const trigger=stageButtons[pinnedIndex??stage];
  pinnedIndex=null;previewIndex=null;renderStage();kickClock();
  if(returnFocus)restoreFocus(trigger);
}
stageButtons.forEach(b=>{
  b.setAttribute('aria-controls','life-detail');
  // While autoplay runs, the pointer resting on the controls must not take over the stage.
  b.addEventListener('pointerenter',()=>{if(!autoplay()&&!scrollSettling)previewStage(+b.dataset.stage);});b.addEventListener('pointerleave',scheduleLifeRestore);
  b.addEventListener('focus',()=>previewStage(+b.dataset.stage));b.addEventListener('blur',scheduleLifeRestore);
  b.addEventListener('click',()=>{
    clearTimeout(lifeTimer);pinnedIndex=autoIndex=+b.dataset.stage;previewIndex=null;autoElapsed=0;
    if(!autoDone){autoDone=true;releaseHold();}
    renderStage();
  });
});
lp.addEventListener('pointerenter',()=>clearTimeout(lifeTimer));lp.addEventListener('pointerleave',scheduleLifeRestore);
lp.addEventListener('focusin',()=>clearTimeout(lifeTimer));lp.addEventListener('focusout',scheduleLifeRestore);
lp.querySelector('.close').onclick=()=>unpinLife(true);
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(pinnedIndex!==null||previewIndex!==null)unpinLife(true);});
let ticking=false;
function scrollStage(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{
  const top=life.getBoundingClientRect().top;
  if(lastSceneTop!==null&&Math.abs(top-lastSceneTop)>.1){
    scrollSettling=true;clearTimeout(scrollSettleTimer);
    scrollSettleTimer=setTimeout(()=>{scrollSettling=false;},220);
    if(previewIndex!==null){previewIndex=null;renderStage();}
  }
  lastSceneTop=top;kickClock();ticking=false;
});}
addEventListener('scroll',scrollStage,{passive:true});addEventListener('resize',scrollStage);
reduceMotion.addEventListener('change',()=>{renderStage();kickClock();});
document.addEventListener('visibilitychange',kickClock);
function updateMotion(){document.body.classList.toggle('paused',reduceMotion.matches||document.hidden);}
reduceMotion.addEventListener('change',updateMotion);document.addEventListener('visibilitychange',updateMotion);updateMotion();
const io=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('offscreen',!e.isIntersecting)),{threshold:0});$$('.scene').forEach(scene=>io.observe(scene));
const mobile=matchMedia('(max-width:600px)'),lifeArt=$('.life-art');
function panLife(){lifeArt.setAttribute('viewBox',mobile.matches?([30,350,710,1080][stage]+' 270 370 430'):'0 0 1440 900');}
mobile.addEventListener('change',panLife);panLife();renderStage();scrollStage();

mountMemoryScroll(scrollStage);

