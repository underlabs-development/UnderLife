import type { CategorySlice } from "../models/finance.model";
import { formatMoney } from "../lib/format";

interface CategoryDonutProps {
  slices: CategorySlice[];
  total: number;
}

const RADIUS = 60;
const STROKE = 18;
const CIRC = 2 * Math.PI * RADIUS;

export function CategoryDonut({ slices, total }: CategoryDonutProps) {
  const positive = slices.filter((s) => s.total > 0);
  const arcs = positive.map((s, i) => {
    const dash = (s.pct / 100) * CIRC;
    // Cumulative length of all preceding slices (kept pure for React Compiler).
    const rotate = positive
      .slice(0, i)
      .reduce((sum, p) => sum + (p.pct / 100) * CIRC, 0);
    return { ...s, dash, gap: CIRC - dash, rotate };
  });

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <h2 className="mb-5 font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
        <span className="text-[var(--neon-primary)] opacity-70">{">"}</span>{" "}
        Spending by Category
      </h2>

      {arcs.length === 0 ? (
        <p className="py-10 text-center font-mono text-sm text-[var(--text-muted)]">
          No expenses this month.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-40 w-40 shrink-0">
            <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
              <circle
                cx="80"
                cy="80"
                r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={STROKE}
              />
              {arcs.map((a) => (
                <circle
                  key={a.category_id ?? a.name}
                  cx="80"
                  cy="80"
                  r={RADIUS}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={STROKE}
                  strokeDasharray={`${a.dash} ${a.gap}`}
                  strokeDashoffset={-a.rotate}
                  style={{ filter: `drop-shadow(0 0 4px ${a.color}88)` }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xs text-[var(--text-muted)]">
                Total
              </span>
              <span className="font-mono text-lg font-bold text-[var(--text-primary)]">
                {formatMoney(total)}
              </span>
            </div>
          </div>

          <ul className="flex w-full flex-col gap-2">
            {arcs.map((a) => (
              <li
                key={a.category_id ?? a.name}
                className="flex items-center gap-3 font-mono text-xs"
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }}
                />
                <span className="flex-1 truncate text-[var(--text-secondary)]">
                  {a.name}
                </span>
                <span className="text-[var(--text-muted)]">{a.pct}%</span>
                <span className="w-20 text-right text-[var(--text-primary)]">
                  {formatMoney(a.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
