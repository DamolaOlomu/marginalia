import type { CommentaryRecord } from "../types";
import { query } from "./pg";
import { deleteObject } from "./r2";

export interface CommentaryRow {
  id: string;
  book: number;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  translation: string;
  quote: string;
  title: string;
  duration_ms: number;
  mime_type: string;
  peaks: number[];
  created_at: Date;
}

export const COLUMNS =
  "id, book, chapter, verse_start, verse_end, translation, quote, title, duration_ms, mime_type, peaks, created_at";

export function toRecord(row: CommentaryRow): CommentaryRecord {
  return {
    id: row.id,
    book: row.book,
    chapter: row.chapter,
    verseStart: row.verse_start,
    verseEnd: row.verse_end,
    translation: row.translation,
    quote: row.quote,
    title: row.title,
    createdAt: row.created_at.getTime(),
    durationMs: row.duration_ms,
    mimeType: row.mime_type,
    peaks: row.peaks,
    audioUrl: `/api/commentaries/${row.id}/audio`,
  };
}

export function extensionFor(mime: string): string {
  if (/mp4/i.test(mime)) return "m4a";
  if (/ogg/i.test(mime)) return "ogg";
  return "webm";
}

export const audioKey = (userId: string, id: string, mime: string): string => `u/${userId}/${id}.${extensionFor(mime)}`;

/** Removes uploads that were started but never finished (tab closed mid-upload), and their files. */
export async function purgeStale(userId: string): Promise<void> {
  const stale = await query<{ audio_key: string }>(
    `delete from commentaries
      where user_id = $1 and status = 'pending' and created_at < now() - interval '1 day'
      returning audio_key`,
    [userId],
  );
  await Promise.allSettled(stale.map((row) => deleteObject(row.audio_key)));
}
