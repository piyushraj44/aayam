/**
 * Pour streams: thin molten-chrome ribbons that fall from the orb's drip roots
 * into the letters, warming from chrome to molten red-gold as they fall.
 *
 * One instanced strip per stream (one draw call). Each stream is a quadratic
 * curve in CSS pixels that drops straight down first and then bends toward its
 * letter; `head` is how far the falling front has travelled, `tail` how far the
 * top has retracted, so only the visible part is ever rasterised.
 */
import {
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";

const streamVertexShader = /* glsl */ `
uniform vec2 uViewport;
uniform float uTime;

attribute vec4 aEnds;    // start.xy, end.xy (screen px)
attribute vec4 aParams;  // width px, head 0–1, tail 0–1, phase

varying float vAcross;
varying float vAlong;
varying float vPhase;

void main() {
  float side = position.x * 2.0;          // −1 … 1 across
  float s = 0.5 - position.y;             // 0 top … 1 bottom
  float u = mix(aParams.z, aParams.y, s); // only the visible span
  vec2 a = aEnds.xy;
  vec2 b = aEnds.zw;
  // Gravity: leaves the root straight down, enters the fill front vertically.
  float drop = max(b.y - a.y, 1.0);
  vec2 c1 = a + vec2(0.0, drop * 0.55);
  vec2 c2 = b - vec2(0.0, drop * 0.4);
  float v = 1.0 - u;
  vec2 p = v * v * v * a + 3.0 * v * v * u * c1 + 3.0 * v * u * u * c2 + u * u * u * b;
  vec2 tng = normalize(3.0 * v * v * (c1 - a) + 6.0 * v * u * (c2 - c1) + 3.0 * u * u * (b - c2) + vec2(0.0, 1e-3));
  vec2 nrm = vec2(-tng.y, tng.x);

  // Thick at the root, thinning as it falls, with a slight liquid wobble.
  float w = aParams.x * (1.0 - 0.55 * u) * (0.88 + 0.12 * sin(u * 24.0 - uTime * 7.0 + aParams.w * 6.2831));
  // Falling front: a round bead slightly wider than the stream behind it.
  if (aParams.y < 0.999) {
    float s = (aParams.y - u) / 0.045;
    float cap = sqrt(clamp(1.0 - (1.0 - min(s, 1.0)) * (1.0 - min(s, 1.0)), 0.0, 1.0));
    float bead = mix(1.45, 1.0, smoothstep(1.0, 2.2, s));
    w *= cap * bead;
  }
  p += nrm * side * w * 0.5;

  vAcross = side;
  vAlong = u;
  vPhase = aParams.w;
  vec3 world = vec3(p.x - uViewport.x * 0.5, uViewport.y * 0.5 - p.y, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const streamFragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uRed;
uniform vec3 uOrange;
uniform vec3 uGold;

varying float vAcross;
varying float vAlong;
varying float vPhase;

void main() {
  float x = vAcross;
  float nz = sqrt(max(0.0, 1.0 - x * x));
  float flow = 0.5 + 0.5 * sin(vAlong * 48.0 - uTime * 9.0 + vPhase * 6.2831);
  // Chrome: a hard highlight line, dark body, bright rims (a mirrored cylinder).
  float line = smoothstep(0.32, 0.0, abs(x + 0.3));
  float rim = pow(abs(x), 4.0);
  vec3 chrome = vec3(0.05, 0.055, 0.07) + vec3(0.95, 0.97, 1.0) * (line * 0.95 + rim * 0.55) * (0.75 + 0.25 * flow);
  // Molten: red edges, orange core, gold highlight travelling down.
  vec3 molten = mix(uRed * 0.8, uOrange, nz) + uGold * (line * 0.85 + flow * 0.25 * nz);
  vec3 col = mix(chrome, molten, smoothstep(0.15, 0.8, vAlong));
  float a = 1.0 - smoothstep(0.72, 1.0, abs(x));
  gl_FragColor = vec4(col * a, a);
}
`;

function srgb(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function cssColor(token: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
}

export type Stream = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  head: number;
  tail: number;
};

export class PourActor {
  readonly mesh: Mesh;
  readonly count: number;
  private readonly geometry: InstancedBufferGeometry;
  private readonly material: ShaderMaterial;
  private readonly ends: InstancedBufferAttribute;
  private readonly params: InstancedBufferAttribute;

  constructor(count: number) {
    this.count = count;
    const base = new PlaneGeometry(1, 1, 1, 48);
    const geometry = new InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.setAttribute("position", base.getAttribute("position"));
    this.ends = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.params = new InstancedBufferAttribute(new Float32Array(count * 4), 4);
    this.ends.setUsage(DynamicDrawUsage);
    this.params.setUsage(DynamicDrawUsage);
    for (let i = 0; i < count; i++) this.params.setW(i, i * 0.37);
    geometry.setAttribute("aEnds", this.ends);
    geometry.setAttribute("aParams", this.params);
    geometry.instanceCount = count;
    this.geometry = geometry;

    this.material = new ShaderMaterial({
      vertexShader: streamVertexShader,
      fragmentShader: streamFragmentShader,
      transparent: true,
      premultipliedAlpha: true,
      blending: NormalBlending,
      depthWrite: false,
      // The ribbon is built in screen space (y down), so its winding flips.
      side: DoubleSide,
      uniforms: {
        uViewport: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
        uRed: { value: srgb(cssColor("--wordmark-red", "#e0313f")) },
        uOrange: { value: srgb(cssColor("--wordmark-orange", "#f26b1d")) },
        uGold: { value: srgb(cssColor("--wordmark-gold", "#f6b73c")) },
      },
    });
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.visible = false;
  }

  update(streams: Stream[], time: number, width: number, height: number) {
    let any = false;
    for (let i = 0; i < this.count; i++) {
      const s = streams[i];
      const on = s && s.head > s.tail + 0.002 && s.width > 0.2;
      this.ends.setXYZW(i, s?.x0 ?? 0, s?.y0 ?? 0, s?.x1 ?? 0, s?.y1 ?? 0);
      this.params.setXYZ(i, on ? s.width : 0, on ? s.head : 0, on ? s.tail : 0);
      if (on) any = true;
    }
    this.ends.needsUpdate = true;
    this.params.needsUpdate = true;
    (this.material.uniforms.uViewport.value as Vector2).set(width, height);
    this.material.uniforms.uTime.value = time;
    this.mesh.visible = any;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
