// The headline (hero-pillars.mjs) is loaded on its own at the end, so the diagram runs even if it fails.
const root=document.querySelector('.living-system');
const $=s=>root.querySelector(s), reduced=matchMedia('(prefers-reduced-motion: reduce)');
// The hero drawings live in their own files so each device downloads only the one it shows
// (living-system.css swaps them at 700px; index.html preloads the matching one). Parsed as HTML,
// as inline markup is, and placed where it sat inline: desktop first, phone before the canvas.
// Each is requested once, however often the breakpoint flips before it lands; a failed request
// is forgotten, so the next crossing into its breakpoint asks again.
const narrow=matchMedia('(max-width:700px)'),asked={};
function drawing(phone){return asked[phone]??=fetch(phone?'/hero-mobile.svg':'/hero-desktop.svg').then(async r=>{if(!r.ok)throw new Error(`hero drawing: ${r.status}`);
 const t=document.createElement('template');t.innerHTML=await r.text();const svg=t.content.firstElementChild;
 phone?$('.system-particles').before(svg):$('.system-field').prepend(svg);inkIn(svg);return svg;}).catch(e=>{delete asked[phone];throw e;});}
// The drawing lands after first paint, so it inks in the way the headline's glyphs do (hero-pillars.mjs:
// opacity and blur on its `ink` curve) rather than popping in. It does not rise: the node labels sit on
// it. It holds paused at a trace of ink (Chrome skips rastering a fully transparent layer) and starts
// three frames later, so the first blurred raster, one 100 ms+ frame, lands before any ink shows
// (.claude/reference/pitfalls.md, animated CSS blur).
function inkIn(svg){if(reduced.matches)return;const a=svg.animate([{opacity:.003,filter:'blur(6px)'},{opacity:1,filter:'blur(0px)'}],{duration:900,easing:'cubic-bezier(0.4, 0, 0.2, 1)'});a.pause();
 let n=3;const go=()=>--n?requestAnimationFrame(go):a.play();requestAnimationFrame(go);}
const phases=[
 ['recall',3200,'01 / Recall','Start with project memory','Decisions + known pitfalls','recall'],
 ['plan',3200,'02 / Plan','Define a result you can check','A goal + acceptance checks','plan'],
 ['execute',3600,'03 / Execute','Make the work inspectable','Candidate v01 · unchecked','execute'],
 ['review',4200,'04 / Audit','Fresh reviewers inspect','Independent signals converge','audit'],
 ['finding',3600,'04 / Finding','A check finds a gap','Return to Execute →','audit'],
 ['repair',3600,'03 / Execute','Repair the specific failure','Original checks stay in place','execute'],
 ['reaudit',4200,'04 / Fresh audit','Check the repair again','New evidence · same conditions','audit'],
 ['pass',3000,'04 / Audit passed','The evidence holds up','This example passes its checks','audit'],
 ['integrate',3500,'05 / Integrate','Bring checked work together','Ready for a human decision','integrate'],
 ['human',3600,'06 / Human approval','Release stays your decision','Checks do not authorize release',null],
 ['memory',4200,'↳ / Project memory','Turn a finding into a check','Example: test navigation at 390px','memory']
];
const info={recall:['01 / Recall','Begin with what the project knows','Read relevant decisions and pitfalls, with evidence pointers. Save durable facts only when authorized.','/skills#skill-recall','Find the Recall skill ↗'],plan:['02 / Plan','Give the work a finish line','Define the goal, a bounded change, and the conditions that would show it is finished.','#planned','See the planning skills ↗'],execute:['03 / Execute','Make a candidate','Build within the agreed scope. A candidate stays unchecked until its evidence has been inspected.','#long-horizon','See how a round is built and checked ↗'],audit:['04 / Audit','A fresh set of eyes','Independent review checks the work against the goal. Confirmed findings return to Execute, then face a fresh audit.','#audit-details','How auditing works ↗'],integrate:['05 / Integrate','Keep the checked result','Bring the work and evidence together. Human authorization controls release; approved lessons return to project memory.','#audit-details','See where approval belongs ↗']};
info.memory=['Example / Retained lesson','One finding, a better next task','Finding: navigation overflowed in Firefox at 390px. After repair and recheck, an approved project check carries forward: verify every navigation link stays visible at that width.','#remembered','See where lessons are kept ↗'];
let phase=0,driven=!reduced.matches,elapsed=0,animationTime=0,last=0,raf=0,visible=true,paused=reduced.matches,detailOpen=false,detailOwner=null,restoringFocus=false,detailMode='hover',leaveTimer,queued=null;
function render(){let p=phases[phase];root.dataset.phase=p[0];root.dataset.checked=String(phase>=7);$('#system-step').textContent=driven?p[2].replace(/^[^/]*\/\s*/,''):p[2];$('#system-status').textContent=p[3];$('#system-note').textContent=p[4];root.querySelectorAll('[data-node]').forEach(n=>n.classList.toggle('is-active',n.dataset.node===p[5]));$('#artifact-mark').textContent=phase>=7?'✓':'·';$('#artifact-label').innerHTML=phase>=8?'Checked work<br>human review next':phase>=7?'Audit passed<br>ready to integrate':'Candidate<br>awaiting checks';}
const replay=$('#system-replay');replay.hidden=false;

