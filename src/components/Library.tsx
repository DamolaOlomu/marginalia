"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCommentaries } from "@/hooks/useCommentaries";
import { BOOKS } from "@/lib/books";
import { formatDuration, referenceLabel } from "@/lib/format";
import type { CommentaryRecord } from "@/lib/types";
import { CommentaryCard } from "./CommentaryCard";
import { SearchIcon } from "./icons";
import { LocalImport } from "./LocalImport";

export function Library() {
  const { user, loading: authLoading, openAuth } = useAuth();
  const { records, loading } = useCommentaries();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const label = referenceLabel(BOOKS[r.book - 1].name, r.chapter, r.verseStart, r.verseEnd);
      return `${r.title} ${r.quote} ${label}`.toLowerCase().includes(q);
    });
  }, [records, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommentaryRecord[]>();
    const sorted = [...filtered].sort(
      (a, b) =>
        a.book - b.book ||
        a.chapter - b.chapter ||
        (a.verseStart ?? 0) - (b.verseStart ?? 0) ||
        a.createdAt - b.createdAt,
    );
    for (const r of sorted) {
      const key = `${r.book}:${r.chapter}`;
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()];
  }, [filtered]);

  const totalMs = records.reduce((sum, r) => sum + r.durationMs, 0);

  return (
    <div className="mx-auto max-w-3xl px-6 pb-32 pt-12">
      <h1 className="font-serif text-4xl md:text-5xl">Your commentaries</h1>

      {!authLoading && !user && (
        <div className="mt-10 rounded-2xl border border-dashed border-rule p-8">
          <p className="font-serif text-2xl">Sign in to see your commentaries</p>
          <p className="mt-2 max-w-md text-muted">Recordings are saved to your account, so they're here on every device you use.</p>
          <button type="button" onClick={() => openAuth()} className="btn btn-gilt mt-6">
            Sign in
          </button>
        </div>
      )}

      {user && <LocalImport />}

      {user && records.length > 0 && (
        <p className="mt-3 text-muted">
          {records.length} {records.length === 1 ? "recording" : "recordings"}, {formatDuration(totalMs)} of your voice in total.
        </p>
      )}

      {records.length > 0 && (
        <div className="relative mt-8">
          <label className="sr-only" htmlFor="lib-search">
            Search your commentaries
          </label>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="lib-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, passage or verse text"
            className="w-full rounded-full border border-rule bg-surface py-2.5 pl-10 pr-4"
          />
        </div>
      )}

      {user && !loading && records.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-rule p-8">
          <p className="font-serif text-2xl">No commentaries yet</p>
          <p className="mt-2 max-w-md text-muted">
            Open a chapter, tap a verse number, and press Record. Your recording will appear here and beside the verse.
          </p>
          <Link href="/" className="btn btn-gilt mt-6">
            Choose a book
          </Link>
        </div>
      )}

      {records.length > 0 && filtered.length === 0 && <p className="mt-10 text-muted">Nothing matches "{query}".</p>}

      <div className="mt-10 space-y-12">
        <AnimatePresence initial={false}>
          {groups.map(([key, list]) => {
            const book = BOOKS[list[0].book - 1];
            return (
              <motion.section
                key={key}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className="mb-4 font-serif text-2xl">
                  <Link href={`/read/${book.slug}/${list[0].chapter}`} className="hover:text-gilt">
                    {book.name} {list[0].chapter}
                  </Link>
                </h2>
                <div className="space-y-4">
                  {list.map((r) => (
                    <CommentaryCard key={r.id} record={r} showPassage />
                  ))}
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
