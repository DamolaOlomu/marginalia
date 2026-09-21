import { assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { rateLimit } from "@/lib/server/rateLimit";
import { requireUser } from "@/lib/server/session";
import { parseDay } from "@/lib/server/validate";

/** Record that the signed-in user read a chapter today (their local date). Safe to call repeatedly. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const user = await requireUser();
  rateLimit(`read:${user.id}`, 120, 60 * 60 * 1000);

  const body = (await readJson(req)) as { day?: unknown } | null;
  const day = parseDay(body?.day);

  await query("insert into reading_days (user_id, day) values ($1, $2::date) on conflict do nothing", [user.id, day]);
  return json({ ok: true });
});
