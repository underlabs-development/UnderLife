import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[var(--bg-void)] px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="font-mono text-xs text-[var(--text-secondary)] no-underline transition-colors duration-300 hover:text-[var(--neon-primary)]"
        >
          ← UnderFinance
        </Link>

        <h1 className="mt-6 font-mono text-3xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_12px_rgba(0,255,170,0.4)]">
          <span className="opacity-70">{">"}</span> {title}
        </h1>
        <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
          Last updated: {lastUpdated}
        </p>

        <div className="mt-8 flex flex-col gap-6 leading-relaxed text-[var(--text-secondary)]">
          {children}
        </div>
      </div>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-sm font-semibold tracking-widest text-[var(--text-primary)] uppercase">
        {heading}
      </h2>
      <div className="flex flex-col gap-2 text-sm">{children}</div>
    </section>
  );
}
