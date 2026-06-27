"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  Advisor,
  BankConnection,
  Budget,
  Category,
  CategorizationRule,
  Goal,
  Summary,
  Transaction,
} from "../models/finance.model";
import { listBankConnections } from "../actions/banksync";
import {
  getFinanceSettings,
  getInsights,
  getSummary,
  listBudgets,
  listCategories,
  listGoals,
  listNeedsReview,
  listRules,
  listTransactions,
} from "../actions/queries";
import {
  categorizeAll,
  deleteTransaction,
  detectTransfers,
  setTransactionCategory,
  setTransactionTransfer,
  updateFinanceSettings,
} from "../actions/mutations";
import {
  currentMonth,
  formatMonthLabel,
  shiftMonth,
} from "../lib/format";
import { StatCard } from "./stat-card";
import { MoneyFlowChart } from "./money-flow-chart";
import { CashflowChart } from "./cashflow-chart";
import { CategoryDonut } from "./category-donut";
import { TransactionsPanel } from "./transactions-panel";
import { BudgetsPanel } from "./budgets-panel";
import { GoalsPanel } from "./goals-panel";
import { AddTransactionModal } from "./add-transaction-modal";
import { AdvisorPanel } from "./advisor-panel";
import { ReviewQueue } from "./review-queue";
import { CategoryRules } from "./category-rules";
import { BankConnections } from "./bank-connections";
import { FinanceNav } from "./finance-nav";
import { ActivityIndicator } from "./activity-indicator";
import { track } from "../stores/activity-store";

