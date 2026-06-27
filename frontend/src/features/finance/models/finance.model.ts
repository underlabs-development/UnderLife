export type TxKind = "income" | "expense";

export interface Category {
  id: number;
  name: string;
  kind: TxKind;
  color: string;
  icon: string;
  description: string;
  is_default: boolean;
}

export interface Transaction {
  id: number;
  kind: TxKind;
  amount: number;
  category_id: number | null;
  category_name: string | null;
  category_color: string | null;
  description: string;
  date: string; // YYYY-MM-DD
  is_transfer: boolean;
}

export interface Budget {
  id: number;
  category_id: number;
  category_name: string;
  category_color: string;
  amount: number;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  target_date: string | null;
}

export interface StatDelta {
  value: number;
  change_pct: number | null;
}

export interface CashflowPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
}

export interface CategorySlice {
  category_id: number | null;
  name: string;
  color: string;
  total: number;
  pct: number;
}

export interface BudgetProgress {
  category_id: number;
  name: string;
  color: string;
  limit: number;
  spent: number;
  pct: number;
}

export interface Summary {
  month: string;
  income: StatDelta;
  expense: StatDelta;
  net: StatDelta;
  savings_rate: number;
  by_category: CategorySlice[];
  cashflow: CashflowPoint[];
  budgets: BudgetProgress[];
}

export interface CategorizationRule {
  id: number;
  pattern: string;
  match_type: "contains" | "regex";
  category_id: number;
  category_name: string;
  priority: number;
}

export interface Insight {
  type: string;
  category: string | null;
  text: string;
  projected_monthly_saving: number;
}

export interface Advisor {
  month: string;
  ai_phrased: boolean;
  insights: Insight[];
}

export interface CategorizeResult {
  assigned: number;
  needs_review: number;
}

export interface FinanceSettings {
  confidence_threshold: number;
  ai_phrasing_enabled: boolean;
  ai_create_categories: boolean;
}

export interface Aspsp {
  name: string;
  country: string;
  logo: string | null;
}

export interface BankAccountInfo {
  id: number;
  name: string;
  iban_masked: string;
  currency: string;
}

export type BankConnectionStatus = "active" | "expired" | "error" | "pending";

export interface BankConnection {
  id: number;
  aspsp_name: string;
  status: BankConnectionStatus;
  consent_valid_until: string | null;
  last_synced_at: string | null;
  error_detail: string;
  accounts: BankAccountInfo[];
}
