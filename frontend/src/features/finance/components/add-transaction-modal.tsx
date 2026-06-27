"use client";

import { useMemo, useState, useTransition } from "react";
import type { Category, TxKind } from "../models/finance.model";
import { createTransaction } from "../actions/mutations";
import { todayIso } from "../lib/format";

interface AddTransactionModalProps {
  categories: Category[];
  onClose: () => void;
  onCreated: () => void;
}

export function AddTransactionModal({
  categories,
  onClose,
  onCreated,
}: AddTransactionModalProps) {
  const [kind, setKind] = useState<TxKind>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayIso());
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const visibleCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind],
  );

  const handleKind = (next: TxKind) => {
    setKind(next);
    setCategoryId("");
  };

  const handleSubmit = () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    startTransition(async () => {
      const result = await createTransaction({
        kind,
        amount: value,
        category_id: categoryId === "" ? null : Number(categoryId),
        description: description.trim(),
        date,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        onCreated();
        onClose();
      }
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const accent = kind === "income" ? "var(--neon-primary)" : "var(--neon-magenta)";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
      style={{ animation: "backdropFadeIn 0.3s ease-out both" }}
    >
      <div className="absolute inset-0 bg-[rgba(6,6,12,0.7)] backdrop-blur-sm" />

      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[rgba(0,255,170,0.1)] bg-[rgba(12,12,20,0.95)] backdrop-blur-md"
        style={{ animation: "slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div className="flex items-center justify-between border-b border-[rgba(0,255,170,0.08)] p-6">
          <h2 className="font-mono text-lg font-semibold text-[var(--text-primary)]">
            <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> New
            Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(0,255,170,0.1)] text-[var(--text-muted)] transition-all duration-200 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeWidth="2"
                stroke="currentColor"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Kind toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as TxKind[]).map((k) => {
              const active = kind === k;
              const c = k === "income" ? "0,255,170" : "255,0,170";
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKind(k)}
                  className="rounded-xl border py-2.5 font-mono text-sm capitalize transition-all duration-200 cursor-pointer"
                  style={{
                    borderColor: active ? `rgba(${c},0.5)` : "rgba(255,255,255,0.08)",
                    background: active ? `rgba(${c},0.1)` : "transparent",
                    color: active ? `rgb(${c})` : "var(--text-muted)",
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>

          <Field label="Amount">
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg" style={{ color: accent }}>
                €
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full bg-transparent font-mono text-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
              />
            </div>
          </Field>

          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [&>option]:bg-[var(--bg-surface)]"
            >
              <option value="">Uncategorized</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Weekly groceries"
              maxLength={200}
              className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [color-scheme:dark]"
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-2.5 font-mono text-xs text-[var(--neon-magenta)]">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-[rgba(0,255,170,0.08)] p-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] py-3 font-mono text-sm font-semibold text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:bg-[rgba(0,255,170,0.15)] hover:shadow-[0_0_20px_rgba(0,255,170,0.15)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
          >
            {isPending ? "Saving..." : "Save Transaction"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-card)] px-4 py-2.5 transition-colors duration-200 focus-within:border-[rgba(0,255,170,0.4)]">
      <span className="mb-1 block font-mono text-xs text-[var(--neon-primary)] opacity-60">
        {label}
      </span>
      {children}
    </div>
  );
}
