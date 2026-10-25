/**
 * Shared contract for the Home hero "Touch" scene — used by both the Home layout
 * (components/home) and the WebGL stage (components/stage). Pure, framework-free.
 */

/** Pinned wrapper heights: how much scrolling the Touch intro takes (longer = slower animation). */
export const TOUCH_PIN_SVH = { desktop: 260, mobile: 210 } as const;

/** Viewport width (px) below which the mobile pin height and composition apply. */
export const TOUCH_MOBILE_MAX = 767;

/**
 * Lifecycle of the hero scene, written by the stage to
 * `document.documentElement.dataset.touch`:
 * - "loading"   — default before the stage is ready; Home shows the static wordmark image driven by --hero-t
 * - "live"      — WebGL is animating the Touch; Home hides its wordmark image (3D draws it)
 * - "static-gl" — reduced motion with working WebGL: a single settled frame, no pin, Home hides its image
 * - "fallback"  — no WebGL / failure: no pin, Home shows its wordmark image fully; stage portals static images
 */
export type TouchState = "loading" | "live" | "static-gl" | "fallback";

export const TOUCH_STATE_ATTR = "touch";

/** Phase boundaries on hero progress t ∈ [0, 1] (docs/PROMPT-the-touch.md §3). */
export const TOUCH_PHASES = {
  arrivalEnd: 0.08,
  contactStart: 0.45,
  contactEnd: 0.52,
  /** contact re-arms when scrolling back below this */
  contactRearm: 0.4,
  pourEnd: 0.85,
} as const;

/**
 * Raw (undamped) hero progress for a pinned wrapper element.
 * 0 when the wrapper top reaches the viewport top, 1 when the pin releases.
 */
export function heroProgress(wrapper: Element, viewportHeight: number): number {
  const r = wrapper.getBoundingClientRect();
  const travel = r.height - viewportHeight;
  if (travel <= 1) return 1;
  const t = -r.top / travel;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Frame-rate-independent exponential damping toward a target.
 * `rate` is the fraction covered per 60fps frame (≈0.12–0.18 per the spec).
 */
export function damp(current: number, target: number, rate: number, dtSeconds: number): number {
  const k = 1 - Math.pow(1 - rate, dtSeconds * 60);
  const next = current + (target - current) * k;
  return Math.abs(target - next) < 1e-4 ? target : next;
}
