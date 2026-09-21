"use client";

import Link from "next/link";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { WeekStrip } from "./WeekStrip";

/** The week strip on the home page. Only shown once you're signed in and your activity has loaded. */
export function ThisWeek() {
  const { user } = useAuth();
  const { stats } = useActivity();
  if (!user || !stats) return null;

  return (
    <section aria-labelledby="this-week" className="mb-14 rounded-3xl border border-rule bg-surface/50 p-5 md:p-6">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id="this-week" className="font-serif text-2xl">
          This week
        </h2>
        <Link href="/streaks" className="text-sm text-gilt underline-offset-2 hover:underline">
          Your streaks
        </Link>
      </div>
      <WeekStrip week={stats.week} />
    </section>
  );
}
