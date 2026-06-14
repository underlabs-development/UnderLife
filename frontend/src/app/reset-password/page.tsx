"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/features/auth";
import PasswordInput from "@/components/password-input";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";
  const [matchError, setMatchError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const pw = (form.elements.namedItem("new_password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;
    if (pw !== confirm) {
      e.preventDefault();
      setMatchError("Passwords do not match.");
    } else {
      setMatchError("");
    }
  };

  const error = matchError || state?.error;

  if (!uid || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
        <div className="w-full max-w-sm text-center">
          <p className="font-mono text-sm text-[var(--neon-magenta)]">Invalid reset link.</p>
          <Link href="/forgot-password" className="mt-4 block font-mono text-xs text-[var(--text-muted)] hover:text-[var(--neon-primary)]">
            Request a new one →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-[var(--text-muted)] uppercase mb-2">
            UnderOS v1.0
          </p>
          <h1 className="font-mono text-3xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_20px_rgba(0,255,170,0.5)]">
            {">"}_
          </h1>
          <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
            SET NEW PASSWORD
          </p>
        </div>

        <div className="rounded-2xl border border-[rgba(0,255,170,0.15)] bg-[rgba(12,12,20,0.95)] p-8 shadow-[0_0_40px_rgba(0,255,170,0.05)] backdrop-blur-md">
          <form action={action} onSubmit={handleSubmit} className="space-y-5">
            <input type="hidden" name="uid" value={uid} />
            <input type="hidden" name="token" value={token} />

            <div className="space-y-1.5">
              <label
                htmlFor="new_password"
                className="block font-mono text-xs tracking-widest text-[var(--neon-primary)] uppercase opacity-70"
              >
                New Password
              </label>
              <PasswordInput
                id="new_password"
                name="new_password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm_password"
                className="block font-mono text-xs tracking-widest text-[var(--neon-primary)] uppercase opacity-70"
              >
                Confirm Password
              </label>
              <PasswordInput
                id="confirm_password"
                name="confirm_password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-2.5 font-mono text-xs text-[var(--neon-magenta)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] py-3 font-mono text-sm font-semibold text-[var(--neon-primary)] shadow-[0_0_20px_rgba(0,255,170,0.08)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:bg-[rgba(0,255,170,0.15)] hover:shadow-[0_0_30px_rgba(0,255,170,0.2)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {pending ? "UPDATING..." : "SET NEW PASSWORD"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="font-mono text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--neon-primary)]"
          >
            ← Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
