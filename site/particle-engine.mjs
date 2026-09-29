// Shared by the About film (about-film.mjs) and the field log (field-log.mjs): easing, seeded randoms,
// eased paths, caption word splitting, and the WebGL2 renderer that draws a particle buffer.
// Particle buffer: 6 floats per point: stage x, y (1920 x 1080), brightness, amber mix, white mix, size.
// look: {TRAIL, POINT_SIZE, BLOOM, EXPOSURE, GRAIN, VIGNETTE, GREEN, AMBER, PAPER, INK}, read every frame.
// Pipeline per frame: particles -> additive gaussian points into a half-float target that keeps the
// last frame times TRAIL^(dt*60) (gain 1-k, so steady brightness does not depend on trail length) ->
// separable blur at 1/4 and 1/8 size -> tone-mapped composite with grain and vignette.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
export const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); }, eo = x => { x = clamp(x); return 1 - (1 - x) ** 3; };
export const ei = x => { x = clamp(x); return x * x * x; }, eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; };
export function backOut(x, c1) { if (x <= 0) return 0; if (x >= 1) return 1; const c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; }
export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// Eased path through [t, x, y] keys, memoised per t (every particle of a frame asks at the same t).
export function path(keys) {
  let lt = NaN; const o = {x: keys[0][1], y: keys[0][2]};
  return t => {
    if (t === lt) return o; lt = t;
    if (t <= keys[0][0]) { o.x = keys[0][1]; o.y = keys[0][2]; return o; }
    for (let j = 1; j < keys.length; j++) { const b = keys[j]; if (t < b[0]) { const a = keys[j - 1], u = eio((t - a[0]) / (b[0] - a[0])); o.x = lerp(a[1], b[1], u); o.y = lerp(a[2], b[2], u); return o; } }
    const z = keys[keys.length - 1]; o.x = z[1]; o.y = z[2]; return o;
  };
}
export function rectPt(u, x0, y0, x1, y1) { const w = x1 - x0, h = y1 - y0, p = 2 * (w + h); u = (u % 1 + 1) % 1 * p; if (u < w) return [x0 + u, y0]; u -= w; if (u < h) return [x1, y0 + u]; u -= h; if (u < w) return [x1 - u, y1]; u -= w; return [x0, y1 - u]; }
export function splitWords(el) {
  const out = [];
  const walk = n => { for (const c of [...n.childNodes]) { if (c.nodeType === 3) { const fr = document.createDocumentFragment(); for (const p of c.textContent.split(/(\s+)/)) { if (!p) continue; if (/^\s+$/.test(p)) fr.append(p); else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; out.push(s); fr.append(s); } } c.replaceWith(fr); } else walk(c); } };
  walk(el); return out;
}

