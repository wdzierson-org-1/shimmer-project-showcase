import { useEffect, useRef } from 'react';

// ─── Simulation config ────────────────────────────────────────
const SIM_RES   = 128;
const DYE_RES   = 512;
const P_ITERS   = 20;
const CURL      = 10;
const SPLAT_R   = 0.0015;
const SPLAT_FORCE = 5000;
const VEL_DIS   = 0.98;
const DYE_DIS   = 0.994;
const PRES_DIS  = 0.8;
const DT        = 0.016;

// Full-spectrum iridescent palette — hues cycle through the rainbow
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

// ─── GLSL ─────────────────────────────────────────────────────
const BASE_VERT = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform vec2 texelSize;
void main(){
  vUv=aPos*.5+.5;
  vL=vUv-vec2(texelSize.x,0.);
  vR=vUv+vec2(texelSize.x,0.);
  vT=vUv+vec2(0.,texelSize.y);
  vB=vUv-vec2(0.,texelSize.y);
  gl_Position=vec4(aPos,0.,1.);
}`;

const ADVECT_F = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform float dt;
uniform float dissipation;
void main(){
  vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy;
  gl_FragColor=dissipation*texture2D(uSource,coord);
}`;

const DIV_F = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;
uniform sampler2D uVelocity;
void main(){
  float L=texture2D(uVelocity,vL).x;
  float R=texture2D(uVelocity,vR).x;
  float T=texture2D(uVelocity,vT).y;
  float B=texture2D(uVelocity,vB).y;
  gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.);
}`;

const CURL_F = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;
uniform sampler2D uVelocity;
void main(){
  float L=texture2D(uVelocity,vL).y;
  float R=texture2D(uVelocity,vR).y;
  float T=texture2D(uVelocity,vT).x;
  float B=texture2D(uVelocity,vB).x;
  gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.);
}`;

const VORT_F = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;
uniform sampler2D uCurl;
uniform sampler2D uVelocity;
uniform float curlStr;
uniform float dt;
void main(){
  float L=texture2D(uCurl,vL).x;
  float R=texture2D(uCurl,vR).x;
  float T=texture2D(uCurl,vT).x;
  float B=texture2D(uCurl,vB).x;
  float C=texture2D(uCurl,vUv).x;
  vec2 force=.5*vec2(abs(T)-abs(B),abs(R)-abs(L));
  force/=length(force)+.0001;
  force*=curlStr*C;
  force.y*=-1.;
  vec2 vel=texture2D(uVelocity,vUv).xy+force*dt;
  gl_FragColor=vec4(clamp(vel,-1000.,1000.),0.,1.);
}`;

const PRES_F = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform float dis;
void main(){
  float L=texture2D(uPressure,vL).x;
  float R=texture2D(uPressure,vR).x;
  float T=texture2D(uPressure,vT).x;
  float B=texture2D(uPressure,vB).x;
  float C=texture2D(uDivergence,vUv).x;
  gl_FragColor=vec4(dis*((L+R+T+B-C)*.25),0.,0.,1.);
}`;

const GRAD_F = `
precision highp float;
varying vec2 vUv;
varying vec2 vL;varying vec2 vR;varying vec2 vT;varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
void main(){
  float L=texture2D(uPressure,vL).x;
  float R=texture2D(uPressure,vR).x;
  float T=texture2D(uPressure,vT).x;
  float B=texture2D(uPressure,vB).x;
  vec2 vel=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B)*.5;
  gl_FragColor=vec4(vel,0.,1.);
}`;

const SPLAT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform vec2 point;
uniform vec3 color;
uniform float radius;
uniform float aspect;
void main(){
  vec2 p=vUv-point;
  p.x*=aspect;
  float splat=exp(-dot(p,p)/radius);
  vec3 base=texture2D(uTarget,vUv).xyz;
  gl_FragColor=vec4(base+splat*color,1.);
}`;

const DISPLAY_F = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTexture;
void main(){
  vec3 c=texture2D(uTexture,vUv).rgb;
  float a=clamp(length(c)*4.0,0.,1.);
  gl_FragColor=vec4(c,a);
}`;

