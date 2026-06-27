"""UnderFinance bank-sync API (Enable Banking).

The consent flow: start -> bank SCA (browser) -> public callback -> session
stored -> sync. The callback is unauthenticated (it is a browser redirect from
the bank) and is matched to its pending connection via an opaque ``state`` token.
"""

from __future__ import annotations

import datetime
import secrets
from typing import List, Optional

from ninja import Router, Schema
from ninja.errors import HttpError
from ninja_jwt.authentication import JWTAuth

from django.conf import settings
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .client import BankSyncError, ConsentExpired, EnableBankingClient
from .crypto import encrypt
from .models import BankConnection, ConnectionStatus
from .sync import store_accounts, sync_connection

banksync_router = Router(auth=JWTAuth())

# Request the longest window Enable Banking generally allows; banks cap it lower.
CONSENT_DAYS = 180


# ── schemas ──────────────────────────────────────────────────────────────────

class AspspOut(Schema):
    name: str
    country: str
    logo: Optional[str] = None


class StartIn(Schema):
    aspsp_name: str
    country: str = "IT"


class StartOut(Schema):
    redirect_url: str


class AccountOut(Schema):
    id: int
    name: str
    iban_masked: str
    currency: str


class ConnectionOut(Schema):
    id: int
    aspsp_name: str
    status: str
    consent_valid_until: Optional[datetime.datetime]
    last_synced_at: Optional[datetime.datetime]
    error_detail: str
    accounts: List[AccountOut]


class SyncResult(Schema):
    imported: int
    accounts: int


class MessageSchema(Schema):
    detail: str


def _connection_out(c: BankConnection) -> ConnectionOut:
    return ConnectionOut(
        id=c.id,
        aspsp_name=c.aspsp_name,
        status=c.status,
        consent_valid_until=c.consent_valid_until,
        last_synced_at=c.last_synced_at,
        error_detail=c.error_detail,
        accounts=[
            AccountOut(id=a.id, name=a.name, iban_masked=a.iban_masked, currency=a.currency)
            for a in c.accounts.all()
        ],
    )


# ── banks ────────────────────────────────────────────────────────────────────

@banksync_router.get("/aspsps", response=List[AspspOut])
def list_aspsps(request, country: str = "IT"):
    try:
        client = EnableBankingClient.from_settings()
        aspsps = client.list_aspsps(country)
    except BankSyncError as exc:
        raise HttpError(503, str(exc))
    return [
        AspspOut(name=a.get("name", ""), country=a.get("country", country), logo=a.get("logo"))
        for a in aspsps
        if a.get("name")
    ]


# ── connections ───────────────────────────────────────────────────────────────

@banksync_router.get("/connections", response=List[ConnectionOut])
def list_connections(request):
    qs = (
        BankConnection.objects.filter(user=request.auth)
        .exclude(status=ConnectionStatus.PENDING)
        .prefetch_related("accounts")
    )
    return [_connection_out(c) for c in qs]


@banksync_router.post("/connections/start", response=StartOut)
def start_connection(request, payload: StartIn):
    state = secrets.token_urlsafe(32)
    valid_until = timezone.now() + datetime.timedelta(days=CONSENT_DAYS)
    redirect_url = getattr(settings, "ENABLEBANKING_REDIRECT_URL", "")
    if not redirect_url:
        raise HttpError(503, "Bank sync is not configured (missing redirect URL).")

    connection = BankConnection.objects.create(
        user=request.auth,
        aspsp_name=payload.aspsp_name,
        country=payload.country,
        state=state,
        status=ConnectionStatus.PENDING,
    )
    try:
        client = EnableBankingClient.from_settings()
        result = client.start_authorization(
            aspsp_name=payload.aspsp_name,
            country=payload.country,
            redirect_url=redirect_url,
            state=state,
            valid_until=valid_until,
        )
    except BankSyncError as exc:
        connection.delete()
        raise HttpError(503, str(exc))

    url = result.get("url")
    if not url:
        connection.delete()
        raise HttpError(502, "Aggregator did not return an authorization URL.")
    return StartOut(redirect_url=url)


# Public callback — the bank redirects the browser here after SCA. No JWT.
@banksync_router.get("/callback", auth=None)
def callback(request, state: str = "", code: str = "", error: str = ""):
    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    fail = HttpResponseRedirect(f"{frontend}/under-finance?bank=error")

    connection = BankConnection.objects.filter(state=state, status=ConnectionStatus.PENDING).first()
    if not connection or error or not code:
        return fail

    try:
        client = EnableBankingClient.from_settings()
        session = client.create_session(code)
    except BankSyncError:
        connection.status = ConnectionStatus.ERROR
        connection.save(update_fields=["status"])
        return fail

    connection.encrypted_session = encrypt(session.get("session_id", ""))
    access = session.get("access") or {}
    valid_until = access.get("valid_until")
    if valid_until:
        try:
            connection.consent_valid_until = datetime.datetime.fromisoformat(valid_until)
        except ValueError:
            pass
    connection.status = ConnectionStatus.ACTIVE
    connection.error_detail = ""
    connection.save()

    store_accounts(connection, session.get("accounts", []))

    return HttpResponseRedirect(f"{frontend}/under-finance?bank=connected")


@banksync_router.post("/connections/{conn_id}/sync", response=SyncResult)
def sync_now(request, conn_id: int):
    connection = get_object_or_404(BankConnection, id=conn_id, user=request.auth)
    try:
        result = sync_connection(connection)
    except ConsentExpired as exc:
        raise HttpError(409, str(exc))
    except BankSyncError as exc:
        raise HttpError(502, str(exc))
    return SyncResult(**result)


@banksync_router.delete("/connections/{conn_id}", response=MessageSchema)
def delete_connection(request, conn_id: int):
    connection = get_object_or_404(BankConnection, id=conn_id, user=request.auth)
    connection.delete()
    return MessageSchema(detail="Connection removed.")
