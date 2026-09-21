import type { TranslationInfo } from "./types";

/** Used when both providers are unreachable, so the reader still has a picker. */
export const FALLBACK_TRANSLATIONS: TranslationInfo[] = [
  { id: "bolls:KJV", provider: "bolls", code: "KJV", name: "King James Version with Strong's Numbers", language: "English", dir: "ltr", strongs: true },
  { id: "bolls:WEB", provider: "bolls", code: "WEB", name: "World English Bible", language: "English", dir: "ltr", strongs: false },
  { id: "bolls:ASV", provider: "bolls", code: "ASV", name: "American Standard Version with Strong's Numbers", language: "English", dir: "ltr", strongs: true },
  { id: "getbible:kjv", provider: "getbible", code: "kjv", name: "King James Version", language: "English", dir: "ltr", strongs: false },
  { id: "getbible:web", provider: "getbible", code: "web", name: "World English Bible", language: "English", dir: "ltr", strongs: false },
];

export function splitTranslationId(id: string): { provider: "bolls" | "getbible"; code: string } {
  const [provider, ...rest] = id.split(":");
  return { provider: provider === "getbible" ? "getbible" : "bolls", code: rest.join(":") || "KJV" };
}
