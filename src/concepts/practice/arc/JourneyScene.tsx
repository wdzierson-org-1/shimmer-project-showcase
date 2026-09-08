import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import AsciiScene, { type SceneHandle } from './AsciiScene';
import { CHAPTER_SECONDS, chapterAt } from './story';
import { CONTOURS, CONTOUR_STEPS, contourPoint, createJourneyShapes, hash, smooth } from './journeyField';

type Props = { onReady: (handle: SceneHandle) => void; onError: () => void };
const COLORS = ['#e9dec7', '#d7cde4', '#cbdde5', '#edc0a8', '#e7d9ba', '#ede0cf'];
const morphVertex = `
  attribute vec3 aTarget;
  attribute float aSeed;
  uniform float uMix;
  uniform float uTime;
  uniform float uChapter;
  float blend() { return smoothstep(aSeed * .22, .76 + aSeed * .24, uMix); }
  vec3 form(float m) {
    vec3 p = mix(position, aTarget, m);
    float travel = sin(m * 3.14159265);
    p += vec3(sin(aSeed * 37.0 + uTime * .16), cos(aSeed * 23.0), sin(aSeed * 19.0)) * travel * .28;
    if (uChapter > 2.5 && uChapter < 3.5) p *= 1.0 + pow(max(0.0, sin(uTime * 3.8)), 14.0) * .018;
    return p;
  }
`;
const pointVertex = morphVertex + `
  attribute vec3 aNormal;
  attribute vec3 aTargetNormal;
  attribute float aWeight;
  attribute float aTargetWeight;
  uniform float uPointSize;
  varying float vLight;
  varying float vGlyph;
  varying float vAlpha;
  varying float vWarm;
  varying float vSpark;
  void main() {
    float m = blend();
    vec3 p = form(m);
    vec3 n = normalize(normalMatrix * mix(aNormal, aTargetNormal, m) + vec3(.0001));
    float facing = smoothstep(-.25, .5, n.z);
    if (n.z < 0.0) n = -n;
    float diffuse = max(0.0, dot(n, normalize(vec3(-.5,.65,1.0))));
    float rim = pow(1.0 - abs(n.z), 3.0);
    float weight = mix(aWeight, aTargetWeight, m);
    vLight = clamp((.2 + diffuse * .72 + rim * .28) * weight, 0.0, 1.0);
    // Keep the surface legible throughout each form; only a few points become firefly highlights.
    float shimmer = .9 + .1 * sin(uTime * .6 + aSeed * 97.0);
    vAlpha = (.55 + facing * .4) * min(1.0, weight * 1.4) * shimmer;
    vSpark = step(.976, aSeed);
    vGlyph = floor(clamp(vLight * 8.0 + aSeed * 2.0, 0.0, 9.0));
    vWarm = pow(max(0.0, cos(p.y * 1.8 + p.x - uTime * .42)), 18.0) * .48;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uPointSize * (1.0 + vSpark * .65) * (5.4 / -mv.z), 1.0, 16.0);
  }
`;
const pointFragment = `
  uniform sampler2D uAtlas;
  uniform vec3 uColor;
  varying float vLight;
  varying float vGlyph;
  varying float vAlpha;
  varying float vWarm;
  varying float vSpark;
  void main() {
    vec2 uv = vec2((vGlyph + gl_PointCoord.x) / 10.0, 1.0 - gl_PointCoord.y);
    float mask = texture2D(uAtlas, uv).a;
    float r = length(gl_PointCoord - .5);
    float glow = exp(-r * r * 110.0) + exp(-r * r * 17.0) * .12;
    float surface = mix(mask, glow, vSpark);
    float alpha = surface * vAlpha * (.3 + vLight * .7);
    if (alpha < .008) discard;
    vec3 ink = mix(uColor * (.68 + vLight * .38), vec3(1.0,.86,.63), max(vWarm, vSpark * .7));
    gl_FragColor = vec4(ink, alpha);
    #include <colorspace_fragment>
  }
`;
const lineVertex = morphVertex + `
  attribute float aProgress;
  varying float vProgress;
  varying float vSeed;
  void main() {
    float m = smoothstep(0.0, 1.0, uMix);
    vec3 p = form(m);
    if (uChapter > 2.5 && uChapter < 3.5 && aSeed < .25) {
      float phase = aSeed * 48.0 * .14;
      p.y += (sin(p.x * 18.0 - uTime * 2.2 + phase) - sin(p.x * 18.0 + phase)) * exp(-p.x * p.x * 2.8) * .15 * m;
    }
    vProgress = aProgress; vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const lineFragment = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vProgress;
  varying float vSeed;
  void main() {
    float distance = abs(fract(vProgress - uTime * .065 + vSeed * .9) - .5);
    float signal = 1.0 - smoothstep(.0, .04, distance);
    vec3 ink = mix(uColor, vec3(1.0,.84,.65), signal * .7);
    gl_FragColor = vec4(ink, uOpacity * (.35 + signal * 1.3));
    #include <colorspace_fragment>
  }
`;

