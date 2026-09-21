import { NextResponse } from "next/server";
import { BOOKS } from "@/lib/books";
import { bollsChapter } from "@/lib/providers/bolls";
import { getbibleChapter } from "@/lib/providers/getbible";
import type { ChapterPayload } from "@/lib/types";

const ATTRIBUTION = {
  bolls: "Text via bolls.life. Check the licence of each translation before publishing.",
  getbible: "Text via getBible (CrossWire SWORD modules).",
} as const;

type Params = { provider: string; code: string; book: string; chapter: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { provider, code, book, chapter } = await ctx.params;
  const bookId = Number(book);
  const chapterNo = Number(chapter);

  if (provider !== "bolls" && provider !== "getbible") {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }
  if (!/^[A-Za-z0-9_-]{1,16}$/.test(code)) {
    return NextResponse.json({ error: "Invalid translation code." }, { status: 400 });
  }
  const meta = Number.isInteger(bookId) ? BOOKS[bookId - 1] : undefined;
  if (!meta || !Number.isInteger(chapterNo) || chapterNo < 1 || chapterNo > meta.chapters) {
    return NextResponse.json({ error: "That book or chapter doesn't exist." }, { status: 404 });
  }

  try {
    const verses =
      provider === "bolls"
        ? await bollsChapter(code, bookId, chapterNo)
        : await getbibleChapter(code, bookId, chapterNo);

    if (verses.length === 0) {
      return NextResponse.json(
        { error: `${code} has no text for ${meta.name} ${chapterNo}. Try another translation.` },
        { status: 404 },
      );
    }

    const payload: ChapterPayload = {
      provider,
      code,
      book: bookId,
      bookName: meta.name,
      chapter: chapterNo,
      verses,
      hasStrongs: verses.some((v) => v.tokens?.some((t) => t.s?.length)),
      attribution: ATTRIBUTION[provider],
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Couldn't load scripture from ${provider}: ${message}` }, { status: 502 });
  }
}
