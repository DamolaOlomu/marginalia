"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { useChapter } from "@/hooks/useChapter";
import { useCommentaries } from "@/hooks/useCommentaries";
import { usePrefs } from "@/hooks/usePrefs";
import { useRecorder } from "@/hooks/useRecorder";
import { speechLang, useSpeech } from "@/hooks/useSpeech";
import { useTranslations } from "@/hooks/useTranslations";
import { BOOKS, neighbors } from "@/lib/books";
import { referenceLabel } from "@/lib/format";
import type { CommentaryRecord, RecordTarget, Token } from "@/lib/types";
import { CommentaryCard } from "./CommentaryCard";
import { Dock } from "./Dock";
import { ChevronLeftIcon, ChevronRightIcon, SpeakerIcon } from "./icons";
import { LexiconDrawer } from "./LexiconDrawer";
import { ListenPlayer } from "./ListenPlayer";
import { MarginChip } from "./MarginChip";
import { RecorderSheet } from "./RecorderSheet";
import { TranslationSelect } from "./TranslationSelect";
import { VerseRow } from "./VerseRow";

const SCALES = [0.9, 1, 1.12, 1.28, 1.45];
const NONE: CommentaryRecord[] = [];
/** Set when a chapter finishes so the next chapter picks up reading aloud where this one left off. */
const RESUME_KEY = "marginalia:listen-resume";

