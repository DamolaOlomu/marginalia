import { cookies } from "next/headers";
import type { AuthUser } from "../types";
import { newSessionToken, sha256 } from "./crypto";
import { HttpError } from "./errors";
import { query } from "./pg";

const COOKIE = "marginalia_session";
const LIFETIME_DAYS = 30;
const DAY_MS = 86_400_000;

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function startSession(userId: string): Promise<void> {
  const { token, hash } = newSessionToken();
  const expires = new Date(Date.now() + LIFETIME_DAYS * DAY_MS);
  await query("insert into sessions (id_hash, user_id, expires_at) values ($1, $2, $3)", [hash, userId, expires]);
  // Housekeeping: drop expired sessions whenever someone signs in.
  await query("delete from sessions where expires_at < now()");
  (await cookies()).set(COOKIE, token, cookieOptions(expires));
}

export async function currentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const rows = await query<{ id: string; email: string; display_name: string | null; expires_at: Date }>(
    `select u.id, u.email, u.display_name, s.expires_at
       from sessions s join users u on u.id = s.user_id
      where s.id_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  const row = rows[0];
  if (!row) return null;

  // Sliding expiry: renew once less than half the lifetime remains.
  if (row.expires_at.getTime() - Date.now() < (LIFETIME_DAYS / 2) * DAY_MS) {
    const expires = new Date(Date.now() + LIFETIME_DAYS * DAY_MS);
    await query("update sessions set expires_at = $1 where id_hash = $2", [expires, sha256(token)]);
    try {
      jar.set(COOKIE, token, cookieOptions(expires));
    } catch {
      /* cookies are read-only outside route handlers; the DB row is renewed regardless */
    }
  }

  return { id: row.id, email: row.email, name: row.display_name };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  return user;
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("delete from sessions where id_hash = $1", [sha256(token)]);
  jar.delete(COOKIE);
}
