from datetime import timedelta

import google.cloud.logging
from sendgrid import EventWebhook

from lexroom_backend.simple_gcp_connector.cloud_sql import IpType
from lexroom_backend.simple_gcp_connector.psycopg import GoogleCloudConnInfoProvider

from .base import *  # noqa: F403
from .base import MIDDLEWARE, env

# GENERAL
# ------------------------------------------------------------------------------
DEBUG = False
# https://docs.djangoproject.com/en/5.2/ref/settings/#secret-key
SECRET_KEY = env("DJANGO_SECRET_KEY")
# https://docs.djangoproject.com/en/5.2/ref/settings/#allowed-hosts
ALLOWED_HOSTS = [
    *env.list("DJANGO_ALLOWED_HOSTS", default=[]),
    "app.lexroom.ai",
    "addin-word.lexroom.ai",
    "lexroom.retool.com",
    "127.0.0.1",
]

# DATABASES
# -----------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# Don't enable CONN_MAX_AGE due to async usage, prefer pooling
# https://docs.djangoproject.com/en/5.2/topics/async/#queries-the-orm
# To set DATABASE_URL in Google Cloud Run follow guide at
# https://docs.cloud.google.com/python/django/run#create-django-environment-file-as-a-secret
# DATABASE_URL format: postgres://{DATABASE_USERNAME}:{DATABASE_PASSWORD}@//cloudsql/{PROJECT_ID}:{REGION}:{INSTANCE_NAME}/{DATABASE_NAME}
_DEFAULT_DB_CONF = env.db_url()  # Read DATABASE_URL from env

_database_pool_port = env.int("DATABASE_POOL_PORT", default=None)

# Add support for Google Cloud SQL IAM automatic authentication in
# psycopg connection pool through psycopg.ConnectionPool.conninfo
get_conninfo = GoogleCloudConnInfoProvider(
    env.str(env.DEFAULT_DATABASE_ENV),
    instance_connection_name=_DEFAULT_DB_CONF["HOST"].rsplit("/", 1)[-1]
    if env.CLOUDSQL in _DEFAULT_DB_CONF["HOST"]
    else None,
    enable_iam_auth=env.bool("USE_GOOGLE_CLOUD_SQL_IAM_AUTH", default=True),
    ip_type=IpType(  # used only if instance_connection_name is provided
        env.str("GOOGLE_CLOUD_SQL_IP_TYPE", default="PRIMARY")
    ),
    port=_database_pool_port,
)

_DEFAULT_DB_CONF["CONN_MAX_AGE"] = 0
_DEFAULT_DB_CONF["CONN_HEALTH_CHECKS"] = True

_db_options = {
    # psycopg connection pool settings with extra dependency "pool"
    # https://docs.djangoproject.com/en/5.2/ref/databases/#connection-pool
    # For options see
    # https://www.psycopg.org/psycopg3/docs/api/pool.html#psycopg_pool.ConnectionPool
    "pool": {
        # minimum connections to keep open
        "min_size": 4,  # connection pool default value
        # maximum connections per process
        "max_size": 10,
        # Seconds to wait for an available connection
        "timeout": 30,
        # Close idle connections after 30 seconds
        "max_idle": 30,
        # Retry connection after 60 seconds
        "reconnect_timeout": 60,
        # "conninfo" can be a callable in psycopg>=3.3
        "conninfo": get_conninfo,
    },
}
if _database_pool_port is not None:
    # Transaction-mode pooling (e.g. GCP Managed Connection Pooling on 6432):
    # disable server-side cursors and automatic prepared statements.
    # Django forwards this OPTIONS key into ConnectionPool(kwargs=...).
    _DEFAULT_DB_CONF["DISABLE_SERVER_SIDE_CURSORS"] = True
    _db_options["prepare_threshold"] = None
    # Align Django's db config with the resolved host from GoogleCloudConnInfoProvider.
    # Django passes HOST/PORT as kwargs to ConnectionPool, and kwargs override the
    # pool's conninfo callable. Without this, Django would pass the Unix socket path
    # from DATABASE_URL as host, making psycopg connect to
    # /cloudsql/INSTANCE/.s.PGSQL.6432 instead of the private IP via TCP.
    if get_conninfo.host:
        _DEFAULT_DB_CONF["HOST"] = get_conninfo.host
    _DEFAULT_DB_CONF["PORT"] = _database_pool_port

