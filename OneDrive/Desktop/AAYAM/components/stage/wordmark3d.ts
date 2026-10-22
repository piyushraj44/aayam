/**
 * 3D AAYAM wordmark actor: loads the meshopt-compressed GLB (five meshes
 * L1_Lambda … L5_M, 2.0 units wide), gives each letter the molten material and
 * exposes per-letter bounds so the pour streams know where to land.
 *
 * A designer-made GLB drops in unchanged as long as it keeps the five mesh
 * names and the fillHeight attribute (TEXCOORD_1.x). Missing names fall back to
 * left-to-right order; a missing TEXCOORD_1 falls back to the mesh height.
 */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Matrix3,
  Matrix4,
  Mesh,
  type Camera,
  type Object3D,
  type Scene,
  ShaderMaterial,
  Vector3,
  type WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { stageConfig } from "./config";
import { wordmarkFragmentShader, wordmarkVertexShader } from "./shaders/wordmark";
import { LETTER_COUNT } from "./timeline";
import { readTokenColor } from "./util";

const LETTER_NAMES = ["L1_Lambda", "L2_A", "L3_Y", "L4_A", "L5_M"];

export type LetterBounds = { cx: number; minY: number; maxY: number };

export type WordmarkFrame = {
  fill: number[];
  frontGlow: number;
  sweep: number;
  time: number;
  alpha: number;
  tiltX: number;
  tiltY: number;
};

/** Rewrites uv1 as float [0,1] per letter (gltfpack may quantise/remap it). */
function normaliseFill(geometry: BufferGeometry) {
  const pos = geometry.getAttribute("position");
  const src = geometry.getAttribute("uv1");
  const n = pos.count;
  const out = new Float32Array(n * 2);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    const x = src ? src.getX(i) : pos.getY(i);
    const y = src ? src.getY(i) : 0.5;
    out[i * 2] = x;
    out[i * 2 + 1] = y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const sx = maxX - minX > 1e-6 ? 1 / (maxX - minX) : 0;
  const sy = maxY - minY > 1e-6 ? 1 / (maxY - minY) : 0;
  for (let i = 0; i < n; i++) {
    out[i * 2] = (out[i * 2] - minX) * sx;
    out[i * 2 + 1] = sy > 0 ? (out[i * 2 + 1] - minY) * sy : 0.5;
  }
  geometry.setAttribute("uv1", new BufferAttribute(out, 2));
}

export class WordmarkActor {
  readonly group = new Group();
  /** Wordmark width/height and centre in model units. */
  readonly width: number;
  readonly height: number;
  readonly center = new Vector3();
  readonly letters: LetterBounds[];
  private readonly pivot = new Group();
  private readonly materials: ShaderMaterial[] = [];
  private readonly geometries: BufferGeometry[] = [];
  private readonly fill: number[] = new Array(LETTER_COUNT).fill(0);
  private readonly envRot = new Matrix3();
  private readonly m4 = new Matrix4();

  static async load(url: string, renderer: WebGLRenderer, camera: Camera, scene: Scene): Promise<WordmarkActor> {
    await MeshoptDecoder.ready;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    const actor = new WordmarkActor(gltf.scene);
    scene.add(actor.group);
    actor.group.visible = false;
    // Compile without blocking (KHR_parallel_shader_compile) before first use.
    await renderer.compileAsync(actor.group, camera, scene);
    return actor;
  }

