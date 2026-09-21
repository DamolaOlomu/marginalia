"use client";

import { useCallback, useEffect, useState } from "react";
import { listCommentaries } from "@/lib/api";
import { CHANGE_EVENT } from "@/lib/events";
import type { CommentaryRecord } from "@/lib/types";
import { useAuth } from "./useAuth";

/**
 * The signed-in user's commentaries for one chapter, or all of them when called without arguments.
 * Reloads whenever anything is saved, renamed or deleted, and when the user signs in or out.
 */
export function useCommentaries(book?: number, chapter?: number) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [records, setRecords] = useState<CommentaryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    try {
      setRecords(await listCommentaries(book, chapter));
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [userId, book, chapter]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [refresh]);

  return { records, loading: loading || authLoading };
}
