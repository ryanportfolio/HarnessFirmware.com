const reduced = matchMedia('(prefers-reduced-motion: reduce)');
// Ordered 8x8 Bayer thresholding over a bounded 2D field. Canvas2D only: no fluid
// solver, no WebGL, no third-party runtime.
const bayer = [0,48,12,60,3,51,15,63,32,16,44,28,35,19,47,31,8,56,4,52,11,59,7,55,40,24,36,20,43,27,39,23,2,50,14,62,1,49,13,61,34,18,46,30,33,17,45,29,10,58,6,54,9,57,5,53,42,26,38,22,41,25,37,21];
const dither = (x, y) => bayer[((y / 2) % 8) * 8 + (x / 2) % 8] / 64;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = x => { const p = clamp01(x); return p * p * (3 - 2 * p); };
const lerp = (a, b, u) => a + (b - a) * u;
// Dots on the 2 px grid inside a box, kept where the density beats the Bayer threshold.
function dots(ctx, x0, y0, x1, y1, density, color) {
  if (density <= 0) return;
  ctx.fillStyle = color;
  for (let y = Math.max(0, Math.round(y0) & ~1); y < y1; y += 2)
    for (let x = Math.max(0, Math.round(x0) & ~1); x < x1; x += 2)
      if (density > dither(x, y)) ctx.fillRect(x, y, 1, 1);
}
// The audit figure (#audit-details) plays one review round on a 16 s loop:
//   01 Inspect   a fresh reviewer's scan reads the change line by line
//   02 Findings  two findings leave their lines
//   03 Verify    each is traced back to its line: one holds (amber), one is refuted and dissolves
//   04 Repair    the confirmed line is rewritten and its finding joins the checklist
//   05 Recheck   a second fresh scan reads the change again and the checks tick one by one
//   06 Approval  the result waits at a gate until a person approves it
// The pointer leaves a green wake in the texture. Reduced motion paints the approval step, still.
const AUDIT = {
  period: 16,
  still: 14.2,
  steps: [[0, '01 / Inspect'], [4.4, '02 / Findings'], [6.2, '03 / Verify'], [8.6, '04 / Repair'], [10.6, '05 / Recheck'], [13.2, '06 / Your approval']],
  lines: [[0, .62], [.06, .48], [.06, .8], [.12, .36], [.12, .7], [.06, .55], [.12, .88], [.06, .42], [0, .66]],
  confirmed: 5,
  refuted: 2,
};
const AMBER = '#efc87e', GREEN = '#53db76', MUTED = '#52715a';
function paintAudit(ctx, w, h, t, trail, host) {
  const u = t % AUDIT.period;
  const fade = Math.min(smooth(u / .5), smooth((AUDIT.period - u) / .6));
  ctx.fillStyle = '#111a14'; ctx.fillRect(0, 0, w, h);
  // Texture: a faint version of the old wave field, plus the pointer's wake.
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const nx = x / w, ny = y / h;
    const wave = Math.sin(nx * 12 + Math.sin(ny * 8 + t * .28) * 2 - t * .4) * .5 + .5;
    let wake = 0;
    for (const p of trail) { const dx = (nx - p.x) * w, dy = (ny - p.y) * h; wake = Math.max(wake, Math.exp(-(dx * dx + dy * dy) / 1500) * p.life * .72); }
    if ((wave * .2 + .03) * Math.sin(ny * Math.PI) + wake > dither(x, y)) { ctx.fillStyle = wake > .09 ? GREEN : '#2c4433'; ctx.fillRect(x, y, 1, 1); }
  }
  const step = AUDIT.steps.filter(([at]) => u >= at).at(-1)[1];
  const label = host.querySelector('.evidence-caption span:last-child');
  if (label && label.textContent !== step) label.textContent = step;
  ctx.globalAlpha = fade;
  // The change under review: dithered code lines in a frame on the left. Narrow figures (the
  // caption stacks on two lines there) start the lines lower and set them closer.
  const narrow = w < 480;
  const top = narrow ? .36 : .25, gap = narrow ? .042 : .058;
  const px = Math.round(w * .05), pw = w * .38;
  const lineY = i => Math.round(h * (top + i * gap)) & ~1;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#2f4a37'; ctx.strokeRect(px - 7.5, Math.round(h * (top - .05)) + .5, Math.round(pw + 14), Math.round(h * (gap * 8 + .1)));
  const scan1 = lerp(h * (top - .03), lineY(8) + 6, clamp01((u - .5) / 3.6));
  const scan2 = lerp(h * (top - .03), lineY(8) + 6, clamp01((u - 10.6) / 2.2));
  const lineEnd = [];
  AUDIT.lines.forEach(([indent, length], i) => {
    const y = lineY(i), x0 = px + 10 + indent * pw;
    let x1 = px + 10 + Math.min(1, indent + length) * (pw - 10);
    const read = u > .5 && scan1 > y + 2;
    let density = read ? .9 : .5, color = read ? '#a3c9ad' : '#5d8068';
    let marker = '#3e5a45';
    if (i === AUDIT.confirmed && u >= 4.4) {
      if (u < 8.6) { color = AMBER; marker = AMBER; }
      else {
        // Repair: the line dissolves and comes back rewritten, shorter and green.
        const out = smooth((u - 8.6) / .7), back = smooth((u - 9.3) / .7);
        density = u < 9.3 ? .9 * (1 - out) : .95 * back;
        if (u >= 9.3) { x1 = px + 10 + .44 * (pw - 10); color = GREEN; marker = GREEN; }
      }
    }
    if (i === AUDIT.refuted && u >= 4.4 && u < 7.6) marker = AMBER;
    lineEnd[i] = [x1, y + 3];
    ctx.fillStyle = marker; ctx.fillRect(px, y, 4, 6);
    dots(ctx, x0, y, x1, y + 6, density, color);
  });
  const scanLine = (y, color) => { ctx.fillStyle = color; ctx.fillRect(px - 6, Math.round(y), Math.round(pw + 12), 1); };
  if (u > .5 && u < 4.2) scanLine(scan1, GREEN);
  if (u > 10.6 && u < 12.9) scanLine(scan2, '#b4ff8b');
  // Findings leave their lines for the verify column, are traced back, and either hold or go.
  const vx = Math.round(w * .53);
  const chips = [[AUDIT.confirmed, h * (narrow ? .46 : .4), 4.6, true], [AUDIT.refuted, h * (narrow ? .6 : .56), 4.9, false]];
  const rowsLeft = Math.round(w * .72), rowsRight = Math.round(w * .93);
  const rowY = i => Math.round(h * ((narrow ? .42 : .32) + i * (narrow ? .09 : .12))) + .5;
  for (const [line, cy, start, holds] of chips) {
    if (u < start) continue;
    const [sx, sy] = lineEnd[line];
    const go = smooth((u - start) / .8);
    let x = lerp(sx, vx, go), y = lerp(sy, cy, go);
    // Verify: a dashed trace runs from the finding back to the code it names.
    if (u >= 6.2 && u < 8.6) {
      const k = smooth((u - 6.2) / 1);
      ctx.setLineDash([2, 3]); ctx.strokeStyle = holds ? AMBER : MUTED;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, sx + 4, k), lerp(y, sy, k)); ctx.stroke(); ctx.setLineDash([]);
    }
    if (!holds) {
      if (u >= 8.6) continue;
      const refuted = u >= 7.4;
      ctx.globalAlpha = fade * (refuted ? 1 - smooth((u - 7.8) / .7) : 1);
      ctx.strokeStyle = refuted ? MUTED : AMBER; ctx.strokeRect(Math.round(x - 5) + .5, Math.round(y - 5) + .5, 10, 10);
      dots(ctx, x + 10, y - 2, x + 40, y + 2, .7, refuted ? MUTED : AMBER);
      if (refuted) { ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x - 9, y + 9); ctx.stroke(); }
      ctx.globalAlpha = fade;
      continue;
    }
    // The confirmed finding joins the checklist as the second check once the repair starts.
    if (u >= 9.3) continue;
    const toRow = smooth((u - 8.6) / .7);
    x = lerp(x, rowsLeft - 12, toRow); y = lerp(y, rowY(1), toRow);
    ctx.fillStyle = u >= 7.4 ? AMBER : '#111a14'; ctx.strokeStyle = AMBER;
    ctx.fillRect(Math.round(x - 5), Math.round(y - 5), 10, 10); ctx.strokeRect(Math.round(x - 5) + .5, Math.round(y - 5) + .5, 10, 10);
    if (toRow < .2) dots(ctx, x + 10, y - 2, x + 40, y + 2, .7, AMBER);
  }
  // Checklist: three checks; the second waits on the repair. The recheck ticks them in order.
  for (let i = 0; i < 3; i++) {
    const y = rowY(i), ticked = u >= 11.2 + i * .6;
    const pending = i === 1 && u >= 9.3 && !ticked;
    ctx.strokeStyle = ticked ? GREEN : pending ? AMBER : '#769c80';
    ctx.beginPath(); ctx.moveTo(rowsLeft, y); ctx.lineTo(rowsRight, y); ctx.stroke();
    if (ticked) { ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.moveTo(rowsLeft - 16, y); ctx.lineTo(rowsLeft - 12, y + 4); ctx.lineTo(rowsLeft - 5, y - 5); ctx.stroke(); }
    else { ctx.strokeStyle = pending ? AMBER : MUTED; ctx.strokeRect(rowsLeft - 16, y - 4, 8, 8); }
  }
  // The gate: the checked result waits here until a person approves it.
  const gy = Math.round(h * (narrow ? .7 : .66)), gh = Math.max(12, Math.round(h * .06)) & ~1;
  const approved = u >= 14.8;
  const waiting = u >= 13.2 && !approved;
  if (approved) { ctx.fillStyle = GREEN; ctx.fillRect(rowsLeft - 16, gy, rowsRight - rowsLeft + 16, gh); }
  else {
    ctx.globalAlpha = fade * (waiting ? .55 + .45 * Math.sin((u - 13.2) * 5) : 1);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = waiting ? GREEN : MUTED;
    ctx.strokeRect(rowsLeft - 15.5, gy + .5, rowsRight - rowsLeft + 15, gh - 1); ctx.setLineDash([]);
    ctx.globalAlpha = fade;
  }
  if (u >= 13.6) {
    const reach = smooth((u - 13.6) / 1), press = u >= 14.7 && u < 15 ? .8 : 1;
    const cx = lerp(w * .99, (rowsLeft + rowsRight) / 2, reach), cy = lerp(h * .58, gy + gh * .6, reach);
    ctx.save(); ctx.translate(Math.round(cx), Math.round(cy)); ctx.scale(press, press);
    ctx.fillStyle = '#f3f3ec'; ctx.strokeStyle = '#111a14';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 14); ctx.lineTo(4, 10); ctx.lineTo(7, 16); ctx.lineTo(9, 15); ctx.lineTo(6, 9); ctx.lineTo(11, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function mountField(host, audit) {
  let canvas = host.querySelector(':scope>canvas'); if (!canvas) {canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden','true'); host.prepend(canvas);}
  const ctx = canvas.getContext('2d'); if (!ctx) {canvas.remove();const button=host.querySelector('button');if(button){button.textContent='Static evidence';button.disabled=true;}if(audit)host.insertAdjacentHTML('afterbegin','<svg class="evidence-static" viewBox="0 0 640 290" aria-hidden="true"><g fill="none" stroke="#53db76"><path d="M300 65v150M450 100l5 5 9-12m-14 48 5 5 9-12m-14 48 5 5 9-12M480 100h100m-100 41h100m-100 41h100"/></g></svg>');return;}
  let visible = false, paused = !audit, frame = 0, previous = 0, elapsed = 0, trail = [];
  const button = host.querySelector('button');
  function paint() {
    if (audit) return paintAudit(ctx, canvas.width, canvas.height, reduced.matches ? AUDIT.still : elapsed / 1000, trail, host);
    const w = canvas.width, h = canvas.height, t = elapsed / 1000;
    ctx.fillStyle = '#111a14'; ctx.fillRect(0,0,w,h);
    const scan = reduced.matches ? .68 : .25 + .43 * ((t % 10) / 10);
    for(let y=0;y<h;y+=2) for(let x=0;x<w;x+=2){
      const nx=x/w, ny=y/h;
      const wave = Math.sin(nx*12+Math.sin(ny*8+t*.28)*2-t*.4)*.5+.5;
      const density = (wave*.46+.12)*Math.sin(ny*Math.PI);
      const threshold=bayer[((y/2)%8)*8+(x/2)%8]/64;
      if(density>threshold){ctx.fillStyle=nx<scan?'#466750':'#36523e';ctx.fillRect(x,y,1,1);}
    }
  }
  // The audit figure scales its canvas uniformly (at most 900 canvas px across) so its marks keep
  // their shape; the CTA texture keeps its 640 x 320 cap and stretches.
  function resize(){if(audit){const s=Math.max(1,host.clientWidth/900);canvas.width=Math.round(host.clientWidth/s);canvas.height=Math.round(host.clientHeight/s);}else{canvas.width=Math.min(640,Math.round(host.clientWidth));canvas.height=Math.min(320,Math.round(host.clientHeight));}paint();}
  function tick(now){frame=0;if(!visible||paused||reduced.matches||document.hidden)return;if(now-previous>=30){const dt=Math.min(now-previous,80);previous=now;elapsed+=dt;trail=trail.map(p=>({...p,life:p.life-dt/1100})).filter(p=>p.life>0);paint();}frame=requestAnimationFrame(tick);}
  function sync(){cancelAnimationFrame(frame);frame=0;previous=performance.now();if(button){button.textContent=reduced.matches?'Static evidence':paused?'Play texture':'Pause texture';button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(paused||reduced.matches));}if(reduced.matches){trail=[];elapsed=0;paint();}if(visible&&!paused&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(tick);}
  host.addEventListener('pointermove',e=>{if(reduced.matches||paused||e.pointerType==='touch'||!audit)return;const r=host.getBoundingClientRect();trail.push({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height,life:1});if(trail.length>12)trail.shift();});
  button?.addEventListener('click',()=>{paused=!paused;sync();});
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync();}).observe(host);
  reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);resize();sync();
}
// index.html ships the audit figure, so the page is its final height from the first paint.
const evidence = document.querySelector('#audit-details .evidence-field');
if(evidence)mountField(evidence,true);
const start=document.querySelector('#start');
if(start){const field=document.createElement('div');field.className='cta-dither';field.setAttribute('aria-hidden','true');start.prepend(field);mountField(field,false);}
// Reveal only on entry; content remains visible before JS and in reduced motion.
const revealObserver=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){if(!reduced.matches)e.target.classList.add('mask-reveal');revealObserver.unobserve(e.target);}},{threshold:.2});
document.querySelectorAll('#always-on h2,#audit-details h2,#remembered h2,#self-improving h2,#start h2,.faq-section h2,.statement-block :is(.statement-secondary,.statement-body)').forEach(el=>revealObserver.observe(el));
window.dispatchEvent(new Event('harness:layout-change'));
