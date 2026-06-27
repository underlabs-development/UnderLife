"""Detect internal transfers between the user's own accounts.

A transfer shows up as two legs: an outflow (expense) on one account and a
matching inflow (income) on another. We pair them when the amounts match, the
dates are close, and they sit on DIFFERENT known accounts — then flag both as
``is_transfer`` so they drop out of every income/expense statistic.

To avoid false positives we only AUTO-pair legs that both have a known account
(i.e. bank-imported). A real expense and an unrelated income of the same amount
on the same account are never paired. Single legs (e.g. a transfer to an
un-connected account) are handled by manual marking in the UI.
"""

from __future__ import annotations

import datetime

from .models import Transaction, TxKind

# Max gap between the two legs of a transfer.
WINDOW_DAYS = 4


def detect_transfers(user, window_days: int = WINDOW_DAYS) -> int:
    """Auto-pair cross-account transfers for a user. Returns pairs created."""
    base = Transaction.objects.filter(
        user=user, is_transfer=False, account__isnull=False
    )
    expenses = list(base.filter(kind=TxKind.EXPENSE).order_by("date"))
    incomes = list(base.filter(kind=TxKind.INCOME).order_by("date"))

    used: set[int] = set()
    pairs = 0
    for exp in expenses:
        for inc in incomes:
            if inc.id in used:
                continue
            if inc.account_id == exp.account_id:
                continue  # must be between two DIFFERENT accounts
            if inc.amount != exp.amount:
                continue
            if abs((inc.date - exp.date).days) > window_days:
                continue
            _mark_pair(exp, inc)
            used.add(inc.id)
            pairs += 1
            break
    return pairs


def _mark_pair(a: Transaction, b: Transaction) -> None:
    a.is_transfer = True
    a.transfer_pair = b
    b.is_transfer = True
    b.transfer_pair = a
    a.save(update_fields=["is_transfer", "transfer_pair"])
    b.save(update_fields=["is_transfer", "transfer_pair"])


def set_transfer(tx: Transaction, is_transfer: bool) -> None:
    """Manually mark/unmark a transaction (and its linked leg, if any)."""
    pair = tx.transfer_pair
    tx.is_transfer = is_transfer
    if not is_transfer:
        tx.transfer_pair = None
    tx.save(update_fields=["is_transfer", "transfer_pair"])
    if pair:
        pair.is_transfer = is_transfer
        if not is_transfer:
            pair.transfer_pair = None
        pair.save(update_fields=["is_transfer", "transfer_pair"])
