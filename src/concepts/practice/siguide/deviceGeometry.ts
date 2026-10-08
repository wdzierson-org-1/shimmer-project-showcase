import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function outline(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2, r = radius;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y); shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + height - r); shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  shape.lineTo(x + r, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

export function createDevice(textures: { screen: THREE.Texture; badge: THREE.Texture; maker: THREE.Texture; grain: THREE.Texture }) {
  const group = new THREE.Group(), shell = new THREE.Group(), detail = new THREE.Group(), wire = new THREE.Group();
  group.add(shell, detail, wire);
  const materials: { material: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial; detail: boolean; opacity: number }[] = [];
  const wireMaterial = new THREE.LineBasicMaterial({ color: '#758979', transparent: true, opacity: .8, depthTest: false });
  function physical(color: string, roughness: number, isDetail = false, options: THREE.MeshPhysicalMaterialParameters = {}) {
    const material = new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, transparent: true, ...options });
    materials.push({ material, detail: isDetail, opacity: 1 }); return material;
  }
  const rubber = physical('#252e32', .92, false, { bumpMap: textures.grain, bumpScale: .007 });
  const graphite = physical('#3b454d', .48, false, { bumpMap: textures.grain, bumpScale: .0035, clearcoat: .12, clearcoatRoughness: .5 });
  const seam = physical('#121a1e', .78), grip = physical('#293439', .72);
  const bezel = physical('#121a1e', .29, true, { clearcoat: .24, clearcoatRoughness: .24 });
  const lime = physical('#bbc933', .43, true, { clearcoat: .18, clearcoatRoughness: .4 });
  const well = physical('#0c1215', .96, true), rim = physical('#354047', .44, true);

  function part(width: number, height: number, depth: number, radius: number, material: THREE.MeshStandardMaterial, x: number, y: number, z: number, options: { bevel?: number; edge?: boolean; detail?: boolean; screenOpening?: boolean; grille?: boolean } = {}) {
    const shape = outline(width, height, radius), bevel = options.bevel ?? .022;
    if (options.screenOpening) shape.holes.push(outline(4.24, 3.2, .035));
    if (options.grille) for (let row = 0; row < 11; row++) for (let col = 0; col < 4; col++) {
      const hole = new THREE.Path(); hole.absarc(-.245 + col * .16 + (row % 2) * .025, .78 - row * .214, .032, 0, Math.PI * 2, true); shape.holes.push(hole);
    }
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: options.grille ? 3 : 8, steps: 1, bevelSize: bevel, bevelThickness: bevel, curveSegments: options.grille ? 10 : 24 });
    geometry.translate(0, 0, -depth / 2);
    // Smooth the molded bevels while retaining the flat surfaces and hard recesses.
    if (!options.grille) toCreasedNormals(geometry, Math.PI / 3);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    (options.detail ? detail : shell).add(mesh);
    if (options.edge !== false) {
      const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 24), wireMaterial);
      lines.position.copy(mesh.position); lines.renderOrder = 4; wire.add(lines);
    }
    return mesh;
  }
  // Three continuous layers: soft protective bumper, recessed assembly seam, molded front shell.
  part(6.43, 4.09, .33, .4, rubber, 0, 0, -.22, { bevel: .10 });
  part(6.45, 4.09, .035, .4, seam, 0, 0, .015, { bevel: .054 });
  part(6.34, 4.0, .19, .34, graphite, 0, 0, .16, { bevel: .085 });
  part(4.56, 3.5, .078, .10, bezel, .03, .02, .347, { bevel: .028, detail: true, screenOpening: true });
  part(.83, 3.5, .045, .13, graphite, -2.74, -.03, .347, { bevel: .006, grille: true });
  part(.72, 3.5, .042, .14, grip, 2.77, .02, .343, { bevel: .018 });
  part(.058, 3.18, .012, .025, seam, 3.12, .02, .36, { bevel: .01 });
  for (const x of [-2.35, 2.36]) {
    part(.60, .21, .09, .068, seam, x, 1.96, .327, { bevel: .022, detail: true });
    part(.52, .14, .11, .047, lime, x, 1.971, .37, { bevel: .021, detail: true });
  }
  for (const y of [-.55, .48]) {
    part(.052, .4, .2, .024, seam, 3.277, y, -.07, { bevel: .017, detail: true });
    part(.058, .3, .16, .025, lime, 3.305, y, -.045, { bevel: .018, detail: true });
  }

  // Actual holes in the grille reveal black wells, with a fine molded lip catching the studio light.
  const holeGeometry = new THREE.CircleGeometry(.032, 24), rimGeometry = new THREE.TorusGeometry(.034, .003, 8, 24);
  const holes = new THREE.InstancedMesh(holeGeometry, well, 44), lips = new THREE.InstancedMesh(rimGeometry, rim, 44);
  const transform = new THREE.Matrix4();
  for (let row = 0; row < 11; row++) for (let col = 0; col < 4; col++) {
    const index = row * 4 + col, x = -2.985 + col * .16 + (row % 2) * .025, y = .75 - row * .214;
    transform.makeTranslation(x, y, .345); holes.setMatrixAt(index, transform);
    transform.makeTranslation(x, y, .378); lips.setMatrixAt(index, transform);
  }
  detail.add(holes, lips);

  function decal(texture: THREE.Texture, width: number, height: number, x: number, y: number, z: number, lit = false) {
    const material = lit
      ? new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: .55, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 })
      : new THREE.MeshBasicMaterial({ map: texture, transparent: true, toneMapped: false });
    materials.push({ material, detail: true, opacity: 1 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material); mesh.position.set(x, y, z); detail.add(mesh); return mesh;
  }
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(4.16, 3.12), physical('#050b0d', .2, true));
  lcd.position.set(.03, .02, .387); detail.add(lcd);
  const screen = decal(textures.screen, 4.16, 3.12, .03, .02, .395);
  decal(textures.badge, .47, 3.07, 2.77, .025, .387, true);
  decal(textures.maker, .73, .57, -2.75, 1.29, .381, true);
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: '#f0f7f8', roughness: .055, metalness: 0, clearcoat: 1, clearcoatRoughness: .065, ior: 1.47, envMapIntensity: 1.2, transparent: true, opacity: .085, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.16), glassMaterial); glass.position.set(.03, .02, .402); detail.add(glass);
  return { group, shell, detail, wire, wireMaterial, materials, screen, glassMaterial };
}
