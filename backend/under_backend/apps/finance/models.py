from django.conf import settings
from django.db import models


class TxKind(models.TextChoices):
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"


class TxSource(models.TextChoices):
    MANUAL = "manual", "Manual"
    ENABLEBANKING = "enablebanking", "Enable Banking"
    IMPORT = "import", "File import"


class Category(models.Model):
    """A spending or income bucket. Seeded with defaults on first use, fully
    customizable per user thereafter."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_categories"
    )
    name = models.CharField(max_length=60)
    kind = models.CharField(max_length=8, choices=TxKind.choices, default=TxKind.EXPENSE)
    # Hex colour used to tint charts and badges, e.g. "#00ffaa".
    color = models.CharField(max_length=9, default="#00ffaa")
    # Short icon key resolved client-side (see category-icon component).
    icon = models.CharField(max_length=24, default="tag")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("kind", "name")
        constraints = [
            models.UniqueConstraint(
                fields=("user", "name", "kind"), name="uniq_category_per_user"
            )
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.kind})"


class Transaction(models.Model):
    """A single income or expense entry (manual)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_transactions"
    )
    kind = models.CharField(max_length=8, choices=TxKind.choices, default=TxKind.EXPENSE)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    description = models.CharField(max_length=200, blank=True)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    # Provenance + de-duplication (for bank import / file import).
    source = models.CharField(max_length=16, choices=TxSource.choices, default=TxSource.MANUAL)
    # Provider's stable id for the entry (e.g. Enable Banking entry_reference), when present.
    external_id = models.CharField(max_length=128, blank=True, default="")
    # Composite hash used to dedupe feeds that lack stable ids; blank for manual rows.
    dedup_hash = models.CharField(max_length=64, blank=True, default="", db_index=True)

    class Meta:
        ordering = ("-date", "-created_at")
        indexes = [models.Index(fields=("user", "date"))]
        constraints = [
            # Never import the same provider entry twice.
            models.UniqueConstraint(
                fields=("user", "source", "external_id"),
                condition=~models.Q(external_id=""),
                name="uniq_tx_source_external",
            ),
            # Idempotent re-imports for feeds without stable ids.
            models.UniqueConstraint(
                fields=("user", "dedup_hash"),
                condition=~models.Q(dedup_hash=""),
                name="uniq_tx_dedup_hash",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.kind} {self.amount} on {self.date}"


class Budget(models.Model):
    """A recurring monthly spending limit for an expense category."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_budgets"
    )
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="budgets"
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("category__name",)
        constraints = [
            models.UniqueConstraint(
                fields=("user", "category"), name="uniq_budget_per_category"
            )
        ]

    def __str__(self) -> str:
        return f"Budget {self.amount} for {self.category}"


class SavingsGoal(models.Model):
    """A target the user is saving toward (emergency fund, vacation, ...)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_goals"
    )
    name = models.CharField(max_length=80)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    color = models.CharField(max_length=9, default="#00e5ff")
    target_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.name}: {self.current_amount}/{self.target_amount}"


class CatSource(models.TextChoices):
    CACHE = "cache", "Cache"
    RULE = "rule", "Rule"
    LLM = "llm", "LLM"
    MANUAL = "manual", "Manual"


class CategorizedDescription(models.Model):
    """Tier-0 categorization cache: a normalized description -> category, so an
    identical merchant string never needs the LLM (or a rule) twice."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_cat_cache"
    )
    normalized_hash = models.CharField(max_length=64, db_index=True)
    # Kept for debugging / inspection; the hash is what we match on.
    normalized_text = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name="cached_descriptions"
    )
    confidence = models.FloatField(default=1.0)
    source = models.CharField(max_length=8, choices=CatSource.choices, default=CatSource.LLM)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("user", "normalized_hash"), name="uniq_cat_cache_per_user"
            )
        ]

    def __str__(self) -> str:
        return f"{self.normalized_text} -> {self.category} ({self.source})"


class CategorizationRule(models.Model):
    """Tier-1 user-defined rule: if the description matches, assign a category.
    Evaluated before the LLM, in ascending ``priority`` order."""

    class MatchType(models.TextChoices):
        CONTAINS = "contains", "Contains"
        REGEX = "regex", "Regex"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_rules"
    )
    match_type = models.CharField(
        max_length=8, choices=MatchType.choices, default=MatchType.CONTAINS
    )
    pattern = models.CharField(max_length=200)
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="rules"
    )
    priority = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("priority", "id")

    def __str__(self) -> str:
        return f"[{self.match_type}] {self.pattern} -> {self.category}"


class FinanceSettings(models.Model):
    """Per-user toggles for the AI features."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="finance_settings"
    )
    # Below this LLM confidence, a transaction is left uncategorized for review.
    confidence_threshold = models.FloatField(default=0.7)
    # When on, the savings advisor rewrites the deterministic tips with the LLM.
    ai_phrasing_enabled = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"FinanceSettings({self.user})"
