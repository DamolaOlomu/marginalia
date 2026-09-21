"use client";

import { AnimatePresence, motion } from "motion/react";
import { CloseIcon, MicIcon } from "./icons";

interface Props {
  label: string;
  hasSelection: boolean;
  onClear: () => void;
  onRecord: () => void;
}

/** Floating bar that always shows what a new recording will be attached to. */
export function Dock({ label, hasSelection, onClear, onRecord }: Props) {
  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4"
      initial={{ y: 70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 70, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 300 }}
    >
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-rule bg-raised/95 py-2 pl-5 pr-2 shadow-[0_14px_40px_-14px_rgba(0,0,0,0.65)] backdrop-blur">
        <div className="min-w-0 pr-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={label}
              className="truncate font-serif text-base"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {label}
            </motion.p>
          </AnimatePresence>
          {!hasSelection && <p className="truncate text-xs text-muted">Tap a verse number to narrow it down</p>}
        </div>
        {hasSelection && (
          <button type="button" onClick={onClear} className="icon-btn shrink-0" aria-label="Clear verse selection">
            <CloseIcon />
          </button>
        )}
        <button type="button" onClick={onRecord} className="btn btn-rubric shrink-0 pl-4 pr-5" aria-label={`Record commentary on ${label}`}>
          <MicIcon /> Record
        </button>
      </div>
    </motion.div>
  );
}
