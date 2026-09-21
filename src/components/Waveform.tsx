"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type RefObject } from "react";
import { resample } from "@/lib/audio";

interface WaveformProps {
  peaks: number[];
  /** 0..1. Bars up to this point are drawn in gold. */
  progress?: number;
  /** Resample to this many bars (used for the small margin chips). */
  bars?: number;
  className?: string;
  /** When provided, the waveform becomes a seek slider. */
  onSeek?: (fraction: number) => void;
}

/** A saved recording's shape, drawn from stored peaks. */
export function Waveform({ peaks, progress = 0, bars, className = "", onSeek }: WaveformProps) {
  const values = bars ? resample(peaks, bars) : peaks;

  const fraction = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  };

  const interactive = onSeek
    ? {
        role: "slider" as const,
        tabIndex: 0,
        "aria-label": "Playback position",
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(progress * 100),
        onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onSeek(fraction(e));
        },
        onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
          if (e.buttons === 1) onSeek(fraction(e));
        },
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.05));
          if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.05));
        },
      }
    : { role: "img" as const, "aria-label": "Waveform of the recording" };

  return (
    <div className={`flex items-center gap-[2px] ${onSeek ? "cursor-pointer touch-none" : ""} ${className}`} {...interactive}>
      {values.map((v, i) => (
        <span
          key={i}
          className="min-w-[2px] flex-1 rounded-full transition-colors duration-100"
          style={{
            height: `${Math.max(10, v * 100)}%`,
            backgroundColor: (i + 0.5) / values.length <= progress ? "var(--gilt)" : "var(--wave-idle)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * The live "ink" line while recording. Newest sound is at the right edge and older
 * bars fade toward the left. Reads levels from a ref so React never re-renders per frame.
 */
export function LiveWaveform({ samples, className = "" }: { samples: RefObject<number[]>; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const style = getComputedStyle(canvas);
    const gilt = style.getPropertyValue("--gilt").trim() || "#dcb45f";
    const idle = style.getPropertyValue("--wave-idle").trim() || "rgba(255,255,255,.28)";
    let raf = 0;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const barW = 3;
      const gap = 4;
      const n = Math.max(1, Math.floor(w / (barW + gap)));
      const data = samples.current ?? [];

      for (let i = 0; i < n; i++) {
        const idx = data.length - n + i;
        const x = i * (barW + gap) + (w - n * (barW + gap) + gap) / 2;
        if (idx < 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = idle;
          ctx.fillRect(x, h / 2 - 1, barW, 2);
          continue;
        }
        const amp = data[idx];
        const barH = Math.max(3, amp * h * 0.92);
        ctx.globalAlpha = 0.2 + 0.8 * (i / n);
        ctx.fillStyle = gilt;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, (h - barH) / 2, barW, barH, 1.5);
          ctx.fill();
        } else {
          ctx.fillRect(x, (h - barH) / 2, barW, barH);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [samples]);

  return <canvas ref={canvasRef} className={`block w-full ${className}`} aria-hidden="true" />;
}
