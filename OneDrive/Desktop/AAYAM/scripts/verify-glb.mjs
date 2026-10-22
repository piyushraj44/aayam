// Load a wordmark GLB exactly as the site does (three GLTFLoader + MeshoptDecoder) and report what arrives.
// Usage: node scripts/verify-glb.mjs public/models/aayam-wordmark.glb [--dump <out.bin>]
// --dump writes, per mesh: name length, name, vertex count, index count, then float32 position(3),
// normal(3), uv(2), uv1(2) and uint32 indices, all in world space. Used by scripts/preview-wordmark.py.
import { readFileSync, writeFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

const EXPECTED = ["L1_Lambda", "L2_A", "L3_Y", "L4_A", "L5_M"];
const file = process.argv[2];
const dumpAt = process.argv.indexOf("--dump");
const dumpPath = dumpAt > 0 ? process.argv[dumpAt + 1] : null;

const buf = readFileSync(file);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const fail = (msg) => {
  process.stderr.write(`FAIL ${msg}\n`);
  process.exitCode = 1;
};

loader.parse(ab, "", (gltf) => {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const report = { file, bytes: buf.length, meshes: [], triangles: 0 };
  const chunks = [];
  const box = new THREE.Box3();
  EXPECTED.forEach((name) => {
    const obj = scene.getObjectByName(name);
    if (!obj) return fail(`missing node ${name}`);
    if (!obj.isMesh) return fail(`${name} is a ${obj.type}, not a Mesh`);
    const g = obj.geometry;
    const attrs = Object.keys(g.attributes);
    for (const a of ["position", "normal", "uv", "uv1"]) if (!g.attributes[a]) fail(`${name} lacks ${a}`);
    const tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    report.triangles += tris;
    const uv1 = g.attributes.uv1;
    let minFill = Infinity, maxFill = -Infinity, minC = Infinity, maxC = -Infinity;
    for (let i = 0; i < uv1.count; i++) {
      minFill = Math.min(minFill, uv1.getX(i)); maxFill = Math.max(maxFill, uv1.getX(i));
      minC = Math.min(minC, uv1.getY(i)); maxC = Math.max(maxC, uv1.getY(i));
    }
    const lb = new THREE.Box3().setFromObject(obj);
    box.union(lb);
    report.meshes.push({
      name, type: obj.type, attributes: attrs, vertices: g.attributes.position.count, triangles: tris,
      fillHeight: [+minFill.toFixed(3), +maxFill.toFixed(3)], centreline: [+minC.toFixed(3), +maxC.toFixed(3)],
      min: lb.min.toArray().map((v) => +v.toFixed(4)), max: lb.max.toArray().map((v) => +v.toFixed(4)),
    });
    if (dumpPath) {
      const n = g.attributes.position.count;
      const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
      const uv = new Float32Array(n * 2), u1 = new Float32Array(n * 2);
      const v = new THREE.Vector3();
      const nm = new THREE.Matrix3().getNormalMatrix(obj.matrixWorld);
      for (let i = 0; i < n; i++) {
        v.fromBufferAttribute(g.attributes.position, i).applyMatrix4(obj.matrixWorld); v.toArray(pos, i * 3);
        v.fromBufferAttribute(g.attributes.normal, i).applyMatrix3(nm).normalize(); v.toArray(nrm, i * 3);
        uv[i * 2] = g.attributes.uv.getX(i); uv[i * 2 + 1] = g.attributes.uv.getY(i);
        u1[i * 2] = uv1.getX(i); u1[i * 2 + 1] = uv1.getY(i);
      }
      const idx = new Uint32Array(g.index.array);
      const nameBytes = Buffer.from(name);
      const head = new Uint32Array([nameBytes.length, n, idx.length]);
      chunks.push(Buffer.from(head.buffer), nameBytes, Buffer.alloc((4 - (nameBytes.length % 4)) % 4),
        Buffer.from(pos.buffer), Buffer.from(nrm.buffer), Buffer.from(uv.buffer), Buffer.from(u1.buffer), Buffer.from(idx.buffer));
    }
  });
  report.bbox = { min: box.min.toArray().map((v) => +v.toFixed(4)), max: box.max.toArray().map((v) => +v.toFixed(4)) };
  report.order = report.meshes.map((m) => m.name);
  const xs = report.meshes.map((m) => (m.min[0] + m.max[0]) / 2);
  if (xs.some((x, i) => i > 0 && x <= xs[i - 1])) fail("letters are not ordered left to right");
  if (dumpPath) writeFileSync(dumpPath, Buffer.concat(chunks));
  process.stdout.write(JSON.stringify(report, null, 1) + "\n");
}, (err) => fail(String(err)));
