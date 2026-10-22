"use client";

import { motion, useReducedMotion } from "motion/react";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Seconds before this element starts revealing once in view. */
  delay?: number;
  as?: "div" | "li";
};

const variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0 },
};

/**
 * One-shot, short in-view reveal. The initial state is identical on server
 * and client (no hydration mismatch); reduced-motion users get an instant cut.
 * Without JavaScript, the <noscript> rule in app/layout.tsx (<head>) forces
 * `[data-reveal]` visible.
 */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const reduce = useReducedMotion();
  const Component = as === "li" ? motion.li : motion.div;

  return (
    <Component
      data-reveal=""
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.25 }}
      transition={reduce ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
