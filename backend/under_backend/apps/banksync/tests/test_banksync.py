from unittest.mock import patch

import jwt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from ninja.errors import HttpError

from under_backend.apps.banksync import api as bank_api
from under_backend.apps.banksync import sync as sync_mod
from under_backend.apps.banksync.client import EnableBankingClient
from under_backend.apps.banksync.crypto import decrypt, encrypt
from under_backend.apps.banksync.mapping import map_entry
from under_backend.apps.banksync.models import BankAccount, BankConnection, ConnectionStatus
from under_backend.apps.banksync.sync import sync_connection
from under_backend.apps.finance.models import Transaction, TxKind, TxSource

User = get_user_model()

FERNET_KEY = Fernet.generate_key().decode()


def _rsa_pem() -> tuple[str, str]:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    priv = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()
    pub = key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode()
    return priv, pub


@override_settings(BANKSYNC_ENCRYPTION_KEY=FERNET_KEY)
class CryptoTests(TestCase):
    def test_round_trip(self):
        token = encrypt("session-abc-123")
        self.assertNotIn(b"session-abc-123", bytes(token))
        self.assertEqual(decrypt(token), "session-abc-123")


class JwtTests(TestCase):
    def test_private_key_jwt_signed_and_kid_set(self):
        priv, pub = _rsa_pem()
        client = EnableBankingClient(app_id="app-xyz", private_key=priv, base_url="https://x")
        token = client._jwt()
        header = jwt.get_unverified_header(token)
        self.assertEqual(header["kid"], "app-xyz")
        self.assertEqual(header["alg"], "RS256")
        decoded = jwt.decode(token, pub, algorithms=["RS256"], audience="api.enablebanking.com")
        self.assertEqual(decoded["iss"], "enablebanking.com")


class ClientPaginationTests(TestCase):
    def test_date_from_sent_on_every_page(self):
        priv, _ = _rsa_pem()
        client = EnableBankingClient(app_id="a", private_key=priv, base_url="https://x")
        captured = {}

        def fake_request(method, path, *, json=None, params=None):
            captured["params"] = params
            return {"transactions": []}

        client._request = fake_request  # type: ignore[assignment]

        client.get_account_transactions("uid", date_from="2026-01-01")
        self.assertEqual(captured["params"], {"date_from": "2026-01-01"})

        # Continuation must keep date_from AND add the key (must match the key).
        client.get_account_transactions("uid", date_from="2026-01-01", continuation_key="K")
        self.assertEqual(
            captured["params"], {"date_from": "2026-01-01", "continuation_key": "K"}
        )


class MappingTests(TestCase):
    def _entry(self, **over):
        base = {
            "status": "BOOK",
            "transaction_amount": {"amount": "42.50", "currency": "EUR"},
            "credit_debit_indicator": "DBIT",
            "booking_date": "2026-06-10",
            "remittance_information": ["ESSELUNGA MILANO"],
            "entry_reference": "ref-1",
        }
        base.update(over)
        return base

    def test_debit_is_expense_positive_amount(self):
        m = map_entry(self._entry(), account_uid="acc1", currency="EUR")
        self.assertEqual(m["kind"], TxKind.EXPENSE)
        self.assertEqual(str(m["amount"]), "42.50")
        self.assertEqual(m["external_id"], "ref-1")
        self.assertEqual(m["dedup_hash"], "")  # has stable id -> no hash
        self.assertIn("ESSELUNGA", m["description"])

    def test_credit_is_income(self):
        m = map_entry(self._entry(credit_debit_indicator="CRDT"), account_uid="a", currency="EUR")
        self.assertEqual(m["kind"], TxKind.INCOME)

    def test_no_entry_reference_gets_dedup_hash(self):
        m = map_entry(self._entry(entry_reference=""), account_uid="acc1", currency="EUR")
        self.assertEqual(m["external_id"], "")
        self.assertTrue(m["dedup_hash"])

    def test_pending_and_zero_skipped(self):
        self.assertIsNone(map_entry(self._entry(status="PENDING"), account_uid="a", currency="EUR"))
        self.assertIsNone(
            map_entry(
                self._entry(transaction_amount={"amount": "0", "currency": "EUR"}),
                account_uid="a",
                currency="EUR",
            )
        )


class FakeClient:
    def __init__(self, pages):
        self._pages = pages

    def get_account_transactions(self, uid, *, date_from, continuation_key=None):
        return self._pages


