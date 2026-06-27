"use client";

import { useState } from "react";
import type { Transaction } from "../models/finance.model";
import { formatMoneyExact, formatDayLabel } from "../lib/format";
import { CategoryIcon } from "./category-icon";

interface TransactionsPanelProps {
  transactions: Transaction[];
  onAdd: () => void;
  onDelete: (id: number) => Promise<void>;
  onToggleTransfer: (id: number, isTransfer: boolean) => Promise<void>;
  onDetectTransfers: () => Promise<void>;
}

export function TransactionsPanel({
  transactions,
  onAdd,
  onDelete,
  onToggleTransfer,
  onDetectTransfers,
}: TransactionsPanelProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  const handleDetect = async () => {
    setDetecting(true);
    await onDetectTransfers();
    setDetecting(false);
  };

  return (
    <section className="flex flex-col rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span>{" "}
          Transactions
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            title="Auto-detect transfers between your accounts"
            className="rounded-lg border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-cyan)] transition-all duration-300 hover:border-[rgba(0,229,255,0.5)] disabled:opacity-40 cursor-pointer"
          >
            {detecting ? "Detecting…" : "⇄ Transfers"}
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-lg border border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] hover:shadow-[0_0_12px_rgba(0,255,170,0.2)] cursor-pointer"
          >
            + Add
          </button>
        </div>
      </div>

      {transactions.length === 0 ? (
        <p className="py-10 text-center font-mono text-sm text-[var(--text-muted)]">
          No transactions this month. Add your first one.
        </p>
      ) : (
        <ul className="flex max-h-[22rem] flex-col gap-1 overflow-y-auto pr-1">
          {transactions.map((tx) => {
            const isIncome = tx.kind === "income";
            const isTransfer = tx.is_transfer;
            const color = isTransfer
              ? "#00e5ff"
              : tx.category_color ?? (isIncome ? "#00ffaa" : "#8ba4a0");
            return (
              <li
                key={tx.id}
                className={`group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-[var(--bg-card-hover)] ${
                  isTransfer ? "opacity-60" : ""
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                  style={{ borderColor: `${color}40`, background: `${color}12`, color }}
                >
                  <CategoryIcon
                    icon={isTransfer ? "chart" : isIncome ? "wallet" : "tag"}
                    className="h-4 w-4"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--text-primary)]">
                    {tx.description || tx.category_name || (isIncome ? "Income" : "Expense")}
                  </p>
                  <p className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-muted)]">
                    {isTransfer ? (
                      <span className="text-[var(--neon-cyan)]">⇄ Transfer</span>
                    ) : (
                      tx.category_name ?? "Uncategorized"
                    )}
                    {" · "}
                    {formatDayLabel(tx.date)}
                  </p>
                </div>
                <span
                  className="font-mono text-sm font-semibold"
                  style={{
                    color: isTransfer
                      ? "var(--text-muted)"
                      : isIncome
                        ? "var(--neon-primary)"
                        : "var(--text-primary)",
                  }}
                >
                  {isIncome ? "+" : "−"}
                  {formatMoneyExact(tx.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleTransfer(tx.id, !isTransfer)}
                  aria-label={isTransfer ? "Unmark transfer" : "Mark as transfer"}
                  title={isTransfer ? "Unmark transfer" : "Mark as transfer (exclude from stats)"}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-200 hover:bg-[rgba(0,229,255,0.1)] hover:text-[var(--neon-cyan)] cursor-pointer ${
                    isTransfer
                      ? "text-[var(--neon-cyan)]"
                      : "text-[var(--text-muted)] opacity-60 group-hover:opacity-100 sm:opacity-0"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M7 10h12l-3-3m3 7H7l3 3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(tx.id)}
                  disabled={deletingId === tx.id}
                  aria-label="Delete transaction"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] opacity-60 transition-all duration-200 group-hover:opacity-100 hover:bg-[rgba(255,0,170,0.1)] hover:text-[var(--neon-magenta)] cursor-pointer disabled:opacity-40 sm:opacity-0"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path
                      d="M6 7h12M9 7V5h6v2m-7 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
