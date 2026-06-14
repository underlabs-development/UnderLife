"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/features/auth";
import PasswordInput from "@/components/password-input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-[var(--text-muted)] uppercase mb-2">
            UnderOS v1.0
          </p>
          <h1 className="font-mono text-3xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_20px_rgba(0,255,170,0.5)]">
            {">"}_
          </h1>
          <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
            AUTHENTICATE TO CONTINUE
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[rgba(0,255,170,0.15)] bg-[rgba(12,12,20,0.95)] p-8 shadow-[0_0_40px_rgba(0,255,170,0.05)] backdrop-blur-md">
          <form action={action} className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block font-mono text-xs tracking-widest text-[var(--neon-primary)] uppercase opacity-70"
              >
                Email or Username
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-[rgba(0,255,170,0.15)] bg-[rgba(0,255,170,0.03)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-all duration-200 focus:border-[rgba(0,255,170,0.5)] focus:shadow-[0_0_12px_rgba(0,255,170,0.1)]"
                placeholder="operator or operator@under.os"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block font-mono text-xs tracking-widest text-[var(--neon-primary)] uppercase opacity-70"
              >
                Password
              </label>
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-2.5 font-mono text-xs text-[var(--neon-magenta)]">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] py-3 font-mono text-sm font-semibold text-[var(--neon-primary)] shadow-[0_0_20px_rgba(0,255,170,0.08)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:bg-[rgba(0,255,170,0.15)] hover:shadow-[0_0_30px_rgba(0,255,170,0.2)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {pending ? "AUTHENTICATING..." : "ENTER SYSTEM"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center">
          <Link
            href="/forgot-password"
            className="font-mono text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--neon-primary)]"
          >
            Forgot password?
          </Link>
        </p>

        <p className="mt-3 text-center font-mono text-xs text-[var(--text-muted)]">
          UNDER.OS ECOSYSTEM — RESTRICTED ACCESS
        </p>
      </div>
    </main>
  );
}
