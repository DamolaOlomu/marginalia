"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { ActivityProvider } from "@/hooks/useActivity";
import { AuthProvider } from "@/hooks/useAuth";
import { PrefsProvider } from "@/hooks/usePrefs";
import { AuthDialog } from "./AuthDialog";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <AuthProvider>
        {/* Respects the OS "reduce motion" setting for every animation in the app. */}
        <MotionConfig reducedMotion="user">
          <ActivityProvider>
            {children}
            <AuthDialog />
          </ActivityProvider>
        </MotionConfig>
      </AuthProvider>
    </PrefsProvider>
  );
}
