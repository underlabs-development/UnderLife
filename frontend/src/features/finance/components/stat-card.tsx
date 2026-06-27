import type { StatDelta } from "../models/finance.model";
import { formatMoney } from "../lib/format";

interface StatCardProps {
  label: string;
  delta?: StatDelta;
  /** Render a raw string instead of a money delta (e.g. savings rate "%"). */
  rawValue?: string;
  accent: string; // hex
  /** When true, a positive change is bad (expenses): colour it red. */
  invertDelta?: boolean;
  index: number;
}

export function StatCard({
  label,
  delta,
  rawValue,
  accent,
  invertDelta = false,
  index,
}: StatCardProps) {
  const value = rawValue ?? formatMoney(delta?.value ?? 0);
  const change = delta?.change_pct ?? null;
  const isUp = change !== null && change > 0;
  const isDown = change !== null && change < 0;
  const good = invertDelta ? isDown : isUp;
  const changeColor =
    change === null || change === 0
      ? "var(--text-muted)"
      : good
        ? "var(--neon-primary)"
        : "var(--neon-magenta)";

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 transition-all duration-300 hover:border-[rgba(0,255,170,0.2)] sm:p-5"
      style={{ animation: `tileEnter 0.5s ease-out ${index * 0.08}s both` }}
    >
      <div
        className="absolute top-0 left-0 h-full w-1 opacity-70"
        style={{ background: accent, boxShadow: `0 0 16px ${accent}` }}
      />
      <p className="font-mono text-xs tracking-widest text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p
        className="mt-2 font-mono text-xl font-bold sm:text-2xl"
        style={{ color: accent, textShadow: `0 0 14px ${accent}55` }}
      >
        {value}
      </p>
      {change !== null && (
        <p className="mt-1 font-mono text-xs" style={{ color: changeColor }}>
          {isUp ? "▲" : isDown ? "▼" : "—"} {Math.abs(change)}%{" "}
          <span className="text-[var(--text-muted)]">vs last month</span>
        </p>
      )}
      {change === null && (
        <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
          no prior data
        </p>
      )}
    </div>
  );
}
