/**
 * "The Touch" timeline: maps the (damped) hero progress t ∈ [0, 1] to named
 * phase values. Pure and stateless — everything here is scrubbed by scroll, so
 * scrolling back rewinds cleanly. The only time-based effect (the contact
 * flash) lives in scene.ts.
 *
 *   0.00–0.08 Arrival · 0.08–0.45 Reach · 0.45–0.52 Contact · 0.52–0.85 Pour · 0.85–1 Settle
 */
import { TOUCH_PHASES } from "@/lib/touchScene";
import { stageConfig } from "./config";
import { smoothstep } from "./util";

export const LETTER_COUNT = 5;

export type TouchFrame = {
  t: number;
  /** 0→1 across Reach (eased). */
  reach: number;
  /** 0→1 across Pour. */
  pour: number;
  /** 0→1 across Settle. */
  settle: number;
  /** How far the hand has descended toward the contact point (0 = rest). */
  handDrop: number;
  /** Hand glyph opacity (absolute). */
  handOpacity: number;
  /** Tendril extension 0→1 (1 = touching the fingertip). */
  tendril: number;
  /** Orb pose: 0 = pre-pour (lower, larger), 1 = settled hero anchor. */
  orbSettle: number;
  /** Per-letter fill level 0→1 (Λ A Y A M). */
  fill: number[];
  /** Per-letter stream head (0→1 fallen) and tail (0→1 retracted). */
  streamHead: number[];
  streamTail: number[];
  /** Drip roots under the orb while pouring (0→1). */
  pourRoots: number;
  /** Hand drip-line glyphs falling (0→1). */
  glyphRain: number;
  /** Molten front glow on the letters (fades once the fill completes). */
  frontGlow: number;
  /** One slow specular sweep across the finished wordmark (0→1). */
  sweep: number;
};

/** The point in t at which the contact event fires. */
export const CONTACT_FIRE = (TOUCH_PHASES.contactStart + TOUCH_PHASES.contactEnd) / 2;

export function touchFrame(t: number): TouchFrame {
  const P = TOUCH_PHASES;
  const wm = stageConfig.wordmark3d;
  const h = stageConfig.hand;

  const reach = smoothstep(P.arrivalEnd, P.contactStart, t);
  const pour = smoothstep(P.contactEnd, P.pourEnd, t);
  const settle = smoothstep(P.pourEnd, 1, t);

  // The hand eases back up right after contact and fades into atmosphere.
  const release = smoothstep(P.contactEnd, P.contactEnd + 0.2, t);
  const handDrop = reach * (1 - release);
  const handOpacity = h.opacity + (h.settledOpacity - h.opacity) * smoothstep(P.contactEnd + 0.04, P.pourEnd + 0.06, t);

  const tendril =
    smoothstep(P.arrivalEnd + 0.06, P.contactStart + 0.02, t) * (1 - smoothstep(P.contactEnd, P.contactEnd + 0.09, t));

  const fill: number[] = [];
  const streamHead: number[] = [];
  const streamTail: number[] = [];
  for (let i = 0; i < LETTER_COUNT; i++) {
    const s = P.contactEnd + 0.08 + i * wm.fillStagger;
    const e = s + wm.fillDuration;
    fill.push(smoothstep(s, e, t));
    streamHead.push(smoothstep(s - 0.035, s + 0.01, t));
    streamTail.push(smoothstep(e - 0.03, e + 0.04, t));
  }

  return {
    t,
    reach,
    pour,
    settle,
    handDrop,
    handOpacity,
    tendril,
    // The orb rises early in the pour so the streams have room to fall.
    orbSettle: smoothstep(P.contactEnd, P.contactEnd + 0.14, t),
    fill,
    streamHead,
    streamTail,
    pourRoots: smoothstep(P.contactEnd - 0.01, P.contactEnd + 0.05, t) * (1 - smoothstep(P.pourEnd - 0.06, P.pourEnd + 0.06, t)),
    glyphRain: smoothstep(P.contactEnd, P.contactEnd + 0.08, t) * (1 - smoothstep(P.pourEnd - 0.05, P.pourEnd + 0.08, t)),
    frontGlow: 1 - smoothstep(P.pourEnd, P.pourEnd + 0.1, t),
    sweep: smoothstep(P.pourEnd, 1, t),
  };
}