  private constructor(root: Object3D) {
    const wc = stageConfig.wordmark3d;
    const meshes: Mesh[] = [];
    root.traverse((o) => {
      if (o instanceof Mesh) meshes.push(o);
    });
    root.updateMatrixWorld(true);

    // Order: by name when present, otherwise left to right.
    const byName = (m: Mesh) => {
      let o: Object3D | null = m;
      while (o) {
        const idx = LETTER_NAMES.indexOf(o.name);
        if (idx >= 0) return idx;
        o = o.parent;
      }
      return -1;
    };
    const boxes = new Map<Mesh, Box3>();
    meshes.forEach((m) => boxes.set(m, new Box3().setFromObject(m)));
    const named = meshes.every((m) => byName(m) >= 0);
    meshes.sort((a, b) =>
      named ? byName(a) - byName(b) : (boxes.get(a)?.min.x ?? 0) - (boxes.get(b)?.min.x ?? 0),
    );

    const shared = {
      uFill: { value: this.fill },
      uFrontWidth: { value: wc.frontWidth },
      uFrontGlow: { value: wc.frontGlow },
      uAlpha: { value: 0 },
      uTime: { value: 0 },
      uSweep: { value: 0 },
      uEnvRot: { value: this.envRot },
      uMagenta: { value: readTokenColor(wc.colors.magenta.token, wc.colors.magenta.fallback) },
      uRed: { value: readTokenColor(wc.colors.red.token, wc.colors.red.fallback) },
      uOrange: { value: readTokenColor(wc.colors.orange.token, wc.colors.orange.fallback) },
      uGold: { value: readTokenColor(wc.colors.gold.token, wc.colors.gold.fallback) },
      uBody: { value: wc.bodyBrightness },
      uRefl: { value: wc.reflection },
      uGlow: { value: wc.glow },
      uIrid: { value: wc.iridescence },
      uUnitPx: { value: 1 },
    };

    const all = new Box3();
    this.letters = meshes.slice(0, LETTER_COUNT).map((mesh, i) => {
      normaliseFill(mesh.geometry);
      this.geometries.push(mesh.geometry);
      const material = new ShaderMaterial({
        vertexShader: wordmarkVertexShader,
        fragmentShader: wordmarkFragmentShader,
        uniforms: { ...shared, uLetter: { value: i } },
        side: DoubleSide,
        transparent: true,
        premultipliedAlpha: true,
      });
      this.materials.push(material);
      mesh.material = material;
      mesh.frustumCulled = false;
      const b = boxes.get(mesh) ?? new Box3();
      all.union(b);
      return { cx: (b.min.x + b.max.x) / 2, minY: b.min.y, maxY: b.max.y };
    });
    // Hide anything beyond five letters (unexpected extra meshes).
    meshes.slice(LETTER_COUNT).forEach((m) => (m.visible = false));

    all.getCenter(this.center);
    // Letter bounds relative to the model centre (the pivot's origin).
    for (const l of this.letters) {
      l.cx -= this.center.x;
      l.minY -= this.center.y;
      l.maxY -= this.center.y;
    }
    this.width = Math.max(1e-3, all.max.x - all.min.x);
    this.height = Math.max(1e-3, all.max.y - all.min.y);
    // Centre the model on the pivot so tilt rotates about its middle.
    root.position.sub(this.center);
    this.pivot.add(root);
    this.group.add(this.pivot);
  }

  /** Places the model so its width matches `boxWidth` px, centred on (x, y) world. */
  place(x: number, y: number, boxWidth: number) {
    this.group.position.set(x, y, 0);
    this.group.scale.setScalar(boxWidth / this.width);
  }

  get pxPerUnit() {
    return this.group.scale.x;
  }

  update(f: WordmarkFrame) {
    const wc = stageConfig.wordmark3d;
    for (let i = 0; i < LETTER_COUNT; i++) this.fill[i] = f.fill[i] ?? 1;
    const u = this.materials[0]?.uniforms;
    if (u) {
      u.uAlpha.value = f.alpha;
      u.uTime.value = f.time;
      u.uSweep.value = f.sweep;
      u.uFrontGlow.value = wc.frontGlow * f.frontGlow;
      u.uUnitPx.value = this.group.scale.x;
    }
    this.m4.makeRotationY(f.time * wc.flowSpeed + f.tiltY * 2);
    this.envRot.setFromMatrix4(this.m4);
    this.pivot.rotation.set(f.tiltX, f.tiltY, 0);
    this.group.visible = f.alpha > 0.001 && this.fill.some((v) => v > 0.001);
  }

  dispose() {
    this.group.removeFromParent();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
