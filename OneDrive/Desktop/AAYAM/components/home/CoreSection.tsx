import { Wordmark } from "@/components/brand/Wordmark";
import { ChromeLink } from "@/components/ui/ChromeLink";
import { site } from "@/content/site";
import { Countdown } from "./Countdown";
import { Reveal } from "./Reveal";
import { SectionMarker } from "./SectionMarker";
import { SpotlightPoster } from "./SpotlightPoster";
import { homeCopy, pad2 } from "./copy";
import styles from "./CoreSection.module.css";

/**
 * Section 02 — the video-inspired thin-line grid. The middle column holds the
 * stage anchor where the chrome orb blooms into the chromatic burst; the right
 * column holds the Spotlight COMING SOON poster with the shared countdown.
 * DOM (= mobile) order: heading → burst → poster → pillars → statement.
 */
export function CoreSection() {
  return (
    <section id="core" className={styles.core} aria-labelledby="core-title">
      <div className={styles.frame}>
        <div className={`${styles.panel} ${styles.head}`}>
          <Reveal className={styles.headInner}>
            <SectionMarker index={2} total={3} />
            <h2 id="core-title" className={styles.title}>
              <span className="visually-hidden">{site.name}</span>
              <Wordmark
                variant="chrome"
                alt=""
                sizes="(max-width: 768px) 80vw, 30vw"
                className={styles.titleMark}
              />
            </h2>
          </Reveal>
        </div>

        <div className={styles.anchorCell}>
          <div className={styles.anchor} data-stage-anchor="core" aria-hidden="true" />
        </div>

        <div className={`${styles.panel} ${styles.posterCell}`}>
          <Reveal className={styles.posterInner}>
            <SpotlightPoster className={styles.poster} />
            <Countdown className={styles.posterCountdown} />
          </Reveal>
        </div>

        <div className={`${styles.panel} ${styles.pillars}`}>
          <Reveal className={styles.pillarsInner} delay={0.08}>
            <ol className={styles.pillarList}>
              {homeCopy.pillars.map((pillar, i) => (
                <li key={pillar.label} className={styles.pillar}>
                  <span className={styles.pillarIndex} aria-hidden="true">
                    {pad2(i + 1)}
                  </span>
                  <span className={styles.pillarLabel}>{pillar.label}</span>
                  <span className={styles.pillarQualifier}>{pillar.qualifier}</span>
                </li>
              ))}
            </ol>
            <ChromeLink href="/events" arrow>
              Explore events
            </ChromeLink>
          </Reveal>
        </div>

        <div className={`${styles.panel} ${styles.line}`}>
          <Reveal className={styles.lineInner} delay={0.08}>
            <p className={styles.eyebrow}>{homeCopy.eyebrow}</p>
            <p className={styles.statement}>{homeCopy.statement}</p>
            <ChromeLink href="/about" arrow>
              Discover
            </ChromeLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
