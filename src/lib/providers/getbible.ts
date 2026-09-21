import { stripTags } from "../sanitize";
import type { TranslationInfo, Verse } from "../types";

const BASE = process.env.GETBIBLE_BASE ?? "https://api.getbible.net/v2";
const DAY = 60 * 60 * 24;

interface GetBibleTranslation {
  translation?: string;
  abbreviation?: string;
  language?: string;
  direction?: string;
}

interface GetBibleChapter {
  verses?: { verse: number; text: string }[];
}

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, { next: { revalidate }, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`getBible responded ${res.status}`);
  return (await res.json()) as T;
}

export async function getbibleTranslations(): Promise<TranslationInfo[]> {
  const data = await getJson<Record<string, GetBibleTranslation> | GetBibleTranslation[]>(
    `${BASE}/translations.json`,
    DAY,
  );
  const list = Array.isArray(data) ? data : Object.values(data);

  return list
    .filter((t): t is GetBibleTranslation & { abbreviation: string } => Boolean(t.abbreviation))
    .map(
      (t): TranslationInfo => ({
        id: `getbible:${t.abbreviation}`,
        provider: "getbible",
        code: t.abbreviation,
        name: t.translation ?? t.abbreviation,
        language: t.language ?? "Other",
        dir: t.direction?.toLowerCase() === "rtl" ? "rtl" : "ltr",
        strongs: false,
      }),
    );
}

export async function getbibleChapter(code: string, book: number, chapter: number): Promise<Verse[]> {
  const data = await getJson<GetBibleChapter>(
    `${BASE}/${encodeURIComponent(code)}/${book}/${chapter}.json`,
    DAY * 7,
  );
  return (data.verses ?? []).map((v) => ({ n: v.verse, text: stripTags(v.text) }));
}
