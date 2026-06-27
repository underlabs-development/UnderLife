"""The categorization cascade: cache -> rules -> local LLM.

Designed so the deterministic tiers (cache + rules) carry most of the load and
the LLM is only consulted for genuinely novel descriptions. Every successful
categorization (and every manual override) is written back to the cache, so the
system gets cheaper and more accurate the more it is used.
"""

from __future__ import annotations

import re

from ..models import (
    CatSource,
    Category,
    CategorizationRule,
    CategorizedDescription,
    FinanceSettings,
    Transaction,
)
from . import llm
from .normalize import hash_description, normalize_description


def get_settings(user) -> FinanceSettings:
    obj, _ = FinanceSettings.objects.get_or_create(user=user)
    return obj


def remember_categorization(user, description: str, category, source: str, confidence: float = 1.0) -> None:
    """Write-through to the Tier-0 cache so identical descriptions resolve for free."""
    h = hash_description(description)
    if not h or category is None:
        return
    CategorizedDescription.objects.update_or_create(
        user=user,
        normalized_hash=h,
        defaults={
            "category": category,
            "source": source,
            "confidence": confidence,
            "normalized_text": normalize_description(description)[:200],
        },
    )


def _labels_by_kind(user) -> dict[str, dict[str, Category]]:
    """{kind: {category_name: Category}} for the user's categories."""
    out: dict[str, dict[str, Category]] = {}
    for cat in Category.objects.filter(user=user):
        out.setdefault(cat.kind, {})[cat.name] = cat
    return out


def _match_rule(rule: CategorizationRule, desc_lower: str) -> bool:
    pattern = rule.pattern.strip()
    if not pattern:
        return False
    if rule.match_type == CategorizationRule.MatchType.REGEX:
        try:
            return re.search(pattern, desc_lower, re.IGNORECASE) is not None
        except re.error:
            return False
    return pattern.lower() in desc_lower


def categorize_transaction(
    tx: Transaction,
    *,
    settings: FinanceSettings,
    labels_by_kind: dict[str, dict[str, Category]],
    rules: list[CategorizationRule],
    use_llm: bool = True,
) -> bool:
    """Try to assign a category to one transaction. Returns True if assigned."""
    if tx.category_id:
        return False
    desc = tx.description or ""
    h = hash_description(desc)
    if not h:
        return False  # nothing to categorize on

    # Tier 0 — cache
    cached = (
        CategorizedDescription.objects.filter(
            user=tx.user, normalized_hash=h, category__isnull=False
        )
        .select_related("category")
        .first()
    )
    if cached:
        tx.category = cached.category
        tx.save(update_fields=["category"])
        return True

    # Tier 1 — user rules
    desc_lower = desc.lower()
    for rule in rules:
        if _match_rule(rule, desc_lower):
            tx.category = rule.category
            tx.save(update_fields=["category"])
            remember_categorization(tx.user, desc, rule.category, CatSource.RULE)
            return True

    # Tier 2 — local LLM (only for the transaction's own kind's labels)
    if not use_llm:
        return False
    label_map = labels_by_kind.get(tx.kind, {})
    if not label_map:
        return False
    result = llm.classify(desc, list(label_map.keys()))
    if not result:
        return False
    label, confidence = result
    if confidence < settings.confidence_threshold:
        return False  # leave for human review
    category = label_map.get(label)
    if not category:
        return False
    tx.category = category
    tx.save(update_fields=["category"])
    remember_categorization(tx.user, desc, category, CatSource.LLM, confidence)
    return True


def categorize_uncategorized(user, *, use_llm: bool = True) -> dict[str, int]:
    """Run the cascade over every uncategorized transaction. Returns counts."""
    settings = get_settings(user)
    labels_by_kind = _labels_by_kind(user)
    rules = list(CategorizationRule.objects.filter(user=user).select_related("category"))

    pending = Transaction.objects.filter(user=user, category__isnull=True)
    assigned = 0
    for tx in pending:
        if categorize_transaction(
            tx,
            settings=settings,
            labels_by_kind=labels_by_kind,
            rules=rules,
            use_llm=use_llm,
        ):
            assigned += 1

    needs_review = Transaction.objects.filter(user=user, category__isnull=True).count()
    return {"assigned": assigned, "needs_review": needs_review}
