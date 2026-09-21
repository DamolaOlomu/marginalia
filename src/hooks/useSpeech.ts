"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LANGS: Record<string, string> = {
  english: "en", spanish: "es", french: "fr", german: "de", portuguese: "pt", italian: "it", russian: "ru",
  chinese: "zh", korean: "ko", japanese: "ja", arabic: "ar", hebrew: "he", greek: "el", latin: "la",
  dutch: "nl", polish: "pl", ukrainian: "uk", swedish: "sv", finnish: "fi", hindi: "hi", indonesian: "id",
  turkish: "tr", vietnamese: "vi", thai: "th",
};

/** "English" or "Hebrew עברית" → "en" / "he", so we can offer voices that match the translation. */
export function speechLang(language: string | undefined): string | undefined {
  const first = language?.trim().split(/[\s/]/)[0]?.toLowerCase();
  return first ? LANGS[first] : undefined;
}

interface Options {
  /** One entry per verse, in reading order. */
  texts: string[];
  lang?: string;
  rate: number;
  voiceURI: string | null;
  /** Called when the last verse has been read. */
  onFinished?: () => void;
}

/**
 * Reads a chapter aloud with the browser's built-in voices, one verse at a time.
 *
 * Verse-sized pieces (instead of one long utterance) keep browsers from cutting speech off, make
 * skipping and seeking instant, and give us a reliable "now reading verse N" to highlight.
 * Pause is implemented as stop-and-remember, because pause/resume is unreliable across browsers,
 * so resuming restarts the current verse.
 */
export function useSpeech({ texts, lang, rate, voiceURI, onFinished }: Options) {
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesChecked, setVoicesChecked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);

  const run = useRef(0); // bumped on every start/stop so late events from old utterances are ignored
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null); // held so Chrome doesn't garbage-collect it mid-speech
  const onFinishedRef = useRef(onFinished);
  const speakAtRef = useRef<(i: number) => void>(() => undefined);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setVoicesChecked(true);
      return;
    }
    setSupported(true);
    const synth = window.speechSynthesis;
    const load = () => {
      const list = synth.getVoices();
      if (list.length) {
        setVoices(list);
        setVoicesChecked(true);
      }
    };
    load();
    synth.addEventListener("voiceschanged", load);
    const timer = window.setTimeout(() => setVoicesChecked(true), 1500);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.clearTimeout(timer);
      synth.cancel();
    };
  }, []);

  const usable = useMemo(() => {
    const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-");
    const matching = lang ? voices.filter((v) => norm(v).startsWith(lang)) : voices;
    return (matching.length ? matching : voices)
      .slice()
      .sort((a, b) => Number(b.localService) - Number(a.localService) || a.name.localeCompare(b.name));
  }, [voices, lang]);

  const voice = usable.find((v) => v.voiceURI === voiceURI) ?? usable.find((v) => v.default) ?? usable[0] ?? null;

  const speakAt = useCallback(
    (i: number) => {
      if (!("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      const id = ++run.current;
      synth.cancel();

      if (i >= texts.length) {
        playingRef.current = false;
        setPlaying(false);
        indexRef.current = 0;
        setIndex(0);
        onFinishedRef.current?.();
        return;
      }

      indexRef.current = i;
      setIndex(i);
      playingRef.current = true;
      setPlaying(true);

      const u = new SpeechSynthesisUtterance(texts[i]);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else if (lang) {
        u.lang = lang;
      }
      u.rate = rate;
      u.onend = () => {
        if (run.current === id) speakAtRef.current(i + 1);
      };
      u.onerror = (e) => {
        if (run.current !== id || e.error === "interrupted" || e.error === "canceled") return;
        playingRef.current = false;
        setPlaying(false);
      };
      utterance.current = u;
      // Chrome can drop an utterance queued in the same tick as cancel(), so wait a moment.
      window.setTimeout(() => {
        if (run.current === id) synth.speak(u);
      }, 30);
    },
    [texts, voice, rate, lang],
  );

  useEffect(() => {
    speakAtRef.current = speakAt;
  }, [speakAt]);

  // A new chapter or translation: stop and go back to the first verse.
  useEffect(() => {
    run.current++;
    window.speechSynthesis?.cancel();
    playingRef.current = false;
    setPlaying(false);
    indexRef.current = 0;
    setIndex(0);
  }, [texts]);

  // Changing speed or voice mid-verse takes effect straight away.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (playingRef.current) speakAt(indexRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate, voice?.voiceURI]);

  const play = useCallback(() => {
    if (texts.length === 0) return;
    speakAt(indexRef.current >= texts.length ? 0 : indexRef.current);
  }, [speakAt, texts.length]);

  const pause = useCallback(() => {
    run.current++;
    window.speechSynthesis?.cancel();
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [pause, play]);

  const seek = useCallback(
    (i: number) => {
      const clamped = Math.max(0, Math.min(texts.length - 1, i));
      indexRef.current = clamped;
      setIndex(clamped);
      if (playingRef.current) speakAt(clamped);
    },
    [speakAt, texts.length],
  );

  const next = useCallback(() => {
    if (indexRef.current < texts.length - 1) seek(indexRef.current + 1);
  }, [seek, texts.length]);

  const prev = useCallback(() => {
    if (indexRef.current > 0) seek(indexRef.current - 1);
  }, [seek]);

  const stop = useCallback(() => {
    pause();
    indexRef.current = 0;
    setIndex(0);
  }, [pause]);

  return {
    supported,
    voices: usable,
    voice,
    voicesChecked,
    playing,
    index,
    count: texts.length,
    play,
    pause,
    toggle,
    seek,
    next,
    prev,
    stop,
  };
}

export type SpeechApi = ReturnType<typeof useSpeech>;
