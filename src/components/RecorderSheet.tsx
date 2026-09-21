"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { RecorderApi, Take } from "@/hooks/useRecorder";
import { ApiError, createCommentary } from "@/lib/api";
import { formatDate, formatDuration } from "@/lib/format";
import type { CommentaryRecord, RecordTarget } from "@/lib/types";
import { MicIcon, PauseIcon, PlayIcon, StopIcon } from "./icons";
import { Player } from "./Player";
import { LiveWaveform, Waveform } from "./Waveform";

interface Props {
  target: RecordTarget;
  rec: RecorderApi;
  onClose: () => void;
  onSaved: (record: CommentaryRecord) => void;
}

export function RecorderSheet({ target, rec, onClose, onSaved }: Props) {
  const [take, setTake] = useState<Take | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const { openAuth } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const live = rec.status === "recording" || rec.status === "paused" || rec.status === "requesting";

  // Warn before the tab closes if there's audio that hasn't been saved.
  useEffect(() => {
    if (!live && !take) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [live, take]);

  useEffect(() => {
    if (!confirmDiscard) return;
    const t = window.setTimeout(() => setConfirmDiscard(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirmDiscard]);

  async function finish() {
    const t = await rec.stop();
    if (!t) return;
    if (t.durationMs < 600) {
      setNotice("That recording was too short to keep. Try again.");
      return;
    }
    setNotice(null);
    setTake(t);
  }

  function again() {
    setTake(null);
    setNotice(null);
    setConfirmDiscard(false);
    void rec.start();
  }

  function discard() {
    const hasContent = take !== null || rec.elapsedMs > 3000;
    if (hasContent && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    rec.cancel();
    onClose();
  }

  async function save() {
    if (!take) return;
    setSaving(true);
    setProgress(0);
    setNotice(null);
    try {
      const record = await createCommentary(
        {
          book: target.book,
          chapter: target.chapter,
          verseStart: target.verseStart,
          verseEnd: target.verseEnd,
          translation: target.translation,
          quote: target.quote,
          title: title.trim() || `${target.label}, ${formatDate(Date.now())}`,
          durationMs: take.durationMs,
          peaks: take.peaks,
        },
        take.blob,
        setProgress,
      );
      onSaved(record);
    } catch (error) {
      // The take stays in memory, so after signing in again the person can just press Save.
      if (error instanceof ApiError && error.status === 401) {
        openAuth("Your session expired. Sign in again, then press Save. Your recording is still here.");
        setNotice("You've been signed out. Sign in to save this recording.");
      } else {
        setNotice(error instanceof Error ? error.message : "Couldn't save this recording. Try again.");
      }
      setSaving(false);
    }
  }

  const discardLabel = confirmDiscard ? "Discard for good?" : take ? "Discard" : "Cancel";

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center" initial="hidden" animate="shown" exit="hidden">
      <motion.div
        className="absolute inset-0 bg-black/55"
        variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
        aria-hidden="true"
      />
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-label={`Record commentary on ${target.label}`}
        className="relative w-full max-w-2xl rounded-t-[1.75rem] border border-b-0 border-rule bg-surface px-6 pb-8 pt-6 shadow-2xl md:mb-6 md:rounded-b-[1.75rem] md:border-b"
        variants={{ hidden: { y: "105%" }, shown: { y: 0 } }}
        transition={{ type: "spring", damping: 34, stiffness: 320 }}
      >
        <h2 className="font-serif text-2xl">{target.label}</h2>
        {target.quote && (
          <p className="mt-1 line-clamp-2 font-serif text-[0.95rem] italic text-muted">{target.quote}</p>
        )}

        <div className="mt-6">
          <AnimatePresence mode="wait" initial={false}>
            {take ? (
              <motion.div key="review" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                <div className="rounded-2xl border border-rule bg-page/60 p-4">
                  <Player source={take.blob} durationMs={take.durationMs} peaks={take.peaks} />
                </div>
                <label className="block">
                  <span className="text-sm text-muted">Title (optional)</span>
                  <input
                    value={title}
                    maxLength={120}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={`${target.label}, ${formatDate(Date.now())}`}
                    className="mt-1.5 w-full rounded-xl border border-rule bg-page px-3.5 py-2.5 font-serif text-lg placeholder:text-muted/70"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={save} disabled={saving} className="btn btn-gilt">
                    {saving ? `Uploading ${Math.round(progress * 100)}%` : "Save commentary"}
                  </button>
                  <button type="button" onClick={again} disabled={saving} className="btn btn-line">
                    <MicIcon /> Record again
                  </button>
                  <button
                    type="button"
                    onClick={discard}
                    disabled={saving}
                    className={`ml-auto rounded-full px-3 py-2 text-sm ${confirmDiscard ? "bg-rubric text-white" : "text-muted hover:text-body"}`}
                  >
                    {discardLabel}
                  </button>
                </div>
              </motion.div>
            ) : rec.status === "error" ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                <p role="alert" className="rounded-xl border border-rubric/50 bg-rubric/10 p-4 text-[0.95rem]">
                  {rec.error}
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={again} className="btn btn-gilt">
                    Try again
                  </button>
                  <button type="button" onClick={() => { rec.cancel(); onClose(); }} className="btn btn-line">
                    Close
                  </button>
                </div>
              </motion.div>
            ) : live ? (
              <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {rec.status === "requesting" ? (
                  <p className="py-10 text-center text-muted" role="status">
                    Waiting for microphone permission. Choose Allow in your browser's prompt.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-muted" role="status">
                        <motion.span
                          className="h-2.5 w-2.5 rounded-full bg-rubric"
                          animate={rec.status === "recording" ? { opacity: [1, 0.25, 1], scale: [1, 0.8, 1] } : { opacity: 0.4, scale: 1 }}
                          transition={rec.status === "recording" ? { duration: 1.4, repeat: Infinity } : { duration: 0.2 }}
                        />
                        {rec.status === "recording" ? "Recording" : "Paused"}
                      </span>
                      <span className="font-serif text-4xl tabular-nums" aria-live="off">
                        {formatDuration(rec.elapsedMs)}
                      </span>
                    </div>
                    <LiveWaveform samples={rec.samples} className="h-24" />
                    <div className="flex items-center justify-center gap-5">
                      <button
                        type="button"
                        onClick={rec.status === "recording" ? rec.pause : rec.resume}
                        aria-label={rec.status === "recording" ? "Pause recording" : "Resume recording"}
                        className="flex h-12 w-12 items-center justify-center rounded-full border border-rule hover:bg-wash"
                      >
                        {rec.status === "recording" ? <PauseIcon /> : <PlayIcon className="translate-x-[1px]" />}
                      </button>
                      <button type="button" onClick={finish} className="btn btn-rubric h-14 px-7 text-base">
                        <StopIcon /> Stop
                      </button>
                      <button
                        type="button"
                        onClick={discard}
                        className={`w-32 rounded-full px-3 py-2 text-sm ${confirmDiscard ? "bg-rubric text-white" : "text-muted hover:text-body"}`}
                      >
                        {discardLabel}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                {notice ? (
                  <p role="alert" className="rounded-xl border border-rule bg-page/60 p-4 text-[0.95rem]">
                    {notice}
                  </p>
                ) : (
                  <Waveform peaks={[]} bars={40} className="h-16 opacity-60" />
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={again} className="btn btn-rubric">
                    <MicIcon /> Start recording
                  </button>
                  <button type="button" onClick={() => { rec.cancel(); onClose(); }} className="btn btn-line">
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {take && notice && (
            <p role="alert" className="mt-4 text-sm text-rubric">
              {notice}
            </p>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
