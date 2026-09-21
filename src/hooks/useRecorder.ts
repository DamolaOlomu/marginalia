"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toPeaks } from "@/lib/audio";

export type RecorderStatus = "idle" | "requesting" | "recording" | "paused" | "error";

export interface Take {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  peaks: number[];
}

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const SAMPLE_EVERY_MS = 50;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
}

function describeError(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === "NotAllowedError" || e.name === "SecurityError")
      return "Microphone access is blocked. Allow it in your browser's site settings, then try again.";
    if (e.name === "NotFoundError" || e.name === "OverconstrainedError")
      return "No microphone was found. Connect one and try again.";
    if (e.name === "NotReadableError") return "Another app is using your microphone. Close it and try again.";
  }
  return e instanceof Error ? e.message : "Recording failed unexpectedly.";
}

/**
 * Records microphone audio with MediaRecorder and samples the input level (via an
 * AnalyserNode) every 50 ms. `samples` is a ref, not state, so a canvas can read it
 * at 60 fps without re-rendering React.
 *
 * Call `start()` directly from a click handler so Safari treats the audio context as user-initiated.
 */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);
  const starting = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const chunks = useRef<Blob[]>([]);
  const samples = useRef<number[]>([]);
  const raf = useRef(0);
  const timer = useRef<number | null>(null);
  const clock = useRef({ startedAt: 0, accumulated: 0 });
  const resolveStop = useRef<((take: Take | null) => void) | null>(null);
  const lastSample = useRef(0);
  const mime = useRef<string | undefined>(undefined);

  const elapsed = () =>
    clock.current.accumulated + (clock.current.startedAt ? performance.now() - clock.current.startedAt : 0);

  const teardown = useCallback(() => {
    cancelAnimationFrame(raf.current);
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (audioCtx.current && audioCtx.current.state !== "closed") void audioCtx.current.close();
    audioCtx.current = null;
    analyser.current = null;
    recorder.current = null;
  }, []);

  const loop = useCallback(() => {
    const node = analyser.current;
    if (!node) return;
    const buf = new Float32Array(node.fftSize);
    node.getFloatTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const level = Math.min(1, Math.pow(Math.sqrt(sum / buf.length) * 6, 0.75));

    const now = performance.now();
    if (recorder.current?.state === "recording" && now - lastSample.current >= SAMPLE_EVERY_MS) {
      lastSample.current = now;
      samples.current.push(level);
    }
    raf.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(async () => {
    if (starting.current || recorder.current) return;
    starting.current = true;
    setError(null);
    setStatus("requesting");
    setElapsedMs(0);

    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw new Error("This browser can't record audio. Use a current Chrome, Edge, Safari or Firefox on HTTPS or localhost.");
      }
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!mounted.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }

      stream.current = media;
      mime.current = pickMimeType();
      const rec = new MediaRecorder(media, mime.current ? { mimeType: mime.current } : undefined);
      chunks.current = [];
      samples.current = [];

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mime.current || "audio/webm";
        const take: Take = {
          blob: new Blob(chunks.current, { type }),
          mimeType: type,
          durationMs: Math.round(clock.current.accumulated),
          peaks: toPeaks(samples.current, 64),
        };
        teardown();
        setStatus("idle");
        resolveStop.current?.(take);
        resolveStop.current = null;
      };

      const AC =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      if (ctx.state === "suspended") void ctx.resume();
      const node = ctx.createAnalyser();
      node.fftSize = 1024;
      ctx.createMediaStreamSource(media).connect(node);
      audioCtx.current = ctx;
      analyser.current = node;

      recorder.current = rec;
      rec.start(1000); // emit a chunk every second so a crash loses at most a second
      clock.current = { startedAt: performance.now(), accumulated: 0 };
      lastSample.current = 0;
      timer.current = window.setInterval(() => setElapsedMs(Math.round(elapsed())), 200);
      raf.current = requestAnimationFrame(loop);
      setStatus("recording");
    } catch (e) {
      teardown();
      setStatus("error");
      setError(describeError(e));
    } finally {
      starting.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loop, teardown]);

  const pause = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state !== "recording") return;
    r.pause();
    clock.current.accumulated += performance.now() - clock.current.startedAt;
    clock.current.startedAt = 0;
    setElapsedMs(Math.round(clock.current.accumulated));
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const r = recorder.current;
    if (!r || r.state !== "paused") return;
    r.resume();
    clock.current.startedAt = performance.now();
    setStatus("recording");
  }, []);

  /** Stops recording and resolves with the finished take (or null if nothing was recording). */
  const stop = useCallback(
    () =>
      new Promise<Take | null>((resolve) => {
        const r = recorder.current;
        if (!r || r.state === "inactive") {
          resolve(null);
          return;
        }
        if (clock.current.startedAt) {
          clock.current.accumulated += performance.now() - clock.current.startedAt;
          clock.current.startedAt = 0;
        }
        resolveStop.current = resolve;
        r.stop();
      }),
    [],
  );

  /** Throws the current recording away and releases the microphone. */
  const cancel = useCallback(() => {
    const r = recorder.current;
    if (r) {
      r.onstop = null;
      if (r.state !== "inactive") {
        try {
          r.stop();
        } catch {
          /* already stopped */
        }
      }
    }
    resolveStop.current = null;
    teardown();
    clock.current = { startedAt: 0, accumulated: 0 };
    samples.current = [];
    chunks.current = [];
    setElapsedMs(0);
    setError(null);
    setStatus("idle");
  }, [teardown]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current) recorder.current.onstop = null;
      teardown();
    };
  }, [teardown]);

  return { status, elapsedMs, error, samples, start, pause, resume, stop, cancel };
}

export type RecorderApi = ReturnType<typeof useRecorder>;
