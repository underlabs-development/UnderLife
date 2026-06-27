"use server";

import type { Aspsp, BankConnection } from "../models/finance.model";
import { apiFetch, FinanceError } from "./client";

export type ActionResult<T> = { data: T } | { error: string };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { data: await fn() };
  } catch (e) {
    return { error: e instanceof FinanceError ? e.message : "Something went wrong." };
  }
}

export async function listAspsps(country = "IT"): Promise<ActionResult<Aspsp[]>> {
  return run(() => apiFetch<Aspsp[]>("/banksync", `/aspsps?country=${country}`));
}

export async function listBankConnections(): Promise<BankConnection[]> {
  return apiFetch<BankConnection[]>("/banksync", "/connections");
}

export async function startBankConnection(
  aspspName: string,
  country = "IT",
): Promise<ActionResult<{ redirect_url: string }>> {
  return run(() =>
    apiFetch<{ redirect_url: string }>("/banksync", "/connections/start", {
      method: "POST",
      body: JSON.stringify({ aspsp_name: aspspName, country }),
    }),
  );
}

export async function syncBankConnection(
  id: number,
): Promise<ActionResult<{ imported: number; accounts: number }>> {
  return run(() =>
    apiFetch<{ imported: number; accounts: number }>(
      "/banksync",
      `/connections/${id}/sync`,
      { method: "POST" },
    ),
  );
}

export async function deleteBankConnection(
  id: number,
): Promise<ActionResult<{ detail: string }>> {
  return run(() =>
    apiFetch<{ detail: string }>("/banksync", `/connections/${id}`, {
      method: "DELETE",
    }),
  );
}