_DEFAULT_DB_CONF.setdefault("OPTIONS", {}).update(_db_options)
DATABASES = {
    "default": _DEFAULT_DB_CONF,
}

# SECURITY
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#secure-proxy-ssl-header
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# https://docs.djangoproject.com/en/5.2/ref/settings/#secure-ssl-redirect
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
# https://docs.djangoproject.com/en/5.2/ref/settings/#session-cookie-secure
SESSION_COOKIE_SECURE = True
# https://docs.djangoproject.com/en/5.2/ref/settings/#session-cookie-name
SESSION_COOKIE_NAME = "__Secure-sessionid"
# https://docs.djangoproject.com/en/5.2/ref/settings/#csrf-cookie-secure
CSRF_COOKIE_SECURE = True
# https://docs.djangoproject.com/en/5.2/ref/settings/#csrf-cookie-name
CSRF_COOKIE_NAME = "__Secure-csrftoken"
# https://docs.djangoproject.com/en/5.2/topics/security/#ssl-https
# https://docs.djangoproject.com/en/5.2/ref/settings/#secure-hsts-seconds
# TODO: set this to 60 seconds first and then to 518400 once you prove the former works
SECURE_HSTS_SECONDS = 60
# https://docs.djangoproject.com/en/5.2/ref/settings/#secure-hsts-include-subdomains
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=True,
)
# https://docs.djangoproject.com/en/5.2/ref/settings/#secure-hsts-preload
SECURE_HSTS_PRELOAD = env.bool("DJANGO_SECURE_HSTS_PRELOAD", default=True)
# https://docs.djangoproject.com/en/5.2/ref/middleware/#x-content-type-options-nosniff
SECURE_CONTENT_TYPE_NOSNIFF = env.bool(
    "DJANGO_SECURE_CONTENT_TYPE_NOSNIFF",
    default=True,
)
# https://docs.djangoproject.com/en/5.2/ref/settings/#std-setting-USE_X_FORWARDED_HOST
USE_X_FORWARDED_HOST = True

# CORS
# ------------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    *env.list("CORS_ALLOWED_ORIGINS", default=[]),
    "https://app.lexroom.ai",
    "https://addin-word.lexroom.ai",
    "https://lexroom.retool.com",
]


# STATIC & MEDIA
# ------------------------
STORAGES = {
    "staticfiles": {
        "BACKEND": "servestatic.storage.CompressedManifestStaticFilesStorage",
    },
}

# ADMIN
# ------------------------------------------------------------------------------
# Django Admin URL regex.
ADMIN_URL = env("DJANGO_ADMIN_URL")

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-from-email
DEFAULT_FROM_EMAIL = env(
    "DJANGO_DEFAULT_FROM_EMAIL",
    default="lexroom <noreply@lexroom.ai>",
)
# https://docs.djangoproject.com/en/5.2/ref/settings/#server-email
SERVER_EMAIL = env("DJANGO_SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)
# https://docs.djangoproject.com/en/5.2/ref/settings/#email-subject-prefix
EMAIL_SUBJECT_PREFIX = env(
    "DJANGO_EMAIL_SUBJECT_PREFIX",
    default="[lexroom] ",
)
ACCOUNT_EMAIL_SUBJECT_PREFIX = EMAIL_SUBJECT_PREFIX

# LOGGING
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#logging
# See https://docs.djangoproject.com/en/5.2/topics/logging for
# more details on how to customize your logging configuration.
#
# Google logging handler with the standard library:
#   https://docs.cloud.google.com/python/docs/reference/logging/latest/web-framework-integration

MIDDLEWARE = [
    "lexroom_backend.apps.common.middlewares.GCPTraceMiddleware",
    *MIDDLEWARE,
]

# Instantiates a client and a GCP logger to retrieve full_name
gc_client = google.cloud.logging.Client()

LOGGING = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "verbose": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(process)d - %(thread)d - %(message)s",
        },
    },
    "filters": {
        "default_json_fields": {
            "()": "lexroom_backend.apps.common.logging_filters.DefaultExtraJsonFields",
            "default_json_fields": {
                "repo": "backend",
                "environment": "production",
            },
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
        "cloud_logging_handler": {
            # LexroomCloudLoggingHandler overrides handle() to run GCPTraceFilter before
            # CloudLoggingFilter (which is registered in CloudLoggingHandler.__init__ and
            # reads record.trace). This covers records from any child logger, since
            # logger-level filters are not applied to propagated records.
            "class": "lexroom_backend.apps.common.logging_filters.LexroomCloudLoggingHandler",
            "client": gc_client,
            "name": "lexroom",  # FIXME: hardcoded name?
            "gcp_trace_project": gc_client.project,
            "filters": ["default_json_fields"],
        },
    },
    "root": {"handlers": [], "level": "WARNING"},
    "loggers": {
        "django": {
            "level": "WARN",
            "handlers": ["cloud_logging_handler"],
            "propagate": True,
        },
        "django.db.backends": {
            "level": "ERROR",
            "handlers": ["cloud_logging_handler"],
            "propagate": False,
        },
        "django.security.DisallowedHost": {
            "level": "ERROR",
            "handlers": ["cloud_logging_handler"],
            "propagate": False,
        },
        "google": {
            "level": "ERROR",
            "handlers": ["cloud_logging_handler"],
        },
        "lexroom_backend": {
            "level": "DEBUG",
            "handlers": ["cloud_logging_handler"],
        },
    },
}

