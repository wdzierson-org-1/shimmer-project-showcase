import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Particle grid config ─────────────────────────────────────
const COLS          = 220;
const ROWS          = 110;
const REPEL_RADIUS  = 0.40;   // world-space units
const REPEL_STRENGTH = 0.70;
const NOISE_SCALE   = 0.75;
const NOISE_SPEED   = 0.30;
const POINT_SIZE    = 4.5;     // base CSS-equivalent px (multiplied by pixelRatio in shader)

// ─── GLSL: Stefan Gustavson simplex noise (3D, public domain) ─
const SIMPLEX_GLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
   +i.y+vec4(0.,i1.y,i2.y,1.))
   +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// ─── HSL→RGB helper ───────────────────────────────────────────
const HSL_GLSL = `
vec3 hsl2rgb(float h,float s,float l){
  vec3 rgb=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
  return l+s*(rgb-.5)*(1.-abs(2.*l-1.));
}`;

// ─── Vertex shader ────────────────────────────────────────────
const VERT = `
${SIMPLEX_GLSL}

uniform float uTime;
uniform vec2  uMouse;
uniform float uRepelRadius;
uniform float uRepelStrength;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uPointSize;
uniform float uPixelRatio;

varying float vZ;
varying float vRepel;

void main(){
  // Ambient noise wave
  float wave = snoise(vec3(position.xy * uNoiseScale, uTime * uNoiseSpeed)) * 0.30;

  // Secondary smaller noise layer for complexity
  float detail = snoise(vec3(position.xy * uNoiseScale * 2.8, uTime * uNoiseSpeed * 1.6)) * 0.10;

  // Cursor repulsion
  vec2 toMouse = position.xy - uMouse;
  float d = length(toMouse);
  float repel = smoothstep(uRepelRadius, 0.0, d) * uRepelStrength;

  float z = wave + detail + repel;
  vZ = z;
  vRepel = repel;

  vec4 mvPos = modelViewMatrix * vec4(position.xy, z, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // Fixed screen-space size — no perspective division so particles stay consistent
  // Enlarged near cursor for tactile feel
  gl_PointSize = (uPointSize + repel * 8.0) * uPixelRatio;
}`;

// ─── Fragment shader ──────────────────────────────────────────
const FRAG = `
${HSL_GLSL}

uniform float uTime;
varying float vZ;
varying float vRepel;

void main(){
  // Disc clip
  vec2 coord = gl_PointCoord - 0.5;
  float r = length(coord);
  if(r > 0.5) discard;

  // Iridescent hue: Z displacement drives hue rotation + slow time drift
  float hue = fract(vZ * 2.2 + uTime * 0.06);
  float sat = 0.80 + vRepel * 0.15;
  float lit = 0.52 + vZ * 0.15;
  vec3 col = hsl2rgb(hue, sat, clamp(lit, 0.35, 0.75));

  // Soft disc edge
  float alpha = smoothstep(0.5, 0.12, r) * (0.80 + vRepel * 0.18);
  gl_FragColor = vec4(col, alpha);
}`;

// ─── Component ────────────────────────────────────────────────
export default function HeroBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(mount.offsetWidth, mount.offsetHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.opacity = '0.50';
    renderer.domElement.style.pointerEvents = 'none';
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────
    const scene  = new THREE.Scene();
    const aspect = mount.offsetWidth / mount.offsetHeight;
    const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    camera.position.z = 2.0;

    // ── Particle geometry ─────────────────────────────────────
    const total = COLS * ROWS;
    const positions = new Float32Array(total * 3);

    // Grid spans [-aspect, aspect] × [-1, 1]
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const idx = (row * COLS + col) * 3;
        positions[idx]     = (col / (COLS - 1) * 2 - 1) * aspect;
        positions[idx + 1] = (row / (ROWS - 1) * 2 - 1);
        positions[idx + 2] = 0;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // ── Material ──────────────────────────────────────────────
    const mouseWorld = new THREE.Vector2(9999, 9999); // off-screen initially
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime:          { value: 0 },
        uMouse:         { value: mouseWorld },
        uRepelRadius:   { value: REPEL_RADIUS },
        uRepelStrength: { value: REPEL_STRENGTH },
        uNoiseScale:    { value: NOISE_SCALE },
        uNoiseSpeed:    { value: NOISE_SPEED },
        uPointSize:     { value: POINT_SIZE },
        uPixelRatio:    { value: Math.min(window.devicePixelRatio, 2) },
      },
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── Mouse → world-space ───────────────────────────────────
    const ndc    = new THREE.Vector3();
    const plane  = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const ray    = new THREE.Raycaster();
    const target = new THREE.Vector3();

    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width)  *  2 - 1,
        -((e.clientY - rect.top)  / rect.height) *  2 + 1,
        0.5,
      );
      ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
      ray.ray.intersectPlane(plane, target);
      mouseWorld.set(target.x, target.y);
    };
    document.addEventListener('mousemove', onMouseMove, { passive: true });

    // ── Resize ────────────────────────────────────────────────
    const onResize = () => {
      const w = mount.offsetWidth, h = mount.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Rebuild geometry so grid stays square to viewport
      const newAspect = w / h;
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          const idx = (row * COLS + col) * 3;
          positions[idx] = (col / (COLS - 1) * 2 - 1) * newAspect;
        }
      }
      geometry.attributes.position.needsUpdate = true;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // ── RAF loop ──────────────────────────────────────────────
    let raf = 0;
    const clock = new THREE.Clock();

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) return;
      material.uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('mousemove', onMouseMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}
