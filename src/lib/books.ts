export interface Book {
  /** 1–66. Matches the book numbering used by both getBible and Bolls. */
  id: number;
  name: string;
  slug: string;
  chapters: number;
  testament: "OT" | "NT";
  aliases: string[];
}

const RAW: [name: string, chapters: number, aliases: string[]][] = [
  ["Genesis", 50, ["gen", "ge", "gn"]],
  ["Exodus", 40, ["exo", "ex", "exod"]],
  ["Leviticus", 27, ["lev", "le", "lv"]],
  ["Numbers", 36, ["num", "nu", "nm", "nb"]],
  ["Deuteronomy", 34, ["deut", "dt", "de"]],
  ["Joshua", 24, ["josh", "jos", "jsh"]],
  ["Judges", 21, ["judg", "jdg", "jg"]],
  ["Ruth", 4, ["ru", "rth"]],
  ["1 Samuel", 31, ["1sam", "1sa", "1sm"]],
  ["2 Samuel", 24, ["2sam", "2sa", "2sm"]],
  ["1 Kings", 22, ["1kgs", "1ki", "1kin"]],
  ["2 Kings", 25, ["2kgs", "2ki", "2kin"]],
  ["1 Chronicles", 29, ["1chr", "1ch", "1chron"]],
  ["2 Chronicles", 36, ["2chr", "2ch", "2chron"]],
  ["Ezra", 10, ["ezr"]],
  ["Nehemiah", 13, ["neh", "ne"]],
  ["Esther", 10, ["est", "esth"]],
  ["Job", 42, ["jb"]],
  ["Psalms", 150, ["ps", "psa", "psalm", "pss"]],
  ["Proverbs", 31, ["prov", "pro", "prv", "pr"]],
  ["Ecclesiastes", 12, ["eccl", "ecc", "qoh"]],
  ["Song of Solomon", 8, ["song", "sos", "songofsongs", "sng"]],
  ["Isaiah", 66, ["isa", "is"]],
  ["Jeremiah", 52, ["jer", "je"]],
  ["Lamentations", 5, ["lam", "la"]],
  ["Ezekiel", 48, ["ezek", "eze", "ezk"]],
  ["Daniel", 12, ["dan", "da", "dn"]],
  ["Hosea", 14, ["hos", "ho"]],
  ["Joel", 3, ["jl", "joe"]],
  ["Amos", 9, ["am"]],
  ["Obadiah", 1, ["obad", "ob", "oba"]],
  ["Jonah", 4, ["jnh", "jon"]],
  ["Micah", 7, ["mic", "mi"]],
  ["Nahum", 3, ["nah", "na"]],
  ["Habakkuk", 3, ["hab"]],
  ["Zephaniah", 3, ["zeph", "zep"]],
  ["Haggai", 2, ["hag"]],
  ["Zechariah", 14, ["zech", "zec"]],
  ["Malachi", 4, ["mal"]],
  ["Matthew", 28, ["matt", "mt", "mat"]],
  ["Mark", 16, ["mk", "mr", "mrk"]],
  ["Luke", 24, ["lk", "luk"]],
  ["John", 21, ["jn", "joh", "jhn"]],
  ["Acts", 28, ["ac"]],
  ["Romans", 16, ["rom", "ro", "rm"]],
  ["1 Corinthians", 16, ["1cor", "1co"]],
  ["2 Corinthians", 13, ["2cor", "2co"]],
  ["Galatians", 6, ["gal", "ga"]],
  ["Ephesians", 6, ["eph"]],
  ["Philippians", 4, ["phil", "php", "pp"]],
  ["Colossians", 4, ["col"]],
  ["1 Thessalonians", 5, ["1thess", "1th", "1thes"]],
  ["2 Thessalonians", 3, ["2thess", "2th", "2thes"]],
  ["1 Timothy", 6, ["1tim", "1ti"]],
  ["2 Timothy", 4, ["2tim", "2ti"]],
  ["Titus", 3, ["tit"]],
  ["Philemon", 1, ["phlm", "philem", "phm"]],
  ["Hebrews", 13, ["heb"]],
  ["James", 5, ["jas", "jam"]],
  ["1 Peter", 5, ["1pet", "1pe", "1pt"]],
  ["2 Peter", 3, ["2pet", "2pe", "2pt"]],
  ["1 John", 5, ["1jn", "1jo", "1joh"]],
  ["2 John", 1, ["2jn", "2jo", "2joh"]],
  ["3 John", 1, ["3jn", "3jo", "3joh"]],
  ["Jude", 1, []],
  ["Revelation", 22, ["rev", "re", "rv"]],
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const BOOKS: Book[] = RAW.map(([name, chapters, aliases], i) => ({
  id: i + 1,
  name,
  slug: slugify(name),
  chapters,
  testament: i < 39 ? "OT" : "NT",
  aliases,
}));

export const bookBySlug = (slug: string) => BOOKS.find((b) => b.slug === slug);

export interface ChapterRef {
  book: Book;
  chapter: number;
}

export function neighbors(bookId: number, chapter: number): { prev: ChapterRef | null; next: ChapterRef | null } {
  const book = BOOKS[bookId - 1];
  let prev: ChapterRef | null = null;
  let next: ChapterRef | null = null;

  if (chapter > 1) prev = { book, chapter: chapter - 1 };
  else if (bookId > 1) prev = { book: BOOKS[bookId - 2], chapter: BOOKS[bookId - 2].chapters };

  if (chapter < book.chapters) next = { book, chapter: chapter + 1 };
  else if (bookId < BOOKS.length) next = { book: BOOKS[bookId], chapter: 1 };

  return { prev, next };
}
