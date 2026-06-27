"""Default categories seeded the first time a user opens UnderFinance."""

from .models import Category, TxKind

DEFAULT_CATEGORIES = [
    # Expenses
    {"name": "Groceries", "kind": TxKind.EXPENSE, "color": "#00ffaa", "icon": "cart"},
    {"name": "Rent & Bills", "kind": TxKind.EXPENSE, "color": "#00e5ff", "icon": "home"},
    {"name": "Transport", "kind": TxKind.EXPENSE, "color": "#ff00aa", "icon": "car"},
    {"name": "Dining Out", "kind": TxKind.EXPENSE, "color": "#ffb000", "icon": "food"},
    {"name": "Shopping", "kind": TxKind.EXPENSE, "color": "#b46bff", "icon": "bag"},
    {"name": "Entertainment", "kind": TxKind.EXPENSE, "color": "#ff5e7e", "icon": "play"},
    {"name": "Health", "kind": TxKind.EXPENSE, "color": "#3dd6a0", "icon": "heart"},
    {"name": "Other", "kind": TxKind.EXPENSE, "color": "#8ba4a0", "icon": "tag"},
    # Income
    {"name": "Salary", "kind": TxKind.INCOME, "color": "#00ffaa", "icon": "wallet"},
    {"name": "Freelance", "kind": TxKind.INCOME, "color": "#00e5ff", "icon": "laptop"},
    {"name": "Investments", "kind": TxKind.INCOME, "color": "#b46bff", "icon": "chart"},
    {"name": "Other Income", "kind": TxKind.INCOME, "color": "#8ba4a0", "icon": "tag"},
]


def seed_default_categories(user) -> None:
    """Create the default category set for a user that has none yet."""
    if Category.objects.filter(user=user).exists():
        return
    Category.objects.bulk_create(
        [Category(user=user, is_default=True, **data) for data in DEFAULT_CATEGORIES]
    )
