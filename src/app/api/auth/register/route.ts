import { randomUUID } from "node:crypto";
import { hashPassword } from "@/lib/server/crypto";
import { signupsOpen } from "@/lib/server/env";
import { HttpError, assertSameOrigin, clientIp, json, readJson, route } from "@/lib/server/http";
import { isUniqueViolation, query } from "@/lib/server/pg";
import { rateLimit } from "@/lib/server/rateLimit";
import { startSession } from "@/lib/server/session";
import { parseCredentials } from "@/lib/server/validate";

export const POST = route(async (req: Request) => {
  assertSameOrigin(req);
  if (!signupsOpen()) throw new HttpError(403, "Sign-ups are closed on this server.");
  rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);

  const { email, password, name } = parseCredentials(await readJson(req));
  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await query("insert into users (id, email, password_hash, display_name) values ($1, $2, $3, $4)", [
      id,
      email,
      passwordHash,
      name,
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "An account with that email already exists. Try signing in.");
    throw error;
  }

  await startSession(id);
  return json({ user: { id, email, name } }, 201);
});
