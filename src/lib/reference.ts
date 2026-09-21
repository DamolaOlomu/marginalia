import { BOOKS, type Book } from "./books";

export interface ParsedReference {
  book: Book;
  chapter: number;
  verse?: number;
  verseEnd?: number;
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function findBook(query: string): Book | undefined {
  const key = squash(query);
  if (!key) return undefined;
  return (
    BOOKS.find((b) => key === squash(b.name) || b.aliases.includes(key)) ??
    BOOKS.find((b) => squash(b.name).startsWith(key))
  );
}

const REF = /^\s*((?:[1-3]|i{1,3})?\s*[a-z][a-z\s.]*?)\s*(?:(\d+)(?:\s*[:.\s]\s*(\d+)(?:\s*[-–]\s*(\d+))?)?)?\s*$/i;
const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3" };

/** "jn 3:16", "1 cor 13", "Psalm 23", "ii tim 3 16-17" → a structured reference. */
export function parseReference(input: string): ParsedReference | null {
  const m = input.trim().match(REF);
  if (!m) return null;

  const name = m[1].replace(/^(i{1,3})\s+/i, (_all, r: string) => `${ROMAN[r.toLowerCase()]} `);
  const book = findBook(name);
  if (!book) return null;

  let chapter = m[2] ? parseInt(m[2], 10) : 1;
  let verse = m[3] ? parseInt(m[3], 10) : undefined;
  const verseEnd = m[4] ? parseInt(m[4], 10) : undefined;

  // "Jude 5" means verse 5 of the only chapter.
  if (book.chapters === 1 && m[2] && !m[3]) {
    verse = chapter;
    chapter = 1;
  }

  chapter = Math.min(Math.max(chapter, 1), book.chapters);
  return { book, chapter, verse, verseEnd };
}
