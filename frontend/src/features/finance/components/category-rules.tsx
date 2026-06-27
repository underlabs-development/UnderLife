"use client";

import { useState, useTransition } from "react";
import type { Category, CategorizationRule } from "../models/finance.model";
import { createRule, deleteRule } from "../actions/mutations";

interface CategoryRulesProps {
  rules: CategorizationRule[];
  categories: Category[];
  onChanged: () => void;
}

export function CategoryRules({ rules, categories, onChanged }: CategoryRulesProps) {
  const [adding, setAdding] = useState(false);
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [matchType, setMatchType] = useState<"contains" | "regex">("contains");
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!pattern.trim() || categoryId === "") return;
    startTransition(async () => {
      await createRule({
        pattern: pattern.trim(),
        category_id: Number(categoryId),
        match_type: matchType,
      });
      setPattern("");
      setCategoryId("");
      setAdding(false);
      onChanged();
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteRule(id);
      onChanged();
    });
  };

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Auto-rules
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] cursor-pointer"
        >
          {adding ? "Cancel" : "+ Rule"}
        </button>
      </div>

      {adding && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-surface)] p-3">
          <div className="flex items-center gap-2">
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as "contains" | "regex")}
              className="rounded-lg border border-[rgba(0,255,170,0.15)] px-2 py-1.5 bg-transparent font-mono text-xs text-[var(--text-primary)] outline-none [&>option]:bg-[var(--bg-surface)]"
            >
              <option value="contains">contains</option>
              <option value="regex">regex</option>
            </select>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. ESSELUNGA"
              className="flex-1 rounded-lg border border-[rgba(0,255,170,0.15)] px-2 py-1.5 bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--text-muted)]">→</span>
            <select
              value={categoryId}
              onChange={(e) =>
                setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="flex-1 rounded-lg border border-[rgba(0,255,170,0.15)] px-2 py-1.5 bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [&>option]:bg-[var(--bg-surface)]"
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              className="rounded-lg border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] disabled:opacity-40 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <p className="py-6 text-center font-mono text-xs text-[var(--text-muted)]">
          No rules yet. Rules match before the AI, e.g. “contains ESSELUNGA → Groceries”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map((r) => (
            <li
              key={r.id}
              className="group flex items-center gap-2 font-mono text-xs text-[var(--text-secondary)]"
            >
              <span className="rounded-md border border-[rgba(0,255,170,0.12)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                {r.match_type}
              </span>
              <span className="truncate text-[var(--text-primary)]">{r.pattern}</span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="flex-1 truncate text-[var(--neon-primary)]">
                {r.category_name}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                aria-label="Delete rule"
                className="text-[var(--text-muted)] opacity-60 transition-opacity duration-200 group-hover:opacity-100 hover:text-[var(--neon-magenta)] cursor-pointer sm:opacity-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
