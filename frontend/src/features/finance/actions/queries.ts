"use server";

import type {
  Advisor,
  Budget,
  Category,
  CategorizationRule,
  FinanceSettings,
  Goal,
  Summary,
  Transaction,
} from "../models/finance.model";
import { financeFetch } from "./client";

export async function getSummary(month: string): Promise<Summary> {
  return financeFetch<Summary>(`/summary?month=${month}`);
}

export async function listTransactions(month: string): Promise<Transaction[]> {
  return financeFetch<Transaction[]>(`/transactions?month=${month}`);
}

export async function listCategories(): Promise<Category[]> {
  return financeFetch<Category[]>(`/categories`);
}

export async function listBudgets(): Promise<Budget[]> {
  return financeFetch<Budget[]>(`/budgets`);
}

export async function listGoals(): Promise<Goal[]> {
  return financeFetch<Goal[]>(`/goals`);
}

export async function getInsights(month: string): Promise<Advisor> {
  return financeFetch<Advisor>(`/insights?month=${month}`);
}

export async function listNeedsReview(): Promise<Transaction[]> {
  return financeFetch<Transaction[]>(`/needs-review`);
}

export async function listRules(): Promise<CategorizationRule[]> {
  return financeFetch<CategorizationRule[]>(`/rules`);
}

export async function getFinanceSettings(): Promise<FinanceSettings> {
  return financeFetch<FinanceSettings>(`/settings`);
}
