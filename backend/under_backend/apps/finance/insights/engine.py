"""Layer-1 savings advisor: compute EVERY number deterministically from the DB.

This always runs (no LLM) and is the permanent fallback. The optional phraser
(phraser.py) only rewrites the ``template_text`` of these insights — it never
computes anything, so figures can never be invented.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass, field
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from ..categorization.normalize import normalize_description
from ..models import Budget, SavingsGoal, Transaction, TxKind

SAVINGS_TARGET_PCT = 20  # 50/30/20 rule


@dataclass
class Insight:
    type: str
    category: str | None
    template_text: str
    projected_monthly_saving: float = 0.0
    severity: int = 0  # tiebreaker when projected savings are equal
    numbers: list[str] = field(default_factory=list)


def _eur(value) -> str:
    return f"€{round(float(value or 0)):,}"


def _month_bounds(month: str | None) -> tuple[datetime.date, datetime.date, str]:
    if month:
        year, mon = (int(p) for p in month.split("-"))
        start = datetime.date(year, mon, 1)
    else:
        start = timezone.localdate().replace(day=1)
    nxt = (start.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
    return start, nxt, start.strftime("%Y-%m")


def _shift_month(d: datetime.date, delta: int) -> datetime.date:
    index = d.year * 12 + (d.month - 1) + delta
    return datetime.date(index // 12, index % 12 + 1, 1)


def _f(v) -> float:
    return float(v or 0)


def _totals(user, start, nxt) -> tuple[float, float]:
    income = expense = 0.0
    for row in (
        Transaction.objects.filter(
            user=user, date__gte=start, date__lt=nxt, is_transfer=False
        )
        .values("kind")
        .annotate(total=Sum("amount"))
    ):
        if row["kind"] == TxKind.INCOME:
            income = _f(row["total"])
        else:
            expense = _f(row["total"])
    return income, expense


def _category_totals(user, start, nxt) -> list[dict]:
    return list(
        Transaction.objects.filter(
            user=user, kind=TxKind.EXPENSE, date__gte=start, date__lt=nxt, is_transfer=False
        )
        .values("category_id", "category__name")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )


def _detect_recurring(user, ref: datetime.date) -> tuple[int, float]:
    """Group recent expenses by normalized merchant; count those that recur
    roughly monthly with stable amounts. Returns (count, monthly_total)."""
    window_start = ref - datetime.timedelta(days=95)
    rows = Transaction.objects.filter(
        user=user, kind=TxKind.EXPENSE, date__gte=window_start, date__lte=ref, is_transfer=False
    ).values_list("description", "amount", "date")

    groups: dict[str, list[tuple[Decimal, datetime.date]]] = {}
    for desc, amount, date in rows:
        key = normalize_description(desc or "")
        if key:
            groups.setdefault(key, []).append((amount, date))

    count = 0
    monthly_total = 0.0
    for items in groups.values():
        if len(items) < 2:
            continue
        amounts = [_f(a) for a, _ in items]
        avg = sum(amounts) / len(amounts)
        if avg <= 0:
            continue
        # amounts stable within 15%
        if any(abs(a - avg) > 0.15 * avg for a in amounts):
            continue
        dates = sorted(d for _, d in items)
        gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        avg_gap = sum(gaps) / len(gaps)
        if 24 <= avg_gap <= 35:
            count += 1
            monthly_total += avg
    return count, monthly_total


def build_insights(user, month: str | None = None) -> list[Insight]:
    start, nxt, _ = _month_bounds(month)
    prev_start = _shift_month(start, -1)
    income, expense = _totals(user, start, nxt)
    prev_income, prev_expense = _totals(user, prev_start, start)
    net = income - expense

    insights: list[Insight] = []

    # 1. Overspend vs budget
    cat_totals = _category_totals(user, start, nxt)
    spent_by_cat = {r["category_id"]: _f(r["total"]) for r in cat_totals}
    for b in Budget.objects.filter(user=user).select_related("category"):
        limit = _f(b.amount)
        spent = spent_by_cat.get(b.category_id, 0.0)
        if limit > 0 and spent > limit:
            over = spent - limit
            pct = round((spent - limit) / limit * 100)
            insights.append(
                Insight(
                    type="overspend",
                    category=b.category.name,
                    template_text=(
                        f"You spent {_eur(spent)} on {b.category.name} this month, "
                        f"{pct}% over your {_eur(limit)} budget. Trimming back to "
                        f"budget would free up {_eur(over)} per month."
                    ),
                    projected_monthly_saving=over,
                    severity=3,
                )
            )

    # 2. Savings rate vs 20% target
    if income > 0:
        rate = round(net / income * 100)
        if rate < SAVINGS_TARGET_PCT:
            gap_amount = income * (SAVINGS_TARGET_PCT / 100) - net
            insights.append(
                Insight(
                    type="savings_rate",
                    category=None,
                    template_text=(
                        f"Your savings rate this month was {rate}% "
                        f"({_eur(net)} saved of {_eur(income)} income). The 50/30/20 "
                        f"guideline suggests {SAVINGS_TARGET_PCT}%, so saving "
                        f"{_eur(gap_amount)} more per month would get you there."
                    ),
                    projected_monthly_saving=max(0.0, gap_amount),
                    severity=2,
                )
            )
        else:
            insights.append(
                Insight(
                    type="savings_rate",
                    category=None,
                    template_text=(
                        f"Nice — your savings rate this month was {rate}% "
                        f"({_eur(net)} saved of {_eur(income)} income), at or above "
                        f"the {SAVINGS_TARGET_PCT}% target."
                    ),
                    severity=1,
                )
            )

    # 3. Recurring charges
    rec_count, rec_monthly = _detect_recurring(user, nxt - datetime.timedelta(days=1))
    if rec_count > 0 and rec_monthly > 0:
        yearly = rec_monthly * 12
        insights.append(
            Insight(
                type="recurring",
                category=None,
                template_text=(
                    f"We detected {rec_count} recurring charges totaling "
                    f"{_eur(rec_monthly)} per month. Cancelling the ones you no "
                    f"longer use could save up to {_eur(yearly)} per year."
                ),
                projected_monthly_saving=rec_monthly,
                severity=2,
            )
        )

    # 4. Month-over-month category jumps
    prev_cat = {
        r["category_id"]: _f(r["total"])
        for r in _category_totals(user, prev_start, start)
    }
    for r in cat_totals:
        name = r["category__name"] or "Uncategorized"
        now_v = _f(r["total"])
        prev_v = prev_cat.get(r["category_id"], 0.0)
        if prev_v > 0 and now_v > prev_v:
            delta = now_v - prev_v
            pct = round(delta / prev_v * 100)
            if pct >= 20 and delta >= 20:
                insights.append(
                    Insight(
                        type="category_jump",
                        category=name,
                        template_text=(
                            f"Your {name} spending rose {pct}% vs last month "
                            f"(+{_eur(delta)}). Watch this category to protect your savings."
                        ),
                        projected_monthly_saving=delta,
                        severity=1,
                    )
                )

    # 5. Savings-goal pacing
    if net > 0:
        for g in SavingsGoal.objects.filter(user=user):
            remaining = _f(g.target_amount) - _f(g.current_amount)
            if remaining > 0:
                months = max(1, round(remaining / net))
                insights.append(
                    Insight(
                        type="goal_pacing",
                        category=None,
                        template_text=(
                            f"At your current savings of {_eur(net)} per month, you'll "
                            f"reach your {g.name} goal of {_eur(g.target_amount)} in "
                            f"about {months} months."
                        ),
                        severity=0,
                    )
                )

    # Rank: biggest projected monthly saving first, then severity.
    insights.sort(
        key=lambda i: (i.projected_monthly_saving, i.severity), reverse=True
    )
    return insights[:6]
