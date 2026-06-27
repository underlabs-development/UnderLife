/** Display currency for UnderFinance. Change here to re-denominate the app. */
export const CURRENCY = "EUR";
const LOCALE = "en-US";

/** Compact, no-decimals form for summary cards: "€1,235". */
export function formatMoney(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Full two-decimal form for transaction lists: "€1,234.50". */
export function formatMoneyExact(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** "2026-06" -> "June 2026" */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(LOCALE, {
    month: "long",
    year: "numeric",
  });
}

/** "2026-06-14" -> "14 Jun" */
export function formatDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
  });
}

/** Current month as "YYYY-MM" (browser-local). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Today as "YYYY-MM-DD" (browser-local). */
export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Shift a "YYYY-MM" string by ``delta`` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}
