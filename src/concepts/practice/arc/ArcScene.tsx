import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CHAPTER_SECONDS, chapterAt } from './story';

export type SceneHandle = { render: (seconds: number, still?: boolean) => void };
type Props = { onReady: (handle: SceneHandle) => void; onError: () => void };
const TAU = Math.PI * 2;
const STEPS = 240;
const COLORS = ['#b66a42', '#617d68', '#b29346'];
const smooth = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };

/** The same three physical strands change form; no scene cuts or stock models. */
function curve(stage: number, u: number, strand: number, t: number, out: THREE.Vector3) {
  const angle = u * TAU;
  const offset = strand - 1;
  switch (stage) {
    case 0: { // Rounded touch surfaces, separated in space like an exploded prototype.
      const c = Math.cos(angle), s = Math.sin(angle);
      out.set(Math.sign(c) * Math.pow(Math.abs(c), .42) * 1.3 + offset * .4,
        Math.sign(s) * Math.pow(Math.abs(s), .42) * 2.05 + offset * .15,
        offset * .66 + Math.sin(angle * 2 + t * .3) * .06);
      break;
    }
    case 1: { // An architectural stack: a system made legible as connected layers.
      const a = angle + Math.PI / 4;
      out.set(Math.cos(a) * 2.35, offset * .85 + Math.sin(a * 2) * .3,
        Math.sin(a) * 1.6);
      break;
    }
    case 2: { // Open strands gather around a shared center: the act of founding.
      const a = u * TAU * 1.45 + strand * TAU / 3;
      const r = .45 + u * 1.65;
      out.set(Math.cos(a) * r, (u - .5) * 3.8, Math.sin(a) * r);
      break;
    }
    case 3: { // A dimensional, breathing voice waveform.
      const x = (u - .5) * 5.6;
      const envelope = Math.pow(Math.sin(Math.PI * u), 2);
      out.set(x, Math.sin(u * TAU * 2.4 - t * 1.6 + strand * .7) * envelope * 1.22 + offset * .28,
        Math.cos(u * TAU * 1.3 - t * .65 + strand * .8) * envelope * .58 + offset * .45);
      break;
    }
    case 4: { // Three pages unfold from a shared spine.
      const x = (u - .5) * 4.8;
      out.set(x, Math.sin(u * Math.PI) * .6 + offset * .46,
        Math.sin((u - .5) * Math.PI) * .7 + offset * .42);
      break;
    }
    default: { // Three disciplines woven into one continuous practice.
      const a = angle, phase = strand * TAU / 3 + t * .15;
      const r = 1.8 + .38 * Math.cos(a * 3 + phase);
      out.set(r * Math.cos(a), r * Math.sin(a), .62 * Math.sin(a * 3 + phase));
    }
  }
  return out;
}

export default function ArcScene({ onReady, onError }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { onError(); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .93;
    renderer.setClearColor(0xe8e5dc, 0);
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
    camera.position.set(0, .2, 10.5);
    const studio = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(studio, .04);
    scene.environment = environment.texture;
    studio.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xfff4dc, 0x52614b, .85));
    const key = new THREE.DirectionalLight(0xfff0dd, 1.8); key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0xe1e8db, 1.2); rim.position.set(4, 1, -3); scene.add(rim);
    const sculpture = new THREE.Group(); scene.add(sculpture);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const tangent = new THREE.Vector3(), side = new THREE.Vector3(), normal = new THREE.Vector3();
    const up = new THREE.Vector3(0, 0, 1);
    const meshes = COLORS.map(color => {
      const geometry = new THREE.BufferGeometry();
      // A closed rectangular section gives every ribbon real thickness and edges.
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((STEPS + 1) * 4 * 3), 3));
      const indices: number[] = [];
      for (let i = 0; i < STEPS; i++) for (let j = 0; j < 4; j++) {
        const k = i * 4 + j, n = i * 4 + (j + 1) % 4;
        indices.push(k, n, k + 4, n, n + 4, k + 4);
      }
      geometry.setIndex(indices);
      const material = new THREE.MeshPhysicalMaterial({ color, metalness: .78, roughness: .27, clearcoat: .28, clearcoatRoughness: .38, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; sculpture.add(mesh); return mesh;
    });
    // Small satellite points reveal direction along the surface, rather than a generic particle cloud.
    const beadGeometry = new THREE.SphereGeometry(.052, 10, 8);
    const beadMaterial = new THREE.MeshStandardMaterial({ color: '#f4ecce', metalness: .65, roughness: .24 });
    const beads = Array.from({ length: 9 }, () => { const bead = new THREE.Mesh(beadGeometry, beadMaterial); sculpture.add(bead); return bead; });
    let last = 44, frozen = false, disposed = false;
    function render(seconds: number, still = false) {
      if (disposed) return;
      last = seconds; frozen = still;
      const stage = chapterAt(seconds), local = seconds - stage * CHAPTER_SECONDS;
      const blend = still ? 1 : smooth(local / 1.65);
      const previous = stage === 0 ? 5 : stage - 1;
      const t = still ? stage * CHAPTER_SECONDS + 4 : seconds;
      function point(u: number, strand: number, out: THREE.Vector3) {
        curve(previous, u, strand, t, a); curve(stage, u, strand, t, b);
        return out.copy(a).lerp(b, blend);
      }
      meshes.forEach((mesh, strand) => {
        const positions = mesh.geometry.attributes.position;
        for (let i = 0; i <= STEPS; i++) {
          const u = i / STEPS;
          point(u, strand, c);
          const cx = c.x, cy = c.y, cz = c.z;
          point(u + .001, strand, tangent); tangent.sub(c).normalize();
          side.crossVectors(tangent, up).normalize();
          if (side.lengthSq() < .01) side.set(1, 0, 0);
          normal.crossVectors(tangent, side).normalize();
          const twist = stage === 5 ? Math.sin(u * TAU * 3 + strand) * .5 : Math.sin(u * TAU + strand) * .18;
          side.applyAxisAngle(tangent, twist); normal.applyAxisAngle(tangent, twist);
          const pageWidth = .4 + .38 * Math.sin(Math.PI * u);
          const width = THREE.MathUtils.lerp(previous === 4 ? pageWidth : .16, stage === 4 ? pageWidth : .16, blend) * (1 + strand * .08);
          for (let j = 0; j < 4; j++) {
            const w = j === 0 || j === 3 ? -width : width, h = j < 2 ? -.026 : .026;
            positions.setXYZ(i * 4 + j, cx + side.x * w + normal.x * h, cy + side.y * w + normal.y * h, cz + side.z * w + normal.z * h);
          }
        }
        positions.needsUpdate = true; mesh.geometry.computeVertexNormals();
      });
      beads.forEach((bead, i) => { point(((i % 3) / 3 + t * .027) % 1, Math.floor(i / 3), bead.position); });
      sculpture.rotation.set(-.12 + Math.sin(t * .17) * .12, -.33 + Math.sin(t * .13) * .32, Math.sin(t * .09) * .07);
      sculpture.position.y = .08 + Math.sin(t * .3) * .06;
      renderer.render(scene, camera);
    }
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height;
      camera.position.z = camera.aspect < 1 ? 12.3 : 10.5;
      camera.updateProjectionMatrix(); render(last, frozen);
    };
    const lost = (event: Event) => { event.preventDefault(); onError(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    onReady({ render });
    return () => {
      disposed = true; observer.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', lost);
      meshes.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      beadGeometry.dispose(); beadMaterial.dispose(); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [onReady, onError]);
  return <div className="arc-canvas" ref={mount} aria-hidden="true" />;
}
