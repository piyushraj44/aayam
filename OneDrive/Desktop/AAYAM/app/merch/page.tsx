import Image from "next/image";
import { sectionMetadata } from "@/app/_lib/sectionMetadata";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { merch, site } from "@/content/site";
import styles from "./page.module.css";

export const metadata = sectionMetadata({
  title: "Merch",
  description: `Official ${site.name} ${site.year} merchandise: hoodie, oversized tee and polo.`,
  path: "/merch",
});

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function MerchPage() {
  return (
    <>
      <section className={styles.page} aria-labelledby="merch-title">
        <header className={styles.head}>
          <p className={styles.eyebrow}>Official merchandise</p>
          <h1 id="merch-title" className={styles.title}>
            Merch
          </h1>
        </header>

        <ul className={styles.grid}>
          {merch.map((item, i) => (
            <li key={item.name} className={styles.card}>
              <div className={styles.media}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 767px) 92vw, 33vw"
                  className={styles.img}
                />
              </div>
              <div className={styles.info}>
                <h2 className={styles.name}>{item.name}</h2>
                <p className={styles.price}>{inr.format(item.price)}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className={styles.note}>Orders opening soon.</p>
      </section>
      <SiteFooter />
    </>
  );
}
