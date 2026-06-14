from .base import *  # noqa: F403
from .base import env

# Database
# ------------------------------------------------------------------------------
# A dummy configuration only to run commands that need a database but don't use it
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.dummy",
    }
}

# PASSWORDS
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#password-hashers
# https://docs.djangoproject.com/en/5.2/topics/auth/passwords/#using-bcrypt-with-django
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#email-backend
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# DEBUGGING FOR TEMPLATES
# ------------------------------------------------------------------------------
TEMPLATES[0]["OPTIONS"]["debug"] = True  # noqa: F405

# Lexroom vars
# ------------------------------------------------------------------------------
SLACK_WEBHOOK_URL = env("SLACK_WEBHOOK_URL", default="")
SLACK_WEBHOOK_CREDITS_LIMIT_CHANNEL = env(
    "SLACK_WEBHOOK_CREDITS_LIMIT_CHANNEL", default=""
)
AMPLITUDE_API_KEY = env("AMPLITUDE_API_KEY", default="")
BREVO_API_KEY = env("BREVO_API_KEY", default="")
SENDGRID_API_KEY = env("SENDGRID_API_KEY", default="")
DEFAULT_SENDER_EMAIL = env("DEFAULT_SENDER_EMAIL", default="test@test.ai")
IK_ENVIRONMENT = env("IK_ENVIRONMENT", default="")
USER_DATA_FOLDER_NAME = env("USER_DATA_FOLDER_NAME", default="")
AUTH_FE_URL = env("AUTH_FE_URL", default="https://app.staging.lexroom.ai")

GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")
AZUREAD_V2_TENANT_OAUTH2_KEY = env("AZUREAD_V2_TENANT_OAUTH2_KEY", default="")
ETL_TOPIC_NAME = env("ETL_TOPIC_NAME", default="")
