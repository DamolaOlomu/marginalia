"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { removeCommentary, renameCommentary } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { formatDate, referenceLabel } from "@/lib/format";
import type { CommentaryRecord } from "@/lib/types";
import { Player } from "./Player";

interface Props {
  record: CommentaryRecord;
  /** Show the passage reference and quoted text (used in the library). */
  showPassage?: boolean;
  onDeleted?: () => void;
}

export function CommentaryCard({ record, showPassage = false, onDeleted }: Props) {
  const book = BOOKS[record.book - 1];
  const label = referenceLabel(book.name, record.chapter, record.verseStart, record.verseEnd);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(record.title);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTitle(record.title), [record.title]);
  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirming]);

  async function commitTitle() {
    setEditing(false);
    const next = title.trim();
    if (!next) return setTitle(record.title);
    if (next === record.title) return;
    try {
      setError(null);
      await renameCommentary(record.id, next);
    } catch (e) {
      setTitle(record.title);
      setError(e instanceof Error ? e.message : "Couldn't rename this commentary.");
    }
  }

  async function remove() {
    if (!confirming) return setConfirming(true);
    try {
      setError(null);
      await removeCommentary(record.id);
      onDeleted?.();
    } catch (e) {
      setConfirming(false);
      setError(e instanceof Error ? e.message : "Couldn't delete this commentary.");
    }
  }

  const hash = record.verseStart != null ? `#v${record.verseStart}` : "";

  return (
    <article className="rounded-2xl border border-rule bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitle(record.title);
                  setEditing(false);
                }
              }}
              aria-label="Commentary title"
              className="w-full rounded-md border border-rule bg-page px-2 py-1 font-serif text-lg"
            />
          ) : (
            <h3 className="font-serif text-lg leading-snug">{record.title}</h3>
          )}
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted">
            {showPassage && (
              <Link href={`/read/${book.slug}/${record.chapter}${hash}`} className="text-gilt underline-offset-2 hover:underline">
                {label}
              </Link>
            )}
            <span>{formatDate(record.createdAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-muted hover:text-body">
            Rename
          </button>
          <a href={`${record.audioUrl}?download=1`} className="rounded-md px-2 py-1 text-muted hover:text-body">
            Download
          </a>
          <button
            type="button"
            onClick={remove}
            className={`rounded-md px-2 py-1 ${confirming ? "bg-rubric text-white" : "text-muted hover:text-body"}`}
          >
            {confirming ? "Delete for good?" : "Delete"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-rubric">
          {error}
        </p>
      )}

      {showPassage && record.quote && (
        <blockquote className="mt-3 line-clamp-2 border-l-2 border-rule pl-3 font-serif text-[0.95rem] italic text-muted">
          {record.quote}
        </blockquote>
      )}

      <div className="mt-4">
        <Player source={record.audioUrl} durationMs={record.durationMs} peaks={record.peaks} deferLoad={showPassage} />
      </div>
    </article>
  );
}
