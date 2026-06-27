"use client";

import { useState, useTransition } from "react";
import type { BudgetProgress, Category } from "../models/finance.model";
import { upsertBudget, deleteBudget } from "../actions/mutations";
import { formatMoney } from "../lib/format";

interface BudgetsPanelProps {
  budgets: BudgetProgress[];
  budgetIdByCategory: Record<number, number>;
  expenseCategories: Category[];
  onChanged: () => void;
}

export function BudgetsPanel({
  budgets,
  budgetIdByCategory,
  expenseCategories,
  onChanged,
}: BudgetsPanelProps) {
  const [adding, setAdding] = useState(false);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();

  const budgetedIds = new Set(budgets.map((b) => b.category_id));
  const available = expenseCategories.filter((c) => !budgetedIds.has(c.id));

  const handleAdd = () => {
    const value = parseFloat(amount);
    if (categoryId === "" || !value || value <= 0) return;
    startTransition(async () => {
      await upsertBudget({ category_id: Number(categoryId), amount: value });
      setAdding(false);
      setCategoryId("");
      setAmount("");
      onChanged();
    });
  };

  const handleDelete = (categoryId: number) => {
    const id = budgetIdByCategory[categoryId];
    if (!id) return;
    startTransition(async () => {
      await deleteBudget(id);
      onChanged();
    });
  };

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Budgets
        </h2>
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg border border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] cursor-pointer"
          >
            {adding ? "Cancel" : "+ Set budget"}
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-surface)] p-3">
          <select
            value={categoryId}
            onChange={(e) =>
              setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="flex-1 bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [&>option]:bg-[var(--bg-surface)]"
          >
            <option value="">Select category…</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-[rgba(0,255,170,0.15)] px-2 py-1">
            <span className="font-mono text-sm text-[var(--text-muted)]">€</span>
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="limit"
              className="w-20 bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="rounded-lg border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] disabled:opacity-40 cursor-pointer"
          >
            Save
          </button>
        </div>
      )}

      {budgets.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-[var(--text-muted)]">
          No budgets set. Cap a category to track overspending.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {budgets.map((b) => {
            const over = b.spent > b.limit;
            const barColor = over ? "var(--neon-magenta)" : b.color;
            return (
              <li key={b.category_id} className="group">
                <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
                  <span className="text-[var(--text-secondary)]">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        color: over ? "var(--neon-magenta)" : "var(--text-primary)",
                      }}
                    >
                      {formatMoney(b.spent)} / {formatMoney(b.limit)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.category_id)}
                      aria-label="Remove budget"
                      className="text-[var(--text-muted)] opacity-60 transition-opacity duration-200 group-hover:opacity-100 hover:text-[var(--neon-magenta)] cursor-pointer sm:opacity-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, b.pct)}%`,
                      background: barColor,
                      boxShadow: `0 0 8px ${barColor}`,
                    }}
                  />
                </div>
                {over && (
                  <p className="mt-1 font-mono text-[10px] text-[var(--neon-magenta)]">
                    Over budget by {formatMoney(b.spent - b.limit)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
