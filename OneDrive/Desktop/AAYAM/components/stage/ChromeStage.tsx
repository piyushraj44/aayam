"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TOUCH_STATE_ATTR, type TouchState } from "@/lib/touchScene";
import styles from "./ChromeStage.module.css";
import type { StageHandle } from "./scene";
import { hasWebGL2, whenIdle } from "./webgl";

type Status = "pending" | "webgl" | "fallback" | "none";
type Anchors = { hero: HTMLElement | null; core: HTMLElement | null; hand: HTMLElement | null };

function setTouchState(state: TouchState | null) {
  const root = document.documentElement;
  if (state === null || state === "loading") delete root.dataset[TOUCH_STATE_ATTR];
  else root.dataset[TOUCH_STATE_ATTR] = state;
}

/**
 * The single WebGL stage of the Home page: the hero "Touch" (ASCII hand,
 * liquid-chrome orb, pour streams, 3D wordmark) and the orb → chromatic burst
 * morph in #core. Renders one fixed, full-viewport, non-interactive canvas and
 * places every actor over the `[data-stage-anchor]` boxes laid out by the page
 * (hand, hero, wordmark, core). three.js is imported lazily after first paint.
 *
 * Writes `<html data-touch="live | static-gl | fallback">` (absent = loading).
 * If WebGL is unavailable or fails, static images are portalled into the
 * anchors instead (Home shows its own wordmark image). Tunables:
 * components/stage/config.ts.
 */
export function ChromeStage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [anchors, setAnchors] = useState<Anchors>({ hero: null, core: null, hand: null });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const found: Anchors = {
      hero: document.querySelector<HTMLElement>('[data-stage-anchor="hero"]'),
      core: document.querySelector<HTMLElement>('[data-stage-anchor="core"]'),
      hand: document.querySelector<HTMLElement>('[data-stage-anchor="hand"]'),
    };
    setAnchors(found);
    const hasScene = document.querySelector('[data-stage-anchor="wordmark"]') !== null;
    if (!found.hero && !found.core && !found.hand && !hasScene) {
      setStatus("none");
      return;
    }

    let cancelled = false;
    let handle: StageHandle | null = null;
    const fail = () => {
      handle?.dispose();
      handle = null;
      if (cancelled) return;
      setTouchState("fallback");
      setStatus("fallback");
    };

    if (!hasWebGL2()) {
      fail();
      return () => setTouchState(null);
    }

    const cancelIdle = whenIdle(() => {
      import("./scene")
        .then(({ createStage }) => {
          if (cancelled) return;
          handle = createStage(host, {
            onReady: () => {
              if (!cancelled) setStatus("webgl");
            },
            onFatal: fail,
            onState: (state) => {
              if (!cancelled) setTouchState(state);
            },
          });
        })
        .catch(fail);
    });

    return () => {
      cancelled = true;
      cancelIdle();
      handle?.dispose();
      handle = null;
      setTouchState(null);
    };
  }, []);

  const fallback = status === "fallback";
  return (
    <>
      <div ref={hostRef} className={styles.host} aria-hidden="true" />
      {fallback && anchors.hand
        ? createPortal(
            <div className={styles.fallbackHand}>
              <Image
                src="/images/stage/hand-fallback.webp"
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className={styles.fallbackImg}
                draggable={false}
              />
            </div>,
            anchors.hand,
          )
        : null}
      {fallback && anchors.hero
        ? createPortal(
            <div className={styles.fallback}>
              <Image
                src="/images/stage/orb-fallback.webp"
                alt=""
                fill
                sizes="(max-width: 768px) 80vw, 40vw"
                className={styles.fallbackImg}
                draggable={false}
              />
            </div>,
            anchors.hero,
          )
        : null}
      {fallback && anchors.core
        ? createPortal(
            <div className={styles.fallbackBurst}>
              <Image
                src="/images/stage/burst-fallback.webp"
                alt=""
                fill
                sizes="(max-width: 768px) 250vw, 160vw"
                className={styles.fallbackImg}
                draggable={false}
              />
            </div>,
            anchors.core,
          )
        : null}
    </>
  );
}