// ─── WebGL helpers ────────────────────────────────────────────
function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

function makeProgram(gl: WebGLRenderingContext, fragSrc: string, texelW: number, texelH: number) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, BASE_VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const uniforms: Record<string, WebGLUniformLocation> = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i)!;
    uniforms[info.name] = gl.getUniformLocation(prog, info.name)!;
  }
  // bind default texelSize
  gl.useProgram(prog);
  if (uniforms.texelSize) gl.uniform2f(uniforms.texelSize, texelW, texelH);
  return { prog, uniforms };
}

interface FBO { tex: WebGLTexture; fbo: WebGLFramebuffer; }
interface DFBO { read: FBO; write: FBO; swap: () => void; }

function makeFBO(gl: WebGLRenderingContext, w: number, h: number, fmt: number, type: number, filter: number): FBO {
  gl.activeTexture(gl.TEXTURE0);
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, fmt, w, h, 0, fmt, type, null);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.viewport(0, 0, w, h);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { tex, fbo };
}

function makeDoubleFBO(gl: WebGLRenderingContext, w: number, h: number, fmt: number, type: number, filter: number): DFBO {
  let a = makeFBO(gl, w, h, fmt, type, filter);
  let b = makeFBO(gl, w, h, fmt, type, filter);
  return {
    get read() { return a; },
    get write() { return b; },
    swap() { [a, b] = [b, a]; },
  };
}

// Fullscreen quad
function makeQuad(gl: WebGLRenderingContext) {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  return buf;
}

function blit(gl: WebGLRenderingContext, target: WebGLFramebuffer | null, w: number, h: number) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target);
  gl.viewport(0, 0, w, h);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function bindTex(gl: WebGLRenderingContext, unit: number, tex: WebGLTexture) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
}

