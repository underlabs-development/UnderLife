"use client";

import { AppGrid, LauncherHeader, ParticleField, APPS } from "@/features/launcher";
import { UserSettingsPanel } from "@/features/user-profile";

export default function LauncherPage() {
  return (
    <main
      id="launcher-page"
      className="relative flex min-h-screen flex-col items-center bg-[var(--bg-void)]"
    >
      <ParticleField />

      <div className="relative z-10 flex w-full flex-1 flex-col items-center">
        <LauncherHeader />
        <AppGrid apps={APPS} />
      </div>

      <UserSettingsPanel />
    </main>
  );
}
