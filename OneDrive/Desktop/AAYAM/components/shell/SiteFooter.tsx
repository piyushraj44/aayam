import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import {
  businessEmail,
  contacts,
  credit,
  navItems,
  site,
  socials,
  type SocialLink,
} from "@/content/site";
import styles from "./SiteFooter.module.css";

type SiteFooterProps = {
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

/** Outline phone handset (contact rows). */
function PhoneIcon() {
  return (
    <svg
      className={styles.inlineIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 7 7l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3.5 5.5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

/** Outline envelope (contact rows, business email). */
function MailIcon() {
  return (
    <svg
      className={styles.inlineIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
    </svg>
  );
}

/**
 * Site-wide footer in three columns: brand + official social accounts, quick
 * links (centre), and "For general queries" contacts from content/site.ts.
 */
export function SiteFooter({ className }: SiteFooterProps) {
  const quickLinks = navItems.filter((item) => item.href !== "/");
  const liveSocials = socials.filter((social) => social.href);

  return (
    <footer className={[styles.footer, className].filter(Boolean).join(" ")}>
      <div className={styles.grid}>
        <div className={styles.brand}>
          {/* Lock-up after the Alcheringa footer: "NIT Agartala's / AAYAM / 2026" */}
          <Link href="/" className={styles.brandLink} aria-label={`${site.institute}'s ${site.name} ${site.year} — home`}>
            <span className={styles.lockupInstitute} aria-hidden="true">
              {site.institute}&apos;s
            </span>
            <Wordmark variant="chrome" alt="" sizes="200px" className={styles.mark} />
            <span className={styles.lockupYear} aria-hidden="true">
              {site.year}
            </span>
          </Link>
          <div className={styles.business}>
            <p className={styles.businessLabel}>For business &amp; sponsorship queries</p>
            <a href={`mailto:${businessEmail}`} className={styles.businessLink}>
              <MailIcon />
              {businessEmail}
            </a>
          </div>
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
          <p className={styles.credit}>{credit}</p>
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

        <div className={styles.queries}>
          <h2 className={styles.heading}>For general queries</h2>
          {contacts.length > 0 ? (
            <ul className={styles.contactList}>
              {contacts.map((contact) => (
                <li key={contact.name} className={styles.contact}>
                  <p className={styles.contactName}>{contact.name}</p>
                  <p className={styles.contactRole}>{contact.role}</p>
                  {contact.phone ? (
                    <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className={styles.contactLink}>
                      <PhoneIcon />
                      {contact.phone}
                    </a>
                  ) : null}
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className={styles.contactLink}>
                      <MailIcon />
                      {contact.email}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.pending}>Contact details coming soon.</p>
          )}
        </div>
      </div>
    </footer>
  );
}
