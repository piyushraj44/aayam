"use client";

import { motion, useReducedMotion } from "motion/react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds before this element starts revealing once in view. */
  delay?: number;
  as?: "div" | "li";
  /** Direction the element enters from ("pop" scales up in place). */
  from?: "below" | "left" | "right" | "pop";
};

const OFFSET = {
  below: { x: 0, y: 18, scale: 1 },
  left: { x: -120, y: 0, scale: 1 },
  right: { x: 120, y: 0, scale: 1 },
  pop: { x: 0, y: 0, scale: 0.88 },
} as const;

/** Seconds per entrance: the side slides are long and soft, pops are brisk. */
const DURATION = { below: 0.6, left: 1.4, right: 1.4, pop: 0.7 } as const;

/** Gentle ease-out with a long, soft landing. */
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * One-shot in-view reveal. The initial state is identical on server
 * and client (no hydration mismatch); reduced-motion users get an instant cut.
 * Without JavaScript, the <noscript> rule in app/layout.tsx (<head>) forces
 * `[data-reveal]` visible.
 */
export function Reveal({ children, className, delay = 0, as = "div", from = "below" }: RevealProps) {
  const reduce = useReducedMotion();
  const Component = as === "li" ? motion.li : motion.div;
  const variants = {
    hidden: { opacity: 0, ...OFFSET[from] },
    shown: { opacity: 1, x: 0, y: 0, scale: 1 },
  };

  return (
    <Component
      data-reveal=""
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.25 }}
      transition={reduce ? { duration: 0 } : { duration: DURATION[from], delay, ease: EASE }}
    >
      {children}
    </Component>
  );
}
