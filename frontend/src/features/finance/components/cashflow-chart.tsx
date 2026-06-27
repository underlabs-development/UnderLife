import type { CashflowPoint } from "../models/finance.model";
import { formatMoney } from "../lib/format";

interface CashflowChartProps {
  points: CashflowPoint[];
  activeMonth: string;
}

export function CashflowChart({ points, activeMonth }: CashflowChartProps) {
  const max = Math.max(1, ...points.flatMap((p) => [p.income, p.expense]));

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Cash
          Flow
        </h2>
        <div className="flex items-center gap-4 font-mono text-xs">
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--neon-primary)]" />
            Income
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--neon-magenta)]" />
            Expense
          </span>
        </div>
      </div>

      <div className="flex h-44 items-end justify-between gap-3">
        {points.map((p) => {
          const isActive = p.month === activeMonth;
          return (
            <div
              key={p.month}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="flex h-full w-full items-end justify-center gap-1">
                <Bar
                  value={p.income}
                  max={max}
                  color="var(--neon-primary)"
                  rgb="0,255,170"
                />
                <Bar
                  value={p.expense}
                  max={max}
                  color="var(--neon-magenta)"
                  rgb="255,0,170"
                />
              </div>
              <span
                className={`font-mono text-xs ${
                  isActive
                    ? "text-[var(--neon-primary)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Bar({
  value,
  max,
  color,
  rgb,
}: {
  value: number;
  max: number;
  color: string;
  rgb: string;
}) {
  const heightPct = Math.max(value > 0 ? 4 : 0, (value / max) * 100);
  return (
    <div className="relative flex h-full w-3 items-end sm:w-4">
      {/* Hover tooltip */}
      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md border border-[rgba(0,255,170,0.2)] bg-[var(--bg-surface)] px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-[var(--text-primary)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {formatMoney(value)}
      </span>
      <div
        className="w-full rounded-t-sm transition-all duration-500"
        style={{
          height: `${heightPct}%`,
          background: color,
          boxShadow: `0 0 10px rgba(${rgb},0.5)`,
        }}
      />
    </div>
  );
}