// With the headline in motion, Replay hands over to its first pillar, which drives the stage
// like any change; otherwise the loop's own story starts over from Recall.
replay.addEventListener('click',()=>{last=0;paused=reduced.matches;queued=null;elapsed=0;
 if(headline&&!paused){driven=true;headline.replay();}else{phase=0;driven=false;headline?.replay();render();}
 draw(animationTime);schedule();});
function close(){clearTimeout(leaveTimer);detailOpen=false;$('#system-detail').hidden=true;root.querySelectorAll('[data-node]').forEach(n=>n.setAttribute('aria-expanded','false'));if(queued){const q=queued;queued=null;drive(q.stage);}schedule();}
function open(n,mode='keyboard'){clearTimeout(leaveTimer);detailMode=mode;const d=info[n.dataset.node],panel=$('#system-detail');detailOwner=n;
 // Follow the owning stage in native tab order. The panel remains absolutely
 // positioned against the system field, so its visual placement does not move.
 if(n.nextElementSibling!==panel)n.after(panel);
 detailOpen=true;panel.hidden=false;$('#detail-kicker').textContent=d[0];$('#detail-title').textContent=d[1];$('#detail-copy').textContent=d[2];$('#detail-link').href=d[3];$('#detail-link').textContent=d[4];root.querySelectorAll('[data-node]').forEach(x=>x.setAttribute('aria-expanded',String(x===n)));schedule();}
