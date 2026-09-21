export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function referenceLabel(bookName: string, chapter: number, vs: number | null, ve: number | null): string {
  if (vs == null) return `${bookName} ${chapter}`;
  return ve != null && ve !== vs ? `${bookName} ${chapter}:${vs}–${ve}` : `${bookName} ${chapter}:${vs}`;
}

export function extensionForMime(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "commentary"
  );
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
