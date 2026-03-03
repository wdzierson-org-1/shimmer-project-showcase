import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform vec3 uBgColor;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x_) - 0.5;
  vec3 ox = floor(x_ + 0.5);
  vec3 a0 = x_ - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float figure(vec2 uv, vec2 center, float t, float headDir, float scale) {
  vec2 p = (uv - center) / scale;
  p = rot(t * 0.15 + snoise(vec2(t * 0.1)) * 0.4) * p;
  p.x *= 0.7;
  p.y *= 1.1;

  float n = snoise(p * 1.5 + t * 0.3) * 0.12;
  float n2 = snoise(p * 2.5 - t * 0.2 + 40.0) * 0.06;
  p += vec2(n, n2);

  float dist = length(p);
  float dirBias = dot(normalize(p + 0.001), vec2(cos(headDir), sin(headDir)));
  float tailFade = smoothstep(-0.6, 0.8, dirBias);

  float angle = atan(p.y, p.x);
  float baseRadius = 0.32 + 0.04 * sin(angle * 2.0 + t * 0.5) + 0.03 * sin(angle * 3.0 - t * 0.3);
  float radius = baseRadius + tailFade * 0.15;
  float edgeWidth = mix(0.08, 0.22, tailFade);
  float shape = smoothstep(radius, radius - edgeWidth, dist);
  shape *= mix(1.0, 0.35, tailFade * tailFade);

  return shape;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 st = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.08;

  vec2 c1 = vec2(aspect * 0.52, 0.44);
  float fig1 = figure(st, c1, t, 2.5, 0.9);

  vec2 c1b = c1 + vec2(0.02 * sin(t), 0.03 * cos(t * 0.7));
  float fold1 = figure(st, c1b, t + 1.5, 1.0, 0.65);

  vec2 c2 = vec2(aspect * 0.68, 0.28);
  float fig2 = figure(st, c2, t * 0.8 + 3.0, -1.0, 0.55);

  // Derive full palette from the 3 uniform colors
  vec3 warmCore   = uColorA;
  vec3 warmLight  = min(uColorA * 1.2, vec3(1.0));
  vec3 coolMid    = uColorB;
  vec3 deepMid    = uColorB * 0.55;
  vec3 accentEdge = uColorC;
  vec3 softTint   = mix(uColorB, uBgColor, 0.45);
  vec3 secAccent  = mix(uColorA, uColorB, 0.5);

  float cn1 = snoise(st * 2.0 + t * 0.25);
  float cn2 = snoise(st * 2.8 - t * 0.3 + 20.0);
  float cn3 = snoise(st * 1.6 + t * 0.15 + 50.0);

  vec2 fromCenter1 = st - c1;
  float radialPos = length(fromCenter1) * 3.0;

  vec3 col1 = mix(warmCore, warmLight, smoothstep(-0.3, 0.4, cn1));
  col1 = mix(col1, coolMid, smoothstep(0.3, 0.8, radialPos + cn2 * 0.3));
  col1 = mix(col1, accentEdge, smoothstep(0.6, 1.1, radialPos + cn3 * 0.2));

  vec3 foldCol = mix(deepMid, coolMid, smoothstep(-0.2, 0.5, cn1));
  foldCol = mix(foldCol, warmCore * 0.7, smoothstep(0.0, 0.6, cn2) * 0.3);

  vec3 col2 = mix(softTint, secAccent, smoothstep(-0.3, 0.5, cn2));
  col2 = mix(col2, mix(accentEdge, uBgColor, 0.4), smoothstep(-0.1, 0.6, cn3) * 0.5);

  vec3 color = uBgColor;
  color = mix(color, col2, fig2 * 0.45);
  color = mix(color, foldCol, fold1 * 0.5);
  color = mix(color, col1, fig1);

  float crease = fig1 * fold1;
  color = mix(color, deepMid * 0.5, crease * 0.3);

  float totalShape = max(fig1, max(fold1 * 0.6, fig2 * 0.35));

  // Grain — scale down on dark backgrounds to avoid static look
  vec2 grainUv = gl_FragCoord.xy / uPixelRatio;
  float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
  float grainAnim = fract(sin(dot(grainUv + uTime * 0.08, vec2(12.9898, 78.233))) * 43758.5453);
  float g = mix(grain, grainAnim, 0.25);

  float bgLum = dot(uBgColor, vec3(0.299, 0.587, 0.114));
  float grainStrength = mix(0.012, 0.10, totalShape) * mix(0.6, 1.0, bgLum);
  color += (g - 0.5) * grainStrength;

  gl_FragColor = vec4(color, 1.0);
}
`;

interface GradientBlobProps {
  className?: string;
  bgColor?: [number, number, number];
  colorA?: [number, number, number];
  colorB?: [number, number, number];
  colorC?: [number, number, number];
}

const GradientBlob = ({
  className,
  bgColor = [0.965, 0.955, 0.935],
  colorA = [0.93, 0.36, 0.10],
  colorB = [0.50, 0.20, 0.80],
  colorC = [0.20, 0.35, 0.92],
}: GradientBlobProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    if (!materialRef.current) return;
    const u = materialRef.current.uniforms;
    u.uBgColor.value.set(...bgColor);
    u.uColorA.value.set(...colorA);
    u.uColorB.value.set(...colorB);
    u.uColorC.value.set(...colorC);
  }, [bgColor, colorA, colorB, colorC]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2() },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uBgColor: { value: new THREE.Vector3(...bgColor) },
        uColorA: { value: new THREE.Vector3(...colorA) },
        uColorB: { value: new THREE.Vector3(...colorB) },
        uColorC: { value: new THREE.Vector3(...colorC) },
      },
    });
    materialRef.current = material;

    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      material.uniforms.uResolution.value.set(w, h);
    };
    resize();
    window.addEventListener('resize', resize);

    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; },
      { threshold: 0 }
    );
    observer.observe(canvas);

    const t0 = performance.now();
    let lastFrame = 0;
    const interval = 1000 / 30;
    const animate = (now: number) => {
      frameRef.current = requestAnimationFrame(animate);
      if (!isVisible || now - lastFrame < interval) return;
      lastFrame = now;
      material.uniforms.uTime.value = (performance.now() - t0) * 0.001;
      renderer.render(scene, camera);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      materialRef.current = null;
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default GradientBlob;