function WebGLJourney({ onReady, onError }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { onError(); return; }
    const resources: { dispose: () => void }[] = [];
    let disposed = false;
    let last = 0, lastDrawn = -Infinity, frozen = false, activeChapter = -1;
    const pixelRatio = Math.min(devicePixelRatio, 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x39324c, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 30);
    camera.position.set(0, 0, 5.8);
    const sculpture = new THREE.Group(); scene.add(sculpture);
    let observer: ResizeObserver | undefined;
    const lost = (event: Event) => { event.preventDefault(); onError(); };
    const dispose = () => {
      disposed = true; observer?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      resources.forEach(resource => resource.dispose());
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
    try {
      // Everything is sampled once. Per-frame work is uniforms; no particle simulation accumulates drift.
      const count = matchMedia('(max-width:800px)').matches ? 10500 : 22000;
      const shapes = createJourneyShapes(count);
      const seeds = Float32Array.from({ length: count }, (_, i) => hash(i));
      const scatter = Float32Array.from({ length: count * 3 }, (_, i) => {
        const k = Math.floor(i / 3), axis = i % 3;
        return (hash(k * 3 + axis + 700) - .5) * (axis === 2 ? 3.4 : 4.2);
      });
      const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 48;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Glyph atlas unavailable');
      context.font = '32px monospace'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = '#fff';
      Array.from('.:-=+*xo#@').forEach((glyph, i) => context.fillText(glyph, i * 40 + 20, 24));
      const atlas = new THREE.CanvasTexture(canvas); atlas.minFilter = THREE.LinearFilter; atlas.generateMipmaps = false;
      resources.push(atlas);
      const uniforms = {
        uMix: { value: 0 }, uTime: { value: 0 }, uChapter: { value: 0 },
        uPointSize: { value: 4.4 * pixelRatio }, uAtlas: { value: atlas }, uColor: { value: new THREE.Color(COLORS[0]) },
      };
      const pointsGeometry = new THREE.BufferGeometry(); resources.push(pointsGeometry);
      const attribute = (name: string, data: Float32Array, size: number) => {
        const existing = pointsGeometry.getAttribute(name) as THREE.BufferAttribute | undefined;
        if (existing) { existing.copyArray(data); existing.needsUpdate = true; }
        else pointsGeometry.setAttribute(name, new THREE.BufferAttribute(data.slice(), size));
      };
      attribute('position', scatter, 3); attribute('aTarget', shapes[0].positions, 3);
      attribute('aNormal', shapes[0].normals, 3); attribute('aTargetNormal', shapes[0].normals, 3);
      attribute('aWeight', shapes[0].weights, 1); attribute('aTargetWeight', shapes[0].weights, 1); attribute('aSeed', seeds, 1);
      const pointsMaterial = new THREE.ShaderMaterial({ uniforms, vertexShader: pointVertex, fragmentShader: pointFragment, transparent: true, depthWrite: false });
      resources.push(pointsMaterial);
      const points = new THREE.Points(pointsGeometry, pointsMaterial); points.frustumCulled = false; sculpture.add(points);

      const vertexCount = CONTOURS * CONTOUR_STEPS * 2;
      const progress = new Float32Array(vertexCount), lineSeeds = new Float32Array(vertexCount);
      const contourFrames = shapes.map((_, stage) => {
        const array = new Float32Array(vertexCount * 3);
        for (let line = 0; line < CONTOURS; line++) for (let step = 0; step < CONTOUR_STEPS; step++) for (let end = 0; end < 2; end++) {
          const index = (line * CONTOUR_STEPS + step) * 2 + end, u = (step + end) / CONTOUR_STEPS;
          array.set(contourPoint(stage, line, u, 0), index * 3);
          progress[index] = u; lineSeeds[index] = line / CONTOURS;
        }
        return array;
      });
      const linesGeometry = new THREE.BufferGeometry(); resources.push(linesGeometry);
      linesGeometry.setAttribute('position', new THREE.BufferAttribute(contourFrames[0].slice(), 3));
      linesGeometry.setAttribute('aTarget', new THREE.BufferAttribute(contourFrames[0].slice(), 3));
      linesGeometry.setAttribute('aSeed', new THREE.BufferAttribute(lineSeeds, 1));
      linesGeometry.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1));
      const lineUniforms = { uMix: uniforms.uMix, uTime: uniforms.uTime, uChapter: uniforms.uChapter, uColor: uniforms.uColor, uOpacity: { value: .25 } };
      const linesMaterial = new THREE.ShaderMaterial({ uniforms: lineUniforms, vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false });
      resources.push(linesMaterial);
      const lines = new THREE.LineSegments(linesGeometry, linesMaterial); lines.frustumCulled = false; sculpture.add(lines);

      const colorA = new THREE.Color(), colorB = new THREE.Color();

      function render(seconds: number, still = false) {
        if (disposed) return;
        last = seconds; frozen = still;
        if (!still && seconds > lastDrawn && seconds - lastDrawn < 1 / 30 - .001) return;
        lastDrawn = seconds;
        const chapter = chapterAt(seconds), previous = Math.max(0, chapter - 1), local = seconds - chapter * CHAPTER_SECONDS;
        const time = still ? chapter * CHAPTER_SECONDS + 4 : seconds;
        if (activeChapter !== chapter) {
          activeChapter = chapter;
          const from = shapes[previous], to = shapes[chapter];
          attribute('position', chapter === 0 ? scatter : from.positions, 3);
          attribute('aTarget', to.positions, 3);
          attribute('aNormal', from.normals, 3); attribute('aTargetNormal', to.normals, 3);
          attribute('aWeight', from.weights, 1); attribute('aTargetWeight', to.weights, 1);
          for (const [name, frame] of [['position', previous], ['aTarget', chapter]] as const) {
            const buffer = linesGeometry.getAttribute(name) as THREE.BufferAttribute;
            buffer.copyArray(contourFrames[frame]); buffer.needsUpdate = true;
          }
          host.dataset.form = String(chapter);
        }
        uniforms.uMix.value = still ? 1 : Math.min(1, local / 2.6);
        uniforms.uTime.value = time; uniforms.uChapter.value = chapter;
        colorA.set(COLORS[previous]); colorB.set(COLORS[chapter]);
        uniforms.uColor.value.copy(colorA).lerp(colorB, smooth(uniforms.uMix.value));
        lineUniforms.uOpacity.value = chapter === 4 ? .65 : chapter === 5 ? .32 : .2;
        sculpture.rotation.set(Math.sin(time * .09) * .08 - .06, Math.sin(time * .12) * .19 - .16, Math.sin(time * .07) * .035);
        sculpture.position.y = Math.sin(time * .22) * .025;
        renderer.render(scene, camera);
      }
      const resize = () => {
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height); camera.aspect = width / height;
        camera.position.z = camera.aspect < .9 ? 6.7 : 5.8;
        camera.updateProjectionMatrix();
        uniforms.uPointSize.value = (width < 500 ? 3.3 : 4.4) * pixelRatio;
        lastDrawn = -Infinity; render(last, frozen);
      };
      renderer.debug.onShaderError = () => onError();
      renderer.domElement.addEventListener('webglcontextlost', lost);
      observer = new ResizeObserver(resize); observer.observe(host); resize();
      onReady({ render });
    } catch { dispose(); onError(); return; }
    return dispose;
  }, [onReady, onError]);
  return <div className="arc-canvas arc-field" ref={mount} aria-hidden="true"/>;
}

/** The detailed canvas renderer preserves the illuminated surface when WebGL is unavailable. */
export default function JourneyScene(props: Props) {
  const [fallback, setFallback] = useState(false);
  const useFallback = useCallback(() => setFallback(true), []);
  return fallback ? <AsciiScene {...props} fireflies/> : <WebGLJourney onReady={props.onReady} onError={useFallback}/>;
}
