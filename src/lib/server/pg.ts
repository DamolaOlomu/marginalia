import { Pool, type QueryResultRow } from "pg";
import { requireEnv } from "./env";

// Reuse one pool across hot reloads in development.
const globalForPg = globalThis as unknown as { __marginaliaPool?: Pool };

function pool(): Pool {
  if (!globalForPg.__marginaliaPool) {
    const p = new Pool({ connectionString: requireEnv("DATABASE_URL"), max: 5 });
    p.on("error", (error) => console.error("Postgres pool error:", error));
    globalForPg.__marginaliaPool = p;
  }
  return globalForPg.__marginaliaPool;
}

export async function query<R extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<R[]> {
  const result = await pool().query<R>(text, params);
  return result.rows;
}

export const isUniqueViolation = (error: unknown): boolean => (error as { code?: string } | null)?.code === "23505";
