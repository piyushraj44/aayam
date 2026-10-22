import type { Metadata } from "next";
import { ChromeStage } from "@/components/stage/ChromeStage";
import { CoreSection } from "@/components/home/CoreSection";
import { ExploreSection } from "@/components/home/ExploreSection";
import { HeroSection } from "@/components/home/HeroSection";
import styles from "./page.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home — a three-screen vertical scroll: the pinned "Touch" hero (01), the core
 * grid (02) and explore (03). Server Component; only the hero progress hook,
 * countdowns, Spotlight poster, reveals and the 3D stage hydrate.
 *
 * Layering: the fixed 3D canvas (<ChromeStage />, --z-stage) is below all
 * content (--z-content); a CSS grain/vignette sits just above the stage.
 */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <HeroSection />
      <CoreSection />
      <ExploreSection />
      <ChromeStage />
      <div className={styles.grain} aria-hidden="true" />
    </div>
  );
}
