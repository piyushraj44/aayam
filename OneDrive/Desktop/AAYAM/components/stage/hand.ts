/**
 * The ASCII hand actor: the glyph grid from public/data/hand-glyphs.{json,bin}
 * drawn as instanced quads (one draw call) sampling a mono-glyph atlas that is
 * rendered at runtime from JetBrains Mono on a 2D canvas.
 *
 * The stage decides where the contact fingertip is (screen px), the wrist
 * rotation and the opacity; the hand animates its own breathing, flicker,
 * finger sway, fingertip glow, contact flash and falling drip-line glyphs.
 */
import {
  CanvasTexture,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { stageConfig } from "./config";
import { glyphFragmentShader, glyphVertexShader } from "./shaders/glyph";
import type { DeviceTier } from "./tier";
import { mulberry32 } from "./util";

type Fingertip = { name: string; x: number; y: number };
type DripLine = { x: number; y0: number; y1: number };

export type HandData = {
  cols: number;
  rows: number;
  aspect: number;
  ramp: string;
  fingertips: Fingertip[];
  knuckleY: number;
  contact: Fingertip;
  drips: DripLine[] | null;
  /** count × [col, row, brightness, tint] */
  cells: Uint8Array;
  count: number;
};

const DEFAULT_RAMP = " .:-=+*#%@";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** Fetches and validates the glyph grid. Throws on malformed data. */
export async function loadHandData(signal: AbortSignal): Promise<HandData> {
  const [jsonRes, binRes] = await Promise.all([
    fetch("/data/hand-glyphs.json", { signal }),
    fetch("/data/hand-glyphs.bin", { signal }),
  ]);
  if (!jsonRes.ok || !binRes.ok) throw new Error("hand data missing");
  const meta: unknown = await jsonRes.json();
  const bin = new Uint8Array(await binRes.arrayBuffer());
  if (!isRecord(meta)) throw new Error("hand data malformed");

  const num = (k: string, d: number) => (typeof meta[k] === "number" ? (meta[k] as number) : d);
  const cols = num("cols", 0);
  const rows = num("rows", 0);
  const count = Math.min(num("count", bin.length / 4), Math.floor(bin.length / 4));
  if (cols <= 0 || rows <= 0 || count <= 0) throw new Error("hand data empty");

  const tips: Fingertip[] = Array.isArray(meta.fingertips)
    ? meta.fingertips.filter(isRecord).map((f) => ({
        name: typeof f.name === "string" ? f.name : "",
        x: typeof f.x === "number" ? f.x : 0,
        y: typeof f.y === "number" ? f.y : 0,
      }))
    : [];
  if (tips.length === 0) tips.push({ name: "index", x: cols / 2, y: rows - 1 });
  const contactName = typeof meta.contactFinger === "string" ? meta.contactFinger : "index";
  const contact =
    tips.find((f) => f.name === contactName) ?? tips.reduce((low, f) => (f.y > low.y ? f : low), tips[0]);

  const drips: DripLine[] | null = Array.isArray(meta.drips)
    ? meta.drips.filter(isRecord).map((d) => ({
        x: typeof d.x === "number" ? d.x : 0,
        y0: typeof d.y0 === "number" ? d.y0 : 0,
        y1: typeof d.y1 === "number" ? d.y1 : 0,
      }))
    : null;

  return {
    cols,
    rows,
    aspect: num("aspect", 0.6),
    ramp: typeof meta.ramp === "string" && meta.ramp.length > 2 ? meta.ramp : DEFAULT_RAMP,
    fingertips: tips,
    knuckleY: num("knuckleY", rows * 0.5),
    contact,
    drips,
    cells: bin.subarray(0, count * 4),
    count,
  };
}

/** Merges 2×2 cells (brightest wins) — larger glyphs for phones / low tiers. */
function coarsen(d: HandData): HandData {
  const cols = Math.ceil(d.cols / 2);
  const rows = Math.ceil(d.rows / 2);
  const best = new Map<number, number>();
  for (let i = 0; i < d.count; i++) {
    const key = (d.cells[i * 4 + 1] >> 1) * cols + (d.cells[i * 4] >> 1);
    const prev = best.get(key);
    if (prev === undefined || d.cells[i * 4 + 2] > d.cells[prev * 4 + 2]) best.set(key, i);
  }
  const cells = new Uint8Array(best.size * 4);
  let k = 0;
  best.forEach((i, key) => {
    cells[k++] = key % cols;
    cells[k++] = Math.floor(key / cols);
    cells[k++] = d.cells[i * 4 + 2];
    cells[k++] = d.cells[i * 4 + 3];
  });
  const half = (f: Fingertip) => ({ ...f, x: f.x / 2, y: f.y / 2 });
  return {
    ...d,
    cols,
    rows,
    fingertips: d.fingertips.map(half),
    contact: half(d.contact),
    knuckleY: d.knuckleY / 2,
    drips: d.drips ? d.drips.map((l) => ({ x: l.x / 2, y0: l.y0 / 2, y1: l.y1 / 2 })) : null,
    cells,
    count: best.size,
  };
}

/** Hex → display-space RGB (the glyph shader writes colours unconverted). */
function srgb(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function cssColor(token: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}

/** The fixed header's height in px (the --header-h token). */
function headerHeight(fallback: number): number {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"));
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Renders the brightness ramp into a one-row atlas (glyph mask in the red channel). */
async function createAtlas(ramp: string): Promise<CanvasTexture> {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains").trim() ||
    "ui-monospace, monospace";
  const size = 46;
  try {
    await Promise.race([document.fonts.load(`${size}px ${family}`), new Promise((r) => setTimeout(r, 800))]);
  } catch {
    // keep the fallback monospace face
  }
  const cw = 32;
  const ch = 54;
  const canvas = document.createElement("canvas");
  canvas.width = cw * ramp.length;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${size}px ${family}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < ramp.length; i++) ctx.fillText(ramp[i], i * cw + cw / 2, ch / 2 + 2);
  const tex = new CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

export type HandLayout = {
  /** Cell size in CSS px. */
  cellW: number;
  cellH: number;
  /** Contact fingertip in the settled box (screen px). */
  restTipX: number;
  restTipY: number;
  /** Grid size in px. */
  gridW: number;
  gridH: number;
};

export type HandFrame = {
  time: number;
  width: number;
  height: number;
  tipX: number;
  tipY: number;
  rotation: number;
  opacity: number;
  tipGlow: number;
  flash: number;
  flashRadius: number;
  rain: number;
};

export class HandActor {
  readonly mesh: Mesh;
  private readonly data: HandData;
  private readonly material: ShaderMaterial;
  private readonly geometry: InstancedBufferGeometry;
  private readonly atlas: CanvasTexture;
  private readonly animated: boolean;
  private readonly sway = Array.from({ length: 5 }, () => new Vector2());
  private readonly swayPhase: number[];

  static async create(raw: HandData, tier: DeviceTier, boxWidth: number): Promise<HandActor> {
    const hc = stageConfig.hand;
    let data = raw;
    const cellPx = boxWidth / raw.cols;
    if (raw.count > hc.maxGlyphs[tier] || cellPx < hc.minCellPx) data = coarsen(raw);
    const atlas = await createAtlas(data.ramp);
    return new HandActor(data, tier, atlas);
  }

  private constructor(data: HandData, tier: DeviceTier, atlas: CanvasTexture) {
    const hc = stageConfig.hand;
    this.data = data;
    this.atlas = atlas;
    this.animated = tier !== "low";
    const rand = mulberry32(0x4a4d);
    this.swayPhase = Array.from({ length: 5 }, () => rand() * Math.PI * 2);

    const base = new PlaneGeometry(1, 1);
    const geometry = new InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    geometry.setAttribute("uv", base.getAttribute("uv"));

    const n = data.count;
    const aCell = new Float32Array(n * 2);
    const aData = new Float32Array(n * 4);
    const aExtra = new Float32Array(n * 4);
    // Fingers: the five tips (or as many as the data has) below the knuckle line.
    const fingers = data.fingertips.slice(0, 5);
    const tip = data.contact;
    const maxTipY = fingers.reduce((m, f) => Math.max(m, f.y), 0);

    for (let i = 0; i < n; i++) {
      const col = data.cells[i * 4];
      const row = data.cells[i * 4 + 1];
      aCell[i * 2] = col;
      aCell[i * 2 + 1] = row;

      let finger = 0;
      let weight = 0;
      if (row > data.knuckleY) {
        let best = Infinity;
        fingers.forEach((f, fi) => {
          const d = Math.abs(col - f.x);
          if (d < best) {
            best = d;
            finger = fi + 1;
            weight = Math.min(1, Math.max(0, (row - data.knuckleY) / Math.max(1, f.y - data.knuckleY)));
          }
        });
      }

      const isDrip = data.drips
        ? data.drips.some((l) => Math.abs(col - l.x) <= 1 && row >= l.y0 && row <= l.y1)
        : row > maxTipY + 1.5;

      aData[i * 4] = data.cells[i * 4 + 2] / 255;
      aData[i * 4 + 1] = data.cells[i * 4 + 3];
      aData[i * 4 + 2] = finger;
      aData[i * 4 + 3] = weight;
      aExtra[i * 4] = Math.hypot((col - tip.x) * data.aspect, row - tip.y);
      aExtra[i * 4 + 1] = isDrip ? 1 : 0;
      aExtra[i * 4 + 2] = rand();
      aExtra[i * 4 + 3] = rand();
    }
    geometry.setAttribute("aCell", new InstancedBufferAttribute(aCell, 2));
    geometry.setAttribute("aData", new InstancedBufferAttribute(aData, 4));
    geometry.setAttribute("aExtra", new InstancedBufferAttribute(aExtra, 4));
    geometry.instanceCount = n;
    this.geometry = geometry;

    const white = srgb(cssColor("--chrome-white", "#f2f4f7"));
    const red = srgb(cssColor("--signal-red", "#ff2a3d")).lerp(white, hc.tintMute);
    const blue = srgb(cssColor("--signal-blue", "#2b4bff")).lerp(white, hc.tintMute);
    this.material = new ShaderMaterial({
      vertexShader: glyphVertexShader,
      fragmentShader: glyphFragmentShader,
      transparent: true,
      premultipliedAlpha: true,
      blending: NormalBlending,
      depthWrite: false,
      uniforms: {
        uViewport: { value: new Vector2(1, 1) },
        uTip: { value: new Vector2() },
        uTipLocal: { value: new Vector2(tip.x, tip.y) },
        uCell: { value: new Vector2(4, 6) },
        uRot: { value: 0 },
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uBright: { value: hc.brightness },
        uFlicker: { value: this.animated ? hc.flicker : 0 },
        uTipGlow: { value: 0 },
        uFlash: { value: 0 },
        uFlashRadius: { value: 0 },
        uRain: { value: 0 },
        uTopFade: { value: headerHeight(hc.topFade) },
        uHeaderDim: { value: hc.headerDim },
        uRampLen: { value: data.ramp.length },
        uSway: { value: this.sway },
        uWhite: { value: white },
        uRed: { value: red },
        uBlue: { value: blue },
        uGold: { value: srgb(cssColor("--wordmark-gold", "#f6b73c")) },
        uAtlas: { value: atlas },
      },
    });
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
  }

  /** Fits the grid into the settled anchor box ("contain", top-aligned). */
  layout(box: { left: number; top: number; width: number; height: number }): HandLayout {
    const d = this.data;
    const cellW = Math.min(box.width / d.cols, (box.height * stageConfig.hand.overflow * d.aspect) / d.rows);
    const cellH = cellW / d.aspect;
    const gridW = cellW * d.cols;
    const gridH = cellH * d.rows;
    const left = box.left + (box.width - gridW) / 2;
    const top = box.top;
    return {
      cellW,
      cellH,
      gridW,
      gridH,
      restTipX: left + (d.contact.x + 0.5) * cellW,
      restTipY: top + (d.contact.y + 0.5) * cellH,
    };
  }

  update(f: HandFrame, layout: HandLayout) {
    const u = this.material.uniforms;
    const hc = stageConfig.hand;
    const time = this.animated ? f.time : 0;
    for (let i = 0; i < 5; i++) {
      const p = this.swayPhase[i];
      const amp = this.animated ? hc.sway : 0;
      this.sway[i].set(
        Math.sin(time * hc.swaySpeed + p) * amp,
        Math.sin(time * hc.swaySpeed * 0.7 + p * 1.3) * amp * 0.35,
      );
    }
    (u.uViewport.value as Vector2).set(f.width, f.height);
    (u.uTip.value as Vector2).set(f.tipX, f.tipY);
    (u.uCell.value as Vector2).set(layout.cellW, layout.cellH);
    u.uRot.value = f.rotation;
    u.uTime.value = time;
    // Breathing: a slow brightness swell while idle.
    u.uOpacity.value = f.opacity * (this.animated ? 1 + 0.05 * Math.sin(f.time * 0.9) : 1);
    u.uTipGlow.value = f.tipGlow * hc.tipGlow;
    u.uFlash.value = f.flash;
    u.uFlashRadius.value = f.flashRadius;
    u.uRain.value = f.rain;
    this.mesh.visible = f.opacity > 0.002;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.atlas.dispose();
  }
}
