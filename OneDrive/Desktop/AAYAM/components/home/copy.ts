import { site } from "@/content/site";

/**
 * Home-page phrases. Every word here is lifted from the approved
 * `site.description` — nothing is invented. (Candidate to move into
 * content/site.ts by the content owner.)
 */
export const homeCopy = {
  /** "Over three vibrant days, …" */
  eyebrow: "Three vibrant days",
  /** "… celebrates the stories, memories, and innovation that bring us together." */
  statement: "Stories, memories, and innovation that bring us together.",
  /** "… thrilling competitions, dynamic performances, and high-energy workshops." */
  pillars: [
    { label: "Competitions", qualifier: "Thrilling" },
    { label: "Performances", qualifier: "Dynamic" },
    { label: "Workshops", qualifier: "High-energy" },
  ],
} as const;

const { dates } = site;

/** "13 November 2026" */
export const startLong = `${dates.dayStart} ${dates.monthLong} ${dates.year}`;
/** "13–15 NOVEMBER 2026 · NIT AGARTALA" */
export const rangeLine = `${dates.dayStart}–${dates.dayEnd} ${dates.monthLong} ${dates.year} · ${site.institute}`.toUpperCase();
/** "13 to 15 November 2026, NIT Agartala" */
export const rangeSpoken = `${dates.dayStart} to ${dates.dayEnd} ${dates.monthLong} ${dates.year}, ${site.institute}`;
/** Accessible name of the Spotlight poster. */
export const posterLabel = `Coming soon: ${rangeSpoken}`;

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
