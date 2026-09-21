"use client";

import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { BoltIcon, ChevronDownIcon, MicIcon } from "./icons";
import { WeekStrip } from "./WeekStrip";

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const controls = animate(0, value, {
      duration: Math.min(1.1, 0.35 + value * 0.04),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return <span className="tabular-nums">{shown}</span>;
}

function StreakCard({
  label,
  value,
  best,
  icon,
  doneToday,
  delay,
}: {
  label: string;
  value: number;
  best: number;
  icon: ReactNode;
  doneToday: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className="rounded-3xl border border-rule bg-surface/60 p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="text-[0.95rem] font-medium leading-snug">{label}</p>
      <p className="mt-5 flex items-center gap-2.5 font-serif text-6xl font-semibold leading-none">
        <CountUp value={value} />
        <motion.span
          className={doneToday ? "text-gilt" : "text-muted"}
          initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14, delay: delay + 0.25 }}
        >
          {icon}
        </motion.span>
      </p>
      <p className="mt-5 text-sm font-medium">Best: {best}</p>
      <p className="mt-1 text-xs text-muted">{doneToday ? "Done today" : "Not yet today"}</p>
    </motion.div>
  );
}

export function Streaks() {
  const { user, loading: authLoading, openAuth } = useAuth();
  const { stats } = useActivity();
  const [open, setOpen] = useState(false);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="font-serif text-4xl">Streaks</h1>
        <div className="mt-8 rounded-2xl border border-dashed border-rule p-8">
          <p className="font-serif text-2xl">Sign in to track your streaks</p>
          <p className="mt-2 text-muted">Your reading days and recordings are saved to your account.</p>
          <button type="button" onClick={() => openAuth()} className="btn btn-gilt mt-6">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16" role="status" aria-label="Loading your streaks">
        <div className="mx-auto h-24 max-w-md animate-pulse rounded-xl bg-wash" />
        <div className="mt-10 grid grid-cols-2 gap-4">
          <div className="h-44 animate-pulse rounded-3xl bg-wash" />
          <div className="h-44 animate-pulse rounded-3xl bg-wash" />
        </div>
      </div>
    );
  }

  const weeks = stats.weeksInARow;
  const headline =
    stats.reading.current === 0 && stats.commentary.current === 0
      ? "Read a chapter today to start a streak."
      : weeks > 0
        ? `${weeks} ${weeks === 1 ? "week" : "weeks"} in a row`
        : "Keep going, you're building a habit.";

  return (
    <div className="mx-auto max-w-xl px-6 pb-32 pt-12 md:pt-16">
      <h1 className="text-balance text-center font-serif text-4xl font-semibold leading-[1.1] md:text-5xl">
        Build a daily habit of reading and responding.
      </h1>

      <div className="mt-10 grid grid-cols-2 gap-4">
        <StreakCard
          label="Reading streak"
          value={stats.reading.current}
          best={stats.reading.best}
          icon={<BoltIcon className="h-8 w-8" />}
          doneToday={stats.readToday}
          delay={0.05}
        />
        <StreakCard
          label="Commentary streak"
          value={stats.commentary.current}
          best={stats.commentary.best}
          icon={<MicIcon className="h-8 w-8" />}
          doneToday={stats.commentedToday}
          delay={0.15}
        />
      </div>

      <p className="mt-9 text-center font-medium">{headline}</p>
      <p className="mt-3 text-center text-[0.95rem]">
        {stats.daysThisYear} {stats.daysThisYear === 1 ? "day" : "days"} in Marginalia this year
      </p>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="how-streaks-work"
          className="btn btn-line gap-2 px-6 py-3 text-base font-semibold"
        >
          How streaks work
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDownIcon className="h-4 w-4" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="how-streaks-work"
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="mt-5 space-y-3 rounded-2xl border border-rule bg-surface/60 p-5 text-[0.95rem] leading-relaxed">
              <li>
                <strong className="font-semibold">Reading:</strong> a day counts when you open a chapter while signed in.
              </li>
              <li>
                <strong className="font-semibold">Commentary:</strong> a day counts when you save a recording.
              </li>
              <li>You have until the end of today to keep a streak going. Miss a whole day and it starts again, but your best is kept.</li>
              <li>Days follow the time zone of the device you're using. A week runs Sunday to Saturday.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12">
        <WeekStrip week={stats.week} />
      </div>
    </div>
  );
}
