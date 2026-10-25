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
  /** Optional highlighted badge, e.g. "Early bird" */
  badge?: string;
};

/** Exactly the seven approved top-level destinations, in order. */
export const navItems: readonly NavItem[] = [
  { label: "Home", href: "/", ready: true },
  { label: "Events", href: "/events", ready: false },
  { label: "Guests", href: "/guests", ready: false },
  { label: "Timeline", href: "/timeline", ready: false },
  { label: "Sponsors", href: "/sponsors", ready: false },
  { label: "Merch", href: "/merch", ready: true, badge: "Early bird" },
  { label: "Our Team", href: "/team", ready: false },
] as const;

/** Destinations shown directly in the top bar on desktop (Merch also on phones). */
export const headerLinks: readonly string[] = ["/events", "/timeline", "/guests", "/merch"];

export type Contact = {
  name: string;
  role: string;
  phone?: string;
  email?: string;
};

/**
 * "For general queries" contacts in the footer.
 */
export const contacts: readonly Contact[] = [
  {
    name: "Shanit Tiwari",
    role: "GS Technical",
    phone: "+91 76300 12283",
    email: "shanittiwari11@gmail.com",
  },
  {
    name: "Om Mishra",
    role: "AGS Technical",
    phone: "+91 88404 07983",
    email: "mishranit76@gmail.com",
  },
  {
    name: "Satakshi Gupta",
    role: "AGS Technical",
    phone: "+91 63938 67824",
    email: "satakshig04@gmail.com",
  },
];

/** Footer: email for business and sponsorship queries. */
export const businessEmail = "btc2024.official@gmail.com";

/** Footer credit line. */
export const credit = "Designed by Team Web Operations";

export type GalleryPhoto = {
  /** Path under public/, e.g. "/images/gallery/01.webp" */
  src: string;
  alt: string;
};

/**
 * Home-page gallery mosaic — photos from past editions of AAYAM (files in
 * public/images/gallery/). The mosaic is designed for exactly 24 photos; the
 * order matters: 1, 6, 9, 10, 13, 14, 21 and 24 are the large tiles.
 */
export const gallery: readonly GalleryPhoto[] = [
  { src: "/images/gallery/01.webp", alt: "Performers on the main AAYAM stage in front of a glittering LED screen" },
  { src: "/images/gallery/02.webp", alt: "A packed night crowd holding up phone lights at the AAYAM grounds" },
  { src: "/images/gallery/03.webp", alt: "Drones and model aircraft displayed at a technical exhibition" },
  { src: "/images/gallery/04.webp", alt: "A speaker addressing the audience in front of sports-team banners" },
  { src: "/images/gallery/05.webp", alt: "A tabla player performing on stage under blue lights" },
  { src: "/images/gallery/06.webp", alt: "The AAYAM main stage lit by beams of stage lights above a large LED screen" },
  { src: "/images/gallery/07.webp", alt: "A singer performing under purple stage lights at night" },
  { src: "/images/gallery/08.webp", alt: "Dancers performing on the main stage in front of a starry backdrop" },
  { src: "/images/gallery/10.webp", alt: "Army officers explaining equipment at a defence display" },
  { src: "/images/gallery/11.webp", alt: "The crowd cheering with raised hands during a night concert" },
  { src: "/images/gallery/12.webp", alt: "A singer performing under purple light beside the stage truss" },
  { src: "/images/gallery/13.webp", alt: "A guest speaker addressing the crowd from the main stage at night" },
  { src: "/images/gallery/14.webp", alt: "A wide view of students cheering in the crowd" },
  { src: "/images/gallery/15.webp", alt: "The AAYAM team gathered on stage for a group photo" },
  { src: "/images/gallery/16.webp", alt: "Student-built drones laid out at the project exhibition" },
  { src: "/images/gallery/17.webp", alt: "Participants working on laptops during a workshop" },
  { src: "/images/gallery/18.webp", alt: "A speaker on stage beside a costumed mascot" },
  { src: "/images/gallery/19.webp", alt: "Students seated in a classroom during a competition round" },
  { src: "/images/gallery/20.webp", alt: "A soldier presenting equipment at the defence display" },
  { src: "/images/gallery/21.webp", alt: "Speakers taking a selfie with the packed auditorium" },
  { src: "/images/gallery/22.webp", alt: "A panel discussion with guests seated on stage" },
  { src: "/images/gallery/23.webp", alt: "Students discussing their work at a project table" },
  { src: "/images/gallery/24.webp", alt: "Rows of participants at computers in a lab" },
  { src: "/images/gallery/25.webp", alt: "Guests at the inaugural ceremony on stage" },
];

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
