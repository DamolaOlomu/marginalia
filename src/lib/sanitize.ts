const NAMED: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&nbsp;": " ",
  "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
  "&lsquo;": "‘", "&rsquo;": "’", "&ldquo;": "“", "&rdquo;": "”",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const hex = body[1]?.toLowerCase() === "x";
      const code = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      try {
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      } catch {
        return match;
      }
    }
    return NAMED[match.toLowerCase()] ?? match;
  });
}

/** HTML → plain text on one line. */
export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

const ALLOWED = new Set(["b", "i", "em", "strong", "br", "p", "ul", "ol", "li", "sup", "sub"]);

/**
 * Keeps a small allow-list of formatting tags and drops every attribute, so third-party
 * lexicon HTML can be rendered with dangerouslySetInnerHTML without carrying scripts,
 * event handlers or links.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (_all, slash: string, tag: string) => {
      const name = tag.toLowerCase();
      return ALLOWED.has(name) ? `<${slash}${name}>` : "";
    });
}
