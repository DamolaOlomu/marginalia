"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "@/lib/api";
import { announceChange } from "@/lib/events";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the first session check finishes. */
  loading: boolean;
  signupsOpen: boolean;
  /** Set when the server itself isn't configured (missing DATABASE_URL etc.), so developers see why. */
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  dialogOpen: boolean;
  dialogReason: string | null;
  openAuth: (reason?: string) => void;
  closeAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupsOpen, setSignupsOpen] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogReason, setDialogReason] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then((s) => {
        if (!alive) return;
        setUser(s.user);
        setSignupsOpen(s.signupsOpen);
      })
      .catch((e: unknown) => {
        if (alive && e instanceof api.ApiError && e.status === 500) setConfigError(e.message);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user } = await api.login(email, password);
    setUser(user);
    setDialogOpen(false);
    announceChange();
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { user } = await api.register(email, password, name);
    setUser(user);
    setDialogOpen(false);
    announceChange();
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    announceChange();
  }, []);

  const openAuth = useCallback((reason?: string) => {
    setDialogReason(reason ?? null);
    setDialogOpen(true);
  }, []);
  const closeAuth = useCallback(() => setDialogOpen(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, signupsOpen, configError, signIn, signUp, signOut, dialogOpen, dialogReason, openAuth, closeAuth }),
    [user, loading, signupsOpen, configError, signIn, signUp, signOut, dialogOpen, dialogReason, openAuth, closeAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
