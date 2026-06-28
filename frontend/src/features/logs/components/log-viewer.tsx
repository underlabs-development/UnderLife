"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getLogs } from "../actions/get-logs";

const MAX_LINES = 3000;
const POLL_MS = 1500;

function lineColor(line: string): string {
  if (line.startsWith("ERROR") || line.startsWith("CRITICAL"))
    return "var(--neon-magenta)";
  if (line.startsWith("WARNING")) return "#ffb000";
  if (line.startsWith("DEBUG")) return "var(--text-muted)";
  return "var(--text-secondary)";
}

export function LogViewer() {
  const [lines, setLines] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [autoscroll, setAutoscroll] = useState(true);
  const offsetRef = useRef(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Poll the tail while not paused.
  useEffect(() => {
    if (paused) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const res = await getLogs(offsetRef.current);
      if (!active) return;
      if ("data" in res) {
        offsetRef.current = res.data.offset;
        if (res.data.lines.length) {
          setLines((prev) => [...prev, ...res.data.lines].slice(-MAX_LINES));
        }
        setError("");
      } else {
        setError(res.error);
      }
      if (active) timer = setTimeout(poll, POLL_MS);
    };
    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [paused]);

  // Keep pinned to the bottom while following.
  useEffect(() => {
    if (autoscroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines, autoscroll]);

  return (
    <div className="mx-auto flex h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to launcher"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-card)] text-[var(--text-secondary)] no-underline transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)]"
          >
            ←
          </Link>
          <h1 className="font-mono text-lg font-bold text-[var(--neon-primary)] drop-shadow-[0_0_12px_rgba(0,255,170,0.4)]">
            <span className="opacity-70">{">"}</span> Backend logs
          </h1>
          <span className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: paused ? "var(--text-muted)" : "var(--neon-primary)",
                boxShadow: paused ? "none" : "0 0 6px var(--neon-primary)",
                animation: paused ? "none" : "neonPulse 1.5s ease-in-out infinite",
              }}
            />
            {paused ? "paused" : "live"}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Toggle on={autoscroll} onClick={() => setAutoscroll((v) => !v)}>
            Follow
          </Toggle>
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            className="rounded-lg border border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] cursor-pointer"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setLines([])}
            className="rounded-lg border border-[rgba(0,255,170,0.12)] px-3 py-1.5 text-[var(--text-secondary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Clear
          </button>
        </div>
      </header>

      {error && (
        <p className="mb-3 rounded-xl border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-2.5 font-mono text-xs text-[var(--neon-magenta)]">
          {error}
        </p>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-auto rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-surface)] p-4"
      >
        {lines.length === 0 ? (
          <p className="font-mono text-xs text-[var(--text-muted)]">
            {error ? "—" : "Waiting for log output…"}
          </p>
        ) : (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
            {lines.map((line, i) => (
              <div key={i} style={{ color: lineColor(line) }}>
                {line}
              </div>
            ))}
          </pre>
        )}
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-1.5 transition-all duration-300 cursor-pointer"
      style={{
        borderColor: on ? "rgba(0,255,170,0.4)" : "rgba(255,255,255,0.1)",
        background: on ? "rgba(0,255,170,0.08)" : "transparent",
        color: on ? "var(--neon-primary)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}
