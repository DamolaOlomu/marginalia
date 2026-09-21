import { BOOKS } from "../books";
import { HttpError } from "./errors";

export const MAX_AUDIO_BYTES = 60 * 1024 * 1024;
export const MAX_DURATION_MS = 4 * 60 * 60 * 1000;
const MIME = /^audio\/(webm|mp4|ogg)(;\s*codecs=[\w.,"' -]+)?$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bad(message: string): never {
  throw new HttpError(400, message);
}

function asInt(value: unknown, min: number, max: number, name: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) bad(`"${name}" is invalid.`);
  return value;
}

export function parseUuid(value: string): string {
  if (!UUID.test(value)) throw new HttpError(404, "Not found.");
  return value.toLowerCase();
}

export function parseTitle(value: unknown): string {
  if (typeof value !== "string") bad('"title" is required.');
  const title = value.trim();
  if (title.length < 1 || title.length > 120) bad("Titles must be 1 to 120 characters.");
  return title;
}

export interface CreateInput {
  book: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  translation: string;
  quote: string;
  title: string;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  peaks: number[];
  /** Only set when importing an older recording so its original date is kept. */
  createdAt: Date | null;
}

export function parseCreate(body: unknown): CreateInput {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const book = asInt(b.book, 1, 66, "book");
  const chapter = asInt(b.chapter, 1, BOOKS[book - 1].chapters, "chapter");

  let verseStart: number | null = null;
  let verseEnd: number | null = null;
  if (b.verseStart != null) {
    verseStart = asInt(b.verseStart, 1, 200, "verseStart");
    verseEnd = b.verseEnd == null ? verseStart : asInt(b.verseEnd, verseStart, 200, "verseEnd");
  } else if (b.verseEnd != null) {
    bad('"verseEnd" needs "verseStart".');
  }

  if (typeof b.translation !== "string" || !/^[A-Za-z0-9_:.-]{1,40}$/.test(b.translation)) bad('"translation" is invalid.');
  if (typeof b.mimeType !== "string" || b.mimeType.length > 100 || !MIME.test(b.mimeType)) {
    bad("Unsupported audio format. Use WebM, MP4 or Ogg.");
  }
  const durationMs = asInt(b.durationMs, 500, MAX_DURATION_MS, "durationMs");
  const sizeBytes = asInt(b.sizeBytes, 1, MAX_AUDIO_BYTES, "sizeBytes");

  if (!Array.isArray(b.peaks) || b.peaks.length < 8 || b.peaks.length > 128) bad('"peaks" is invalid.');
  const peaks = b.peaks.map((v) => {
    if (typeof v !== "number" || !Number.isFinite(v)) bad('"peaks" is invalid.');
    return Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
  });

  let createdAt: Date | null = null;
  if (b.createdAt != null) {
    const ms = asInt(b.createdAt, Date.UTC(2000, 0, 1), Date.now() + 60_000, "createdAt");
    createdAt = new Date(ms);
  }

  return {
    book,
    chapter,
    verseStart,
    verseEnd,
    translation: b.translation,
    quote: typeof b.quote === "string" ? b.quote.slice(0, 400) : "",
    title: parseTitle(b.title),
    durationMs,
    mimeType: b.mimeType,
    sizeBytes,
    peaks,
    createdAt,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseCredentials(body: unknown): { email: string; password: string; name: string | null } {
  const b = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) bad("Enter a valid email address.");
  if (typeof b.password !== "string" || b.password.length < 10 || b.password.length > 200) {
    bad("Passwords must be 10 to 200 characters.");
  }
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 80) : null;
  return { email, password: b.password, name };
}
