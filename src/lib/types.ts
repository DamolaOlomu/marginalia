export type Provider = "bolls" | "getbible";

export interface TranslationInfo {
  /** "bolls:KJV" or "getbible:kjv" */
  id: string;
  provider: Provider;
  code: string;
  name: string;
  language: string;
  dir: "ltr" | "rtl";
  /** True when the translation text carries Strong's numbers. */
  strongs: boolean;
}

/** A run of verse text. `s` holds Strong's numbers like ["H7225"] when the word is tagged. */
export interface Token {
  t: string;
  s?: string[];
}

export interface Verse {
  n: number;
  text: string;
  tokens?: Token[];
}

export interface ChapterPayload {
  provider: Provider;
  code: string;
  book: number;
  bookName: string;
  chapter: number;
  verses: Verse[];
  hasStrongs: boolean;
  attribution: string;
}

export interface LexiconEntry {
  strongs: string;
  lexeme: string;
  transliteration: string;
  pronunciation: string;
  shortDefinition: string;
  definitionHtml: string;
}

export interface CommentaryRecord {
  id: string;
  book: number;
  chapter: number;
  /** null = the whole chapter */
  verseStart: number | null;
  verseEnd: number | null;
  translation: string;
  /** Snapshot of the verse text at recording time, for context in the library. */
  quote: string;
  title: string;
  createdAt: number;
  durationMs: number;
  mimeType: string;
  /** ~64 normalised amplitude values (0..1) used to draw the waveform without decoding audio. */
  peaks: number[];
  /** Same-origin URL that redirects to a short-lived signed R2 link. */
  audioUrl: string;
}

/** What the recorder hands to the API. The server fills in id, mime type and size. */
export interface NewCommentary {
  book: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  translation: string;
  quote: string;
  title: string;
  durationMs: number;
  peaks: number[];
  /** Only used when importing recordings that were saved in this browser before cloud sync existed. */
  createdAt?: number;
}

/** A recording saved by the earlier local-only version of the app (IndexedDB). */
export type LocalCommentary = Omit<CommentaryRecord, "audioUrl"> & { audio: Blob };

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface RecordTarget {
  book: number;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
  label: string;
  quote: string;
  translation: string;
}
