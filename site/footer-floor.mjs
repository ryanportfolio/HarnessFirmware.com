// Perspective grid floor under the site footer. One WebGL quad fills the footer; the fragment shader
// maps each pixel onto a tilted floor whose cells shrink toward a horizon about three cells above
// the canvas centre. Rows drift away from the viewer, lines glow brighter near a moving pointer,
// and the cells tighten from 220 px to 160 px as the footer scrolls fully into view. The paper
// heading and ticker cover the top of the canvas, so only the closing panel shows the floor.
// Without WebGL no canvas is added and the footer keeps its flat #181914 panel.

const VERTEX='attribute vec2 corner;void main(){gl_Position=vec4(corner,0.,1.);}';
const FRAGMENT=`precision highp float;
uniform vec2 size;     // canvas size, CSS px
uniform float dpr;     // device px per CSS px
uniform float cell;    // CSS px per grid cell at the canvas centre
uniform float drift;   // row offset in cells, 0..1
uniform vec3 pointer;  // xy: pointer in cells from the centre, y up; z: glow strength 0..1
const float TILT=.3283;                   // sin(80deg)/3: depth growth per cell below centre
const vec3 PANEL=vec3(24.,25.,20.)/255.;  // #181914
const vec3 GLOW=vec3(43.,100.,59.)/255.;  // deep tech green
const vec3 LINE=GLOW*.6;
void main(){
  vec2 q=(gl_FragCoord.xy/dpr-.5*size)/cell;     // cells from the centre, y up
  float fade=1.-smoothstep(-.3,1.2,q.y);          // floor dissolves toward the horizon
  if(fade<=0.){gl_FragColor=vec4(PANEL,1.);return;}
  float depth=1.-TILT*q.y;                       // 1 at the centre, about 2 at the footer bottom
  vec2 floorAt=vec2(q.x,2.*q.y)/depth;           // floor coordinates: one line per whole unit
  fade*=1.-smoothstep(.5,1.,abs(floorAt.x)*cell/(.5*size.x));
  // floor units covered by one device pixel, from the derivatives of floorAt
  vec2 pixel=vec2(length(vec2(1.,q.x*TILT/depth)),2./depth)/(depth*cell*dpr);
  vec2 away=abs(fract(floorAt-vec2(0.,drift)+.5)-.5);
  vec2 core=1.-smoothstep(.007-.7*pixel,.007+.7*pixel,away);
  float halo=max(0.,1.-min(away.x,away.y)/.04);
  vec2 pointerAt=vec2(pointer.x,2.*pointer.y)/(1.-TILT*pointer.y);
  // the glow widens as it strengthens: 2.1 floor cells at full strength, about 1.6 at a fifth
  float reach=2.1*pow(max(pointer.z,1e-6),1./6.);
  float boost=1.+4.*pointer.z*(1.-smoothstep(0.,reach,length(floorAt-pointerAt)));
  vec3 color=PANEL+GLOW*(.09*halo*boost*fade);
  gl_FragColor=vec4(mix(color,LINE,.75*max(core.x,core.y)*fade),1.);
}`;
const PANEL=[24/255,25/255,20/255];

