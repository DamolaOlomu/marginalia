import { signupsOpen } from "@/lib/server/env";
import { json, route } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const GET = route(async () => {
  const user = await currentUser();
  return json({ user, signupsOpen: signupsOpen() });
});