function dismiss(){close();restoringFocus=true;detailOwner?.focus({preventScroll:true});restoringFocus=false;}
function leaveDetail(){clearTimeout(leaveTimer);if(detailMode==='hover')leaveTimer=setTimeout(()=>{if(!detailOwner?.matches(':hover')&&!$('#system-detail').matches(':hover'))close();},220);}
root.querySelectorAll('[data-node]').forEach(n=>{n.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&innerWidth>700)open(n,'hover');});n.addEventListener('pointerleave',leaveDetail);n.addEventListener('focus',()=>{if(!restoringFocus&&n.matches(':focus-visible'))open(n,'keyboard');});n.addEventListener('click',e=>open(n,e.detail===0?'keyboard':e.pointerType==='touch'||innerWidth<=700?'tap':'hover'));});
$('#system-detail').addEventListener('pointerenter',()=>clearTimeout(leaveTimer));
$('#system-detail').addEventListener('pointerleave',leaveDetail);
$('#system-detail').addEventListener('focusin',e=>{if(e.target.matches(':focus-visible')){detailMode='keyboard';clearTimeout(leaveTimer);}});
$('.detail-close').addEventListener('click',dismiss);
root.addEventListener('keydown',e=>{if(e.key==='Escape'&&detailOpen){e.preventDefault();dismiss();}});
root.addEventListener('pointerdown',e=>{if(!e.target.closest('[data-node],.system-detail'))close();});
// activeElement may still be BODY between focusout and the next focus event.
// Keep pointer transfers to the panel alive until the link receives its click.
root.addEventListener('focusout',event=>{if(!event.relatedTarget?.closest('[data-node],.system-detail'))close();});
const canvas=$('.system-particles'),ctx=canvas.getContext('2d');
// Read off the desktop drawing, refilled in place when it arrives after a breakpoint crossing.
const paths=[],strands=[[],[],[],[]];
function readTracks(){paths.splice(0,paths.length,...[...root.querySelectorAll('[data-track]')].map(p=>{const length=p.getTotalLength();return {kind:p.dataset.track,points:Array.from({length:241},(_,i)=>{const q=p.getPointAtLength(length*i/240);return [q.x,q.y];})};}));
 // The goal's strands, one per feed: the three feed tracks, then the review tracks (the first
 // one runs through the review feed's dot).
 let f=0;for(const p of paths){if(p.kind==='feed')p.slot=f++;else if(p.kind==='review')p.slot=3;}
 strands.forEach((s,k)=>s.splice(0,s.length,...paths.filter(p=>p.slot===k)));}
readTracks();
let width=1440,height=780;
function resize(){const b=canvas.getBoundingClientRect();width=b.width;height=b.height;const d=Math.min(devicePixelRatio,1.5);canvas.width=width*d;canvas.height=height*d;ctx?.setTransform(d*width/1440,0,0,d*height/780,0,0);}
new ResizeObserver(resize).observe($('.system-field'));
const motes=Array.from({length:1800},(_,i)=>({a:i*2.39996,r:220+Math.sin(i*8.71)*44,s:.35+(i%5)*.18}));
function draw(time){if(!ctx||innerWidth<=700||reduced.matches)return;ctx.clearRect(0,0,1440,780);ctx.fillStyle='#58e07b';
 for(let i=0;i<motes.length;i++){const p=motes[i],a=p.a+time*.00006,r=p.r+Math.sin(a*4+time*.0003)*9;ctx.globalAlpha=.17+(i%6)*.1;ctx.fillRect(820+Math.sin(a)*r,355-Math.cos(a)*r*1.03,p.s,p.s);}
 ease(time);
 for(const p of paths){const name=phases[phase][0];const active=p.kind==='feed'||p.kind===name||p.kind==='review'&&['review','reaudit'].includes(name)||p.kind==='execute'&&name==='reaudit'||p.kind==='audit'&&name==='pass'||p.kind==='output'&&name==='integrate'||p.kind==='gate'&&name==='human';if(!active)continue;const amber=p.kind==='repair';ctx.fillStyle=amber?'#ffd299':'#58e07b';const a=.8*(p.slot==null?1:flow[p.slot].act);for(let i=0;i<5;i++){const t=((time*.0001+i*.2)%1)*240,q=p.points[Math.floor(t)];ctx.globalAlpha=a;ctx.beginPath();ctx.arc(q[0],q[1],i===0?2.4:1.2,0,Math.PI*2);ctx.fill();}}
 drawFlow();
 ctx.globalAlpha=1;
}
// ---- light from the named skills into the lit stage (desktop canvas) ----------------------
// While a pillar shows, each strand that carries one of its skills brightens toward the loop,
// and a trail of light runs from the feed's dot along the strand and round the loop to the
// stage the pillar lights. Their timing is read off animations that run with the headline's
// change (see branchTo), so they pause, resume and land with it. Idle strands carry fainter
// traffic, eased on the loop's own clock.
const flow=[0,1,2,3].map(()=>({lit:false,rise:null,fall:null,route:null,node:null,i0:0,act:1,actTo:1}));
let flowAt=0;
const LOOP={x:820,y:355,r:230};
const aim={recall:{a:-90},plan:{a:-18},review:{a:126},integrate:{a:198},memory:{a:90,to:[820,632]},human:{a:8,to:[1168,386]}};
const live=a=>a&&a.playState!=='idle';
const prog=a=>a.effect.getComputedTiming().progress??(a.playState==='finished'?1:0);
function ease(time){const dt=Math.max(0,Math.min(80,time-flowAt));flowAt=time;
 for(const f of flow)f.act+=Math.sign(f.actTo-f.act)*Math.min(Math.abs(f.actTo-f.act),dt/420);}
