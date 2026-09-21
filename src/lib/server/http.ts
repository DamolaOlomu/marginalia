import { NextResponse } from "next/server";
import { ConfigError, HttpError } from "./errors";

export { ConfigError, HttpError };

export function json(body: unknown, init?: number | ResponseInit): NextResponse {
  return NextResponse.json(body, typeof init === "number" ? { status: init } : init);
}

/** Wraps a route handler so thrown HttpErrors become clean JSON responses and nothing else leaks. */
export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      if (error instanceof ConfigError) {
        console.error(error.message);
        return json({ error: error.message }, 500);
      }
      console.error(error);
      return json({ error: "Something went wrong on the server." }, 500);
    }
  };
}

/** Rejects cross-site browser requests to state-changing endpoints (on top of SameSite=Lax cookies). */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) {
    if (req.headers.get("sec-fetch-site") === "cross-site") throw new HttpError(403, "Cross-site request blocked.");
    return;
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    /* fall through to rejection */
  }
  if (!host || originHost !== host) throw new HttpError(403, "Cross-site request blocked.");
}

export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    throw new HttpError(415, "Expected a JSON request.");
  }
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "The request body isn't valid JSON.");
  }
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