export function mountFloor(footer){
  const canvas=document.createElement('canvas');
  canvas.className='sf-floor';canvas.setAttribute('aria-hidden','true');
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
  if(!gl)return null;
  let program,uniforms;
  function build(){
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;};
    program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))return false;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const corner=gl.getAttribLocation(program,'corner');
    gl.enableVertexAttribArray(corner);gl.vertexAttribPointer(corner,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['size','dpr','cell','drift','pointer'].map(name=>[name,gl.getUniformLocation(program,name)]));
    gl.clearColor(...PANEL,1);
    return true;
  }
  if(!build())return null;
  footer.prepend(canvas);

  const ticker=footer.querySelector('.sf-ticker');
  let width=0,height=0,dpr=1,panelTop=0;
  // still follows the media query until update() says otherwise, so resizes during load paint the right frame
  let frame=0,last=0,shown=false,still=matchMedia('(prefers-reduced-motion: reduce)').matches,lost=false,entry=false;
  let drift=0,strength=0,lastMove=-1e9,gestureStart=-1e9;
  const target={x:0,y:0},glow={x:0,y:0};

  // Size the canvas to the footer; true when the drawing buffer was reallocated (and so cleared).
  function fit(){
    dpr=Math.min(devicePixelRatio||1,2);
    width=footer.clientWidth;height=footer.clientHeight;
    // the closing panel starts under the ticker's bottom border; keep one row above it for the seam
    panelTop=ticker?ticker.offsetTop+ticker.offsetHeight-1:0;
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width===w&&canvas.height===h)return false;
    canvas.width=w;canvas.height=h;return true;
  }
  // Paint the whole closing panel, not just the rows on screen: the compositor scrolls ahead of the
  // main thread, so rows that are offscreen at draw time can be on screen when the frame shows.
  // The paper heading and ticker cover everything above, which stays the flat panel colour.
  function paint(cell,pointer){
    if(lost)return;
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.disable(gl.SCISSOR_TEST);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);gl.scissor(0,0,canvas.width,Math.min(canvas.height,Math.ceil((height-panelTop)*dpr)));
    gl.uniform2f(uniforms.size,width,height);gl.uniform1f(uniforms.dpr,dpr);
    gl.uniform1f(uniforms.cell,cell);gl.uniform1f(uniforms.drift,drift);
    gl.uniform3f(uniforms.pointer,...pointer);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  // The entry frame: 220 px cells, no drift, no pointer glow. It is the whole of reduced motion.
  function paintEntry(){drift=0;paint(220,[0,0,0]);entry=true;}
  // Paint the current state.
  function draw(rect=footer.getBoundingClientRect()){
    if(still){paintEntry();return;}
    const cell=220-60*Math.min(1,Math.max(0,(innerHeight-rect.top)/rect.height));
    paint(cell,[(glow.x-width/2)/cell,(height/2-glow.y)/cell,strength]);entry=false;
  }

  function tick(now){
    frame=requestAnimationFrame(tick);
    const dt=last?Math.min((now-last)/1000,.1):0;last=now;
    drift=(drift+dt*.5)%1;
    if(Math.round(footer.clientWidth*Math.min(devicePixelRatio||1,2))!==canvas.width||footer.clientHeight!==height)fit();
    const rect=footer.getBoundingClientRect();
    // glow: a gesture from rest waits 250 ms, then the glow eases toward full (time constant 0.92 s)
    // while the pointer keeps moving; once it stops for 50 ms it fades as (1-t/2.12s)^2.5, a fifth
    // left after 1 s and a faint tail after that
    if(now-lastMove<50){if(now-gestureStart>=250)strength+=(1-strength)*(1-Math.exp(-dt/.92));}
    else strength=Math.max(0,strength**.4-dt/2.12)**2.5;
    const x=target.x-rect.left,y=target.y-rect.top;
    const ease=1-Math.pow(.95,dt*60);
    glow.x+=(x-glow.x)*ease;glow.y+=(y-glow.y)*ease;
    draw(rect);
  }
  function start(){if(!frame&&!lost){last=0;frame=requestAnimationFrame(tick);}}
  function stop(){if(frame){cancelAnimationFrame(frame);frame=0;}}

  footer.addEventListener('pointermove',event=>{
    const rect=footer.getBoundingClientRect(),now=performance.now();
    // a fresh gesture starts the glow at the pointer instead of sliding in from the last spot
    if(strength===0){
      glow.x=event.clientX-rect.left;glow.y=event.clientY-rect.top;
      if(now-lastMove>=50)gestureStart=now;
    }
    target.x=event.clientX;target.y=event.clientY;lastMove=now;
  },{passive:true});
  // A resized canvas is cleared to black (alpha:false); repaint it in the same frame, on screen or not,
  // so the footer never shows a black panel before the next tick.
  new ResizeObserver(()=>{if(fit())draw();}).observe(footer);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;stop();});
  canvas.addEventListener('webglcontextrestored',()=>{lost=!build();if(!lost){draw();update(shown,still);}});

  // shown: footer on screen and tab visible; reduced: prefers-reduced-motion
  function update(show,reduced){
    shown=show;still=reduced;
    if(show&&!reduced)start();else stop();
    if(show&&reduced&&(fit()||!entry))paintEntry();
  }
  // Paint once now, so a jump straight to the footer never shows the blank (black) canvas.
  fit();paintEntry();
  return {update};
}
