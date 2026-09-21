"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getActivity, logReadDay } from "@/lib/api";
import { CHANGE_EVENT } from "@/lib/events";
import { computeStats, isoOfLocal, type StreakStats } from "@/lib/streaks";
import { BoltIcon } from "@/components/icons";
import { useAuth } from "./useAuth";

interface ActivityValue {
  /** null until the first load finishes, or when signed out. */
  stats: StreakStats | null;
  ready: boolean;
  /** Record that a chapter was read today. Cheap to call repeatedly. */
  logRead: () => void;
}

const ActivityContext = createContext<ActivityValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [readDays, setReadDays] = useState<string[]>([]);
  const [times, setTimes] = useState<number[]>([]);
  const [ready, setReady] = useState(false);
  const [todayIso, setTodayIso] = useState(() => isoOfLocal(new Date()));
  const [toast, setToast] = useState<string | null>(null);

  const inflight = useRef(false);
  const failedDay = useRef<string | null>(null);
  const previous = useRef<{ reading: number; commentary: number } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getActivity();
      setReadDays(data.readDays);
      setTimes(data.commentaryTimes);
    } catch {
      /* streaks are a nicety; the rest of the app works without them */
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setReadDays([]);
      setTimes([]);
      setReady(false);
      return;
    }
    void load();
    const onChange = () => void load(); // a commentary was saved or deleted
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [userId, load]);

  // Roll over at midnight without a reload.
  useEffect(() => {
    const id = window.setInterval(() => setTodayIso(isoOfLocal(new Date())), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const stats = useMemo(
    () => (ready && userId ? computeStats(readDays, times, new Date()) : null),
    // todayIso is a dependency on purpose: it changes when the local date does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, userId, readDays, times, todayIso],
  );

  const logRead = useCallback(() => {
    if (!userId || !ready || inflight.current) return;
    const today = isoOfLocal(new Date());
    if (failedDay.current === today || readDays.includes(today)) return;

    inflight.current = true;
    setReadDays((d) => (d.includes(today) ? d : [...d, today])); // show it immediately
    logReadDay(today)
      .catch(() => {
        failedDay.current = today; // don't retry in a loop if the server is down
        setReadDays((d) => d.filter((x) => x !== today));
      })
      .finally(() => {
        inflight.current = false;
      });
  }, [userId, ready, readDays]);

  // A small celebration when a streak grows.
  useEffect(() => {
    if (!stats) {
      previous.current = null;
      return;
    }
    const before = previous.current;
    const now = { reading: stats.reading.current, commentary: stats.commentary.current };
    previous.current = now;
    if (!before) return;

    if (now.commentary > before.commentary) {
      setToast(now.commentary === 1 ? "Commentary streak started" : `${now.commentary}-day commentary streak`);
    } else if (now.reading > before.reading) {
      setToast(now.reading === 1 ? "Reading streak started" : `${now.reading}-day reading streak`);
    }
  }, [stats]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => ({ stats, ready, logRead }), [stats, ready, logRead]);

  return (
    <ActivityContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-[4.25rem] z-[55] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              role="status"
              className="flex items-center gap-2 rounded-full border border-gilt bg-raised px-4 py-2 text-sm shadow-xl"
              initial={{ opacity: 0, y: -14, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
            >
              <BoltIcon className="h-4 w-4 text-gilt" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityValue {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used inside <ActivityProvider>");
  return ctx;
}
