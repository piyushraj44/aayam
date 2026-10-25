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
} as const;

/** Accessible name of the Spotlight poster. */
export const posterLabel = `Coming soon: ${site.name} ${site.institute}. ${site.dateStatus}.`;
