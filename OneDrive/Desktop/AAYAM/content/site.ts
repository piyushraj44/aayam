/**
 * Single source of truth for approved site copy, dates and routes.
 * Only add information here once the organisers have confirmed it.
 */

export const site = {
  name: "AAYAM",
  institute: "NIT Agartala",
  instituteFull: "National Institute of Technology Agartala",
  /**
   * Canonical origin used by metadata, sitemap and robots. Set NEXT_PUBLIC_SITE_URL
   * to the confirmed production domain when deploying; on Vercel the project's
   * production URL is used automatically.
   */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  description:
    "AAYAM, NIT Agartala's annual technical fest, celebrates the stories, memories, and innovation that bring us together. Over three vibrant days, it showcases the best of student life through thrilling competitions, dynamic performances, and high-energy workshops.",
  shortDescription: "The annual technical fest of NIT Agartala. 13–15 November 2026.",
  dates: {
    /** ISO timestamps in IST. The countdown targets `start`. */
    start: "2026-11-13T00:00:00+05:30",
    end: "2026-11-15T23:59:59+05:30",
    /** Display strings */
    rangeShort: "NOV 13–15",
    dayStart: "13",
    dayEnd: "15",
    month: "NOV",
    monthLong: "November",
    year: "2026",
  },
} as const;

export type NavItem = {
  label: string;
  href: string;
  /** false → the route renders the shared Coming Soon state */
  ready: boolean;
};

/** Exactly the seven approved top-level destinations, in order. */
export const navItems: readonly NavItem[] = [
  { label: "Home", href: "/", ready: true },
  { label: "About", href: "/about", ready: false },
  { label: "Events", href: "/events", ready: false },
  { label: "Guests", href: "/guests", ready: false },
  { label: "Schedule", href: "/schedule", ready: false },
  { label: "Sponsors", href: "/sponsors", ready: false },
  { label: "Our Team", href: "/team", ready: false },
] as const;