function Skeleton() {
  return (
    <div className="mx-auto max-w-[52rem] px-6 pt-10" role="status" aria-label="Loading">
      <div className="h-24 w-64 animate-pulse rounded-xl bg-wash" />
      <div className="mt-10 space-y-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-wash" style={{ width: `${88 - (i % 3) * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Waits for saved preferences so the first request uses the right translation. */
export function Reader(props: { bookId: number; chapter: number }) {
  const { ready } = usePrefs();
  return ready ? <ReaderInner {...props} /> : <Skeleton />;
}

function ReaderInner({ bookId, chapter }: { bookId: number; chapter: number }) {
  const book = BOOKS[bookId - 1];
  const router = useRouter();
  const { prefs, update } = usePrefs();
  const translations = useTranslations();
  const { state, retry } = useChapter(prefs.translation, bookId, chapter);
  const { records } = useCommentaries(bookId, chapter);
  const rec = useRecorder();
  const { user, openAuth } = useAuth();

  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [target, setTarget] = useState<RecordTarget | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lexicon, setLexicon] = useState<{ query: string; alts: string[] } | null>(null);
  const hashHandled = useRef(false);

  const info = translations.find((t) => t.id === prefs.translation);
  const { prev, next } = neighbors(bookId, chapter);
  const scaleIndex = Math.max(0, SCALES.indexOf(prefs.fontScale));
  const hasStrongs = state.status === "ready" && state.data.hasStrongs;

  const { ready: activityReady, logRead } = useActivity();
  const [listenOpen, setListenOpen] = useState(false);
  const resumeHandled = useRef(false);

  const texts = useMemo(() => (state.status === "ready" ? state.data.verses.map((v) => v.text) : []), [state]);
  const speech = useSpeech({
    texts,
    lang: speechLang(info?.language),
    rate: prefs.listenRate,
    voiceURI: prefs.voiceURI,
    onFinished: handleFinished,
  });
  const spokenVerse = state.status === "ready" ? state.data.verses[speech.index]?.n : undefined;

  function handleFinished() {
    if (!prefs.autoAdvance || !next) return;
    try {
      sessionStorage.setItem(RESUME_KEY, "1");
    } catch {
      /* private mode: the next chapter just won't auto-play */
    }
    router.push(`/read/${next.book.slug}/${next.chapter}`);
  }

  useEffect(() => {
    update({ last: { book: bookId, chapter } });
  }, [bookId, chapter, update]);

  // Count today as a reading day once a chapter has actually loaded.
  useEffect(() => {
    if (state.status === "ready" && user && activityReady) logRead();
  }, [state.status, user, activityReady, logRead]);

  // Arrived here by "continue into the next chapter": open the player and keep reading aloud.
  useEffect(() => {
    if (resumeHandled.current || state.status !== "ready" || !speech.supported) return;
    resumeHandled.current = true;
    try {
      if (sessionStorage.getItem(RESUME_KEY) === "1") {
        sessionStorage.removeItem(RESUME_KEY);
        setListenOpen(true);
        speech.play();
      }
    } catch {
      /* ignore */
    }
  }, [state.status, speech]);

  // Follow along: keep the verse being read in view.
  useEffect(() => {
    if (!listenOpen || !speech.playing || spokenVerse == null) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`v${spokenVerse}`)?.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
  }, [spokenVerse, listenOpen, speech.playing]);

  // Deep links like /read/john/3#v16 select and scroll to the verse.
  useEffect(() => {
    if (state.status !== "ready" || hashHandled.current) return;
    hashHandled.current = true;
    const m = window.location.hash.match(/^#v(\d+)$/);
    if (!m) return;
    const n = Number(m[1]);
    setSelection({ start: n, end: n });
    const t = window.setTimeout(() => document.getElementById(`v${n}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 400);
    return () => window.clearTimeout(t);
  }, [state.status]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        setSelection(null);
        setLexicon(null);
        return;
      }
      if (target || lexicon) return;
      if (e.key === "ArrowLeft" && prev) router.push(`/read/${prev.book.slug}/${prev.chapter}`);
      if (e.key === "ArrowRight" && next) router.push(`/read/${next.book.slug}/${next.chapter}`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router, target, lexicon]);

  const { byStart, chapterLevel, covered } = useMemo(() => {
    const byStart = new Map<number, CommentaryRecord[]>();
    const chapterLevel: CommentaryRecord[] = [];
    const covered = new Set<number>();
    for (const r of records) {
      if (r.verseStart == null) {
        chapterLevel.push(r);
        continue;
      }
      byStart.set(r.verseStart, [...(byStart.get(r.verseStart) ?? []), r]);
      for (let v = r.verseStart; v <= (r.verseEnd ?? r.verseStart); v++) covered.add(v);
    }
    return { byStart, chapterLevel, covered };
  }, [records]);

  const toggleVerse = useCallback((n: number) => {
    setSelection((sel) => {
      if (!sel) return { start: n, end: n };
      if (n >= sel.start && n <= sel.end) return sel.start === sel.end ? null : { start: n, end: n };
      return { start: Math.min(sel.start, n), end: Math.max(sel.end, n) };
    });
  }, []);
  const toggleCommentary = useCallback((id: string) => setOpenId((cur) => (cur === id ? null : id)), []);
  const openWord = useCallback((t: Token) => {
    if (t.s?.length) setLexicon({ query: t.s[0], alts: t.s });
  }, []);
  const closeOpen = useCallback(() => setOpenId(null), []);

  const dockLabel = selection
    ? referenceLabel(book.name, chapter, selection.start, selection.end)
    : `${book.name} ${chapter}, whole chapter`;

  function beginRecording(explicit?: { start: number; end: number } | null) {
    if (state.status !== "ready") return;
    if (!user) {
      openAuth("Sign in to record. Your commentaries are saved to your account, so they follow you to any device.");
      return;
    }
    const verses = state.data.verses;
    const chosen = explicit === undefined ? selection : explicit;
    const vs = chosen?.start ?? null;
    const ve = chosen?.end ?? null;
    const picked = vs == null ? verses.slice(0, 3) : verses.filter((v) => v.n >= vs && v.n <= (ve ?? vs));
    const quote = picked.map((v) => v.text).join(" ").slice(0, 320);

    setTarget({
      book: bookId,
      chapter,
      verseStart: vs,
      verseEnd: ve,
      label: referenceLabel(book.name, chapter, vs, ve),
      quote,
      translation: prefs.translation,
    });
    void rec.start(); // called inside the click so browsers treat the mic and audio context as user-initiated
  }

  /** Pause reading aloud and record a thought on the verse being read. */
  function commentOnSpoken() {
    if (spokenVerse == null) return;
    speech.pause();
    const sel = { start: spokenVerse, end: spokenVerse };
    setSelection(sel);
    beginRecording(sel);
  }

  function toggleListen() {
    if (listenOpen) {
      speech.stop();
      setListenOpen(false);
    } else {
      setListenOpen(true);
    }
  }

  function closeRecorder() {
    setTarget(null);
  }

  function saved(record: CommentaryRecord) {
    setTarget(null);
    setSelection(null);
    setOpenId(record.id);
  }

  const openChapterRecord = chapterLevel.find((c) => c.id === openId) ?? null;

  return (
    <div className={`mx-auto max-w-[52rem] px-6 pt-10 ${listenOpen ? "pb-96" : "pb-48"}`}>
      <header className="flex items-end justify-between gap-6">
        <div className="flex items-baseline gap-5">
          <motion.span
            key={chapter}
            className="font-serif text-8xl leading-none text-gilt tabular-nums"
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {chapter}
          </motion.span>
          <h1 className="font-serif text-3xl md:text-4xl">{book.name}</h1>
        </div>
        <nav className="flex gap-1" aria-label="Chapter navigation">
          {prev ? (
            <Link href={`/read/${prev.book.slug}/${prev.chapter}`} className="icon-btn" aria-label={`Previous: ${prev.book.name} ${prev.chapter}`}>
              <ChevronLeftIcon />
            </Link>
          ) : null}
          {next ? (
            <Link href={`/read/${next.book.slug}/${next.chapter}`} className="icon-btn" aria-label={`Next: ${next.book.name} ${next.chapter}`}>
              <ChevronRightIcon />
            </Link>
          ) : null}
        </nav>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggleListen}
          aria-pressed={listenOpen}
          disabled={state.status !== "ready"}
          className={`btn gap-2 py-2 ${listenOpen ? "btn-gilt" : "btn-line"}`}
        >
          <SpeakerIcon className="h-[18px] w-[18px]" />
          Listen
        </button>

        <TranslationSelect value={prefs.translation} translations={translations} onChange={(id) => update({ translation: id })} />

        <button
          type="button"
          role="switch"
          aria-checked={prefs.studyMode && hasStrongs}
          disabled={!hasStrongs}
          onClick={() => update({ studyMode: !prefs.studyMode })}
          title={hasStrongs ? "Tap any underlined word to see its Greek or Hebrew" : "Choose a translation with Strong's numbers, such as KJV (Bolls)"}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            prefs.studyMode && hasStrongs ? "border-gilt text-gilt" : "border-rule text-muted hover:text-body"
          }`}
        >
          <span
            className="relative h-4 w-7 rounded-full transition-colors"
            style={{ backgroundColor: prefs.studyMode && hasStrongs ? "var(--gilt)" : "var(--wave-idle)" }}
          >
            <motion.span
              className="absolute top-0.5 h-3 w-3 rounded-full bg-page"
              animate={{ left: prefs.studyMode && hasStrongs ? 14 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </span>
          Word study
        </button>

        <div className="ml-auto flex items-center gap-1 text-sm text-muted">
          <button type="button" className="icon-btn" disabled={scaleIndex === 0} onClick={() => update({ fontScale: SCALES[scaleIndex - 1] })} aria-label="Smaller text">
            <span className="text-xs">A</span>
          </button>
          <button type="button" className="icon-btn" disabled={scaleIndex === SCALES.length - 1} onClick={() => update({ fontScale: SCALES[scaleIndex + 1] })} aria-label="Larger text">
            <span className="text-lg">A</span>
          </button>
        </div>
      </div>

      {chapterLevel.length > 0 && (
        <section aria-label="Commentary on the whole chapter" className="mt-8">
          <p className="mb-2 text-sm text-muted">On the whole chapter</p>
          <div className="flex flex-wrap gap-2">
            {chapterLevel.map((c) => (
              <MarginChip key={c.id} record={c} open={c.id === openId} onToggle={() => toggleCommentary(c.id)} />
            ))}
          </div>
          <AnimatePresence initial={false}>
            {openChapterRecord && (
              <motion.div
                key={openChapterRecord.id}
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="pt-3">
                  <CommentaryCard record={openChapterRecord} onDeleted={closeOpen} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      <div className="mt-8">
        {state.status === "loading" && (
          <div className="space-y-4" role="status" aria-label="Loading chapter">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-wash" style={{ width: `${92 - (i % 4) * 11}%` }} />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <div role="alert" className="rounded-2xl border border-rule bg-surface p-6">
            <p className="font-serif text-xl">This chapter didn't load</p>
            <p className="mt-2 text-muted">{state.message}</p>
            <button type="button" onClick={retry} className="btn btn-gilt mt-5">
              Try again
            </button>
          </div>
        )}

        {state.status === "ready" &&
          state.data.verses.map((v, i) => {
            const here = byStart.get(v.n) ?? NONE;
            return (
              <VerseRow
                key={`${prefs.translation}:${v.n}`}
                verse={v}
                index={i}
                scale={prefs.fontScale}
                dir={info?.dir}
                selected={selection != null && v.n >= selection.start && v.n <= selection.end}
                covered={covered.has(v.n)}
                speaking={listenOpen && spokenVerse === v.n}
                studyMode={prefs.studyMode}
                commentaries={here}
                openId={here.some((c) => c.id === openId) ? openId : null}
                onToggleVerse={toggleVerse}
                onToggleCommentary={toggleCommentary}
                onWord={openWord}
                onDeleted={closeOpen}
              />
            );
          })}

        {state.status === "ready" && (
          <p className="mt-10 text-sm text-muted">{state.data.attribution}</p>
        )}
      </div>

      <div className="mt-12 flex items-center justify-between gap-4 border-t border-rule pt-6">
        {prev ? (
          <Link href={`/read/${prev.book.slug}/${prev.chapter}`} className="btn btn-line">
            <ChevronLeftIcon /> {prev.book.name} {prev.chapter}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/read/${next.book.slug}/${next.chapter}`} className="btn btn-line">
            {next.book.name} {next.chapter} <ChevronRightIcon />
          </Link>
        ) : null}
      </div>

      <AnimatePresence>
        {!target && !listenOpen && state.status === "ready" && (
          <Dock label={dockLabel} hasSelection={selection != null} onClear={() => setSelection(null)} onRecord={() => beginRecording()} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {listenOpen && state.status === "ready" && (
          <ListenPlayer
            key="listen"
            title={`${book.name} ${chapter}`}
            verseNumber={spokenVerse}
            rate={prefs.listenRate}
            speech={speech}
            autoAdvance={prefs.autoAdvance}
            onAutoAdvance={(on) => update({ autoAdvance: on })}
            onRate={(r) => update({ listenRate: r })}
            onVoice={(uri) => update({ voiceURI: uri })}
            onComment={commentOnSpoken}
            onClose={toggleListen}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {target && <RecorderSheet key="recorder" target={target} rec={rec} onClose={closeRecorder} onSaved={saved} />}
      </AnimatePresence>

      <AnimatePresence>
        {lexicon && (
          <LexiconDrawer
            key="lexicon"
            query={lexicon.query}
            alts={lexicon.alts}
            onQuery={(q) => setLexicon((cur) => ({ query: q, alts: cur?.alts ?? [] }))}
            onClose={() => setLexicon(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
