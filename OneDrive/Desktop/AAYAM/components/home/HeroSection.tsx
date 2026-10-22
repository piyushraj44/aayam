import { Wordmark } from "@/components/brand/Wordmark";
import { ChromeLink } from "@/components/ui/ChromeLink";
import { site } from "@/content/site";
import { TOUCH_PHASES, TOUCH_PIN_SVH } from "@/lib/touchScene";
import wordmarkArt from "@/public/images/brand/aayam-wordmark@2x.webp";
import mouldEdge from "@/public/images/home/wordmark-mould-edge.webp";
import mouldFill from "@/public/images/home/wordmark-mould-fill.webp";
import { Countdown } from "./Countdown";
import { HeroScene } from "./HeroScene";
import { SectionMarker } from "./SectionMarker";
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
      <div className={styles.stage}>
        <div className={styles.handSlot}>
          <div className={styles.anchorFill} data-stage-anchor="hand" aria-hidden="true" />
        </div>

        <div className={styles.topRow}>
          <SectionMarker index={1} total={3} />
          <span className={styles.topRule} aria-hidden="true" />
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
            <p className={styles.date}>
              <span className={styles.dateMain}>{site.dates.rangeShort}</span>
              <span className={styles.dateCaption}>
                {site.dates.year} · {site.institute.toUpperCase()}
              </span>
            </p>
            <Countdown className={styles.countdown} />
          </div>

          <div className={styles.intro} data-hero-intro="">
            <p className={styles.description}>{site.description}</p>
            <ChromeLink href="/events" arrow>
              Explore events
            </ChromeLink>
          </div>
        </div>
      </div>

      {/* top edge = the moment the pin releases (wrapper bottom − 100svh) */}
      <span id="hero-end" className={styles.end} />
    </HeroScene>
  );
}
