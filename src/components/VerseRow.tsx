"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, type MouseEvent } from "react";
import type { CommentaryRecord, Token, Verse } from "@/lib/types";
import { CommentaryCard } from "./CommentaryCard";
import { MarginChip } from "./MarginChip";

interface Props {
  verse: Verse;
  index: number;
  scale: number;
  dir?: "ltr" | "rtl";
  selected: boolean;
  covered: boolean;
  studyMode: boolean;
  commentaries: CommentaryRecord[];
  /** Only set when the open commentary belongs to this verse, so other rows don't re-render. */
  openId: string | null;
  onToggleVerse: (n: number) => void;
  onToggleCommentary: (id: string) => void;
  onWord: (token: Token) => void;
  onDeleted: () => void;
}

function VerseRowBase({
  verse, index, scale, dir, selected, covered, studyMode, commentaries, openId,
  onToggleVerse, onToggleCommentary, onWord, onDeleted,
}: Props) {
  const open = commentaries.find((c) => c.id === openId) ?? null;

  // Clicking the text selects the verse, unless the reader was dragging to copy text.
  const onTextClick = (e: MouseEvent<HTMLParagraphElement>) => {
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("button")) return;
    onToggleVerse(verse.n);
  };

  const body =
    studyMode && verse.tokens
      ? verse.tokens.map((t, i) =>
          t.s?.length ? (
            <button
              key={i}
              type="button"
              className="strongs-word"
              onClick={(e) => {
                e.stopPropagation();
                onWord(t);
              }}
              aria-label={`${t.t}, look up ${t.s.join(", ")}`}
            >
              {t.t}
            </button>
          ) : (
            <span key={i}>{t.t}</span>
          ),
        )
      : verse.text;

  return (
    <motion.div
      id={`v${verse.n}`}
      className="verse-row -mx-2 px-2 py-1"
      data-selected={selected}
      data-covered={covered}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 16) * 0.03, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="grid gap-x-8 md:grid-cols-[minmax(0,1fr)_11rem]">
        <p
          dir={dir}
          className="verse-text font-serif leading-[1.85]"
          style={{ fontSize: `${1.1875 * scale}rem` }}
          onClick={onTextClick}
        >
          <button
            type="button"
            className="verse-num"
            aria-pressed={selected}
            aria-label={`Verse ${verse.n}. ${selected ? "Deselect" : "Select to comment on it"}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVerse(verse.n);
            }}
          >
            {verse.n}
          </button>
          {body}
        </p>

        {commentaries.length > 0 && (
          <div className="mt-1 flex flex-wrap content-start gap-2 md:mt-2">
            {commentaries.map((c) => (
              <MarginChip key={c.id} record={c} open={c.id === openId} onToggle={() => onToggleCommentary(c.id)} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={open.id}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pb-3 pt-2">
              <CommentaryCard record={open} onDeleted={onDeleted} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const VerseRow = memo(VerseRowBase);
