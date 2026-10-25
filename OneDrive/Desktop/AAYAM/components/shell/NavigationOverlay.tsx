"use client";

import { useEffect, useRef } from "react";
import type { MouseEvent, KeyboardEvent, RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import { Wordmark } from "@/components/brand/Wordmark";
import { navItems, site } from "@/content/site";
import styles from "./NavigationOverlay.module.css";

type NavigationOverlayProps = {
  id: string;
  open: boolean;
  onClose: () => void;
  /** Focus returns here when the overlay closes. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Made inert (with #main and the skip link) while the overlay is open. */
  headerRef: RefObject<HTMLElement | null>;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

const panelMotion: Variants = {
  closed: {
    clipPath: "inset(0% 0% 100% 0%)",
    transition: { duration: 0.38, ease: EASE_IN_OUT },
  },
  open: {
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.46, ease: EASE_OUT, delayChildren: 0.1, staggerChildren: 0.04 },
  },
};

const rowMotion: Variants = {
  closed: { opacity: 0, y: 28, transition: { duration: 0.18 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

/* Reduced motion: opacity only, near-instant */
const panelReduced: Variants = {
  closed: { opacity: 0, transition: { duration: 0.12 } },
  open: { opacity: 1, transition: { duration: 0.12 } },
};

const rowReduced: Variants = {
  closed: { opacity: 1 },
  open: { opacity: 1 },
};

function isPlainLeftClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
  );
}

export function NavigationOverlay({
  id,
  open,
  onClose,
  triggerRef,
  headerRef,
}: NavigationOverlayProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() ?? false;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  /** Set by the Home link on "/" — scroll to top once the scroll lock is released. */
  const scrollTopOnClose = useRef(false);

  // Scroll lock, background inert, initial focus, focus return.
  useEffect(() => {
    if (!open) return;

    const body = document.body;
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;

    body.dataset.scrollLocked = "true";
    if (scrollbar > 0) {
      body.style.paddingRight = `${scrollbar}px`;
      root.style.setProperty("--scrollbar-comp", `${scrollbar}px`);
    }

    const background = [
      document.getElementById("main"),
      document.querySelector<HTMLElement>(".skip-link"),
      headerRef.current,
    ].filter((el): el is HTMLElement => el !== null);
    background.forEach((el) => {
      el.inert = true;
    });

    closeRef.current?.focus({ preventScroll: true });

    const trigger = triggerRef.current;
    return () => {
      delete body.dataset.scrollLocked;
      body.style.removeProperty("padding-right");
      root.style.removeProperty("--scrollbar-comp");
      background.forEach((el) => {
        el.inert = false;
      });
      trigger?.focus({ preventScroll: true });
      if (scrollTopOnClose.current) {
        scrollTopOnClose.current = false;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "instant" : "smooth" });
      }
    };
  }, [open, headerRef, triggerRef]);

  // Escape closes (listens on document so it works wherever focus is).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Keep Tab / Shift+Tab inside the dialog.
  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const inside = active instanceof Node && dialogRef.current.contains(active);

    if (event.shiftKey && (active === first || !inside || active === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !inside)) {
      event.preventDefault();
      first.focus();
    }
  };

  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!isPlainLeftClick(event)) return;
    if (href === "/" && pathname === "/") {
      event.preventDefault();
      scrollTopOnClose.current = true;
      onClose();
      return;
    }
    onClose();
  };

  const panel = reduceMotion ? panelReduced : panelMotion;
  const row = reduceMotion ? rowReduced : rowMotion;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="site-navigation"
          ref={dialogRef}
          id={id}
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          tabIndex={-1}
          onKeyDown={trapFocus}
          variants={panel}
          initial="closed"
          animate="open"
          exit="closed"
        >
          <div className={styles.grid} aria-hidden="true" />

          <div className={styles.topBar}>
            <Wordmark variant="chrome" alt="" sizes="120px" className={styles.mark} />
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="Close navigation"
              onClick={onClose}
            >
              <span aria-hidden="true">Close</span>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
                <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.25" fill="none" />
              </svg>
            </button>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            <ul className={styles.list}>
              {navItems.map((item) => {
                const current = item.href === pathname;
                return (
                  <motion.li key={item.href} className={styles.row} variants={row}>
                    <Link
                      href={item.href}
                      className={styles.link}
                      aria-current={current ? "page" : undefined}
                      onClick={(event) => onLinkClick(event, item.href)}
                    >
                      <span className={styles.label}>{item.label}</span>
                      <span className={styles.meta}>
                        {current ? (
                          <span className={styles.current} aria-hidden="true">
                            Current
                          </span>
                        ) : null}
                        {!item.ready ? (
                          <span className={styles.tag}>
                            <span className="visually-hidden">, </span>
                            Coming soon
                          </span>
                        ) : null}
                      </span>
                      <svg
                        className={styles.arrow}
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.25" />
                      </svg>
                      <span className={styles.sweep} aria-hidden="true" />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          </nav>

          <motion.p className={styles.footer} variants={row}>
            <span>{site.dateStatus}</span>
            <span aria-hidden="true" className={styles.dot}>
              ·
            </span>
            <span>{site.institute}</span>
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
