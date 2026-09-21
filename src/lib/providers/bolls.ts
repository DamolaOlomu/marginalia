import { sanitizeHtml, stripTags } from "../sanitize";
import { parseBollsVerse } from "../strongs";
import type { LexiconEntry, TranslationInfo, Verse } from "../types";

const BASE = process.env.BOLLS_BASE ?? "https://bolls.life";
const DAY = 60 * 60 * 24;

interface BollsLanguageGroup {
  language: string;
  translations: { short_name: string; full_name: string; dir?: string }[];
}
interface BollsVerse {
  pk: number;
  verse: number;
  text: string;
}
interface BollsDefinition {
  topic: string;
  definition?: string;
  lexeme?: string;
  transliteration?: string;
  pronunciation?: string;
  short_definition?: string;
  weight?: number;
}

async function getJson<T>(url: string, revalidate: number): Promise<T> {
  const res = await fetch(url, { next: { revalidate }, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Bolls responded ${res.status}`);
  return (await res.json()) as T;
}

export async function bollsTranslations(): Promise<TranslationInfo[]> {
  const groups = await getJson<BollsLanguageGroup[]>(`${BASE}/static/bolls/app/views/languages.json`, DAY);
  return groups.flatMap((g) =>
    g.translations.map(
      (t): TranslationInfo => ({
        id: `bolls:${t.short_name}`,
        provider: "bolls",
        code: t.short_name,
        name: t.full_name,
        language: g.language,
        dir: t.dir === "rtl" ? "rtl" : "ltr",
        strongs: /strong/i.test(t.full_name),
      }),
    ),
  );
}

/**
 * Bolls asks clients not to scrape whole Bibles chapter by chapter, so chapters are cached
 * for a week by Next's fetch cache. For heavy use, download a translation JSON instead
 * (https://bolls.life/static/translations/KJV.json) and serve it yourself.
 */
export async function bollsChapter(code: string, book: number, chapter: number): Promise<Verse[]> {
  const rows = await getJson<BollsVerse[]>(
    `${BASE}/get-text/${encodeURIComponent(code)}/${book}/${chapter}/`,
    DAY * 7,
  );
  if (!Array.isArray(rows)) return [];

  return rows.map((r) => {
    const parsed = parseBollsVerse(r.text, book);
    const tagged = parsed.tokens.some((t) => t.s?.length);
    return {
      n: r.verse,
      text: parsed.text || stripTags(r.text),
      tokens: tagged ? parsed.tokens : undefined,
    };
  });
}

/** Brown-Driver-Briggs (Hebrew) and Thayer's (Greek) via Bolls. `query` may be G26, H430, a Greek/Hebrew word, or English. */
export async function bollsDefine(query: string): Promise<LexiconEntry[]> {
  const rows = await getJson<BollsDefinition[]>(
    `${BASE}/dictionary-definition/BDBT/${encodeURIComponent(query)}/`,
    DAY * 30,
  );
  if (!Array.isArray(rows)) return [];

  return rows
    .slice()
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, 8)
    .map((d) => ({
      strongs: d.topic,
      lexeme: d.lexeme ?? "",
      transliteration: d.transliteration ?? "",
      pronunciation: d.pronunciation ?? "",
      shortDefinition: d.short_definition ? stripTags(d.short_definition) : "",
      definitionHtml: sanitizeHtml(d.definition ?? ""),
    }));
}
