import { randomUUID } from "node:crypto";
import { BOOKS } from "@/lib/books";
import { COLUMNS, audioKey, purgeStale, toRecord, type CommentaryRow } from "@/lib/server/commentaries";
import { HttpError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { signUpload } from "@/lib/server/r2";
import { rateLimit } from "@/lib/server/rateLimit";
import { requireUser } from "@/lib/server/session";
import { parseCreate } from "@/lib/server/validate";

/** List the signed-in user's commentaries. Optional ?book=43&chapter=3 narrows to one chapter. */
export const GET = route(async (req: Request) => {
  const user = await requireUser();
  const params = new URL(req.url).searchParams;
  const book = params.get("book");
  const chapter = params.get("chapter");

  const values: unknown[] = [user.id];
  let filter = "";
  if (book !== null || chapter !== null) {
    const b = Number(book);
    const c = Number(chapter);
    if (!Number.isInteger(b) || b < 1 || b > 66 || !Number.isInteger(c) || c < 1 || c > BOOKS[b - 1].chapters) {
      throw new HttpError(400, "Invalid book or chapter.");
    }
    values.push(b, c);
    filter = "and book = $2 and chapter = $3";
  }

  const rows = await query<CommentaryRow>(
    `select ${COLUMNS} from commentaries
      where user_id = $1 and status = 'ready' ${filter}
      order by created_at asc`,
    values,
  );
  return json({ commentaries: rows.map(toRecord) });
});

/**
 * Step 1 of saving: register the recording and get a short-lived URL to upload the audio to R2.
 * The row stays 'pending' (and invisible) until POST /api/commentaries/{id}/complete confirms the file arrived.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  rateLimit(`create:${user.id}`, 60, 60 * 60 * 1000);

  const input = parseCreate(await readJson(req));
  await purgeStale(user.id);

  const id = randomUUID();
  const key = audioKey(user.id, id, input.mimeType);

  await query(
    `insert into commentaries
       (id, user_id, book, chapter, verse_start, verse_end, translation, quote, title,
        duration_ms, mime_type, size_bytes, peaks, audio_key, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, coalesce($15::timestamptz, now()))`,
    [
      id,
      user.id,
      input.book,
      input.chapter,
      input.verseStart,
      input.verseEnd,
      input.translation,
      input.quote,
      input.title,
      input.durationMs,
      input.mimeType,
      input.sizeBytes,
      JSON.stringify(input.peaks),
      key,
      input.createdAt,
    ],
  );

  const uploadUrl = await signUpload(key, input.mimeType);
  return json({ id, uploadUrl }, 201);
});
