import { decodeEntities } from "./sanitize";
import type { Token } from "./types";

/**
 * Bolls marks Strong's numbers inline, after the word they belong to:
 *   In the beginning<S>7225</S> God<S>430</S> created<S>1254</S> …
 * This turns that markup into plain text plus word tokens. The testament decides the
 * prefix the lexicon API expects (H = Hebrew for books 1–39, G = Greek for 40–66).
 */
export function parseBollsVerse(html: string, book: number): { text: string; tokens: Token[] } {
  const prefix = book <= 39 ? "H" : "G";

  const cleaned = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(m|rf)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    // drop every tag except <S> and </S>
    .replace(/<(?!\/?S\b)[^>]*>/gi, "");

  const tokens: Token[] = [];

  const attach = (num: string) => {
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].t.trim()) {
        (tokens[i].s ??= []).push(num);
        return;
      }
    }
  };

  const tag = /<S>\s*(\d+)[a-z]?\s*<\/S>/gi;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = tag.exec(cleaned)) !== null) {
    const before = cleaned.slice(last, m.index);
    last = m.index + m[0].length;
    const num = prefix + m[1];

    if (!before.trim()) {
      if (before) tokens.push({ t: before });
      attach(num);
      continue;
    }

    const trailing = before.match(/\s*$/)![0];
    const body = before.slice(0, before.length - trailing.length);
    const split = body.match(/^([\s\S]*?)(\S+)$/)!;
    if (split[1]) tokens.push({ t: split[1] });
    tokens.push({ t: split[2], s: [num] });
    if (trailing) tokens.push({ t: trailing });
  }
  if (last < cleaned.length) tokens.push({ t: cleaned.slice(last) });

  for (const t of tokens) t.t = decodeEntities(t.t).replace(/\s+/g, " ");
  const text = tokens.map((t) => t.t).join("").replace(/\s+/g, " ").trim();

  return { text, tokens };
}
