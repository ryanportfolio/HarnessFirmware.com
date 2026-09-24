import {mountMemoryScroll} from './memory-scroll.mjs';
const facts={"claude":["CLAUDE.md","Core Claude Code rules, with links to references the task needs."],"agents":["AGENTS.md","Codex rules, with shared references for both agents."],"architecture":["architecture.md","How the project fits together, and why."],"pitfalls":["pitfalls.md","Known failures, their causes, and verified fixes."],"commands":["commands.md","Build and test commands. Check them against the current project."],"deployment":["deployment.md","Release requirements. Deployment still needs authorization."],"tech-stack":["tech-stack.md","Project tools and versions. Current source takes priority."],"secrets":["secrets.md","Secret names and locations only. Never credential values."]},stages=[["Find the cause","Find the cause. Verify the fix."],["Save with evidence","Save lasting lessons with permission and evidence."],["Reuse in context","Read the relevant lesson before starting the next task."],["Amend what changed","Update the lesson when the code or evidence changes."]];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const routes={bug:['architecture','pitfalls'],feature:['architecture','commands','tech-stack'],deploy:['deployment','commands','secrets']};
$$('[data-task]').forEach(b=>b.addEventListener('click',()=>{
  $$('[data-task]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  const set=routes[b.dataset.task];
  $$('[data-file],[data-branch]').forEach(x=>x.classList.toggle('active',set.includes(x.dataset.file||x.dataset.branch)));
  $('.route-note').textContent=b.textContent.trim()+' → '+set.join(' + ');
}));
const panel=$('.route-detail'), routeTriggers=$$('[data-detail]');
let routePin=null, routeCurrent=null, routeTimer, restoringFocus=false;
function restoreFocus(el){if(!el)return;restoringFocus=true;el.focus({preventScroll:true});restoringFocus=false;}
function showRoute(el,pin=false){
  clearTimeout(routeTimer);if(restoringFocus||(routePin&&!pin))return;
  const fact=facts[el.dataset.detail];routeCurrent=el;if(pin)routePin=el;
  panel.querySelector('h3').textContent=fact[0];panel.querySelector('p').textContent=fact[1];panel.hidden=false;
  panel.querySelector('.pin-state').textContent=routePin?'PINNED':'PREVIEW';
  routeTriggers.forEach(x=>x.setAttribute('aria-expanded',String(x===el)));
}
function closeRoute(returnFocus=false){
  clearTimeout(routeTimer);const trigger=routePin||routeCurrent;
  routePin=null;routeCurrent=null;panel.hidden=true;
  routeTriggers.forEach(x=>x.setAttribute('aria-expanded','false'));
  if(returnFocus)restoreFocus(trigger);
}
function scheduleRouteClose(){
  clearTimeout(routeTimer);routeTimer=setTimeout(()=>{
    if(routePin||panel.matches(':hover')||panel.contains(document.activeElement)||document.activeElement===routeCurrent)return;
    closeRoute();
  },180);
}
routeTriggers.forEach(el=>{
  el.setAttribute('aria-controls','route-detail');
  el.addEventListener('pointerenter',()=>showRoute(el));el.addEventListener('pointerleave',scheduleRouteClose);
  el.addEventListener('focus',()=>showRoute(el));el.addEventListener('blur',scheduleRouteClose);
  el.addEventListener('click',()=>showRoute(el,true));
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showRoute(el,true);}});
});
panel.addEventListener('pointerenter',()=>clearTimeout(routeTimer));panel.addEventListener('pointerleave',scheduleRouteClose);
panel.addEventListener('focusin',()=>clearTimeout(routeTimer));panel.addEventListener('focusout',scheduleRouteClose);
panel.querySelector('.close').onclick=()=>closeRoute(true);
const lp=$('.life-detail'),stageButtons=$$('[data-stage]');
let stage=0,scrollIndex=0,pinnedIndex=null,previewIndex=null,lifeTimer;
let scrollCompleted=false,scrollSettling=false,scrollSettleTimer,lastSceneTop=null;
function renderStage(){
  const n=pinnedIndex??previewIndex??scrollIndex;stage=n;
  document.documentElement.style.setProperty('--stage',n);
  lp.querySelector('h3').textContent=stages[n][0];lp.querySelector(':scope > p').textContent=stages[n][1];
  lp.querySelector('.pin-state').textContent=pinnedIndex!==null?'PINNED':previewIndex!==null?'PREVIEW':'SCROLL TO EXPLORE';
  lp.querySelector('.close').hidden=pinnedIndex===null;
  stageButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===n));b.setAttribute('aria-expanded',String(i===n));});
  $$('[data-art]').forEach((a,i)=>a.classList.toggle('selected',i===n));
  $$('.progress i').forEach((p,i)=>p.classList.toggle('active',i===n));
  panLife();
}
function previewStage(n){clearTimeout(lifeTimer);if(restoringFocus||pinnedIndex!==null)return;previewIndex=n;renderStage();}
function scheduleLifeRestore(){
  clearTimeout(lifeTimer);lifeTimer=setTimeout(()=>{
    if(pinnedIndex!==null||lp.matches(':hover')||lp.contains(document.activeElement)||stageButtons.some(b=>b===document.activeElement||b.matches(':hover')))return;
    previewIndex=null;renderStage();
  },180);
}
function unpinLife(returnFocus=false){
  clearTimeout(lifeTimer);const trigger=stageButtons[pinnedIndex??stage];
  pinnedIndex=null;previewIndex=null;lp.querySelector('details').open=false;renderStage();
  if(returnFocus)restoreFocus(trigger);
}
stageButtons.forEach(b=>{
  b.setAttribute('aria-controls','life-detail');
  b.addEventListener('pointerenter',()=>{if(scrollCompleted&&!scrollSettling)previewStage(+b.dataset.stage);});b.addEventListener('pointerleave',scheduleLifeRestore);
  b.addEventListener('focus',()=>previewStage(+b.dataset.stage));b.addEventListener('blur',scheduleLifeRestore);
  b.addEventListener('click',()=>{clearTimeout(lifeTimer);pinnedIndex=+b.dataset.stage;previewIndex=null;renderStage();});
});
lp.addEventListener('pointerenter',()=>clearTimeout(lifeTimer));lp.addEventListener('pointerleave',scheduleLifeRestore);
lp.addEventListener('focusin',()=>clearTimeout(lifeTimer));lp.addEventListener('focusout',scheduleLifeRestore);
lp.querySelector('.close').onclick=()=>unpinLife(true);
lp.querySelector('details').addEventListener('toggle',()=>{if(lp.querySelector('details').open){pinnedIndex=stage;previewIndex=null;renderStage();}});
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(!panel.hidden){closeRoute(true);return;}if(pinnedIndex!==null||previewIndex!==null)unpinLife(true);});
let ticking=false;
function scrollStage(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{
  const r=$('.lifecycle').getBoundingClientRect(),travel=$('.lifecycle').offsetHeight-innerHeight;
  const progress=-r.top/Math.max(1,travel);
  if(progress>=.99)scrollCompleted=true;
  if(lastSceneTop!==null&&Math.abs(r.top-lastSceneTop)>.1){
    scrollSettling=true;clearTimeout(scrollSettleTimer);
    scrollSettleTimer=setTimeout(()=>{scrollSettling=false;},220);
    if(previewIndex!==null){previewIndex=null;renderStage();}
  }
  lastSceneTop=r.top;
  const n=Math.min(3,Math.max(0,Math.floor(progress*4)));
  if(n!==scrollIndex){scrollIndex=n;if(pinnedIndex===null&&previewIndex===null)renderStage();}ticking=false;
});}
addEventListener('scroll',scrollStage,{passive:true});addEventListener('resize',scrollStage);
const mq=matchMedia('(prefers-reduced-motion: reduce)');
function updateMotion(){document.body.classList.toggle('paused',mq.matches||document.hidden);}
mq.addEventListener('change',updateMotion);document.addEventListener('visibilitychange',updateMotion);updateMotion();
const io=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('offscreen',!e.isIntersecting)),{threshold:0});$$('.scene').forEach(scene=>io.observe(scene));
const mobile=matchMedia('(max-width:600px)'),routeArt=$('.routing-art'),lifeArt=$('.life-art');
const originals=$$('.root,.file').map(el=>[el,el.getAttribute('transform')]);
function panLife(){lifeArt.setAttribute('viewBox',mobile.matches?([30,350,710,1080][stage]+' 270 370 430'):'0 0 1440 900');}
function layout(){
  if(mobile.matches){routeArt.setAttribute('viewBox','0 0 390 640');$$('.root').forEach((el,i)=>el.setAttribute('transform','translate('+(i?195:10)+' 0) scale(.45)'));$$('.file').forEach((el,i)=>el.setAttribute('transform','translate('+(i%2?205:15)+' '+(200+Math.floor(i/2)*132)+') scale(.68)'));$('.junction').setAttribute('transform','translate(-160 -89) scale(.5)');$('.wires').style.display='none';}
  else{routeArt.setAttribute('viewBox','0 0 1440 900');originals.forEach(([el,t])=>el.setAttribute('transform',t));$('.junction').removeAttribute('transform');$('.wires').style.display='';}
  panLife();
}
mobile.addEventListener('change',layout);layout();renderStage();scrollStage();

mountMemoryScroll(scrollStage);

