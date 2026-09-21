"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { SpeechApi } from "@/hooks/useSpeech";
import { CloseIcon, MicIcon, PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "./icons";

const RATES = [0.8, 1, 1.15, 1.3, 1.5];

interface Props {
  title: string;
  /** The verse number being read (or paused on). */
  verseNumber: number | undefined;
  rate: number;
  speech: SpeechApi;
  autoAdvance: boolean;
  onAutoAdvance: (on: boolean) => void;
  onRate: (rate: number) => void;
  onVoice: (voiceURI: string) => void;
  /** Pause and record a commentary on the verse being read. */
  onComment: () => void;
  onClose: () => void;
}

const pill = "rounded-full border border-rule px-3.5 py-1.5 text-sm transition-colors hover:bg-wash";

/** Bottom-sheet player that reads the chapter aloud. Doesn't block the text, so you can keep reading along. */
export function ListenPlayer({ title, verseNumber, rate, speech, autoAdvance, onAutoAdvance, onRate, onVoice, onComment, onClose }: Props) {
  const [panel, setPanel] = useState<"main" | "voices">("main");
  const [drag, setDrag] = useState<number | null>(null);

  const noVoices = speech.supported && speech.voicesChecked && speech.voices.length === 0;
  const cycleRate = () => onRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1);

  const commitDrag = () => {
    if (drag !== null) {
      speech.seek(drag);
      setDrag(null);
    }
  };

  return (
    <motion.section
      role="region"
      aria-label={`Listen to ${title}`}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-xl rounded-t-[1.75rem] border border-b-0 border-rule bg-raised px-6 pb-7 pt-3 shadow-[0_-20px_50px_-24px_rgba(0,0,0,0.7)] md:bottom-4 md:rounded-b-[1.75rem] md:border-b"
      initial={{ y: "105%" }}
      animate={{ y: 0 }}
      exit={{ y: "105%" }}
      transition={{ type: "spring", damping: 34, stiffness: 320 }}
    >
      <div className="mx-auto h-1 w-10 rounded-full bg-rule" aria-hidden="true" />

      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-serif text-lg leading-tight">{title}</h2>
          <p className="mt-0.5 truncate text-sm text-muted">
            {speech.voice ? `Read aloud by ${speech.voice.name}` : "Read aloud"}
          </p>
        </div>
        <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1 shrink-0" aria-label="Close player">
          <CloseIcon />
        </button>
      </div>

      {!speech.supported && speech.voicesChecked ? (
        <p role="alert" className="mt-5 rounded-xl border border-rule bg-page/60 p-4 text-[0.95rem]">
          This browser can't read aloud. Try a current Chrome, Edge or Safari.
        </p>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          {panel === "voices" ? (
            <motion.div key="voices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Voice</p>
                <button type="button" onClick={() => setPanel("main")} className={pill}>
                  Done
                </button>
              </div>
              <ul role="radiogroup" aria-label="Voice" className="mt-3 max-h-48 space-y-1 overflow-y-auto pr-1">
                {speech.voices.map((v) => {
                  const selected = v.voiceURI === speech.voice?.voiceURI;
                  return (
                    <li key={v.voiceURI}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onVoice(v.voiceURI)}
                        className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left text-[0.95rem] transition-colors ${
                          selected ? "bg-wash text-gilt" : "hover:bg-wash"
                        }`}
                      >
                        <span className="truncate">{v.name}</span>
                        <span className="shrink-0 text-xs text-muted">
                          {v.lang}
                          {v.localService ? "" : ", online"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <label className="mt-4 flex items-center gap-3 text-[0.95rem]">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => onAutoAdvance(e.target.checked)}
                  className="h-4 w-4"
                  style={{ accentColor: "var(--gilt)" }}
                />
                Continue into the next chapter
              </label>
              <p className="mt-2 text-xs text-muted">Voices come from your device or browser, so they differ between phones and computers.</p>
            </motion.div>
          ) : (
            <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setPanel("voices")} className={pill} disabled={noVoices}>
                  Switch voice
                </button>
                <button type="button" onClick={cycleRate} className={`${pill} tabular-nums`} aria-label={`Reading speed ${rate} times. Change speed`}>
                  {rate}×
                </button>
                {verseNumber != null && (
                  <button type="button" onClick={onComment} className={`${pill} ml-auto flex items-center gap-1.5`}>
                    <MicIcon className="h-4 w-4" />
                    Comment on verse {verseNumber}
                  </button>
                )}
              </div>

              {noVoices && (
                <p role="alert" className="mt-4 text-sm text-muted">
                  No read-aloud voices were found on this device. Install one in your system settings and reload.
                </p>
              )}

              <div className="mt-5 flex items-center justify-center gap-8">
                <button type="button" onClick={speech.prev} disabled={speech.index === 0} className="icon-btn h-12 w-12 disabled:opacity-40" aria-label="Previous verse">
                  <SkipBackIcon className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={speech.toggle}
                  disabled={noVoices || speech.count === 0}
                  aria-label={speech.playing ? "Pause" : "Play"}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-gilt text-gilt-ink transition-transform hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                  <motion.span key={speech.playing ? "pause" : "play"} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 22 }}>
                    {speech.playing ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7 translate-x-[2px]" />}
                  </motion.span>
                </button>
                <button type="button" onClick={speech.next} disabled={speech.index >= speech.count - 1} className="icon-btn h-12 w-12 disabled:opacity-40" aria-label="Next verse">
                  <SkipForwardIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-5">
                <input
                  type="range"
                  className="listen-range w-full"
                  min={0}
                  max={Math.max(0, speech.count - 1)}
                  value={drag ?? speech.index}
                  onChange={(e) => setDrag(Number(e.target.value))}
                  onPointerUp={commitDrag}
                  onKeyUp={commitDrag}
                  onBlur={commitDrag}
                  aria-label="Position in chapter"
                  aria-valuetext={verseNumber != null ? `Verse ${verseNumber} of ${speech.count}` : undefined}
                />
                <div className="mt-1 flex justify-between text-sm tabular-nums text-muted">
                  <span>Verse {verseNumber ?? "–"}</span>
                  <span>{speech.count} verses</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.section>
  );
}
