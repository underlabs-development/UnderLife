"""Default categories seeded the first time a user opens UnderFinance."""

from .models import Category, TxKind

DEFAULT_CATEGORIES = [
    # Expenses
    {"name": "Groceries", "kind": TxKind.EXPENSE, "color": "#00ffaa", "icon": "cart",
     "description": "Supermarkets and food shopping (Esselunga, Coop, Conad, markets)."},
    {"name": "Rent & Bills", "kind": TxKind.EXPENSE, "color": "#00e5ff", "icon": "home",
     "description": "Rent, mortgage, utilities, phone and internet bills."},
    {"name": "Transport", "kind": TxKind.EXPENSE, "color": "#ff00aa", "icon": "car",
     "description": "Fuel, public transport, trains, taxis, tolls, parking, car costs."},
    {"name": "Dining Out", "kind": TxKind.EXPENSE, "color": "#ffb000", "icon": "food",
     "description": "Restaurants, bars, cafés, takeaway and food delivery."},
    {"name": "Shopping", "kind": TxKind.EXPENSE, "color": "#b46bff", "icon": "bag",
     "description": "Clothes, electronics, home goods and general retail."},
    {"name": "Entertainment", "kind": TxKind.EXPENSE, "color": "#ff5e7e", "icon": "play",
     "description": "Streaming, cinema, games, events, subscriptions, hobbies."},
    {"name": "Health", "kind": TxKind.EXPENSE, "color": "#3dd6a0", "icon": "heart",
     "description": "Pharmacy, doctors, dentist, gym, medical and wellbeing."},
    {"name": "Other", "kind": TxKind.EXPENSE, "color": "#8ba4a0", "icon": "tag",
     "description": "Anything that does not fit another expense category."},
    # Income
    {"name": "Salary", "kind": TxKind.INCOME, "color": "#00ffaa", "icon": "wallet",
     "description": "Regular employment pay (stipendio)."},
    {"name": "Freelance", "kind": TxKind.INCOME, "color": "#00e5ff", "icon": "laptop",
     "description": "Self-employed, contract and freelance income."},
    {"name": "Investments", "kind": TxKind.INCOME, "color": "#b46bff", "icon": "chart",
     "description": "Dividends, interest, capital gains and investment returns."},
    {"name": "Other Income", "kind": TxKind.INCOME, "color": "#8ba4a0", "icon": "tag",
     "description": "Refunds, gifts and any other incoming money."},
]


def seed_default_categories(user) -> None:
    """Create the default category set for a user that has none yet."""
    if Category.objects.filter(user=user).exists():
        return
    Category.objects.bulk_create(
        [Category(user=user, is_default=True, **data) for data in DEFAULT_CATEGORIES]
    )
