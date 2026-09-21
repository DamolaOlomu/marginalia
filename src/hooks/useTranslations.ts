"use client";

import { useEffect, useState } from "react";
import { FALLBACK_TRANSLATIONS } from "@/lib/translations";
import type { TranslationInfo } from "@/lib/types";

let cached: Promise<TranslationInfo[]> | null = null;

function load(): Promise<TranslationInfo[]> {
  if (!cached) {
    cached = fetch("/api/translations")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("translations unavailable"))))
      .then((j: { translations: TranslationInfo[] }) => j.translations)
      .catch(() => {
        cached = null;
        return FALLBACK_TRANSLATIONS;
      });
  }
  return cached;
}

export function useTranslations(): TranslationInfo[] {
  const [list, setList] = useState<TranslationInfo[]>(FALLBACK_TRANSLATIONS);
  useEffect(() => {
    let alive = true;
    void load().then((l) => {
      if (alive) setList(l);
    });
    return () => {
      alive = false;
    };
  }, []);
  return list;
}
