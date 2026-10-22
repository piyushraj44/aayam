"use client";

import { useEffect } from "react";
import { damp, heroProgress } from "@/lib/touchScene";

/** Per-60fps-frame smoothing for --hero-t (docs/TOUCH-CONTRACT.md). */
const DAMP_RATE = 0.15;
/** At/above this the intro counts as finished (the Skip intro link retires). */
const SETTLED_AT = 0.98;

/**
 * Keeps `--hero-t` on the pinned wrapper damped toward `heroProgress()`.
 * Passive scroll/resize listeners only kick a rAF loop, which stops as soon as
 * the value settles. Reduced motion snaps (no easing). Also publishes the
 * height of `[data-hero-intro]` as `--hero-intro-h` (mobile reserves it below
 * the pinned stage).
 */
export function useHeroProgress(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let current = heroProgress(el, window.innerHeight);
    let raf = 0;
    let last = 0;
    let settled: boolean | null = null;

    const write = (value: number) => {
      el.style.setProperty("--hero-t", value.toFixed(4));
      const isSettled = value >= SETTLED_AT;
      if (isSettled !== settled) {
        settled = isSettled;
        el.toggleAttribute("data-hero-settled", isSettled);
      }
    };

    const step = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      const target = heroProgress(el, window.innerHeight);
      current = reduced.matches ? target : damp(current, target, DAMP_RATE, dt);
      write(current);
      if (current !== target) raf = window.requestAnimationFrame(step);
      else last = 0;
    };

    const kick = () => {
      if (!raf) raf = window.requestAnimationFrame(step);
    };

    write(current);

    const intro = el.querySelector<HTMLElement>("[data-hero-intro]");
    const ro = new ResizeObserver(() => {
      if (intro) el.style.setProperty("--hero-intro-h", `${Math.ceil(intro.offsetHeight)}px`);
      kick();
    });
    ro.observe(el);
    if (intro) ro.observe(intro);

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, [ref]);
}
