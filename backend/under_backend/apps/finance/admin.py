from django.contrib import admin

from .models import (
    Budget,
    Category,
    CategorizationRule,
    CategorizedDescription,
    FinanceSettings,
    SavingsGoal,
    Transaction,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "user", "color", "icon", "is_default")
    list_filter = ("kind", "is_default")
    search_fields = ("name", "user__email")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("date", "kind", "amount", "category", "description", "user")
    list_filter = ("kind", "date")
    search_fields = ("description", "user__email")
    date_hierarchy = "date"


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("category", "amount", "user")
    search_fields = ("user__email",)


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ("name", "current_amount", "target_amount", "target_date", "user")
    search_fields = ("name", "user__email")


@admin.register(CategorizedDescription)
class CategorizedDescriptionAdmin(admin.ModelAdmin):
    list_display = ("normalized_text", "category", "source", "confidence", "user")
    list_filter = ("source",)
    search_fields = ("normalized_text", "user__email")


@admin.register(CategorizationRule)
class CategorizationRuleAdmin(admin.ModelAdmin):
    list_display = ("pattern", "match_type", "category", "priority", "user")
    list_filter = ("match_type",)
    search_fields = ("pattern", "user__email")


@admin.register(FinanceSettings)
class FinanceSettingsAdmin(admin.ModelAdmin):
    list_display = ("user", "confidence_threshold", "ai_phrasing_enabled")