# NINJA_JWT
# ------------------------------------------------------------------------------
NINJA_JWT = {
    "AUTH_TOKEN_CLASSES": ("ninja_jwt.tokens.AccessToken",),
    "USER_ID_FIELD": "email",
    "ACCESS_TOKEN_LIFETIME": timedelta(days=1),
    "ALGORITHM": env("AUTH_ALGORITHM", default="HS256"),  # default
    "SIGNING_KEY": env("AUTH_SECRET"),
}

# Lexroom vars
# ------------------------------------------------------------------------------
SLACK_WEBHOOK_URL = env("SLACK_WEBHOOK_URL")
SLACK_WEBHOOK_CREDITS_LIMIT_CHANNEL = env("SLACK_WEBHOOK_CREDITS_LIMIT_CHANNEL")
SLACK_WEBHOOK_SENDGRID_CHANNEL = env("SLACK_WEBHOOK_SENDGRID_CHANNEL")
AMPLITUDE_API_KEY = env("AMPLITUDE_API_KEY")
BREVO_API_KEY = env("BREVO_API_KEY")
SENDGRID_API_KEY = env("SENDGRID_API_KEY")
SENDGRID_EVENT_WEBHOOK_VERIFICATION_KEY = env("SENDGRID_EVENT_WEBHOOK_VERIFICATION_KEY")
_ = EventWebhook(
    SENDGRID_EVENT_WEBHOOK_VERIFICATION_KEY
)  # validate sendgrid public key
DEFAULT_SENDER_EMAIL = env("DEFAULT_SENDER_EMAIL", default="support@lexroom.ai")
IK_ENVIRONMENT = env("IK_ENVIRONMENT", default="production")
USER_DATA_FOLDER_NAME = env("USER_DATA_FOLDER_NAME", default="user_data")
PRIVATE_IK_PINECONE_INDEX_NAME = env(
    "PRIVATE_IK_PINECONE_INDEX_NAME", default="ik-serverless"
)
AUTH_FE_URL = env("AUTH_FE_URL", default="https://app.lexroom.ai")


CORPUS_SERVICE_URL = env("CORPUS_SERVICE_URL")
CORPUS_SERVICE_AUDIENCE = env("CORPUS_SERVICE_AUDIENCE")

GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID")
AZUREAD_V2_TENANT_OAUTH2_KEY = env("AZUREAD_V2_TENANT_OAUTH2_KEY")

# Hubspot vars optional like in the old appbackend also in staging/prod
# (explicit here in production settings)
ZAPIER_HUBSPOT_WEBHOOK_KEY = env("ZAPIER_HUBSPOT_WEBHOOK_KEY", default="")
ZAPIER_HUBSPOT_WEBHOOK_URL = env("ZAPIER_HUBSPOT_WEBHOOK_URL", default="")

DATASTORE_RESEARCH_NAMESPACE = env(
    "DATASTORE_RESEARCH_NAMESPACE", default="production_research_v02"
)

ETL_TOPIC_NAME = env("ETL_TOPIC_NAME")  # was default to "etl-prod"
