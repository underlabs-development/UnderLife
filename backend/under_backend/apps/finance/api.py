"""UnderFinance API — manual personal-finance tracking.

All endpoints are scoped to the authenticated user (``request.auth``).
Money is exchanged as JSON numbers (floats) for ergonomics; it is stored as
``Decimal`` in the DB.
"""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import List, Optional

from ninja import Router, Schema
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth

from django.db.models import Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .categorization import cascade
from .defaults import seed_default_categories
from .insights.engine import build_insights
from .insights.phraser import phrase_insights
from .models import (
    Budget,
    Category,
    CategorizationRule,
    CatSource,
    SavingsGoal,
    Transaction,
    TxKind,
)

finance_router = Router(auth=JWTAuth())


# ── helpers ─────────────────────────────────────────────────────────────────

def _month_bounds(month: Optional[str]) -> tuple[datetime.date, datetime.date, str]:
    """Return (first_day, first_day_of_next_month, "YYYY-MM") for a month string."""
    if month:
        try:
            year, mon = (int(p) for p in month.split("-"))
            start = datetime.date(year, mon, 1)
        except (ValueError, TypeError):
            raise HttpError(400, "Invalid month format, expected YYYY-MM.")
    else:
        today = timezone.localdate()
        start = today.replace(day=1)
    nxt = (start.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
    return start, nxt, start.strftime("%Y-%m")


def _shift_month(d: datetime.date, delta: int) -> datetime.date:
    """First day of the month ``delta`` months away from ``d``."""
    index = d.year * 12 + (d.month - 1) + delta
    return datetime.date(index // 12, index % 12 + 1, 1)


def _f(value) -> float:
    return float(value or 0)


# ── schemas ─────────────────────────────────────────────────────────────────

class CategoryIn(Schema):
    name: str
    kind: str = TxKind.EXPENSE
    color: str = "#00ffaa"
    icon: str = "tag"
    description: str = ""


class CategoryPatch(Schema):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None


class CategoryOut(Schema):
    id: int
    name: str
    kind: str
    color: str
    icon: str
    description: str
    is_default: bool


class TransactionIn(Schema):
    kind: str
    amount: float
    category_id: Optional[int] = None
    description: str = ""
    date: datetime.date


class TransactionPatch(Schema):
    kind: Optional[str] = None
    amount: Optional[float] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    date: Optional[datetime.date] = None
    is_transfer: Optional[bool] = None


class TransactionOut(Schema):
    id: int
    kind: str
    amount: float
    category_id: Optional[int]
    category_name: Optional[str]
    category_color: Optional[str]
    description: str
    date: datetime.date
    is_transfer: bool = False


class BudgetIn(Schema):
    category_id: int
    amount: float


class BudgetOut(Schema):
    id: int
    category_id: int
    category_name: str
    category_color: str
    amount: float


class GoalIn(Schema):
    name: str
    target_amount: float
    current_amount: float = 0
    color: str = "#00e5ff"
    target_date: Optional[datetime.date] = None


class GoalPatch(Schema):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    color: Optional[str] = None
    target_date: Optional[datetime.date] = None


class GoalOut(Schema):
    id: int
    name: str
    target_amount: float
    current_amount: float
    color: str
    target_date: Optional[datetime.date]


class MessageSchema(Schema):
    detail: str


# ── serializers ──────────────────────────────────────────────────────────────

def _tx_out(tx: Transaction) -> TransactionOut:
    return TransactionOut(
        id=tx.id,
        kind=tx.kind,
        amount=_f(tx.amount),
        category_id=tx.category_id,
        category_name=tx.category.name if tx.category else None,
        category_color=tx.category.color if tx.category else None,
        description=tx.description,
        date=tx.date,
        is_transfer=tx.is_transfer,
    )


def _budget_out(b: Budget) -> BudgetOut:
    return BudgetOut(
        id=b.id,
        category_id=b.category_id,
        category_name=b.category.name,
        category_color=b.category.color,
        amount=_f(b.amount),
    )


# ── categories ───────────────────────────────────────────────────────────────

@finance_router.get("/categories", response=List[CategoryOut])
def list_categories(request):
    seed_default_categories(request.auth)
    return list(Category.objects.filter(user=request.auth))


@finance_router.post("/categories", response=CategoryOut)
def create_category(request, payload: CategoryIn):
    if payload.kind not in TxKind.values:
        raise HttpError(400, "kind must be 'income' or 'expense'.")
    if Category.objects.filter(
        user=request.auth, name=payload.name, kind=payload.kind
    ).exists():
        raise HttpError(400, "A category with that name already exists.")
    return Category.objects.create(user=request.auth, **payload.dict())


@finance_router.patch("/categories/{cat_id}", response=CategoryOut)
def update_category(request, cat_id: int, payload: CategoryPatch):
    cat = get_object_or_404(Category, id=cat_id, user=request.auth)
    for field, value in payload.dict(exclude_none=True).items():
        setattr(cat, field, value)
    cat.save()
    return cat


@finance_router.delete("/categories/{cat_id}", response=MessageSchema)
def delete_category(request, cat_id: int):
    cat = get_object_or_404(Category, id=cat_id, user=request.auth)
    cat.delete()
    return MessageSchema(detail="Category deleted.")


# ── transactions ─────────────────────────────────────────────────────────────

@finance_router.get("/transactions", response=List[TransactionOut])
def list_transactions(
    request,
    month: Optional[str] = None,
    kind: Optional[str] = None,
    category_id: Optional[int] = None,
    limit: int = 200,
):
    qs = Transaction.objects.filter(user=request.auth).select_related("category")
    if month:
        start, nxt, _ = _month_bounds(month)
        qs = qs.filter(date__gte=start, date__lt=nxt)
    if kind:
        qs = qs.filter(kind=kind)
    if category_id:
        qs = qs.filter(category_id=category_id)
    return [_tx_out(tx) for tx in qs[: max(1, min(limit, 1000))]]


@finance_router.post("/transactions", response=TransactionOut)
def create_transaction(request, payload: TransactionIn):
    if payload.kind not in TxKind.values:
        raise HttpError(400, "kind must be 'income' or 'expense'.")
    if payload.amount <= 0:
        raise HttpError(400, "Amount must be greater than zero.")
    category = None
    if payload.category_id is not None:
        category = get_object_or_404(Category, id=payload.category_id, user=request.auth)
    tx = Transaction.objects.create(
        user=request.auth,
        kind=payload.kind,
        amount=Decimal(str(payload.amount)),
        category=category,
        description=payload.description,
        date=payload.date,
    )
    return _tx_out(tx)


@finance_router.patch("/transactions/{tx_id}", response=TransactionOut)
def update_transaction(request, tx_id: int, payload: TransactionPatch):
    tx = get_object_or_404(Transaction, id=tx_id, user=request.auth)
    data = payload.dict(exclude_unset=True)
    category_changed = "category_id" in data
    if category_changed:
        cid = data.pop("category_id")
        tx.category = (
            get_object_or_404(Category, id=cid, user=request.auth) if cid else None
        )
    if "amount" in data:
        if data["amount"] <= 0:
            raise HttpError(400, "Amount must be greater than zero.")
        tx.amount = Decimal(str(data.pop("amount")))
    transfer_value = data.pop("is_transfer", None)
    for field, value in data.items():
        setattr(tx, field, value)
    tx.save()
    # Mark/unmark transfer (and the linked leg) so both drop out of stats.
    if transfer_value is not None:
        from .transfers import set_transfer

        set_transfer(tx, transfer_value)
    # A manual categorization is the strongest signal — teach the cache so
    # identical descriptions resolve automatically next time.
    if category_changed and tx.category is not None:
        cascade.remember_categorization(
            request.auth, tx.description, tx.category, CatSource.MANUAL
        )
    return _tx_out(tx)


@finance_router.delete("/transactions/{tx_id}", response=MessageSchema)
def delete_transaction(request, tx_id: int):
    tx = get_object_or_404(Transaction, id=tx_id, user=request.auth)
    tx.delete()
    return MessageSchema(detail="Transaction deleted.")


# ── budgets ──────────────────────────────────────────────────────────────────

@finance_router.get("/budgets", response=List[BudgetOut])
def list_budgets(request):
    qs = Budget.objects.filter(user=request.auth).select_related("category")
    return [_budget_out(b) for b in qs]


@finance_router.post("/budgets", response=BudgetOut)
def create_budget(request, payload: BudgetIn):
    category = get_object_or_404(
        Category, id=payload.category_id, user=request.auth
    )
    budget, _ = Budget.objects.update_or_create(
        user=request.auth,
        category=category,
        defaults={"amount": Decimal(str(payload.amount))},
    )
    return _budget_out(budget)


@finance_router.delete("/budgets/{budget_id}", response=MessageSchema)
def delete_budget(request, budget_id: int):
    budget = get_object_or_404(Budget, id=budget_id, user=request.auth)
    budget.delete()
    return MessageSchema(detail="Budget deleted.")


# ── savings goals ────────────────────────────────────────────────────────────

@finance_router.get("/goals", response=List[GoalOut])
def list_goals(request):
    return list(SavingsGoal.objects.filter(user=request.auth))


@finance_router.post("/goals", response=GoalOut)
def create_goal(request, payload: GoalIn):
    return SavingsGoal.objects.create(
        user=request.auth,
        name=payload.name,
        target_amount=Decimal(str(payload.target_amount)),
        current_amount=Decimal(str(payload.current_amount)),
        color=payload.color,
        target_date=payload.target_date,
    )


@finance_router.patch("/goals/{goal_id}", response=GoalOut)
def update_goal(request, goal_id: int, payload: GoalPatch):
    goal = get_object_or_404(SavingsGoal, id=goal_id, user=request.auth)
    data = payload.dict(exclude_unset=True)
    for field in ("target_amount", "current_amount"):
        if field in data and data[field] is not None:
            data[field] = Decimal(str(data[field]))
    for field, value in data.items():
        setattr(goal, field, value)
    goal.save()
    return goal


@finance_router.delete("/goals/{goal_id}", response=MessageSchema)
def delete_goal(request, goal_id: int):
    goal = get_object_or_404(SavingsGoal, id=goal_id, user=request.auth)
    goal.delete()
    return MessageSchema(detail="Goal deleted.")


# ── analytics summary ────────────────────────────────────────────────────────

class StatDelta(Schema):
    value: float
    # % change vs previous month; null when previous month had nothing.
    change_pct: Optional[float]


class CashflowPoint(Schema):
    month: str
    label: str
    income: float
    expense: float


class CategorySlice(Schema):
    category_id: Optional[int]
    name: str
    color: str
    total: float
    pct: float


class BudgetProgress(Schema):
    category_id: int
    name: str
    color: str
    limit: float
    spent: float
    pct: float


class SummaryOut(Schema):
    month: str
    income: StatDelta
    expense: StatDelta
    net: StatDelta
    savings_rate: float
    by_category: List[CategorySlice]
    cashflow: List[CashflowPoint]
    budgets: List[BudgetProgress]


def _totals_for(user, start: datetime.date, nxt: datetime.date) -> tuple[float, float]:
    rows = (
        Transaction.objects.filter(
            user=user, date__gte=start, date__lt=nxt, is_transfer=False
        )
        .values("kind")
        .annotate(total=Sum("amount"))
    )
    income = expense = 0.0
    for row in rows:
        if row["kind"] == TxKind.INCOME:
            income = _f(row["total"])
        else:
            expense = _f(row["total"])
    return income, expense


def _delta(current: float, previous: float) -> StatDelta:
    change = None if previous == 0 else round((current - previous) / previous * 100, 1)
    return StatDelta(value=round(current, 2), change_pct=change)


@finance_router.get("/summary", response=SummaryOut)
def summary(request, month: Optional[str] = None):
    user = request.auth
    start, nxt, month_str = _month_bounds(month)
    prev_start = _shift_month(start, -1)

    income, expense = _totals_for(user, start, nxt)
    prev_income, prev_expense = _totals_for(user, prev_start, start)

    net = income - expense
    prev_net = prev_income - prev_expense
    savings_rate = round((net / income * 100), 1) if income > 0 else 0.0

    # Spending breakdown by category (expenses only) for the month.
    cat_rows = (
        Transaction.objects.filter(
            user=user, kind=TxKind.EXPENSE, date__gte=start, date__lt=nxt, is_transfer=False
        )
        .values("category_id", "category__name", "category__color")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )
    by_category = [
        CategorySlice(
            category_id=row["category_id"],
            name=row["category__name"] or "Uncategorized",
            color=row["category__color"] or "#8ba4a0",
            total=_f(row["total"]),
            pct=round(_f(row["total"]) / expense * 100, 1) if expense > 0 else 0.0,
        )
        for row in cat_rows
    ]

    # 6-month cash-flow trend ending on the selected month.
    cashflow: List[CashflowPoint] = []
    for i in range(5, -1, -1):
        m_start = _shift_month(start, -i)
        m_next = _shift_month(start, -i + 1)
        m_income, m_expense = _totals_for(user, m_start, m_next)
        cashflow.append(
            CashflowPoint(
                month=m_start.strftime("%Y-%m"),
                label=m_start.strftime("%b"),
                income=round(m_income, 2),
                expense=round(m_expense, 2),
            )
        )

    # Budget progress for the selected month.
    spent_by_cat = {
        row["category_id"]: _f(row["total"]) for row in cat_rows
    }
    budgets: List[BudgetProgress] = []
    for b in Budget.objects.filter(user=user).select_related("category"):
        limit = _f(b.amount)
        spent = spent_by_cat.get(b.category_id, 0.0)
        budgets.append(
            BudgetProgress(
                category_id=b.category_id,
                name=b.category.name,
                color=b.category.color,
                limit=limit,
                spent=spent,
                pct=round(spent / limit * 100, 1) if limit > 0 else 0.0,
            )
        )

    return SummaryOut(
        month=month_str,
        income=_delta(income, prev_income),
        expense=_delta(expense, prev_expense),
        net=_delta(net, prev_net),
        savings_rate=savings_rate,
        by_category=by_category,
        cashflow=cashflow,
        budgets=budgets,
    )


# ── AI: categorization ───────────────────────────────────────────────────────

class CategorizeResult(Schema):
    assigned: int
    needs_review: int


@finance_router.post("/categorize", response=CategorizeResult)
def categorize(request):
    """Run the cascade (cache -> rules -> local LLM) over all uncategorized
    transactions for the user."""
    result = cascade.categorize_uncategorized(request.auth)
    return CategorizeResult(**result)


@finance_router.post("/recategorize", response=CategorizeResult)
def recategorize(request):
    """Re-run AI categorization over ALL transactions, overwriting existing
    categories (manual ones are preserved)."""
    return CategorizeResult(**cascade.recategorize_all(request.auth))


@finance_router.post("/transactions/{tx_id}/recategorize", response=TransactionOut)
def recategorize_transaction(request, tx_id: int):
    """Force a fresh AI analysis of one transaction."""
    tx = get_object_or_404(Transaction, id=tx_id, user=request.auth)
    cascade.recategorize_one(tx)
    tx.refresh_from_db()
    return _tx_out(tx)


@finance_router.get("/needs-review", response=List[TransactionOut])
def needs_review(request):
    qs = (
        Transaction.objects.filter(
            user=request.auth, category__isnull=True, is_transfer=False
        )
        .select_related("category")
        .order_by("-date", "-created_at")
    )
    return [_tx_out(tx) for tx in qs]


class DetectTransfersResult(Schema):
    paired: int


@finance_router.post("/detect-transfers", response=DetectTransfersResult)
def detect_transfers_endpoint(request):
    from .transfers import detect_transfers

    return DetectTransfersResult(paired=detect_transfers(request.auth))


# ── AI: categorization rules ─────────────────────────────────────────────────

class RuleIn(Schema):
    pattern: str
    category_id: int
    match_type: str = "contains"
    priority: int = 100


class RuleOut(Schema):
    id: int
    pattern: str
    match_type: str
    category_id: int
    category_name: str
    priority: int


def _rule_out(r: CategorizationRule) -> RuleOut:
    return RuleOut(
        id=r.id,
        pattern=r.pattern,
        match_type=r.match_type,
        category_id=r.category_id,
        category_name=r.category.name,
        priority=r.priority,
    )


@finance_router.get("/rules", response=List[RuleOut])
def list_rules(request):
    qs = CategorizationRule.objects.filter(user=request.auth).select_related("category")
    return [_rule_out(r) for r in qs]


@finance_router.post("/rules", response=RuleOut)
def create_rule(request, payload: RuleIn):
    if payload.match_type not in CategorizationRule.MatchType.values:
        raise HttpError(400, "match_type must be 'contains' or 'regex'.")
    if not payload.pattern.strip():
        raise HttpError(400, "Pattern cannot be empty.")
    category = get_object_or_404(Category, id=payload.category_id, user=request.auth)
    rule = CategorizationRule.objects.create(
        user=request.auth,
        pattern=payload.pattern.strip(),
        match_type=payload.match_type,
        category=category,
        priority=payload.priority,
    )
    return _rule_out(rule)


@finance_router.delete("/rules/{rule_id}", response=MessageSchema)
def delete_rule(request, rule_id: int):
    rule = get_object_or_404(CategorizationRule, id=rule_id, user=request.auth)
    rule.delete()
    return MessageSchema(detail="Rule deleted.")


# ── AI: savings advisor ──────────────────────────────────────────────────────

class InsightOut(Schema):
    type: str
    category: Optional[str]
    text: str
    projected_monthly_saving: float


class AdvisorOut(Schema):
    month: str
    ai_phrased: bool
    insights: List[InsightOut]


@finance_router.get("/insights", response=AdvisorOut)
def insights(request, month: Optional[str] = None):
    _, _, month_str = _month_bounds(month)
    items = build_insights(request.auth, month)
    settings = cascade.get_settings(request.auth)

    ai_phrased = settings.ai_phrasing_enabled and bool(items)
    texts = phrase_insights(items) if ai_phrased else [i.template_text for i in items]

    return AdvisorOut(
        month=month_str,
        ai_phrased=ai_phrased,
        insights=[
            InsightOut(
                type=it.type,
                category=it.category,
                text=txt,
                projected_monthly_saving=round(it.projected_monthly_saving, 2),
            )
            for it, txt in zip(items, texts)
        ],
    )


# ── AI: settings ─────────────────────────────────────────────────────────────

class SettingsSchema(Schema):
    confidence_threshold: float
    ai_phrasing_enabled: bool
    ai_create_categories: bool


class SettingsPatch(Schema):
    confidence_threshold: Optional[float] = None
    ai_phrasing_enabled: Optional[bool] = None
    ai_create_categories: Optional[bool] = None


def _settings_out(s) -> SettingsSchema:
    return SettingsSchema(
        confidence_threshold=s.confidence_threshold,
        ai_phrasing_enabled=s.ai_phrasing_enabled,
        ai_create_categories=s.ai_create_categories,
    )


@finance_router.get("/settings", response=SettingsSchema)
def get_settings_endpoint(request):
    return _settings_out(cascade.get_settings(request.auth))


@finance_router.patch("/settings", response=SettingsSchema)
def update_settings_endpoint(request, payload: SettingsPatch):
    s = cascade.get_settings(request.auth)
    data = payload.dict(exclude_none=True)
    if "confidence_threshold" in data:
        s.confidence_threshold = max(0.0, min(1.0, data["confidence_threshold"]))
    if "ai_phrasing_enabled" in data:
        s.ai_phrasing_enabled = data["ai_phrasing_enabled"]
    if "ai_create_categories" in data:
        s.ai_create_categories = data["ai_create_categories"]
    s.save()
    return _settings_out(s)
