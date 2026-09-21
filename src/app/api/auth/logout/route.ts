import { assertSameOrigin, json, route } from "@/lib/server/http";
import { endSession } from "@/lib/server/session";

export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  await endSession();
  return json({ ok: true });
});
