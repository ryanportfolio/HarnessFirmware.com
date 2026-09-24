const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// Ordered 8x8 Bayer thresholding over a bounded 2D field. Canvas2D only: no fluid
// solver, no WebGL, no third-party runtime.
const bayer = [0,48,12,60,3,51,15,63,32,16,44,28,35,19,47,31,8,56,4,52,11,59,7,55,40,24,36,20,43,27,39,23,2,50,14,62,1,49,13,61,34,18,46,30,33,17,45,29,10,58,6,54,9,57,5,53,42,26,38,22,41,25,37,21];
function mountField(host, audit) {
  const canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden','true'); host.prepend(canvas);
  const ctx = canvas.getContext('2d'); if (!ctx) {canvas.remove();const button=host.querySelector('button');if(button){button.textContent='Static evidence';button.disabled=true;}if(audit)host.insertAdjacentHTML('afterbegin','<svg class="evidence-static" viewBox="0 0 640 290" aria-hidden="true"><g fill="none" stroke="#53db76"><path d="M300 65v150M450 100l5 5 9-12m-14 48 5 5 9-12m-14 48 5 5 9-12M480 100h100m-100 41h100m-100 41h100"/></g></svg>');return;}
  let visible = false, paused = !audit, frame = 0, previous = 0, elapsed = 0, trail = [];
  const button = host.querySelector('button');
  function paint() {
    const w = canvas.width, h = canvas.height, t = elapsed / 1000;
    ctx.fillStyle = '#111a14'; ctx.fillRect(0,0,w,h);
    const phase = reduced.matches ? 3 : Math.floor(t / 2.5) % 4;
    const scan = reduced.matches ? .68 : .25 + .43 * ((t % 10) / 10);
    if(audit)host.querySelector('.evidence-caption span:last-child').textContent=['01 / Inspect','02 / Finding','03 / Repair','04 / Recheck'][phase];
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){
      const nx=x/w, ny=y/h;
      const wave = Math.sin(nx*12+Math.sin(ny*8+t*.28)*2-t*.4)*.5+.5;
      let density = (wave*.46+.12)*Math.sin(ny*Math.PI);
      if(audit) density *= nx<scan ? 1 : .22;
      let wake=0;
      for(const p of trail){const dx=(nx-p.x)*w,dy=(ny-p.y)*h;wake=Math.max(wake,Math.exp(-(dx*dx+dy*dy)/1500)*p.life*.72);}
      const threshold=bayer[((y/2)%8)*8+(x/2)%8]/64;
      if(density+wake>threshold){ctx.fillStyle=wake>.09?'#53db76':nx<scan?'#466750':'#36523e';ctx.fillRect(x,y,1,1);}
    }
    if(audit){
      ctx.strokeStyle='#53db76';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(scan*w,h*.23);ctx.lineTo(scan*w,h*.74);ctx.stroke();
      for(let i=0;i<3;i++) {const y=h*(.34+i*.13), left=w*.73;ctx.strokeStyle=phase===1&&i===1?'#efc87e':'#769c80';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w*.92,y);ctx.stroke();ctx.strokeStyle='#53db76';if(phase===3){ctx.beginPath();ctx.moveTo(left-16,y);ctx.lineTo(left-12,y+4);ctx.lineTo(left-5,y-5);ctx.stroke();}else if(phase===1&&i===1){ctx.strokeStyle='#efc87e';ctx.strokeRect(left-16,y-4,8,8);}else{ctx.strokeStyle='#52715a';ctx.strokeRect(left-16,y-4,8,8);}}
    }
  }
  function resize(){canvas.width=Math.min(640,Math.round(host.clientWidth));canvas.height=Math.min(320,Math.round(host.clientHeight));paint();}
  function tick(now){frame=0;if(!visible||paused||reduced.matches||document.hidden)return;if(now-previous>=30){const dt=Math.min(now-previous,80);previous=now;elapsed+=dt;trail=trail.map(p=>({...p,life:p.life-dt/1100})).filter(p=>p.life>0);paint();}frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);frame=0;previous=performance.now();if(button){button.textContent=reduced.matches?'Static evidence':paused?'Play texture':'Pause texture';button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(paused||reduced.matches));}if(reduced.matches){trail=[];elapsed=0;paint();}if(visible&&!paused&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(tick);}
  host.addEventListener('pointermove',e=>{if(reduced.matches||paused||e.pointerType==='touch'||!audit)return;const r=host.getBoundingClientRect();trail.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,life:1});if(trail.length>12)trail.shift();});
  button?.addEventListener('click',()=>{paused=!paused;sync();});
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync();}).observe(host);
  reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);resize();sync();
}
const audit = document.querySelector('#audit-details');
if(audit){const figure=document.createElement('figure');figure.className='evidence-field';figure.setAttribute('aria-label','Illustration: noisy evidence is inspected and resolves into three checked rows.');figure.innerHTML='<figcaption class="evidence-caption"><span>Fresh evidence / illustrative</span><span>Inspect → recheck</span></figcaption><div class="evidence-key"><span>Work under review</span><span>Checked result</span></div>';audit.querySelector('.audit-detail-grid').before(figure);mountField(figure,true);}
const start=document.querySelector('#start');
if(start){const field=document.createElement('div');field.className='cta-dither';field.setAttribute('aria-hidden','true');start.prepend(field);mountField(field,false);}
// Reveal only on entry; content remains visible before JS and in reduced motion.
const revealObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){if(!reduced.matches)e.target.classList.add('mask-reveal');revealObserver.unobserve(e.target);}},{threshold:.2});
document.querySelectorAll('#always-on h2,#audit-details h2,#remembered h2,#self-improving h2,#start h2,.faq-section h2,.statement-block :is(.statement-secondary,.statement-body)').forEach(el=>revealObserver.observe(el));
window.dispatchEvent(new Event('harness:layout-change'));
