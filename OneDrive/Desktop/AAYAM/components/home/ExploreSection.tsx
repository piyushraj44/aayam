import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { navItems, site } from "@/content/site";
import { Reveal } from "./Reveal";
import { SectionMarker } from "./SectionMarker";
import { pad2, rangeLine } from "./copy";
import styles from "./ExploreSection.module.css";

/** Section 03 — index of the six other destinations + closing wordmark footer. */
export function ExploreSection() {
  const destinations = navItems
    .map((item, i) => ({ ...item, index: i + 1 }))
    .filter((item) => item.href !== "/");

  return (
    <section id="explore" className={styles.explore} aria-labelledby="explore-title">
      <div className={styles.headRow}>
        <h2 id="explore-title" className={styles.title}>
          Explore
        </h2>
        <SectionMarker index={3} total={3} className={styles.marker} />
      </div>

      <ul className={styles.list}>
        {destinations.map((item) => (
          <li key={item.href} className={styles.item}>
            <Link href={item.href} className={styles.row}>
              <span className={styles.index} aria-hidden="true">
                {pad2(item.index)}
              </span>
              <span className={styles.label}>{item.label}</span>
              {!item.ready && (
                <>
                  <span className="visually-hidden">, </span>
                  <span className={styles.tag}>Coming soon</span>
                </>
              )}
              <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>

      <footer className={styles.footer}>
        <Reveal className={styles.footerMark}>
          <Wordmark alt="" sizes="(max-width: 768px) 94vw, 86vw" className={styles.wordmark} />
        </Reveal>
        <div className={styles.footerRow}>
          <p className={styles.footerLine}>{rangeLine}</p>
          <p className={styles.copyright}>
            © {site.dates.year} {site.name} · {site.institute}
          </p>
          <a href="#main" className={styles.backTop}>
            Back to top
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 19V6M6 12l6-6 6 6" />
            </svg>
          </a>
        </div>
      </footer>
    </section>
  );
}
