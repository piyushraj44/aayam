/**
 * Single source of truth for approved site copy, links and routes.
 * Only add information here once the organisers have confirmed it.
 */

export const site = {
  name: "AAYAM",
  institute: "NIT Agartala",
  instituteFull: "National Institute of Technology Agartala",
  /** Edition year, used in page titles and the copyright line (not a fest date). */
  year: "2026",
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
  shortDescription: "The annual technical fest of NIT Agartala. Date reveal soon.",
  /**
   * Fest dates are hidden until the organisers announce them. Every place that
   * used to show a date shows this status instead.
   */
  dateStatus: "Date reveal soon",
} as const;

export type SocialLink = {
  label: "Instagram" | "LinkedIn" | "X" | "YouTube" | "Facebook";
  /** Leave empty until the official account is confirmed — empty links are not rendered. */
  href: string;
};

/**
 * Official social accounts. The footer renders an icon only for entries with an
 * `href`, so nothing dead is ever shown. Paste the confirmed URLs here.
 */
export const socials: readonly SocialLink[] = [
  { label: "Instagram", href: "https://www.instagram.com/aayam.nita/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/aayam-techfest-agartala-41673991/" },
  { label: "X", href: "" },
  { label: "YouTube", href: "" },
];

export type NavItem = {
  label: string;
  href: string;
  /** false → the route renders the shared Coming Soon state */
  ready: boolean;
};

/** Exactly the seven approved top-level destinations, in order. */
export const navItems: readonly NavItem[] = [
  { label: "Home", href: "/", ready: true },
  { label: "Events", href: "/events", ready: false },
  { label: "Guests", href: "/guests", ready: false },
  { label: "Timeline", href: "/timeline", ready: false },
  { label: "Sponsors", href: "/sponsors", ready: false },
  { label: "Merch", href: "/merch", ready: true },
  { label: "Our Team", href: "/team", ready: false },
] as const;

export type MerchItem = {
  name: string;
  /** Price in Indian rupees */
  price: number;
  image: string;
  alt: string;
};

/** Official AAYAM merchandise (images in public/images/merch/). */
export const merch: readonly MerchItem[] = [
  {
    name: "Hoodie",
    price: 649,
    image: "/images/merch/hoodie.webp",
    alt: "Black AAYAM hoodie: small logo on the front, 'Ghost in the Machine' print on the back",
  },
  {
    name: "Oversized Tee",
    price: 549,
    image: "/images/merch/oversized-tee.webp",
    alt: "Black oversized AAYAM T-shirt: circuit print on the front, 'Hustler' collage print on the back",
  },
  {
    name: "Polo",
    price: 499,
    image: "/images/merch/polo.webp",
    alt: "Black AAYAM polo: circuit print on the front, green 'Dystopian' collage print on the back",
  },
];
