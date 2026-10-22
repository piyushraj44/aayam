/**
 * Coarse device-capability tiers for the 3D stage.
 *
 * high — desktop-class: fine pointer, ≥8 logical cores, ≥8 GB (or unknown)
 *        memory and not a known integrated / mobile GPU
 * low  — ≤4 cores, ≤2 GB memory, a small touch device reporting ≤4 GB, or a
 *        software renderer
 * mid  — everything else (most phones, laptops with integrated graphics)
 */
export type DeviceTier = "high" | "mid" | "low";

type NavigatorWithMemory = Navigator & { deviceMemory?: number };

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|basic render|software/i;
const MODEST_GPU = /intel|mali|adreno|powervr|videocore|vivante|tegra/i;

/**
 * Reads the GPU name from a throwaway context (Chromium and Safari expose it;
 * Firefox returns a generic string, in which case only CPU/memory hints count).
 */
function probeGpu(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return "";
  }
}

export function detectTier(): DeviceTier {
  if (typeof window === "undefined") return "mid";
  // Development only: force a tier with ?stageTier=high|mid|low (for testing).
  if (process.env.NODE_ENV !== "production") {
    const forced = new URLSearchParams(window.location.search).get("stageTier");
    if (forced === "high" || forced === "mid" || forced === "low") return forced;
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  const minSide = Math.min(window.innerWidth, window.innerHeight);
  const gpu = probeGpu();

  const lowMemory = typeof memory === "number" && memory <= 2;
  const smallTouch = coarse && minSide < 600;

  if (
    cores <= 4 ||
    lowMemory ||
    SOFTWARE_GPU.test(gpu) ||
    (smallTouch && typeof memory === "number" && memory <= 4)
  ) {
    return "low";
  }
  if (!coarse && cores >= 8 && (typeof memory !== "number" || memory >= 8) && !MODEST_GPU.test(gpu)) {
    return "high";
  }
  return "mid";
}
