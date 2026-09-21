import { dummyHash, verifyPassword } from "@/lib/server/crypto";
import { HttpError, assertSameOrigin, clientIp, json, readJson, route } from "@/lib/server/http";
import { query } from "@/lib/server/pg";
import { rateLimit, resetRateLimit } from "@/lib/server/rateLimit";
import { startSession } from "@/lib/server/session";
import { parseCredentials } from "@/lib/server/validate";

export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  const ip = clientIp(req);
  rateLimit(`login-ip:${ip}`, 60, 15 * 60 * 1000);

  const { email, password } = parseCredentials(await readJson(req));
  const perAccount = `login:${ip}:${email}`;
  rateLimit(perAccount, 8, 15 * 60 * 1000);

  const rows = await query<{ id: string; email: string; password_hash: string; display_name: string | null }>(
    "select id, email, password_hash, display_name from users where email = $1",
    [email],
  );
  const user = rows[0];
  // Always run a full hash comparison, even for unknown emails, so response time doesn't reveal which exist.
  const valid = await verifyPassword(password, user?.password_hash ?? (await dummyHash()));
  if (!user || !valid) throw new HttpError(401, "That email and password don't match.");

  resetRateLimit(perAccount);
  await startSession(user.id);
  return json({ user: { id: user.id, email: user.email, name: user.display_name } });
});
