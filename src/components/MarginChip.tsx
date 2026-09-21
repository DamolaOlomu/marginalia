"use client";

import { motion } from "motion/react";
import { formatDuration } from "@/lib/format";
import type { CommentaryRecord } from "@/lib/types";
import { Waveform } from "./Waveform";

/** A saved commentary, drawn as its own tiny waveform in the margin beside the verse. */
export function MarginChip({ record, open, onToggle }: { record: CommentaryRecord; open: boolean; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 24 }}
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Hide" : "Show"} commentary: ${record.title}, ${formatDuration(record.durationMs)}`}
      className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors ${
        open ? "border-gilt bg-wash text-body" : "border-rule text-muted hover:border-gilt hover:text-body"
      }`}
    >
      <Waveform peaks={record.peaks} bars={18} progress={open ? 1 : 0} className="h-4 w-14" />
      {formatDuration(record.durationMs)}
    </motion.button>
  );
}
