import { Wordmark } from "@/components/brand/Wordmark";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { ChromeLink } from "@/components/ui/ChromeLink";
import { site } from "@/content/site";
import styles from "./StatusScreen.module.css";

type StatusScreenProps = {
  /** Small eyebrow that names the page; part of the h1's accessible text. */
  eyebrow: string;
  /** The big chrome display line, e.g. "Coming soon" or "404". */
  display: string;
  /** Render the display line as outlined numerals (404). */
  outlined?: boolean;
  description: string;
};

/**
 * Shared full-height composition used by the Coming Soon routes and the 404
 * page: hairline frame, small chrome wordmark, one h1, back-home link, footer.
 * Pure CSS — no 3D, no client JS.
 */
export function StatusScreen({
  eyebrow,
  display,
  outlined = false,
  description,
}: StatusScreenProps) {
  return (
    <div className={styles.page}>
      <section className={styles.stage} aria-labelledby="status-title">
        <div className={styles.frame} aria-hidden="true">
          <span className={`${styles.corner} ${styles.tl}`} />
          <span className={`${styles.corner} ${styles.tr}`} />
          <span className={`${styles.corner} ${styles.bl}`} />
          <span className={`${styles.corner} ${styles.br}`} />
          <span className={styles.dates}>{site.dateStatus}</span>
        </div>

        <div className={styles.content}>
          <div className={styles.drip} aria-hidden="true">
            <span className={styles.drop} />
          </div>

          <Wordmark variant="chrome" alt="" sizes="160px" priority className={styles.mark} />

          <h1 id="status-title" className={styles.title}>
            <span className={styles.eyebrow}>
              {eyebrow}
            </span>
            <span className="visually-hidden"> — </span>
            <span className={outlined ? styles.outlined : styles.chrome}>{display}</span>
          </h1>

          <span className={styles.rule} aria-hidden="true" />

          <p className={styles.description}>{description}</p>

          <ChromeLink href="/" arrow className={styles.back}>
            Back to home
          </ChromeLink>
        </div>
      </section>

      <SiteFooter backToTop={false} />
    </div>
  );
}
