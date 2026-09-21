import { COLUMNS, toRecord, type CommentaryRow } from "@/lib/server/commentaries";
import { HttpError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { deleteObject } from "@/lib/server/r2";
import { requireUser } from "@/lib/server/session";
import { parseTitle, parseUuid } from "@/lib/server/validate";

type Ctx = { params: Promise<{ id: string }> };

/** Rename a commentary. */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const id = parseUuid((await ctx.params).id);
  const body = (await readJson(req)) as { title?: unknown } | null;
  const title = parseTitle(body?.title);

  const rows = await query<CommentaryRow>(
    `update commentaries set title = $1
      where id = $2 and user_id = $3 and status = 'ready'
      returning ${COLUMNS}`,
    [title, id, user.id],
  );
  if (!rows[0]) throw new HttpError(404, "Commentary not found.");
  return json({ record: toRecord(rows[0]) });
});

/** Delete a commentary and its audio file. Also used to clean up after a failed upload. */
export const DELETE = route(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const id = parseUuid((await ctx.params).id);

  const rows = await query<{ audio_key: string }>(
    "delete from commentaries where id = $1 and user_id = $2 returning audio_key",
    [id, user.id],
  );
  if (!rows[0]) throw new HttpError(404, "Commentary not found.");

  // The row is already gone, so a failure here only leaves an unreachable file behind.
  await deleteObject(rows[0].audio_key).catch((error) => console.error("R2 delete failed:", error));
  return json({ ok: true });
});