// ─── Component ────────────────────────────────────────────────
export default function FluidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5, dx: 0, dy: 0, moved: false });
  const palRef   = useRef(0);
  // Returns an iridescent color that slowly rotates through the full hue spectrum
  const nextColor = () => {
    const hue = (Date.now() * 0.0003) % 1;
    return hslToRgb(hue, 1.0, 0.60);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Size canvas to match its CSS dimensions
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false }) as WebGLRenderingContext | null;
    if (!gl) return;

    // Float texture extension (required for the simulation)
    const extFloat     = gl.getExtension('OES_texture_float');
    const extHalfFloat = gl.getExtension('OES_texture_half_float');
    if (!extFloat && !extHalfFloat) { ro.disconnect(); return; }

    const TYPE   = extFloat ? gl.FLOAT : (extHalfFloat as OES_texture_half_float).HALF_FLOAT_OES;
    const FILTER = extFloat ? gl.getExtension('OES_texture_float_linear') ? gl.LINEAR : gl.NEAREST
                            : gl.getExtension('OES_texture_half_float_linear') ? gl.LINEAR : gl.NEAREST;

    const simTW = 1 / SIM_RES, simTH = 1 / SIM_RES;
    const dyeTW = 1 / DYE_RES, dyeTH = 1 / DYE_RES;

    // Programs
    const advect   = makeProgram(gl, ADVECT_F,  simTW, simTH);
    const div_     = makeProgram(gl, DIV_F,     simTW, simTH);
    const curl_    = makeProgram(gl, CURL_F,    simTW, simTH);
    const vort     = makeProgram(gl, VORT_F,    simTW, simTH);
    const pres     = makeProgram(gl, PRES_F,    simTW, simTH);
    const grad     = makeProgram(gl, GRAD_F,    simTW, simTH);
    const splat_   = makeProgram(gl, SPLAT_FRAG, simTW, simTH);
    const display  = makeProgram(gl, DISPLAY_F, dyeTW, dyeTH);

    // FBOs
    const velocity   = makeDoubleFBO(gl, SIM_RES, SIM_RES, gl.RGBA, TYPE, gl.LINEAR);
    const dye        = makeDoubleFBO(gl, DYE_RES, DYE_RES, gl.RGBA, TYPE, FILTER);
    const pressure   = makeDoubleFBO(gl, SIM_RES, SIM_RES, gl.RGBA, TYPE, gl.NEAREST);
    const divergence = makeFBO(gl, SIM_RES, SIM_RES, gl.RGBA, TYPE, gl.NEAREST);
    const curlFBO    = makeFBO(gl, SIM_RES, SIM_RES, gl.RGBA, TYPE, gl.NEAREST);

    // Quad
    const quad = makeQuad(gl);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    // Link aPos attribute
    [advect, div_, curl_, vort, pres, grad, splat_, display].forEach(p => {
      const loc = gl.getAttribLocation(p.prog, 'aPos');
      if (loc >= 0) gl.bindAttribLocation(p.prog, loc, 'aPos');
    });

    function doSplat(x: number, y: number, dx: number, dy: number, col: number[]) {
      const aspect = canvas!.width / canvas!.height;
      // Velocity splat
      gl!.useProgram(splat_.prog);
      gl!.uniform1i(splat_.uniforms.uTarget, 0);
      gl!.uniform2f(splat_.uniforms.point, x, 1 - y);
      gl!.uniform3f(splat_.uniforms.color, dx * SPLAT_FORCE, -dy * SPLAT_FORCE, 0);
      gl!.uniform1f(splat_.uniforms.radius, SPLAT_R);
      gl!.uniform1f(splat_.uniforms.aspect, aspect);
      bindTex(gl!, 0, velocity.read.tex);
      blit(gl!, velocity.write.fbo, SIM_RES, SIM_RES);
      velocity.swap();

      // Dye splat
      gl!.uniform1i(splat_.uniforms.uTarget, 0);
      gl!.uniform3f(splat_.uniforms.color, col[0], col[1], col[2]);
      gl!.uniform1f(splat_.uniforms.radius, SPLAT_R * 3);
      bindTex(gl!, 0, dye.read.tex);
      blit(gl!, dye.write.fbo, DYE_RES, DYE_RES);
      dye.swap();
    }

    // Autonomous wind: periodic slow splats so canvas isn't static
    let autoTimer = 0;
    let autoX = 0.3, autoY = 0.5, autoAngle = 0;

    let raf = 0;
    function loop() {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;

      const m = mouseRef.current;

      // Autonomous swirl
      autoTimer += DT;
      if (autoTimer > 1.2) {
        autoTimer = 0;
        autoAngle += 0.8 + Math.random() * 0.5;
        autoX = 0.3 + Math.sin(autoAngle * 0.7) * 0.3;
        autoY = 0.4 + Math.cos(autoAngle * 0.5) * 0.25;
        const adx = Math.cos(autoAngle) * 0.003;
        const ady = Math.sin(autoAngle) * 0.003;
        doSplat(autoX, autoY, adx, ady, nextColor());
      }

      // User mouse splat
      if (m.moved) {
        doSplat(m.x, m.y, m.dx, m.dy, nextColor());
        palRef.current++;
        m.moved = false;
      }

      // 1. Advect velocity
      gl!.useProgram(advect.prog);
      if (advect.uniforms.texelSize) gl!.uniform2f(advect.uniforms.texelSize, simTW, simTH);
      gl!.uniform1i(advect.uniforms.uVelocity, 0);
      gl!.uniform1i(advect.uniforms.uSource, 0);
      gl!.uniform1f(advect.uniforms.dt, DT);
      gl!.uniform1f(advect.uniforms.dissipation, VEL_DIS);
      bindTex(gl!, 0, velocity.read.tex);
      blit(gl!, velocity.write.fbo, SIM_RES, SIM_RES);
      velocity.swap();

      // 2. Curl
      gl!.useProgram(curl_.prog);
      if (curl_.uniforms.texelSize) gl!.uniform2f(curl_.uniforms.texelSize, simTW, simTH);
      gl!.uniform1i(curl_.uniforms.uVelocity, 0);
      bindTex(gl!, 0, velocity.read.tex);
      blit(gl!, curlFBO.fbo, SIM_RES, SIM_RES);

      // 3. Vorticity
      gl!.useProgram(vort.prog);
      if (vort.uniforms.texelSize) gl!.uniform2f(vort.uniforms.texelSize, simTW, simTH);
      gl!.uniform1i(vort.uniforms.uCurl, 0);
      gl!.uniform1i(vort.uniforms.uVelocity, 1);
      gl!.uniform1f(vort.uniforms.curlStr, CURL);
      gl!.uniform1f(vort.uniforms.dt, DT);
      bindTex(gl!, 0, curlFBO.tex);
      bindTex(gl!, 1, velocity.read.tex);
      blit(gl!, velocity.write.fbo, SIM_RES, SIM_RES);
      velocity.swap();

      // 4. Divergence
      gl!.useProgram(div_.prog);
      if (div_.uniforms.texelSize) gl!.uniform2f(div_.uniforms.texelSize, simTW, simTH);
      gl!.uniform1i(div_.uniforms.uVelocity, 0);
      bindTex(gl!, 0, velocity.read.tex);
      blit(gl!, divergence.fbo, SIM_RES, SIM_RES);

      // 5. Pressure solve
      gl!.useProgram(pres.prog);
      if (pres.uniforms.texelSize) gl!.uniform2f(pres.uniforms.texelSize, simTW, simTH);
      gl!.uniform1f(pres.uniforms.dis, PRES_DIS);
      gl!.uniform1i(pres.uniforms.uDivergence, 1);
      bindTex(gl!, 1, divergence.tex);
      for (let i = 0; i < P_ITERS; i++) {
        gl!.uniform1i(pres.uniforms.uPressure, 0);
        bindTex(gl!, 0, pressure.read.tex);
        blit(gl!, pressure.write.fbo, SIM_RES, SIM_RES);
        pressure.swap();
      }

      // 6. Gradient subtract
      gl!.useProgram(grad.prog);
      if (grad.uniforms.texelSize) gl!.uniform2f(grad.uniforms.texelSize, simTW, simTH);
      gl!.uniform1i(grad.uniforms.uPressure, 0);
      gl!.uniform1i(grad.uniforms.uVelocity, 1);
      bindTex(gl!, 0, pressure.read.tex);
      bindTex(gl!, 1, velocity.read.tex);
      blit(gl!, velocity.write.fbo, SIM_RES, SIM_RES);
      velocity.swap();

      // 7. Advect dye
      gl!.useProgram(advect.prog);
      if (advect.uniforms.texelSize) gl!.uniform2f(advect.uniforms.texelSize, simTW, simTH);
      gl!.uniform1i(advect.uniforms.uVelocity, 0);
      gl!.uniform1i(advect.uniforms.uSource, 1);
      gl!.uniform1f(advect.uniforms.dissipation, DYE_DIS);
      bindTex(gl!, 0, velocity.read.tex);
      bindTex(gl!, 1, dye.read.tex);
      blit(gl!, dye.write.fbo, DYE_RES, DYE_RES);
      dye.swap();

      // 8. Display dye → canvas
      gl!.useProgram(display.prog);
      if (display.uniforms.texelSize) gl!.uniform2f(display.uniforms.texelSize, dyeTW, dyeTH);
      gl!.uniform1i(display.uniforms.uTexture, 0);
      bindTex(gl!, 0, dye.read.tex);
      gl!.enable(gl!.BLEND);
      gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);
      blit(gl!, null, canvas!.width, canvas!.height);
      gl!.disable(gl!.BLEND);
    }

    loop();

    // Mouse tracking
    const onMove = (e: MouseEvent) => {
      const rect = canvas!.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top)  / rect.height;
      const m = mouseRef.current;
      m.dx = nx - m.x; m.dy = ny - m.y;
      m.x = nx; m.y = ny;
      m.moved = true;
    };
    // Listen on document so fluid reacts even when hovering text (which has pointer-events)
    document.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: 0.48,
        mixBlendMode: 'soft-light',
        pointerEvents: 'none',
      }}
    />
  );
}