@override_settings(BANKSYNC_ENCRYPTION_KEY=FERNET_KEY)
class SyncTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="sync@under.os")
        self.conn = BankConnection.objects.create(
            user=self.user,
            aspsp_name="Intesa Sanpaolo",
            state="state-1",
            status=ConnectionStatus.ACTIVE,
            encrypted_session=encrypt("sess-123"),
        )
        self.account = BankAccount.objects.create(
            connection=self.conn, external_uid="acc-1", currency="EUR", name="Conto"
        )
        self.page = {
            "transactions": [
                {
                    "status": "BOOK",
                    "transaction_amount": {"amount": "10.00", "currency": "EUR"},
                    "credit_debit_indicator": "DBIT",
                    "booking_date": "2026-06-01",
                    "remittance_information": ["BAR ROMA"],
                    "entry_reference": "r1",
                },
                {
                    "status": "BOOK",
                    "transaction_amount": {"amount": "2000.00", "currency": "EUR"},
                    "credit_debit_indicator": "CRDT",
                    "booking_date": "2026-06-02",
                    "remittance_information": ["STIPENDIO"],
                    "entry_reference": "r2",
                },
                {  # pending -> skipped
                    "status": "PENDING",
                    "transaction_amount": {"amount": "5.00", "currency": "EUR"},
                    "credit_debit_indicator": "DBIT",
                    "booking_date": "2026-06-03",
                    "entry_reference": "r3",
                },
            ]
        }

    def test_pagination_keeps_date_from_stable(self):
        """Cursor advances during page 1, but page 2 must reuse page 1's date_from."""
        calls: list[dict] = []

        class PagingClient:
            def get_account_transactions(self, uid, *, date_from, continuation_key=None):
                calls.append({"date_from": date_from, "continuation_key": continuation_key})
                if continuation_key is None:
                    return {
                        "transactions": [
                            {
                                "status": "BOOK",
                                "transaction_amount": {"amount": "99.00", "currency": "EUR"},
                                "credit_debit_indicator": "CRDT",
                                "booking_date": "2026-06-20",  # advances the cursor
                                "entry_reference": "p1",
                            }
                        ],
                        "continuation_key": "NEXT",
                    }
                return {
                    "transactions": [
                        {
                            "status": "BOOK",
                            "transaction_amount": {"amount": "1.00", "currency": "EUR"},
                            "credit_debit_indicator": "DBIT",
                            "booking_date": "2026-06-05",
                            "entry_reference": "p2",
                        }
                    ]
                }

        with patch.object(sync_mod, "categorize_uncategorized", return_value=None), patch.object(
            EnableBankingClient, "from_settings", return_value=PagingClient()
        ):
            result = sync_connection(self.conn)

        self.assertEqual(result["imported"], 2)
        self.assertEqual(len(calls), 2)
        # Both pages used the SAME date_from despite the cursor advancing.
        self.assertEqual(calls[0]["date_from"], calls[1]["date_from"])
        self.assertEqual(calls[1]["continuation_key"], "NEXT")

    def test_sync_imports_and_is_idempotent(self):
        with patch.object(sync_mod, "categorize_uncategorized", return_value=None), patch.object(
            EnableBankingClient, "from_settings", return_value=FakeClient(self.page)
        ):
            first = sync_connection(self.conn)
            second = sync_connection(self.conn)

        self.assertEqual(first["imported"], 2)
        self.assertEqual(second["imported"], 0)  # idempotent re-run
        txs = Transaction.objects.filter(user=self.user)
        self.assertEqual(txs.count(), 2)
        self.assertTrue(all(t.source == TxSource.ENABLEBANKING for t in txs))
        self.assertEqual(txs.filter(kind=TxKind.INCOME).count(), 1)
        self.account.refresh_from_db()
        self.assertEqual(str(self.account.last_synced_booking_date), "2026-06-02")


class _Req:
    def __init__(self, user):
        self.auth = user


@override_settings(
    ENABLEBANKING_APP_ID="", ENABLEBANKING_PRIVATE_KEY="", ENABLEBANKING_PRIVATE_KEY_PATH=""
)
class ApiGracefulTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="api@under.os")

    def test_aspsps_503_when_unconfigured(self):
        with self.assertRaises(HttpError) as ctx:
            bank_api.list_aspsps(_Req(self.user), country="IT")
        self.assertEqual(ctx.exception.status_code, 503)

    @override_settings(FRONTEND_URL="http://localhost:3000")
    def test_callback_unknown_state_redirects_to_error(self):
        resp = bank_api.callback(_Req(self.user), state="does-not-exist", code="x")
        self.assertEqual(resp.status_code, 302)
        self.assertIn("bank=error", resp["Location"])
