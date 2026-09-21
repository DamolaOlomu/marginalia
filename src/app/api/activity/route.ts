import { json, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { requireUser } from "@/lib/server/session";

/**
 * Everything the streak screens need, in one small response:
 * the days the user read (already local dates) and the moments they saved a commentary.
 * The browser turns those moments into its own local days, so time zones are always the reader's.
 */
export const GET = route(async () => {
  const user = await requireUser();

  const [reads, saves] = await Promise.all([
    query<{ day: string }>("select to_char(day, 'YYYY-MM-DD') as day from reading_days where user_id = $1 order by day", [
      user.id,
    ]),
    query<{ ms: string }>(
      `select (extract(epoch from created_at) * 1000)::bigint as ms
         from commentaries
        where user_id = $1 and status = 'ready'
        order by created_at
        limit 20000`,
      [user.id],
    ),
  ]);

  return json({ readDays: reads.map((r) => r.day), commentaryTimes: saves.map((r) => Number(r.ms)) });
});
