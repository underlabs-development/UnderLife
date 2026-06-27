"use client";

import { useActivityStore } from "../stores/activity-store";

/**
 * Fixed status pill that shows what async work is currently running (bank sync,
 * AI categorization, advisor generation, …). Renders nothing when idle.
 */
export function ActivityIndicator() {
  const activities = useActivityStore((s) => s.activities);
  if (activities.length === 0) return null;

  const current = activities[activities.length - 1].label;
  const extra = activities.length - 1;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-[rgba(0,255,170,0.25)] bg-[rgba(12,12,20,0.96)] px-4 py-3 font-mono text-sm text-[var(--neon-primary)] shadow-[0_0_24px_rgba(0,255,170,0.18)] backdrop-blur-md sm:left-auto sm:right-4 sm:translate-x-0"
      style={{ animation: "fadeIn 0.3s ease-out both" }}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[rgba(0,255,170,0.25)] border-t-[var(--neon-primary)]"
      />
      <span className="max-w-[70vw] truncate sm:max-w-xs">
        {current}
        {extra > 0 && (
          <span className="text-[var(--text-muted)]"> +{extra} more</span>
        )}
      </span>
    </div>
  );
}
