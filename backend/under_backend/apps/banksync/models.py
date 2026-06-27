from django.conf import settings
from django.db import models


class ConnectionStatus(models.TextChoices):
    PENDING = "pending", "Pending"  # consent started, awaiting SCA redirect
    ACTIVE = "active", "Active"
    EXPIRED = "expired", "Expired"  # consent window lapsed; needs reconnect
    ERROR = "error", "Error"


class BankConnection(models.Model):
    """One PSD2 consent session to one bank (ASPSP), via a licensed aggregator.

    We ride the aggregator's AISP licence + eIDAS certs; we only ever store the
    aggregator session id (encrypted) — never bank credentials. Consent expires
    every ~90-180 days and must be renewed with a fresh in-browser SCA.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bank_connections"
    )
    provider = models.CharField(max_length=32, default="enablebanking")
    aspsp_name = models.CharField(max_length=120)
    country = models.CharField(max_length=2, default="IT")

    # Opaque random token tying the bank's redirect back to this row (the
    # callback is unauthenticated, so we match on this instead of the JWT).
    state = models.CharField(max_length=64, unique=True)

    # Aggregator session id, encrypted at rest (see crypto.py). Empty until SCA done.
    encrypted_session = models.BinaryField(null=True, blank=True)

    status = models.CharField(
        max_length=12, choices=ConnectionStatus.choices, default=ConnectionStatus.PENDING
    )
    consent_valid_until = models.DateTimeField(null=True, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    error_detail = models.CharField(max_length=300, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self) -> str:
        return f"{self.aspsp_name} ({self.status})"


class BankAccount(models.Model):
    """A single account exposed by a BankConnection."""

    connection = models.ForeignKey(
        BankConnection, on_delete=models.CASCADE, related_name="accounts"
    )
    # Aggregator account handle used to fetch transactions.
    external_uid = models.CharField(max_length=128)
    iban_masked = models.CharField(max_length=40, blank=True, default="")
    name = models.CharField(max_length=120, blank=True, default="")
    currency = models.CharField(max_length=3, default="EUR")
    # Cursor: only fetch entries on/after this booking date (minus an overlap window).
    last_synced_booking_date = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("connection", "external_uid"), name="uniq_account_per_connection"
            )
        ]

    def __str__(self) -> str:
        return self.name or self.iban_masked or self.external_uid
