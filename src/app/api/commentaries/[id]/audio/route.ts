import { NextResponse } from "next/server";
import { slugify } from "@/lib/format";
import { extensionFor } from "@/lib/server/commentaries";
import { HttpError, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { signDownload } from "@/lib/server/r2";
import { requireUser } from "@/lib/server/session";
import { parseUuid } from "@/lib/server/validate";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Stable URL for a recording's audio. Checks the caller owns it, then redirects to a
 * one-hour signed R2 link, so the bucket can stay private. Add ?download=1 to save as a file.
 */
export const GET = route(async (req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const id = parseUuid((await ctx.params).id);

  const rows = await query<{ audio_key: string; mime_type: string; title: string }>(
    "select audio_key, mime_type, title from commentaries where id = $1 and user_id = $2 and status = 'ready'",
    [id, user.id],
  );
  const row = rows[0];
  if (!row) throw new HttpError(404, "Commentary not found.");

  const download = new URL(req.url).searchParams.get("download") === "1";
  const url = await signDownload(row.audio_key, {
    contentType: row.mime_type,
    filename: download ? `${slugify(row.title)}.${extensionFor(row.mime_type)}` : undefined,
  });

  // Cache the redirect for 5 minutes so seeking doesn't re-hit the database every time.
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, max-age=300" } });
});
