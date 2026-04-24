"use client";

import { useUserProfileStore } from "@/features/user-profile/stores/user-profile-store";

const LABELS = {
  title: "Settings",
  profile: "Profile",
  username: "Username",
  email: "Email",
  preferences: "Preferences",
  theme: "Theme",
  language: "Language",
  notifications: "Notifications",
  logout: "Logout",
  close: "Close",
};

export function UserSettingsPanel() {
  const { user, isSettingsOpen, closeSettings } = useUserProfileStore();
  const { displayName, username, email, preferences } = user;

  const handleClose = () => {
    closeSettings();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeSettings();
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div
      id="settings-backdrop"
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
      style={{ animation: "backdropFadeIn 0.3s ease-out both" }}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-[rgba(6,6,12,0.7)] backdrop-blur-sm" />

      {/* Panel */}
      <aside
        id="settings-panel"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[rgba(0,255,170,0.1)] bg-[rgba(12,12,20,0.95)] backdrop-blur-md"
        style={{ animation: "slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(0,255,170,0.08)] p-6">
          <h2 className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--neon-primary)] opacity-70">{">"}</span>
            {" "}{LABELS.title}
          </h2>
          <button
            id="close-settings"
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(0,255,170,0.1)] text-[var(--text-muted)] transition-all duration-200 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] cursor-pointer"
            aria-label={LABELS.close}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Avatar + Name */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[rgba(0,255,170,0.2)] bg-gradient-to-br from-[rgba(0,255,170,0.1)] to-transparent font-mono text-2xl font-bold text-[var(--neon-primary)] shadow-[0_0_20px_rgba(0,255,170,0.15)]"
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            <h3 className="font-mono text-xl font-semibold text-[var(--text-primary)]">
              {displayName}
            </h3>
            <span className="font-mono text-sm text-[var(--text-muted)]">
              @{username}
            </span>
          </div>

          {/* Profile Section */}
          <div className="mb-6">
            <h4 className="mb-3 font-mono text-xs font-semibold tracking-widest text-[var(--neon-primary)] uppercase opacity-70">
              {LABELS.profile}
            </h4>
            <div className="space-y-3">
              <SettingsRow label={LABELS.username} value={`@${username}`} />
              <SettingsRow label={LABELS.email} value={email} />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="mb-6">
            <h4 className="mb-3 font-mono text-xs font-semibold tracking-widest text-[var(--neon-primary)] uppercase opacity-70">
              {LABELS.preferences}
            </h4>
            <div className="space-y-3">
              <SettingsRow label={LABELS.theme} value={preferences.theme} />
              <SettingsRow label={LABELS.language} value={preferences.language} />
              <SettingsRow
                label={LABELS.notifications}
                value={preferences.notifications ? "On" : "Off"}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(0,255,170,0.08)] p-6">
          <button
            id="logout-button"
            type="button"
            className="w-full rounded-xl border border-[rgba(255,0,170,0.2)] bg-[rgba(255,0,170,0.05)] py-3 font-mono text-sm text-[var(--neon-magenta)] transition-all duration-300 hover:border-[rgba(255,0,170,0.5)] hover:bg-[rgba(255,0,170,0.1)] hover:shadow-[0_0_20px_rgba(255,0,170,0.15)] cursor-pointer"
          >
            {LABELS.logout}
          </button>
        </div>
      </aside>
    </div>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border border-[rgba(0,255,170,0.06)] bg-[var(--bg-card)] px-4 py-3"
    >
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
