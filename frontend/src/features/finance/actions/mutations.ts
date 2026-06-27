"use server";

import type {
  Budget,
  Category,
  CategorizationRule,
  CategorizeResult,
  FinanceSettings,
  Goal,
  Transaction,
  TxKind,
} from "../models/finance.model";
import { financeFetch, FinanceError } from "./client";

export type ActionResult<T> = { data: T } | { error: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e instanceof FinanceError ? e.message : "Something went wrong." };
  }
}

// ── transactions ──────────────────────────────────────────────────────────

export async function createTransaction(input: {
  kind: TxKind;
  amount: number;
  category_id: number | null;
  description: string;
  date: string;
}): Promise<ActionResult<Transaction>> {
  return run(() =>
    financeFetch<Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteTransaction(id: number): Promise<ActionResult<{ detail: string }>> {
  return run(() =>
    financeFetch<{ detail: string }>(`/transactions/${id}`, { method: "DELETE" }),
  );
}

export async function setTransactionCategory(
  id: number,
  categoryId: number,
): Promise<ActionResult<Transaction>> {
  return run(() =>
    financeFetch<Transaction>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ category_id: categoryId }),
    }),
  );
}

// ── AI: categorization + rules + advisor ────────────────────────────────────

export async function categorizeAll(): Promise<ActionResult<CategorizeResult>> {
  return run(() => financeFetch<CategorizeResult>("/categorize", { method: "POST" }));
}

export async function createRule(input: {
  pattern: string;
  category_id: number;
  match_type: "contains" | "regex";
}): Promise<ActionResult<CategorizationRule>> {
  return run(() =>
    financeFetch<CategorizationRule>("/rules", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteRule(id: number): Promise<ActionResult<{ detail: string }>> {
  return run(() =>
    financeFetch<{ detail: string }>(`/rules/${id}`, { method: "DELETE" }),
  );
}

export async function updateFinanceSettings(
  input: Partial<FinanceSettings>,
): Promise<ActionResult<FinanceSettings>> {
  return run(() =>
    financeFetch<FinanceSettings>("/settings", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}

// ── categories ────────────────────────────────────────────────────────────

export async function createCategory(input: {
  name: string;
  kind: TxKind;
  color: string;
  icon: string;
}): Promise<ActionResult<Category>> {
  return run(() =>
    financeFetch<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteCategory(id: number): Promise<ActionResult<{ detail: string }>> {
  return run(() =>
    financeFetch<{ detail: string }>(`/categories/${id}`, { method: "DELETE" }),
  );
}

// ── budgets ───────────────────────────────────────────────────────────────

export async function upsertBudget(input: {
  category_id: number;
  amount: number;
}): Promise<ActionResult<Budget>> {
  return run(() =>
    financeFetch<Budget>("/budgets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteBudget(id: number): Promise<ActionResult<{ detail: string }>> {
  return run(() =>
    financeFetch<{ detail: string }>(`/budgets/${id}`, { method: "DELETE" }),
  );
}

// ── goals ─────────────────────────────────────────────────────────────────

export async function createGoal(input: {
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  target_date: string | null;
}): Promise<ActionResult<Goal>> {
  return run(() =>
    financeFetch<Goal>("/goals", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function updateGoal(
  id: number,
  input: Partial<{ current_amount: number; target_amount: number; name: string }>,
): Promise<ActionResult<Goal>> {
  return run(() =>
    financeFetch<Goal>(`/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteGoal(id: number): Promise<ActionResult<{ detail: string }>> {
  return run(() =>
    financeFetch<{ detail: string }>(`/goals/${id}`, { method: "DELETE" }),
  );
}
