import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createDevice } from './deviceGeometry';
import { artworkCanvas, createDeviceArtwork, createScreenArtwork } from './screenArtwork';
import { cameraDistance, deviceFrame, DURATION } from './sequence';

export async function loadArtwork(signal: AbortSignal) {
  const load = (src: string) => new Promise<HTMLImageElement | undefined>(resolve => {
    const image = new Image(); let settled = false;
    const finish = (value?: HTMLImageElement) => {
      if (settled) return; settled = true; clearTimeout(timeout);
      signal.removeEventListener('abort', abort); image.onload = null; image.onerror = null; resolve(value);
    };
    const abort = () => { image.src = ''; finish(); };
    const timeout = window.setTimeout(abort, 8000);
    image.onload = () => finish(image); image.onerror = () => finish();
    if (signal.aborted) abort(); else { signal.addEventListener('abort', abort, { once: true }); image.src = src; }
  });
  return Promise.all([load('/portfolio/siguide/opening-reference.webp'), load('/portfolio/siguide/tour-reference.webp'), load('/portfolio/siguide/object-reference.webp')]);
}

export function createDeviceScene(canvas: HTMLCanvasElement, photos: (HTMLImageElement | undefined)[]) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  // The same prefiltered studio environment used by the earlier homepage sculpture.
  const studio = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, .025);
  scene.environment = environment.texture; scene.environmentIntensity = .9; scene.environmentRotation.set(0, .45, 0);
  studio.dispose(); pmrem.dispose();
  const screenArtwork = createScreenArtwork(photos[0], photos[1], photos[2]), bodyArtwork = createDeviceArtwork();
  const texture = (source: HTMLCanvasElement) => {
    const value = new THREE.CanvasTexture(source); value.colorSpace = THREE.SRGBColorSpace;
    value.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8); return value;
  };
  const textures = { screen: texture(screenArtwork.canvas), badge: texture(bodyArtwork.badge), maker: texture(bodyArtwork.maker), grain: texture(bodyArtwork.grain) };
  textures.grain.colorSpace = THREE.NoColorSpace; textures.grain.wrapS = textures.grain.wrapT = THREE.RepeatWrapping; textures.grain.repeat.set(14, 10);
  const device = createDevice(textures); scene.add(device.group);
  scene.add(new THREE.HemisphereLight('#edf2f6', '#839078', .5));
  const key = new THREE.DirectionalLight('#fff2df', 2.5); key.position.set(-3, 6, 8); key.castShadow = true;
  const shadowSize = window.matchMedia('(max-width: 640px)').matches ? 1024 : 2048;
  key.shadow.mapSize.set(shadowSize, shadowSize); key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -4; key.shadow.camera.far = 24;
  key.shadow.normalBias = .012; key.shadow.bias = -.0001; key.shadow.radius = 3;
  const fill = new THREE.DirectionalLight('#c5d9e4', .48); fill.position.set(4, -2, 5);
  const rim = new THREE.DirectionalLight('#eaf0ed', 2.1); rim.position.set(2, 4, -3); scene.add(key, fill, rim);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ transparent: true, opacity: .07, depthWrite: false }));
  backdrop.position.z = -3; backdrop.receiveShadow = true; scene.add(backdrop);
  // A broad ambient shadow grounds the device; the directional shadow supplies its shape.
  const shadowArt = artworkCanvas(256, 256), shadowContext = shadowArt.context;
  const shadowGradient = shadowContext.createRadialGradient(128, 128, 20, 128, 128, 124);
  shadowGradient.addColorStop(0, '#20302655'); shadowGradient.addColorStop(.5, '#20302628'); shadowGradient.addColorStop(1, '#20302600');
  shadowContext.fillStyle = shadowGradient; shadowContext.fillRect(0, 0, 256, 256);
  const shadowTexture = texture(shadowArt.canvas);
  const ambientShadow = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 6.2), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, toneMapped: false }));
  ambientShadow.position.set(.2, -.35, -2.9); scene.add(ambientShadow);
  let lastScreen = -1;
  function resize(width: number, height: number) {
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    // Fit the complete device, including its opening tilt, on narrow screens.
    camera.position.z = cameraDistance(camera.aspect);
    camera.updateProjectionMatrix();
  }
  function draw(seconds: number) {
    const frame = deviceFrame(seconds);
    device.group.rotation.set(...frame.rotation);
    device.group.position.y = THREE.MathUtils.lerp(.08, .02, frame.settle);
    device.shell.visible = frame.casing > 0; device.detail.visible = frame.details > 0;
    device.detail.position.z = (1 - frame.details) * .1;
    device.wire.visible = frame.wire > 0; device.wireMaterial.opacity = frame.wire * .66;
    device.wire.children.forEach(child => {
      const lines = child as THREE.LineSegments;
      lines.geometry.setDrawRange(0, Math.floor(lines.geometry.attributes.position.count * frame.drawing / 2) * 2);
    });
    device.materials.forEach(({ material, detail, opacity }) => {
      material.opacity = opacity * (detail ? frame.details : frame.casing);
      material.depthWrite = material.opacity > .98;
    });
    device.screen.material.opacity = frame.screen; device.glassMaterial.opacity = frame.details * .085;
    backdrop.material.opacity = frame.casing * .07; ambientShadow.material.opacity = frame.casing * .7;
    ambientShadow.rotation.z = frame.rotation[2];
    if (Math.abs(seconds - lastScreen) >= 1 / 30 - .001 || seconds === DURATION) {
      screenArtwork.draw(seconds); textures.screen.needsUpdate = true; lastScreen = seconds;
    }
    renderer.render(scene, camera);
  }
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
      }
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    Object.values(textures).forEach(value => value.dispose()); shadowTexture.dispose(); environment.dispose(); key.shadow.dispose(); renderer.dispose();
  }
  return { draw, resize, dispose };
}