// how brightly strand k glows: fading out with the old pillar, in with the light of the new one
function glowOf(f){let v=0;if(live(f.fall))v=1-prog(f.fall);if(live(f.rise))v=Math.max(v,Math.min(1,prog(f.rise)*1.6));else if(f.lit&&!live(f.fall))v=1;return v;}
// the point of strand k nearest its feed's dot, in viewBox units; null while the desktop drawing
// is still on its way, and drawFlow finds it once the drawing is in
function knot(k){const s=strands[k][0],d=feeds[k].querySelector('i').getBoundingClientRect(),b=canvas.getBoundingClientRect();if(!b.width)return 0;if(!s)return null;
 const x=(d.left+d.width/2-b.left)/b.width*1440,y=(d.top+d.height/2-b.top)/b.height*780;let best=0,bd=1e9;
 s.points.forEach((q,i)=>{const e=(q[0]-x)**2+(q[1]-y)**2;if(e<bd){bd=e;best=i;}});return best;}
// the strand from its dot, then a curve that carries on in the strand's direction onto the loop,
// then round the loop to the stage (and on to it, for the stages that sit off the loop)
function route(k,node){const pts=strands[k][0].points.slice(knot(k)),[ex,ey]=pts.at(-1),[px,py]=pts.at(-3),T=aim[node];
 const a0=Math.atan2(ey-LOOP.y,ex-LOOP.x);let d=T?T.a*Math.PI/180-a0:0;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
 if(T&&Math.abs(d)>.05){
  const a1=a0+Math.sign(d)*Math.min(Math.abs(d),.45),on=a=>[LOOP.x+Math.cos(a)*LOOP.r,LOOP.y+Math.sin(a)*LOOP.r],[qx,qy]=on(a1);
  const l=Math.hypot(ex-px,ey-py)||1,cx=ex+(ex-px)/l*45,cy=ey+(ey-py)/l*45;
  for(let i=1;i<=12;i++){const u=i/12,v=1-u;pts.push([v*v*ex+2*v*u*cx+u*u*qx,v*v*ey+2*v*u*cy+u*u*qy]);}
  const rest=a0+d-a1,n=Math.ceil(Math.abs(rest)/.05);for(let i=1;i<=n;i++)pts.push(on(a1+rest*i/n));
  if(T.to)pts.push(T.to);}
 const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return {pts,cum,len:cum.at(-1)};}
