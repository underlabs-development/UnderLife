"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Category, TxKind } from "../models/finance.model";
import { getFinanceSettings, listCategories } from "../actions/queries";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  updateFinanceSettings,
} from "../actions/mutations";
import { CategoryIcon, ICON_KEYS } from "./category-icon";
import { FinanceNav } from "./finance-nav";
import { ActivityIndicator } from "./activity-indicator";
import { track } from "../stores/activity-store";

const PALETTE = [
  "#00ffaa", "#00e5ff", "#ff00aa", "#ffb000",
  "#b46bff", "#ff5e7e", "#3dd6a0", "#8ba4a0",
];

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [aiCreate, setAiCreate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) setLoading(true);
      try {
        const [cats, settings] = await track(
          "Loading categories…",
          Promise.all([listCategories(), getFinanceSettings()]),
        );
        if (!active) return;
        setCategories(cats);
        setAiCreate(settings.ai_create_categories);
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
  }, [reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  const handleToggleAi = (enabled: boolean) => {
    setAiCreate(enabled);
    void updateFinanceSettings({ ai_create_categories: enabled });
  };

  const expense = categories.filter((c) => c.kind === "expense");
  const income = categories.filter((c) => c.kind === "income");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-center gap-4">
        <Link
          href="/under-finance"
          aria-label="Back to UnderFinance"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] no-underline"
        >
          ←
        </Link>
        <h1 className="font-mono text-2xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_12px_rgba(0,255,170,0.4)]">
          <span className="opacity-70">{">"}</span> Categories
        </h1>
      </header>

      <FinanceNav />

      {error && (
        <p className="mb-4 rounded-xl border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-3 font-mono text-sm text-[var(--neon-magenta)]">
          {error}
        </p>
      )}

      {/* AI toggle */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-5">
        <div>
          <p className="font-mono text-sm text-[var(--text-primary)]">
            ✦ Let AI create new categories
          </p>
          <p className="mt-0.5 font-mono text-xs text-[var(--text-muted)]">
            When auto-categorizing, the AI may add a new category if none fit.
          </p>
        </div>
        <Switch checked={aiCreate} onChange={handleToggleAi} />
      </section>

      <AddCategoryForm onCreated={refresh} />

      {loading ? (
        <p className="py-10 text-center font-mono text-sm text-[var(--text-muted)]">
          Loading…
        </p>
      ) : (
        <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
          <CategoryGroup title="Expenses" items={expense} onChanged={refresh} />
          <CategoryGroup title="Income" items={income} onChanged={refresh} />
        </div>
      )}

      <ActivityIndicator />
    </div>
  );
}

function AddCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [kind, setKind] = useState<TxKind>("expense");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState("tag");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    void (async () => {
      const res = await createCategory({
        name: name.trim(),
        kind,
        color,
        icon,
        description: description.trim(),
      });
      setSaving(false);
      if ("error" in res) {
        setError(res.error);
      } else {
        setName("");
        setDescription("");
        onCreated();
      }
    })();
  };

  return (
    <section className="mb-6 rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-5">
      <h2 className="mb-4 font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
        <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> New category
      </h2>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["expense", "income"] as TxKind[]).map((k) => {
            const active = kind === k;
            const c = k === "income" ? "0,255,170" : "255,0,170";
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="rounded-lg border px-3 py-1.5 font-mono text-xs capitalize transition-all duration-200 cursor-pointer"
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
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Category name"
            maxLength={60}
            className="flex-1 rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[rgba(0,255,170,0.4)]"
          />
        </div>

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description for the AI — e.g. “supermarkets and food shopping” (optional)"
          maxLength={200}
          className="w-full rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-surface)] px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[rgba(0,255,170,0.4)]"
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className="shrink-0 cursor-pointer transition-transform duration-150"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 9999,
                  boxSizing: "border-box",
                  background: c,
                  boxShadow: color === c ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${c}` : "none",
                  transform: color === c ? "scale(1.1)" : "scale(1)",
                }}
              />
            ))}
          </div>
          <IconPicker icon={icon} color={color} onSelect={setIcon} />
          <button
            type="button"
            onClick={submit}
            disabled={saving || !name.trim()}
            className="ml-auto rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-4 py-2 font-mono text-sm font-semibold text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] disabled:opacity-40 cursor-pointer"
          >
            {saving ? "Adding…" : "+ Add"}
          </button>
        </div>

        {error && (
          <p className="font-mono text-xs text-[var(--neon-magenta)]">{error}</p>
        )}
      </div>
    </section>
  );
}

function IconPicker({
  icon,
  color,
  onSelect,
}: {
  icon: string;
  color: string;
  onSelect: (i: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ICON_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onSelect(k)}
          aria-label={`Icon ${k}`}
          className="flex shrink-0 items-center justify-center rounded-md border transition-colors duration-150 cursor-pointer"
          style={{
            width: 28,
            height: 28,
            boxSizing: "border-box",
            borderColor: icon === k ? `${color}80` : "rgba(255,255,255,0.08)",
            background: icon === k ? `${color}1a` : "transparent",
            color: icon === k ? color : "var(--text-muted)",
          }}
        >
          <CategoryIcon icon={k} className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

function CategoryGroup({
  title,
  items,
  onChanged,
}: {
  title: string;
  items: Category[];
  onChanged: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[rgba(0,255,170,0.08)] bg-[var(--bg-card)] p-4 sm:p-5">
      <h2 className="mb-4 font-mono text-sm tracking-widest text-[var(--text-secondary)] uppercase">
        {title}{" "}
        <span className="text-[var(--text-muted)]">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="py-4 text-center font-mono text-xs text-[var(--text-muted)]">
          None yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((c) => (
            <CategoryRow key={c.id} cat={c} onChanged={onChanged} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryRow({ cat, onChanged }: { cat: Category; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [description, setDescription] = useState(cat.description);
  const [color, setColor] = useState(cat.color);
  const [pending, setPending] = useState(false);

  const save = () => {
    if (!name.trim()) return;
    setPending(true);
    void (async () => {
      await updateCategory(cat.id, {
        name: name.trim(),
        color,
        description: description.trim(),
      });
      setPending(false);
      setEditing(false);
      onChanged();
    })();
  };

  const remove = () => {
    setPending(true);
    void (async () => {
      await deleteCategory(cat.id);
      onChanged();
    })();
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-3 rounded-lg border border-[rgba(0,255,170,0.15)] bg-[var(--bg-surface)] p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="rounded-md border border-[rgba(0,255,170,0.15)] bg-transparent px-2 py-1 font-mono text-sm text-[var(--text-primary)] outline-none"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description for the AI (optional)"
          maxLength={200}
          className="rounded-md border border-[rgba(0,255,170,0.15)] bg-transparent px-2 py-1 font-mono text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 px-1 py-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              className="shrink-0 cursor-pointer"
              style={{
                width: 20,
                height: 20,
                borderRadius: 9999,
                boxSizing: "border-box",
                background: c,
                boxShadow: color === c ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${c}` : "none",
              }}
            />
          ))}
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-[rgba(0,255,170,0.15)] px-2 py-1 font-mono text-xs text-[var(--text-muted)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-md border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-2 py-1 font-mono text-xs text-[var(--neon-primary)] disabled:opacity-40 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-[var(--bg-card-hover)]">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        style={{ borderColor: `${cat.color}40`, background: `${cat.color}12`, color: cat.color }}
      >
        <CategoryIcon icon={cat.icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-[var(--text-primary)]">{cat.name}</span>
          {!cat.is_default && (
            <span className="shrink-0 rounded-full bg-[rgba(0,229,255,0.1)] px-1.5 text-[10px] text-[var(--neon-cyan)]">
              custom
            </span>
          )}
        </div>
        {cat.description && (
          <span className="block truncate font-mono text-xs text-[var(--text-muted)]">
            {cat.description}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setName(cat.name);
          setDescription(cat.description);
          setColor(cat.color);
          setEditing(true);
        }}
        aria-label="Edit category"
        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] opacity-60 transition-all duration-200 group-hover:opacity-100 hover:text-[var(--neon-primary)] cursor-pointer sm:opacity-0"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete category"
        className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] opacity-60 transition-all duration-200 group-hover:opacity-100 hover:text-[var(--neon-magenta)] disabled:opacity-40 cursor-pointer sm:opacity-0"
      >
        ✕
      </button>
    </li>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="shrink-0 cursor-pointer transition-colors duration-300"
      style={{
        boxSizing: "border-box",
        width: 44,
        height: 24,
        borderRadius: 9999,
        border: `1px solid ${checked ? "rgba(0,255,170,0.6)" : "rgba(255,255,255,0.2)"}`,
        background: checked ? "rgba(0,255,170,0.2)" : "rgba(255,255,255,0.05)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        padding: "0 3px",
      }}
    >
      <span
        className="transition-all duration-300"
        style={{
          width: 16,
          height: 16,
          borderRadius: 9999,
          background: checked ? "var(--neon-primary)" : "var(--text-muted)",
          boxShadow: checked ? "0 0 8px var(--neon-primary)" : "none",
        }}
      />
    </button>
  );
}
