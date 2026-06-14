"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "@/features/auth";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

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
            ACCOUNT RECOVERY
          </p>
        </div>

        <div className="rounded-2xl border border-[rgba(0,255,170,0.15)] bg-[rgba(12,12,20,0.95)] p-8 shadow-[0_0_40px_rgba(0,255,170,0.05)] backdrop-blur-md">
          {"success" in (state ?? {}) ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)]">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--neon-primary)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <p className="font-mono text-sm text-[var(--text-primary)]">
                If that email is registered, a reset link is on its way.
              </p>
              <p className="font-mono text-xs text-[var(--text-muted)]">
                Check the Django terminal for the link in local dev.
              </p>
            </div>
          ) : (
            <form action={action} className="space-y-5">
              <p className="font-mono text-xs text-[var(--text-secondary)]">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block font-mono text-xs tracking-widest text-[var(--neon-primary)] uppercase opacity-70"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-[rgba(0,255,170,0.15)] bg-[rgba(0,255,170,0.03)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[rgba(0,255,170,0.5)] focus:shadow-[0_0_12px_rgba(0,255,170,0.1)]"
                  placeholder="operator@under.os"
                />
              </div>

              {"error" in (state ?? {}) && (
                <p className="rounded-lg border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-2.5 font-mono text-xs text-[var(--neon-magenta)]">
                  {(state as { error: string }).error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="mt-2 w-full rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] py-3 font-mono text-sm font-semibold text-[var(--neon-primary)] shadow-[0_0_20px_rgba(0,255,170,0.08)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:bg-[rgba(0,255,170,0.15)] hover:shadow-[0_0_30px_rgba(0,255,170,0.2)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {pending ? "SENDING..." : "SEND RESET LINK"}
              </button>
            </form>
          )}
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
