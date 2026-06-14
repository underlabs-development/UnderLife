from sendgrid import EventWebhook

from lexroom_backend.simple_gcp_connector.cloud_sql import IpType
from lexroom_backend.simple_gcp_connector.psycopg import GoogleCloudConnInfoProvider

from .base import *  # noqa: F403
from .base import INSTALLED_APPS, env

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#debug
DEBUG = True

# https://docs.djangoproject.com/en/5.2/ref/settings/#allowed-hosts
ALLOWED_HOSTS = [
    "localhost",
    "0.0.0.0",  # noqa: S104
    "127.0.0.1",
    *env.list("DJANGO_ALLOWED_HOSTS", default=[]),
]

# DATABASES
# -----------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
# Don't enable CONN_MAX_AGE with async, prefer pooling. See
# https://docs.djangoproject.com/en/5.2/topics/async/#queries-the-orm.
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
    enable_iam_auth=env.bool("USE_GOOGLE_CLOUD_SQL_IAM_AUTH", default=False),
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
        "max_size": 4,
        # Seconds to wait for an available connection
        "timeout": 5,
        # Close idle connections after 30 seconds
        "max_idle": 30,
        # Retry connection after 5 seconds
        "reconnect_timeout": 5,
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

# APPS
# ------------------------------------------------------------------------------
# install daphne to use runserver with ASGI
# https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/daphne/#integration-with-runserver
INSTALLED_APPS = ["daphne", "servestatic.runserver_nostatic", *INSTALLED_APPS]

# DAPHNE
# ------------------------------------------------------------------------------
ASGI_APPLICATION = "lexroom_backend.asgi.application"

# CACHES
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#caches
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "",
    },
}

# EMAIL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#email-backend
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)

# LOGGING
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/5.2/ref/settings/#logging
# See https://docs.djangoproject.com/en/5.2/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"level": "WARNING", "handlers": ["console"]},
    "loggers": {
        "django.server": {
            "level": "WARNING",
            "handlers": ["console"],
            "propagate": False,
        },
        "psycopg.pool": {
            "level": "ERROR",
            "handlers": ["console"],
            "propagate": False,
        },
    },
}

# CORS
# ------------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    *env.list("CORS_ALLOWED_ORIGINS", default=[]),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Lexroom vars
# ------------------------------------------------------------------------------
SLACK_WEBHOOK_URL = env("SLACK_WEBHOOK_URL", default="")
SLACK_WEBHOOK_CREDITS_LIMIT_CHANNEL = env(
    "SLACK_WEBHOOK_CREDITS_LIMIT_CHANNEL", default=""
)
SLACK_WEBHOOK_SENDGRID_CHANNEL = env("SLACK_WEBHOOK_SENDGRID_CHANNEL", default="")
AMPLITUDE_API_KEY = env("AMPLITUDE_API_KEY", default="")
BREVO_API_KEY = env("BREVO_API_KEY", default="")
SENDGRID_API_KEY = env("SENDGRID_API_KEY", default="")
SENDGRID_EVENT_WEBHOOK_VERIFICATION_KEY = env(
    "SENDGRID_EVENT_WEBHOOK_VERIFICATION_KEY", default=""
)
_ = EventWebhook(
    SENDGRID_EVENT_WEBHOOK_VERIFICATION_KEY
)  # validate sendgrid public key
DEFAULT_SENDER_EMAIL = env("DEFAULT_SENDER_EMAIL", default="support@lexroom.ai")
IK_ENVIRONMENT = env("IK_ENVIRONMENT", default="development")
USER_DATA_FOLDER_NAME = env("USER_DATA_FOLDER_NAME", default="user_data_test")
PRIVATE_IK_PINECONE_INDEX_NAME = env(
    "PRIVATE_IK_PINECONE_INDEX_NAME", default="test-512-dotproduct"
)
AUTH_FE_URL = env("AUTH_FE_URL", default="https://app.staging.lexroom.ai")

GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")
AZUREAD_V2_TENANT_OAUTH2_KEY = env("AZUREAD_V2_TENANT_OAUTH2_KEY", default="")

DATASTORE_RESEARCH_NAMESPACE = env(
    "DATASTORE_RESEARCH_NAMESPACE", default="development_research_v02"
)
ETL_TOPIC_NAME = env("ETL_TOPIC_NAME", default="etl-test")
