// Footer: wordmark ticker with spinning star separators, the H emblem trace, and the perspective
// grid floor. Motion runs only while the footer is on screen, the tab is visible and reduced
// motion is off; under reduced motion the ticker and stars hold still and the floor draws once.
import {mountFloor} from './footer-floor.mjs';

// Four-point star in a 100 x 100 box with its tips on the diagonals. Each side is a cubic bowed
// toward the centre (waist about half the tip radius); each tip is softened by stopping the sides
// just short of it and bridging them with a curve whose control point is the tip.
function starPath(){
  const TIP=70.2,NEAR=23.4,FAR=17,CUT=.03;
  const side=[[TIP,0],[NEAR,FAR],[FAR,NEAR],[0,TIP]];
  const point=t=>{const s=1-t,w=[s*s*s,3*s*s*t,3*s*t*t,t*t*t];return[0,1].map(k=>side.reduce((sum,p,i)=>sum+w[i]*p[k],0));};
  const slope=t=>{const s=1-t;return[0,1].map(k=>3*s*s*(side[1][k]-side[0][k])+6*s*t*(side[2][k]-side[1][k])+3*t*t*(side[3][k]-side[2][k]));};
  // the part of the side between CUT and 1-CUT, as its own cubic
  const a=point(CUT),b=point(1-CUT),da=slope(CUT),db=slope(1-CUT),h=(1-2*CUT)/3;
  const piece=[a,[a[0]+h*da[0],a[1]+h*da[1]],[b[0]-h*db[0],b[1]-h*db[1]],b];
  const at=([x,y],quarter)=>{
    const angle=Math.PI/4+quarter*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
    return`${(50+x*c-y*s).toFixed(2)} ${(50-x*s-y*c).toFixed(2)}`;
  };
  let d=`M${at(piece[0],0)}`;
  for(let q=0;q<4;q++)d+=`C${at(piece[1],q)} ${at(piece[2],q)} ${at(piece[3],q)}Q${at(side[3],q)} ${at(piece[0],q+1)}`;
  return d+'Z';
}

const footer=document.querySelector('.site-footer');
if(footer){
  // Two identical tracks of ten "wordmark + star" items; each track slides one full width left,
  // so the second track lands exactly where the first began and the loop has no seam.
  const star=`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${starPath()}"/></svg>`;
  for(const track of footer.querySelectorAll('.sf-track'))for(let i=0;i<10;i++){
    const word=document.createElement('span');word.className='sf-word';word.textContent='Harness Firmware';
    const separator=document.createElement('span');separator.className='sf-sep';separator.innerHTML=star;
    word.append(separator);track.append(word);
  }
  const floor=mountFloor(footer);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false;
  function sync(){
    const shown=visible&&!document.hidden;
    footer.dataset.motion=shown&&!preference.matches?'playing':'paused';
    floor?.update(shown,preference.matches);
  }
  document.addEventListener('visibilitychange',sync);preference.addEventListener('change',sync);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();},{threshold:0}).observe(footer);
  try{
    const response=await fetch('assets/harness-mark.svg');if(!response.ok)throw new Error('Harness mark unavailable');
    const source=new DOMParser().parseFromString(await response.text(),'image/svg+xml').documentElement;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',source.getAttribute('viewBox'));svg.setAttribute('aria-hidden','true');
    const ns=svg.namespaceURI,defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath');
    clip.id='sf-h-clip';
    for(const path of source.querySelectorAll('path'))clip.append(path.cloneNode(true));
    defs.append(clip);svg.append(defs);
    const base=document.createElementNS(ns,'g');base.setAttribute('fill','#0b130e');base.classList.add('sf-h-base');
    const highlights=document.createElementNS(ns,'g');highlights.classList.add('sf-h-highlight');highlights.setAttribute('clip-path','url(#sf-h-clip)');
    for(const path of source.querySelectorAll('path')){
      base.append(path.cloneNode(true));
      const trace=path.cloneNode(true);trace.removeAttribute('fill');trace.setAttribute('pathLength','100');highlights.append(trace);
    }
    svg.append(base,highlights);footer.querySelector('.sf-emblem').replaceChildren(svg);sync();
  }catch(error){console.warn(error);}
}
