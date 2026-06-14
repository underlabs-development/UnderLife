"use client";

import Image from "next/image";
import { useUserProfileStore } from "@/features/user-profile/stores/user-profile-store";
import { UserAvatar } from "@/components/user-avatar";

/* i18n-ready: centralized labels */
const LABELS = {
  tagline: "Select your application",
  logoAlt: "UnderOS Logo",
};

export function LauncherHeader() {
  const { user, openSettings } = useUserProfileStore();
  const displayLine = user.username ? `@${user.username}` : [user.firstName, user.lastName].filter(Boolean).join(" ") || user.displayName || user.email.split("@")[0];

  const handleOpenSettings = () => {
    openSettings();
  };

  return (
    <header
      id="launcher-header"
      className="relative flex w-full flex-col items-center gap-6 px-6 pt-12 pb-8"
      style={{ animation: "fadeIn 0.8s ease-out both" }}
    >
      {/* Profile button — top right */}
      <button
        id="profile-button"
        type="button"
        onClick={handleOpenSettings}
        className="absolute top-6 right-6 z-10 flex items-center gap-3 rounded-xl border border-[rgba(0,255,170,0.1)] bg-[rgba(12,12,20,0.8)] px-4 py-2.5 font-mono text-sm text-[var(--text-secondary)] backdrop-blur-sm transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] hover:shadow-[0_0_16px_rgba(0,255,170,0.12)] cursor-pointer"
      >
        <UserAvatar seed={user.id} size={28} />
        <span className="hidden sm:inline">{displayLine}</span>
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 opacity-60"
          aria-hidden="true"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: '<path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" stroke-width="1.5" fill="none" stroke="currentColor"/><path d="M19.14 12.94C19.18 12.63 19.2 12.32 19.2 12C19.2 11.68 19.18 11.37 19.14 11.06L21.16 9.48C21.34 9.34 21.39 9.07 21.28 8.87L19.36 5.55C19.24 5.33 18.99 5.26 18.77 5.33L16.38 6.29C15.88 5.91 15.35 5.59 14.76 5.35L14.4 2.81C14.36 2.57 14.16 2.4 13.92 2.4H10.08C9.84 2.4 9.64 2.57 9.6 2.81L9.24 5.35C8.65 5.59 8.12 5.92 7.62 6.29L5.23 5.33C5.01 5.25 4.76 5.33 4.64 5.55L2.72 8.87C2.6 9.08 2.66 9.34 2.84 9.48L4.86 11.06C4.82 11.37 4.8 11.69 4.8 12C4.8 12.31 4.82 12.63 4.86 12.94L2.84 14.52C2.66 14.66 2.61 14.93 2.72 15.13L4.64 17.45C4.76 17.67 5.01 17.74 5.23 17.67L7.62 16.71C8.12 17.09 8.65 17.41 9.24 17.65L9.6 20.19C9.64 20.43 9.84 20.6 10.08 20.6H13.92C14.16 20.6 14.36 20.43 14.4 20.19L14.76 17.65C15.35 17.41 15.88 17.09 16.38 16.71L18.77 17.67C18.99 17.75 19.24 17.67 19.36 17.45L21.28 15.13C21.39 14.91 21.34 14.66 21.16 14.52L19.14 12.94Z" stroke-width="1.5" fill="none" stroke="currentColor"/>' }}
        />
      </button>

      {/* Logo */}
      <div
        className="relative"
        style={{ animation: "logoPulse 4s ease-in-out infinite" }}
      >
        <Image
          src="/under-os-logo.png"
          alt={LABELS.logoAlt}
          width={180}
          height={180}
          priority
          className="relative z-10"
          suppressHydrationWarning
        />
        {/* Logo background glow */}
        <div
          className="absolute inset-0 -m-4 rounded-full opacity-30 blur-3xl"
          style={{
            background: "radial-gradient(circle, rgba(0,255,170,0.4) 0%, transparent 70%)",
          }}
          suppressHydrationWarning
        />
      </div>

      {/* Tagline */}
      <p
        className="font-mono text-base tracking-widest text-[var(--text-secondary)] uppercase"
        style={{ animation: "fadeIn 1s ease-out 0.4s both" }}
      >
        <span className="text-[var(--neon-primary)] opacity-70">{">"}</span>
        {" "}
        {LABELS.tagline}
        <span
          className="ml-1 inline-block h-4 w-0.5 bg-[var(--neon-primary)] align-middle opacity-80"
          style={{ animation: "neonPulse 1.2s ease-in-out infinite" }}
        />
      </p>

      {/* Decorative horizontal line */}
      <div
        className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-[rgba(0,255,170,0.2)] to-transparent"
      />
    </header>
  );
}
