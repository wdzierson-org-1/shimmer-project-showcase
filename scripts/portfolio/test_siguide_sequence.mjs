import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function load(file, imports = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(name => {
    assert.ok(name in imports, `Unexpected import: ${name}`); return imports[name];
  }, module, module.exports);
  return module.exports;
}
const { DURATION, deviceFrame, cameraDistance } = load('src/concepts/practice/siguide/sequence.ts');
const { createDevice } = load('src/concepts/practice/siguide/deviceGeometry.ts', { three: THREE, 'three/examples/jsm/utils/BufferGeometryUtils.js': { toCreasedNormals } });
const makeDevice = () => createDevice(Object.fromEntries(['screen', 'badge', 'maker', 'grain'].map(key => [key, new THREE.Texture()])));

test('the complete casing precedes the illuminated interface', () => {
  for (let t = 0; t <= DURATION; t += .02) {
    const frame = deviceFrame(t);
    for (const key of ['drawing', 'casing', 'details', 'wire', 'screen', 'settle', 'route', 'object', 'objectPhoto']) assert.ok(frame[key] >= 0 && frame[key] <= 1, `${key} at ${t}`);
    if (frame.screen > 0) assert.equal(frame.casing, 1);
    if (frame.route > 0) assert.equal(frame.screen, 1);
    if (frame.object > 0) { assert.equal(frame.route, 1); assert.equal(frame.view, 'object'); }
  }
});
test('all manual screens show a complete device, including the reduced-motion home view', () => {
  for (const [time, view] of [[7, 'home'], [10.5, 'tour'], [18, 'map'], [22, 'object']]) {
    const frame = deviceFrame(time);
    assert.equal(frame.view, view); assert.equal(frame.casing, 1); assert.equal(frame.details, 1);
    assert.equal(frame.wire, 0); assert.equal(frame.screen, 1);
  }
});
test('seeking and replay are deterministic, and the route finishes without looping', () => {
  const mid = deviceFrame(14.3); deviceFrame(18); deviceFrame(0);
  assert.deepEqual(deviceFrame(14.3), mid);
  assert.deepEqual(deviceFrame(-4), deviceFrame(0));
  assert.deepEqual(deviceFrame(DURATION + 6), deviceFrame(DURATION));
  assert.equal(deviceFrame(0).drawing, 0); assert.equal(deviceFrame(0).route, 0);
  assert.equal(deviceFrame(DURATION).route, 1);
  assert.equal(deviceFrame(DURATION).object, 1);
  assert.equal(deviceFrame(DURATION).objectPhoto, 1);
  assert.equal(deviceFrame(DURATION).view, 'object');
});
test('the completed map has a reading pause before the object photograph settles', () => {
  assert.equal(deviceFrame(17.5).route, 1); assert.equal(deviceFrame(18.4).view, 'map');
  assert.equal(deviceFrame(18.5).object, 0); assert.equal(deviceFrame(19.2).object, 1);
  assert.ok(deviceFrame(19.5).objectPhoto > 0 && deviceFrame(19.5).objectPhoto < 1);
  assert.equal(deviceFrame(22).objectPhoto, 1);
});
test('the recessed display remains visible through the bezel opening', () => {
  const device = makeDevice(); device.group.updateMatrixWorld(true);
  const meshes = []; device.group.traverse(o => { if (o.isMesh && o.material !== device.glassMaterial) meshes.push(o); });
  for (const x of [-2, -1, 0, 1, 2]) for (const y of [-1.45, 0, 1.45]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(x + .03, y + .02, 5), new THREE.Vector3(0, 0, -1));
    assert.equal(ray.intersectObjects(meshes, false)[0]?.object, device.screen, `Screen obstructed at ${x}, ${y}`);
  }
});
test('device geometry stays finite and inside desktop and mobile camera frames', () => {
  const device = makeDevice(), point = new THREE.Vector3();
  for (const aspect of [1.18, 1.65]) {
    const camera = new THREE.PerspectiveCamera(34, aspect, .1, 60);
    camera.position.z = cameraDistance(aspect); camera.updateMatrixWorld(true);
    for (const time of [0, 2, 4, 7, 18, 24]) {
      const frame = deviceFrame(time);
      device.group.rotation.set(...frame.rotation); device.group.position.y = .08 - .06 * frame.settle; device.group.updateMatrixWorld(true);
      device.group.traverse(object => {
        if (!object.isMesh || object.isInstancedMesh) return;
        const positions = object.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).project(camera);
          assert.ok(Number.isFinite(point.x + point.y + point.z));
          assert.ok(Math.abs(point.x) < .94 && Math.abs(point.y) < .84, `Clipped at aspect ${aspect}, time ${time}`);
        }
      });
    }
  }
});
