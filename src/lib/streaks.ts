/**
 * Streak maths. Pure functions, no network, so it's easy to reason about and test.
 *
 * A "day" is a local calendar date string like "2026-09-21". Reading days are stored that way by
 * the server; commentary days are worked out here from timestamps, in the device's time zone.
 * Days are turned into whole numbers (days since 1970) so arithmetic isn't affected by daylight saving.
 */

const DAY_MS = 86_400_000;
const LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export const isoOfLocal = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}
const isoOfNumber = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);
/** 0 = Sunday. 1 January 1970 was a Thursday, hence the +4. */
const weekday = (n: number): number => (((n + 4) % 7) + 7) % 7;
const weekStart = (n: number): number => n - weekday(n);

export interface Run {
  current: number;
  best: number;
}

/**
 * `current` counts back from today. If today has no activity yet it counts back from yesterday,
 * so a streak stays alive until the day is over. `best` is the longest run ever.
 */
function runs(days: Set<number>, today: number): Run {
  let best = 0;
  for (const d of days) {
    if (days.has(d - 1)) continue; // not the start of a run
    let length = 1;
    while (days.has(d + length)) length++;
    if (length > best) best = length;
  }
  let cursor = days.has(today) ? today : today - 1;
  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, best };
}

/** Consecutive Sunday-to-Saturday weeks containing any activity, counting back from this week. */
function weeksInARow(days: Set<number>, today: number): number {
  const weeks = new Set<number>();
  for (const d of days) weeks.add(weekStart(d));
  let cursor = weekStart(today);
  if (!weeks.has(cursor)) cursor -= 7; // this week can still be started
  let count = 0;
  while (weeks.has(cursor)) {
    count++;
    cursor -= 7;
  }
  return count;
}

export interface DayCell {
  iso: string;
  label: (typeof LABELS)[number];
  /** Day of the month. */
  date: number;
  isToday: boolean;
  isFuture: boolean;
  read: boolean;
  commented: boolean;
}

export interface StreakStats {
  reading: Run;
  commentary: Run;
  weeksInARow: number;
  daysThisYear: number;
  readToday: boolean;
  commentedToday: boolean;
  /** This week, Sunday to Saturday. */
  week: DayCell[];
}

export function computeStats(readDays: string[], commentaryTimes: number[], now: Date = new Date()): StreakStats {
  const todayIso = isoOfLocal(now);
  const today = dayNumber(todayIso);

  const read = new Set(readDays.map(dayNumber));
  const commented = new Set(commentaryTimes.map((ms) => dayNumber(isoOfLocal(new Date(ms)))));
  const any = new Set([...read, ...commented]);

  const year = todayIso.slice(0, 4);
  let daysThisYear = 0;
  for (const d of any) if (isoOfNumber(d).startsWith(year)) daysThisYear++;

  const start = weekStart(today);
  const week: DayCell[] = LABELS.map((label, i) => {
    const n = start + i;
    const iso = isoOfNumber(n);
    return {
      iso,
      label,
      date: Number(iso.slice(8)),
      isToday: n === today,
      isFuture: n > today,
      read: read.has(n),
      commented: commented.has(n),
    };
  });

  return {
    reading: runs(read, today),
    commentary: runs(commented, today),
    weeksInARow: weeksInARow(any, today),
    daysThisYear,
    readToday: read.has(today),
    commentedToday: commented.has(today),
    week,
  };
}
