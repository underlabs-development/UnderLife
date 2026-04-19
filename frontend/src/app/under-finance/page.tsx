import Link from "next/link";

const LABELS = {
  title: "UnderFinance",
  subtitle: "Finance module loading...",
  back: "Back to Launcher",
};

export default function UnderFinancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-void)] p-8">
      <h1 className="font-mono text-4xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_12px_rgba(0,255,170,0.4)]">
        <span className="opacity-70">{">"}</span> {LABELS.title}
      </h1>
      <p className="font-mono text-sm text-[var(--text-secondary)]">
        {LABELS.subtitle}
      </p>
      <div className="h-1 w-32 overflow-hidden rounded-full bg-[rgba(0,255,170,0.1)]">
        <div
          className="h-full w-1/3 rounded-full bg-[var(--neon-primary)]"
          style={{ animation: "slideLoader 1.5s ease-in-out infinite" }}
        />
      </div>
      <Link
        href="/"
        className="mt-8 rounded-xl border border-[rgba(0,255,170,0.15)]
          bg-[var(--bg-card)] px-6 py-3 font-mono text-sm text-[var(--text-secondary)]
          transition-all duration-300
          hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)]
          hover:shadow-[0_0_16px_rgba(0,255,170,0.12)] no-underline"
      >
        ← {LABELS.back}
      </Link>
      <style>{`
        @keyframes slideLoader {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(300%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </main>
  );
}
