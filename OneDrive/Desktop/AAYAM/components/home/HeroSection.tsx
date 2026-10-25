import { Wordmark } from "@/components/brand/Wordmark";
import { ChromeLink } from "@/components/ui/ChromeLink";
import { site } from "@/content/site";
import { TOUCH_PHASES, TOUCH_PIN_SVH } from "@/lib/touchScene";
import wordmarkArt from "@/public/images/brand/aayam-wordmark@2x.webp";
import mouldEdge from "@/public/images/home/wordmark-mould-edge.webp";
import mouldFill from "@/public/images/home/wordmark-mould-fill.webp";
import { HeroScene } from "./HeroScene";
import styles from "./HeroSection.module.css";

/** Every scene number comes from lib/touchScene.ts (CSS only reads these vars). */
const sceneVars = {
  "--pin-desktop": `${TOUCH_PIN_SVH.desktop}svh`,
  "--pin-mobile": `${TOUCH_PIN_SVH.mobile}svh`,
  "--pour-start": TOUCH_PHASES.contactEnd,
  "--pour-end": TOUCH_PHASES.pourEnd,
} as React.CSSProperties;

/** The settled wordmark box keeps the brand art's aspect (renders may be swapped, aspect stays). */
const wordmarkVars = {
  "--wm-aspect": wordmarkArt.width / wordmarkArt.height,
  "--mould-fill": `url(${mouldFill.src})`,
  "--mould-edge": `url(${mouldEdge.src})`,
} as React.CSSProperties;

/**
 * Section 01 — "The Touch". A pinned wrapper (CSS sticky, native scroll) whose
 * 100svh stage holds the hero content and the stage anchors (hand / orb /
 * wordmark). `--hero-t` (damped scroll progress, written by HeroScene) drives
 * the mould fade, the loading-state wordmark and the Settle reveal; the 3D
 * stage animates its own actors against the same anchors.
 */
export function HeroSection() {
  return (
    <HeroScene className={styles.scene} style={sceneVars}>
      {/* Skip-intro target. Top edge = the moment the pin releases (wrapper
          bottom − 100svh; positioned by CSS). First in the DOM so that, after
          skipping, the next Tab continues with the hero's own links. */}
      <span id="hero-end" className={styles.end} />

      <div className={styles.stage}>
        <div className={styles.handSlot}>
          <div className={styles.anchorFill} data-stage-anchor="hand" aria-hidden="true" />
        </div>

        <div className={styles.center}>
          <div className={styles.orbSlot}>
            <div className={styles.anchorFill} data-stage-anchor="hero" aria-hidden="true" />
          </div>

          <div className={styles.wordmarkBox} style={wordmarkVars}>
            <div className={styles.anchorFill} data-stage-anchor="wordmark" aria-hidden="true" />
            <span className={styles.mould} aria-hidden="true">
              <span className={styles.mouldEdge} />
            </span>
            <h1 id="hero-title" className={styles.title}>
              <Wordmark
                priority
                alt={site.name}
                sizes="(max-width: 767px) 90vw, 960px"
                className={styles.heroImage}
              />
              <span className="visually-hidden"> — {site.institute}&apos;s annual technical fest</span>
            </h1>
          </div>
        </div>

        <div className={styles.bottom}>
          {/* Skip intro first in focus order (skip-link convention) */}
          <div className={styles.cues}>
            <a className={styles.skip} href="#hero-end">
              Skip intro
            </a>
            <a className={styles.scrollCue} href="#core">
              <span className={styles.scrollLabel}>Scroll to explore</span>
              <span className={styles.scrollLine} aria-hidden="true" />
            </a>
          </div>

          <div className={styles.dateBlock}>
            {/* Fest dates stay hidden until the organisers announce them. */}
            <p className={styles.date}>
              <span className={styles.dateMain}>DATE REVEAL</span>
              <span className={styles.dateCaption}>COMING SOON</span>
            </p>
          </div>

          <div className={styles.intro} data-hero-intro="">
            <p className={styles.description}>{site.description}</p>
            <ChromeLink href="/events" arrow>
              Explore events
            </ChromeLink>
          </div>
        </div>
      </div>
    </HeroScene>
  );
}
