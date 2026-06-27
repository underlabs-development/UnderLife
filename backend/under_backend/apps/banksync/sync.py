"""Pull transactions from a bank connection into the Transaction table.

Polling with a rolling overlap window + idempotent upsert: safe to re-run, and
tolerant of the flaky connections Italian banks are known for. After importing,
the existing categorization cascade labels the new rows.
"""

from __future__ import annotations

import datetime

from django.db import IntegrityError, transaction as db_transaction
from django.utils import timezone

from under_backend.apps.finance.categorization.cascade import categorize_uncategorized
from under_backend.apps.finance.models import Transaction, TxSource
from under_backend.apps.finance.transfers import detect_transfers
from .client import BankSyncError, ConsentExpired, EnableBankingClient
from .crypto import decrypt
from .mapping import map_entry
from .models import BankAccount, BankConnection, ConnectionStatus

# Re-fetch this many days before the cursor each run, to catch entries that
# posted late (overlap is absorbed by the unique constraints).
OVERLAP_DAYS = 10
# Initial history reach when an account has never been synced.
INITIAL_HISTORY_DAYS = 89  # banks expose ~90 days per call


def mask_iban(iban: str | None) -> str:
    iban = iban or ""
    if len(iban) < 8:
        return iban
    return f"{iban[:4]}…{iban[-4:]}"


def store_accounts(connection: BankConnection, accounts: list[dict]) -> int:
    """Create/update BankAccount rows from an aggregator session, null-safe."""
    count = 0
    for acc in accounts:
        account_id = acc.get("account_id")
        account_id = account_id if isinstance(account_id, dict) else {}
        uid = acc.get("uid") or acc.get("account_uid") or ""
        if not uid:
            continue
        BankAccount.objects.update_or_create(
            connection=connection,
            external_uid=uid,
            defaults={
                "iban_masked": mask_iban(account_id.get("iban")),
                "name": acc.get("name") or acc.get("product") or "",
                "currency": acc.get("currency") or "EUR",
            },
        )
        count += 1
    return count


def _date_from(account: BankAccount) -> str:
    if account.last_synced_booking_date:
        start = account.last_synced_booking_date - datetime.timedelta(days=OVERLAP_DAYS)
    else:
        start = timezone.localdate() - datetime.timedelta(days=INITIAL_HISTORY_DAYS)
    return start.isoformat()


def _upsert(user, account: BankAccount, entries: list[dict]) -> int:
    """Insert mapped entries idempotently. Returns the number newly created."""
    created = 0
    max_date: datetime.date | None = account.last_synced_booking_date
    for entry in entries:
        fields = map_entry(entry, account_uid=account.external_uid, currency=account.currency)
        if not fields:
            continue
        if fields["external_id"]:
            lookup = {
                "user": user,
                "source": TxSource.ENABLEBANKING,
                "external_id": fields["external_id"],
            }
        else:
            lookup = {"user": user, "dedup_hash": fields["dedup_hash"]}
        defaults = {k: v for k, v in fields.items() if k not in lookup}
        try:
            with db_transaction.atomic():
                obj, was_created = Transaction.objects.get_or_create(
                    **lookup, defaults={**defaults, "category": None, "account": account}
                )
        except IntegrityError:
            was_created = False  # raced / overlapping window — already present
            obj = Transaction.objects.filter(**lookup).first()
        if was_created:
            created += 1
        elif obj and obj.account_id is None:
            # Backfill account on rows imported before the account field existed,
            # so transfer detection can pair them.
            obj.account = account
            obj.save(update_fields=["account"])
        d = datetime.date.fromisoformat(str(fields["date"]))
        if max_date is None or d > max_date:
            max_date = d
    if max_date:
        account.last_synced_booking_date = max_date
        account.save(update_fields=["last_synced_booking_date"])
    return created


def sync_connection(connection: BankConnection, *, run_categorizer: bool = True) -> dict:
    """Sync every account on a connection. Returns {imported, accounts}."""
    if connection.status == ConnectionStatus.PENDING or not connection.encrypted_session:
        raise BankSyncError("Connection is not active yet.")

    session_id = decrypt(connection.encrypted_session)
    client = EnableBankingClient.from_settings()
    user = connection.user
    imported = 0

    # Self-heal: if accounts were never stored (e.g. a failed callback), fetch
    # them from the live session before syncing.
    if not connection.accounts.exists():
        try:
            session = client.get_session(session_id)
            store_accounts(connection, session.get("accounts", []))
        except ConsentExpired:
            connection.status = ConnectionStatus.EXPIRED
            connection.save(update_fields=["status"])
            raise

    try:
        for account in connection.accounts.all():
            # Compute ONCE and keep stable across pages: the continuation key is
            # only valid for the same date_from it was issued with.
            date_from = _date_from(account)
            continuation_key = None
            while True:
                page = client.get_account_transactions(
                    account.external_uid,
                    date_from=date_from,
                    continuation_key=continuation_key,
                )
                imported += _upsert(user, account, page.get("transactions", []))
                continuation_key = page.get("continuation_key")
                if not continuation_key:
                    break
    except ConsentExpired as exc:
        connection.status = ConnectionStatus.EXPIRED
        connection.error_detail = str(exc)
        connection.save(update_fields=["status", "error_detail"])
        raise
    except BankSyncError as exc:
        connection.status = ConnectionStatus.ERROR
        connection.error_detail = str(exc)[:300]
        connection.save(update_fields=["status", "error_detail"])
        raise

    connection.status = ConnectionStatus.ACTIVE
    connection.last_synced_at = timezone.now()
    connection.error_detail = ""
    connection.save(update_fields=["status", "last_synced_at", "error_detail"])

    # Always pair transfers (a re-sync may have only backfilled accounts, with
    # no new imports) so transfer legs drop out of stats and the categorizer.
    detect_transfers(user)
    if imported and run_categorizer:
        categorize_uncategorized(user)

    return {"imported": imported, "accounts": connection.accounts.count()}
