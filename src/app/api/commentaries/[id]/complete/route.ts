import { COLUMNS, toRecord, type CommentaryRow } from "@/lib/server/commentaries";
import { HttpError, assertSameOrigin, json, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { deleteObject, objectSize } from "@/lib/server/r2";
import { requireUser } from "@/lib/server/session";
import { MAX_AUDIO_BYTES, parseUuid } from "@/lib/server/validate";

type Ctx = { params: Promise<{ id: string }> };

/** Step 2 of saving: confirm the audio landed in R2, then make the commentary visible. */
export const POST = route(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const id = parseUuid((await ctx.params).id);

  const rows = await query<CommentaryRow & { audio_key: string; status: string }>(
    `select ${COLUMNS}, audio_key, status from commentaries where id = $1 and user_id = $2`,
    [id, user.id],
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, "Commentary not found.");
  if (row.status === "ready") return json({ record: toRecord(row) });

  const size = await objectSize(row.audio_key);
  if (size === null || size === 0) {
    throw new HttpError(409, "The audio upload didn't arrive. Please try saving again.");
  }
  if (size > MAX_AUDIO_BYTES) {
    await query("delete from commentaries where id = $1", [id]);
    await deleteObject(row.audio_key).catch(() => undefined);
    throw new HttpError(413, "That recording is too large.");
  }

  await query("update commentaries set status = 'ready', size_bytes = $1 where id = $2", [size, id]);
  return json({ record: toRecord(row) });
});
