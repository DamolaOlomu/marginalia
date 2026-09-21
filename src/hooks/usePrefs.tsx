"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface Prefs {
  translation: string;
  theme: "dark" | "light";
  fontScale: number;
  studyMode: boolean;
  last: { book: number; chapter: number } | null;
  /** Read-aloud speed (1 = normal). */
  listenRate: number;
  /** The chosen device voice, or null to use the best match for the translation's language. */
  voiceURI: string | null;
  /** Keep reading into the next chapter when one finishes. */
  autoAdvance: boolean;
}

const DEFAULTS: Prefs = { translation: "bolls:KJV", theme: "dark", fontScale: 1, studyMode: false, last: null, listenRate: 1, voiceURI: null, autoAdvance: true };
const KEY = "marginalia:prefs";

interface PrefsContextValue {
  prefs: Prefs;
  /** False until saved preferences have been read from localStorage. */
  ready: boolean;
  update: (patch: Partial<Prefs>) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage may be unavailable */
    }
    document.documentElement.dataset.theme = prefs.theme;
  }, [prefs, ready]);

  const update = useCallback((patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch })), []);
  const value = useMemo(() => ({ prefs, ready, update }), [prefs, ready, update]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsContextValue {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return ctx;
}
