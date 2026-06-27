import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from under_backend.apps.banksync.models import BankAccount, BankConnection
from under_backend.apps.finance import api as f
from under_backend.apps.finance.models import Transaction, TxKind
from under_backend.apps.finance.transfers import detect_transfers, set_transfer

User = get_user_model()


class _Req:
    def __init__(self, user):
        self.auth = user


class TransferDetectionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="transfer@under.os")
        self.conn = BankConnection.objects.create(
            user=self.user, aspsp_name="Test", state="s1"
        )
        self.acc_a = BankAccount.objects.create(connection=self.conn, external_uid="A")
        self.acc_b = BankAccount.objects.create(connection=self.conn, external_uid="B")
        self.today = timezone.localdate()

    def _tx(self, kind, amount, account, days=0, **kw):
        return Transaction.objects.create(
            user=self.user,
            kind=kind,
            amount=amount,
            account=account,
            date=self.today - datetime.timedelta(days=days),
            description=kw.get("description", ""),
        )

    def test_pairs_cross_account(self):
        out = self._tx(TxKind.EXPENSE, 500, self.acc_a, days=1)
        inn = self._tx(TxKind.INCOME, 500, self.acc_b, days=0)
        self.assertEqual(detect_transfers(self.user), 1)
        out.refresh_from_db()
        inn.refresh_from_db()
        self.assertTrue(out.is_transfer and inn.is_transfer)
        self.assertEqual(out.transfer_pair_id, inn.id)

    def test_does_not_pair_same_account(self):
        self._tx(TxKind.EXPENSE, 500, self.acc_a)
        self._tx(TxKind.INCOME, 500, self.acc_a)
        self.assertEqual(detect_transfers(self.user), 0)

    def test_does_not_pair_without_account(self):
        self._tx(TxKind.EXPENSE, 500, None)
        self._tx(TxKind.INCOME, 500, None)
        self.assertEqual(detect_transfers(self.user), 0)

    def test_does_not_pair_outside_window(self):
        self._tx(TxKind.EXPENSE, 500, self.acc_a, days=30)
        self._tx(TxKind.INCOME, 500, self.acc_b, days=0)
        self.assertEqual(detect_transfers(self.user), 0)

    def test_set_transfer_toggles_pair(self):
        out = self._tx(TxKind.EXPENSE, 500, self.acc_a, days=1)
        self._tx(TxKind.INCOME, 500, self.acc_b, days=0)
        detect_transfers(self.user)
        out.refresh_from_db()
        set_transfer(out, False)
        out.refresh_from_db()
        pair = Transaction.objects.get(kind=TxKind.INCOME)
        self.assertFalse(out.is_transfer)
        self.assertFalse(pair.is_transfer)


class TransferStatsExclusionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="texcl@under.os")
        self.today = timezone.localdate()

    def _tx(self, kind, amount, is_transfer=False):
        return Transaction.objects.create(
            user=self.user, kind=kind, amount=amount, date=self.today,
            is_transfer=is_transfer,
        )

    def test_summary_excludes_transfers(self):
        self._tx(TxKind.INCOME, 2000)            # real income
        self._tx(TxKind.EXPENSE, 300)            # real expense
        self._tx(TxKind.EXPENSE, 1000, True)     # transfer out — excluded
        self._tx(TxKind.INCOME, 1000, True)      # transfer in — excluded
        s = f.summary(_Req(self.user), month=self.today.strftime("%Y-%m"))
        self.assertEqual(s.income.value, 2000.0)
        self.assertEqual(s.expense.value, 300.0)
        self.assertEqual(s.net.value, 1700.0)
