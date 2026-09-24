import './skill-scroll.mjs';

const demo=document.querySelector('[data-skill-demo]'),play=document.querySelector('#skill-play'),status=document.querySelector('#skill-status');
const reduce=matchMedia('(prefers-reduced-motion:reduce)');let step=0,playing=false,timer,visible=true;
const descriptions=['Goal: a homepage that works in Firefox and Chromium.\nCheck: navigation fits at 390px.\nPhase: executing.\nWorker: fresh executor A.','Audit: navigation extends beyond the viewport.\nPhase: needs-rework.\nRemaining: repair wrapping, repeat browser checks.\nContract: unchanged.','Repair: navigation wraps within 390px.\nEvidence: fresh browser captures inspected.\nPhase: accepted.\nNext: a fresh worker continues from saved state.'];
function render(){if(demo.dataset.skillDemo==='horizon'){document.querySelectorAll('.round-numbers div').forEach((d,i)=>d.classList.toggle('active',i===step));document.querySelector('#saved-title').textContent=['A finish line that stays put','The failed check stays visible','Verified progress, ready to resume'][step];document.querySelector('#saved-description').innerText=descriptions[step];document.querySelector('#worker-title').innerHTML=['One bounded<br>piece of work<small>Fresh executor A builds against the saved contract.</small>','Audit → repair<small>A separate auditor identifies the gap. A fresh executor repairs it.</small>','Fresh worker B<br>continues here<small>Reads saved evidence, remaining work, and the unchanged goal.</small>'][step];status.textContent=['Round 1: build a candidate, then hand it to an independent auditor.','Round 2: failed audit. Repair navigation and re-run the original check.','Round 3: repair accepted, evidence saved. A fresh worker continues. Human approval precedes release.'][step];}else{renderArena();status.textContent=['Three completed candidates. A blind judge and the manager check them against the same criteria.','Select B: the clearest hierarchy and mobile layout. Record the reason for the choice.','Combined result: B’s hierarchy keeps Create a project visible. A explains the product; C shows the first draft. Now verify this result against the same rubric.'][step];}}

function renderArena(){
 const candidates=demo.querySelector('.arena-candidates'),assembly=demo.querySelector('.arena-assembly');
 candidates.dataset.phase=step;candidates.hidden=step===2;assembly.hidden=step!==2;demo.dataset.phase=step;
 demo.querySelectorAll('.contribution-flight').forEach(e=>e.remove());
 if(step!==2||reduce.matches)return;
 // Each source label travels to the part it contributes, while the actual part appears.
 ['B','A','C'].forEach((key,index)=>{
   const source=assembly.querySelector('[data-source="'+key+'"]'),destination=assembly.querySelector('[data-destination="'+key+'"]');
   const from=source.getBoundingClientRect(),to=destination.getBoundingClientRect(),bounds=demo.getBoundingClientRect();
   const flight=document.createElement('span');flight.className='contribution-flight';flight.textContent=key;flight.setAttribute('aria-hidden','true');
   flight.style.left=(from.left-bounds.left+10)+'px';flight.style.top=(from.top-bounds.top+10)+'px';demo.append(flight);
   const animation=flight.animate([{transform:'translate(0,0)',opacity:1},{transform:'translate('+(to.left-from.left)+'px,'+(to.top-from.top)+'px)',opacity:1},{transform:'translate('+(to.left-from.left)+'px,'+(to.top-from.top)+'px) scale(.6)',opacity:0}],{duration:750,delay:index*240,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
   animation.onfinish=()=>flight.remove();
 });
}

function stop(){playing=false;clearTimeout(timer);play.textContent='Replay example ▷';}
play.addEventListener('click',()=>{if(playing){stop();return;}playing=true;step=0;render();play.textContent='Pause example Ⅱ';const tick=()=>{if(!playing)return;if(!document.hidden&&visible){step++;if(step>2){stop();return;}render();}timer=setTimeout(tick,3500);};timer=setTimeout(tick,3500);});
new IntersectionObserver(e=>{visible=e[0].isIntersecting;}).observe(demo);reduce.addEventListener('change',()=>{if(reduce.matches)stop();});
document.querySelector('.copy-invocation').addEventListener('click',async()=>{const text=document.querySelector('#invocation-text').textContent;try{await navigator.clipboard.writeText(text);document.querySelector('#copy-status').textContent='Copied';}catch{const range=document.createRange();range.selectNodeContents(document.querySelector('#invocation-text'));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.querySelector('#copy-status').textContent='Text selected. Press Ctrl+C or Command+C to copy.';}});
