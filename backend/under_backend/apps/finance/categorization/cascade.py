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
    force: bool = False,
) -> bool:
    """Try to assign a category to one transaction. Returns True if assigned.

    With ``force=True`` it re-evaluates an already-categorized transaction and
    overwrites it — but only when a tier actually resolves a category, so a
    re-categorize never wipes existing categories if the model is unavailable.
    """
    if tx.category_id and not force:
        return False
    if tx.is_transfer:
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
    result = llm.classify(
        desc,
        list(label_map.keys()),
        allow_new=settings.ai_create_categories,
        label_descriptions={n: c.description for n, c in label_map.items()},
    )
    if not result:
        return False
    label, confidence = result
    if confidence < settings.confidence_threshold:
        return False  # leave for human review
    category = label_map.get(label)
    if category is None:
        # The model proposed a brand-new category name (not in the existing set).
        if not settings.ai_create_categories:
            return False
        category = get_or_create_category(tx.user, label, tx.kind)
        if category is None:
            return False
        # Keep the in-memory map in sync for the rest of a batch run.
        labels_by_kind.setdefault(tx.kind, {})[category.name] = category
    tx.category = category
    tx.save(update_fields=["category"])
    remember_categorization(tx.user, desc, category, CatSource.LLM, confidence)
    return True


# Palette for AI-created categories (cycled by the user's category count).
_NEW_PALETTE = ["#b46bff", "#ffb000", "#ff5e7e", "#3dd6a0", "#00e5ff", "#ff00aa", "#00ffaa"]


def get_or_create_category(user, name: str, kind: str) -> Category | None:
    name = (name or "").strip()[:60]
    if not name:
        return None
    existing = Category.objects.filter(user=user, kind=kind, name__iexact=name).first()
    if existing:
        return existing
    color = _NEW_PALETTE[Category.objects.filter(user=user).count() % len(_NEW_PALETTE)]
    return Category.objects.create(
        user=user, name=name, kind=kind, color=color, icon="tag", is_default=False
    )


def recategorize_all(user, *, use_llm: bool = True) -> dict[str, int]:
    """Re-run the cascade over EVERY non-transfer transaction, overwriting.

    Manual categorizations are preserved (their cache entries are kept and re-
    applied); AI/rule cache is dropped so the model re-decides. Existing
    categories are only overwritten when a tier resolves one — so if the model
    is offline nothing is lost.
    """
    CategorizedDescription.objects.filter(user=user).exclude(
        source=CatSource.MANUAL
    ).delete()
    settings = get_settings(user)
    labels_by_kind = _labels_by_kind(user)
    rules = list(CategorizationRule.objects.filter(user=user).select_related("category"))

    changed = 0
    for tx in Transaction.objects.filter(user=user, is_transfer=False):
        if categorize_transaction(
            tx,
            settings=settings,
            labels_by_kind=labels_by_kind,
            rules=rules,
            use_llm=use_llm,
            force=True,
        ):
            changed += 1

    needs_review = Transaction.objects.filter(
        user=user, category__isnull=True, is_transfer=False
    ).count()
    return {"assigned": changed, "needs_review": needs_review}


def recategorize_one(tx: Transaction) -> bool:
    """Force a fresh AI analysis of a single transaction (skips cache/rules and
    the confidence gate — this is an explicit, user-requested action)."""
    if tx.is_transfer or not (tx.description or "").strip():
        return False
    user = tx.user
    settings = get_settings(user)
    label_map = _labels_by_kind(user).get(tx.kind, {})
    if not label_map:
        return False
    result = llm.classify(
        tx.description,
        list(label_map.keys()),
        allow_new=settings.ai_create_categories,
        label_descriptions={n: c.description for n, c in label_map.items()},
    )
    if not result:
        return False
    label, confidence = result
    category = label_map.get(label)
    if category is None:
        if not settings.ai_create_categories:
            return False
        category = get_or_create_category(user, label, tx.kind)
        if category is None:
            return False
    tx.category = category
    tx.save(update_fields=["category"])
    remember_categorization(user, tx.description, category, CatSource.LLM, confidence)
    return True


def categorize_uncategorized(user, *, use_llm: bool = True) -> dict[str, int]:
    """Run the cascade over every uncategorized transaction. Returns counts."""
    settings = get_settings(user)
    labels_by_kind = _labels_by_kind(user)
    rules = list(CategorizationRule.objects.filter(user=user).select_related("category"))

    pending = Transaction.objects.filter(
        user=user, category__isnull=True, is_transfer=False
    )
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
