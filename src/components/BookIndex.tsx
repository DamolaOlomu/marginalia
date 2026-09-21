"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useCommentaries } from "@/hooks/useCommentaries";
import { BOOKS, type Book } from "@/lib/books";

function ChapterPanel({ book, marked }: { book: Book; marked: Set<string> }) {
  return (
    <motion.div
      className="overflow-hidden"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mt-4 rounded-2xl border border-rule bg-surface p-5">
        <p className="font-serif text-xl">
          {book.name} <span className="text-base text-muted">{book.chapters} {book.chapters === 1 ? "chapter" : "chapters"}</span>
        </p>
        <ul className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-9 md:grid-cols-12">
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((n) => (
            <li key={n}>
              <Link
                href={`/read/${book.slug}/${n}`}
                aria-label={`${book.name} ${n}${marked.has(`${book.id}:${n}`) ? ", has commentary" : ""}`}
                className="relative flex h-10 items-center justify-center rounded-lg border border-rule text-sm tabular-nums transition-colors hover:border-gilt hover:bg-wash"
              >
                {n}
                {marked.has(`${book.id}:${n}`) && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-gilt" aria-hidden="true" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function BookIndex() {
  const { records } = useCommentaries();
  const marked = useMemo(() => new Set(records.map((r) => `${r.book}:${r.chapter}`)), [records]);
  const [selected, setSelected] = useState<Book | null>(null);

  return (
    <div className="space-y-14 pb-10">
      {(["OT", "NT"] as const).map((testament) => {
        const books = BOOKS.filter((b) => b.testament === testament);
        return (
          <section key={testament} aria-labelledby={`h-${testament}`}>
            <h2 id={`h-${testament}`} className="font-serif text-3xl">
              {testament === "OT" ? "Old Testament" : "New Testament"}
            </h2>
            <ul className="mt-5 grid grid-cols-2 gap-x-6 sm:grid-cols-3 md:grid-cols-4">
              {books.map((b) => {
                const active = selected?.id === b.id;
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(active ? null : b)}
                      aria-expanded={active}
                      className={`flex w-full items-baseline justify-between gap-2 border-b border-rule py-2.5 text-left font-serif text-lg transition-colors ${
                        active ? "text-gilt" : "hover:text-gilt"
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      <span className="font-sans text-sm tabular-nums text-muted">{b.chapters}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <AnimatePresence initial={false}>
              {selected?.testament === testament && <ChapterPanel key="panel" book={selected} marked={marked} />}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