export function FinanceDashboard() {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [needsReview, setNeedsReview] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [bankConnections, setBankConnections] = useState<BankConnection[]>([]);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [advisorBusy, setAdvisorBusy] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bankNotice, setBankNotice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  // Bumping this re-runs the loader effects without calling setState in handlers.
  const [reloadKey, setReloadKey] = useState(0);

  // Core data (fast).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [sum, txs, cats, buds, gls, review, rls, settings, banks] =
          await track(
            "Loading finances…",
            Promise.all([
              getSummary(month),
              listTransactions(month),
              listCategories(),
              listBudgets(),
              listGoals(),
              listNeedsReview(),
              listRules(),
              getFinanceSettings(),
              listBankConnections().catch(() => [] as BankConnection[]),
            ]),
          );
        if (!active) return;
        setSummary(sum);
        setTransactions(txs);
        setCategories(cats);
        setBudgets(buds);
        setGoals(gls);
        setNeedsReview(review);
        setRules(rls);
        setAiEnabled(settings.ai_phrasing_enabled);
        setBankConnections(banks);
        setError("");
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Failed to load finance data.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  // Advisor loaded separately — phrasing via the local model can take a moment.
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) setAdvisorBusy(true);
      try {
        const adv = await track("Generating savings insights…", getInsights(month));
        if (active) setAdvisor(adv);
      } catch {
        if (active) setAdvisor(null);
      } finally {
        if (active) setAdvisorBusy(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [month, reloadKey]);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  // Surface the result of a bank connect redirect (?bank=connected|error).
  useEffect(() => {
    const bank = new URLSearchParams(window.location.search).get("bank");
    if (!bank) return;
    window.history.replaceState({}, "", window.location.pathname);
    queueMicrotask(() => {
      if (bank === "connected") {
        setBankNotice("Bank connected — click “Sync now” to import your transactions.");
        setReloadKey((k) => k + 1);
      } else if (bank === "error") {
        setBankNotice("Bank connection failed or was cancelled. Please try again.");
      }
    });
  }, []);

  const handleDeleteTransaction = async (id: number) => {
    await deleteTransaction(id);
    refresh();
  };

  const handleTransactionCreated = async () => {
    await track("AI is categorizing transactions…", categorizeAll());
    refresh();
  };

  const handleAutoCategorize = async () => {
    await track("AI is categorizing transactions…", categorizeAll());
    refresh();
  };

  const handleAssignCategory = async (id: number, categoryId: number) => {
    await setTransactionCategory(id, categoryId);
    refresh();
  };

  const handleToggleTransfer = async (id: number, isTransfer: boolean) => {
    await setTransactionTransfer(id, isTransfer);
    refresh();
  };

  const handleDetectTransfers = async () => {
    await track("Detecting transfers…", detectTransfers());
    refresh();
  };

  const handleToggleAi = (enabled: boolean) => {
    setAiEnabled(enabled); // optimistic
    void (async () => {
      await updateFinanceSettings({ ai_phrasing_enabled: enabled });
      refresh();
    })();
  };

  const budgetIdByCategory = Object.fromEntries(
    budgets.map((b) => [b.category_id, b.id]),
  ) as Record<number, number>;
  const expenseCategories = categories.filter((c) => c.kind === "expense");

  if (loading && !summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6">
        <p className="font-mono text-sm text-[var(--text-secondary)]">
          <span className="text-[var(--neon-primary)] opacity-70">{">"}</span> Loading
          finances…
        </p>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-[rgba(0,255,170,0.1)]">
          <div
            className="h-full w-1/3 rounded-full bg-[var(--neon-primary)]"
            style={{ animation: "slideLoader 1.5s ease-in-out infinite" }}
          />
        </div>
        <style>{`@keyframes slideLoader {0%{transform:translateX(-100%)}50%{transform:translateX(300%)}100%{transform:translateX(-100%)}}`}</style>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <header
        className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        style={{ animation: "fadeIn 0.6s ease-out both" }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to launcher"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(0,255,170,0.12)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] no-underline"
          >
            ←
          </Link>
          <h1 className="font-mono text-2xl font-bold text-[var(--neon-primary)] drop-shadow-[0_0_12px_rgba(0,255,170,0.4)]">
            <span className="opacity-70">{">"}</span> UnderFinance
          </h1>
        </div>

        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <MonthButton label="‹" onClick={() => setMonth((m) => shiftMonth(m, -1))} />
          <span className="min-w-0 flex-1 text-center font-mono text-sm text-[var(--text-primary)] sm:min-w-[9rem] sm:flex-none">
            {formatMonthLabel(month)}
          </span>
          <MonthButton
            label="›"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= currentMonth()}
          />
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="ml-1 shrink-0 rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.08)] px-3 py-2 font-mono text-sm font-semibold whitespace-nowrap text-[var(--neon-primary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.6)] hover:bg-[rgba(0,255,170,0.15)] hover:shadow-[0_0_16px_rgba(0,255,170,0.15)] cursor-pointer sm:ml-2 sm:px-4"
          >
            <span className="sm:hidden">+ Add</span>
            <span className="hidden sm:inline">+ Transaction</span>
          </button>
        </div>
      </header>

      <FinanceNav reviewCount={needsReview.length} />

      {error && (
        <p className="mb-6 rounded-xl border border-[rgba(255,0,170,0.3)] bg-[rgba(255,0,170,0.05)] px-4 py-3 font-mono text-sm text-[var(--neon-magenta)]">
          {error}
        </p>
      )}

      {bankNotice && (
        <p className="mb-6 rounded-xl border border-[rgba(0,255,170,0.3)] bg-[rgba(0,255,170,0.05)] px-4 py-3 font-mono text-sm text-[var(--neon-primary)]">
          {bankNotice}
        </p>
      )}

      {summary && (
        <>
          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <StatCard label="Income" delta={summary.income} accent="#00ffaa" index={0} />
            <StatCard
              label="Expenses"
              delta={summary.expense}
              accent="#ff00aa"
              invertDelta
              index={1}
            />
            <StatCard
              label="Net Cash Flow"
              delta={summary.net}
              accent="#00e5ff"
              index={2}
            />
            <StatCard
              label="Savings Rate"
              rawValue={`${summary.savings_rate}%`}
              accent="#b46bff"
              index={3}
            />
          </div>

          {/* Review queue (self-hides when empty) */}
          {needsReview.length > 0 && (
            <div className="mb-6">
              <ReviewQueue
                items={needsReview}
                categories={categories}
                onAutoCategorize={handleAutoCategorize}
                onAssign={handleAssignCategory}
              />
            </div>
          )}

          {/* Savings advisor */}
          <div className="mb-6">
            <AdvisorPanel
              advisor={advisor}
              aiEnabled={aiEnabled}
              onToggleAi={handleToggleAi}
              busy={advisorBusy}
            />
          </div>

          {/* Money flow (Sankey) */}
          <div className="mb-6">
            <MoneyFlowChart
              income={summary.income.value}
              expense={summary.expense.value}
              net={summary.net.value}
              categories={summary.by_category}
            />
          </div>

          {/* Charts */}
          <div className="mb-6 grid gap-6 md:grid-cols-2">
            <CashflowChart points={summary.cashflow} activeMonth={summary.month} />
            <CategoryDonut
              slices={summary.by_category}
              total={summary.expense.value}
            />
          </div>

          {/* Bank connections */}
          <div className="mb-6">
            <BankConnections connections={bankConnections} onChanged={refresh} />
          </div>

          {/* Transactions + budgets/goals */}
          <div className="grid gap-6 lg:grid-cols-2">
            <TransactionsPanel
              transactions={transactions}
              onAdd={() => setModalOpen(true)}
              onDelete={handleDeleteTransaction}
              onToggleTransfer={handleToggleTransfer}
              onDetectTransfers={handleDetectTransfers}
            />
            <div className="flex flex-col gap-6">
              <BudgetsPanel
                budgets={summary.budgets}
                budgetIdByCategory={budgetIdByCategory}
                expenseCategories={expenseCategories}
                onChanged={refresh}
              />
              <GoalsPanel goals={goals} onChanged={refresh} />
              <CategoryRules
                rules={rules}
                categories={categories}
                onChanged={refresh}
              />
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <AddTransactionModal
          categories={categories}
          onClose={() => setModalOpen(false)}
          onCreated={handleTransactionCreated}
        />
      )}

      <ActivityIndicator />
    </div>
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
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(0,255,170,0.12)] bg-[var(--bg-card)] font-mono text-[var(--text-secondary)] transition-all duration-300 hover:border-[rgba(0,255,170,0.3)] hover:text-[var(--neon-primary)] disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
    >
      {label}
    </button>
  );
}
