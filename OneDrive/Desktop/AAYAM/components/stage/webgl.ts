/**
 * WebGL helpers. three.js r163+ requires WebGL 2, so that is what we test for.
 */

/** Cheap feature check that does not create a context. */
export function hasWebGL2(): boolean {
  return typeof window !== "undefined" && typeof window.WebGL2RenderingContext !== "undefined";
}

/**
 * Creates the WebGL 2 context ourselves so failure is detected without
 * three.js logging an error; three then adopts the context.
 */
export function createContext(canvas: HTMLCanvasElement, antialias: boolean): WebGL2RenderingContext | null {
  try {
    return canvas.getContext("webgl2", {
      alpha: true,
      antialias,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      // "default": a decorative effect should not wake a discrete GPU.
      powerPreference: "default",
    });
  } catch {
    return null;
  }
}

/** Schedule work after first paint, when the main thread is idle. */
export function whenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 200);
  return () => window.clearTimeout(id);
}
