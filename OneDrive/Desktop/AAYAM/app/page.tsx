import type { Metadata } from "next";
import { ChromeStage } from "@/components/stage/ChromeStage";
import { CoreSection } from "@/components/home/CoreSection";
import { GallerySection } from "@/components/home/GallerySection";
import { HeroSection } from "@/components/home/HeroSection";
import { SiteFooter } from "@/components/shell/SiteFooter";
import styles from "./page.module.css";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home — the pinned "Touch" hero, the static core section with the Spotlight
 * poster, the gallery mosaic, then the site footer (quick links + socials).
 * Server Component; only the hero progress hook, Spotlight poster, reveals and
 * the 3D stage hydrate.
 *
 * Layering: the fixed 3D canvas (<ChromeStage />, --z-stage) is below all
 * content (--z-content); a CSS grain/vignette sits just above the stage. The 3D
 * actors live only in the hero and scroll away with it.
 */
export default function HomePage() {
  return (
    <div className={styles.page}>
      <HeroSection />
      <CoreSection />
      <GallerySection />
      <SiteFooter />
      <ChromeStage />
      <div className={styles.grain} aria-hidden="true" />
    </div>
  );
}
