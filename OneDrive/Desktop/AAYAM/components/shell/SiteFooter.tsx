import { site } from "@/content/site";
import { ChromeLink } from "@/components/ui/ChromeLink";
import styles from "./SiteFooter.module.css";

type SiteFooterProps = {
  /** Show the "Back to top" link. Turn off on pages that never scroll. */
  backToTop?: boolean;
  className?: string;
};

/** Compact footer (© line + optional back-to-top link). */
export function SiteFooter({ backToTop = true, className }: SiteFooterProps) {
  return (
    <footer className={[styles.footer, className].filter(Boolean).join(" ")}>
      <p className={styles.copy}>
        © {site.dates.year} {site.name} · {site.institute}
      </p>
      {backToTop ? (
        <ChromeLink href="#main" variant="ghost" className={styles.top}>
          Back to top
        </ChromeLink>
      ) : null}
    </footer>
  );
}
