from django.contrib import admin

from .models import BankAccount, BankConnection


class BankAccountInline(admin.TabularInline):
    model = BankAccount
    extra = 0


@admin.register(BankConnection)
class BankConnectionAdmin(admin.ModelAdmin):
    list_display = ("aspsp_name", "user", "status", "consent_valid_until", "last_synced_at")
    list_filter = ("status", "provider")
    search_fields = ("aspsp_name", "user__email")
    inlines = [BankAccountInline]
