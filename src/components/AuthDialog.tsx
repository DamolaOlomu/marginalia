"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { CloseIcon } from "./icons";

export function AuthDialog() {
  const { dialogOpen, dialogReason, closeAuth, signIn, signUp, signupsOpen, configError } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeAuth();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, closeAuth]);

  useEffect(() => {
    if (!signupsOpen) setMode("in");
  }, [signupsOpen]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(email, password);
      else await signUp(email, password, name || undefined);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const tab = (value: "in" | "up", label: string) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setError(null);
      }}
      aria-pressed={mode === value}
      className={`flex-1 rounded-full px-4 py-2 text-sm transition-colors ${mode === value ? "bg-wash text-body" : "text-muted hover:text-body"}`}
    >
      {label}
    </button>
  );

  const field = "mt-1.5 w-full rounded-xl border border-rule bg-page px-3.5 py-2.5";

  return (
    <AnimatePresence>
      {dialogOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/55" onClick={closeAuth} aria-hidden="true" />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={mode === "in" ? "Sign in" : "Create account"}
            className="relative w-full max-w-sm rounded-3xl border border-rule bg-surface p-6 shadow-2xl"
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <button type="button" onClick={closeAuth} className="icon-btn absolute right-3 top-3" aria-label="Close">
              <CloseIcon />
            </button>

            <h2 className="font-serif text-2xl">{mode === "in" ? "Welcome back" : "Create your account"}</h2>
            {dialogReason && <p className="mt-2 text-[0.95rem] text-muted">{dialogReason}</p>}

            {signupsOpen && (
              <div className="mt-5 flex gap-1 rounded-full border border-rule p-1">
                {tab("in", "Sign in")}
                {tab("up", "Create account")}
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === "up" && (
                <label className="block text-sm text-muted">
                  Name (optional)
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} className={field} />
                </label>
              )}
              <label className="block text-sm text-muted">
                Email
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className={field}
                />
              </label>
              <label className="block text-sm text-muted">
                Password {mode === "up" && <span>(at least 10 characters)</span>}
                <input
                  type="password"
                  required
                  minLength={mode === "up" ? 10 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  className={field}
                />
              </label>

              {(error || configError) && (
                <p role="alert" className="rounded-xl border border-rubric/50 bg-rubric/10 p-3 text-sm">
                  {error ?? configError}
                </p>
              )}

              <button type="submit" disabled={busy} className="btn btn-gilt w-full">
                {busy ? "One moment…" : mode === "in" ? "Sign in" : "Create account"}
              </button>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
