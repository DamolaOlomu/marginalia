"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { usePrefs } from "@/hooks/usePrefs";
import { parseReference } from "@/lib/reference";
import { BoltIcon, MoonIcon, SunIcon } from "./icons";

function Mark() {
  const heights = [6, 15, 9, 19, 7];
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      {heights.map((h, i) => (
        <rect key={i} x={2 + i * 4} y={11 - h / 2} width="2" height={h} rx="1" fill="var(--gilt)" />
      ))}
    </svg>
  );
}

function StreakChip() {
  const { user } = useAuth();
  const { stats } = useActivity();
  if (!user || !stats) return null;
  const n = stats.reading.current;
  return (
    <Link
      href="/streaks"
      aria-label={`Reading streak: ${n} ${n === 1 ? "day" : "days"}. Open streaks`}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-sm tabular-nums transition-colors hover:bg-wash ${
        stats.readToday ? "border-gilt text-gilt" : "border-rule text-muted"
      }`}
    >
      <BoltIcon className="h-4 w-4" />
      {n}
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { prefs, update } = usePrefs();
  const { user, loading, signOut, openAuth } = useAuth();
  const [value, setValue] = useState("");
  const [invalid, setInvalid] = useState(false);

  function go(e: FormEvent) {
    e.preventDefault();
    const ref = parseReference(value);
    if (!ref) return setInvalid(true);
    setInvalid(false);
    setValue("");
    router.push(`/read/${ref.book.slug}/${ref.chapter}${ref.verse ? `#v${ref.verse}` : ""}`);
  }

  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${active ? "bg-wash text-body" : "text-muted hover:text-body"}`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-page/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Mark />
          <span className="hidden sm:inline">Marginalia</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Main">
          {link("/", "Books", pathname === "/" || pathname.startsWith("/read"))}
          {link("/library", "Library", pathname.startsWith("/library"))}
        </nav>

        <form onSubmit={go} className="ml-auto min-w-0 flex-1 sm:max-w-[15rem]">
          <label className="sr-only" htmlFor="goto">
            Go to a passage
          </label>
          <input
            id="goto"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setInvalid(false);
            }}
            placeholder="Go to John 3:16"
            aria-invalid={invalid}
            aria-describedby={invalid ? "goto-error" : undefined}
            className={`w-full rounded-full border bg-surface px-4 py-1.5 text-sm ${invalid ? "border-rubric" : "border-rule"}`}
          />
          {invalid && (
            <span id="goto-error" role="alert" className="sr-only">
              No matching book. Try John 3:16.
            </span>
          )}
        </form>

        <StreakChip />

        {!loading &&
          (user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              title={`Signed in as ${user.email}`}
              className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-body"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => openAuth()}
              className="shrink-0 whitespace-nowrap rounded-full border border-rule px-3.5 py-1.5 text-sm transition-colors hover:bg-wash"
            >
              Sign in
            </button>
          ))}

        <button
          type="button"
          className="icon-btn shrink-0"
          onClick={() => update({ theme: prefs.theme === "dark" ? "light" : "dark" })}
          aria-label={prefs.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {prefs.theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}