// ---- WebGL2
const FS_VS = `#version 300 es
out vec2 v;void main(){vec2 p=vec2(gl_VertexID==1?3.:-1.,gl_VertexID==2?3.:-1.);v=p*.5+.5;gl_Position=vec4(p,0,1);}`;
const SHADERS = {
  pv: `#version 300 es
layout(location=0) in vec4 a_p;layout(location=1) in vec2 a_q;uniform float u_px,u_ps,u_gain;uniform vec3 u_view;uniform vec2 u_size;uniform vec3 u_g,u_am,u_pa;out vec3 vc;
void main(){vec2 q=(a_p.xy*u_view.x+u_view.yz)/u_size;gl_Position=vec4(q.x*2.-1.,1.-q.y*2.,0,1);gl_PointSize=a_p.z>.002?max(1.5,a_q.y*u_ps*u_px):0.;vc=mix(mix(u_g,u_am,clamp(a_p.w,0.,1.)),u_pa,clamp(a_q.x,0.,1.))*a_p.z*u_gain;}`,
  pf: `#version 300 es
precision highp float;in vec3 vc;out vec4 o;void main(){float d=length(gl_PointCoord-.5)*2.;o=vec4(vc*exp(-d*d*3.5)*step(d,1.),1);}`,
  decay: `#version 300 es
precision highp float;uniform sampler2D u_t;uniform float u_k;in vec2 v;out vec4 o;void main(){o=texture(u_t,v)*u_k;}`,
  blur: `#version 300 es
precision highp float;uniform sampler2D u_t;uniform vec2 u_d;in vec2 v;out vec4 o;
void main(){vec4 c=texture(u_t,v)*.227027;c+=(texture(u_t,v+u_d*1.384615)+texture(u_t,v-u_d*1.384615))*.316216;c+=(texture(u_t,v+u_d*3.230769)+texture(u_t,v-u_d*3.230769))*.070270;o=c;}`,
  comp: `#version 300 es
precision highp float;uniform sampler2D u_a,u_b,u_c;uniform float u_bloom,u_exp,u_grain,u_vig,u_fade,u_time;uniform vec3 u_ink;uniform vec2 u_res;in vec2 v;out vec4 o;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 x=texture(u_a,v).rgb*u_exp+(texture(u_b,v).rgb+texture(u_c,v).rgb*.6)*u_bloom;vec3 m=1.-exp(-x*1.25);float l=max(max(x.r,x.g),x.b);m+=vec3(max(l-1.2,0.)*.12);
vec2 q=v-.5;vec3 col=(u_ink+m)*(1.-u_vig*dot(q,q)*2.2)*u_fade;col+=(h(floor(v*u_res)+fract(u_time)*97.)-.5)*u_grain;o=vec4(col,1);}`,
};
export function renderer(canvas, buf, look) {
  const gl = canvas.getContext('webgl2', {antialias: false, alpha: false, premultipliedAlpha: false});
  if (!gl) return null;
  const HF = !!gl.getExtension('EXT_color_buffer_float');
  const shd = (ty, s) => { const x = gl.createShader(ty); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
  const prog = (vs, fs) => {
    const p = gl.createProgram(); gl.attachShader(p, shd(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shd(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (let j = 0; j < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); j++) { const a = gl.getActiveUniform(p, j); u[a.name] = gl.getUniformLocation(p, a.name); } return {p, u};
  };
  const PP = prog(SHADERS.pv, SHADERS.pf), PD = prog(FS_VS, SHADERS.decay), PB = prog(FS_VS, SHADERS.blur), PC = prog(FS_VS, SHADERS.comp);
  const vaoFs = gl.createVertexArray(), vaoPts = gl.createVertexArray(), vbo = gl.createBuffer();
  gl.bindVertexArray(vaoPts); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, buf.byteLength, gl.DYNAMIC_DRAW);
  const count = buf.length / 6;
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 24, 16); gl.bindVertexArray(null);
  const target = (w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, HF ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, HF ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return {t, f, w, h};
  };
  let cw = 0, ch = 0, acc = [], q1, q2, e1, e2, cur = 0, reset = true, view = [1, 0, 0];
  const pass = (P, dst, src, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f : null); gl.viewport(0, 0, dst ? dst.w : cw, dst ? dst.h : ch); gl.useProgram(P.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t); set(); gl.bindVertexArray(vaoFs); gl.drawArrays(gl.TRIANGLES, 0, 3); };
  const blur = (d, s, x, y) => pass(PB, d, s, () => { gl.uniform1i(PB.u.u_t, 0); gl.uniform2f(PB.u.u_d, x / s.w, y / s.h); });
  return {
    reset() { reset = true; },
    // Stage-to-canvas mapping in device pixels: scale, then the offset of the letterboxed stage.
    view(s, ox, oy) { view = [s, ox, oy]; },
    size(w, h) {
      if (w === cw && h === ch) return; cw = canvas.width = w; ch = canvas.height = h;
      for (const o of [...acc, q1, q2, e1, e2]) if (o) { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); }
      acc = [target(w, h), target(w, h)]; q1 = target(w >> 2 || 1, h >> 2 || 1); q2 = target(w >> 2 || 1, h >> 2 || 1); e1 = target(w >> 3 || 1, h >> 3 || 1); e2 = target(w >> 3 || 1, h >> 3 || 1); reset = true;
    },
    draw(t, dtF, fade) {
      if (!cw) return;
      const {TRAIL, POINT_SIZE, BLOOM, EXPOSURE, GRAIN, VIGNETTE, GREEN, AMBER, PAPER, INK} = look;
      const k = Math.pow(TRAIL, Math.max(.2, dtF)), A = acc[cur], B = acc[1 - cur]; gl.disable(gl.BLEND);
      if (reset) { gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.viewport(0, 0, cw, ch); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
      else pass(PD, A, B, () => { gl.uniform1i(PD.u.u_t, 0); gl.uniform1f(PD.u.u_k, k); });
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.viewport(0, 0, cw, ch); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(PP.p);
      gl.uniform1f(PP.u.u_px, view[0]); gl.uniform3fv(PP.u.u_view, view); gl.uniform2f(PP.u.u_size, cw, ch); gl.uniform1f(PP.u.u_ps, POINT_SIZE); gl.uniform1f(PP.u.u_gain, reset ? 1 : 1 - k);
      gl.uniform3fv(PP.u.u_g, GREEN); gl.uniform3fv(PP.u.u_am, AMBER); gl.uniform3fv(PP.u.u_pa, PAPER);
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf); gl.bindVertexArray(vaoPts); gl.drawArrays(gl.POINTS, 0, count); gl.disable(gl.BLEND);
      reset = false; cur = 1 - cur;
      blur(q1, A, 1.5, 0); blur(q2, q1, 0, 1.5); blur(e1, q2, 1.5, 0); blur(e2, e1, 0, 1.5);
      pass(PC, null, A, () => {
        gl.uniform1i(PC.u.u_a, 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, q2.t); gl.uniform1i(PC.u.u_b, 1); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, e2.t); gl.uniform1i(PC.u.u_c, 2);
        gl.uniform1f(PC.u.u_bloom, BLOOM); gl.uniform1f(PC.u.u_exp, EXPOSURE); gl.uniform1f(PC.u.u_grain, GRAIN); gl.uniform1f(PC.u.u_vig, VIGNETTE);
        gl.uniform1f(PC.u.u_fade, fade); gl.uniform1f(PC.u.u_time, t); gl.uniform3fv(PC.u.u_ink, INK); gl.uniform2f(PC.u.u_res, cw, ch);
      });
    },
  };
}
