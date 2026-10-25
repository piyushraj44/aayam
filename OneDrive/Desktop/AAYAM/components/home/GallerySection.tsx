import Image from "next/image";
import { gallery, site } from "@/content/site";
import { Reveal } from "./Reveal";
import styles from "./GallerySection.module.css";

/**
 * Gallery mosaic after the reference layout: two large tiles framing clusters
 * of small ones, then a band of taller tiles with two wide ones. Tiles pop in
 * one after another when the section enters view. Built for 24 photos
 * (content/site.ts → gallery); extra photos are ignored.
 */
const TILES = 24;

export function GallerySection() {
  const photos = gallery.slice(0, TILES);
  if (photos.length === 0) return null;

  return (
    <section id="gallery" className={styles.gallery} aria-labelledby="gallery-title">
      <Reveal from="left" className={styles.head}>
        <h2 id="gallery-title" className={styles.title}>
          Gallery
        </h2>
        <p className={styles.eyebrow}>Moments from {site.name}</p>
      </Reveal>

      <ul className={styles.mosaic}>
        {photos.map((photo, i) => (
          <Reveal key={photo.src} as="li" from="pop" delay={(i % 14) * 0.06} className={styles.tile}>
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 767px) 50vw, 30vw"
              className={styles.img}
            />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
