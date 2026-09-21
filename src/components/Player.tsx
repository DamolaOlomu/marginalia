"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";
import { PauseIcon, PlayIcon } from "./icons";
import { Waveform } from "./Waveform";

const RATES = [1, 1.25, 1.5, 2];
let activeAudio: HTMLAudioElement | null = null; // only one recording plays at a time

/**
 * Chrome's MediaRecorder WebM has no duration header, so `duration` reads as Infinity until the
 * browser has seen the end of the file. Seeking far ahead forces that, then we go back to 0.
 */
function fixInfiniteDuration(a: HTMLAudioElement, done: () => void) {
  if (a.duration !== Infinity) {
    done();
    return;
  }
  const restore = () => {
    a.removeEventListener("timeupdate", restore);
    a.currentTime = 0;
    done();
  };
  a.addEventListener("timeupdate", restore);
  a.currentTime = 1e101;
}

interface PlayerProps {
  /** A Blob (a take that hasn't been saved) or a URL (a saved commentary). */
  source: Blob | string;
  durationMs: number;
  peaks: number[];
  /** Don't fetch any audio until the listener presses play or seeks. Used for long lists. */
  deferLoad?: boolean;
}

export function Player({ source, durationMs, peaks, deferLoad = false }: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wantPlay = useRef(false);
  const pendingSeek = useRef<number | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [armed, setArmed] = useState(!deferLoad);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [rate, setRate] = useState(1);
  const total = Math.max(durationMs / 1000, 0.1);

  useEffect(() => {
    if (typeof source === "string") return;
    const u = URL.createObjectURL(source);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [source]);

  const url = typeof source === "string" ? source : objectUrl;

  useEffect(
    () => () => {
      if (audioRef.current && activeAudio === audioRef.current) activeAudio = null;
    },
    [],
  );

  function begin(a: HTMLAudioElement) {
    if (activeAudio && activeAudio !== a) activeAudio.pause();
    activeAudio = a;
    a.playbackRate = rate;
    a.play().catch(() => setPlaying(false));
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (!armed) {
      wantPlay.current = true;
      setArmed(true);
      return;
    }
    if (a.paused) begin(a);
    else a.pause();
  }

  function seek(fraction: number) {
    const f = Math.min(Math.max(fraction, 0), 1);
    const a = audioRef.current;
    if (!a) return;
    if (!armed) {
      pendingSeek.current = f;
      setArmed(true);
      return;
    }
    a.currentTime = f * total;
    setTime(a.currentTime);
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  function onMetadata(a: HTMLAudioElement) {
    fixInfiniteDuration(a, () => {
      if (pendingSeek.current !== null) {
        a.currentTime = pendingSeek.current * total;
        setTime(a.currentTime);
        pendingSeek.current = null;
      }
      if (wantPlay.current) {
        wantPlay.current = false;
        begin(a);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {url && (
        <audio
          ref={audioRef}
          src={armed ? url : undefined}
          preload="metadata"
          onLoadedMetadata={(e) => onMetadata(e.currentTarget)}
          onTimeUpdate={(e) => {
            const t = e.currentTarget.currentTime;
            if (t <= total + 5) setTime(Math.min(t, total));
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={(e) => {
            setPlaying(false);
            setTime(0);
            e.currentTarget.currentTime = 0;
          }}
          onError={() => setPlaying(false)}
        />
      )}

      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pause commentary" : "Play commentary"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gilt text-gilt-ink transition-transform hover:brightness-110 active:scale-95"
      >
        {playing ? <PauseIcon /> : <PlayIcon className="translate-x-[1px]" />}
      </button>

      <Waveform peaks={peaks} progress={time / total} onSeek={seek} className="h-10 min-w-0 flex-1" />

      <span className="w-[5.5rem] shrink-0 text-right text-sm tabular-nums text-muted">
        {formatDuration(time * 1000)} / {formatDuration(durationMs)}
      </span>
      <button
        type="button"
        onClick={cycleRate}
        aria-label={`Playback speed ${rate} times. Change speed`}
        className="w-11 shrink-0 rounded-md py-1 text-sm tabular-nums text-muted hover:text-body"
      >
        {rate}×
      </button>
    </div>
  );
}
