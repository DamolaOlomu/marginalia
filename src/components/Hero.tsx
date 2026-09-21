"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { usePrefs } from "@/hooks/usePrefs";
import { BOOKS } from "@/lib/books";

/**
 * A single line of "voice": flat, then a burst, then trailing off into the margin.
 * Deterministic (no Math.random) so server and client render identical markup.
 */
const INK = (() => {
  const points = 200;
  const parts: string[] = [];
  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const burst = Math.exp(-Math.pow((t - 0.36) / 0.2, 2));
    const tail = Math.exp(-Math.pow((t - 0.62) / 0.1, 2)) * 0.45;
    const env = burst + tail;
    const y = 50 + Math.sin(i * 0.85) * 27 * env * (0.65 + 0.35 * Math.sin(i * 0.21)) + Math.sin(i * 2.3) * 5 * env;
    parts.push(`${i === 0 ? "M" : "L"}${(t * 1000).toFixed(1)} ${y.toFixed(1)}`);
  }
  return parts.join(" ");
})();

export function Hero() {
  const { prefs, ready } = usePrefs();
  const last = ready ? prefs.last : null;
  const book = last ? BOOKS[last.book - 1] : BOOKS[42]; // John
  const chapter = last ? last.chapter : 1;

  return (
    <section className="mx-auto max-w-5xl px-6 pb-12 pt-14 md:pt-20">
      <h1 className="max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
        Read the passage. Say what you see in it.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
        Marginalia keeps each spoken comment beside the verse it belongs to, so your own voice becomes part of the margin.
      </p>

      <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="mt-10 h-24 w-full overflow-visible" aria-hidden="true">
        <motion.path
          d={INK}
          fill="none"
          stroke="var(--gilt)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.6, ease: [0.45, 0, 0.2, 1] }}
        />
        <motion.circle
          cx="1000"
          cy="50"
          r="4"
          fill="var(--gilt)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.4, type: "spring", stiffness: 400, damping: 14 }}
          style={{ transformOrigin: "1000px 50px", transformBox: "fill-box" }}
        />
      </svg>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/read/${book.slug}/${chapter}`} className="btn btn-gilt">
          {last ? `Continue in ${book.name} ${chapter}` : `Start in ${book.name} ${chapter}`}
        </Link>
        <Link href="/library" className="btn btn-line">
          Open your library
        </Link>
      </div>
    </section>
  );
}
