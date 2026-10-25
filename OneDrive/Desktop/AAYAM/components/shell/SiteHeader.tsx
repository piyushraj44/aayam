"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { site } from "@/content/site";
import { NavigationOverlay } from "./NavigationOverlay";
import styles from "./SiteHeader.module.css";

const OVERLAY_ID = "site-navigation";
const SCROLL_THRESHOLD = 24;

export function SiteHeader() {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  /**
   * The overlay is open only while the route it was opened on is current, so
   * any route change (link click, back/forward) closes it without an effect.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const close = useCallback(() => setOpenedOn(null), []);

  return (
    <>
      <header
        ref={headerRef}
        className={[styles.header, scrolled ? styles.scrolled : null].filter(Boolean).join(" ")}
      >
        <Link href="/" className={styles.brand} aria-label={`${site.name} home`}>
          <Wordmark variant="chrome" alt="" sizes="120px" className={styles.mark} />
        </Link>

        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls={OVERLAY_ID}
          aria-haspopup="dialog"
          onClick={() => setOpenedOn(pathname)}
        >
          <span className={styles.triggerLabel} aria-hidden="true">
            Menu
          </span>
          <span className={styles.icon} aria-hidden="true">
            <span />
            <span />
          </span>
        </button>
      </header>

      <NavigationOverlay
        id={OVERLAY_ID}
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        headerRef={headerRef}
      />
    </>
  );
}
