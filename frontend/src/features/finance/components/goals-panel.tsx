"use client";

import { useState, useTransition } from "react";
import type { Goal } from "../models/finance.model";
import { createGoal, updateGoal, deleteGoal } from "../actions/mutations";
import { formatMoney } from "../lib/format";

interface GoalsPanelProps {
  goals: Goal[];
  onChanged: () => void;
}

const GOAL_COLORS = ["#00e5ff", "#00ffaa", "#b46bff", "#ffb000", "#ff5e7e"];

export function GoalsPanel({ goals, onChanged }: GoalsPanelProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    const targetVal = parseFloat(target);
    if (!name.trim() || !targetVal || targetVal <= 0) return;
    startTransition(async () => {
      await createGoal({
        name: name.trim(),
        target_amount: targetVal,
        current_amount: parseFloat(current) || 0,
        color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
        target_date: null,
      });
      setAdding(false);
      setName("");
      setTarget("");
      setCurrent("");
      onChanged();
    });
  };

  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Savings
          Goals
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="rounded-lg border border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.06)] px-3 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.5)] cursor-pointer"
        >
          {adding ? "Cancel" : "+ New goal"}
        </button>
      </div>

      {adding && (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-surface)] p-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Goal name (e.g. Emergency fund)"
            maxLength={80}
            className="bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target €"
              className="w-1/2 rounded-lg border border-[rgba(0,255,170,0.15)] px-2 py-1.5 bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
            <input
              type="number"
              min="0"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="Saved so far €"
              className="w-1/2 rounded-lg border border-[rgba(0,255,170,0.15)] px-2 py-1.5 bg-transparent font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending}
            className="self-end rounded-lg border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-4 py-1.5 font-mono text-xs text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] disabled:opacity-40 cursor-pointer"
          >
            Create
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-[var(--text-muted)]">
          No goals yet. Set a target to start saving toward it.
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {goals.map((g) => (
            <GoalRow key={g.id} goal={g} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

function GoalRow({ goal, onChanged }: { goal: Goal; onChanged: () => void }) {
  const [contrib, setContrib] = useState("");
  const [isPending, startTransition] = useTransition();
  const pct = goal.target_amount > 0
    ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
    : 0;
  const done = goal.current_amount >= goal.target_amount;

  const handleAddFunds = () => {
    const value = parseFloat(contrib);
    if (!value) return;
    startTransition(async () => {
      await updateGoal(goal.id, {
        current_amount: goal.current_amount + value,
      });
      setContrib("");
      onChanged();
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await deleteGoal(goal.id);
      onChanged();
    });
  };

  return (
    <li className="group">
      <div className="mb-1.5 flex items-center justify-between font-mono text-xs">
        <span className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: goal.color, boxShadow: `0 0 6px ${goal.color}` }}
          />
          {goal.name}
          {done && <span className="text-[var(--neon-primary)]">✓</span>}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-primary)]">
            {formatMoney(goal.current_amount)} / {formatMoney(goal.target_amount)}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            aria-label="Delete goal"
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
            width: `${pct}%`,
            background: goal.color,
            boxShadow: `0 0 8px ${goal.color}`,
          }}
        />
      </div>
      {!done && (
        <div className="mt-2 flex items-center gap-2 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          <input
            type="number"
            min="0"
            value={contrib}
            onChange={(e) => setContrib(e.target.value)}
            placeholder="Add funds €"
            className="w-28 rounded-md border border-[rgba(0,255,170,0.15)] px-2 py-1 bg-transparent font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
          <button
            type="button"
            onClick={handleAddFunds}
            disabled={isPending}
            className="rounded-md border border-[rgba(0,255,170,0.25)] px-2.5 py-1 font-mono text-xs text-[var(--neon-primary)] transition-all duration-200 hover:border-[rgba(0,255,170,0.5)] disabled:opacity-40 cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </li>
  );
}
