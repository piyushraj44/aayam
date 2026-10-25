import { Wordmark } from "@/components/brand/Wordmark";
import { site } from "@/content/site";
import { Reveal } from "./Reveal";
import { SpotlightPoster } from "./SpotlightPoster";
import { homeCopy } from "./copy";
import styles from "./CoreSection.module.css";

/**
 * Section 02 — static. The text column slides in from the left and the
 * Spotlight poster from the right, once, when the section enters view.
 * DOM (= mobile) order: heading → statement → poster.
 */
export function CoreSection() {
  return (
    <section id="core" className={styles.core} aria-labelledby="core-title">
      <div className={styles.frame}>
        <Reveal from="left" className={styles.text}>
          <h2 id="core-title" className={styles.title}>
            <span className="visually-hidden">{site.name}</span>
            <Wordmark
              variant="chrome"
              alt=""
              sizes="(max-width: 767px) 80vw, 40vw"
              className={styles.titleMark}
            />
          </h2>

          <div className={styles.line}>
            <p className={styles.eyebrow}>{homeCopy.eyebrow}</p>
            <p className={styles.statement}>{homeCopy.statement}</p>
          </div>
        </Reveal>

        <Reveal from="right" delay={0.15} className={styles.posterCell}>
          <SpotlightPoster className={styles.poster} />
        </Reveal>
      </div>
    </section>
  );
}