function at(r,s){let i=1;while(i<r.cum.length-1&&r.cum[i]<s)i++;const u=Math.max(0,Math.min(1,(s-r.cum[i-1])/((r.cum[i]-r.cum[i-1])||1)));const p=r.pts[i-1],q=r.pts[i];return [p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u];}
const COMET_IN=240,COMET_DUR=620,COMET_AT=.75; // ms after a skill starts to appear that its light leaves the dot; ms it runs; share of the run at which the stage lights
function drawFlow(){ctx.lineCap='round';ctx.lineJoin='round';
 flow.forEach((f,k)=>{const g=glowOf(f);
  // the strand brightens from its dot toward the loop: a soft halo under a bright core
  if(g>.01)for(const s of strands[k]){const P=s.points,i0=s===strands[k][0]?(f.i0??=knot(k)):0,n=P.length-1-i0;if(n<2)continue;
   for(const [w,col,k2] of [[5,'#58e07b',.16],[1.4,'#a4f5ba',.75]]){ctx.strokeStyle=col;ctx.lineWidth=w;
    for(let j=0;j<n;j+=8){const u=j/n;ctx.globalAlpha=g*k2*(.12+.88*u*u);ctx.beginPath();ctx.moveTo(P[i0+j][0],P[i0+j][1]);for(let m=1;m<=8&&j+m<=n;m++)ctx.lineTo(P[i0+j+m][0],P[i0+j+m][1]);ctx.stroke();}}}
  // the trail of light, while its animation runs
  if(!live(f.rise)||!f.node||!strands[k][0])return;const p=prog(f.rise);if(p<=0||p>=1)return;
  f.route??=route(k,f.node);const r=f.route,head=r.len*(1-(1-p)**3),tail=Math.min(190,head),fade=p>.85?(1-p)/.15:1,N=20;
  for(const [w,col,k2] of [[7,'#58e07b',.14],[2,'#c4fad2',.9]]){ctx.strokeStyle=col;ctx.lineWidth=w;
   for(let j=0;j<N;j++){const [x0,y0]=at(r,head-tail*(1-j/N)),[x1,y1]=at(r,head-tail*(1-(j+1)/N));ctx.globalAlpha=fade*k2*((j+1)/N)**1.6;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}}
  const [hx,hy]=at(r,head);ctx.fillStyle='#58e07b';ctx.globalAlpha=fade*.25;ctx.beginPath();ctx.arc(hx,hy,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e6ffec';ctx.globalAlpha=fade;ctx.beginPath();ctx.arc(hx,hy,2.4,0,Math.PI*2);ctx.fill();});
}
function tick(now){raf=0;const dt=last?Math.min(now-last,80):0;last=now;if(!paused&&!detailOpen){if(!driven)elapsed+=dt;animationTime+=dt;if(elapsed>=phases[phase][1]){elapsed=0;phase=(phase+1)%phases.length;render();}draw(animationTime);}schedule();}
function schedule(){if(!visible||document.hidden||paused||detailOpen){last=0;if(raf)cancelAnimationFrame(raf);raf=0;return;}if(!raf)raf=requestAnimationFrame(tick);}
new IntersectionObserver(es=>{visible=es[0].isIntersecting;schedule();},{threshold:0}).observe(root);
document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',()=>{paused=reduced.matches;schedule();});
// One driver for the stage highlight. During the headline's pass each pillar holds its
// stage and the story clock stands still; once the headline settles on the tagline, which
// names no stage, the loop's own story plays from Recall. Replay restarts both. While a
// stage's detail panel is open the diagram holds still, as the loop's own tick does, and
// catches up to the headline when the panel closes.
const pillarPhase={recall:'recall',plan:'plan',audit:'review',lessons:'memory',human:'human',integrate:'integrate'};
function drive(stage){driven=!!stage;phase=stage?phases.findIndex(p=>p[0]===pillarPhase[stage]):0;elapsed=0;render();}
function light(stage){if(detailOpen)queued={stage};else drive(stage);}

// ---- the goal's branch: while a pillar shows, its feeds name the skills behind it ----------
// Each change is played as part of the headline's own (change.play), on its beat: the old
// names leave with the headline's exit, the new ones rise in around the moment the new
// word's average glyph does, one feed after another. A feed with nothing to name fades to
// a dim dot. Once the light from the new names reaches the loop, the pillar's stage lights.
// The tagline brings the feeds' own labels (links to their pages) back. Each name links to
// its entry; while a feed shows a name or nothing, its own link is inert, so the hidden label
// takes no click or focus. The names are aria-hidden and out of the tab order; the pillar
// list carries them, as links, for assistive tech.
const feeds=[...root.querySelectorAll('.feed')];
const own=feeds.map(f=>f.querySelector('.feed-label'));
const links=feeds.map(f=>f.querySelector('.feed-link'));
const shown=own.slice();// what each feed shows at rest: its own label, a skill, or nothing (null)
const names=new Map();
const phoneStrands=[];
const readPhone=()=>feeds.forEach((_,k)=>phoneStrands[k]=root.querySelector(`.mobile-system-svg [data-slot="${k}"]`));
readPhone();
const STEP=45;// ms between consecutive feeds
let flowGen=0;
function nameEl(i,k,s){const key=i+':'+k;let e=names.get(key);if(e)return e;
 e=document.createElement(s.href?'a':'span');e.className='feed-skill'+(s.tag?' is-auto':'');e.setAttribute('aria-hidden','true');if(s.href){e.href=s.href;e.tabIndex=-1;}
 const n=document.createElement('span');n.className='feed-skill-name';
 if(s.name[0]==='/'){const sl=document.createElement('span');sl.className='feed-slash';sl.textContent='/';n.append(sl,s.name.slice(1));}else n.textContent=s.name;e.append(n);
 if(s.tag){const t=document.createElement('small');t.textContent=s.tag;e.append(t);}
 feeds[k].append(e);names.set(key,e);return e;}
const isOwn=e=>own.includes(e);
function reveal(e){isOwn(e)?e.classList.remove('is-off'):e.classList.add('is-on');e.classList.remove('is-out');}
function conceal(e){isOwn(e)?e.classList.add('is-off'):e.classList.remove('is-on');e.classList.remove('is-out');}
const visibleNow=e=>isOwn(e)?!e.classList.contains('is-off'):e.classList.contains('is-on');
// what the feed's dot, plate and phone strand look like in the current state
const phoneShown=()=>phoneStrands[0]&&getComputedStyle(phoneStrands[0].ownerSVGElement).display!=='none';
function look(k){const d=getComputedStyle(feeds[k].querySelector('i')),f=getComputedStyle(feeds[k]),s=phoneShown()&&phoneStrands[k]?getComputedStyle(phoneStrands[k]):null;
 return {dot:d.opacity,plate:f.backgroundColor,halo:f.boxShadow,stroke:s&&{stroke:s.stroke,strokeWidth:s.strokeWidth,strokeOpacity:s.strokeOpacity}};}
function state(k,e){const skill=!!e&&!isOwn(e);links[k].inert=e!==own[k];feeds[k].classList.toggle('is-skill',skill);feeds[k].classList.toggle('is-idle',!e);phoneStrands[k]?.classList.toggle('is-lit',skill);phoneStrands[k]?.classList.toggle('is-idle',!e);}
// phones: the names sit in one row under the sub-line (the row of the first feed; a feed placed
// lower sends its name up to it); place them left to right without overlap, wrapping if need be
function pack(){if(getComputedStyle(feeds[0]).getPropertyValue('--feed-row').trim()!=='1')return;
 const W=feeds[0].offsetParent?.clientWidth||innerWidth,G=8,L=feeds[0].offsetLeft,R=W-12;
 const it=shown.map((e,k)=>e&&!isOwn(e)?{e,k,x:feeds[k].offsetLeft,w:e.offsetWidth,row:0}:null).filter(Boolean);
 for(let i=1;i<it.length;i++)it[i].x=Math.max(it[i].x,it[i-1].x+it[i-1].w+G);
 const z=it.at(-1);if(z&&z.x+z.w>R){z.x=R-z.w;for(let i=it.length-2;i>=0;i--)it[i].x=Math.min(it[i].x,it[i+1].x-G-it[i].w);}
 if(it[0]&&it[0].x<L){let x=L,row=0;for(const n of it){if(x>L&&x+n.w>R){row++;x=L;}n.x=x;n.row=row;x+=n.w+G;}}// too narrow for one row
 const T=feeds[0].offsetTop,H=Math.max(0,...it.map(n=>n.e.offsetHeight))+6;
 for(const n of it){n.e.style.setProperty('--sx',n.x-feeds[n.k].offsetLeft+'px');n.e.style.setProperty('--sy',n.row*H+T-feeds[n.k].offsetTop+'px');}}
new ResizeObserver(()=>pack()).observe($('.system-field'));
function restBranch(){flowGen++;
 feeds.forEach((f,k)=>{for(const e of [own[k],...f.querySelectorAll('.feed-skill')]){e.classList.remove('is-anim');e===own[k]?reveal(e):conceal(e);}shown[k]=own[k];state(k,own[k]);Object.assign(flow[k],{lit:false,rise:null,fall:null,actTo:1});});}
// The second feed sits level with "Your goal"; on tablets a long name there runs into it, so a
// name over 12 characters trades places with the shortest one.
function arrange(items){if(items.length<2||items[1].name.length<=12)return items;const s=items.reduce((a,b)=>b.name.length<a.name.length?b:a),o=items.slice(),i=o.indexOf(s);[o[1],o[i]]=[o[i],o[1]];return o;}
function branchTo(c){const t=c.timing,items=c.pillar?.skills?arrange(c.pillar.skills):null;flowGen++;
 const next=feeds.map((_,k)=>items?(items[k]?nameEl(c.index,k,items[k]):null):own[k]);
 // anything left on screen by an interrupted change goes now; what a change cut short by
 // Replay was still fading (c.from) fades on from where it was
 const residue=[];
 feeds.forEach((f,k)=>{for(const e of [own[k],...f.querySelectorAll('.feed-skill')]){if(e===shown[k]||e===next[k])continue;
  const w=c.from(e);if(w&&w.opacity>.05){reveal(e);e.classList.add('is-anim','is-out');residue.push(e);c.play(e,[w,{...w,opacity:0}],{duration:t.fadeD,easing:t.exitFade});}
  else if(visibleNow(e))conceal(e);}});
 const moving=feeds.map((_,k)=>next[k]!==shown[k]),arriving=feeds.map((_,k)=>k).filter(k=>moving[k]&&next[k]);
 const before=feeds.map((_,k)=>{const l=look(k),d=c.from(feeds[k].querySelector('i'));if(d)l.dot=String(d.opacity);return l;}),leaving=[];
 feeds.forEach((_,k)=>{if(!moving[k])return;if(shown[k]){leaving.push(shown[k]);shown[k].classList.add('is-out');}if(next[k])reveal(next[k]);shown[k]=next[k];state(k,next[k]);});
 pack();
 const now=feeds.map((_,k)=>look(k));
 const tween=(el,a,b,delay,duration,easing)=>c.play(el,[a,b],{delay,duration,easing});
 let lightAt=c.mid+t.inkD/2,phone=phoneShown();
 feeds.forEach((f,k)=>{if(!moving[k])return;
  const a=leaving.find(e=>f.contains(e)),b=next[k],j=arriving.indexOf(k),tin=j<0?null:c.mid+(j-(arriving.length-1)/2)*STEP,skill=b&&!isOwn(b);
  // On the first change the labels hand over to the names: label and name pass each other
  // near a fifth of full ink, so the branch is never empty. Later changes keep the headline's
  // rhythm, where the old word leaves before the new one comes.
  const out=c.intro&&a&&tin!=null?Math.max(k*STEP/3,tin+t.shows-t.gone+t.inkD*.15):k*STEP/3,at=tin??out,w=a&&c.from(a);
  if(a){a.classList.add('is-anim');tween(a,{transform:w?.transform??'translateY(0)'},{transform:`translateY(${-t.lift}em)`},out,t.outD,t.exitMove);tween(a,{opacity:w?.opacity??1,filter:w?.filter??'blur(0em)'},{opacity:0,filter:`blur(${t.blur*.75}em)`},out,t.fadeD,t.exitFade);}
  if(b){b.classList.add('is-anim');tween(b,{transform:`translateY(${t.rise}em)`},{transform:'translateY(0)'},at,t.D,t.ease);tween(b,{opacity:0,filter:`blur(${t.blur*1.5}em)`},{opacity:1,filter:'blur(0em)'},at,t.inkD,t.ink);}
  // dot and plate: what fades goes with the old name, what brightens comes with the new one
  const beat=(up,el,x,y)=>tween(el,x,y,up&&b?at:out,up&&b?t.inkD:t.fadeD,up&&b?t.ink:t.exitFade);
  const alpha=s=>/^rgba/.test(s)?+s.split(',')[3].replace(')',''):1;
  if(before[k].dot!==now[k].dot)beat(+now[k].dot>+before[k].dot,f.querySelector('i'),{opacity:before[k].dot},{opacity:now[k].dot});
  if(before[k].plate!==now[k].plate)beat(alpha(now[k].plate)>alpha(before[k].plate),f,{backgroundColor:before[k].plate,boxShadow:before[k].halo},{backgroundColor:now[k].plate,boxShadow:now[k].halo});
  const lit=skill?at+COMET_IN:out;
  const sa=before[k].stroke,sb=now[k].stroke;
  if(phone&&sa&&sb&&JSON.stringify(sa)!==JSON.stringify(sb))tween(phoneStrands[k],sa,sb,lit,skill?COMET_DUR:b?t.inkD:t.fadeD,skill?t.ink:b?t.ink:t.exitFade);
  const fl=flow[k];fl.fall=fl.lit?c.play(root,[],{delay:out,duration:t.fadeD+60}):null;fl.lit=skill;fl.rise=null;fl.route=null;fl.actTo=b?1:.22;
  if(skill){lightAt=Math.max(lightAt,lit+COMET_DUR*COMET_AT);fl.node=aim[pillarPhase[c.stage]]?pillarPhase[c.stage]:null;fl.i0=phone?0:knot(k);
   fl.rise=c.play(root,[],{delay:lit,duration:COMET_DUR});}
 });
 c.after(()=>{for(const e of [...leaving,...residue])if(!shown.includes(e))conceal(e);for(const e of [...leaving,...residue,...next])e?.classList.remove('is-anim','is-out');});
 return lightAt;}
function onPillar(stage,c){
 if(!c){restBranch();light(stage);return;}// static mode, or the headline failed: at once
 const token=flowGen+1,at=branchTo({...c,stage});
 c.play(root,[],{delay:at,duration:1}).finished.then(()=>{if(token===flowGen)light(stage);},()=>{});}

// ---- the headline -------------------------------------------------------------------------------
// If the module is slow and the fallback heading has faded in, it leaves the way a pillar
// does before the headline mounts over it, so nothing cuts to blank.
let headline=null;
async function leaveFallback(h){if(reduced.matches||+getComputedStyle(h).opacity<.02)return;
 const a=[...h.children].flatMap(e=>[e.animate([{transform:'translateY(0)'},{transform:'translateY(-.2em)'}],{duration:380,easing:'cubic-bezier(.45,0,.85,.45)',fill:'forwards'}),e.animate([{opacity:1,filter:'blur(0)'},{opacity:0,filter:'blur(.04em)'}],{duration:260,easing:'cubic-bezier(.25,.4,.45,1)',fill:'forwards'})]);
 await Promise.all(a.filter((_,i)=>i%2).map(x=>x.finished));}
function heroFailed(err){const h=$('.living-heading');h.getAnimations({subtree:true}).forEach(a=>a.cancel());h.style.opacity='1';driven=false;restBranch();render();schedule();reportError(err);}// the static heading shows at once; the loop runs its own story
(async()=>{const {mountHeroPillars}=await import('./hero-pillars.mjs');const h=$('.living-heading');await leaveFallback(h);
 headline=mountHeroPillars(h,{titleId:'hero-title',onPillar});})().catch(heroFailed);
// The hero runs without waiting for its drawing: the one this viewport shows is asked for here,
// the other when the viewport crosses 700px, and each is read in when it lands; the phone
// strands take the feeds' current state. Without its drawing the hero runs on; the browser has
// already logged the failed request.
function cross(){const phone=narrow.matches;if(asked[phone])return;
 drawing(phone).then(()=>{if(phone){readPhone();feeds.forEach((_,k)=>state(k,shown[k]));}else readTracks();},()=>{});}
narrow.addEventListener('change',cross);cross();
render();resize();draw(0);schedule();
