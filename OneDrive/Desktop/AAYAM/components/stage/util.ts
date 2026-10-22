import { Color } from "three";

/** Small math helpers shared by the stage modules. */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
/** Frame-rate independent exponential smoothing factor (rate per second). */
export const follow = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/** Small deterministic PRNG so procedural details look the same on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Reads a hex colour token from app/globals.css (falls back if missing). Linear RGB. */
export function readTokenColor(token: string, fallback: string): Color {
  let value = fallback;
  if (token && typeof document !== "undefined") {
    const fromCss = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
    if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(fromCss)) value = fromCss;
  }
  return new Color(value);
}

/** CSS-pixel screen position (y down, origin top-left) → world (origin centre, y up). */
export function screenToWorld(x: number, y: number, width: number, height: number): [number, number] {
  return [x - width / 2, height / 2 - y];
}
