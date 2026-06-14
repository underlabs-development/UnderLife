"use client";

import { useState, useTransition } from "react";
import { useUserProfileStore } from "@/features/user-profile/stores/user-profile-store";
import { updateProfile } from "@/features/user-profile/actions/update-profile";
import { logout } from "@/features/auth";
import { UserAvatar } from "@/components/user-avatar";

function formatLastLogin(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserSettingsPanel() {
  const { user, isSettingsOpen, closeSettings, updateProfile: updateStore } = useUserProfileStore();
  const { firstName, lastName, username, email, lastLogin, preferences } = user;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName, lastName, username: username ?? "" });
  const [saveError, setSaveError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleEdit = () => {
    setForm({ firstName, lastName, username: username ?? "" });
    setSaveError("");
    setEditing(true);
  };

  const handleCancel = () => {
    setSaveError("");
    setEditing(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username || undefined,
      });
      if ("error" in result) {
        setSaveError(result.error);
      } else {
        updateStore({
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          username: result.user.username,
          displayName: result.user.display_name,
          lastLogin: result.user.last_login,
        });
        setSaveError("");
        setEditing(false);
      }
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) closeSettings();
  };

  if (!isSettingsOpen) return null;

  const displayLine = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
      style={{ animation: "backdropFadeIn 0.3s ease-out both" }}
    >
      <div className="absolute inset-0 bg-[rgba(6,6,12,0.7)] backdrop-blur-sm" />

      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[rgba(0,255,170,0.1)] bg-[rgba(12,12,20,0.95)] backdrop-blur-md"
        style={{ animation: "slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(0,255,170,0.08)] p-6">
          <h2 className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--neon-primary)] opacity-70">{">"}</span>{" "}Settings
          </h2>
          <button
            type="button"
            onClick={closeSettings}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(0,255,170,0.1)] text-[var(--text-muted)] transition-all duration-200 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] cursor-pointer"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Avatar + identity */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <UserAvatar seed={user.id} size={80} />
            <h3 className="font-mono text-xl font-semibold text-[var(--text-primary)]">
              {displayLine}
            </h3>
            {username && (
              <span className="font-mono text-sm text-[var(--text-muted)]">@{username}</span>
            )}
            <span className="font-mono text-xs text-[var(--text-muted)] opacity-60">
              Last login: {formatLastLogin(lastLogin)}
            </span>
          </div>

          {/* Profile Section */}
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-mono text-xs font-semibold tracking-widest text-[var(--neon-primary)] uppercase opacity-70">
                Profile
              </h4>
              {!editing && (
                <button
                  type="button"
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-[rgba(0,255,170,0.15)] px-3 py-1 font-mono text-xs text-[var(--neon-primary)] transition-all duration-200 hover:border-[rgba(0,255,170,0.4)] hover:bg-[rgba(0,255,170,0.05)] cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <ProfileInput
                  label="First Name"
                  value={form.firstName}
                  onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
                  placeholder="Enter first name"
                />
                <ProfileInput
                  label="Last Name"
                  value={form.lastName}
                  onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
                  placeholder="Enter last name"
                />
                <ProfileInput
                  label="Username"
                  value={form.username}
                  onChange={(v) => setForm((f) => ({ ...f, username: v }))}
                  placeholder="Enter username"
                  prefix="@"
                  maxLength={20}
                />
                <div className="flex items-center justify-between rounded-lg border border-[rgba(0,255,170,0.06)] bg-[var(--bg-card)] px-4 py-3">
                  <span className="text-sm text-[var(--text-secondary)]">Email</span>
                  <span className="font-mono text-sm text-[var(--text-muted)] opacity-60">{email}</span>
                </div>

                {saveError && (
                  <p className="rounded-lg border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-2.5 font-mono text-xs text-[var(--neon-magenta)]">
                    {saveError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-[rgba(0,255,170,0.15)] py-2.5 font-mono text-sm text-[var(--text-muted)] transition-all duration-200 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] py-2.5 font-mono text-sm font-semibold text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:bg-[rgba(0,255,170,0.15)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    {isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <ProfileRow label="First Name" value={firstName || "—"} />
                <ProfileRow label="Last Name" value={lastName || "—"} />
                <ProfileRow label="Username" value={username ? `@${username}` : "—"} />
                <ProfileRow label="Email" value={email} />
              </div>
            )}
          </div>

          {/* Preferences Section */}
          <div className="mb-6">
            <h4 className="mb-3 font-mono text-xs font-semibold tracking-widest text-[var(--neon-primary)] uppercase opacity-70">
              Preferences
            </h4>
            <div className="space-y-3">
              <ProfileRow label="Theme" value={preferences.theme} />
              <ProfileRow label="Language" value={preferences.language} />
              <ProfileRow label="Notifications" value={preferences.notifications ? "On" : "Off"} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(0,255,170,0.08)] p-6">
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-xl border border-[rgba(255,0,170,0.2)] bg-[rgba(255,0,170,0.05)] py-3 font-mono text-sm text-[var(--neon-magenta)] transition-all duration-300 hover:border-[rgba(255,0,170,0.5)] hover:bg-[rgba(255,0,170,0.1)] hover:shadow-[0_0_20px_rgba(255,0,170,0.15)] cursor-pointer"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[rgba(0,255,170,0.06)] bg-[var(--bg-card)] px-4 py-3">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-sm text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  maxLength?: number;
}) {
  return (
    <div className="rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-card)] px-4 py-2.5 focus-within:border-[rgba(0,255,170,0.4)] transition-colors duration-200">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-xs text-[var(--neon-primary)] opacity-60">{label}</span>
        {maxLength && (
          <span className={`font-mono text-xs tabular-nums ${value.length >= maxLength ? "text-[var(--neon-magenta)]" : "text-[var(--text-muted)] opacity-50"}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {prefix && <span className="font-mono text-sm text-[var(--text-muted)]">{prefix}</span>}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
        />
      </div>
    </div>
  );
}
