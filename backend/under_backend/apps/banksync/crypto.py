"""Symmetric encryption for aggregator session tokens stored in Postgres.

The master key lives OUTSIDE the database (``BANKSYNC_ENCRYPTION_KEY`` env var /
Django setting), so a DB dump alone never exposes bank access. A leaked,
unencrypted session token would grant standing read access to the account, so
this is mandatory, not optional.

The key is a urlsafe-base64 32-byte Fernet key; generate one with::

    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

from __future__ import annotations

from cryptography.fernet import Fernet
from django.conf import settings


class EncryptionNotConfigured(RuntimeError):
    pass


def _fernet() -> Fernet:
    key = getattr(settings, "BANKSYNC_ENCRYPTION_KEY", "")
    if not key:
        raise EncryptionNotConfigured(
            "BANKSYNC_ENCRYPTION_KEY is not set — cannot encrypt/decrypt bank tokens."
        )
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt(plaintext: str) -> bytes:
    return _fernet().encrypt(plaintext.encode())


def decrypt(token: bytes) -> str:
    if isinstance(token, memoryview):  # psycopg may return BinaryField as memoryview
        token = token.tobytes()
    return _fernet().decrypt(bytes(token)).decode()
