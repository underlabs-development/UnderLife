"""Map an Enable Banking transaction entry onto our Transaction model.

Enable Banking returns an UNSIGNED absolute amount plus a credit/debit indicator
(CRDT/DBIT). We store positive Decimals (our convention) and derive kind. We only
import BOOKED entries — pending ones have mutable, unstable ids.
"""

from __future__ import annotations

import hashlib
from decimal import Decimal, InvalidOperation
from typing import Optional

from under_backend.apps.finance.categorization.normalize import normalize_description
from under_backend.apps.finance.models import TxKind, TxSource


def build_description(entry: dict) -> str:
    parts: list[str] = []
    remittance = entry.get("remittance_information") or []
    if isinstance(remittance, list):
        parts.extend(str(p) for p in remittance if p)
    elif remittance:
        parts.append(str(remittance))
    for party in ("creditor", "debtor"):
        name = (entry.get(party) or {}).get("name")
        if name:
            parts.append(str(name))
    return " · ".join(parts)[:200]


def _amount(entry: dict) -> Optional[Decimal]:
    raw = (entry.get("transaction_amount") or {}).get("amount")
    if raw is None:
        return None
    try:
        return Decimal(str(raw)).copy_abs()
    except (InvalidOperation, ValueError):
        return None


def compute_dedup_hash(
    account_uid: str,
    date: str,
    signed_amount: Decimal,
    currency: str,
    description: str,
) -> str:
    payload = "|".join(
        [account_uid, date, str(signed_amount), currency, normalize_description(description)]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def map_entry(entry: dict, *, account_uid: str, currency: str) -> Optional[dict]:
    """Return Transaction field kwargs for a booked entry, or None to skip it."""
    status = (entry.get("status") or "").upper()
    if status and status not in ("BOOK", "BOOKED"):
        return None  # skip pending / unstable entries

    amount = _amount(entry)
    if amount is None or amount == 0:
        return None

    indicator = (entry.get("credit_debit_indicator") or "").upper()
    kind = TxKind.INCOME if indicator == "CRDT" else TxKind.EXPENSE

    date = entry.get("booking_date") or entry.get("value_date")
    if not date:
        return None

    description = build_description(entry)
    external_id = (entry.get("entry_reference") or "").strip()

    fields = {
        "kind": kind,
        "amount": amount,
        "description": description,
        "date": date,
        "source": TxSource.ENABLEBANKING,
        "external_id": external_id,
        # Hash is the fallback identity ONLY when there is no stable id, so two
        # legitimately-identical same-day entries that *do* carry distinct
        # entry_references are never collapsed.
        "dedup_hash": "",
    }
    if not external_id:
        signed = amount if kind == TxKind.INCOME else -amount
        fields["dedup_hash"] = compute_dedup_hash(
            account_uid, str(date), signed, currency, description
        )
    return fields
