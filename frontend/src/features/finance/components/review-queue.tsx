"use client";

import { useTransition } from "react";
import type { Category, Transaction } from "../models/finance.model";
import { formatMoneyExact, formatDayLabel } from "../lib/format";

interface ReviewQueueProps {
  items: Transaction[];
  categories: Category[];
  onAutoCategorize: () => Promise<void>;
  onAssign: (id: number, categoryId: number) => Promise<void>;
}

export function ReviewQueue({
  items,
  categories,
  onAutoCategorize,
  onAssign,
}: ReviewQueueProps) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) return null;

  const handleAuto = () => {
    startTransition(async () => {
      await onAutoCategorize();
    });
  };

  return (
    <section className="rounded-2xl border border-[rgba(255,176,0,0.2)] bg-[rgba(255,176,0,0.04)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-sm tracking-widest text-[#ffb000] uppercase">
          <span className="opacity-70">{">"}</span> Needs Review ({items.length})
        </h2>
        <button
          type="button"
          onClick={handleAuto}
          disabled={isPending}
          className="rounded-lg border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:shadow-[0_0_12px_rgba(0,255,170,0.2)] disabled:opacity-40 cursor-pointer"
        >
          {isPending ? "Categorizing…" : "✦ Auto-categorize"}
        </button>
      </div>

      <ul className="flex max-h-[20rem] flex-col gap-1 overflow-y-auto pr-1">
        {items.map((tx) => (
          <ReviewRow key={tx.id} tx={tx} categories={categories} onAssign={onAssign} />
        ))}
      </ul>
    </section>
  );
}

function ReviewRow({
  tx,
  categories,
  onAssign,
}: {
  tx: Transaction;
  categories: Category[];
  onAssign: (id: number, categoryId: number) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const options = categories.filter((c) => c.kind === tx.kind);

  const handleChange = (value: string) => {
    if (!value) return;
    startTransition(async () => {
      await onAssign(tx.id, Number(value));
    });
  };

  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-200 hover:bg-[var(--bg-card-hover)]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--text-primary)]">
          {tx.description || (tx.kind === "income" ? "Income" : "Expense")}
        </p>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {formatDayLabel(tx.date)} · {formatMoneyExact(tx.amount)}
        </p>
      </div>
      <select
        defaultValue=""
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="shrink-0 rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-surface)] px-2 py-1.5 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[rgba(0,255,170,0.4)] disabled:opacity-40 [&>option]:bg-[var(--bg-surface)]"
      >
        <option value="">{isPending ? "Saving…" : "Pick category…"}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </li>
  );
}
