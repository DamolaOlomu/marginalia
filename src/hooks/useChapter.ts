"use client";

import { useCallback, useEffect, useState } from "react";
import { splitTranslationId } from "@/lib/translations";
import type { ChapterPayload } from "@/lib/types";

export type ChapterState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ChapterPayload };

export function useChapter(translationId: string, book: number, chapter: number) {
  const [state, setState] = useState<ChapterState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    const { provider, code } = splitTranslationId(translationId);
    setState({ status: "loading" });

    fetch(`/api/scripture/${provider}/${encodeURIComponent(code)}/${book}/${chapter}`, { signal: ac.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
        return json as ChapterPayload;
      })
      .then((data) => setState({ status: "ready", data }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", message: error instanceof Error ? error.message : "Couldn't load this chapter." });
      });

    return () => ac.abort();
  }, [translationId, book, chapter, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { state, retry };
}
