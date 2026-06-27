"""Thin Enable Banking REST client.

We authenticate to Enable Banking with ``private_key_jwt``: a short-lived JWT
signed (RS256) with our application's private key, with ``kid`` = our Application
ID. Enable Banking holds the AISP licence and eIDAS certs; we hold only this app
key. See https://enablebanking.com/docs/tpp/getting-started/ .

Config (Django settings, from env):
- ENABLEBANKING_APP_ID        application id (JWT kid)
- ENABLEBANKING_PRIVATE_KEY   RSA private key PEM (or set ..._PATH)
- ENABLEBANKING_PRIVATE_KEY_PATH  path to the PEM file
- ENABLEBANKING_BASE_URL      default https://api.enablebanking.com
- ENABLEBANKING_REDIRECT_URL  our public HTTPS callback URL
"""

from __future__ import annotations

import datetime
from typing import Any, Optional

import httpx
import jwt
from django.conf import settings


class BankSyncError(RuntimeError):
    """Any failure talking to the aggregator (config, network, or API error)."""


class ConsentExpired(BankSyncError):
    """The bank consent window has lapsed — a fresh SCA reconnect is required."""


def _load_private_key() -> str:
    key = getattr(settings, "ENABLEBANKING_PRIVATE_KEY", "")
    if key:
        return key
    path = getattr(settings, "ENABLEBANKING_PRIVATE_KEY_PATH", "")
    if path:
        try:
            with open(path, "r", encoding="utf-8") as fh:
                return fh.read()
        except OSError as exc:
            raise BankSyncError(f"Cannot read ENABLEBANKING_PRIVATE_KEY_PATH: {exc}")
    raise BankSyncError("Enable Banking private key is not configured.")


class EnableBankingClient:
    def __init__(self, app_id: str, private_key: str, base_url: str):
        if not app_id:
            raise BankSyncError("ENABLEBANKING_APP_ID is not configured.")
        self.app_id = app_id
        self.private_key = private_key
        self.base_url = base_url.rstrip("/")

    @classmethod
    def from_settings(cls) -> "EnableBankingClient":
        return cls(
            app_id=getattr(settings, "ENABLEBANKING_APP_ID", ""),
            private_key=_load_private_key(),
            base_url=getattr(settings, "ENABLEBANKING_BASE_URL", "https://api.enablebanking.com"),
        )

    # ── auth ────────────────────────────────────────────────────────────────

    def _jwt(self) -> str:
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            "iss": "enablebanking.com",
            "aud": "api.enablebanking.com",
            "iat": int(now.timestamp()),
            "exp": int((now + datetime.timedelta(hours=1)).timestamp()),
        }
        return jwt.encode(
            payload,
            self.private_key,
            algorithm="RS256",
            headers={"typ": "JWT", "kid": self.app_id},
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[dict] = None,
        params: Optional[dict] = None,
    ) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self._jwt()}"}
        try:
            resp = httpx.request(
                method,
                f"{self.base_url}{path}",
                headers=headers,
                json=json,
                params=params,
                timeout=30,
            )
        except httpx.HTTPError as exc:
            raise BankSyncError(f"Network error contacting Enable Banking: {exc}")

        if resp.status_code in (401, 403):
            # Distinguish an expired consent from a config/auth problem.
            body = resp.text.lower()
            if "session" in body or "consent" in body or "expired" in body:
                raise ConsentExpired("Bank consent expired — please reconnect.")
            raise BankSyncError(f"Auth error ({resp.status_code}): {resp.text[:200]}")
        if resp.status_code >= 400:
            raise BankSyncError(f"Enable Banking error ({resp.status_code}): {resp.text[:200]}")
        return resp.json()

    # ── endpoints ─────────────────────────────────────────────────────────────

    def list_aspsps(self, country: str = "IT") -> list[dict]:
        data = self._request("GET", "/aspsps", params={"country": country})
        return data.get("aspsps", [])

    def start_authorization(
        self,
        *,
        aspsp_name: str,
        country: str,
        redirect_url: str,
        state: str,
        valid_until: datetime.datetime,
    ) -> dict:
        """Begin a consent. Returns a dict including ``url`` (the bank SCA page)."""
        return self._request(
            "POST",
            "/auth",
            json={
                "access": {"valid_until": valid_until.isoformat()},
                "aspsp": {"name": aspsp_name, "country": country},
                "state": state,
                "redirect_url": redirect_url,
                "psu_type": "personal",
            },
        )

    def create_session(self, code: str) -> dict:
        """Exchange the redirect ``code`` for a session (with accounts + access)."""
        return self._request("POST", "/sessions", json={"code": code})

    def get_session(self, session_id: str) -> dict:
        """Fetch an existing session (incl. its accounts)."""
        return self._request("GET", f"/sessions/{session_id}")

    def get_account_transactions(
        self,
        account_uid: str,
        *,
        date_from: str,
        continuation_key: Optional[str] = None,
    ) -> dict:
        # date_from must be sent on EVERY page and must match the value encoded
        # in the continuation key, or Enable Banking returns HTTP 422. The caller
        # is responsible for keeping date_from stable across pages.
        params: dict[str, Any] = {"date_from": date_from}
        if continuation_key:
            params["continuation_key"] = continuation_key
        return self._request("GET", f"/accounts/{account_uid}/transactions", params=params)
