"use client";

import { useMemo } from "react";
import type { TranslationInfo } from "@/lib/types";
import { ChevronDownIcon } from "./icons";

const clip = (s: string, n = 44) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function TranslationSelect({
  value,
  translations,
  onChange,
}: {
  value: string;
  translations: TranslationInfo[];
  onChange: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TranslationInfo[]>();
    for (const t of translations) {
      const key = t.language.split(/[\s/]/)[0] || "Other";
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return [...map.entries()].sort(([a], [b]) => (a === "English" ? -1 : b === "English" ? 1 : a.localeCompare(b)));
  }, [translations]);

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Translation</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[17rem] cursor-pointer appearance-none rounded-full border border-rule bg-surface py-2 pl-4 pr-9 text-sm"
      >
        {groups.map(([language, list]) => (
          <optgroup key={language} label={language}>
            {list.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} · {clip(t.name)} ({t.provider === "bolls" ? "Bolls" : "getBible"})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 h-4 w-4 text-muted" />
    </label>
  );
}
