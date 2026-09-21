"use client";

import { motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import type { LexiconEntry } from "@/lib/types";
import { CloseIcon, SearchIcon } from "./icons";

type State =
  | { status: "loading" }
  | { status: "ready"; entries: LexiconEntry[] }
  | { status: "error"; message: string };

interface Props {
  query: string;
  /** Other Strong's numbers attached to the tapped word. */
  alts: string[];
  onQuery: (q: string) => void;
  onClose: () => void;
}

export function LexiconDrawer({ query, alts, onQuery, onClose }: Props) {
  const [input, setInput] = useState(query);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    setInput(query);
    setState({ status: "loading" });
    const ac = new AbortController();

    fetch(`/api/lexicon/${encodeURIComponent(query)}`, { signal: ac.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Lookup failed");
        return json.entries as LexiconEntry[];
      })
      .then((entries) => setState({ status: "ready", entries }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setState({ status: "error", message: e instanceof Error ? e.message : "Lookup failed" });
      });

    return () => ac.abort();
  }, [query]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (q) onQuery(q);
  }

  return (
    <motion.aside
      role="dialog"
      aria-label="Lexicon"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-rule bg-surface shadow-2xl"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 34, stiffness: 320 }}
    >
      <div className="flex items-center gap-2 border-b border-rule p-4">
        <form onSubmit={submit} className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor="lexicon-q">
            Look up a Strong's number or word
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="lexicon-q"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="G26, H430, agape, love"
            className="w-full rounded-full border border-rule bg-page py-2 pl-9 pr-3 text-sm"
          />
        </form>
        <button type="button" onClick={onClose} className="icon-btn" aria-label="Close lexicon">
          <CloseIcon />
        </button>
      </div>

      {alts.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-rule px-4 py-3 text-sm">
          <span className="text-muted">Tagged on this word:</span>
          {alts.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onQuery(a)}
              className={`rounded-full border px-2.5 py-0.5 tabular-nums ${a === query ? "border-gilt text-gilt" : "border-rule text-muted hover:text-body"}`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5">
        {state.status === "loading" && (
          <div className="space-y-3" role="status" aria-label="Loading lexicon entry">
            <div className="h-9 w-1/2 animate-pulse rounded bg-wash" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-wash" />
            <div className="h-24 animate-pulse rounded bg-wash" />
          </div>
        )}
        {state.status === "error" && <p role="alert" className="text-[0.95rem]">{state.message}</p>}
        {state.status === "ready" && state.entries.length === 0 && (
          <p className="text-muted">No entries found for "{query}". Try a Strong's number like G26 or H430.</p>
        )}
        {state.status === "ready" &&
          state.entries.map((e, i) => (
            <motion.article
              key={`${e.strongs}-${i}`}
              className="border-b border-rule pb-6 pt-1 first:pt-0 last:border-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-baseline gap-3">
                <h3 className="font-serif text-3xl" dir="auto">
                  {e.lexeme || e.strongs}
                </h3>
                <span className="rounded-full border border-gilt px-2 py-0.5 text-xs tabular-nums text-gilt">{e.strongs}</span>
              </div>
              {(e.transliteration || e.pronunciation) && (
                <p className="mt-1 text-muted">
                  <span className="italic">{e.transliteration}</span>
                  {e.pronunciation && <span className="ml-3">{e.pronunciation}</span>}
                </p>
              )}
              {e.shortDefinition && <p className="mt-3 font-serif text-lg">{e.shortDefinition}</p>}
              {e.definitionHtml && (
                <div className="lexicon-html mt-3 text-[0.95rem]" dangerouslySetInnerHTML={{ __html: e.definitionHtml }} />
              )}
            </motion.article>
          ))}
      </div>

      <p className="border-t border-rule px-5 py-3 text-xs text-muted">Brown-Driver-Briggs and Thayer's, via bolls.life</p>
    </motion.aside>
  );
}
