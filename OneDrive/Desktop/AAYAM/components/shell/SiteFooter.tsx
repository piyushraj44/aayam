import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { ChromeLink } from "@/components/ui/ChromeLink";
import { navItems, site, socials, type SocialLink } from "@/content/site";
import styles from "./SiteFooter.module.css";

type SiteFooterProps = {
  /** Show the "Back to top" link. Turn off on pages that never scroll. */
  backToTop?: boolean;
  className?: string;
};

const ICONS: Record<SocialLink["label"], React.ReactNode> = {
  Instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  LinkedIn: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 10.5v6M8 7.6v.1M11.5 16.5v-6M11.5 13.2c0-1.6 1-2.7 2.4-2.7s2.1 1 2.1 2.6v3.4" />
    </>
  ),
  X: <path d="M4.5 4.5l15 15M19.5 4.5l-15 15" />,
  YouTube: (
    <>
      <rect x="2.8" y="6" width="18.4" height="12" rx="3.5" />
      <path d="M10.5 9.6v4.8l4-2.4z" fill="currentColor" />
    </>
  ),
  Facebook: <path d="M14.5 20.5v-7h2.4l.4-2.8h-2.8V9c0-.8.3-1.4 1.4-1.4h1.5V5.1a19 19 0 0 0-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v2h-2.4v2.8h2.4v7" />,
};

/**
 * Site-wide footer: brand, quick links to every section, and the official
 * social accounts (only those with a confirmed URL in content/site.ts).
 */
export function SiteFooter({ backToTop = true, className }: SiteFooterProps) {
  const quickLinks = navItems.filter((item) => item.href !== "/");
  const liveSocials = socials.filter((social) => social.href);

  return (
    <footer className={[styles.footer, className].filter(Boolean).join(" ")}>
      <div className={styles.grid}>
        <div className={styles.brand}>
          <Link href="/" className={styles.brandLink} aria-label={`${site.name} home`}>
            <Wordmark variant="chrome" alt="" sizes="180px" className={styles.mark} />
          </Link>
          <p className={styles.tagline}>
            {site.institute}&apos;s annual technical fest
          </p>
          {liveSocials.length > 0 ? (
            <ul className={styles.socials} aria-label="Follow AAYAM">
              {liveSocials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.social}
                    aria-label={`${social.label} (opens in a new tab)`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="22"
                      height="22"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      focusable="false"
                    >
                      {ICONS[social.label]}
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav className={styles.links} aria-label="Quick links">
          <h2 className={styles.heading}>Quick links</h2>
          <ul>
            {quickLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.bottom}>
        <p className={styles.copy}>
          © {site.year} {site.name} · {site.institute}
        </p>
        {backToTop ? (
          <ChromeLink href="#main" variant="ghost" className={styles.top}>
            Back to top
          </ChromeLink>
        ) : null}
      </div>
    </footer>
  );
}
