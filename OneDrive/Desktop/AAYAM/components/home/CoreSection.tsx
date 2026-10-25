import { Wordmark } from "@/components/brand/Wordmark";
import { ChromeLink } from "@/components/ui/ChromeLink";
import { site } from "@/content/site";
import { Reveal } from "./Reveal";
import { SpotlightPoster } from "./SpotlightPoster";
import { homeCopy } from "./copy";
import styles from "./CoreSection.module.css";

/**
 * Section 02 — the video-inspired thin-line grid. The middle column holds the
 * stage anchor where the chrome orb blooms into the chromatic burst; the right
 * column holds the Spotlight COMING SOON poster.
 * DOM (= mobile) order: heading → burst → poster → pillars → statement.
 */
export function CoreSection() {
  return (
    <section id="core" className={styles.core} aria-labelledby="core-title">
      <div className={styles.frame}>
        <div className={`${styles.panel} ${styles.head}`}>
          <Reveal className={styles.headInner}>
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
          </Reveal>
        </div>

        <div className={`${styles.panel} ${styles.pillars}`}>
          <Reveal className={styles.pillarsInner} delay={0.08}>
            <ul className={styles.pillarList}>
              {homeCopy.pillars.map((pillar) => (
                <li key={pillar.label} className={styles.pillar}>
                  <span className={styles.pillarLabel}>{pillar.label}</span>
                  <span className={styles.pillarQualifier}>{pillar.qualifier}</span>
                </li>
              ))}
            </ul>
            <ChromeLink href="/events" arrow>
              Explore events
            </ChromeLink>
          </Reveal>
        </div>

        <div className={`${styles.panel} ${styles.line}`}>
          <Reveal className={styles.lineInner} delay={0.08}>
            <p className={styles.eyebrow}>{homeCopy.eyebrow}</p>
            <p className={styles.statement}>{homeCopy.statement}</p>
            <ChromeLink href="/merch" arrow>
              Get the merch
            </ChromeLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
