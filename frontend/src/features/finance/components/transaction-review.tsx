"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Category, Transaction } from "../models/finance.model";
import {
  listCategories,
  listNeedsReview,
  listTransactions,
} from "../actions/queries";
import {
  categorizeAll,
  deleteTransaction,
  detectTransfers,
  recategorizeAll,
  recategorizeTransaction,
  setTransactionCategory,
  setTransactionTransfer,
} from "../actions/mutations";
import {
  currentMonth,
  formatDayLabel,
  formatMonthLabel,
  formatMoneyExact,
  shiftMonth,
} from "../lib/format";
import { FinanceNav } from "./finance-nav";
import { ActivityIndicator } from "./activity-indicator";
import { track } from "../stores/activity-store";

type Filter = "review" | "all";

export function TransactionReview() {
  const [filter, setFilter] = useState<Filter>("review");
  const [month, setMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) setLoading(true);
      try {
        const [txs, cats] = await track(
          "Loading transactions…",
          Promise.all([
            filter === "review" ? listNeedsReview() : listTransactions(month),
            listCategories(),
          ]),
        );
        if (!active) return;
        setTransactions(txs);
        setCategories(cats);
        setError("");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filter, month, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleAssign = async (id: number, categoryId: number) => {
    await setTransactionCategory(id, categoryId);
    refresh();
  };
  const handleToggleTransfer = async (id: number, isTransfer: boolean) => {
    await setTransactionTransfer(id, isTransfer);
    refresh();
  };
  const handleDelete = async (id: number) => {
    await deleteTransaction(id);
    refresh();
  };
  const handleAnalyze = async (id: number) => {
    await track("AI is analysing this transaction…", recategorizeTransaction(id));
    refresh();
  };
  const runAction = (key: string, label: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    void (async () => {
      await track(label, fn());
      setBusy("");
      refresh();
    })();
  };
  const handleRecategorizeAll = () => {
    if (
      !window.confirm(
        "Re-run AI categorization on ALL transactions? Existing categories are overwritten, but your manual choices are kept.",
      )
    )
      return;
    runAction("all", "AI is re-categorizing everything…", recategorizeAll);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/under-finance"
            aria-label="Back to UnderFinance"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] no-underline"
          >
            ←
          </Link>
          <h1 className="font-mono text-2xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_12px_rgba(0,255,170,0.4)]">
            <span className="opacity-70">{">"}</span> Review
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runAction("cat", "AI is categorizing transactions…", categorizeAll)}
            disabled={busy !== ""}
            className="rounded-lg border border-[rgba(0,255,170,0.25)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] disabled:opacity-40 cursor-pointer"
          >
            {busy === "cat" ? "Categorizing…" : "✦ Auto-categorize"}
          </button>
          <button
            type="button"
            onClick={() => runAction("tr", "Detecting transfers…", detectTransfers)}
            disabled={busy !== ""}
            className="rounded-lg border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-cyan)] transition-all duration-300 hover:border-[rgba(0,229,255,0.5)] disabled:opacity-40 cursor-pointer"
          >
            {busy === "tr" ? "Detecting…" : "⇄ Detect transfers"}
          </button>
          <button
            type="button"
            onClick={handleRecategorizeAll}
            disabled={busy !== ""}
            title="Re-run AI categorization on every transaction"
            className="rounded-lg border border-[rgba(180,107,255,0.3)] bg-[rgba(180,107,255,0.08)] px-3 py-1.5 font-mono text-xs text-[#b46bff] transition-all duration-300 hover:border-[rgba(180,107,255,0.6)] disabled:opacity-40 cursor-pointer"
          >
            {busy === "all" ? "Re-categorizing…" : "↻ Re-categorize all"}
          </button>
        </div>
      </header>

      <FinanceNav reviewCount={filter === "review" ? transactions.length : undefined} />

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tab active={filter === "review"} onClick={() => setFilter("review")}>
          Needs review
        </Tab>
        <Tab active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Tab>

        {filter === "all" && (
          <div className="ml-auto flex items-center gap-2">
            <MonthButton label="‹" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
            <span className="min-w-[8rem] text-center font-mono text-sm text-[var(--text-primary)]">
              {formatMonthLabel(month)}
            </span>
            <MonthButton
              label="›"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={month >= currentMonth()}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-3 font-mono text-sm text-[var(--neon-magenta)]">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-3 sm:p-5">
        <p className="mb-3 px-1 font-mono text-xs text-[var(--text-muted)]">
          {loading
            ? "Loading…"
            : `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`}
        </p>

        {!loading && transactions.length === 0 ? (
          <p className="py-12 text-center font-mono text-sm text-[var(--text-muted)]">
            {filter === "review"
              ? "Nothing to review — everything is categorized. 🎉"
              : "No transactions in this month."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[rgba(0,255,170,0.05)]">
            {transactions.map((tx) => (
              <ReviewRow
                key={tx.id}
                tx={tx}
                categories={categories}
                onAssign={handleAssign}
                onToggleTransfer={handleToggleTransfer}
                onDelete={handleDelete}
                onAnalyze={handleAnalyze}
              />
            ))}
          </ul>
        )}
      </section>

      <ActivityIndicator />
    </div>
  );
}

function ReviewRow({
  tx,
  categories,
  onAssign,
  onToggleTransfer,
  onDelete,
  onAnalyze,
}: {
  tx: Transaction;
  categories: Category[];
  onAssign: (id: number, categoryId: number) => Promise<void>;
  onToggleTransfer: (id: number, isTransfer: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onAnalyze: (id: number) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const isIncome = tx.kind === "income";
  const options = categories.filter((c) => c.kind === tx.kind);

  const wrap = (fn: () => Promise<void>) => {
    setPending(true);
    void fn().finally(() => setPending(false));
  };

  return (
    <li
      className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3 ${tx.is_transfer ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-3 sm:flex-1">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--text-primary)]">
          {tx.description || (isIncome ? "Income" : "Expense")}
        </p>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {formatDayLabel(tx.date)}
          {tx.is_transfer && <span className="text-[var(--neon-cyan)]"> · ⇄ Transfer</span>}
        </p>
      </div>

      <span
        className="shrink-0 text-right font-mono text-sm font-semibold sm:w-24"
        style={{
          color: tx.is_transfer
            ? "var(--text-muted)"
            : isIncome
              ? "var(--neon-primary)"
              : "var(--text-primary)",
        }}
      >
        {isIncome ? "+" : "−"}
        {formatMoneyExact(tx.amount)}
      </span>
      </div>

      <div className="flex items-center gap-2">
      <select
        value={tx.category_id ?? ""}
        disabled={pending || tx.is_transfer}
        onChange={(e) => {
          if (e.target.value) wrap(() => onAssign(tx.id, Number(e.target.value)));
        }}
        className="min-w-0 flex-1 rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[rgba(0,255,170,0.4)] disabled:opacity-40 sm:w-40 sm:flex-none [&>option]:bg-[var(--bg-surface)]"
      >
        <option value="" disabled>
          {pending ? "Saving…" : "Uncategorized"}
        </option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => wrap(() => onAnalyze(tx.id))}
        disabled={pending || tx.is_transfer}
        aria-label="Analyse with AI"
        title="Let AI analyse and (re)categorize this transaction"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#b46bff] transition-all duration-200 hover:bg-[rgba(180,107,255,0.12)] disabled:opacity-40 cursor-pointer"
      >
        {pending ? (
          <span className="font-mono text-xs">…</span>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3zM18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9L18 14z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={() => wrap(() => onToggleTransfer(tx.id, !tx.is_transfer))}
        disabled={pending}
        aria-label={tx.is_transfer ? "Unmark transfer" : "Mark as transfer"}
        title={tx.is_transfer ? "Unmark transfer" : "Mark as transfer (exclude from stats)"}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-all duration-200 hover:bg-[rgba(0,229,255,0.1)] hover:text-[var(--neon-cyan)] disabled:opacity-40 cursor-pointer ${
          tx.is_transfer ? "text-[var(--neon-cyan)]" : "text-[var(--text-muted)]"
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
        onClick={() => wrap(() => onDelete(tx.id))}
        disabled={pending}
        aria-label="Delete transaction"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-all duration-200 hover:bg-[rgba(255,0,170,0.1)] hover:text-[var(--neon-magenta)] disabled:opacity-40 cursor-pointer"
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
      </div>
    </li>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-4 py-1.5 font-mono text-xs transition-all duration-200 cursor-pointer"
      style={{
        borderColor: active ? "rgba(0,255,170,0.4)" : "rgba(255,255,255,0.08)",
        background: active ? "rgba(0,255,170,0.08)" : "transparent",
        color: active ? "var(--neon-primary)" : "var(--text-muted)",
      }}
    >
      {children}
    </button>
  );
}

function MonthButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(0,255,170,0.12)] bg-[var(--bg-card)] font-mono text-[var(--text-secondary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
    >
      {label}
    </button>
  );
}
