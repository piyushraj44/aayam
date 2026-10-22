"use client";

import { useRef } from "react";
import { useHeroProgress } from "./useHeroProgress";

type HeroSceneProps = {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** The pinned `#hero` wrapper; its (server-rendered) children stay static. */
export function HeroScene({ className, style, children }: HeroSceneProps) {
  const ref = useRef<HTMLElement>(null);
  useHeroProgress(ref);

  return (
    <section
      ref={ref}
      id="hero"
      data-touch-scene=""
      className={className}
      style={style}
      aria-labelledby="hero-title"
    >
      {children}
    </section>
  );
}
