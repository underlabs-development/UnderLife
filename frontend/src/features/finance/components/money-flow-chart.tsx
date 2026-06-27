import type { CategorySlice } from "../models/finance.model";
import { formatMoney } from "../lib/format";

interface MoneyFlowChartProps {
  income: number;
  expense: number;
  net: number;
  categories: CategorySlice[];
}

// viewBox geometry (1 unit ≈ 1px at full width)
const VBW = 1000;
const VBH = 380;
const PAD = 16;
const GAP = 12;
const NW = 9; // node bar width
const COL1_X0 = 468;
const COL1_X1 = COL1_X0 + NW;
const COL2_X0 = VBW - NW;
const USABLE = VBH - 2 * PAD;

const GREEN = "#00ffaa";
const MAGENTA = "#ff00aa";
const CYAN = "#00e5ff";

/** Build a ribbon path linking a vertical segment on the left to one on the right. */
function ribbon(
  x0: number,
  x1: number,
  sy0: number,
  sy1: number,
  ty0: number,
  ty1: number,
): string {
  const xm = (x0 + x1) / 2;
  return `M${x0},${sy0} C${xm},${sy0} ${xm},${ty0} ${x1},${ty0} L${x1},${ty1} C${xm},${ty1} ${xm},${sy1} ${x0},${sy1} Z`;
}

export function MoneyFlowChart({
  income,
  expense,
  net,
  categories,
}: MoneyFlowChartProps) {
  const cats = categories.filter((c) => c.total > 0);
  const saved = Math.max(0, net);
  const total = Math.max(income, expense);

  const empty = total <= 0;
  const scale = empty ? 0 : USABLE / total;

  const incomeH = income * scale;
  const expenseH = expense * scale;
  const savedH = saved * scale;
  const tInSpent = Math.min(income, expense) * scale; // income that funds spending

  // Column 1 nodes (top-aligned, saved below spent).
  const savedGap = saved > 0 ? Math.min(GAP, Math.max(0, USABLE - incomeH)) : 0;
  const savedY0 = PAD + expenseH + savedGap;

  // Column 2 category nodes (top-aligned, gaps shrink to fit).
  const catGap =
    cats.length > 1
      ? Math.min(8, Math.max(0, (USABLE - expenseH) / (cats.length - 1)))
      : 0;
  const catNodes = cats.map((c, i) => {
    const cumH = cats.slice(0, i).reduce((s, p) => s + p.total * scale, 0);
    const y0 = PAD + cumH + i * catGap;
    return { ...c, y0, h: c.total * scale, srcY0: PAD + cumH };
  });

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <h2 className="mb-5 font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
        <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Money
        Flow
      </h2>

      {empty ? (
        <p className="py-10 text-center font-mono text-sm text-[var(--text-muted)]">
          No income or expenses this month yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${VBW} ${VBH}`}
            className="w-full min-w-[640px]"
            role="img"
            aria-label="Money flow from income to spending categories and savings"
          >
            <defs>
              <linearGradient id="mf-spent" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GREEN} />
                <stop offset="100%" stopColor={MAGENTA} />
              </linearGradient>
              <linearGradient id="mf-saved" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={GREEN} />
                <stop offset="100%" stopColor={CYAN} />
              </linearGradient>
              {catNodes.map((c, i) => (
                <linearGradient
                  key={`grad-${i}`}
                  id={`mf-cat-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={MAGENTA} />
                  <stop offset="100%" stopColor={c.color} />
                </linearGradient>
              ))}
            </defs>

            {/* Ribbons (drawn under nodes) */}
            {tInSpent > 0 && (
              <path
                d={ribbon(NW, COL1_X0, PAD, PAD + tInSpent, PAD, PAD + tInSpent)}
                fill="url(#mf-spent)"
                fillOpacity={0.4}
              />
            )}
            {savedH > 0 && (
              <path
                d={ribbon(
                  NW,
                  COL1_X0,
                  PAD + tInSpent,
                  PAD + tInSpent + savedH,
                  savedY0,
                  savedY0 + savedH,
                )}
                fill="url(#mf-saved)"
                fillOpacity={0.4}
              />
            )}
            {catNodes.map((c, i) => (
              <path
                key={`flow-${i}`}
                d={ribbon(
                  COL1_X1,
                  COL2_X0,
                  c.srcY0,
                  c.srcY0 + c.h,
                  c.y0,
                  c.y0 + c.h,
                )}
                fill={`url(#mf-cat-${i})`}
                fillOpacity={0.42}
              />
            ))}

            {/* Nodes */}
            <Node x={0} y0={PAD} h={incomeH} color={GREEN} />
            <Node x={COL1_X0} y0={PAD} h={expenseH} color={MAGENTA} />
            {savedH > 0 && (
              <Node x={COL1_X0} y0={savedY0} h={savedH} color={CYAN} />
            )}
            {catNodes.map((c, i) => (
              <Node key={`node-${i}`} x={COL2_X0} y0={c.y0} h={c.h} color={c.color} />
            ))}

            {/* Labels */}
            <FlowLabel
              x={NW + 12}
              y={PAD + incomeH / 2}
              anchor="start"
              text={`Income · ${formatMoney(income)}`}
            />
            <FlowLabel
              x={COL1_X1 + 12}
              y={PAD + expenseH / 2}
              anchor="start"
              text={`Spent · ${formatMoney(expense)}`}
            />
            {savedH > 0 && (
              <FlowLabel
                x={COL1_X1 + 12}
                y={savedY0 + savedH / 2}
                anchor="start"
                text={`Saved · ${formatMoney(saved)}`}
              />
            )}
            {catNodes.map((c, i) => (
              <FlowLabel
                key={`label-${i}`}
                x={COL2_X0 - 12}
                y={c.y0 + c.h / 2}
                anchor="end"
                text={`${c.name} · ${formatMoney(c.total)}`}
              />
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

function Node({
  x,
  y0,
  h,
  color,
}: {
  x: number;
  y0: number;
  h: number;
  color: string;
}) {
  if (h <= 0) return null;
  return (
    <rect
      x={x}
      y={y0}
      width={NW}
      height={h}
      rx={2}
      fill={color}
      opacity={0.9}
      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
    />
  );
}

function FlowLabel({
  x,
  y,
  anchor,
  text,
}: {
  x: number;
  y: number;
  anchor: "start" | "end";
  text: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      fontSize={13}
      fontFamily="var(--font-mono), monospace"
      fill="#e0fff4"
      style={{
        paintOrder: "stroke",
        stroke: "rgba(6,6,12,0.85)",
        strokeWidth: 3.5,
        strokeLinejoin: "round",
      }}
    >
      {text}
    </text>
  );
}
