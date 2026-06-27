"use client";

import type { Advisor } from "../models/finance.model";
import { formatMoney } from "../lib/format";

interface AdvisorPanelProps {
  advisor: Advisor | null;
  aiEnabled: boolean;
  onToggleAi: (enabled: boolean) => void;
  busy?: boolean;
}

const TYPE_ACCENT: Record<string, string> = {
  overspend: "#ff00aa",
  savings_rate: "#00ffaa",
  recurring: "#00e5ff",
  category_jump: "#ffb000",
  goal_pacing: "#b46bff",
};

export function AdvisorPanel({
  advisor,
  aiEnabled,
  onToggleAi,
  busy,
}: AdvisorPanelProps) {
  const insights = advisor?.insights ?? [];

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Savings
          Advisor
        </h2>
        <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-[var(--text-secondary)]">
          <span className={aiEnabled ? "text-[var(--neon-primary)]" : ""}>
            AI phrasing
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={aiEnabled}
            onClick={() => onToggleAi(!aiEnabled)}
            className="relative h-5 w-9 rounded-full border transition-colors duration-300"
            style={{
              borderColor: aiEnabled ? "rgba(0,255,170,0.5)" : "rgba(255,255,255,0.15)",
              background: aiEnabled ? "rgba(0,255,170,0.15)" : "transparent",
            }}
          >
            <span
              className="absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-300"
              style={{
                left: aiEnabled ? "1.15rem" : "0.15rem",
                background: aiEnabled ? "var(--neon-primary)" : "var(--text-muted)",
                boxShadow: aiEnabled ? "0 0 8px var(--neon-primary)" : "none",
              }}
            />
          </button>
        </label>
      </div>

      {busy ? (
        <p className="py-8 text-center font-mono text-sm text-[var(--text-muted)]">
          Analyzing your spending…
        </p>
      ) : insights.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-[var(--text-muted)]">
          Add some income and expenses to get personalized savings tips.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {insights.map((it, i) => {
            const accent = TYPE_ACCENT[it.type] ?? "var(--text-secondary)";
            return (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-[rgba(0,255,170,0.06)] bg-[var(--bg-surface)] p-3"
                style={{ animation: `fadeIn 0.4s ease-out ${i * 0.06}s both` }}
              >
                <span
                  className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                />
                <p className="flex-1 text-sm leading-relaxed text-[var(--text-primary)]">
                  {it.text}
                </p>
                {it.projected_monthly_saving > 0 && (
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] whitespace-nowrap"
                    style={{
                      borderColor: `${accent}55`,
                      color: accent,
                    }}
                  >
                    ~{formatMoney(it.projected_monthly_saving)}/mo
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {advisor && !advisor.ai_phrased && aiEnabled && insights.length > 0 && (
        <p className="mt-3 font-mono text-[10px] text-[var(--text-muted)]">
          Local model offline — showing plain figures.
        </p>
      )}
    </section>
  );
}
