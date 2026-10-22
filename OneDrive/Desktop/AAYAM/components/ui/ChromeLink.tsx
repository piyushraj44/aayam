import Link from "next/link";
import styles from "./ChromeLink.module.css";

export type ChromeLinkProps = {
  href: string;
  children: React.ReactNode;
  /** outline — thin liquid-silver frame with a chrome sweep; ghost — text + underline sweep */
  variant?: "outline" | "ghost";
  /** Show a trailing arrow that nudges on hover/focus. */
  arrow?: boolean;
  className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

const EXTERNAL = /^https?:\/\//i;

/**
 * Restrained chrome link. Internal hrefs use next/link; absolute http(s)
 * hrefs open in a new tab with a safe `rel`.
 */
export function ChromeLink({
  href,
  children,
  variant = "outline",
  arrow = false,
  className,
  target,
  rel,
  ...rest
}: ChromeLinkProps) {
  const isExternal = EXTERNAL.test(href);
  const classes = [styles.link, styles[variant], className].filter(Boolean).join(" ");

  return (
    <Link
      href={href}
      className={classes}
      target={isExternal ? "_blank" : target}
      rel={isExternal ? "noopener noreferrer" : rel}
      {...rest}
    >
      <span className={styles.label}>{children}</span>
      {arrow ? (
        <svg
          className={styles.arrow}
          viewBox="0 0 16 16"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M2 8h11M9 3.5 13.5 8 9 12.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      ) : null}
      {isExternal ? <span className="visually-hidden"> (opens in a new tab)</span> : null}
    </Link>
  );
}
