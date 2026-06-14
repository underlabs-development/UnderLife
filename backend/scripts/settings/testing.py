from .base import *  # noqa: F403
from .base import env

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#test-runner
TEST_RUNNER = "django.test.runner.DiscoverRunner"

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# Don't enable CONN_MAX_AGE due to async usage
# https://docs.djangoproject.com/en/5.2/topics/async/#queries-the-orm
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env.str("POSTGRES_DB", default="localhost"),
        "USER": env.str("POSTGRES_USER", default="postgres"),
        "PASSWORD": env.str("POSTGRES_PASSWORD", default="postgres"),
        "HOST": env.str("POSTGRES_HOST", default="postgres"),
        "PORT": env.str("POSTGRES_PORT", default="postgres"),
        "CONN_MAX_AGE": 0,
        "OPTIONS": {
            # psycopg2 connection pool settings with extra dependency "pool"
            "pool": True,
        },
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

# STORAGES
# ------------------------------------------------------------------------------
# Restore default storages
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# NINJA_EXTRA
# ------------------------------------------------------------------------------
NINJA_EXTRA = {
    "INJECTOR_MODULES": [
        "tests.injection.MockServicesModule"  # fake implementation
    ]
}

# Custom vars
# ------------------------------------------------------------------------------