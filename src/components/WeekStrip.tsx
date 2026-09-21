"use client";

import { motion } from "motion/react";
import type { DayCell } from "@/lib/streaks";

const Dot = () => <span className="block h-1.5 w-1.5 rounded-full bg-body" aria-hidden="true" />;

const Wave = () => (
  <svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true">
    <rect x="0.5" y="3" width="2" height="3" rx="1" fill="var(--gilt)" />
    <rect x="4.5" y="0" width="2" height="9" rx="1" fill="var(--gilt)" />
    <rect x="8.5" y="2" width="2" height="5" rx="1" fill="var(--gilt)" />
  </svg>
);

function describe(d: DayCell): string {
  return [
    `${d.label} ${d.date}`,
    d.isToday ? "today" : null,
    d.read ? "read a chapter" : null,
    d.commented ? "recorded a commentary" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Sunday to Saturday, with today filled in and a mark under each day you read or recorded. */
export function WeekStrip({ week }: { week: DayCell[] }) {
  return (
    <div>
      <ol className="grid grid-cols-7 text-center" aria-label="This week">
        {week.map((d, i) => (
          <li key={d.iso} className="flex flex-col items-center gap-2" aria-label={describe(d)}>
            <span className="text-sm text-muted" aria-hidden="true">
              {d.label}
            </span>
            <motion.span
              aria-hidden="true"
              className={`flex h-10 w-10 items-center justify-center rounded-full text-[0.95rem] tabular-nums ${
                d.isToday ? "bg-gilt font-semibold text-gilt-ink" : d.isFuture ? "text-muted/60" : "text-body"
              }`}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.1 + i * 0.05 }}
            >
              {d.date}
            </motion.span>
            <span className="flex h-3 items-center gap-1.5" aria-hidden="true">
              {d.read && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.35 + i * 0.05 }}>
                  <Dot />
                </motion.span>
              )}
              {d.commented && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 16, delay: 0.4 + i * 0.05 }}>
                  <Wave />
                </motion.span>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-2">
          <Dot /> Read a chapter
        </span>
        <span className="flex items-center gap-2">
          <Wave /> Recorded a commentary
        </span>
      </p>
    </div>
  );
}
