"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createCommentary } from "@/lib/api";
import { deleteLocalCommentary, getAllLocalCommentaries } from "@/lib/db";
import type { LocalCommentary } from "@/lib/types";

/**
 * One-time helper for recordings made with the first, browser-only version of the app.
 * Shows only when such recordings exist and you're signed in; uploads them, then removes the local copy.
 */
export function LocalImport() {
  const { user } = useAuth();
  const [items, setItems] = useState<LocalCommentary[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (typeof indexedDB === "undefined") return;
    getAllLocalCommentaries()
      .then((rows) => alive && setItems(rows))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (!user || items.length === 0) return null;

  async function run() {
    setBusy(true);
    setError(null);
    setDone(0);
    let uploaded = 0;
    for (const item of items) {
      try {
        await createCommentary(
          {
            book: item.book,
            chapter: item.chapter,
            verseStart: item.verseStart,
            verseEnd: item.verseEnd,
            translation: item.translation,
            quote: item.quote,
            title: item.title,
            durationMs: item.durationMs,
            peaks: item.peaks,
            createdAt: item.createdAt,
          },
          item.audio,
        );
        await deleteLocalCommentary(item.id);
        uploaded += 1;
        setDone(uploaded);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An upload failed.");
        break;
      }
    }
    setItems(await getAllLocalCommentaries().catch(() => []));
    setBusy(false);
  }

  return (
    <div className="mt-8 rounded-2xl border border-gilt/60 bg-wash p-5">
      <p className="font-serif text-lg">
        {items.length} {items.length === 1 ? "recording is" : "recordings are"} only saved in this browser
      </p>
      <p className="mt-1 text-[0.95rem] text-muted">
        They were made before accounts existed. Upload them to keep them safe and reach them from any device.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rubric">
          {error}
        </p>
      )}
      <button type="button" onClick={run} disabled={busy} className="btn btn-gilt mt-4">
        {busy ? `Uploading ${done + 1} of ${items.length}…` : `Upload ${items.length === 1 ? "it" : "them"} to my account`}
      </button>
    </div>
  );
}
