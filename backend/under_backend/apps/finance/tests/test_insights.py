from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from under_backend.apps.finance.defaults import seed_default_categories
from under_backend.apps.finance.insights.engine import Insight, build_insights
from under_backend.apps.finance.insights.phraser import _is_grounded, _rephrase_one
from under_backend.apps.finance.models import Budget, Category, Transaction, TxKind

User = get_user_model()


class InsightEngineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(email="insights@under.os")
        seed_default_categories(self.user)
        self.groceries = Category.objects.get(
            user=self.user, name="Groceries", kind=TxKind.EXPENSE
        )
        self.salary = Category.objects.get(
            user=self.user, name="Salary", kind=TxKind.INCOME
        )
        self.today = timezone.localdate()

    def test_overspend_insight(self):
        Budget.objects.create(user=self.user, category=self.groceries, amount=100)
        Transaction.objects.create(
            user=self.user, kind=TxKind.EXPENSE, amount=150,
            category=self.groceries, description="Food", date=self.today,
        )
        Transaction.objects.create(
            user=self.user, kind=TxKind.INCOME, amount=1000,
            category=self.salary, description="Pay", date=self.today,
        )
        month = self.today.strftime("%Y-%m")
        insights = build_insights(self.user, month)
        overspend = [i for i in insights if i.type == "overspend"]
        self.assertEqual(len(overspend), 1)
        self.assertEqual(overspend[0].projected_monthly_saving, 50.0)
        self.assertIn("Groceries", overspend[0].template_text)

    def test_savings_rate_positive(self):
        Transaction.objects.create(
            user=self.user, kind=TxKind.INCOME, amount=1000,
            category=self.salary, description="Pay", date=self.today,
        )
        Transaction.objects.create(
            user=self.user, kind=TxKind.EXPENSE, amount=150,
            category=self.groceries, description="Food", date=self.today,
        )
        insights = build_insights(self.user, self.today.strftime("%Y-%m"))
        rate = [i for i in insights if i.type == "savings_rate"]
        self.assertEqual(len(rate), 1)
        self.assertIn("85%", rate[0].template_text)


class PhraserGuardrailTests(TestCase):
    def test_is_grounded(self):
        src = "You spent €420 on Dining, 35% over your €310 budget."
        self.assertTrue(_is_grounded("Heads up: €420 on Dining is 35% over €310!", src))
        self.assertFalse(_is_grounded("You spent €999 on Dining.", src))

    def test_rephrase_falls_back_on_hallucinated_number(self):
        text = "You saved €50 this month."

        class FakeClient:
            def __init__(self, content):
                self._content = content

            def chat(self, **kwargs):
                return {"message": {"content": self._content}}

        # grounded -> uses the model output
        grounded = _rephrase_one(FakeClient("Great job saving €50!"), text)
        self.assertEqual(grounded, "Great job saving €50!")

        # invents €70 -> falls back to the exact template
        hallucinated = _rephrase_one(FakeClient("You saved €70 this month!"), text)
        self.assertEqual(hallucinated, text)
