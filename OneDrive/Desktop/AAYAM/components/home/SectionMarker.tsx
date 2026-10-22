import styles from "./SectionMarker.module.css";
import { pad2 } from "./copy";

type SectionMarkerProps = {
  index: number;
  total: number;
  className?: string;
};

/** Mono "01/03" index marker, like the reference video's "01/04". Decorative. */
export function SectionMarker({ index, total, className }: SectionMarkerProps) {
  return (
    <p className={[styles.marker, className].filter(Boolean).join(" ")} aria-hidden="true">
      <span className={styles.current}>{pad2(index)}</span>
      <span className={styles.total}>/{pad2(total)}</span>
    </p>
  );
}
