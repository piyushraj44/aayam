"use client";

import { useEffect, useId, useRef, useState } from "react";
import { damp } from "@/lib/touchScene";
import { site } from "@/content/site";
import { posterLabel } from "./copy";
import styles from "./SpotlightPoster.module.css";

const STRIPES = 8;
/** Resting light position (% of the card). */
const REST = { x: 50, y: 18 };
/** Numerals viewBox width (the chrome sheen band travels across it). */
const NUM_W = 300;

/**
 * "COMING SOON 13—15 NOV" — the Spotlight poster after date-poster-reference.png.
 * One soft cone sweeps onto the card when it first enters view (500 ms). Then:
 * fine pointer → the light follows the cursor (damped); touch → slow ambient
 * drift; reduced motion → static lit state. The rAF loop runs only while the
 * card is on screen, the tab is visible and the light is still moving.
 */
export function SpotlightPoster({ className }: { className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<SVGLinearGradientElement>(null);
  const [revealed, setRevealed] = useState(false);
  const gradientId = `sheen-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const card = cardRef.current;
    const sheen = sheenRef.current;
    if (!card || !sheen) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const light = { ...REST };
    const target = { ...REST };
    let raf = 0;
    let last = 0;
    let inView = false;

    const write = () => {
      card.style.setProperty("--lx", light.x.toFixed(2));
      card.style.setProperty("--ly", light.y.toFixed(2));
      sheen.setAttribute("gradientTransform", `translate(${((light.x / 100) * NUM_W).toFixed(1)} 0)`);
    };

    const frame = (now: number) => {
      raf = 0;
      // the touch drift is slow: ~30fps is plenty
      if (!fine.matches && last && now - last < 32) {
        raf = window.requestAnimationFrame(frame);
        return;
      }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!fine.matches) {
        const t = now / 1000;
        target.x = REST.x + 14 * Math.sin(t * 0.35);
        target.y = REST.y + 6 * Math.sin(t * 0.23 + 1);
      }
      light.x = damp(light.x, target.x, 0.1, dt);
      light.y = damp(light.y, target.y, 0.1, dt);
      write();
      const moving = !fine.matches || light.x !== target.x || light.y !== target.y;
      if (moving && inView && !document.hidden && !reduced.matches) raf = window.requestAnimationFrame(frame);
      else last = 0;
    };

    const kick = () => {
      if (!raf && inView && !document.hidden && !reduced.matches) raf = window.requestAnimationFrame(frame);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !inView) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.3;
      target.x = REST.x + Math.max(-0.9, Math.min(0.9, px)) * 44;
      target.y = REST.y + Math.max(-0.4, Math.min(1, py)) * 30;
      kick();
    };
    const onPointerLeave = () => {
      target.x = REST.x;
      target.y = REST.y;
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          setRevealed(true);
          kick();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(card);

    const onVisibility = () => kick();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    write();

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  const { dates } = site;

  return (
    <div
      ref={cardRef}
      className={[styles.card, className].filter(Boolean).join(" ")}
      data-revealed={revealed ? "" : undefined}
      role="img"
      aria-label={posterLabel}
    >
      <span className={styles.lit} />
      <span className={styles.cone} />
      <span className={styles.grain} />

      <span className={styles.content}>
        <span className={styles.rule} />
        <span className={styles.wide}>Coming</span>

        <span className={styles.box}>
          <svg className={styles.numerals} viewBox={`0 0 ${NUM_W} 170`} focusable="false">
            <defs>
              <linearGradient
                ref={sheenRef}
                id={gradientId}
                gradientUnits="userSpaceOnUse"
                x1={-70}
                y1={0}
                x2={70}
                y2={0}
              >
                <stop offset="0" className={styles.stopEdge} />
                <stop offset="0.5" className={styles.stopCore} />
                <stop offset="1" className={styles.stopEdge} />
              </linearGradient>
            </defs>
            <text
              x={NUM_W / 2}
              y="88"
              textAnchor="middle"
              dominantBaseline="central"
              textLength={NUM_W - 24}
              lengthAdjust="spacingAndGlyphs"
              stroke={`url(#${gradientId})`}
            >
              {dates.dayStart}—{dates.dayEnd}
            </text>
          </svg>
          <span className={styles.month}>{dates.month}</span>
        </span>

        <span className={styles.small}>{site.institute}</span>
        <span className={styles.wide}>Soon</span>

        <span className={styles.stripes}>
          {Array.from({ length: STRIPES }, (_, i) => (
            <span
              key={i}
              className={styles.stripe}
              style={{ "--mix": `${Math.round((i / (STRIPES - 1)) * 100)}%` } as React.CSSProperties}
            />
          ))}
        </span>
        <span className={styles.rule} />
      </span>
    </div>
  );
}
