import { NextResponse } from "next/server";
import { bollsDefine } from "@/lib/providers/bolls";

export async function GET(_req: Request, ctx: { params: Promise<{ query: string }> }) {
  const { query: raw } = await ctx.params;
  let query = raw;
  try {
    query = decodeURIComponent(raw);
  } catch {
    /* already decoded */
  }
  query = query.trim();

  if (!query || query.length > 64) {
    return NextResponse.json({ error: "Enter a Strong's number like G26 or H430, or a word." }, { status: 400 });
  }

  try {
    const entries = await bollsDefine(query);
    return NextResponse.json(
      { query, entries, source: "Brown-Driver-Briggs and Thayer's, via bolls.life" },
      { headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Lexicon lookup failed: ${message}` }, { status: 502 });
  }
}
