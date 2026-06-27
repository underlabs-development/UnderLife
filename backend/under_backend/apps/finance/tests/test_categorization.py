from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from under_backend.apps.finance.categorization import cascade
from under_backend.apps.finance.categorization.normalize import (
    hash_description,
    normalize_description,
)
from under_backend.apps.finance.defaults import seed_default_categories
from under_backend.apps.finance.models import (
    CatSource,
    Category,
    CategorizationRule,
    CategorizedDescription,
    Transaction,
    TxKind,
)

User = get_user_model()


class NormalizeTests(TestCase):
    def test_strips_noise(self):
        norm = normalize_description("ESSELUNGA SpA 2026-06-14 €12,34 POS ****1234")
        self.assertIn("esselunga", norm)
        self.assertNotIn("1234", norm)
        self.assertNotIn("2026", norm)
        self.assertNotIn("€", norm)

    def test_date_and_amount_variants_collapse(self):
        a = "AMAZON 2026-06-14 €9,99"
        b = "AMAZON 2026-07-02 €24,50"
        self.assertEqual(normalize_description(a), normalize_description(b))
        self.assertEqual(hash_description(a), hash_description(b))

    def test_empty(self):
        self.assertEqual(normalize_description("   "), "")
        self.assertEqual(hash_description(""), "")


class CascadeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="cascade@under.os")
        seed_default_categories(self.user)
        self.groceries = Category.objects.get(
            user=self.user, name="Groceries", kind=TxKind.EXPENSE
        )

    def _tx(self, description):
        return Transaction.objects.create(
            user=self.user,
            kind=TxKind.EXPENSE,
            amount=10,
            description=description,
            date="2026-06-14",
        )

    def _run(self, tx, use_llm=True):
        return cascade.categorize_transaction(
            tx,
            settings=cascade.get_settings(self.user),
            labels_by_kind=cascade._labels_by_kind(self.user),
            rules=list(CategorizationRule.objects.filter(user=self.user).select_related("category")),
            use_llm=use_llm,
        )

    def test_tier0_cache_hit(self):
        desc = "MERCATO DEL CONTADINO"
        cascade.remember_categorization(self.user, desc, self.groceries, CatSource.MANUAL)
        tx = self._tx(desc + " 2026-06-14")  # different date -> same normalized hash
        self.assertTrue(self._run(tx, use_llm=False))
        tx.refresh_from_db()
        self.assertEqual(tx.category_id, self.groceries.id)

    def test_tier1_rule_hit_writes_cache(self):
        CategorizationRule.objects.create(
            user=self.user, pattern="esselunga", category=self.groceries
        )
        tx = self._tx("Pagamento ESSELUNGA Milano")
        self.assertTrue(self._run(tx, use_llm=False))
        tx.refresh_from_db()
        self.assertEqual(tx.category_id, self.groceries.id)
        # rule hit is cached for next time
        self.assertTrue(
            CategorizedDescription.objects.filter(
                user=self.user, source=CatSource.RULE
            ).exists()
        )

    def test_tier2_llm_above_threshold(self):
        tx = self._tx("Some Novel Merchant XYZ")
        with patch.object(cascade.llm, "classify", return_value=("Groceries", 0.95)):
            self.assertTrue(self._run(tx))
        tx.refresh_from_db()
        self.assertEqual(tx.category_id, self.groceries.id)

    def test_tier2_llm_creates_new_category(self):
        tx = self._tx("ACME PET STORE")
        # Model proposes a category name that doesn't exist yet.
        with patch.object(cascade.llm, "classify", return_value=("Pets", 0.95)):
            self.assertTrue(self._run(tx))
        tx.refresh_from_db()
        self.assertIsNotNone(tx.category_id)
        self.assertEqual(tx.category.name, "Pets")
        self.assertEqual(tx.category.kind, TxKind.EXPENSE)
        self.assertFalse(tx.category.is_default)

    def test_tier2_new_category_deduped_case_insensitive(self):
        Category.objects.create(user=self.user, name="Pets", kind=TxKind.EXPENSE)
        before = Category.objects.filter(user=self.user).count()
        tx = self._tx("ACME PET STORE")
        with patch.object(cascade.llm, "classify", return_value=("pets", 0.95)):
            self._run(tx)
        tx.refresh_from_db()
        self.assertEqual(tx.category.name, "Pets")  # reused, not duplicated
        self.assertEqual(Category.objects.filter(user=self.user).count(), before)

    def test_tier2_no_new_category_when_disabled(self):
        s = cascade.get_settings(self.user)
        s.ai_create_categories = False
        s.save()
        tx = self._tx("ACME PET STORE")
        with patch.object(cascade.llm, "classify", return_value=("Pets", 0.95)):
            self.assertFalse(self._run(tx))
        tx.refresh_from_db()
        self.assertIsNone(tx.category_id)
        self.assertFalse(Category.objects.filter(user=self.user, name="Pets").exists())

    def test_tier2_llm_below_threshold_left_for_review(self):
        tx = self._tx("Ambiguous Thing")
        with patch.object(cascade.llm, "classify", return_value=("Groceries", 0.3)):
            self.assertFalse(self._run(tx))
        tx.refresh_from_db()
        self.assertIsNone(tx.category_id)

    def test_recategorize_one_overrides_existing(self):
        other = Category.objects.get(user=self.user, name="Other", kind=TxKind.EXPENSE)
        tx = self._tx("SUPERMARKET XYZ")
        tx.category = other
        tx.save()
        with patch.object(cascade.llm, "classify", return_value=("Groceries", 0.9)):
            self.assertTrue(cascade.recategorize_one(tx))
        tx.refresh_from_db()
        self.assertEqual(tx.category_id, self.groceries.id)

    def test_recategorize_all_overwrites(self):
        other = Category.objects.get(user=self.user, name="Other", kind=TxKind.EXPENSE)
        a = self._tx("SHOP A")
        a.category = other
        a.save()
        with patch.object(cascade.llm, "classify", return_value=("Groceries", 0.95)):
            res = cascade.recategorize_all(self.user)
        a.refresh_from_db()
        self.assertEqual(a.category_id, self.groceries.id)
        self.assertGreaterEqual(res["assigned"], 1)

    def test_recategorize_all_preserves_when_llm_unavailable(self):
        other = Category.objects.get(user=self.user, name="Other", kind=TxKind.EXPENSE)
        a = self._tx("MYSTERY MERCHANT")
        a.category = other
        a.save()
        # No cache, no rule, LLM returns None -> existing category must survive.
        with patch.object(cascade.llm, "classify", return_value=None):
            cascade.recategorize_all(self.user)
        a.refresh_from_db()
        self.assertEqual(a.category_id, other.id)

    def test_recategorize_all_preserves_manual(self):
        cascade.remember_categorization(
            self.user, "ESSELUNGA MILANO", self.groceries, CatSource.MANUAL
        )
        tx = self._tx("ESSELUNGA MILANO 2026")
        # Even if the model would say Health, the manual cache wins.
        with patch.object(cascade.llm, "classify", return_value=("Health", 0.99)):
            cascade.recategorize_all(self.user)
        tx.refresh_from_db()
        self.assertEqual(tx.category_id, self.groceries.id)

    def test_batch_counts(self):
        self._tx("ESSELUNGA")
        self._tx("")  # no description -> uncategorizable
        CategorizationRule.objects.create(
            user=self.user, pattern="esselunga", category=self.groceries
        )
        result = cascade.categorize_uncategorized(self.user, use_llm=False)
        self.assertEqual(result["assigned"], 1)
        self.assertEqual(result["needs_review"], 1)
