"use client";

import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { pad2, startLong } from "./copy";
import styles from "./Countdown.module.css";

type Phase =
  | { kind: "before"; days: number; hours: number; minutes: number }
  | { kind: "live"; day: number }
  | { kind: "after" };

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const START_MS = Date.parse(site.dates.start);
const END_MS = Date.parse(site.dates.end);
const TOTAL_DAYS = Math.max(1, Math.round((END_MS - START_MS) / DAY_MS));

function computePhase(now: number): Phase {
  if (now < START_MS) {
    const totalMinutes = Math.floor((START_MS - now) / MINUTE_MS);
    return {
      kind: "before",
      days: Math.floor(totalMinutes / 1440),
      hours: Math.floor((totalMinutes % 1440) / 60),
      minutes: totalMinutes % 60,
    };
  }
  if (now <= END_MS) {
    return { kind: "live", day: Math.min(TOTAL_DAYS, Math.floor((now - START_MS) / DAY_MS) + 1) };
  }
  return { kind: "after" };
}

const UNITS = [
  { key: "days", one: "Day", many: "Days" },
  { key: "hours", one: "Hour", many: "Hours" },
  { key: "minutes", one: "Minute", many: "Minutes" },
] as const;

type CountdownProps = {
  className?: string;
  /** "inline" keeps one line when there is room; "stacked" always uses the 3-column grid. */
  layout?: "inline" | "stacked";
};

/**
 * `NN DAYS · NN HOURS · NN MINUTES LEFT` to `site.dates.start` (no seconds).
 * Server and first client render show same-width `--` placeholders, then it
 * ticks on each minute boundary and re-syncs when the tab becomes visible.
 * Screen readers get one static label — never a per-tick announcement.
 */
export function Countdown({ className, layout = "inline" }: CountdownProps) {
  const [phase, setPhase] = useState<Phase | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      window.clearTimeout(timer);
      const now = Date.now();
      const next = computePhase(now);
      setPhase(next);
      if (next.kind !== "after") {
        timer = window.setTimeout(tick, MINUTE_MS - (now % MINUTE_MS) + 25);
      }
    };
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const rootClass = [styles.root, styles[layout], className].filter(Boolean).join(" ");

  if (phase?.kind === "live") {
    return (
      <p className={[rootClass, styles.status].join(" ")}>
        <span className={styles.liveDot} aria-hidden="true" />
        Live now · Day {phase.day} of {TOTAL_DAYS}
      </p>
    );
  }

  if (phase?.kind === "after") {
    return (
      <p className={[rootClass, styles.status].join(" ")}>
        {site.name} {site.dates.year} has concluded
      </p>
    );
  }

  return (
    <div className={rootClass}>
      <span className="visually-hidden">Starts {startLong}</span>
      <p className={styles.units} aria-hidden="true">
        {UNITS.map(({ key, one, many }, i) => {
          const value = phase ? phase[key] : null;
          return (
            <span key={key} className={styles.unit}>
              {i > 0 && <span className={styles.sep}>·</span>}
              <span className={styles.value}>{value === null ? "--" : pad2(value)}</span>
              <span className={styles.label}>{value === 1 ? one : many}</span>
            </span>
          );
        })}
        <span className={styles.tail}>left</span>
      </p>
    </div>
  );
}
